"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Conservation Report · conservation-report
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

// registry/sections/conservation-report/core.ts
export interface ConservationReportProps {
    /** The report headline. */
    title: string;
    /** The heritage project name. */
    site: string;
    /** The case reference. */
    reference: string;
    /** The conservation statement. */
    statement: string;
}
export const defaults: ConservationReportProps = {
    title: "Keeping the\nmarks of time",
    site: "EAST GATE READING ROOM",
    reference: "CASE FILE 026 / COMPLETED 2026",
    statement: "Repair should recover use without erasing the evidence of a building’s life. The work at East Gate began with a drawing of what had survived.",
};
function crNode<K extends keyof HTMLElementTagNameMap>(parent: Element, tag: K, part: string, text?: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    if (part)
        node.dataset.part = part;
    if (text !== undefined)
        node.textContent = text;
    parent.append(node);
    return node;
}
function crLink(parent: Element, text: string, id: string): void {
    const link = crNode(parent, "a", "", text);
    link.href = `#${id}`;
}
function crSvg(parent: Element, tag: string, attrs: Record<string, string>, text?: string): SVGElement {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    node.setAttribute("data-pica", "");
    for (const [key, value] of Object.entries(attrs))
        node.setAttribute(key, value);
    if (text !== undefined)
        node.textContent = text;
    parent.append(node);
    return node;
}
function crElevation(svg: SVGElement, after: boolean): void {
    crSvg(svg, "path", { d: "M60 310H840 M90 285V105L450 25L810 105V285Z M90 105H810 M90 285H810", class: "building" });
    for (const x of [145, 300, 520, 675]) {
        crSvg(svg, "rect", { x: String(x), y: "140", width: "80", height: "115", class: "building" });
        crSvg(svg, "path", { d: `M${x + 40} 140V255 M${x} 185H${x + 80}`, class: "fine" });
    }
    crSvg(svg, "path", { d: "M415 285V145Q450 105 485 145V285 M435 285H465", class: "building" });
    for (let y = 120; y < 280; y += 25)
        crSvg(svg, "path", { d: `M95 ${y}H405 M495 ${y}H805`, class: "masonry" });
    crSvg(svg, "path", { d: after ? "M540 115L565 150L575 150L575 180L600 195L600 225" : "M540 115L565 150L575 150L575 180L600 195L600 225L625 235", class: after ? "repair" : "defect" });
    crSvg(svg, "path", { d: after ? "M340 52L445 29L485 38" : "M355 57L380 49M405 43L445 33", class: after ? "repair" : "defect" });
    crSvg(svg, "path", { d: "M415 284H485", class: after ? "repair" : "defect" });
    crSvg(svg, "path", { d: "M90 340H810 M90 335V345 M810 335V345", class: "fine" });
    crSvg(svg, "text", { x: "450", y: "365", class: "dimension" }, "SOUTH ELEVATION / NOT TO SCALE");
}
function crRules(s: string): string {
    return `
  ${s}{box-sizing:border-box;color:${cssVar("fg")};background:${cssVar("bg")};font-family:var(--pica-font-sans,inherit)}
  ${s} [data-part="page"]{padding:clamp(1.25rem,4.5vw,4.5rem);max-width:1280px;margin:auto}
  ${s} *,${s} *:before,${s} *:after{box-sizing:border-box}
  ${s} section,${s} figure,${s} div{min-width:0}
  ${s} [data-part="label"]{font:.7rem/1.65 ${GRID_FONT};letter-spacing:.06em}
  ${s} [data-part="body"]{font-size:1rem;line-height:1.65}
  ${s} a{color:${cssVar("fg")};font:.75rem/1.65 ${GRID_FONT};text-underline-offset:4px}
  ${s} a:focus-visible,${s} summary:focus-visible{outline:2px solid ${cssVar("accent")};outline-offset:4px}
  ${s} details{margin-top:1rem}
  ${s} summary{cursor:pointer;font:.8rem/1.6 ${GRID_FONT};padding:.6rem 0}
  ${s} h1,${s} h2,${s} h3,${s} p{overflow-wrap:break-word}
  ${s} [data-part="mast"]{display:flex;justify-content:space-between;gap:1rem;border-bottom:1px solid ${cssVar("fg")};padding-bottom:1rem}
  ${s} [data-part="heading"]{display:grid;grid-template-columns:1.3fr 1fr;gap:4rem;padding:3rem 0;align-items:end}
  ${s} [data-part="heading"] h1{font-family:var(--pica-font-serif,inherit);font-size:clamp(3rem,5.8vw,5.6rem);font-weight:400;line-height:1.03;letter-spacing:-.05em;white-space:pre-line;margin:1rem 0 0}
  ${s} [data-part="statement"]{font-size:1.25rem;line-height:1.6}
  ${s} [data-part="nav"]{display:flex;flex-wrap:wrap;gap:3rem;padding:1rem 0;border-block:1px solid ${cssVar("fg")}}
  ${s} [data-part="condition"]{padding:2rem 0}
  ${s} [data-part="elevation"]{margin:0}
  ${s} [data-part="elevation"] svg{width:100%;height:auto}
  ${s} .building{fill:none;stroke:${cssVar("fg")};stroke-width:2}
  ${s} .fine{fill:none;stroke:${cssVar("fg")};stroke-width:1}
  ${s} .masonry{fill:none;stroke:${cssVar("muted")};stroke-width:.6}
  ${s} .defect{fill:none;stroke:${cssVar("accent")};stroke-width:3;stroke-dasharray:5 3}
  ${s} .repair{fill:none;stroke:${cssVar("accent")};stroke-width:5}
  ${s} .marker{fill:${cssVar("fg")}}
  ${s} .mark-text{fill:${cssOn("fg")};font:10px ${GRID_FONT};text-anchor:middle}
  ${s} .dimension{font:12px ${GRID_FONT};fill:${cssVar("muted")};text-anchor:middle}
  ${s} [data-part="caption"]{font:.72rem/1.6 ${GRID_FONT};color:${cssVar("muted")}}
  ${s} [data-part="findings"]{display:grid;grid-template-columns:repeat(3,1fr);gap:2rem;border-top:1px solid ${cssVar("muted")};margin-top:1.5rem;padding-top:1.5rem}
  ${s} [data-part="findings"] h3{font-size:1.25rem;font-weight:500;line-height:1.3}
  ${s} [data-part="work"]{border-top:3px solid ${cssVar("fg")};padding:1.5rem 0}
  ${s} [data-part="work"] h2,${s} [data-part="evidence"] h2{font-size:2.3rem;font-family:var(--pica-font-serif,inherit);font-weight:400}
  ${s} [data-part="compare"]{display:grid;grid-template-columns:1fr 1fr;gap:2rem}
  ${s} [data-part="compare"] figure{margin:0}
  ${s} [data-part="compare"] svg{width:100%;height:auto}
  ${s} [data-part="timeline"]{display:grid;grid-template-columns:repeat(4,1fr);gap:1.5rem;padding:2rem 0 0;list-style:none;counter-reset:stage}
  ${s} [data-part="timeline"] li{border-top:1px solid ${cssVar("muted")};padding-top:1rem;counter-increment:stage}
  ${s} [data-part="timeline"] li:before{content:"0" counter(stage);font:1.5rem ${GRID_FONT};color:${cssVar("fg")}}
  ${s} [data-part="timeline"] h3{font-size:1.05rem;font-weight:500}
  ${s} [data-part="evidence"]{border-top:1px solid ${cssVar("fg")};padding-top:1.5rem}
  ${s} [data-part="evidence"] table{width:100%;border-collapse:collapse;table-layout:fixed}
  ${s} [data-part="evidence"] caption{padding-bottom:1rem}
  ${s} [data-part="evidence"] td,${s} [data-part="evidence"] th{border-top:1px solid ${cssVar("muted")};padding:1rem .8rem 1rem 0;text-align:left;vertical-align:top;overflow-wrap:anywhere}
  ${s} [data-part="evidence"] td{font-size:.95rem;line-height:1.5}
  ${s} [data-part="method"]{padding:1.5rem 0}
  ${s} [data-part="footer"]{font:.7rem/1.7 ${GRID_FONT};border-top:1px solid ${cssVar("muted")};padding-top:1rem}@media(max-width:700px){${s} [data-part="heading"]{grid-template-columns:1fr;gap:1rem;padding:2rem 0}
  ${s} [data-part="heading"] h1{font-size:3.6rem}
  ${s} [data-part="nav"]{gap:1rem}
  ${s} [data-part="findings"]{grid-template-columns:1fr;gap:0}
  ${s} [data-part="findings"] h3{margin:.5rem 0}
  ${s} [data-part="compare"]{grid-template-columns:1fr}
  ${s} [data-part="timeline"]{grid-template-columns:1fr 1fr}
  ${s} [data-part="evidence"] td{font-size:.8rem}
  ${s} [data-part="evidence"] th{font-size:.6rem}}
  @media(max-width:620px){${s} .marker{r:25px}${s} .mark-text{font-size:24px}${s} .dimension{font-size:24px}}
  `;
}
export const mount: Mount<ConservationReportProps> = (host, initial = {}) => {
    let props: ConservationReportProps = { ...defaults, ...initial };
    const attrs = hostAttributes(host);
    attrs.set("data-pica-id", host.getAttribute("data-pica-id"));
    const sheet = scope(host);
    const root = crNode(host, "article", "page");
    const ids = [nextId("conservation-report"), nextId("conservation-report"), nextId("conservation-report")];
    sheet.setRules(crRules(sheet.selector));
    function render(p: ConservationReportProps): void {
        root.replaceChildren();
        attrs.set("role", "region");
        attrs.set("aria-label", p.title.replace(/\n/g, " "));
        attrs.set("aria-hidden", null);
        const mast = crNode(root, "header", "mast");
        crNode(mast, "span", "label", "FIELD OFFICE / CONSERVATION");
        crNode(mast, "span", "label", p.reference);
        const heading = crNode(root, "section", "heading");
        const title = crNode(heading, "div", "");
        crNode(title, "p", "label", p.site);
        crNode(title, "h1", "", p.title);
        crNode(heading, "p", "statement", p.statement);
        const nav = crNode(root, "nav", "nav");
        nav.setAttribute("aria-label", "Case study sections");
        crLink(nav, "01 Condition", ids[0]!);
        crLink(nav, "02 Intervention", ids[1]!);
        crLink(nav, "03 Evidence", ids[2]!);
        const condition = crNode(root, "section", "condition");
        condition.id = ids[0]!;
        const figure = crNode(condition, "figure", "elevation");
        const svg = crSvg(figure, "svg", { viewBox: "0 0 900 390", role: "img", "aria-label": "Condition drawing of a reading room facade: roof joint, cracked masonry, and timber threshold are numbered" });
        crElevation(svg, false);
        for (const [x, y, n] of [[420, 58, "01"], [610, 180, "02"], [315, 295, "03"]]) {
            crSvg(svg, "circle", { cx: String(x), cy: String(y), r: "16", class: "marker" });
            crSvg(svg, "text", { x: String(x), y: String(Number(y) + 4), class: "mark-text" }, String(n));
        }
        crNode(figure, "figcaption", "caption", "FIG. 01 / South elevation, condition survey. Original schematic drawing. Dimensions and defects illustrate a fictional case study.");
        const findings = crNode(condition, "div", "findings");
        for (const [n, title, copy] of [["01", "Water at the roof joint", "Open flashing allowed moisture into the wall head. Map the wet zone before opening the joint."], ["02", "A crack with a history", "The stepped crack followed an earlier repair. Monitor movement and retain sound historic mortar."], ["03", "A worn threshold", "The timber remained structurally useful. Local splicing preserved the surface visitors had made."]]) {
            const f = crNode(findings, "div", "");
            crNode(f, "span", "label", n);
            crNode(f, "h3", "", title);
            crNode(f, "p", "body", copy);
        }
        const work = crNode(root, "section", "work");
        work.id = ids[1]!;
        crNode(work, "h2", "", "Do enough. Leave a record.");
        const compare = crNode(work, "div", "compare");
        for (const [after, label] of [[false, "BEFORE / RECORD THE LOSS"], [true, "AFTER / MAKE THE REPAIR LEGIBLE"]] as const) {
            const f = crNode(compare, "figure", "");
            const s = crSvg(f, "svg", { viewBox: "0 0 900 390", role: "img", "aria-label": after ? "Facade after repairs, with joint and threshold interventions marked" : "Facade before repairs, showing the crack and open roof joint" });
            crElevation(s, after);
            crNode(f, "figcaption", "label", label);
        }
        const timeline = crNode(work, "ol", "timeline");
        for (const [stage, body] of [["Survey / February", "Photograph, draw, and test. Establish a baseline with the room in use."], ["Trial / April", "Prepare small mortar and timber samples. Choose compatibility over visual uniformity."], ["Repair / June", "Renew the roof joint, repoint local losses, and splice the threshold."], ["Review / October", "Compare moisture readings and reopen the maintenance log with the custodians."]]) {
            const li = crNode(timeline, "li", "");
            crNode(li, "h3", "", stage);
            crNode(li, "p", "body", body);
        }
        const evidence = crNode(root, "section", "evidence");
        evidence.id = ids[2]!;
        crNode(evidence, "h2", "", "Evidence before certainty");
        const table = crNode(evidence, "table", "");
        crNode(table, "caption", "caption", "Illustrative project evidence and the decisions it supported.");
        const thead = crNode(table, "thead", "");
        const tr = crNode(thead, "tr", "");
        for (const label of ["Observation", "Evidence", "Decision"]) {
            const t = crNode(tr, "th", "label", label);
            t.setAttribute("scope", "col");
        }
        const tbody = crNode(table, "tbody", "");
        for (const row of [["Moisture at wall head", "Six comparable readings over eight weeks", "Repair flashing, then continue monitoring"], ["Local mortar loss", "Sound adjacent joints and a compatible trial panel", "Repoint losses; retain sound joints"], ["Threshold wear", "Probe confirmed sound internal timber", "Splice the end; keep the worn face"]]) {
            const r = crNode(tbody, "tr", "");
            for (const t of row)
                crNode(r, "td", "", t);
        }
        const d = crNode(evidence, "details", "method");
        crNode(d, "summary", "", "Read the maintenance and method note");
        crNode(d, "p", "body", "Inspect the roof joint after heavy rain, photograph the crack from the same fixed position each quarter, and check the threshold annually. This original fictional report demonstrates editorial structure; real conservation decisions require site-specific evidence and qualified review.");
        crNode(root, "footer", "footer", "FIELD OFFICE · REPAIR / RECORD / RETURN · ORIGINAL CASE STUDY");
    }
    render(props);
    attrs.set("data-pica-ready", "true");
    let destroyed = false;
    return {
        update(next) {
            if (destroyed) return;
            const merged = { ...props, ...next };
            if (!sameJson(props, merged)) {
                props = merged;
                render(props);
            }
        },
        destroy() {
            if (destroyed) return;
            destroyed = true;
            root.remove();
            sheet.destroy();
            attrs.restore();
        },
    };
};

// registry/sections/conservation-report/index.tsx
export type ConservationReportComponentProps = Partial<ConservationReportProps> & WrapperProps;
/** A restoration case study with a condition elevation, paired intervention drawings, an evidence table, and a treatment timeline. */
export function ConservationReport({ className, style, palette, ...props }: ConservationReportComponentProps) {
    const ref = usePica(mount, props);
    return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}/>;
}
