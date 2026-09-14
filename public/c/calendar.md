# Calendar

> A month grid with roving keyboard focus and controlled or uncontrolled single date selection.

Category: ui. Tags: calendar, date, picker, form, ui. Static. Size: 3.4 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/calendar.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | string \| null | `null` | The selected ISO date, or null to let the calendar manage its selection. |
| `defaultValue` | string | `""` | The initially selected ISO date when value is null. |
| `month` | string \| null | `null` | The initially visible month as YYYY-MM, or null to derive it from the selection or today. |
| `weekStartsOn` | 0 \| 1 | `1` | The first day of each week, where 0 is Sunday and 1 is Monday. |
| `label` | string | `"Calendar"` | The accessible name of the calendar group. |

## Events

Each event is a CustomEvent on the host named `pica:` plus the event name in lower case. It does not bubble. In React, pass the matching `on` prop.

| Event | React prop | Detail | Description |
|---|---|---|---|
| `valueChange` | `onValueChange` | `string` | A day was chosen, as an ISO date string. |

## Colors

Draws with `--pica-fg`, `--pica-accent`, `--pica-muted`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Calendar · calendar
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

// registry/ui/calendar/core.ts
export interface CalendarProps {
  /** The selected ISO date, or null to let the calendar manage its selection. */
  value: string | null;
  /** The initially selected ISO date when value is null. */
  defaultValue: string;
  /** The initially visible month as YYYY-MM, or null to derive it from the selection or today. */
  month: string | null;
  /** The first day of each week, where 0 is Sunday and 1 is Monday. */
  weekStartsOn: 0 | 1;
  /** The accessible name of the calendar group. */
  label: string;
}

export interface CalendarEvents {
  /** A day was chosen, as an ISO date string. */
  valueChange: string;
}

export const defaults: CalendarProps = {
  value: null,
  defaultValue: "",
  month: null,
  weekStartsOn: 1,
  label: "Calendar",
};

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

const CALENDAR_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

const CALENDAR_WEEKDAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
] as const;

function calendarParseDate(value: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day
    ? { year, month, day }
    : null;
}

function calendarParseMonth(value: string | null): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  return month >= 0 && month < 12 ? { year, month, day: 1 } : null;
}

function calendarToday(): CalendarDate {
  const date = new Date();
  return { year: date.getFullYear(), month: date.getMonth(), day: date.getDate() };
}

function calendarFromUtc(date: Date): CalendarDate {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate() };
}

function calendarAddDays(date: CalendarDate, amount: number): CalendarDate {
  return calendarFromUtc(new Date(Date.UTC(date.year, date.month, date.day + amount)));
}

function calendarDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function calendarShiftMonth(date: CalendarDate, amount: number): CalendarDate {
  const anchor = new Date(Date.UTC(date.year, date.month + amount, 1));
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth();
  return { year, month, day: Math.min(date.day, calendarDaysInMonth(year, month)) };
}

function calendarIso(date: CalendarDate): string {
  return `${String(date.year).padStart(4, "0")}-${String(date.month + 1).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

function calendarSameDate(a: CalendarDate | null, b: CalendarDate): boolean {
  return a !== null && a.year === b.year && a.month === b.month && a.day === b.day;
}

function calendarRules(selector: string): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const muted = cssVar("muted");
  const mono = GRID_FONT;
  return [
    `${selector}{display:inline-block;color:${fg};font:inherit;box-sizing:border-box}`,
    `${selector} [data-calendar-part="root"]{width:21rem;max-width:100%;box-sizing:border-box}`,
    `${selector} [data-calendar-part="header"]{display:grid;grid-template-columns:2.25rem 1fr 2.25rem;align-items:center;gap:.5rem;margin-block-end:.7rem}`,
    `${selector} [data-calendar-part="heading"]{margin:0;text-align:center;font:inherit;font-size:.75em;line-height:1.3;letter-spacing:.04em;text-transform:uppercase}`,
    `${selector} [data-calendar-part="move"]{appearance:none;width:2.25rem;height:2.25rem;margin:0;padding:0;border:0;border-radius:0;background:transparent;color:${fg};font-family:${mono};font-size:1em;line-height:1;cursor:pointer}`,
    `${selector} [data-calendar-part="move"]:hover{color:${accent}}`,
    `${selector} button:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${selector} [data-calendar-part="grid"]{font-family:${mono};font-variant-numeric:tabular-nums}`,
    `${selector} [data-calendar-part="week"],${selector} [data-calendar-part="row"]{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));align-items:center}`,
    `${selector} [data-calendar-part="week"]{padding-block:.35rem .55rem;border-bottom:1px solid ${muted};color:${muted};font-size:.75em;letter-spacing:.04em;text-transform:uppercase}`,
    `${selector} [data-calendar-part="weekday"]{text-align:center}`,
    `${selector} [data-calendar-part="days"]{padding-block-start:.4rem;font-size:.8em}`,
    `${selector} [data-calendar-part="row"]+[data-calendar-part="row"]{margin-block-start:.15rem}`,
    `${selector} [data-calendar-part="cell"]{display:grid;place-items:center;min-width:0;height:2.5rem}`,
    `${selector} [data-calendar-part="day"]{appearance:none;width:2.25rem;height:2.25rem;margin:0;padding:0;border:0;border-radius:0;background:transparent;color:${fg};font:inherit;line-height:1;cursor:pointer;text-underline-offset:.2em;text-decoration-thickness:1px}`,
    `${selector} [data-calendar-part="day"]:hover{background:color-mix(in srgb,${fg} 10%,transparent)}`,
    `${selector} [data-calendar-today="true"]{text-decoration-line:underline;text-decoration-color:${accent}}`,
    `${selector} [data-calendar-selected="true"],${selector} [data-calendar-selected="true"]:hover{background:${accent};color:${cssOn("accent")}}`,
  ].join("\n");
}

export const mount: Mount<CalendarProps> = (host, initial = {}) => {
  let props: CalendarProps = { ...defaults, ...initial };
  const emit = emitter<CalendarEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const today = calendarToday();
  let selected = calendarParseDate(props.value ?? props.defaultValue);
  let visible = calendarParseMonth(props.month) ?? calendarParseDate(props.value ?? "") ?? today;
  let focusDate = selected && selected.year === visible.year && selected.month === visible.month
    ? selected
    : today.year === visible.year && today.month === visible.month ? today : { ...visible, day: 1 };

  const owned = (tag: string): HTMLElement => {
    const element = document.createElement(tag);
    element.setAttribute("data-pica", "");
    return element;
  };

  const root = owned("div");
  root.setAttribute("data-calendar-part", "root");
  const header = owned("div");
  header.setAttribute("data-calendar-part", "header");
  const previous = owned("button") as HTMLButtonElement;
  previous.type = "button";
  previous.setAttribute("data-calendar-part", "move");
  previous.setAttribute("aria-label", "Previous month");
  previous.tabIndex = -1;
  previous.textContent = "←";
  const heading = owned("h2");
  const headingId = nextId("pica-calendar-month");
  heading.id = headingId;
  heading.setAttribute("data-calendar-part", "heading");
  heading.setAttribute("aria-live", "polite");
  heading.setAttribute("aria-atomic", "true");
  const next = owned("button") as HTMLButtonElement;
  next.type = "button";
  next.setAttribute("data-calendar-part", "move");
  next.setAttribute("aria-label", "Next month");
  next.tabIndex = -1;
  next.textContent = "→";
  header.append(previous, heading, next);

  const grid = owned("div");
  grid.setAttribute("data-calendar-part", "grid");
  grid.setAttribute("role", "grid");
  grid.setAttribute("aria-labelledby", headingId);
  const week = owned("div");
  week.setAttribute("data-calendar-part", "week");
  week.setAttribute("role", "row");
  const days = owned("div");
  days.setAttribute("data-calendar-part", "days");
  grid.append(week, days);
  root.append(header, grid);
  host.append(root);

  function renderWeekdays(): void {
    week.replaceChildren();
    const start = props.weekStartsOn === 0 ? 0 : 1;
    for (let index = 0; index < 7; index++) {
      const weekdayIndex = (start + index) % 7;
      const name = CALENDAR_WEEKDAY_NAMES[weekdayIndex] ?? "";
      const cell = owned("div");
      cell.setAttribute("data-calendar-part", "weekday");
      cell.setAttribute("role", "columnheader");
      cell.setAttribute("aria-label", name);
      cell.textContent = name.slice(0, 2);
      week.append(cell);
    }
  }

  function renderDays(focusAfter = false): void {
    heading.textContent = `${CALENDAR_MONTH_NAMES[visible.month] ?? ""} ${visible.year}`;
    days.replaceChildren();
    const firstWeekday = new Date(Date.UTC(visible.year, visible.month, 1)).getUTCDay();
    const start = props.weekStartsOn === 0 ? 0 : 1;
    const offset = (firstWeekday - start + 7) % 7;
    const count = calendarDaysInMonth(visible.year, visible.month);
    const cells = Math.ceil((offset + count) / 7) * 7;
    let focusTarget: HTMLButtonElement | null = null;

    for (let cellIndex = 0; cellIndex < cells; cellIndex += 7) {
      const row = owned("div");
      row.setAttribute("data-calendar-part", "row");
      row.setAttribute("role", "row");
      for (let column = 0; column < 7; column++) {
        const dayNumber = cellIndex + column - offset + 1;
        const cell = owned("div");
        cell.setAttribute("data-calendar-part", "cell");
        cell.setAttribute("role", "gridcell");
        if (dayNumber >= 1 && dayNumber <= count) {
          const date = { year: visible.year, month: visible.month, day: dayNumber };
          const isSelected = calendarSameDate(selected, date);
          const isToday = calendarSameDate(today, date);
          const isFocus = calendarSameDate(focusDate, date);
          const button = owned("button") as HTMLButtonElement;
          button.type = "button";
          button.setAttribute("data-calendar-part", "day");
          button.setAttribute("data-calendar-date", calendarIso(date));
          button.setAttribute("data-calendar-today", String(isToday));
          button.setAttribute("data-calendar-selected", String(isSelected));
          button.setAttribute("aria-label", `${CALENDAR_WEEKDAY_NAMES[new Date(Date.UTC(date.year, date.month, date.day)).getUTCDay()]}, ${CALENDAR_MONTH_NAMES[date.month]} ${date.day}, ${date.year}`);
          button.tabIndex = isFocus ? 0 : -1;
          button.textContent = String(dayNumber);
          cell.setAttribute("aria-selected", String(isSelected));
          if (isToday) button.setAttribute("aria-current", "date");
          if (isFocus) focusTarget = button;
          cell.append(button);
        }
        row.append(cell);
      }
      days.append(row);
    }
    if (focusAfter) focusTarget?.focus();
  }

  function render(focusAfter = false): void {
    renderWeekdays();
    renderDays(focusAfter);
  }

  function moveFocus(date: CalendarDate): void {
    focusDate = date;
    visible = { year: date.year, month: date.month, day: 1 };
    render(true);
  }

  function choose(date: CalendarDate): void {
    if (props.value === null) {
      selected = date;
      focusDate = date;
      render(true);
    }
    emit("valueChange", calendarIso(date));
  }

  const onPrevious = (): void => {
    visible = calendarShiftMonth(focusDate, -1);
    focusDate = visible;
    render();
  };
  const onNext = (): void => {
    visible = calendarShiftMonth(focusDate, 1);
    focusDate = visible;
    render();
  };
  const onGridClick = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest("button[data-calendar-date]");
    if (!(button instanceof HTMLButtonElement) || !grid.contains(button)) return;
    const date = calendarParseDate(button.getAttribute("data-calendar-date") ?? "");
    if (date) choose(date);
  };
  const onGridKeydown = (event: KeyboardEvent): void => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement) || !target.hasAttribute("data-calendar-date")) return;
    let destination: CalendarDate | null = null;
    if (event.key === "ArrowLeft") destination = calendarAddDays(focusDate, -1);
    else if (event.key === "ArrowRight") destination = calendarAddDays(focusDate, 1);
    else if (event.key === "ArrowUp") destination = calendarAddDays(focusDate, -7);
    else if (event.key === "ArrowDown") destination = calendarAddDays(focusDate, 7);
    else if (event.key === "Home") {
      const weekday = new Date(Date.UTC(focusDate.year, focusDate.month, focusDate.day)).getUTCDay();
      destination = calendarAddDays(focusDate, -((weekday - (props.weekStartsOn === 0 ? 0 : 1) + 7) % 7));
    } else if (event.key === "End") {
      const weekday = new Date(Date.UTC(focusDate.year, focusDate.month, focusDate.day)).getUTCDay();
      destination = calendarAddDays(focusDate, 6 - ((weekday - (props.weekStartsOn === 0 ? 0 : 1) + 7) % 7));
    } else if (event.key === "PageUp") destination = calendarShiftMonth(focusDate, event.shiftKey ? -12 : -1);
    else if (event.key === "PageDown") destination = calendarShiftMonth(focusDate, event.shiftKey ? 12 : 1);
    if (!destination) return;
    event.preventDefault();
    moveFocus(destination);
  };

  previous.addEventListener("click", onPrevious);
  next.addEventListener("click", onNext);
  grid.addEventListener("click", onGridClick);
  grid.addEventListener("keydown", onGridKeydown);

  attrs.set("role", "group");
  attrs.set("aria-label", props.label);
  sheet.setRules(calendarRules(sheet.selector));
  render();
  host.dataset.picaReady = "true";

  return {
    update(partial) {
      const priorValue = props.value;
      const priorMonth = props.month;
      const priorWeekStart = props.weekStartsOn;
      props = { ...props, ...partial };
      attrs.set("aria-label", props.label);
      if (props.value !== priorValue && props.value !== null) {
        selected = calendarParseDate(props.value);
        if (selected && props.month === null) {
          visible = { ...selected, day: 1 };
          focusDate = selected;
        }
      }
      if (props.month !== priorMonth) {
        const explicit = calendarParseMonth(props.month);
        if (explicit) {
          visible = explicit;
          focusDate = { ...explicit, day: Math.min(focusDate.day, calendarDaysInMonth(explicit.year, explicit.month)) };
        }
      }
      if (props.weekStartsOn !== priorWeekStart || props.value !== priorValue || props.month !== priorMonth) render();
    },
    destroy() {
      previous.removeEventListener("click", onPrevious);
      next.removeEventListener("click", onNext);
      grid.removeEventListener("click", onGridClick);
      grid.removeEventListener("keydown", onGridKeydown);
      root.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};

// registry/ui/calendar/index.tsx
export type CalendarComponentProps = Partial<CalendarProps> & Handlers<CalendarEvents> & WrapperProps;

/** A keyboard navigable month grid for choosing one date. */
export function Calendar({ className, style, palette, ...props }: CalendarComponentProps) {
  const ref = usePica<CalendarProps>(mount, props);
  return <div ref={ref} className={className} style={{ ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Calendar · calendar
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Calendar · Pica</title>
<style>:root { --pica-accent: #13C4A3; }
html, body { margin: 0; height: 100%; background: #0a0a0a; color: #f1f1ef; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
@media (prefers-color-scheme: light) { html:not([data-ground]), html:not([data-ground]) body { background: #f1f1ef; color: #0a0a0a; } }
html[data-ground="paper"], html[data-ground="paper"] body { background: #f1f1ef; color: #0a0a0a; }
html[data-ground="checker"] body { background: repeating-conic-gradient(#161616 0% 25%, #0a0a0a 0% 50%) 50% / 24px 24px; }
#pica { width: 100%; height: 100%; }
html[data-stage="flow"] #pica, html[data-stage="flow"] #root > * { height: auto; min-height: 100vh; }
.pica-stage { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: clamp(20px, 3.2vw, 40px); }
.pica-stage #pica { width: auto; height: auto; }
.pica-stage span#pica, .pica-stage div#pica { display: inline-block; }</style>
</head>
<body>
<div class="pica-stage"><div id="pica"></div></div>
<script>
"use strict";
var PicaCalendar = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // registry/ui/calendar/core.ts
  var core_exports = {};
  __export(core_exports, {
    defaults: () => defaults,
    mount: () => mount
  });

  // lib/events.ts
  function eventType(name) {
    return `pica:${name.toLowerCase()}`;
  }
  function emitter(host) {
    return (name, detail) => {
      host.dispatchEvent(new CustomEvent(eventType(name), { detail, bubbles: false }));
    };
  }

  // lib/font.ts
  var GRID_FONT = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

  // lib/host.ts
  function nextSerial() {
    const g = globalThis;
    g.__picaSerial = (g.__picaSerial ?? 0) + 1;
    return g.__picaSerial;
  }
  function nextId(prefix) {
    return `${prefix}-${nextSerial()}`;
  }
  function hostAttributes(host) {
    const original = /* @__PURE__ */ new Map();
    const apply = (name, value) => {
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
      }
    };
  }
  function scope(host) {
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
      }
    };
  }

  // lib/palette.ts
  var TOKEN_FALLBACK = {
    fg: "currentColor",
    bg: "transparent",
    accent: "#13C4A3",
    muted: "color-mix(in srgb, var(--pica-fg, currentColor) 65%, transparent)"
  };
  function cssVar(token) {
    return `var(--pica-${token}, ${TOKEN_FALLBACK[token]})`;
  }
  function cssOn(token) {
    return `oklch(from ${cssVar(token)} clamp(0, (0.62 - l) * 1000, 1) 0 0)`;
  }

  // registry/ui/calendar/core.ts
  var defaults = {
    value: null,
    defaultValue: "",
    month: null,
    weekStartsOn: 1,
    label: "Calendar"
  };
  var CALENDAR_MONTH_NAMES = [
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
    "December"
  ];
  var CALENDAR_WEEKDAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ];
  function calendarParseDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day ? { year, month, day } : null;
  }
  function calendarParseMonth(value) {
    const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    return month >= 0 && month < 12 ? { year, month, day: 1 } : null;
  }
  function calendarToday() {
    const date = /* @__PURE__ */ new Date();
    return { year: date.getFullYear(), month: date.getMonth(), day: date.getDate() };
  }
  function calendarFromUtc(date) {
    return { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate() };
  }
  function calendarAddDays(date, amount) {
    return calendarFromUtc(new Date(Date.UTC(date.year, date.month, date.day + amount)));
  }
  function calendarDaysInMonth(year, month) {
    return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  }
  function calendarShiftMonth(date, amount) {
    const anchor = new Date(Date.UTC(date.year, date.month + amount, 1));
    const year = anchor.getUTCFullYear();
    const month = anchor.getUTCMonth();
    return { year, month, day: Math.min(date.day, calendarDaysInMonth(year, month)) };
  }
  function calendarIso(date) {
    return `${String(date.year).padStart(4, "0")}-${String(date.month + 1).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
  }
  function calendarSameDate(a, b) {
    return a !== null && a.year === b.year && a.month === b.month && a.day === b.day;
  }
  function calendarRules(selector) {
    const fg = cssVar("fg");
    const accent = cssVar("accent");
    const muted = cssVar("muted");
    const mono = GRID_FONT;
    return [
      `${selector}{display:inline-block;color:${fg};font:inherit;box-sizing:border-box}`,
      `${selector} [data-calendar-part="root"]{width:21rem;max-width:100%;box-sizing:border-box}`,
      `${selector} [data-calendar-part="header"]{display:grid;grid-template-columns:2.25rem 1fr 2.25rem;align-items:center;gap:.5rem;margin-block-end:.7rem}`,
      `${selector} [data-calendar-part="heading"]{margin:0;text-align:center;font:inherit;font-size:.75em;line-height:1.3;letter-spacing:.04em;text-transform:uppercase}`,
      `${selector} [data-calendar-part="move"]{appearance:none;width:2.25rem;height:2.25rem;margin:0;padding:0;border:0;border-radius:0;background:transparent;color:${fg};font-family:${mono};font-size:1em;line-height:1;cursor:pointer}`,
      `${selector} [data-calendar-part="move"]:hover{color:${accent}}`,
      `${selector} button:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
      `${selector} [data-calendar-part="grid"]{font-family:${mono};font-variant-numeric:tabular-nums}`,
      `${selector} [data-calendar-part="week"],${selector} [data-calendar-part="row"]{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));align-items:center}`,
      `${selector} [data-calendar-part="week"]{padding-block:.35rem .55rem;border-bottom:1px solid ${muted};color:${muted};font-size:.75em;letter-spacing:.04em;text-transform:uppercase}`,
      `${selector} [data-calendar-part="weekday"]{text-align:center}`,
      `${selector} [data-calendar-part="days"]{padding-block-start:.4rem;font-size:.8em}`,
      `${selector} [data-calendar-part="row"]+[data-calendar-part="row"]{margin-block-start:.15rem}`,
      `${selector} [data-calendar-part="cell"]{display:grid;place-items:center;min-width:0;height:2.5rem}`,
      `${selector} [data-calendar-part="day"]{appearance:none;width:2.25rem;height:2.25rem;margin:0;padding:0;border:0;border-radius:0;background:transparent;color:${fg};font:inherit;line-height:1;cursor:pointer;text-underline-offset:.2em;text-decoration-thickness:1px}`,
      `${selector} [data-calendar-part="day"]:hover{background:color-mix(in srgb,${fg} 10%,transparent)}`,
      `${selector} [data-calendar-today="true"]{text-decoration-line:underline;text-decoration-color:${accent}}`,
      `${selector} [data-calendar-selected="true"],${selector} [data-calendar-selected="true"]:hover{background:${accent};color:${cssOn("accent")}}`
    ].join("\n");
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    const emit = emitter(host);
    const attrs = hostAttributes(host);
    const sheet = scope(host);
    const today = calendarToday();
    let selected = calendarParseDate(props.value ?? props.defaultValue);
    let visible = calendarParseMonth(props.month) ?? calendarParseDate(props.value ?? "") ?? today;
    let focusDate = selected && selected.year === visible.year && selected.month === visible.month ? selected : today.year === visible.year && today.month === visible.month ? today : { ...visible, day: 1 };
    const owned = (tag) => {
      const element = document.createElement(tag);
      element.setAttribute("data-pica", "");
      return element;
    };
    const root = owned("div");
    root.setAttribute("data-calendar-part", "root");
    const header = owned("div");
    header.setAttribute("data-calendar-part", "header");
    const previous = owned("button");
    previous.type = "button";
    previous.setAttribute("data-calendar-part", "move");
    previous.setAttribute("aria-label", "Previous month");
    previous.tabIndex = -1;
    previous.textContent = "←";
    const heading = owned("h2");
    const headingId = nextId("pica-calendar-month");
    heading.id = headingId;
    heading.setAttribute("data-calendar-part", "heading");
    heading.setAttribute("aria-live", "polite");
    heading.setAttribute("aria-atomic", "true");
    const next = owned("button");
    next.type = "button";
    next.setAttribute("data-calendar-part", "move");
    next.setAttribute("aria-label", "Next month");
    next.tabIndex = -1;
    next.textContent = "→";
    header.append(previous, heading, next);
    const grid = owned("div");
    grid.setAttribute("data-calendar-part", "grid");
    grid.setAttribute("role", "grid");
    grid.setAttribute("aria-labelledby", headingId);
    const week = owned("div");
    week.setAttribute("data-calendar-part", "week");
    week.setAttribute("role", "row");
    const days = owned("div");
    days.setAttribute("data-calendar-part", "days");
    grid.append(week, days);
    root.append(header, grid);
    host.append(root);
    function renderWeekdays() {
      week.replaceChildren();
      const start = props.weekStartsOn === 0 ? 0 : 1;
      for (let index = 0; index < 7; index++) {
        const weekdayIndex = (start + index) % 7;
        const name = CALENDAR_WEEKDAY_NAMES[weekdayIndex] ?? "";
        const cell = owned("div");
        cell.setAttribute("data-calendar-part", "weekday");
        cell.setAttribute("role", "columnheader");
        cell.setAttribute("aria-label", name);
        cell.textContent = name.slice(0, 2);
        week.append(cell);
      }
    }
    function renderDays(focusAfter = false) {
      heading.textContent = `${CALENDAR_MONTH_NAMES[visible.month] ?? ""} ${visible.year}`;
      days.replaceChildren();
      const firstWeekday = new Date(Date.UTC(visible.year, visible.month, 1)).getUTCDay();
      const start = props.weekStartsOn === 0 ? 0 : 1;
      const offset = (firstWeekday - start + 7) % 7;
      const count = calendarDaysInMonth(visible.year, visible.month);
      const cells = Math.ceil((offset + count) / 7) * 7;
      let focusTarget = null;
      for (let cellIndex = 0; cellIndex < cells; cellIndex += 7) {
        const row = owned("div");
        row.setAttribute("data-calendar-part", "row");
        row.setAttribute("role", "row");
        for (let column = 0; column < 7; column++) {
          const dayNumber = cellIndex + column - offset + 1;
          const cell = owned("div");
          cell.setAttribute("data-calendar-part", "cell");
          cell.setAttribute("role", "gridcell");
          if (dayNumber >= 1 && dayNumber <= count) {
            const date = { year: visible.year, month: visible.month, day: dayNumber };
            const isSelected = calendarSameDate(selected, date);
            const isToday = calendarSameDate(today, date);
            const isFocus = calendarSameDate(focusDate, date);
            const button = owned("button");
            button.type = "button";
            button.setAttribute("data-calendar-part", "day");
            button.setAttribute("data-calendar-date", calendarIso(date));
            button.setAttribute("data-calendar-today", String(isToday));
            button.setAttribute("data-calendar-selected", String(isSelected));
            button.setAttribute("aria-label", `${CALENDAR_WEEKDAY_NAMES[new Date(Date.UTC(date.year, date.month, date.day)).getUTCDay()]}, ${CALENDAR_MONTH_NAMES[date.month]} ${date.day}, ${date.year}`);
            button.tabIndex = isFocus ? 0 : -1;
            button.textContent = String(dayNumber);
            cell.setAttribute("aria-selected", String(isSelected));
            if (isToday) button.setAttribute("aria-current", "date");
            if (isFocus) focusTarget = button;
            cell.append(button);
          }
          row.append(cell);
        }
        days.append(row);
      }
      if (focusAfter) focusTarget?.focus();
    }
    function render(focusAfter = false) {
      renderWeekdays();
      renderDays(focusAfter);
    }
    function moveFocus(date) {
      focusDate = date;
      visible = { year: date.year, month: date.month, day: 1 };
      render(true);
    }
    function choose(date) {
      if (props.value === null) {
        selected = date;
        focusDate = date;
        render(true);
      }
      emit("valueChange", calendarIso(date));
    }
    const onPrevious = () => {
      visible = calendarShiftMonth(focusDate, -1);
      focusDate = visible;
      render();
    };
    const onNext = () => {
      visible = calendarShiftMonth(focusDate, 1);
      focusDate = visible;
      render();
    };
    const onGridClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest("button[data-calendar-date]");
      if (!(button instanceof HTMLButtonElement) || !grid.contains(button)) return;
      const date = calendarParseDate(button.getAttribute("data-calendar-date") ?? "");
      if (date) choose(date);
    };
    const onGridKeydown = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement) || !target.hasAttribute("data-calendar-date")) return;
      let destination = null;
      if (event.key === "ArrowLeft") destination = calendarAddDays(focusDate, -1);
      else if (event.key === "ArrowRight") destination = calendarAddDays(focusDate, 1);
      else if (event.key === "ArrowUp") destination = calendarAddDays(focusDate, -7);
      else if (event.key === "ArrowDown") destination = calendarAddDays(focusDate, 7);
      else if (event.key === "Home") {
        const weekday = new Date(Date.UTC(focusDate.year, focusDate.month, focusDate.day)).getUTCDay();
        destination = calendarAddDays(focusDate, -((weekday - (props.weekStartsOn === 0 ? 0 : 1) + 7) % 7));
      } else if (event.key === "End") {
        const weekday = new Date(Date.UTC(focusDate.year, focusDate.month, focusDate.day)).getUTCDay();
        destination = calendarAddDays(focusDate, 6 - (weekday - (props.weekStartsOn === 0 ? 0 : 1) + 7) % 7);
      } else if (event.key === "PageUp") destination = calendarShiftMonth(focusDate, event.shiftKey ? -12 : -1);
      else if (event.key === "PageDown") destination = calendarShiftMonth(focusDate, event.shiftKey ? 12 : 1);
      if (!destination) return;
      event.preventDefault();
      moveFocus(destination);
    };
    previous.addEventListener("click", onPrevious);
    next.addEventListener("click", onNext);
    grid.addEventListener("click", onGridClick);
    grid.addEventListener("keydown", onGridKeydown);
    attrs.set("role", "group");
    attrs.set("aria-label", props.label);
    sheet.setRules(calendarRules(sheet.selector));
    render();
    host.dataset.picaReady = "true";
    return {
      update(partial) {
        const priorValue = props.value;
        const priorMonth = props.month;
        const priorWeekStart = props.weekStartsOn;
        props = { ...props, ...partial };
        attrs.set("aria-label", props.label);
        if (props.value !== priorValue && props.value !== null) {
          selected = calendarParseDate(props.value);
          if (selected && props.month === null) {
            visible = { ...selected, day: 1 };
            focusDate = selected;
          }
        }
        if (props.month !== priorMonth) {
          const explicit = calendarParseMonth(props.month);
          if (explicit) {
            visible = explicit;
            focusDate = { ...explicit, day: Math.min(focusDate.day, calendarDaysInMonth(explicit.year, explicit.month)) };
          }
        }
        if (props.weekStartsOn !== priorWeekStart || props.value !== priorValue || props.month !== priorMonth) render();
      },
      destroy() {
        previous.removeEventListener("click", onPrevious);
        next.removeEventListener("click", onNext);
        grid.removeEventListener("click", onGridClick);
        grid.removeEventListener("keydown", onGridKeydown);
        root.remove();
        sheet.destroy();
        attrs.restore();
        delete host.dataset.picaReady;
      }
    };
  };
  return __toCommonJS(core_exports);
})();

(function () {
  var host = document.getElementById("pica");
  function take(props) {
    var data = {};
    for (var key in props) {
      if (key !== "palette") data[key] = props[key];
    }
    var palette = props.palette || {};
    for (var token in palette) {
      if (palette[token]) host.style.setProperty("--pica-" + token, palette[token]);
      else host.style.removeProperty("--pica-" + token);
    }
    return data;
  }
  var instance = PicaCalendar.mount(host, take(window.PICA_PROPS || {}));
  ["valueChange"].forEach(function (name) {
    host.addEventListener("pica:" + name.toLowerCase(), function (event) {
      if (window.parent !== window) window.parent.postMessage({ type: "pica:event", name: name, detail: event.detail }, "*");
    });
  });
  window.addEventListener("message", function (event) {
    if (event.source !== window.parent || !event.data) return;
    if (event.data.type === "pica:props") instance.update(take(event.data.props));
    if (event.data.type === "pica:ground") {
      document.documentElement.setAttribute("data-ground", event.data.ground);
      instance.update({});
    }
  });
})();
</script>
</body>
</html>
```

## Credits

- Technique from [Date picker dialog example](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/) by W3C WAI-ARIA Authoring Practices Guide (W3C document).
