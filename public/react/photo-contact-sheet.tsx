"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Photo contact sheet · photo-contact-sheet
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

// lib/font.ts
/** The monospace stack glyph components default to. It lives in its own module, so a text component that
 *  never draws a grid does not carry lib/glyph-grid.ts into its single React file just for the font. */
const GRID_FONT = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

// registry/sections/photo-contact-sheet/core.ts
export interface PhotoFrame {
  /** Frame name and subject. */
  title: string;
  /** Location or exposure note. */
  note: string;
  /** Original geometric study to draw. */
  study: "stairs" | "arch" | "window" | "water" | "fold" | "tower";
}
export interface PhotoContactSheetProps {
  /** Photographer name. */
  photographer: string;
  /** Collection title. */
  title: string;
  /** Edition and date. */
  edition: string;
  /** Introduction to the series. */
  introduction: string;
  /** Numbered studies in the contact sheet. */
  frames: readonly PhotoFrame[];
  /** Curatorial note accompanying the selected frame. */
  commentary: string;
}
export const defaults: PhotoContactSheetProps = {
  photographer: "Mara Ellis / Photography", title: "The shape of quiet", edition: "Field studies · Volume 03 · 2026",
  introduction: "Six observations of ordinary structures, made during the hour when the city gives its surfaces back to the light.",
  frames: [
    { title: "Stairwell, 07:12", note: "North elevation / 1⁄125 s", study: "stairs" },
    { title: "A room without a roof", note: "Canal district / 1⁄60 s", study: "arch" },
    { title: "Four panes", note: "Workshop interior / 1⁄250 s", study: "window" },
    { title: "Water against stone", note: "East quay / 1⁄500 s", study: "water" },
    { title: "Folded afternoon", note: "Studio study / 1⁄30 s", study: "fold" },
    { title: "Last wall standing", note: "Railway yard / 1⁄125 s", study: "tower" },
  ],
  commentary: "An edge can describe a whole room. In these studies, the object is less important than the interval around it: a gap, a shadow, a narrow strip of morning. Each frame is drawn here as a tonal plate, preserving the proportions of the observation rather than borrowing a photograph.",
};

function studioNode<K extends keyof HTMLElementTagNameMap>(tag: K, parent: Element, text = "", role = ""): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  if (role) node.setAttribute("data-role", role);
  if (text) node.textContent = text;
  parent.append(node);
  return node;
}
function studioSvg(parent: Element, viewBox: string): SVGSVGElement {
  const node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  node.setAttribute("data-pica", "");
  node.setAttribute("viewBox", viewBox);
  node.setAttribute("aria-hidden", "true");
  node.setAttribute("focusable", "false");
  parent.append(node);
  return node;
}
function studioMark(parent: Element, tag: string, attributes: Record<string, string>): SVGElement {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  node.setAttribute("data-pica", "");
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  parent.append(node);
  return node;
}
function studioLink(parent: Element, label: string, id: string): void {
  const link = studioNode("a", parent, label);
  link.href = `#${id}`;
}
function studioSection(parent: Element, title: string, id: string, role: string): HTMLElement {
  const section = studioNode("section", parent, "", role);
  section.id = id;
  studioNode("h2", section, title);
  return section;
}
function studioRules(s: string): string {
  const fg = cssVar("fg"), bg = cssVar("bg"), muted = cssVar("muted"), accent = cssVar("accent");
  return `
  ${s}{color:${fg};background:${bg};font:inherit;position:relative;box-sizing:border-box}
  ${s} [data-role="page"]{max-width:1440px;margin:auto;padding:clamp(20px,4vw,56px);box-sizing:border-box}
  ${s} [data-role="page"] *{box-sizing:border-box;min-width:0}
  ${s} h1,${s} h2,${s} h3,${s} p,${s} figure{margin:0}
  ${s} h1{font-family:var(--pica-font-wide,inherit);font-weight:500;line-height:.96;letter-spacing:-.055em;font-size:clamp(46px,7vw,104px)}
  ${s} h2{font-weight:500;font-size:clamp(22px,3vw,36px);line-height:1.12;letter-spacing:-.025em}
  ${s} h3{font-size:20px;font-weight:500;line-height:1.2}
  ${s} p{line-height:1.55;max-width:62ch}
  ${s} [data-role="label"],${s} figcaption,${s} th,${s} td,${s} [data-role="number"]{font-family:${GRID_FONT};font-size:11px;line-height:1.5;letter-spacing:.03em}
  ${s} [data-role="label"]{text-transform:uppercase}
  ${s} [data-role="muted"]{color:${muted}}
  ${s} nav{display:flex;gap:20px;flex-wrap:wrap;font-size:12px}
  ${s} a{color:inherit;text-underline-offset:5px;text-decoration-thickness:1px}
  ${s} a:focus-visible,${s} button:focus-visible{outline:2px solid ${accent};outline-offset:5px}
  ${s} button{font:inherit;color:inherit;background:transparent;border:1px solid ${fg};border-radius:0;cursor:pointer}
  ${s} svg{display:block;width:100%;height:auto;color:${fg};fill:none;stroke:currentColor;stroke-width:1;vector-effect:non-scaling-stroke}
  ${s} [data-role="accent"]{color:${accent}}
  ${s} [data-role="top"]>p{color:${muted}}
  ${s} [data-role="top"]{display:flex;justify-content:space-between;gap:24px;align-items:start;padding-bottom:24px;border-bottom:1px solid ${fg}}
  ${s} [data-role="foot"]{display:flex;justify-content:space-between;gap:24px;margin-top:48px;padding-top:18px;border-top:1px solid ${fg};font-size:12px}
  ${s} section{scroll-margin-top:24px}
  @media(max-width:600px){${s} [data-role="top"],${s} [data-role="foot"]{flex-direction:column;gap:14px}${s} h1{font-size:52px}${s} nav{gap:16px}}
  `;
}

function photoPlate(parent: Element, study: PhotoFrame["study"]): void {
  const s = studioSvg(parent, "0 0 300 220");
  studioMark(s, "rect", { x: "1", y: "1", width: "298", height: "218", fill: cssVar("fg"), "fill-opacity": ".06", stroke: "none" });
  if (study === "stairs") {
    for (let i=0;i<9;i++) studioMark(s,"path",{d:`M ${20+i*24} 220 V ${188-i*19} H ${44+i*24} V 220`,fill:cssVar("fg"),"fill-opacity":String(.15+i*.065),stroke:"none"});
    studioMark(s,"path",{d:"M 20 180 L 280 20",stroke:cssVar("fg"),"stroke-width":"2"});
  } else if(study === "arch") {
    studioMark(s,"path",{d:"M 32 220 V 118 C 32 10 268 10 268 118 V 220 H 221 V 120 C 221 53 79 53 79 120 V 220 Z",fill:cssVar("fg"),"fill-opacity":".75",stroke:"none"});
    for(let i=0;i<12;i++) studioMark(s,"path",{d:`M 80 ${125+i*8} H 220`,"stroke-opacity":".25"});
  } else if(study === "window") {
    studioMark(s,"path",{d:"M 40 20 H 260 V 200 H 40 Z M 52 30 V 102 H 146 V 30 Z M 158 30 V 102 H 252 V 30 Z M 52 112 V 184 H 146 V 112 Z M 158 112 V 184 H 252 V 112 Z",fill:cssVar("fg"),"fill-rule":"evenodd","fill-opacity":".8",stroke:"none"});
    for(let i=0;i<15;i++) studioMark(s,"path",{d:`M ${46+i*10} 220 L ${100+i*10} 110`,"stroke-opacity":".3"});
  } else if(study === "water") {
    studioMark(s,"path",{d:"M 0 0 H 92 L 123 85 L 97 150 L 134 220 H 0 Z",fill:cssVar("fg"),"fill-opacity":".8",stroke:"none"});
    for(let i=0;i<22;i++) studioMark(s,"path",{d:`M ${130+(i%3)*9} ${i*10} Q 210 ${i*10-12} 300 ${i*10+3}`,"stroke-opacity":String(.2+(i%4)*.17)});
  } else if(study === "fold") {
    studioMark(s,"path",{d:"M 30 182 L 116 27 L 163 147 L 261 40 L 236 190 Z",fill:cssVar("fg"),"fill-opacity":".25"});
    studioMark(s,"path",{d:"M 116 27 L 163 147 L 30 182 Z",fill:cssVar("fg"),"fill-opacity":".7",stroke:"none"});
    studioMark(s,"path",{d:"M 163 147 L 236 190 L 261 40 Z",fill:cssVar("fg"),"fill-opacity":".45",stroke:"none"});
  } else {
    studioMark(s,"path",{d:"M 102 220 V 34 L 194 14 V 220 Z",fill:cssVar("fg"),"fill-opacity":".65"});
    for(let i=0;i<14;i++) studioMark(s,"path",{d:`M 103 ${47+i*12} L 193 ${27+i*12}`,"stroke-opacity":".4"});
    studioMark(s,"path",{d:"M 194 14 L 233 52 V 220 H 194 Z",fill:cssVar("fg"),"fill-opacity":".2"});
  }
}
export const mount: Mount<PhotoContactSheetProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  const attributes = hostAttributes(host);
  attributes.set("data-pica-id", host.getAttribute("data-pica-id"));
  attributes.set("data-pica-ready", host.getAttribute("data-pica-ready"));
  attributes.set("role", "region");
  attributes.set("aria-label", props.title);
  attributes.set("aria-hidden", null);
  const sheet = scope(host);
  const page = studioNode("div", host, "", "page");
  const ids = [nextId("photo-contact-sheet-a"), nextId("photo-contact-sheet-b"), nextId("photo-contact-sheet-c")];
  sheet.setRules(studioRules(sheet.selector) + `
 ${sheet.selector} [data-role="intro"]{display:grid;grid-template-columns:1.6fr 1fr;gap:20px 64px;padding:36px 0 42px}
 ${sheet.selector} [data-role="intro"] h1{grid-column:1;grid-row:2 / 4} ${sheet.selector} [data-role="intro"]>p:last-child{grid-column:2;grid-row:3;align-self:end}
 ${sheet.selector} [data-role="contact"] h2{font-family:${GRID_FONT};font-size:12px;text-transform:uppercase;margin-bottom:18px}
 ${sheet.selector} [data-role="frames"]{display:grid;grid-template-columns:repeat(3,1fr);gap:24px 20px}
 ${sheet.selector} [data-role="frames"] button{padding:8px;width:100%;border-color:${cssVar("muted")};display:block}
 ${sheet.selector} [data-role="frames"] button[aria-pressed="true"]{border:3px solid ${cssVar("accent")};padding:6px}
 ${sheet.selector} [data-role="frames"] figcaption{display:flex;gap:14px;padding-top:8px}
 ${sheet.selector} [data-role="selected"]{display:grid;grid-template-columns:1.4fr 1fr;gap:28px 48px;border-top:1px solid ${cssVar("fg")};padding-top:28px;margin-top:48px}
 ${sheet.selector} [data-role="selected"] h2{grid-column:1/-1;font-family:${GRID_FONT};font-size:12px;text-transform:uppercase}
 ${sheet.selector} [data-role="large"] svg{width:100%} ${sheet.selector} [data-role="large"] figcaption{margin-top:10px}
 ${sheet.selector} [data-role="caption"]{display:flex;flex-direction:column;gap:20px;justify-content:center}
 @media(max-width:750px){${sheet.selector} [data-role="intro"]{display:block}${sheet.selector} [data-role="intro"]>*{margin-top:20px}${sheet.selector} [data-role="frames"]{grid-template-columns:repeat(2,1fr)}${sheet.selector} [data-role="selected"]{grid-template-columns:1fr}}
`);
  function render(): void {
    page.replaceChildren();
    attributes.set("aria-label", props.title);

    const top=studioNode("header",page,"","top");
    studioNode("p",top,props.photographer,"label");
    const nav=studioNode("nav",top); studioLink(nav,"Contact sheet",ids[0]!); studioLink(nav,"Reading a frame",ids[1]!);
    const intro=studioNode("div",page,"","intro");
    studioNode("p",intro,props.edition,"label"); studioNode("h1",intro,props.title); studioNode("p",intro,props.introduction);
    const gallery=studioSection(page,"01 / Contact sheet",ids[0]!,"contact");
    const grid=studioNode("div",gallery,"","frames");
    const selected=studioSection(page,"02 / Reading a frame",ids[1]!,"selected");
    const image=studioNode("figure",selected,"","large"); const caption=studioNode("div",selected,"","caption");
    let chosen=0;
    function selectFrame(index: number): void {
      chosen=index; const frame=props.frames[index]; image.replaceChildren(); caption.replaceChildren();
      if(!frame){studioNode("p",caption,"Add a frame to begin this collection.");return;}
      photoPlate(image,frame.study); studioNode("figcaption",image,`SELECTED NEGATIVE / ${String(index+1).padStart(2,"0")}`);
      studioNode("p",caption,"A closer observation","label"); studioNode("h3",caption,frame.title);studioNode("p",caption,frame.note,"muted");studioNode("p",caption,props.commentary);
      for(const [i,button] of Array.from(grid.querySelectorAll("button")).entries()) button.setAttribute("aria-pressed",String(i===chosen));
    }
    for(const [i,frame] of props.frames.entries()) {
      const figure=studioNode("figure",grid); const b=studioNode("button",figure);b.type="button";b.setAttribute("aria-label",`View frame ${i+1}: ${frame.title}`);b.setAttribute("aria-pressed",String(i===0));
      photoPlate(b,frame.study); const c=studioNode("figcaption",figure);studioNode("span",c,String(i+1).padStart(2,"0"),"number");studioNode("span",c,frame.title);b.onclick=()=>selectFrame(i);
    }
    selectFrame(0);
    const foot=studioNode("footer",page,"","foot");studioNode("p",foot,"Archive / Six original tonal studies");studioLink(foot,"Return to the contact sheet ↑",ids[0]!);

    attributes.set("data-pica-ready", "true");
  }
  render();
  let destroyed = false;
  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (!sameJson(before, props)) render();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      page.remove();
      sheet.destroy();
      attributes.restore();
    },
  };
};

// registry/sections/photo-contact-sheet/index.tsx
export type PhotoContactSheetComponentProps = Partial<PhotoContactSheetProps> & WrapperProps;

/** A photography collection with original tonal plates, a numbered contact sheet, and selectable frame commentary. */
export function PhotoContactSheet({ className, style, palette, ...props }: PhotoContactSheetComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
