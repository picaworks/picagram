"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Festival Route · festival-route
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

// registry/sections/festival-route/core.ts
export interface FestivalVenue {
  /** The venue name. */
  name: string;
  /** The event at this stop. */
  event: string;
  /** The street address. */
  address: string;
  /** The event time. */
  time: string;
  /** Venue access information. */
  access: string;
}

export interface FestivalRouteProps {
  /** The arts walk title. */
  title: string;
  /** The neighbourhood name. */
  neighbourhood: string;
  /** The festival date. */
  date: string;
  /** The welcome statement. */
  introduction: string;
  /** The ordered stops on the route. */
  venues: readonly FestivalVenue[];
}

export const defaults: FestivalRouteProps = {
  title: "Take the long way.",
  neighbourhood: "Eastbank / Open Arts Walk",
  date: "SATURDAY 17 MAY / 11:00—18:00",
  introduction: "Follow the river, turn into a workshop, linger in a courtyard. Five places open their doors for a day of making, listening, and unexpected encounters.",
  venues: [
    { name: "The Print Room", event: "Make a two-colour edition", address: "8 Foundry Street", time: "11:00–13:00", access: "Step-free entrance; seated worktables." },
    { name: "Canal Yard", event: "Sound in the open air", address: "21 Canal Walk", time: "12:00–15:00", access: "Level outdoor route; accessible toilet." },
    { name: "Former Post Office", event: "Artists at work", address: "3 Bridge Road", time: "13:00–16:00", access: "Ramp entrance on Bridge Road." },
    { name: "Glasshouse", event: "Objects, stories, and tea", address: "16 Garden Lane", time: "14:00–17:00", access: "Wide doors; quiet room available." },
    { name: "River Steps", event: "A closing performance", address: "South Quay", time: "17:00–18:00", access: "Level viewing space above the steps." },
  ],
};

function routeNode<K extends keyof HTMLElementTagNameMap>(tag: K, part: string, text = ""): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  if (part) el.setAttribute("data-pica-part", part);
  el.textContent = text;
  return el;
}

function routeSvg<K extends keyof SVGElementTagNameMap>(tag: K, values: Readonly<Record<string, string>>): SVGElementTagNameMap[K] {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  el.setAttribute("data-pica", "");
  for (const [key, value] of Object.entries(values)) el.setAttribute(key, value);
  return el;
}

function routeLink(label: string, target: string): HTMLAnchorElement {
  const a = routeNode("a", "", label);
  a.href = `#${target}`;
  return a;
}

function routeRules(s: string): string {
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

${s} [data-pica-part="opening"]{display:grid;grid-template-columns:1.1fr 1fr;gap:80px;padding:36px 0 42px}
${s} [data-pica-part="opening"] h1{font-family:var(--pica-font-wide,inherit);font-size:clamp(56px,7vw,88px);max-width:9ch;font-weight:600;line-height:.98}
${s} [data-pica-part="intro"]{display:grid;gap:22px;align-content:start}
${s} [data-pica-part="intro"] p{font-size:18px;line-height:1.6}
${s} [data-pica-part="middle"]{display:grid;grid-template-columns:2fr 1fr;border-top:1px solid ${fg};border-bottom:1px solid ${fg}}
${s} [data-pica-part="map"]{padding:28px 28px 20px 0}
${s} [data-pica-part="map"] figcaption{color:${muted};font-size:9px;margin-top:16px}
${s} [data-pica-part="map-number"]{font-family:${GRID_FONT};font-size:15px;fill:currentColor;stroke:none}
${s} [data-pica-part="map-label"]{font-family:${GRID_FONT};font-size:10px;fill:currentColor;stroke:none;letter-spacing:2px}
${s} [data-pica-part="key"]{border-left:1px solid ${fg};padding:26px 0 26px 30px;display:grid;gap:14px;align-content:start;font-size:14px}
${s} [data-pica-part="distance"]{font-family:${GRID_FONT};font-size:90px;line-height:1;letter-spacing:-.08em}
${s} [data-pica-part="stops"]{padding-top:34px}
${s} [data-pica-part="itinerary"]{list-style:none;padding:0;margin:25px 0 0;border-top:1px solid ${fg}}
${s} [data-pica-part="stop"]{display:grid;grid-template-columns:50px 1.4fr 1.3fr 1fr;gap:20px;padding:20px 0;border-bottom:1px solid ${muted};align-items:start}
${s} [data-pica-part="stop-number"]{font-family:${GRID_FONT};font-size:16px;color:${fg};border-left:3px solid ${accent};padding-left:8px}
${s} [data-pica-part="address"]{font-family:${GRID_FONT};font-size:11px;margin-top:6px;color:${muted}}
${s} [data-pica-part="event"]{font-size:14px;display:grid;gap:8px}
${s} [data-pica-part="access-note"]{font-size:12px;color:${muted}}
${s} [data-pica-part="access"]{display:grid;grid-template-columns:1fr 2fr;gap:20px;margin-top:34px;font-size:14px}
${s} [data-pica-part="access"]>p:last-child{grid-column:2}
@media(max-width:900px){${s} [data-pica-part="opening"]{gap:35px}${s} [data-pica-part="distance"]{font-size:65px}${s} [data-pica-part="stop"]{grid-template-columns:36px 1.2fr 1fr}${s} [data-pica-part="access-note"]{grid-column:2/-1}}
@media(max-width:600px){${s} [data-pica-part="map-number"]{font-size:24px}${s} [data-pica-part="map-label"]{font-size:16px}${s} [data-pica-part="opening"]{grid-template-columns:1fr;gap:22px;padding:26px 0 30px}${s} [data-pica-part="opening"] h1{font-size:62px}${s} [data-pica-part="intro"] p{font-size:16px}${s} [data-pica-part="middle"]{grid-template-columns:1fr}${s} [data-pica-part="map"]{padding-right:0}${s} [data-pica-part="key"]{border-left:0;border-top:1px solid ${fg};padding:20px 0;grid-template-columns:1fr 1fr}${s} [data-pica-part="key"]>span:first-child{grid-column:1/-1}${s} [data-pica-part="key"]>p{grid-column:1/-1}${s} [data-pica-part="distance"]{font-size:58px}${s} [data-pica-part="stop"]{grid-template-columns:30px 1fr;gap:10px 15px}${s} [data-pica-part="event"],${s} [data-pica-part="access-note"]{grid-column:2}${s} [data-pica-part="access"]{grid-template-columns:1fr;gap:15px}${s} [data-pica-part="access"]>p:last-child{grid-column:auto}}
`;
}

export const mount: Mount<FestivalRouteProps> = (host, initial = {}) => {
  let props: FestivalRouteProps = { ...defaults, ...initial };
  const attributes = hostAttributes(host);
  const container = routeNode("div", "");
  host.append(container);
  const sheet = scope(container);
  const page = routeNode("article", "");
  page.setAttribute("data-pica-page", "");
  container.append(page);
  const id = nextId("pica-festival-route");
  sheet.setRules(routeRules(sheet.selector));
  let destroyed = false;
  const render = (): void => {
    attributes.set("aria-hidden", "false");
    attributes.set("role", "region");
    attributes.set("aria-label", props.title);
    page.replaceChildren();
    const top = routeNode("header", "top");
    top.append(routeNode("span", "label", props.neighbourhood));
    const nav = routeNode("nav", "");
    nav.setAttribute("aria-label", "Walk sections");
    nav.append(routeLink("The route", `${id}-map`), routeLink("All stops", `${id}-stops`), routeLink("Good to know", `${id}-access`));
    top.append(nav);
    const opening = routeNode("div", "opening");
    opening.append(routeNode("h1", "", props.title));
    const intro = routeNode("div", "intro");
    intro.append(routeNode("span", "label", props.date), routeNode("p", "", props.introduction));
    opening.append(intro);
    const middle = routeNode("section", "middle");
    middle.id = `${id}-map`;
    const figure = routeNode("figure", "map");
    const rows = Math.max(1, Math.ceil(props.venues.length / 3));
    const height = Math.max(360, rows * 105 + 150);
    const drawing = routeSvg("svg", { viewBox: `0 0 640 ${height}`, role: "img", "aria-label": "Schematic neighbourhood route. Stops are numbered in itinerary order; the drawing is not to scale." });
    drawing.append(routeSvg("path", { d: `M20 ${height - 45}Q210 ${height - 115} 305 ${height - 72}T620 ${height - 95} M20 ${height - 25}Q210 ${height - 95} 305 ${height - 52}T620 ${height - 75}`, "stroke-width": "2" }));
    for (const x of [85, 320, 555]) drawing.append(routeSvg("path", { d: `M${x} 25V${height - 130}`, "stroke-dasharray": "2 6" }));
    for (let row = 0; row < rows; row++) drawing.append(routeSvg("path", { d: `M25 ${85 + row * 105}H615`, "stroke-dasharray": "2 6" }));
    const positions = props.venues.map((_, i) => {
      const row = Math.floor(i / 3);
      return [85 + (row % 2 === 0 ? i % 3 : 2 - i % 3) * 235, 85 + row * 105] as const;
    });
    for (const [i, point] of positions.entries()) {
      const [x, y] = point;
      const previous = positions[i - 1];
      if (previous) {
        const dx = Math.sign(x - previous[0]);
        const dy = Math.sign(y - previous[1]);
        drawing.append(routeSvg("path", { d: `M${previous[0] + dx * 21} ${previous[1] + dy * 21}L${x - dx * 21} ${y - dy * 21}`, "stroke-width": "3", "data-pica-part": "accent" }));
      }
      drawing.append(routeSvg("rect", { x: String(x - 18), y: String(y - 18), width: "36", height: "36", "stroke-width": "2" }));
      const text = routeSvg("text", { x: String(x), y: String(y + 6), "text-anchor": "middle", "data-pica-part": "map-number" });
      text.textContent = String(i + 1).padStart(2, "0");
      drawing.append(text);
    }
    const river = routeSvg("text", { x: "55", y: String(height - 50), "data-pica-part": "map-label" });
    river.textContent = "RIVER EAST";
    drawing.append(river);
    figure.append(drawing, routeNode("figcaption", "label", "Schematic / follow the numbered route / not to scale"));
    const key = routeNode("aside", "key");
    key.setAttribute("aria-label", "Walk overview");
    key.append(routeNode("span", "label", "A walk at your own pace"), routeNode("div", "distance", "2.4"), routeNode("span", "label", "kilometres / about 40 minutes"), routeNode("p", "", "Begin anywhere. Stay as long as you like. The full route follows paved streets and the level riverside path."), routeNode("p", "muted", "Look for the numbered signs at each doorway."));
    middle.append(figure, key);
    const stops = routeNode("section", "stops");
    stops.id = `${id}-stops`;
    stops.append(routeNode("h2", "", `${props.venues.length} doors, one neighbourhood`));
    const itinerary = routeNode("ol", "itinerary");
    for (const [i, venue] of props.venues.entries()) {
      const stop = routeNode("li", "stop");
      stop.append(routeNode("span", "stop-number", String(i + 1).padStart(2, "0")));
      const place = routeNode("div", "place");
      place.append(routeNode("h3", "", venue.name), routeNode("p", "address", venue.address));
      const event = routeNode("div", "event");
      event.append(routeNode("p", "", venue.event), routeNode("p", "label", venue.time));
      stop.append(place, event, routeNode("p", "access-note", venue.access));
      itinerary.append(stop);
    }
    stops.append(itinerary);
    const access = routeNode("section", "access");
    access.id = `${id}-access`;
    access.append(routeNode("span", "label", "Everyone is welcome"), routeNode("p", "", "All events are free and drop-in. Children are welcome with an adult. Pick up a printed route at any venue. Water refill points are available at Canal Yard and Glasshouse."), routeNode("p", "muted", "Wet weather plan: outdoor performances move to the Former Post Office. Ask a steward for the latest information."));
    const footer = routeNode("footer", "footer");
    footer.append(routeNode("span", "label", "Made possible by the people of Eastbank"), routeLink("Back to the route ↑", `${id}-map`));
    page.append(top, opening, middle, stops, access, footer);
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

// registry/sections/festival-route/index.tsx
export type FestivalRouteComponentProps = Partial<FestivalRouteProps> & WrapperProps;

/** A neighbourhood arts walk with an original schematic route, ordered venues, and accessible event information. */
export function FestivalRoute({ className, style, palette, ...props }: FestivalRouteComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
