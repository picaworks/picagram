"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Cinemateque Program · cinemateque-program
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

// registry/sections/cinemateque-program/core.ts
export interface CinematequeFilm {
  /** The screening day and time. */
  when: string;
  /** The film title. */
  title: string;
  /** Director, year, runtime, and format. */
  credit: string;
  /** A short note about the screening. */
  note: string;
}

export interface CinematequeProgramProps {
  /** The name of the film series. */
  title: string;
  /** The cinema or presenting institution. */
  cinema: string;
  /** A large issue date or month. */
  date: string;
  /** The opening curatorial statement. */
  introduction: string;
  /** The ordered screening program. */
  films: readonly CinematequeFilm[];
}

export const defaults: CinematequeProgramProps = {
  title: "The city after dark",
  cinema: "North Screen / Cinematheque",
  date: "NOV 06—09",
  introduction: "Four nights of streets, strangers, and the spaces in between. A repertory program about the city as both a stage and a state of mind.",
  films: [
    { when: "THU 06 / 19:00", title: "Night on the tram", credit: "Mira Orlov · 1962 · 92 min · 35 mm", note: "A last tram crosses a sleeping city. Introduced by curator Ada Vale." },
    { when: "FRI 07 / 20:30", title: "Windows facing west", credit: "Lucien Morel · 1974 · 108 min · 16 mm", note: "Three apartments, one summer evening. A newly restored print." },
    { when: "SAT 08 / 18:00", title: "Under the railway", credit: "Emi Tanaka · 1988 · 84 min · DCP", note: "A tender portrait of the people who keep the night running." },
    { when: "SUN 09 / 16:00", title: "The morning returns", credit: "Jonas Reed · 1997 · 101 min · 35 mm", note: "The closing screening is followed by a conversation in the foyer." },
  ],
};

function cinemaNode<K extends keyof HTMLElementTagNameMap>(tag: K, part: string, text = ""): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  if (part) el.setAttribute("data-pica-part", part);
  el.textContent = text;
  return el;
}

function cinemaLink(label: string, target: string): HTMLAnchorElement {
  const a = cinemaNode("a", "", label);
  a.href = `#${target}`;
  return a;
}

function cinemaRules(s: string): string {
  const fg = cssVar("fg");
  const bg = cssVar("bg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  return `
${s}{box-sizing:border-box;color:${fg};background:${bg}}
${s} [data-pica-page]{max-width:1200px;margin:auto;padding:clamp(20px,4vw,54px);font-size:16px;line-height:1.55}
${s} [data-pica-page] *{box-sizing:border-box;min-width:0}
${s} h1,${s} h2,${s} h3,${s} p,${s} figure,${s} dl,${s} dd{margin:0}
${s} h1{font:inherit;font-size:clamp(42px,6vw,80px);line-height:.98;letter-spacing:-.055em;font-weight:500}
${s} h2{font:inherit;font-size:clamp(25px,3vw,38px);line-height:1.1;letter-spacing:-.035em;font-weight:500}
${s} h3{font:inherit;font-size:22px;line-height:1.2;letter-spacing:-.02em;font-weight:500}
${s} [data-pica-part="label"]{font-family:${GRID_FONT};font-size:11px;line-height:1.5;letter-spacing:.08em;text-transform:uppercase}
${s} [data-pica-part="muted"]{color:${muted}}
${s} [data-pica-part="top"]{display:flex;justify-content:space-between;align-items:center;gap:18px;border-bottom:1px solid ${fg};padding-bottom:15px}
${s} nav{display:flex;gap:22px;flex-wrap:wrap}
${s} a{color:inherit;text-decoration-thickness:1px;text-underline-offset:4px;font-family:${GRID_FONT};font-size:11px;letter-spacing:.04em}
${s} a:focus-visible,${s} summary:focus-visible{outline:2px solid ${accent};outline-offset:4px}
${s} [data-pica-part="footer"]{display:flex;justify-content:space-between;gap:20px;margin-top:44px;border-top:1px solid ${fg};padding-top:18px;font-size:12px}
${s} svg{display:block;width:100%;height:auto;fill:none;stroke:currentColor;stroke-width:1.4}
${s} [data-pica-part="solid"]{fill:currentColor;stroke:none}
${s} [data-pica-part="accent"]{color:${accent}}
${s} [data-pica-part="rule"]{height:1px;background:${fg}}
@media(max-width:600px){${s} [data-pica-part="top"]{align-items:flex-start;flex-direction:column;gap:12px}${s} nav{gap:17px}${s} [data-pica-part="footer"]{flex-direction:column;gap:8px}${s} [data-pica-page]{font-size:15px}}

${s} [data-pica-part="opening"]{display:grid;grid-template-columns:1fr 2.1fr;gap:42px;padding:40px 0 45px}
${s} [data-pica-part="issue"]{border-right:1px solid ${fg};padding-right:30px;display:flex;flex-direction:column;justify-content:space-between;gap:24px}
${s} [data-pica-part="date"]{font-family:${GRID_FONT};font-size:clamp(40px,5vw,68px);font-weight:500;line-height:.95;letter-spacing:-.08em;max-width:6ch;overflow-wrap:normal;color:${fg};border-bottom:3px solid ${accent};padding-bottom:15px}
${s} [data-pica-part="month"]{display:block;font-size:22px;line-height:1.4;letter-spacing:.04em;margin-bottom:8px}
${s} [data-pica-part="days"]{white-space:nowrap}
${s} [data-pica-part="statement"]{max-width:38rem;margin-top:25px;font-size:18px;line-height:1.55}
${s} [data-pica-part="section-title"]{border-top:1px solid ${fg};padding:18px 0;font-family:${GRID_FONT};font-size:12px;letter-spacing:.05em;text-transform:uppercase}
${s} [data-pica-part="program"]{display:grid;grid-template-columns:1.25fr .75fr 1fr 1fr;border-top:1px solid ${fg};border-bottom:1px solid ${fg}}
${s} [data-pica-part="film"]{padding:22px 20px 30px 0;display:flex;flex-direction:column;gap:14px}
${s} [data-pica-part="film"]+[data-pica-part="film"]{border-left:1px solid ${fg};padding-left:20px}
${s} [data-pica-part="strip"]{font-family:${GRID_FONT};font-size:20px;height:62px;overflow:hidden;display:flex;align-items:center;letter-spacing:4px;color:${muted};border-top:1px solid ${muted};border-bottom:1px solid ${muted}}
${s} [data-pica-part="film"]:nth-child(2) [data-pica-part="strip"]{height:92px}
${s} [data-pica-part="film"]:nth-child(3) [data-pica-part="strip"]{height:44px}
${s} [data-pica-part="credit"]{font-family:${GRID_FONT};font-size:11px;line-height:1.6;color:${muted}}
${s} [data-pica-part="film-note"]{font-size:14px;line-height:1.6}
${s} [data-pica-part="visit"]{display:grid;grid-template-columns:1.25fr 1fr;gap:80px;padding-top:36px}
${s} [data-pica-part="notes"],${s} [data-pica-part="access"]{display:grid;align-content:start;gap:14px}
${s} [data-pica-part="access"]{font-size:14px;border-left:1px solid ${muted};padding-left:26px}
@media(max-width:900px){${s} [data-pica-part="program"]{grid-template-columns:1fr 1fr}${s} [data-pica-part="film"]:nth-child(3){border-left:0;padding-left:0;border-top:1px solid ${fg}}${s} [data-pica-part="film"]:nth-child(4){border-top:1px solid ${fg}}${s} [data-pica-part="visit"]{gap:35px}}
@media(max-width:600px){${s} [data-pica-part="opening"]{grid-template-columns:1fr;gap:25px;padding:26px 0}${s} [data-pica-part="issue"]{border-right:0;flex-direction:row;align-items:flex-start;padding:0;gap:15px}${s} [data-pica-part="issue"]>span{max-width:9ch}${s} [data-pica-part="issue"]>p{display:none}${s} [data-pica-part="date"]{max-width:none;font-size:38px;letter-spacing:-.08em}${s} [data-pica-part="month"]{font-size:16px;margin-bottom:4px}${s} [data-pica-part="program"]{grid-template-columns:1fr}${s} [data-pica-part="film"]+[data-pica-part="film"]{border-left:0;padding-left:0;border-top:1px solid ${fg}}${s} [data-pica-part="strip"]{height:45px!important}${s} [data-pica-part="visit"]{grid-template-columns:1fr;gap:25px}${s} [data-pica-part="access"]{padding-left:0;border-left:0;border-top:1px solid ${muted};padding-top:20px}}
`;
}

export const mount: Mount<CinematequeProgramProps> = (host, initial = {}) => {
  let props: CinematequeProgramProps = { ...defaults, ...initial };
  const attributes = hostAttributes(host);
  const container = cinemaNode("div", "");
  host.append(container);
  const sheet = scope(container);
  const page = cinemaNode("article", "");
  page.setAttribute("data-pica-page", "");
  container.append(page);
  const id = nextId("pica-cinemateque-program");
  sheet.setRules(cinemaRules(sheet.selector));
  let destroyed = false;
  const render = (): void => {
    attributes.set("aria-hidden", "false");
    attributes.set("role", "region");
    attributes.set("aria-label", props.title);
    page.replaceChildren();
    const top = cinemaNode("header", "top");
    top.append(cinemaNode("span", "label", props.cinema));
    const nav = cinemaNode("nav", "");
    nav.setAttribute("aria-label", "Program sections");
    nav.append(cinemaLink("01 / Screenings", `${id}-screenings`), cinemaLink("02 / Visiting", `${id}-visit`));
    top.append(nav);
    const opening = cinemaNode("div", "opening");
    const issue = cinemaNode("div", "issue");
    const date = cinemaNode("div", "date");
    const dateParts = props.date.trim().split(/\s+/);
    if (dateParts.length > 1) {
      date.append(cinemaNode("span", "month", `${dateParts.shift() ?? ""} `), cinemaNode("span", "days", dateParts.join(" ")));
    } else date.textContent = props.date;
    issue.append(cinemaNode("span", "label", "PROGRAM 041 / REPERTORY"), date, cinemaNode("p", "label", "One screen. Shared attention."));
    const intro = cinemaNode("div", "intro");
    intro.append(cinemaNode("h1", "", props.title), cinemaNode("p", "statement", props.introduction));
    opening.append(issue, intro);
    const screenings = cinemaNode("section", "screenings");
    screenings.id = `${id}-screenings`;
    screenings.append(cinemaNode("h2", "section-title", "On the screen"));
    const program = cinemaNode("div", "program");
    for (const [i, film] of props.films.entries()) {
      const screening = cinemaNode("article", "film");
      screening.append(cinemaNode("span", "label", `${String(i + 1).padStart(2, "0")}  /  ${film.when}`));
      const strip = cinemaNode("div", "strip");
      strip.setAttribute("aria-hidden", "true");
      strip.append(cinemaNode("span", "", "▥ ▥ ▥ ▥ ▥ ▥ ▥ ▥ ▥ ▥ ▥ ▥"));
      screening.append(strip, cinemaNode("h3", "", film.title), cinemaNode("p", "credit", film.credit), cinemaNode("p", "film-note", film.note));
      program.append(screening);
    }
    screenings.append(program);
    const visit = cinemaNode("section", "visit");
    visit.id = `${id}-visit`;
    const notes = cinemaNode("div", "notes");
    notes.append(cinemaNode("span", "label", "A note on projection"), cinemaNode("h2", "", "Seen together, in the dark."), cinemaNode("p", "", "Each print has its own grain, rhythm, and history. The lights come down at the listed time; arrive fifteen minutes early to find your seat."));
    const access = cinemaNode("div", "access");
    access.append(cinemaNode("span", "label", "Plan your evening"), cinemaNode("p", "", "Box office opens 45 minutes before each screening. All films include English subtitles. Step-free entry is available from the courtyard."), cinemaNode("p", "muted", "12 Mercer Lane · 86 seats · Hearing loop in rows A–D"));
    visit.append(notes, access);
    const footer = cinemaNode("footer", "footer");
    footer.append(cinemaNode("span", "label", "Independent cinema / shared attention"), cinemaLink("Back to screenings ↑", `${id}-screenings`));
    page.append(top, opening, screenings, visit, footer);
    attributes.set("data-pica-ready", "true");
  };
  render();
  return {
    update(next) {
      if (destroyed) return;
      const before = props;
      props = { ...props, ...next };
      if (!sameJson(before, props)) render();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      container.remove();
      sheet.destroy();
      attributes.restore();
    },
  };
};

// registry/sections/cinemateque-program/index.tsx
export type CinematequeProgramComponentProps = Partial<CinematequeProgramProps> & WrapperProps;

/** A repertory cinema program with an oversized screening date, asymmetric schedule, and projection notes. */
export function CinematequeProgram({ className, style, palette, ...props }: CinematequeProgramComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
