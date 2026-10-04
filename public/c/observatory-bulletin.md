# Observatory Bulletin

> An astronomical field bulletin with an original sky diagram, observing table, equipment notes, and a log disclosure.

Category: sections. Tags: publication, one-page, observatory-bulletin. Static. Size: 4.2 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/observatory-bulletin.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | string | `"A night at the\nedge of winter"` | The bulletin headline. |
| `station` | string | `"NORTH RIDGE OBSERVATORY"` | The observing station. |
| `issue` | string | `"BULLETIN 038 / NOVEMBER 2026"` | The bulletin issue. |
| `note` | string | `"Before dawn, the eastern sky opens a clear window between the roofline and the ridge. The observing plan favours bright targets and patient eyes."` | The field note. |

## Colors

Draws with `--pica-fg`, `--pica-bg`, `--pica-accent`, `--pica-muted`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Observatory Bulletin · observatory-bulletin
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

// registry/sections/observatory-bulletin/core.ts
export interface ObservatoryBulletinProps {
    /** The bulletin headline. */
    title: string;
    /** The observing station. */
    station: string;
    /** The bulletin issue. */
    issue: string;
    /** The field note. */
    note: string;
}
export const defaults: ObservatoryBulletinProps = {
    title: "A night at the\nedge of winter",
    station: "NORTH RIDGE OBSERVATORY",
    issue: "BULLETIN 038 / NOVEMBER 2026",
    note: "Before dawn, the eastern sky opens a clear window between the roofline and the ridge. The observing plan favours bright targets and patient eyes.",
};
function obNode<K extends keyof HTMLElementTagNameMap>(parent: Element, tag: K, part: string, text?: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    if (part)
        node.dataset.part = part;
    if (text !== undefined)
        node.textContent = text;
    parent.append(node);
    return node;
}
function obLink(parent: Element, text: string, id: string): void {
    const link = obNode(parent, "a", "", text);
    link.href = `#${id}`;
}
function obSvg(parent: Element, tag: string, attrs: Record<string, string>, text?: string): SVGElement {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    node.setAttribute("data-pica", "");
    for (const [key, value] of Object.entries(attrs))
        node.setAttribute(key, value);
    if (text !== undefined)
        node.textContent = text;
    parent.append(node);
    return node;
}
function obRules(s: string): string {
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
  ${s} [data-part="mast"]{display:flex;justify-content:space-between;gap:1rem;border-block:1px solid ${cssVar("fg")};padding:1rem 0}
  ${s} [data-part="intro"]{display:flex;justify-content:space-between;align-items:end;gap:2rem;padding:2.5rem 0}
  ${s} [data-part="intro"] h1{font-family:var(--pica-font-serif,inherit);font-size:clamp(3rem,5vw,5rem);font-weight:400;white-space:pre-line;line-height:1.07;letter-spacing:-.04em;margin:0}
  ${s} [data-part="coordinates"]{font: .85rem/1.8 ${GRID_FONT};white-space:pre-line;color:${cssVar("muted")}}
  ${s} [data-part="nav"]{display:flex;gap:2.5rem;border-bottom:1px solid ${cssVar("muted")};padding:1rem 0}
  ${s} [data-part="sky-window"]{display:grid;grid-template-columns:1.25fr 1fr;gap:3rem;padding:2.5rem 0}
  ${s} [data-part="sky"]{margin:0}
  ${s} [data-part="sky"] svg{width:100%;height:auto}
  ${s} .ring,${s} .grid{fill:none;stroke:${cssVar("muted")};stroke-width:1}
  ${s} .grid{stroke-dasharray:2 5}
  ${s} .constellation{fill:none;stroke:${cssVar("accent")};stroke-width:2}
  ${s} .star{fill:${cssVar("fg")}}
  ${s} .ridge{fill:${cssVar("muted")}}
  ${s} .sky-label{font:11px ${GRID_FONT};fill:${cssVar("fg")};text-anchor:middle}
  ${s} [data-part="caption"]{font:.72rem/1.6 ${GRID_FONT};color:${cssVar("muted")};text-align:left}
  ${s} [data-part="brief"] h2{font-size:2.3rem;line-height:1.15;margin:2rem 0;font-family:var(--pica-font-serif,inherit);font-weight:400}
  ${s} [data-part="metrics"]{display:grid;grid-template-columns:8rem 1fr;border-top:1px solid ${cssVar("muted")};padding-top:1rem;gap:1rem}
  ${s} [data-part="metrics"] dd{margin:0;font-size:.95rem}
  ${s} [data-part="targets"]{border-top:3px solid ${cssVar("fg")};padding-top:1.5rem}
  ${s} [data-part="targets"] h2{font-size:2rem;font-weight:400}
  ${s} [data-part="targets"] table{width:100%;border-collapse:collapse;table-layout:fixed}
  ${s} [data-part="targets"] caption{padding-bottom:1rem}
  ${s} [data-part="targets"] th,${s} [data-part="targets"] td{text-align:left;padding:1rem .5rem 1rem 0;border-top:1px solid ${cssVar("muted")};vertical-align:top;overflow-wrap:anywhere}
  ${s} [data-part="targets"] td{font-size:.95rem;line-height:1.5}
  ${s} [data-part="log"]{display:grid;grid-template-columns:20% 1fr;gap:2rem;border-top:1px solid ${cssVar("fg")};margin-top:3rem;padding:2rem 0}
  ${s} [data-part="log-number"]{font:5rem ${GRID_FONT};color:${cssVar("fg")};letter-spacing:-.08em}
  ${s} [data-part="log"] h2{font-size:2.2rem;font-weight:400;margin:0;max-width:23ch}
  ${s} [data-part="entry"]{font:.8rem/1.8 ${GRID_FONT};white-space:pre-wrap}
  ${s} [data-part="footer"]{font:.68rem/1.7 ${GRID_FONT};border-top:1px solid ${cssVar("muted")};padding-top:1rem}@media(max-width:700px){${s} [data-part="intro"]{display:block}
  ${s} [data-part="intro"] h1{font-size:3.4rem}
  ${s} [data-part="coordinates"]{margin-top:1.5rem}
  ${s} [data-part="sky-window"]{grid-template-columns:1fr;gap:1rem}
  ${s} [data-part="nav"]{gap:1.2rem}
  ${s} [data-part="log"]{grid-template-columns:1fr;gap:1rem}
  ${s} [data-part="targets"] td{font-size:.8rem}
  ${s} [data-part="targets"] th{font-size:.6rem}
  ${s} [data-part="log-number"]{font-size:3rem}
  ${s} [data-part="sky"]{max-width:32rem}}
  @media(max-width:900px){${s} .sky-label{font-size:18px}}
  `;
}
export const mount: Mount<ObservatoryBulletinProps> = (host, initial = {}) => {
    let props: ObservatoryBulletinProps = { ...defaults, ...initial };
    const attrs = hostAttributes(host);
    attrs.set("data-pica-id", host.getAttribute("data-pica-id"));
    const sheet = scope(host);
    const root = obNode(host, "article", "page");
    const ids = [nextId("observatory-bulletin"), nextId("observatory-bulletin"), nextId("observatory-bulletin")];
    sheet.setRules(obRules(sheet.selector));
    function render(p: ObservatoryBulletinProps): void {
        root.replaceChildren();
        attrs.set("role", "region");
        attrs.set("aria-label", p.title.replace(/\n/g, " "));
        attrs.set("aria-hidden", null);
        const mast = obNode(root, "header", "mast");
        obNode(mast, "strong", "label", p.station);
        obNode(mast, "span", "label", p.issue);
        const intro = obNode(root, "section", "intro");
        obNode(intro, "h1", "", p.title);
        obNode(intro, "div", "coordinates", `52° 18′ N
01° 42′ W
ALT. 412 M`);
        const nav = obNode(root, "nav", "nav");
        nav.setAttribute("aria-label", "Bulletin sections");
        obLink(nav, "Sky window", ids[0]!);
        obLink(nav, "Target list", ids[1]!);
        obLink(nav, "Field log", ids[2]!);
        const window = obNode(root, "section", "sky-window");
        window.id = ids[0]!;
        const fig = obNode(window, "figure", "sky");
        const svg = obSvg(fig, "svg", { viewBox: "0 0 600 570", role: "img", "aria-label": "Schematic eastern sky showing a rising winter asterism above the ridge, with altitude rings" });
        for (const r of [90, 170, 250])
            obSvg(svg, "circle", { cx: "300", cy: "275", r: String(r), class: "ring" });
        obSvg(svg, "path", { d: "M300 25V525 M50 275H550 M123 98L477 452 M123 452L477 98", class: "grid" });
        obSvg(svg, "path", { d: "M204 170L269 210L339 139L410 230L350 325L269 210L225 334", class: "constellation" });
        for (const [x, y, r] of [[204, 170, 4], [269, 210, 6], [339, 139, 4], [410, 230, 4], [350, 325, 5], [225, 334, 3], [131, 250, 2], [468, 140, 2], [395, 390, 2], [165, 395, 2]])
            obSvg(svg, "circle", { cx: String(x), cy: String(y), r: String(r), class: "star" });
        obSvg(svg, "path", { d: "M50 455L92 443L142 460L185 426L236 445L291 408L347 432L398 421L461 446L512 430L550 449V525H50Z", class: "ridge" });
        for (const [x, y, t] of [[300, 19, "E"], [21, 280, "N"], [578, 280, "S"], [300, 554, "HORIZON"], [330, 91, "60°"], [330, 178, "30°"]])
            obSvg(svg, "text", { x: String(x), y: String(y), class: "sky-label" }, String(t));
        obNode(fig, "figcaption", "caption", "FIG. 01 / Eastern sky window. Schematic field drawing, not a navigation or ephemeris chart.");
        const notes = obNode(window, "div", "brief");
        obNode(notes, "p", "label", "OBSERVING WINDOW / 04:40–06:10 UTC");
        obNode(notes, "h2", "", "Let your eyes arrive first.");
        obNode(notes, "p", "body", p.note);
        obNode(notes, "p", "body", "Allow twenty minutes for dark adaptation. Keep the lantern low, record the time before the description, and make one careful drawing before reaching for a photograph.");
        const metrics = obNode(notes, "dl", "metrics");
        for (const [a, b] of [["MOON", "Below horizon"], ["SEEING", "Target: stable 3/5"], ["INSTRUMENT", "90 mm refractor"], ["METHOD", "Visual, sketch, compare"]]) {
            obNode(metrics, "dt", "label", a);
            obNode(metrics, "dd", "", b);
        }
        const targets = obNode(root, "section", "targets");
        targets.id = ids[1]!;
        obNode(targets, "h2", "", "Tonight’s working list");
        const table = obNode(targets, "table", "");
        obNode(table, "caption", "caption", "Illustrative observing targets, ordered from broad view to fine detail.");
        const th = obNode(table, "thead", "");
        const tr = obNode(th, "tr", "");
        for (const t of ["Target", "Instrument", "Look for", "Record"]) {
            const cell = obNode(tr, "th", "label", t);
            cell.setAttribute("scope", "col");
        }
        const tb = obNode(table, "tbody", "");
        for (const row of [["Open cluster", "Binoculars", "Three bright anchors", "Field sketch"], ["Double star", "Refractor · low power", "Separation and colour", "Two estimates"], ["Lunar terminator", "Refractor · medium power", "Long relief shadows", "Timed drawing"]]) {
            const r = obNode(tb, "tr", "");
            for (const value of row)
                obNode(r, "td", "", value);
        }
        const log = obNode(root, "section", "log");
        log.id = ids[2]!;
        obNode(log, "span", "log-number", "038");
        const lc = obNode(log, "div", "");
        obNode(lc, "h2", "", "The field log is part of the instrument.");
        obNode(lc, "p", "body", "Write what you saw, including uncertainty. A blank patch is useful evidence; a confident guess is not. Record cloud cover, transparency, and the light that reaches the site.");
        const d = obNode(lc, "details", "");
        obNode(d, "summary", "", "Open a sample log entry");
        obNode(d, "pre", "entry", `05:12 UTC / Transparency 4 of 5
Cluster resolved into six steady points.
Eastern ridge obscures the lower field.
Repeat observation after ten minutes.`);
        obNode(root, "footer", "footer", "NORTH RIDGE / FIELD SCIENCE SERIES / ORIGINAL ILLUSTRATIVE BULLETIN");
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

// registry/sections/observatory-bulletin/index.tsx
export type ObservatoryBulletinComponentProps = Partial<ObservatoryBulletinProps> & WrapperProps;
/** An astronomical field bulletin with an original sky diagram, observing table, equipment notes, and a log disclosure. */
export function ObservatoryBulletin({ className, style, palette, ...props }: ObservatoryBulletinComponentProps) {
    const ref = usePica(mount, props);
    return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}/>;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Observatory Bulletin · observatory-bulletin
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en" data-stage="flow">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Observatory Bulletin · Pica</title>
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
<div id="pica"></div>
<script>
"use strict";
var PicaObservatoryBulletin = (() => {
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

  // registry/sections/observatory-bulletin/core.ts
  var core_exports = {};
  __export(core_exports, {
    defaults: () => defaults,
    mount: () => mount
  });

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

  // lib/font.ts
  var GRID_FONT = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

  // lib/json.ts
  function sameJson(a, b) {
    if (a === b) return true;
    if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
    if (Array.isArray(a) || Array.isArray(b)) {
      if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!sameJson(a[i], b[i])) return false;
      }
      return true;
    }
    const left = a;
    const right = b;
    const keys = Object.keys(left);
    if (keys.length !== Object.keys(right).length) return false;
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(right, key) || !sameJson(left[key], right[key])) return false;
    }
    return true;
  }

  // registry/sections/observatory-bulletin/core.ts
  var defaults = {
    title: "A night at the\nedge of winter",
    station: "NORTH RIDGE OBSERVATORY",
    issue: "BULLETIN 038 / NOVEMBER 2026",
    note: "Before dawn, the eastern sky opens a clear window between the roofline and the ridge. The observing plan favours bright targets and patient eyes."
  };
  function obNode(parent, tag, part, text) {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    if (part)
      node.dataset.part = part;
    if (text !== void 0)
      node.textContent = text;
    parent.append(node);
    return node;
  }
  function obLink(parent, text, id) {
    const link = obNode(parent, "a", "", text);
    link.href = `#${id}`;
  }
  function obSvg(parent, tag, attrs, text) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    node.setAttribute("data-pica", "");
    for (const [key, value] of Object.entries(attrs))
      node.setAttribute(key, value);
    if (text !== void 0)
      node.textContent = text;
    parent.append(node);
    return node;
  }
  function obRules(s) {
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
  ${s} [data-part="mast"]{display:flex;justify-content:space-between;gap:1rem;border-block:1px solid ${cssVar("fg")};padding:1rem 0}
  ${s} [data-part="intro"]{display:flex;justify-content:space-between;align-items:end;gap:2rem;padding:2.5rem 0}
  ${s} [data-part="intro"] h1{font-family:var(--pica-font-serif,inherit);font-size:clamp(3rem,5vw,5rem);font-weight:400;white-space:pre-line;line-height:1.07;letter-spacing:-.04em;margin:0}
  ${s} [data-part="coordinates"]{font: .85rem/1.8 ${GRID_FONT};white-space:pre-line;color:${cssVar("muted")}}
  ${s} [data-part="nav"]{display:flex;gap:2.5rem;border-bottom:1px solid ${cssVar("muted")};padding:1rem 0}
  ${s} [data-part="sky-window"]{display:grid;grid-template-columns:1.25fr 1fr;gap:3rem;padding:2.5rem 0}
  ${s} [data-part="sky"]{margin:0}
  ${s} [data-part="sky"] svg{width:100%;height:auto}
  ${s} .ring,${s} .grid{fill:none;stroke:${cssVar("muted")};stroke-width:1}
  ${s} .grid{stroke-dasharray:2 5}
  ${s} .constellation{fill:none;stroke:${cssVar("accent")};stroke-width:2}
  ${s} .star{fill:${cssVar("fg")}}
  ${s} .ridge{fill:${cssVar("muted")}}
  ${s} .sky-label{font:11px ${GRID_FONT};fill:${cssVar("fg")};text-anchor:middle}
  ${s} [data-part="caption"]{font:.72rem/1.6 ${GRID_FONT};color:${cssVar("muted")};text-align:left}
  ${s} [data-part="brief"] h2{font-size:2.3rem;line-height:1.15;margin:2rem 0;font-family:var(--pica-font-serif,inherit);font-weight:400}
  ${s} [data-part="metrics"]{display:grid;grid-template-columns:8rem 1fr;border-top:1px solid ${cssVar("muted")};padding-top:1rem;gap:1rem}
  ${s} [data-part="metrics"] dd{margin:0;font-size:.95rem}
  ${s} [data-part="targets"]{border-top:3px solid ${cssVar("fg")};padding-top:1.5rem}
  ${s} [data-part="targets"] h2{font-size:2rem;font-weight:400}
  ${s} [data-part="targets"] table{width:100%;border-collapse:collapse;table-layout:fixed}
  ${s} [data-part="targets"] caption{padding-bottom:1rem}
  ${s} [data-part="targets"] th,${s} [data-part="targets"] td{text-align:left;padding:1rem .5rem 1rem 0;border-top:1px solid ${cssVar("muted")};vertical-align:top;overflow-wrap:anywhere}
  ${s} [data-part="targets"] td{font-size:.95rem;line-height:1.5}
  ${s} [data-part="log"]{display:grid;grid-template-columns:20% 1fr;gap:2rem;border-top:1px solid ${cssVar("fg")};margin-top:3rem;padding:2rem 0}
  ${s} [data-part="log-number"]{font:5rem ${GRID_FONT};color:${cssVar("fg")};letter-spacing:-.08em}
  ${s} [data-part="log"] h2{font-size:2.2rem;font-weight:400;margin:0;max-width:23ch}
  ${s} [data-part="entry"]{font:.8rem/1.8 ${GRID_FONT};white-space:pre-wrap}
  ${s} [data-part="footer"]{font:.68rem/1.7 ${GRID_FONT};border-top:1px solid ${cssVar("muted")};padding-top:1rem}@media(max-width:700px){${s} [data-part="intro"]{display:block}
  ${s} [data-part="intro"] h1{font-size:3.4rem}
  ${s} [data-part="coordinates"]{margin-top:1.5rem}
  ${s} [data-part="sky-window"]{grid-template-columns:1fr;gap:1rem}
  ${s} [data-part="nav"]{gap:1.2rem}
  ${s} [data-part="log"]{grid-template-columns:1fr;gap:1rem}
  ${s} [data-part="targets"] td{font-size:.8rem}
  ${s} [data-part="targets"] th{font-size:.6rem}
  ${s} [data-part="log-number"]{font-size:3rem}
  ${s} [data-part="sky"]{max-width:32rem}}
  @media(max-width:900px){${s} .sky-label{font-size:18px}}
  `;
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    const attrs = hostAttributes(host);
    attrs.set("data-pica-id", host.getAttribute("data-pica-id"));
    const sheet = scope(host);
    const root = obNode(host, "article", "page");
    const ids = [nextId("observatory-bulletin"), nextId("observatory-bulletin"), nextId("observatory-bulletin")];
    sheet.setRules(obRules(sheet.selector));
    function render(p) {
      root.replaceChildren();
      attrs.set("role", "region");
      attrs.set("aria-label", p.title.replace(/\n/g, " "));
      attrs.set("aria-hidden", null);
      const mast = obNode(root, "header", "mast");
      obNode(mast, "strong", "label", p.station);
      obNode(mast, "span", "label", p.issue);
      const intro = obNode(root, "section", "intro");
      obNode(intro, "h1", "", p.title);
      obNode(intro, "div", "coordinates", `52° 18′ N
01° 42′ W
ALT. 412 M`);
      const nav = obNode(root, "nav", "nav");
      nav.setAttribute("aria-label", "Bulletin sections");
      obLink(nav, "Sky window", ids[0]);
      obLink(nav, "Target list", ids[1]);
      obLink(nav, "Field log", ids[2]);
      const window = obNode(root, "section", "sky-window");
      window.id = ids[0];
      const fig = obNode(window, "figure", "sky");
      const svg = obSvg(fig, "svg", { viewBox: "0 0 600 570", role: "img", "aria-label": "Schematic eastern sky showing a rising winter asterism above the ridge, with altitude rings" });
      for (const r of [90, 170, 250])
        obSvg(svg, "circle", { cx: "300", cy: "275", r: String(r), class: "ring" });
      obSvg(svg, "path", { d: "M300 25V525 M50 275H550 M123 98L477 452 M123 452L477 98", class: "grid" });
      obSvg(svg, "path", { d: "M204 170L269 210L339 139L410 230L350 325L269 210L225 334", class: "constellation" });
      for (const [x, y, r] of [[204, 170, 4], [269, 210, 6], [339, 139, 4], [410, 230, 4], [350, 325, 5], [225, 334, 3], [131, 250, 2], [468, 140, 2], [395, 390, 2], [165, 395, 2]])
        obSvg(svg, "circle", { cx: String(x), cy: String(y), r: String(r), class: "star" });
      obSvg(svg, "path", { d: "M50 455L92 443L142 460L185 426L236 445L291 408L347 432L398 421L461 446L512 430L550 449V525H50Z", class: "ridge" });
      for (const [x, y, t] of [[300, 19, "E"], [21, 280, "N"], [578, 280, "S"], [300, 554, "HORIZON"], [330, 91, "60°"], [330, 178, "30°"]])
        obSvg(svg, "text", { x: String(x), y: String(y), class: "sky-label" }, String(t));
      obNode(fig, "figcaption", "caption", "FIG. 01 / Eastern sky window. Schematic field drawing, not a navigation or ephemeris chart.");
      const notes = obNode(window, "div", "brief");
      obNode(notes, "p", "label", "OBSERVING WINDOW / 04:40–06:10 UTC");
      obNode(notes, "h2", "", "Let your eyes arrive first.");
      obNode(notes, "p", "body", p.note);
      obNode(notes, "p", "body", "Allow twenty minutes for dark adaptation. Keep the lantern low, record the time before the description, and make one careful drawing before reaching for a photograph.");
      const metrics = obNode(notes, "dl", "metrics");
      for (const [a, b] of [["MOON", "Below horizon"], ["SEEING", "Target: stable 3/5"], ["INSTRUMENT", "90 mm refractor"], ["METHOD", "Visual, sketch, compare"]]) {
        obNode(metrics, "dt", "label", a);
        obNode(metrics, "dd", "", b);
      }
      const targets = obNode(root, "section", "targets");
      targets.id = ids[1];
      obNode(targets, "h2", "", "Tonight’s working list");
      const table = obNode(targets, "table", "");
      obNode(table, "caption", "caption", "Illustrative observing targets, ordered from broad view to fine detail.");
      const th = obNode(table, "thead", "");
      const tr = obNode(th, "tr", "");
      for (const t of ["Target", "Instrument", "Look for", "Record"]) {
        const cell = obNode(tr, "th", "label", t);
        cell.setAttribute("scope", "col");
      }
      const tb = obNode(table, "tbody", "");
      for (const row of [["Open cluster", "Binoculars", "Three bright anchors", "Field sketch"], ["Double star", "Refractor · low power", "Separation and colour", "Two estimates"], ["Lunar terminator", "Refractor · medium power", "Long relief shadows", "Timed drawing"]]) {
        const r = obNode(tb, "tr", "");
        for (const value of row)
          obNode(r, "td", "", value);
      }
      const log = obNode(root, "section", "log");
      log.id = ids[2];
      obNode(log, "span", "log-number", "038");
      const lc = obNode(log, "div", "");
      obNode(lc, "h2", "", "The field log is part of the instrument.");
      obNode(lc, "p", "body", "Write what you saw, including uncertainty. A blank patch is useful evidence; a confident guess is not. Record cloud cover, transparency, and the light that reaches the site.");
      const d = obNode(lc, "details", "");
      obNode(d, "summary", "", "Open a sample log entry");
      obNode(d, "pre", "entry", `05:12 UTC / Transparency 4 of 5
Cluster resolved into six steady points.
Eastern ridge obscures the lower field.
Repeat observation after ten minutes.`);
      obNode(root, "footer", "footer", "NORTH RIDGE / FIELD SCIENCE SERIES / ORIGINAL ILLUSTRATIVE BULLETIN");
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
  var initial = Object.assign({}, {}, window.PICA_PROPS || {});
  var instance = PicaObservatoryBulletin.mount(host, take(initial));
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

Original to Picagram.
