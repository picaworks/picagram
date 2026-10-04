"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Choreographic score · choreographic-score
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

// registry/sections/choreographic-score/core.ts
export interface MovementPhrase {
 /** Phrase title. */
 title: string;
 /** Start time in the piece. */
 time: string;
 /** Length of the phrase. */
 duration: string;
 /** Movement instruction. */
 instruction: string;
 /** Drawing notation for the phrase. */
 notation: "orbit" | "cross" | "fold" | "pause";
}
export interface DanceCredit {
 /** Program role. */
 role: string;
 /** Credited name. */
 name: string;
}
export interface ChoreographicScoreProps {
 /** Company name. */
 company: string;
 /** Performance title. */
 title: string;
 /** Performance information. */
 performance: string;
 /** Artistic program note. */
 note: string;
 /** Movement phrases of the score. */
 phrases: readonly MovementPhrase[];
 /** Cast and production credits. */
 credits: readonly DanceCredit[];
 /** Audience information. */
 audience: string;
}
export const defaults: ChoreographicScoreProps = {
 company:"Common Weight / Contemporary dance",title:"The distance between",performance:"Studio theatre · 18—20 November 2026 · 42 minutes",
 note:"Four bodies negotiate one shared space. A gesture travels from dancer to dancer until its origin is lost. This score preserves the rules of the exchange, leaving its texture to the performers.",
 phrases:[
 {title:"Find the orbit",time:"00:00",duration:"08 min",instruction:"Walk around a point that no one occupies. Keep one person in your peripheral vision. Let the circle change size without agreeing on a leader.",notation:"orbit"},
 {title:"Crossing paths",time:"08:00",duration:"12 min",instruction:"Cross the room on a diagonal. At each encounter, exchange one movement and carry it to the next person. No gesture returns unchanged.",notation:"cross"},
 {title:"Fold and return",time:"20:00",duration:"14 min",instruction:"Lower the centre of weight in four counts. Let the floor receive one point of contact at a time. Rise by reversing the order, not the speed.",notation:"fold"},
 {title:"Hold the interval",time:"34:00",duration:"08 min",instruction:"Leave the last movement unfinished. Stay with the space between two bodies until breathing becomes the only visible rhythm.",notation:"pause"},
 ],
 credits:[{role:"Choreography",name:"Nina Vale"},{role:"Performers",name:"Ari Chen / Sol Lane / Noor Reed / Tess Gray"},{role:"Sound",name:"Milo Hart"},{role:"Lighting",name:"Eden Moss"}],
 audience:"The performance begins in low light and includes periods of silence. Seating is unreserved. The studio opens twenty minutes before the start; a printed score is available at the entrance.",
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


function danceNotation(parent: Element, notation: MovementPhrase["notation"]): void {
 const s=studioSvg(parent,"0 0 260 160");
 studioMark(s,"path",{d:"M 12 80 H 248 M 130 12 V 148","stroke-opacity":".15","stroke-dasharray":"2 5"});
 if(notation==="orbit"){
  for(let i=0;i<3;i++)studioMark(s,"ellipse",{cx:"130",cy:"80",rx:String(43+i*27),ry:String(26+i*16),"stroke-opacity":String(.3+i*.3)});
  for(const [x,y] of [[33,80],[130,22],[227,80],[130,138]])studioMark(s,"circle",{cx:String(x),cy:String(y),r:"5",fill:cssVar("fg")});
  studioMark(s,"path",{d:"M 214 49 l 9 18 l 7 -17",stroke:cssVar("accent"),"stroke-width":"3"});
 }else if(notation==="cross"){
  studioMark(s,"path",{d:"M 24 24 L 236 136 M 24 136 L 236 24","stroke-width":"2"});
  for(let i=0;i<5;i++)studioMark(s,"circle",{cx:String(36+i*46),cy:String(30+i*25),r:"5",fill:cssVar("fg")});
  studioMark(s,"circle",{cx:"130",cy:"80",r:"18",stroke:cssVar("accent"),"stroke-width":"3"});
 }else if(notation==="fold"){
  studioMark(s,"path",{d:"M 22 31 L 73 125 L 124 31 L 175 125 L 226 31","stroke-width":"2"});
  for(const [x,y] of [[22,31],[73,125],[124,31],[175,125],[226,31]])studioMark(s,"circle",{cx:String(x),cy:String(y),r:"5",fill:cssVar("fg")});
  studioMark(s,"path",{d:"M 60 141 H 88",stroke:cssVar("accent"),"stroke-width":"3"});
 }else {
  studioMark(s,"path",{d:"M 85 28 V 132 M 175 28 V 132","stroke-width":"3"});
  for(let i=0;i<7;i++)studioMark(s,"circle",{cx:String(100+i*10),cy:"80",r:"1.5",fill:cssVar("accent"),stroke:"none"});
  studioMark(s,"circle",{cx:"85",cy:"80",r:"8",fill:cssVar("fg")});studioMark(s,"circle",{cx:"175",cy:"80",r:"8",fill:cssVar("fg")});
 }
}
export const mount: Mount<ChoreographicScoreProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  const attributes = hostAttributes(host);
  attributes.set("data-pica-id", host.getAttribute("data-pica-id"));
  attributes.set("data-pica-ready", host.getAttribute("data-pica-ready"));
  attributes.set("role", "region");
  attributes.set("aria-label", props.title);
  attributes.set("aria-hidden", null);
  const sheet = scope(host);
  const page = studioNode("div", host, "", "page");
  const ids = [nextId("choreographic-score-a"), nextId("choreographic-score-b"), nextId("choreographic-score-c")];
  sheet.setRules(studioRules(sheet.selector) + `
 ${sheet.selector} [data-role="dance-head"]{border-top:3px solid ${cssVar("accent")};display:grid;grid-template-columns:2fr 1fr;gap:26px 60px;padding:38px 0 56px}${sheet.selector} [data-role="dance-head"] h1{font-size:clamp(64px,10vw,142px);grid-column:1/-1;max-width:10ch}${sheet.selector} [data-role="subtitle"]{font-family:var(--pica-font-serif,inherit);font-size:28px;max-width:24ch}${sheet.selector} [data-role="dance-head"]>p:last-child{font-size:14px}
 ${sheet.selector} [data-role="score"]>h2{font-family:${GRID_FONT};font-size:12px;text-transform:uppercase;border-top:1px solid ${cssVar("fg")};padding-top:22px}${sheet.selector} [data-role="score-key"]{display:flex;justify-content:space-between;gap:20px;padding:24px 0}${sheet.selector} [data-role="score-key"] p{font-size:11px}
 ${sheet.selector} [data-role="phrase"]{display:grid;grid-template-columns:140px 1fr 1.4fr;gap:36px;padding:26px 0;border-top:1px solid ${cssVar("muted")}}${sheet.selector} [data-role="timestamp"]{font-family:${GRID_FONT};font-size:30px;letter-spacing:-.06em}${sheet.selector} [data-role="time"]{border-right:1px solid ${cssVar("fg")}}${sheet.selector} [data-role="time"] p:last-child{margin-top:12px}${sheet.selector} [data-role="phrase"] svg{max-width:280px}${sheet.selector} [data-role="phrase"] figcaption{margin-top:12px}${sheet.selector} [data-role="instruction"] p{font-size:14px;margin-top:14px}
 ${sheet.selector} [data-role="program"]{display:grid;grid-template-columns:1fr 1.6fr;gap:40px;padding-top:36px;margin-top:28px;border-top:2px solid ${cssVar("fg")}}${sheet.selector} dl{display:grid;grid-template-columns:1fr 2fr;gap:18px;margin:0}${sheet.selector} dt{font-family:${GRID_FONT};font-size:11px;text-transform:uppercase}${sheet.selector} dd{margin:0;font-size:15px}
 ${sheet.selector} [data-role="audience"]{display:grid;grid-template-columns:1fr 1.6fr;gap:40px;margin-top:42px;padding-top:26px;border-top:1px solid ${cssVar("fg")}}
 @media(max-width:700px){${sheet.selector} [data-role="dance-head"]{display:block}${sheet.selector} [data-role="dance-head"]>*{margin-bottom:24px}${sheet.selector} [data-role="dance-head"] h1{font-size:72px}${sheet.selector} [data-role="score-key"]{display:block}${sheet.selector} [data-role="score-key"] p{margin-bottom:14px}${sheet.selector} [data-role="phrase"]{grid-template-columns:80px 1fr;gap:18px}${sheet.selector} [data-role="timestamp"]{font-size:22px}${sheet.selector} [data-role="instruction"]{grid-column:2}${sheet.selector} [data-role="program"],${sheet.selector} [data-role="audience"]{display:block}${sheet.selector} [data-role="program"] h2,${sheet.selector} [data-role="audience"] h2{margin-bottom:24px}${sheet.selector} dl{grid-template-columns:1fr 1.8fr}}
`);
  function render(): void {
    page.replaceChildren();
    attributes.set("aria-label", props.title);

 const top=studioNode("header",page,"","top");studioNode("p",top,props.company,"label");const nav=studioNode("nav",top);studioLink(nav,"Movement score",ids[0]!);studioLink(nav,"Program",ids[1]!);studioLink(nav,"Before you arrive",ids[2]!);
 const intro=studioNode("div",page,"","dance-head");studioNode("p",intro,props.performance,"label");studioNode("h1",intro,props.title);studioNode("p",intro,"A piece for four bodies and the space they share","subtitle");studioNode("p",intro,props.note);
 const score=studioSection(page,"The movement score",ids[0]!,"score");const legend=studioNode("div",score,"","score-key");studioNode("p",legend,"● Body / ─ Path / · Interval / ↗ Transfer","label");studioNode("p",legend,"Read as an instruction, not a fixed sequence.","muted");
 for(const [i,phrase] of props.phrases.entries()) {
 const row=studioNode("article",score,"","phrase");const time=studioNode("div",row,"","time");studioNode("p",time,phrase.time,"timestamp");studioNode("p",time,phrase.duration,"label");const diagram=studioNode("figure",row);danceNotation(diagram,phrase.notation);studioNode("figcaption",diagram,`PHRASE ${String(i+1).padStart(2,"0")}`);const text=studioNode("div",row,"","instruction");studioNode("h3",text,phrase.title);studioNode("p",text,phrase.instruction);
 }
 const program=studioSection(page,"People carrying the piece",ids[1]!,"program");const list=studioNode("dl",program);for(const credit of props.credits){studioNode("dt",list,credit.role);studioNode("dd",list,credit.name);}
 const audience=studioSection(page,"Before you arrive",ids[2]!,"audience");studioNode("p",audience,props.audience);
 const foot=studioNode("footer",page,"","foot");studioNode("p",foot,"Performance program / The score remains open");studioLink(foot,"Read the score again ↑",ids[0]!);

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

// registry/sections/choreographic-score/index.tsx
export type ChoreographicScoreComponentProps = Partial<ChoreographicScoreProps> & WrapperProps;

/** A contemporary dance program with original movement notation, a timed instruction score, cast credits, and audience information. */
export function ChoreographicScore({ className, style, palette, ...props }: ChoreographicScoreComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
