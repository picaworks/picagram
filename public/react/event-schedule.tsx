"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

// Pica · Event Schedule · event-schedule
// MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
// Docs and credits: https://github.com/rishabbalak/picagram

// lib/events.ts
/** Events a core reports from its host. Each is a CustomEvent named "pica:" plus the event's name in lower
 *  case, dispatched on the host without bubbling, so a composed child's events never reach its parent's
 *  listeners. React wrappers turn them into `on` props through lib/use-pica.ts. A core emits only in
 *  response to input, never from mount or update, so echoing a value back cannot loop.
 *  See docs/architecture/contract.md. */

/** The DOM event type for an event name: "valueChange" becomes "pica:valuechange". */
function eventType(name: string): string {
  return `pica:${name.toLowerCase()}`;
}

/** A function that dispatches a core's events on its host. `E` maps each event name to its detail. */
function emitter<E>(host: HTMLElement): <K extends keyof E & string>(name: K, detail: E[K]) => void {
  return (name, detail) => {
    host.dispatchEvent(new CustomEvent(eventType(name), { detail, bubbles: false }));
  };
}

// lib/types.ts
/** The contract every Pica core implements. See docs/architecture/contract.md. */

/** A mounted component. */
interface PicaInstance<P> {
  /** Merge new prop values. The core decides what has to be rebuilt. */
  update(props: Partial<P>): void;
  /** Stop all work and remove everything the core added. Safe to call twice. */
  destroy(): void;
}

/** Mounts a core into a host element. Props are JSON values, so they pass through window.PICA_PROPS,
 *  postMessage, and the catalog's inspector unchanged. */
type Mount<P> = (host: HTMLElement, props?: Partial<P>) => PicaInstance<P>;

/** Any value JSON can carry. A prop may hold one. A core never writes into it, because React passes the
 *  parent's own objects; compare with sameJson from lib/json.ts. */
type Json = null | boolean | number | string | readonly Json[] | { readonly [key: string]: Json };

/** Props every animated core accepts, so captures and reduced motion behave the same everywhere. */
interface MotionProps {
  /** Stop animating and hold the current frame. */
  paused: boolean;
  /** Render exactly this animation time, in milliseconds, and do not animate. Null animates. */
  time: number | null;
  /** Seed for every random choice, so the same seed always draws the same frame. */
  seed: number;
}

// lib/use-pica.ts
/** React props for a core's events: an event named valueChange becomes onValueChange. */
type Handlers<Events> = {
  [K in keyof Events & string as `on${Capitalize<K>}`]?: (detail: Events[K]) => void;
};

/** Colors for one instance. Each sets a --pica-* custom property on the host, which beats a value inherited
 *  from the page. See lib/palette.ts. */
interface PaletteProp {
  fg?: string;
  bg?: string;
  accent?: string;
  muted?: string;
}

/** Props every wrapper accepts besides its core's own. */
interface WrapperProps {
  className?: string;
  style?: CSSProperties;
  /** Colors for this instance, as CSS colors. Unset tokens follow the page. */
  palette?: PaletteProp;
}

/** The host style for a palette: one custom property per token that is set. */
function paletteStyle(palette: PaletteProp | undefined): CSSProperties {
  const style: Record<string, string> = {};
  for (const [token, color] of Object.entries(palette ?? {})) {
    if (color) style[`--pica-${token}`] = color;
  }
  return style as CSSProperties;
}

/** Mounts a Pica core into the returned ref, forwards data prop changes to it, and calls `on` props when the
 *  core reports events. Data props are JSON, so a JSON key is enough to detect a change. Functions stay out
 *  of that key, so an inline handler never causes an update. `E` is the host element's type. */
function usePica<P, E extends HTMLElement = HTMLDivElement>(mount: Mount<P>, props: Partial<P>) {
  const ref = useRef<E>(null);
  const instance = useRef<PicaInstance<P> | null>(null);
  const { data, handlers } = splitProps(props);
  const latest = useRef(data);
  latest.current = data;
  const listeners = useRef(handlers);
  listeners.current = handlers;
  const key = JSON.stringify(data);
  const names = Object.keys(handlers).sort().join(" ");

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const mounted = mount(host, latest.current);
    instance.current = mounted;
    return () => {
      mounted.destroy();
      instance.current = null;
    };
  }, [mount]);

  useEffect(() => {
    instance.current?.update(latest.current);
  }, [key]);

  useEffect(() => {
    const host = ref.current;
    if (!host || !names) return;
    const removers = names.split(" ").map((name) => {
      const type = eventType(name.slice(2));
      const listener = (event: Event): void => listeners.current[name]?.((event as CustomEvent).detail);
      host.addEventListener(type, listener);
      return () => host.removeEventListener(type, listener);
    });
    return () => {
      for (const remove of removers) remove();
    };
  }, [names]);

  return ref;
}

/** Splits props into data, which goes to the core, and `on` handlers, which listen for its events. Undefined
 *  values are dropped, so an unset prop keeps the core's default. */
function splitProps<P>(props: Partial<P>): { data: Partial<P>; handlers: Record<string, (detail: unknown) => void> } {
  const data: Record<string, unknown> = {};
  const handlers: Record<string, (detail: unknown) => void> = {};
  for (const [name, raw] of Object.entries(props)) {
    const value: unknown = raw;
    if (value === undefined) continue;
    if (typeof value === "function" && /^on[A-Z]/.test(name)) handlers[name] = value as (detail: unknown) => void;
    else data[name] = value;
  }
  return { data: data as Partial<P>, handlers };
}

// lib/a11y.ts
/** Accessibility attributes a core sets on its host. See docs/architecture/contract.md, mount step 2. */

/** Gives the host a role and a label, or hides it from assistive technology when the label is empty. */
function labelHost(host: HTMLElement, label: string, role = "img"): void {
  if (label) {
    host.setAttribute("role", role);
    host.setAttribute("aria-label", label);
    host.removeAttribute("aria-hidden");
  } else {
    host.removeAttribute("role");
    host.removeAttribute("aria-label");
    host.setAttribute("aria-hidden", "true");
  }
}

/** Removes what labelHost set. */
function unlabelHost(host: HTMLElement): void {
  host.removeAttribute("role");
  host.removeAttribute("aria-label");
  host.removeAttribute("aria-hidden");
}

/** A visually hidden element that carries text for assistive technology, for components whose visible text
 *  animates. Put the animated layer next to it with aria-hidden. */
function hiddenText(text: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.textContent = text;
  span.style.cssText =
    "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";
  return span;
}

/** Text whose visible glyphs animate, such as a scramble or a typewriter. The host keeps its place in the
 *  document with no role, so a heading around it stays a heading. A visually hidden copy carries the final
 *  text for assistive technology, and the animation draws into the returned layer, which is hidden from it. */
interface AnimatedText {
  /** Where the animation draws. Hidden from assistive technology. */
  readonly layer: HTMLElement;
  /** Changes the text assistive technology reads. */
  setText(text: string): void;
  /** Removes the hidden copy and the layer. */
  remove(): void;
}

function animatedText(host: HTMLElement, text: string, tag: "span" | "div" | "pre" = "span"): AnimatedText {
  const hidden = hiddenText(text);
  hidden.setAttribute("data-pica", "");
  const layer = document.createElement(tag);
  layer.setAttribute("data-pica", "");
  layer.setAttribute("aria-hidden", "true");
  host.append(hidden, layer);
  return {
    layer,
    setText(next) {
      hidden.textContent = next;
    },
    remove() {
      hidden.remove();
      layer.remove();
    },
  };
}

// lib/font.ts
/** The monospace stack glyph components default to. It lives in its own module, so a text component that
 *  never draws a grid does not carry lib/glyph-grid.ts into its single React file just for the font. */
const GRID_FONT = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

// lib/host.ts
/** What a core may change on its host, and the nodes it adds, each undone on destroy. A core never writes
 *  to, moves, or removes a node it did not create, and every node it adds carries data-pica.
 *  See docs/architecture/contract.md. */

/** A number unique across every Pica component on the page. Each pasted component carries its own copy of
 *  lib/, so the counter lives on globalThis rather than in this module. */
function nextSerial(): number {
  const g = globalThis as unknown as { __picaSerial?: number };
  g.__picaSerial = (g.__picaSerial ?? 0) + 1;
  return g.__picaSerial;
}

/** An id for ARIA relationships, such as the listbox a trigger controls. */
function nextId(prefix: string): string {
  return `${prefix}-${nextSerial()}`;
}

/** Hosts that had no style attribute before any core styled them, so the last restore can remove it. */
const unstyled = new WeakMap<HTMLElement, boolean>();

/** Sets inline styles on the host, named as in CSS, and returns a function that puts back what was there.
 *  Calling the function twice is harmless. */
function styleHost(host: HTMLElement, styles: Readonly<Record<string, string>>): () => void {
  if (!unstyled.has(host)) unstyled.set(host, !host.hasAttribute("style"));
  const before = Object.keys(styles).map(
    (name) => [name, host.style.getPropertyValue(name), host.style.getPropertyPriority(name)] as const,
  );
  for (const [name, value] of Object.entries(styles)) host.style.setProperty(name, value);
  let restored = false;
  return () => {
    if (restored) return;
    restored = true;
    for (const [name, value, priority] of before) {
      if (value) host.style.setProperty(name, value, priority);
      else host.style.removeProperty(name);
    }
    if (host.style.length === 0 && unstyled.get(host)) host.removeAttribute("style");
  };
}

/** Attributes a core sets on its host over its lifetime, such as disabled or aria-busy. */
interface HostAttributes {
  /** Sets an attribute, or removes it when `value` is null. */
  set(name: string, value: string | null): void;
  /** Puts back every attribute set through this object as it was before the first change. */
  restore(): void;
}

/** Tracks attribute changes on the host, remembering each attribute's first value so destroy can restore it. */
function hostAttributes(host: HTMLElement): HostAttributes {
  const original = new Map<string, string | null>();
  const apply = (name: string, value: string | null): void => {
    if (value === null) host.removeAttribute(name);
    else host.setAttribute(name, value);
  };
  return {
    set(name, value) {
      if (!original.has(name)) original.set(name, host.getAttribute(name));
      apply(name, value);
    },
    restore() {
      for (const [name, value] of original) apply(name, value);
      original.clear();
    },
  };
}

/** A node drawn over or under the host's content. It is the core's own, hidden from assistive technology,
 *  and ignores the pointer, so content beneath it stays clickable. */
interface Layer {
  readonly el: HTMLElement;
  /** Removes the node and undoes the host styles it needed. */
  remove(): void;
}

/** Adds a layer that covers the host. "over" paints above the host's content; "under" paints below it and
 *  above the host's background, which needs the host to be its own stacking context. */
function layer(host: HTMLElement, where: "under" | "over", tag: keyof HTMLElementTagNameMap = "div"): Layer {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:${where === "under" ? -1 : 1}`;
  const styles: Record<string, string> = {};
  if (getComputedStyle(host).position === "static") styles.position = "relative";
  if (where === "under") styles.isolation = "isolate";
  const restore = styleHost(host, styles);
  if (where === "under") host.prepend(el);
  else host.append(el);
  return {
    el,
    remove() {
      el.remove();
      restore();
    },
  };
}

/** A stylesheet that applies to one host only, through a data-pica-id attribute. It scopes by attribute
 *  rather than class, because React resets `class` whenever `className` changes. One scope per host. */
interface Scope {
  /** The selector for this host, such as [data-pica-id="7"]. Write every rule against it. */
  readonly selector: string;
  /** Replaces the scoped rules. */
  setRules(css: string): void;
  /** Removes the stylesheet and the attribute. */
  destroy(): void;
}

function scope(host: HTMLElement): Scope {
  const id = String(nextSerial());
  host.setAttribute("data-pica-id", id);
  const style = document.createElement("style");
  style.setAttribute("data-pica", "");
  host.append(style);
  return {
    selector: `[data-pica-id="${id}"]`,
    setRules(css) {
      style.textContent = css;
    },
    destroy() {
      style.remove();
      host.removeAttribute("data-pica-id");
    },
  };
}

// lib/json.ts
/** Comparing props that hold JSON. React passes fresh arrays and objects on every render, so a core compares
 *  them by content before deciding what to rebuild. */

/** Deep equality for JSON values. */
function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!sameJson(a[i], b[i])) return false;
    }
    return true;
  }
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  if (keys.length !== Object.keys(right).length) return false;
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(right, key) || !sameJson(left[key], right[key])) return false;
  }
  return true;
}

/** Whether any of `keys` holds a different value in `after` than in `before`, compared as JSON. */
function changed<P>(before: P, after: P, keys: readonly (keyof P)[]): boolean {
  return keys.some((key) => !sameJson(before[key], after[key]));
}

// lib/palette.ts
/** The four colors every component draws with. They live in CSS custom properties, so they cascade: set
 *  them once on a page or a section and every component follows, including on a theme switch. A wrapper's
 *  palette prop writes the same properties onto one host. This is the only module that reads them.
 *  See STYLE.md and docs/decisions/0005-palette.md. */

type Token = "fg" | "bg" | "accent" | "muted";

const TOKENS: readonly Token[] = ["fg", "bg", "accent", "muted"];

/** What each token falls back to when neither the page nor a palette prop sets it. Muted is the ink at 65%,
 *  which keeps 4.5:1 contrast on both the dark and the light ground. */
const TOKEN_FALLBACK: Readonly<Record<Token, string>> = {
  fg: "currentColor",
  bg: "transparent",
  accent: "#13C4A3",
  muted: "color-mix(in srgb, var(--pica-fg, currentColor) 65%, transparent)",
};

/** The CSS value of a token, with its fallback, for use in a style: var(--pica-accent, #13C4A3). */
function cssVar(token: Token): string {
  return `var(--pica-${token}, ${TOKEN_FALLBACK[token]})`;
}

/** A readable ink for text set on a token's color: black on a light color, white on a dark one. Relative
 *  color syntax does it in CSS alone, so it follows any palette without script. */
function cssOn(token: Token): string {
  return `oklch(from ${cssVar(token)} clamp(0, (0.62 - l) * 1000, 1) 0 0)`;
}

/** Each token's color as the browser computes it, usable as a canvas fill. */
type Colors = Readonly<Record<Token, string>>;

/** Event types the probe stops, so its transitions never reach the page's own listeners. */
const PROBE_EVENTS = ["transitionrun", "transitionstart", "transitionend", "transitioncancel"] as const;

/** A zero-size probe inside the host whose color properties are the four tokens, so currentColor,
 *  light-dark(), and color-mix() resolve exactly as they do on the page. */
function createProbe(host: HTMLElement): HTMLElement {
  const probe = document.createElement("span");
  probe.setAttribute("data-pica", "");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = [
    "position:absolute",
    "width:0",
    "height:0",
    "overflow:hidden",
    "visibility:hidden",
    "pointer-events:none",
    `color:${cssVar("fg")}`,
    `background-color:${cssVar("bg")}`,
    `border-top:0 solid ${cssVar("accent")}`,
    `outline:0 solid ${cssVar("muted")}`,
    // A 1 ms transition turns any change to a token into a transitionend event, which watchPalette hears.
    "transition:color 1ms,background-color 1ms,border-top-color 1ms,outline-color 1ms",
  ].join(";");
  host.appendChild(probe);
  return probe;
}

function probeColors(probe: HTMLElement): Colors {
  const style = getComputedStyle(probe);
  return { fg: style.color, bg: style.backgroundColor, accent: style.borderTopColor, muted: style.outlineColor };
}

/** Reads the four colors once. A core that needs them every frame keeps a watchPalette handle instead. */
function readPalette(host: HTMLElement): Colors {
  const probe = createProbe(host);
  const colors = probeColors(probe);
  probe.remove();
  return colors;
}

interface PaletteWatch {
  /** The colors as of the last read. */
  readonly colors: Colors;
  /** Reads again now, for example in update() or after a resize. Returns true when any color changed. */
  refresh(): boolean;
  /** Removes the probe and its listeners. */
  destroy(): void;
}

/** Keeps a probe in the host and calls `onChange` whenever a token's color changes, however it changed: a
 *  theme class, a media query, a palette prop, or a React style. Canvas and WebGL components repaint there.
 *  A page that turns every transition off hides these changes, so cores also call refresh() in update(). */
function watchPalette(host: HTMLElement, onChange: (colors: Colors) => void): PaletteWatch {
  const probe = createProbe(host);
  let colors = probeColors(probe);

  function refresh(): boolean {
    const next = probeColors(probe);
    const differs = TOKENS.some((token) => next[token] !== colors[token]);
    colors = next;
    return differs;
  }

  const onEvent = (event: Event): void => {
    event.stopPropagation();
    if (event.type === "transitionend" && refresh()) onChange(colors);
  };
  for (const type of PROBE_EVENTS) probe.addEventListener(type, onEvent);

  return {
    get colors() {
      return colors;
    },
    refresh,
    destroy() {
      for (const type of PROBE_EVENTS) probe.removeEventListener(type, onEvent);
      probe.remove();
    },
  };
}

// registry/sections/event-schedule/core.ts
export interface ScheduleSession {
  /** The day the session is on, as an ISO date such as 2026-11-12. */
  day: string;
  /** Start time as wall clock text, such as 09:30. Printed exactly as given. */
  start: string;
  /** End time as wall clock text, such as 10:15. Printed exactly as given. */
  end: string;
  /** Session title. A session with an empty title is skipped. */
  title: string;
  /** Who gives it. Optional. */
  speaker?: string;
  /** Where it happens. Optional. */
  place?: string;
  /** Where the title links to. Optional; without it the title is plain text. */
  href?: string;
}

export interface EventScheduleProps {
  /** Sessions in any order. They are grouped by day, in date order and then start order, ties in input order. */
  sessions: ScheduleSession[];
  /** Index of one session in the sorted order that is marked with a bar and a label. -1 marks none. */
  highlight: number;
  /** Visible label printed before the highlighted session's title. */
  highlightLabel: string;
  /** Caption printed once above the first day, such as the time zone. Empty shows none. */
  zone: string;
  /** Heading level of each day heading, from 2 to 5, so it fits under the page's own headings. */
  headingLevel: number;
  /** Accessible name of the schedule. */
  label: string;
}

export const defaults: EventScheduleProps = {
  sessions: [
    { day: "2026-11-12", start: "09:00", end: "09:30", title: "Opening remarks", speaker: "Maren Holt", place: "Main hall" },
    { day: "2026-11-12", start: "10:00", end: "10:45", title: "How a grid measures type", speaker: "Dario Okafor", place: "Main hall" },
    { day: "2026-11-12", start: "13:30", end: "16:00", title: "Workshop: setting a page in one font", speaker: "Priya Venkataraman", place: "Studio 2" },
    { day: "2026-11-13", start: "09:30", end: "10:30", title: "Panel: print habits on the screen", speaker: "Lena Aoki and guests", place: "Main hall" },
    { day: "2026-11-13", start: "11:00", end: "11:40", title: "Palettes of four colors", speaker: "Tomas Brandt", place: "Room 4" },
    { day: "2026-11-13", start: "16:30", end: "17:00", title: "Closing session", speaker: "Maren Holt", place: "Main hall" },
  ],
  highlight: 1,
  highlightLabel: "Next up",
  zone: "All times local to the venue",
  headingLevel: 3,
  label: "Event schedule",
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** One valid session, with the pieces the draw needs. */
interface Entry {
  session: ScheduleSession;
  minutes: number;
}

/** The weekday, day of the month, and month name of an ISO date, read in UTC from fixed English tables so every
 *  shape prints the same text. Null when the text is not a real calendar date. */
function parseDay(day: string): { weekday: string; date: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const date = Number(m[3]);
  const t = new Date(Date.UTC(year, month, date));
  if (t.getUTCFullYear() !== year || t.getUTCMonth() !== month || t.getUTCDate() !== date) return null;
  return { weekday: WEEKDAYS[t.getUTCDay()] ?? "", date: `${date} ${MONTHS[month] ?? ""}` };
}

/** Minutes after midnight for HH:MM text, used only to order sessions. Unreadable text sorts last in its day. */
function clockMinutes(text: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : Infinity;
}

/** The datetime attribute for a start time, or null when the start is not clock text. */
function startStamp(day: string, start: string): string | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(start.trim());
  return m ? `${day}T${(m[1] ?? "").padStart(2, "0")}:${m[2] ?? "00"}` : null;
}

/** Sessions with a title and a real day, in date order and then start order. The sort is stable, so ties keep
 *  their input order. */
function arrange(sessions: readonly ScheduleSession[]): Entry[] {
  const entries: Entry[] = [];
  for (const session of sessions) {
    if (!session || typeof session.title !== "string" || session.title.trim() === "") continue;
    if (typeof session.day !== "string" || !parseDay(session.day)) continue;
    entries.push({ session, minutes: clockMinutes(String(session.start ?? "")) });
  }
  return entries.sort((a, b) => {
    if (a.session.day !== b.session.day) return a.session.day < b.session.day ? -1 : 1;
    if (a.minutes === b.minutes) return 0;
    return a.minutes < b.minutes ? -1 : 1;
  });
}

/** Whether a link target is safe to put in an href. Script and data targets are dropped. */
function safeHref(href: unknown): string {
  if (typeof href !== "string") return "";
  const value = href.trim();
  return /^(javascript|data|vbscript):/i.test(value.replace(/\s/g, "")) ? "" : value;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, role: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", role);
  if (text !== undefined) node.textContent = text;
  return node;
}

/** One session's list item: start and end time, then the title, then a line of speaker and place. */
function buildSession(day: string, session: ScheduleSession, marked: boolean, markLabel: string): HTMLLIElement {
  const li = el("li", "session");
  if (marked) li.setAttribute("data-pica-mark", "");

  const when = el("div", "when");
  const start = el("time", "start", String(session.start ?? ""));
  const stamp = startStamp(day, String(session.start ?? ""));
  if (stamp) start.setAttribute("datetime", stamp);
  when.append(start);
  const endText = String(session.end ?? "").trim();
  if (endText) {
    const end = el("span", "end");
    const until = hiddenText("until ");
    until.setAttribute("data-pica", "");
    end.append(until, endText);
    when.append(end);
  }

  const body = el("div", "body");
  if (marked && markLabel) body.append(el("span", "mark", markLabel));
  const href = safeHref(session.href);
  const title = href ? el("a", "title", session.title) : el("span", "title", session.title);
  if (href) (title as HTMLAnchorElement).setAttribute("href", href);
  body.append(title);
  const who = [session.speaker, session.place].filter((s): s is string => typeof s === "string" && s.trim() !== "");
  if (who.length) body.append(el("span", "who", who.join(" · ")));

  li.append(when, body);
  return li;
}

/** The scoped rules. Hairlines are fg at a low strength, the accent is only the highlight bar, and a host under
 *  640px wide stacks the day label above its sessions and each time above its title. */
function rules(s: string): string {
  const rule = `1px solid color-mix(in srgb, ${cssVar("fg")} 22%, transparent)`;
  const m = (role: string) => `${s} [data-pica="${role}"]`;
  /** The same selector, narrowed to a host that is measured as narrow. */
  const n = (selector: string) => selector.replace(s, `${s}[data-pica-fit="min"]`);
  return [
    `:where(${s}){min-height:12rem}`,
    `${s}{box-sizing:border-box;padding:clamp(1.5rem,5vw,4rem);color:${cssVar("fg")}}`,
    `${m("schedule")}{display:block;margin-top:2.5em;min-width:0}`,
    `${m("zone")}{margin:0 0 1rem;font-family:${GRID_FONT};font-variant-numeric:tabular-nums;font-size:0.8em;letter-spacing:0.04em;text-transform:uppercase;color:${cssVar("muted")}}`,
    `${m("empty")}{margin:0;color:${cssVar("muted")}}`,
    `${m("day")}{display:grid;grid-template-columns:11rem minmax(0,1fr);column-gap:2rem;padding:1.5rem 0;border-top:${rule};min-width:0}`,
    `${m("day")}:last-child{border-bottom:${rule}}`,
    `${m("heading")}{margin:0;padding:0;font:inherit;font-size:1em;font-weight:inherit;line-height:1.1;letter-spacing:normal;text-transform:none;color:inherit}`,
    `${m("weekday")}{display:block;font-family:${GRID_FONT};font-variant-numeric:tabular-nums;font-size:0.8em;font-weight:500;letter-spacing:0.04em;text-transform:uppercase;color:${cssVar("muted")}}`,
    `${m("date")}{display:block;margin-top:0.35em;font-size:1.75em;font-weight:600;line-height:1.1;overflow-wrap:anywhere}`,
    `${m("list")}{margin:0;padding:0;list-style:none;min-width:0}`,
    `${m("session")}{position:relative;display:grid;grid-template-columns:6rem minmax(0,1fr);column-gap:1rem;margin:0;padding:0.9rem 0 0.9rem 1rem;min-width:0}`,
    `${m("session")}:first-child{padding-top:0}`,
    `${m("session")}:last-child{padding-bottom:0}`,
    `${m("session")}:not(:first-child){border-top:${rule}}`,
    `${m("session")}[data-pica-mark]::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:${cssVar("accent")}}`,
    `${m("session")}[data-pica-mark]:first-child::before{top:0}`,
    `${m("when")}{display:flex;flex-direction:column;gap:0.15em;font-family:${GRID_FONT};font-variant-numeric:tabular-nums;font-size:0.9em;line-height:1.4}`,
    `${m("end")}{color:${cssVar("muted")}}`,
    `${m("body")}{display:flex;flex-direction:column;gap:0.25em;min-width:0;overflow-wrap:anywhere}`,
    `${m("mark")}{font-family:${GRID_FONT};font-variant-numeric:tabular-nums;font-size:0.8em;font-weight:500;letter-spacing:0.04em;text-transform:uppercase}`,
    `${m("title")}{font-size:1.1em;font-weight:600;line-height:1.3;color:inherit}`,
    `${s} a[data-pica="title"]{text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:0.2em}`,
    `${s} a[data-pica="title"]:hover{background:color-mix(in srgb, ${cssVar("fg")} 10%, transparent)}`,
    `${s} a[data-pica="title"]:focus-visible{outline:2px solid ${cssVar("accent")};outline-offset:2px}`,
    `${m("who")}{font-size:0.95em;line-height:1.4;color:${cssVar("muted")}}`,
    `${n(m("day"))}{grid-template-columns:minmax(0,1fr);row-gap:1rem}`,
    `${n(m("session"))}{grid-template-columns:minmax(0,1fr);row-gap:0.4rem}`,
    `${n(m("when"))}{flex-direction:row;flex-wrap:wrap;column-gap:0.5em}`,
    `${n(m("end"))}::before{content:"\\2013\\00a0"}`,
  ].join("\n");
}

export const mount: Mount<EventScheduleProps> = (host, initial = {}) => {
  let props: EventScheduleProps = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const frame = el("div", "schedule");
  host.appendChild(frame);

  function draw(): void {
    frame.replaceChildren();
    const entries = arrange(Array.isArray(props.sessions) ? props.sessions : []);
    const level = Math.min(5, Math.max(2, Math.round(props.headingLevel)));
    if (props.label && entries.length) {
      frame.setAttribute("role", "group");
      frame.setAttribute("aria-label", props.label);
    } else {
      frame.removeAttribute("role");
      frame.removeAttribute("aria-label");
    }
    if (entries.length === 0) {
      frame.append(el("p", "empty", "No sessions scheduled."));
      return;
    }
    if (props.zone) frame.append(el("p", "zone", props.zone));

    let section: HTMLElement | null = null;
    let list: HTMLOListElement | null = null;
    let current = "";
    entries.forEach((entry, i) => {
      const { session } = entry;
      if (session.day !== current || !section || !list) {
        current = session.day;
        const parts = parseDay(current);
        section = el("section", "day");
        const id = nextId("pica-day");
        const heading = el(`h${level}` as "h2", "heading");
        heading.id = id;
        heading.append(el("span", "weekday", parts?.weekday ?? ""), " ", el("span", "date", parts?.date ?? ""));
        section.setAttribute("aria-labelledby", id);
        list = el("ol", "list");
        section.append(heading, list);
        frame.append(section);
      }
      list.append(buildSession(session.day, session, i === props.highlight, props.highlightLabel));
    });
  }

  /** Below 640px the day label stacks above its sessions, and each time sits above its title. */
  function measure(): void {
    attrs.set("data-pica-fit", host.clientWidth < 640 ? "min" : null);
  }

  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
  sheet.setRules(rules(sheet.selector));
  draw();
  measure();
  observer?.observe(host);
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (changed(before, props, ["sessions", "highlight", "highlightLabel", "zone", "headingLevel", "label"])) draw();
    },
    destroy() {
      observer?.disconnect();
      frame.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};

// registry/sections/event-schedule/index.tsx
export type EventScheduleComponentProps = Partial<EventScheduleProps> & WrapperProps & { children?: ReactNode };

/** An event agenda grouped by day, with each session's time, title, speaker, and place as plain text. */
export function EventSchedule({ className, style, palette, children, ...props }: EventScheduleComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
