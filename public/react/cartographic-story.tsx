"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Cartographic Story · cartographic-story
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

// registry/sections/cartographic-story/core.ts
export interface CartographicStoryProps {
    /** The story title. */
    title: string;
    /** The story introduction. */
    deck: string;
    /** The essay byline. */
    byline: string;
    /** The journey essay opening. */
    essay: string;
}
export const defaults: CartographicStoryProps = {
    title: "Following the\nwaterline",
    deck: "A walk through the places where a river has changed its mind.",
    byline: "WORDS & DRAWINGS / ADA REED",
    essay: "The river is an unreliable historian. It carries a story forward, then leaves a bend behind. On this walk, the old channel appears first as a dip in a field and later as a line of gardens.",
};
function csNode<K extends keyof HTMLElementTagNameMap>(parent: Element, tag: K, part: string, text?: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    if (part)
        node.dataset.part = part;
    if (text !== undefined)
        node.textContent = text;
    parent.append(node);
    return node;
}
function csLink(parent: Element, text: string, id: string): void {
    const link = csNode(parent, "a", "", text);
    link.href = `#${id}`;
}
function csSvg(parent: Element, tag: string, attrs: Record<string, string>, text?: string): SVGElement {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    node.setAttribute("data-pica", "");
    for (const [key, value] of Object.entries(attrs))
        node.setAttribute(key, value);
    if (text !== undefined)
        node.textContent = text;
    parent.append(node);
    return node;
}
function csRules(s: string): string {
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
  ${s} [data-part="mast"]{display:flex;justify-content:space-between;border-bottom:1px solid ${cssVar("fg")};gap:1rem;padding-bottom:1rem}
  ${s} [data-part="heading"]{display:grid;grid-template-columns:1.3fr 1fr;align-items:end;gap:2rem;padding:3rem 0}
  ${s} [data-part="heading"] h1{font-family:var(--pica-font-serif,inherit);font-size:clamp(3rem,6vw,5.8rem);font-weight:400;line-height:1.03;letter-spacing:-.055em;white-space:pre-line;margin:0}
  ${s} [data-part="deck"]{font-size:1.4rem;line-height:1.5;max-width:25ch}
  ${s} [data-part="nav"]{grid-column:1/-1;display:flex;gap:2rem;border-top:1px solid ${cssVar("muted")};padding-top:1rem}
  ${s} [data-part="journey"]{display:grid;grid-template-columns:1.1fr 1fr;gap:3rem;border-top:1px solid ${cssVar("fg")};padding-top:2rem}
  ${s} [data-part="map"]{margin:0;border-right:1px solid ${cssVar("muted")};padding-right:2rem}
  ${s} [data-part="map"] svg{width:100%;height:auto}
  ${s} .contour{fill:none;stroke:${cssVar("muted")};stroke-width:1}
  ${s} .river{fill:none;stroke:${cssVar("muted")};stroke-width:22}
  ${s} .route{fill:none;stroke:${cssVar("accent")};stroke-width:3;stroke-dasharray:7 5}
  ${s} .road{fill:none;stroke:${cssVar("fg")};stroke-width:1}
  ${s} .waypoint{fill:${cssVar("fg")};stroke:${cssVar("fg")};stroke-width:1}
  ${s} .map-number{fill:${cssOn("fg")};font:11px ${GRID_FONT};text-anchor:middle}
  ${s} .map-text{fill:${cssVar("fg")};font:10px ${GRID_FONT};text-anchor:middle}
  ${s} .north{fill:none;stroke:${cssVar("fg")};stroke-width:1.5}
  ${s} [data-part="caption"]{font:.72rem/1.6 ${GRID_FONT};color:${cssVar("muted")}}
  ${s} [data-part="stop"]{display:grid;grid-template-columns:3rem 1fr;gap:1rem;padding:1rem 0 1.4rem;border-bottom:1px solid ${cssVar("muted")}}
  ${s} [data-part="stop-number"]{font:2rem ${GRID_FONT};color:${cssVar("fg")}}
  ${s} [data-part="stop"] h2{font-family:var(--pica-font-serif,inherit);font-size:1.8rem;font-weight:400;margin:.75rem 0}
  ${s} [data-part="stop"] [data-part="label"]{margin-top:0}
  ${s} [data-part="essay"]{padding:3rem 0 3rem 15%;border-bottom:1px solid ${cssVar("fg")}}
  ${s} [data-part="essay"] h2{font-family:var(--pica-font-serif,inherit);font-size:2.5rem;font-weight:400}
  ${s} [data-part="lead"]{font-size:1.45rem;line-height:1.6;max-width:40rem}
  ${s} [data-part="essay-columns"]{display:grid;grid-template-columns:1fr 1fr;gap:3rem}
  ${s} [data-part="notes"]{padding-top:1.5rem;max-width:44rem}@media(max-width:720px){${s} [data-part="heading"]{grid-template-columns:1fr;padding:2rem 0;gap:1rem}
  ${s} [data-part="heading"] h1{font-size:3.6rem}
  ${s} [data-part="deck"]{max-width:none;font-size:1.2rem}
  ${s} [data-part="nav"]{gap:1rem;flex-wrap:wrap}
  ${s} [data-part="journey"]{grid-template-columns:1fr;gap:1rem}
  ${s} [data-part="map"]{border-right:0;padding-right:0;max-width:32rem}
  ${s} [data-part="map"] svg{max-height:560px}
  ${s} [data-part="essay"]{padding:2rem 0}
  ${s} [data-part="essay-columns"]{grid-template-columns:1fr;gap:0}
  ${s} [data-part="lead"]{font-size:1.2rem}}
  @media(max-width:900px){${s} .map-number{font-size:18px}${s} .map-text{font-size:17px}}
  `;
}
export const mount: Mount<CartographicStoryProps> = (host, initial = {}) => {
    let props: CartographicStoryProps = { ...defaults, ...initial };
    const attrs = hostAttributes(host);
    attrs.set("data-pica-id", host.getAttribute("data-pica-id"));
    const sheet = scope(host);
    const root = csNode(host, "article", "page");
    const ids = [nextId("cartographic-story"), nextId("cartographic-story"), nextId("cartographic-story")];
    sheet.setRules(csRules(sheet.selector));
    function render(p: CartographicStoryProps): void {
        root.replaceChildren();
        attrs.set("role", "region");
        attrs.set("aria-label", p.title.replace(/\n/g, " "));
        attrs.set("aria-hidden", null);
        const mast = csNode(root, "header", "mast");
        csNode(mast, "span", "label", "WALKING ATLAS / STORY 04");
        csNode(mast, "span", "label", p.byline);
        const head = csNode(root, "section", "heading");
        csNode(head, "h1", "", p.title);
        csNode(head, "p", "deck", p.deck);
        const nav = csNode(head, "nav", "nav");
        nav.setAttribute("aria-label", "Journey sections");
        csLink(nav, "Read the route", ids[0]!);
        csLink(nav, "The essay", ids[1]!);
        csLink(nav, "Walking notes", ids[2]!);
        const journey = csNode(root, "section", "journey");
        journey.id = ids[0]!;
        const map = csNode(journey, "figure", "map");
        const svg = csSvg(map, "svg", { viewBox: "0 0 560 730", role: "img", "aria-label": "Schematic river route from the old weir through reed beds and a ferry crossing to the tidal steps" });
        for (let y = 65; y < 700; y += 70)
            csSvg(svg, "path", { d: `M30 ${y}C130 ${y - 45} 250 ${y + 35} 520 ${y - 20}`, class: "contour" });
        csSvg(svg, "path", { d: "M275 10C150 115 392 166 325 257S108 357 230 440S405 530 279 730", class: "river" });
        csSvg(svg, "path", { d: "M222 80L267 186L373 254L316 405L376 516L246 643", class: "route" });
        csSvg(svg, "path", { d: "M45 185H455 M90 395L495 449 M100 585L462 592", class: "road" });
        for (const [x, y, n] of [[222, 80, "01"], [373, 254, "02"], [316, 405, "03"], [246, 643, "04"]]) {
            csSvg(svg, "circle", { cx: String(x), cy: String(y), r: "18", class: "waypoint" });
            csSvg(svg, "text", { x: String(x), y: String(Number(y) + 4), class: "map-number" }, String(n));
        }
        csSvg(svg, "path", { d: "M65 66V26L55 43M65 26L75 43", class: "north" });
        csSvg(svg, "text", { x: "65", y: "89", class: "map-text" }, "N");
        csSvg(svg, "path", { d: "M365 680H490M365 675V685M490 675V685", class: "north" });
        csSvg(svg, "text", { x: "425", y: "706", class: "map-text" }, "1 KM / SCHEMATIC");
        csNode(map, "figcaption", "caption", "FIG. 01 / An invented estuary, drawn to follow a story rather than to guide navigation. Dashed line: walking route. Broad line: water.");
        const stops = csNode(journey, "div", "stops");
        for (const [num, name, dist, body] of [["01", "The old weir", "0.0 KM / START", "The first sound is water dropping over stone. A brass plate records a flood higher than the door of the mill."], ["02", "A field of reeds", "1.4 KM / EAST BANK", "The path follows a channel that no longer flows. The reed stems keep its outline visible above the grass."], ["03", "The ferry that stayed", "2.8 KM / CROSSING", "There is no ferry now, only the landing. People still meet here because a crossing is also a place to pause."], ["04", "The tidal steps", "4.2 KM / END", "At the last step, fresh water stops keeping its own time. The tide arrives, and the route begins to disappear."]]) {
            const stop = csNode(stops, "section", "stop");
            csNode(stop, "span", "stop-number", num);
            const txt = csNode(stop, "div", "");
            csNode(txt, "p", "label", dist);
            csNode(txt, "h2", "", name);
            csNode(txt, "p", "body", body);
        }
        const essay = csNode(root, "section", "essay");
        essay.id = ids[1]!;
        csNode(essay, "p", "label", "FIELD ESSAY / 650 STEPS AT A TIME");
        csNode(essay, "h2", "", "What the map cannot hold");
        csNode(essay, "p", "lead", p.essay);
        const cols = csNode(essay, "div", "essay-columns");
        csNode(cols, "p", "body", "A map makes a clean distinction between land and water. Standing at the edge, the distinction becomes temporary. Silt, reeds, salt, and weather redraw it together. The useful line is the one that admits it will move.");
        csNode(cols, "p", "body", "Walking is a way to read those revisions at human speed. A gate, a bench, a worn step: each marks a negotiation between a changing place and the people who return to it. The route ends. The waterline does not.");
        const notes = csNode(root, "footer", "notes");
        notes.id = ids[2]!;
        csNode(notes, "h2", "label", "WALKING NOTES");
        csNode(notes, "p", "body", "Illustrative route: 4.2 km, approximately two hours at an unhurried pace. This fictional map is a narrative drawing and should not be used for navigation.");
        const d = csNode(notes, "details", "");
        csNode(d, "summary", "", "Read terrain and preparation notes");
        csNode(d, "p", "body", "A real estuary walk requires a current local map, tide information, and checks for path closures. Carry water, choose footwear for soft ground, and use an accessible alternative wherever steps interrupt the route.");
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

// registry/sections/cartographic-story/index.tsx
export type CartographicStoryComponentProps = Partial<CartographicStoryProps> & WrapperProps;
/** A narrative map essay with a traced walking route, numbered field captions, a journey essay, and route notes. */
export function CartographicStory({ className, style, palette, ...props }: CartographicStoryComponentProps) {
    const ref = usePica(mount, props);
    return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}/>;
}
