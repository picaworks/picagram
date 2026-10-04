# Monograph Spread

> An artist monograph with facing pages, geometric studies, marginal captions, and an essay with chapter navigation.

Category: sections. Tags: publication, one-page, monograph-spread. Static. Size: 3.9 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/monograph-spread.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | string | `"Making space\nfor silence"` | The book title. |
| `artist` | string | `"MARA VOSS"` | The artist name. |
| `deck` | string | `"Selected works and working notes, 2018–2026."` | The book subtitle. |
| `essay` | string | `"A room is never empty. It holds the distance between a body and a wall, the time between a footstep and its echo. These works begin with that interval."` | The opening essay paragraph. |

## Colors

Draws with `--pica-fg`, `--pica-bg`, `--pica-accent`, `--pica-muted`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Monograph Spread · monograph-spread
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

// registry/sections/monograph-spread/core.ts
export interface MonographSpreadProps {
    /** The book title. */
    title: string;
    /** The artist name. */
    artist: string;
    /** The book subtitle. */
    deck: string;
    /** The opening essay paragraph. */
    essay: string;
}
export const defaults: MonographSpreadProps = {
    title: "Making space\nfor silence",
    artist: "MARA VOSS",
    deck: "Selected works and working notes, 2018–2026.",
    essay: "A room is never empty. It holds the distance between a body and a wall, the time between a footstep and its echo. These works begin with that interval.",
};
function msNode<K extends keyof HTMLElementTagNameMap>(parent: Element, tag: K, part: string, text?: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    if (part)
        node.dataset.part = part;
    if (text !== undefined)
        node.textContent = text;
    parent.append(node);
    return node;
}
function msLink(parent: Element, text: string, id: string): void {
    const link = msNode(parent, "a", "", text);
    link.href = `#${id}`;
}
function msSvg(parent: Element, tag: string, attrs: Record<string, string>, text?: string): SVGElement {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    node.setAttribute("data-pica", "");
    for (const [key, value] of Object.entries(attrs))
        node.setAttribute(key, value);
    if (text !== undefined)
        node.textContent = text;
    parent.append(node);
    return node;
}
function msRules(s: string): string {
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
  ${s} [data-part="mast"]{display:flex;justify-content:space-between;border-bottom:1px solid ${cssVar("fg")};padding-bottom:1rem;gap:1rem}
  ${s} [data-part="cover"]{padding:3rem 0 4rem;margin-left:12%}
  ${s} [data-part="cover"]>[data-part="label"]{border-left:4px solid ${cssVar("accent")};padding-left:1rem}
  ${s} [data-part="cover"] h1{white-space:pre-line;font-family:var(--pica-font-serif,inherit);font-size:clamp(3rem,6.5vw,6rem);font-weight:400;letter-spacing:-.055em;line-height:1.04;max-width:12ch;margin:1rem 0}
  ${s} [data-part="deck"]{font-size:1.2rem;line-height:1.5}
  ${s} [data-part="nav"]{display:flex;gap:2rem;margin-top:2rem}
  ${s} [data-part="spread"]{display:grid;grid-template-columns:1fr 1fr;border-block:1px solid ${cssVar("fg")}}
  ${s} [data-part="plate"],${s} [data-part="right-page"]{margin:0;position:relative;padding:2.5rem 2rem 5.5rem}
  ${s} [data-part="plate"]{border-right:1px solid ${cssVar("muted")}}
  ${s} [data-part="plate"] svg{width:100%;height:auto}
  ${s} .ink{fill:${cssVar("fg")}}
  ${s} .cut{fill:${cssVar("bg")};stroke:${cssVar("fg")};stroke-width:1}
  ${s} .tone{fill:${cssVar("muted")}}
  ${s} .rule{fill:none;stroke:${cssVar("fg")};stroke-width:1}
  ${s} .accent-rule{fill:none;stroke:${cssVar("accent")};stroke-width:4}
  ${s} [data-part="caption"]{font: .7rem/1.6 ${GRID_FONT};color:${cssVar("muted")};max-width:31rem}
  ${s} [data-part="folio"]{position:absolute;bottom:1rem;left:2rem;font:4rem/1 ${GRID_FONT};letter-spacing:-.08em;color:${cssVar("muted")}}
  ${s} [data-part="right-page"] h2{font-size:2.4rem;font-family:var(--pica-font-serif,inherit);font-weight:400;line-height:1.1;margin:2rem 0 1.5rem}
  ${s} [data-part="mini"]{margin:2.5rem 0 0}
  ${s} [data-part="mini"] svg{width:100%;height:auto}
  ${s} [data-part="essay"]{display:grid;grid-template-columns:12% 1fr;gap:1rem;padding:4rem 0}
  ${s} [data-part="chapter"]{font:3rem ${GRID_FONT};color:${cssVar("fg")}}
  ${s} [data-part="essay"] h2{font-size:2.4rem;font-family:var(--pica-font-serif,inherit);font-weight:400;margin:1rem 0 2rem}
  ${s} [data-part="essay-columns"]{columns:2;column-gap:3rem}
  ${s} [data-part="essay-columns"] p{margin:0 0 1rem}
  ${s} [data-part="notes"]{border-top:1px solid ${cssVar("fg")};padding-top:1.5rem;max-width:48rem;margin-left:12%}@media(max-width:700px){${s} [data-part="cover"]{margin-left:0;padding:2.5rem 0}
  ${s} [data-part="spread"]{grid-template-columns:1fr}
  ${s} [data-part="plate"]{border-right:0;border-bottom:1px solid ${cssVar("muted")}}
  ${s} [data-part="plate"],${s} [data-part="right-page"]{padding:1.5rem 0 5.5rem}
  ${s} [data-part="folio"]{left:0}
  ${s} [data-part="plate"] svg{max-height:370px}
  ${s} [data-part="essay"]{grid-template-columns:1fr;padding:2.5rem 0}
  ${s} [data-part="essay-columns"]{columns:1}
  ${s} [data-part="notes"]{margin-left:0}
  ${s} [data-part="nav"]{gap:1rem}
  ${s} [data-part="cover"]>[data-part="label"]{border-left:4px solid ${cssVar("accent")};padding-left:1rem}
  ${s} [data-part="cover"] h1{font-size:3.6rem}}
  `;
}
export const mount: Mount<MonographSpreadProps> = (host, initial = {}) => {
    let props: MonographSpreadProps = { ...defaults, ...initial };
    const attrs = hostAttributes(host);
    attrs.set("data-pica-id", host.getAttribute("data-pica-id"));
    const sheet = scope(host);
    const root = msNode(host, "article", "page");
    const ids = [nextId("monograph-spread"), nextId("monograph-spread"), nextId("monograph-spread")];
    sheet.setRules(msRules(sheet.selector));
    function render(p: MonographSpreadProps): void {
        root.replaceChildren();
        attrs.set("role", "region");
        attrs.set("aria-label", p.title.replace(/\n/g, " "));
        attrs.set("aria-hidden", null);
        const mast = msNode(root, "header", "mast");
        msNode(mast, "span", "label", "FIELD EDITIONS / MONOGRAPH 08");
        msNode(mast, "span", "label", p.artist);
        const cover = msNode(root, "section", "cover");
        msNode(cover, "p", "label", "ON SPACE, MATERIAL & ATTENTION");
        msNode(cover, "h1", "", p.title);
        msNode(cover, "p", "deck", p.deck);
        const nav = msNode(cover, "nav", "nav");
        nav.setAttribute("aria-label", "Book chapters");
        msLink(nav, "I · Work", ids[0]!);
        msLink(nav, "II · Essay", ids[1]!);
        msLink(nav, "III · Notes", ids[2]!);
        const spread = msNode(root, "section", "spread");
        spread.id = ids[0]!;
        const left = msNode(spread, "figure", "plate");
        const art = msSvg(left, "svg", { viewBox: "0 0 500 480", role: "img", "aria-label": "Geometric study of a suspended square and its stepped shadow" });
        msSvg(art, "path", { d: "M85 365H410V395H85Z M115 335H380V365H115Z M145 305H350V335H145Z", class: "tone" });
        msSvg(art, "path", { d: "M148 87H358V297H148Z M178 117V267H328V117Z", class: "ink", "fill-rule": "evenodd" });
        msSvg(art, "path", { d: "M253 27V87 M65 425H435", class: "rule" });
        msNode(left, "figcaption", "caption", "FIG. 01 / INTERVAL, 2024. Folded aluminium, suspended 110 cm above the floor.");
        msNode(left, "span", "folio", "012");
        const right = msNode(spread, "div", "right-page");
        msNode(right, "p", "label", "I / SELECTED WORK");
        msNode(right, "h2", "", "The object and its absence");
        msNode(right, "p", "body", "The frame describes a volume it does not occupy. A changing shadow completes the sculpture, making the visitor an observer of time rather than an owner of a single view.");
        const mini = msNode(right, "figure", "mini");
        const ma = msSvg(mini, "svg", { viewBox: "0 0 440 190", role: "img", "aria-label": "Three paired line studies of frames at different widths" });
        for (const [x, w] of [[25, 80], [155, 105], [305, 110]] as const) {
            msSvg(ma, "rect", { x: String(x), y: "25", width: String(w), height: "130", class: "rule" });
            msSvg(ma, "path", { d: `M${x + 15} 40V140H${x + w - 15}`, class: "accent-rule" });
        }
        msNode(mini, "figcaption", "caption", "FIG. 02 / Three rehearsals for a frame. Graphite on paper, 2019.");
        msNode(right, "span", "folio", "013");
        const essay = msNode(root, "section", "essay");
        essay.id = ids[1]!;
        msNode(essay, "div", "chapter", "II");
        const ec = msNode(essay, "div", "");
        msNode(ec, "p", "label", "AN ESSAY BY THE ARTIST");
        msNode(ec, "h2", "", "The measure of an interval");
        const cols = msNode(ec, "div", "essay-columns");
        msNode(cols, "p", "body", p.essay);
        msNode(cols, "p", "body", "I work by removing what a form can afford to lose. A support becomes a line; a line becomes a pause. The remainder must be specific enough to invite attention and open enough to give it somewhere to go.");
        msNode(cols, "p", "body", "The works are not instructions for stillness. They are small instruments for noticing change: the afternoon light, a shifting weight, another person entering the room. The material keeps the record.");
        const notes = msNode(root, "footer", "notes");
        notes.id = ids[2]!;
        msNode(notes, "h2", "label", "III / WORKING NOTES");
        msNode(notes, "p", "body", "Studio: North Quay. Materials: aluminium, graphite, cotton paper. Installation dimensions vary with the room. All forms and texts in this edition are original studies.");
        const detail = msNode(notes, "details", "");
        msNode(detail, "summary", "", "View the edition colophon");
        msNode(detail, "p", "caption", "Field Editions No. 08. Edited and arranged as a fictional artist book. Plate drawings are procedural vector studies. Published 2026. Reading time: approximately four minutes.");
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

// registry/sections/monograph-spread/index.tsx
export type MonographSpreadComponentProps = Partial<MonographSpreadProps> & WrapperProps;
/** An artist monograph with facing pages, geometric studies, marginal captions, and an essay with chapter navigation. */
export function MonographSpread({ className, style, palette, ...props }: MonographSpreadComponentProps) {
    const ref = usePica(mount, props);
    return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}/>;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Monograph Spread · monograph-spread
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en" data-stage="flow">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Monograph Spread · Pica</title>
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
var PicaMonographSpread = (() => {
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

  // registry/sections/monograph-spread/core.ts
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

  // registry/sections/monograph-spread/core.ts
  var defaults = {
    title: "Making space\nfor silence",
    artist: "MARA VOSS",
    deck: "Selected works and working notes, 2018–2026.",
    essay: "A room is never empty. It holds the distance between a body and a wall, the time between a footstep and its echo. These works begin with that interval."
  };
  function msNode(parent, tag, part, text) {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    if (part)
      node.dataset.part = part;
    if (text !== void 0)
      node.textContent = text;
    parent.append(node);
    return node;
  }
  function msLink(parent, text, id) {
    const link = msNode(parent, "a", "", text);
    link.href = `#${id}`;
  }
  function msSvg(parent, tag, attrs, text) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    node.setAttribute("data-pica", "");
    for (const [key, value] of Object.entries(attrs))
      node.setAttribute(key, value);
    if (text !== void 0)
      node.textContent = text;
    parent.append(node);
    return node;
  }
  function msRules(s) {
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
  ${s} [data-part="mast"]{display:flex;justify-content:space-between;border-bottom:1px solid ${cssVar("fg")};padding-bottom:1rem;gap:1rem}
  ${s} [data-part="cover"]{padding:3rem 0 4rem;margin-left:12%}
  ${s} [data-part="cover"]>[data-part="label"]{border-left:4px solid ${cssVar("accent")};padding-left:1rem}
  ${s} [data-part="cover"] h1{white-space:pre-line;font-family:var(--pica-font-serif,inherit);font-size:clamp(3rem,6.5vw,6rem);font-weight:400;letter-spacing:-.055em;line-height:1.04;max-width:12ch;margin:1rem 0}
  ${s} [data-part="deck"]{font-size:1.2rem;line-height:1.5}
  ${s} [data-part="nav"]{display:flex;gap:2rem;margin-top:2rem}
  ${s} [data-part="spread"]{display:grid;grid-template-columns:1fr 1fr;border-block:1px solid ${cssVar("fg")}}
  ${s} [data-part="plate"],${s} [data-part="right-page"]{margin:0;position:relative;padding:2.5rem 2rem 5.5rem}
  ${s} [data-part="plate"]{border-right:1px solid ${cssVar("muted")}}
  ${s} [data-part="plate"] svg{width:100%;height:auto}
  ${s} .ink{fill:${cssVar("fg")}}
  ${s} .cut{fill:${cssVar("bg")};stroke:${cssVar("fg")};stroke-width:1}
  ${s} .tone{fill:${cssVar("muted")}}
  ${s} .rule{fill:none;stroke:${cssVar("fg")};stroke-width:1}
  ${s} .accent-rule{fill:none;stroke:${cssVar("accent")};stroke-width:4}
  ${s} [data-part="caption"]{font: .7rem/1.6 ${GRID_FONT};color:${cssVar("muted")};max-width:31rem}
  ${s} [data-part="folio"]{position:absolute;bottom:1rem;left:2rem;font:4rem/1 ${GRID_FONT};letter-spacing:-.08em;color:${cssVar("muted")}}
  ${s} [data-part="right-page"] h2{font-size:2.4rem;font-family:var(--pica-font-serif,inherit);font-weight:400;line-height:1.1;margin:2rem 0 1.5rem}
  ${s} [data-part="mini"]{margin:2.5rem 0 0}
  ${s} [data-part="mini"] svg{width:100%;height:auto}
  ${s} [data-part="essay"]{display:grid;grid-template-columns:12% 1fr;gap:1rem;padding:4rem 0}
  ${s} [data-part="chapter"]{font:3rem ${GRID_FONT};color:${cssVar("fg")}}
  ${s} [data-part="essay"] h2{font-size:2.4rem;font-family:var(--pica-font-serif,inherit);font-weight:400;margin:1rem 0 2rem}
  ${s} [data-part="essay-columns"]{columns:2;column-gap:3rem}
  ${s} [data-part="essay-columns"] p{margin:0 0 1rem}
  ${s} [data-part="notes"]{border-top:1px solid ${cssVar("fg")};padding-top:1.5rem;max-width:48rem;margin-left:12%}@media(max-width:700px){${s} [data-part="cover"]{margin-left:0;padding:2.5rem 0}
  ${s} [data-part="spread"]{grid-template-columns:1fr}
  ${s} [data-part="plate"]{border-right:0;border-bottom:1px solid ${cssVar("muted")}}
  ${s} [data-part="plate"],${s} [data-part="right-page"]{padding:1.5rem 0 5.5rem}
  ${s} [data-part="folio"]{left:0}
  ${s} [data-part="plate"] svg{max-height:370px}
  ${s} [data-part="essay"]{grid-template-columns:1fr;padding:2.5rem 0}
  ${s} [data-part="essay-columns"]{columns:1}
  ${s} [data-part="notes"]{margin-left:0}
  ${s} [data-part="nav"]{gap:1rem}
  ${s} [data-part="cover"]>[data-part="label"]{border-left:4px solid ${cssVar("accent")};padding-left:1rem}
  ${s} [data-part="cover"] h1{font-size:3.6rem}}
  `;
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    const attrs = hostAttributes(host);
    attrs.set("data-pica-id", host.getAttribute("data-pica-id"));
    const sheet = scope(host);
    const root = msNode(host, "article", "page");
    const ids = [nextId("monograph-spread"), nextId("monograph-spread"), nextId("monograph-spread")];
    sheet.setRules(msRules(sheet.selector));
    function render(p) {
      root.replaceChildren();
      attrs.set("role", "region");
      attrs.set("aria-label", p.title.replace(/\n/g, " "));
      attrs.set("aria-hidden", null);
      const mast = msNode(root, "header", "mast");
      msNode(mast, "span", "label", "FIELD EDITIONS / MONOGRAPH 08");
      msNode(mast, "span", "label", p.artist);
      const cover = msNode(root, "section", "cover");
      msNode(cover, "p", "label", "ON SPACE, MATERIAL & ATTENTION");
      msNode(cover, "h1", "", p.title);
      msNode(cover, "p", "deck", p.deck);
      const nav = msNode(cover, "nav", "nav");
      nav.setAttribute("aria-label", "Book chapters");
      msLink(nav, "I · Work", ids[0]);
      msLink(nav, "II · Essay", ids[1]);
      msLink(nav, "III · Notes", ids[2]);
      const spread = msNode(root, "section", "spread");
      spread.id = ids[0];
      const left = msNode(spread, "figure", "plate");
      const art = msSvg(left, "svg", { viewBox: "0 0 500 480", role: "img", "aria-label": "Geometric study of a suspended square and its stepped shadow" });
      msSvg(art, "path", { d: "M85 365H410V395H85Z M115 335H380V365H115Z M145 305H350V335H145Z", class: "tone" });
      msSvg(art, "path", { d: "M148 87H358V297H148Z M178 117V267H328V117Z", class: "ink", "fill-rule": "evenodd" });
      msSvg(art, "path", { d: "M253 27V87 M65 425H435", class: "rule" });
      msNode(left, "figcaption", "caption", "FIG. 01 / INTERVAL, 2024. Folded aluminium, suspended 110 cm above the floor.");
      msNode(left, "span", "folio", "012");
      const right = msNode(spread, "div", "right-page");
      msNode(right, "p", "label", "I / SELECTED WORK");
      msNode(right, "h2", "", "The object and its absence");
      msNode(right, "p", "body", "The frame describes a volume it does not occupy. A changing shadow completes the sculpture, making the visitor an observer of time rather than an owner of a single view.");
      const mini = msNode(right, "figure", "mini");
      const ma = msSvg(mini, "svg", { viewBox: "0 0 440 190", role: "img", "aria-label": "Three paired line studies of frames at different widths" });
      for (const [x, w] of [[25, 80], [155, 105], [305, 110]]) {
        msSvg(ma, "rect", { x: String(x), y: "25", width: String(w), height: "130", class: "rule" });
        msSvg(ma, "path", { d: `M${x + 15} 40V140H${x + w - 15}`, class: "accent-rule" });
      }
      msNode(mini, "figcaption", "caption", "FIG. 02 / Three rehearsals for a frame. Graphite on paper, 2019.");
      msNode(right, "span", "folio", "013");
      const essay = msNode(root, "section", "essay");
      essay.id = ids[1];
      msNode(essay, "div", "chapter", "II");
      const ec = msNode(essay, "div", "");
      msNode(ec, "p", "label", "AN ESSAY BY THE ARTIST");
      msNode(ec, "h2", "", "The measure of an interval");
      const cols = msNode(ec, "div", "essay-columns");
      msNode(cols, "p", "body", p.essay);
      msNode(cols, "p", "body", "I work by removing what a form can afford to lose. A support becomes a line; a line becomes a pause. The remainder must be specific enough to invite attention and open enough to give it somewhere to go.");
      msNode(cols, "p", "body", "The works are not instructions for stillness. They are small instruments for noticing change: the afternoon light, a shifting weight, another person entering the room. The material keeps the record.");
      const notes = msNode(root, "footer", "notes");
      notes.id = ids[2];
      msNode(notes, "h2", "label", "III / WORKING NOTES");
      msNode(notes, "p", "body", "Studio: North Quay. Materials: aluminium, graphite, cotton paper. Installation dimensions vary with the room. All forms and texts in this edition are original studies.");
      const detail = msNode(notes, "details", "");
      msNode(detail, "summary", "", "View the edition colophon");
      msNode(detail, "p", "caption", "Field Editions No. 08. Edited and arranged as a fictional artist book. Plate drawings are procedural vector studies. Published 2026. Reading time: approximately four minutes.");
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
  var instance = PicaMonographSpread.mount(host, take(initial));
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
