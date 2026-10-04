"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Landscape study · landscape-study
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

// registry/sections/landscape-study/core.ts
export interface LandscapeObservation {
 /** Season of the observation. */
 season: string;
 /** Water table measured below ground. */
 waterTable: string;
 /** Dominant vegetation. */
 vegetation: string;
 /** Field observation. */
 note: string;
}
export interface LandscapeStudyProps {
 /** Research practice. */
 practice: string;
 /** Project title. */
 title: string;
 /** Site location and survey reference. */
 site: string;
 /** Project hypothesis. */
 hypothesis: string;
 /** Seasonal field records. */
 observations: readonly LandscapeObservation[];
 /** Land intervention proposal. */
 intervention: string;
}
export const defaults: LandscapeStudyProps = {
 practice:"Groundwork / Landscape studies",title:"A field learns to hold water",site:"Bracken reach · Plot 06 · Survey datum 42.0 m",
 hypothesis:"A former grazing field lies between a dry ridge and a seasonal stream. We are studying how small changes in the ground can slow runoff and make room for a more varied meadow.",
 observations:[
 {season:"Early spring",waterTable:"0.18 m",vegetation:"Rush / wet grass",note:"Standing water persists at the lower gate for eleven days after rain."},
 {season:"High summer",waterTable:"0.72 m",vegetation:"Yarrow / fescue",note:"The ridge dries first. Seed heads remain intact where mowing is delayed."},
 {season:"Late autumn",waterTable:"0.31 m",vegetation:"Sedge / reed",note:"A shallow channel reconnects to the stream after two consecutive wet days."}
 ],
 intervention:"Cut three shallow swales along the contour. Reuse the excavated soil to raise dry walking edges, keep the lower meadow unmown until August, and record infiltration after each significant rainfall. The first year is a reversible trial across one hectare.",
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


function landscapeContours(parent: Element): void {
 const s=studioSvg(parent,"0 0 800 430");
 for(let i=0;i<18;i++) {
  const scale=.28+i*.082;
  const points: string[]=[];
  for(let j=0;j<=96;j++) {
   const angle=j/96*Math.PI*2;
   const radius=1+.13*Math.sin(3*angle)+.08*Math.cos(5*angle);
   const x=315+280*scale*radius*Math.cos(angle);
   const y=192+170*scale*radius*Math.sin(angle);
   points.push(`${j===0?"M":"L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  studioMark(s,"path",{d:points.join(" ")+" Z","stroke-opacity":String(i%4===0?".8":".35"),"stroke-width":i%4===0?"1.5":"1"});
 }
 studioMark(s,"path",{d:"M 30 346 C 180 301 245 410 386 328 S 638 308 780 238",stroke:cssVar("accent"),"stroke-width":"5"});
 studioMark(s,"path",{d:"M 128 32 L 648 390","stroke-dasharray":"6 6","stroke-width":"2"});
 for(const [x,y] of [[245,185],[390,225],[553,285]])studioMark(s,"circle",{cx:String(x),cy:String(y),r:"6",fill:cssVar("fg"),stroke:"none"});
 studioMark(s,"path",{d:"M 730 82 V 24 L 722 39 M 730 24 L 738 39 M 40 397 H 190 M 40 391 V 403 M 115 391 V 403 M 190 391 V 403","stroke-width":"2"});
}
function landscapeTransect(parent: Element): void {
 const s=studioSvg(parent,"0 0 800 200");
 studioMark(s,"path",{d:"M 20 35 L 96 43 L 170 57 L 250 86 L 320 96 L 390 130 L 470 135 L 525 127 L 580 153 L 650 146 L 730 162 L 780 159 V 190 H 20 Z",fill:cssVar("fg"),"fill-opacity":".09"});
 studioMark(s,"path",{d:"M 20 170 Q 170 153 320 162 T 780 178",stroke:cssVar("accent"),"stroke-dasharray":"5 4","stroke-width":"2"});
 for(let i=0;i<28;i++)studioMark(s,"path",{d:`M ${20+i*28} 191 l 24 -14`,"stroke-opacity":".2"});
 for(const x of [20,250,470,780])studioMark(s,"path",{d:`M ${x} 12 V 191`,"stroke-dasharray":"2 5","stroke-opacity":".3"});
}
export const mount: Mount<LandscapeStudyProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  const attributes = hostAttributes(host);
  attributes.set("data-pica-id", host.getAttribute("data-pica-id"));
  attributes.set("data-pica-ready", host.getAttribute("data-pica-ready"));
  attributes.set("role", "region");
  attributes.set("aria-label", props.title);
  attributes.set("aria-hidden", null);
  const sheet = scope(host);
  const page = studioNode("div", host, "", "page");
  const ids = [nextId("landscape-study-a"), nextId("landscape-study-b"), nextId("landscape-study-c")];
  sheet.setRules(studioRules(sheet.selector) + `
 ${sheet.selector} [data-role="land-head"]{display:grid;grid-template-columns:1.4fr 1fr;gap:26px 64px;padding:40px 0}${sheet.selector} [data-role="land-head"] h1{grid-row:2/4;font-size:clamp(48px,6.5vw,90px)}${sheet.selector} [data-role="land-head"]>p:last-child{grid-column:2;grid-row:3}
 ${sheet.selector} [data-role="survey"]{display:grid;grid-template-columns:2.4fr 1fr;gap:24px 36px;border-top:1px solid ${cssVar("fg")};padding-top:22px}${sheet.selector} [data-role="survey"] h2{grid-column:1/-1;font-family:${GRID_FONT};font-size:12px}
 ${sheet.selector} [data-role="map"]{background:color-mix(in srgb,${cssVar("fg")} 4%,transparent);padding:14px}${sheet.selector} figcaption{padding-top:16px;font-size:10px}
 ${sheet.selector} [data-role="map-notes"]{display:flex;flex-direction:column;gap:22px;padding-top:20px}${sheet.selector} [data-role="map-notes"] p{font-size:13px}${sheet.selector} [data-role="transect"]{grid-column:1/-1;border-bottom:1px solid ${cssVar("fg")};padding:20px 0 28px}
 ${sheet.selector} [data-role="records"]{padding-top:34px}${sheet.selector} [data-role="records"] h2{margin-bottom:28px}${sheet.selector} [data-role="record"]{display:grid;grid-template-columns:40px 1.1fr 1fr 1.4fr;gap:28px;padding:26px 0;border-top:1px solid ${cssVar("muted")}}${sheet.selector} [data-role="measure"]{font-family:var(--pica-font-wide,inherit);font-size:38px;line-height:1.1}${sheet.selector} [data-role="record"]>div:last-child p:last-child{margin-top:12px;font-size:14px}
 ${sheet.selector} [data-role="proposal"]{display:grid;grid-template-columns:1fr 1.6fr;gap:26px 50px;margin-top:40px;padding-top:28px;border-top:2px solid ${cssVar("fg")}}${sheet.selector} [data-role="proposal"]>p:last-child{grid-column:2}
 @media(max-width:750px){${sheet.selector} [data-role="land-head"]{display:block}${sheet.selector} [data-role="land-head"]>*{margin-bottom:24px}${sheet.selector} [data-role="survey"]{grid-template-columns:1fr}${sheet.selector} [data-role="map-notes"]{padding-top:0}${sheet.selector} [data-role="record"]{grid-template-columns:24px 1fr;gap:14px}${sheet.selector} [data-role="record"]>div{grid-column:2}${sheet.selector} [data-role="proposal"]{display:block}${sheet.selector} [data-role="proposal"]>*{margin-bottom:20px}}
`);
  function render(): void {
    page.replaceChildren();
    attributes.set("aria-label", props.title);

 const top=studioNode("header",page,"","top");studioNode("p",top,props.practice,"label");const nav=studioNode("nav",top);studioLink(nav,"Survey",ids[0]!);studioLink(nav,"Field records",ids[1]!);studioLink(nav,"Trial proposal",ids[2]!);
 const intro=studioNode("div",page,"","land-head");studioNode("p",intro,props.site,"label");studioNode("h1",intro,props.title);studioNode("p",intro,props.hypothesis);
 const survey=studioSection(page,"01 / Reading the ground",ids[0]!,"survey");const fig=studioNode("figure",survey,"","map");landscapeContours(fig);studioNode("figcaption",fig,"CONCEPT SURVEY / Contours at 0.5 m intervals / A → A′ transect / Scale bar 0—50 m");
 const notes=studioNode("aside",survey,"","map-notes");studioNode("p",notes,"Site keys","label");studioNode("h3",notes,"Three ground conditions");for(const text of ["01 / Ridge · thin soil, rapid drainage","02 / Mid-field · compacted former pasture","03 / Stream edge · seasonal saturation"])studioNode("p",notes,text);
 const transect=studioNode("figure",survey,"","transect");landscapeTransect(transect);studioNode("figcaption",transect,"SECTION A—A′ / Ridge 48.5 m → Stream edge 42.0 m / Dashed line: seasonal water table");
 const records=studioSection(page,"02 / A year in the field",ids[1]!,"records");
 for(const [i,record] of props.observations.entries()){const row=studioNode("article",records,"","record");studioNode("span",row,String(i+1).padStart(2,"0"),"number");studioNode("h3",row,record.season);const measurement=studioNode("div",row);studioNode("p",measurement,record.waterTable,"measure");studioNode("p",measurement,"Below ground / water table","label");const text=studioNode("div",row);studioNode("p",text,record.vegetation,"label");studioNode("p",text,record.note);}
 const proposal=studioSection(page,"03 / Slow the runoff",ids[2]!,"proposal");studioNode("p",proposal,props.intervention);studioNode("p",proposal,"Measure / Infiltration time · Plant diversity · Days of standing water","label");
 const foot=studioNode("footer",page,"","foot");studioNode("p",foot,"Concept field study / Original diagram, not a navigational survey");studioLink(foot,"Return to survey ↑",ids[0]!);

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

// registry/sections/landscape-study/index.tsx
export type LandscapeStudyComponentProps = Partial<LandscapeStudyProps> & WrapperProps;

/** A landscape research page with original contour and transect diagrams, seasonal field measurements, and a reversible land trial. */
export function LandscapeStudy({ className, style, palette, ...props }: LandscapeStudyComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
