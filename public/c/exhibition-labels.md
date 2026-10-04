# Exhibition Labels

> A gallery catalogue pairing numbered original abstract studies with varied art proportions and curatorial labels.

Category: sections. Tags: culture, editorial, exhibition-labels. Static. Size: 3.9 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/exhibition-labels.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | string | `"A measure of silence"` | The exhibition title. |
| `gallery` | string | `"Field Gallery / Room 02"` | The gallery name. |
| `dates` | string | `"12 SEPTEMBER—18 JANUARY"` | The exhibition dates. |
| `introduction` | string | `"An exhibition of pauses, intervals, and the marks that remain. Three artists make space visible by attending to what is almost there."` | The curatorial introduction. |
| `works` | readonly ExhibitionWork[] | `[{"title":"Interval, no. 7","artist":"Ari Kato, 2025","medium":"Graphite on paper · 72 × 110 cm","label":"Parallel lines accumulate into a field. A single break makes the surface legible as a record of time, measured by the hand rather than the clock."},{"title":"Holding an edge","artist":"Nora Bell, 2024","medium":"Ink and linen · 160 × 80 cm","label":"A dark form presses against a pale boundary. Neither a landscape nor an object, it asks how little information a shape needs to feel present."},{"title":"Two distances","artist":"Idris Fenn, 2025","medium":"Etched aluminium · 48 × 48 cm","label":"Two circles share the same surface without sharing a centre. Their quiet misalignment changes as the viewer moves through the room."}]` | Works paired with original abstract studies. |

## Colors

Draws with `--pica-fg`, `--pica-bg`, `--pica-accent`, `--pica-muted`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Exhibition Labels · exhibition-labels
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

// registry/sections/exhibition-labels/core.ts
export interface ExhibitionWork {
  /** The title of the work. */
  title: string;
  /** The artist and making date. */
  artist: string;
  /** The materials and dimensions. */
  medium: string;
  /** The curatorial label. */
  label: string;
}

export interface ExhibitionLabelsProps {
  /** The exhibition title. */
  title: string;
  /** The gallery name. */
  gallery: string;
  /** The exhibition dates. */
  dates: string;
  /** The curatorial introduction. */
  introduction: string;
  /** Works paired with original abstract studies. */
  works: readonly ExhibitionWork[];
}

export const defaults: ExhibitionLabelsProps = {
  title: "A measure of silence",
  gallery: "Field Gallery / Room 02",
  dates: "12 SEPTEMBER—18 JANUARY",
  introduction: "An exhibition of pauses, intervals, and the marks that remain. Three artists make space visible by attending to what is almost there.",
  works: [
    { title: "Interval, no. 7", artist: "Ari Kato, 2025", medium: "Graphite on paper · 72 × 110 cm", label: "Parallel lines accumulate into a field. A single break makes the surface legible as a record of time, measured by the hand rather than the clock." },
    { title: "Holding an edge", artist: "Nora Bell, 2024", medium: "Ink and linen · 160 × 80 cm", label: "A dark form presses against a pale boundary. Neither a landscape nor an object, it asks how little information a shape needs to feel present." },
    { title: "Two distances", artist: "Idris Fenn, 2025", medium: "Etched aluminium · 48 × 48 cm", label: "Two circles share the same surface without sharing a centre. Their quiet misalignment changes as the viewer moves through the room." },
  ],
};

function galleryNode<K extends keyof HTMLElementTagNameMap>(tag: K, part: string, text = ""): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  if (part) el.setAttribute("data-pica-part", part);
  el.textContent = text;
  return el;
}

function gallerySvg<K extends keyof SVGElementTagNameMap>(tag: K, values: Readonly<Record<string, string>>): SVGElementTagNameMap[K] {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  el.setAttribute("data-pica", "");
  for (const [key, value] of Object.entries(values)) el.setAttribute(key, value);
  return el;
}

function galleryLink(label: string, target: string): HTMLAnchorElement {
  const a = galleryNode("a", "", label);
  a.href = `#${target}`;
  return a;
}

function galleryRules(s: string): string {
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

${s} [data-pica-part="opening"]{display:grid;grid-template-columns:1.6fr 1fr;gap:60px;padding:37px 0 50px}
${s} [data-pica-part="headline"] h1{font-family:var(--pica-font-serif,inherit);margin-top:24px;max-width:11ch;font-size:clamp(46px,6vw,77px)}
${s} [data-pica-part="intro"]{padding-top:5px;display:grid;align-content:space-between;gap:24px}
${s} [data-pica-part="intro"] p{font-size:18px}
${s} [data-pica-part="work"]{display:grid;grid-template-columns:1.6fr 1fr;align-items:center;gap:60px;border-top:1px solid ${fg};padding:35px 0}
${s} [data-pica-part="art"]{padding:18px;border:1px solid ${muted}}
${s} [data-pica-part="art"] svg{width:100%;max-height:350px}
${s} [data-pica-part="art"] figcaption{margin-top:14px;font-size:9px;color:${muted}}
${s} [data-pica-part="work-label"]{display:grid;gap:12px;max-width:28rem}
${s} [data-pica-part="number"]{font-family:${GRID_FONT};font-size:14px;color:${fg};border-bottom:1px solid ${accent};padding-bottom:8px;width:34px}
${s} [data-pica-part="artist"]{font-size:16px}
${s} [data-pica-part="medium"]{font-family:${GRID_FONT};font-size:11px;color:${muted};margin-bottom:10px}
${s} [data-pica-part="curatorial"]{font-size:15px;line-height:1.65}
${s} [data-pica-form="1"]{grid-template-columns:1fr 1.1fr;padding-left:20%}
${s} [data-pica-form="1"] [data-pica-part="art"]{max-width:280px}
${s} [data-pica-form="2"]{grid-template-columns:1.1fr 1fr;padding-right:12%}
${s} [data-pica-part="visit"]{border-top:1px solid ${fg};padding-top:24px;display:grid;grid-template-columns:1fr 2fr;gap:25px;font-size:14px}
${s} [data-pica-part="visit"]>p:last-child{grid-column:2}
@media(max-width:800px){${s} [data-pica-part="opening"],${s} [data-pica-part="work"]{gap:30px}${s} [data-pica-form="1"]{padding-left:8%}${s} [data-pica-form="2"]{padding-right:0}}
@media(max-width:600px){${s} [data-pica-part="opening"],${s} [data-pica-part="work"]{grid-template-columns:1fr;gap:25px;padding-left:0;padding-right:0}${s} [data-pica-part="opening"]{padding:26px 0 30px}${s} [data-pica-part="intro"] p{font-size:16px}${s} [data-pica-part="work-label"]{gap:10px}${s} [data-pica-form="1"] [data-pica-part="art"]{margin:auto;width:75%}${s} [data-pica-part="visit"]{grid-template-columns:1fr;gap:15px}${s} [data-pica-part="visit"]>p:last-child{grid-column:auto}}
`;
}

export const mount: Mount<ExhibitionLabelsProps> = (host, initial = {}) => {
  let props: ExhibitionLabelsProps = { ...defaults, ...initial };
  const attributes = hostAttributes(host);
  const container = galleryNode("div", "");
  host.append(container);
  const sheet = scope(container);
  const page = galleryNode("article", "");
  page.setAttribute("data-pica-page", "");
  container.append(page);
  const id = nextId("pica-exhibition-labels");
  sheet.setRules(galleryRules(sheet.selector));
  let destroyed = false;
  const render = (): void => {
    attributes.set("aria-hidden", "false");
    attributes.set("role", "region");
    attributes.set("aria-label", props.title);
    page.replaceChildren();
    const top = galleryNode("header", "top");
    top.append(galleryNode("span", "label", props.gallery));
    const nav = galleryNode("nav", "");
    nav.setAttribute("aria-label", "Exhibition sections");
    nav.append(galleryLink(`Works / ${String(props.works.length).padStart(2, "0")}`, `${id}-works`), galleryLink("Visitor notes", `${id}-visit`));
    top.append(nav);
    const opening = galleryNode("section", "opening");
    const headline = galleryNode("div", "headline");
    headline.append(galleryNode("span", "label", "EXHIBITION / CATALOGUE EXCERPT"), galleryNode("h1", "", props.title));
    const intro = galleryNode("div", "intro");
    intro.append(galleryNode("span", "label", props.dates), galleryNode("p", "", props.introduction));
    opening.append(headline, intro);
    const works = galleryNode("section", "works");
    works.id = `${id}-works`;
    works.setAttribute("aria-label", "Selected works");
    for (const [i, work] of props.works.entries()) {
      const row = galleryNode("article", "work");
      row.dataset.picaForm = String(i % 3);
      const figure = galleryNode("figure", "art");
      const drawing = gallerySvg("svg", { viewBox: i % 3 === 1 ? "0 0 260 390" : "0 0 520 310", "aria-hidden": "true" });
      if (i % 3 === 0) {
        for (let line = 0; line < 26; line++) {
          const y = 24 + line * 10;
          drawing.append(gallerySvg("path", { d: `M24 ${y}H${205 + line % 5 * 4} M${246 + line % 3 * 4} ${y}H496` }));
        }
      } else if (i % 3 === 1) {
        drawing.append(gallerySvg("path", { d: "M22 23H176L230 182L182 366H22Z", "data-pica-part": "solid" }));
        for (let line = 0; line < 9; line++) drawing.append(gallerySvg("path", { d: `M${191 + line * 5} 24V365` }));
      } else {
        drawing.append(gallerySvg("circle", { cx: "225", cy: "155", r: "110" }), gallerySvg("circle", { cx: "295", cy: "155", r: "110" }));
        for (let line = 0; line < 11; line++) drawing.append(gallerySvg("path", { d: `M${150 + line * 20} 50V260`, "stroke-dasharray": "1 7" }));
      }
      figure.append(drawing, galleryNode("figcaption", "label", `STUDY ${String(i + 1).padStart(2, "0")} / ORIGINAL ABSTRACT PLATE`));
      const label = galleryNode("div", "work-label");
      label.append(galleryNode("span", "number", String(i + 1).padStart(2, "0")), galleryNode("h2", "", work.title), galleryNode("p", "artist", work.artist), galleryNode("p", "medium", work.medium), galleryNode("p", "curatorial", work.label));
      row.append(figure, label);
      works.append(row);
    }
    const visit = galleryNode("section", "visit");
    visit.id = `${id}-visit`;
    visit.append(galleryNode("span", "label", "Spend a little longer"), galleryNode("p", "", "The gallery is quietest before noon. Seating is available in each room. Large-print labels and a tactile guide can be borrowed from the welcome desk."), galleryNode("p", "muted", "Free entry · Tuesday–Sunday, 10:00–18:00 · Step-free throughout"));
    const footer = galleryNode("footer", "footer");
    footer.append(galleryNode("span", "label", "Curated by Leah Morrow / Edition 003"), galleryLink("Return to the works ↑", `${id}-works`));
    page.append(top, opening, works, visit, footer);
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

// registry/sections/exhibition-labels/index.tsx
export type ExhibitionLabelsComponentProps = Partial<ExhibitionLabelsProps> & WrapperProps;

/** A gallery catalogue pairing numbered original abstract studies with varied art proportions and curatorial labels. */
export function ExhibitionLabels({ className, style, palette, ...props }: ExhibitionLabelsComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Exhibition Labels · exhibition-labels
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en" data-stage="flow">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Exhibition Labels · Pica</title>
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
var PicaExhibitionLabels = (() => {
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

  // registry/sections/exhibition-labels/core.ts
  var core_exports = {};
  __export(core_exports, {
    defaults: () => defaults,
    mount: () => mount
  });

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

  // registry/sections/exhibition-labels/core.ts
  var defaults = {
    title: "A measure of silence",
    gallery: "Field Gallery / Room 02",
    dates: "12 SEPTEMBER—18 JANUARY",
    introduction: "An exhibition of pauses, intervals, and the marks that remain. Three artists make space visible by attending to what is almost there.",
    works: [
      { title: "Interval, no. 7", artist: "Ari Kato, 2025", medium: "Graphite on paper · 72 × 110 cm", label: "Parallel lines accumulate into a field. A single break makes the surface legible as a record of time, measured by the hand rather than the clock." },
      { title: "Holding an edge", artist: "Nora Bell, 2024", medium: "Ink and linen · 160 × 80 cm", label: "A dark form presses against a pale boundary. Neither a landscape nor an object, it asks how little information a shape needs to feel present." },
      { title: "Two distances", artist: "Idris Fenn, 2025", medium: "Etched aluminium · 48 × 48 cm", label: "Two circles share the same surface without sharing a centre. Their quiet misalignment changes as the viewer moves through the room." }
    ]
  };
  function galleryNode(tag, part, text = "") {
    const el = document.createElement(tag);
    el.setAttribute("data-pica", "");
    if (part) el.setAttribute("data-pica-part", part);
    el.textContent = text;
    return el;
  }
  function gallerySvg(tag, values) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    el.setAttribute("data-pica", "");
    for (const [key, value] of Object.entries(values)) el.setAttribute(key, value);
    return el;
  }
  function galleryLink(label, target) {
    const a = galleryNode("a", "", label);
    a.href = `#${target}`;
    return a;
  }
  function galleryRules(s) {
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

${s} [data-pica-part="opening"]{display:grid;grid-template-columns:1.6fr 1fr;gap:60px;padding:37px 0 50px}
${s} [data-pica-part="headline"] h1{font-family:var(--pica-font-serif,inherit);margin-top:24px;max-width:11ch;font-size:clamp(46px,6vw,77px)}
${s} [data-pica-part="intro"]{padding-top:5px;display:grid;align-content:space-between;gap:24px}
${s} [data-pica-part="intro"] p{font-size:18px}
${s} [data-pica-part="work"]{display:grid;grid-template-columns:1.6fr 1fr;align-items:center;gap:60px;border-top:1px solid ${fg};padding:35px 0}
${s} [data-pica-part="art"]{padding:18px;border:1px solid ${muted}}
${s} [data-pica-part="art"] svg{width:100%;max-height:350px}
${s} [data-pica-part="art"] figcaption{margin-top:14px;font-size:9px;color:${muted}}
${s} [data-pica-part="work-label"]{display:grid;gap:12px;max-width:28rem}
${s} [data-pica-part="number"]{font-family:${GRID_FONT};font-size:14px;color:${fg};border-bottom:1px solid ${accent};padding-bottom:8px;width:34px}
${s} [data-pica-part="artist"]{font-size:16px}
${s} [data-pica-part="medium"]{font-family:${GRID_FONT};font-size:11px;color:${muted};margin-bottom:10px}
${s} [data-pica-part="curatorial"]{font-size:15px;line-height:1.65}
${s} [data-pica-form="1"]{grid-template-columns:1fr 1.1fr;padding-left:20%}
${s} [data-pica-form="1"] [data-pica-part="art"]{max-width:280px}
${s} [data-pica-form="2"]{grid-template-columns:1.1fr 1fr;padding-right:12%}
${s} [data-pica-part="visit"]{border-top:1px solid ${fg};padding-top:24px;display:grid;grid-template-columns:1fr 2fr;gap:25px;font-size:14px}
${s} [data-pica-part="visit"]>p:last-child{grid-column:2}
@media(max-width:800px){${s} [data-pica-part="opening"],${s} [data-pica-part="work"]{gap:30px}${s} [data-pica-form="1"]{padding-left:8%}${s} [data-pica-form="2"]{padding-right:0}}
@media(max-width:600px){${s} [data-pica-part="opening"],${s} [data-pica-part="work"]{grid-template-columns:1fr;gap:25px;padding-left:0;padding-right:0}${s} [data-pica-part="opening"]{padding:26px 0 30px}${s} [data-pica-part="intro"] p{font-size:16px}${s} [data-pica-part="work-label"]{gap:10px}${s} [data-pica-form="1"] [data-pica-part="art"]{margin:auto;width:75%}${s} [data-pica-part="visit"]{grid-template-columns:1fr;gap:15px}${s} [data-pica-part="visit"]>p:last-child{grid-column:auto}}
`;
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    const attributes = hostAttributes(host);
    const container = galleryNode("div", "");
    host.append(container);
    const sheet = scope(container);
    const page = galleryNode("article", "");
    page.setAttribute("data-pica-page", "");
    container.append(page);
    const id = nextId("pica-exhibition-labels");
    sheet.setRules(galleryRules(sheet.selector));
    let destroyed = false;
    const render = () => {
      attributes.set("aria-hidden", "false");
      attributes.set("role", "region");
      attributes.set("aria-label", props.title);
      page.replaceChildren();
      const top = galleryNode("header", "top");
      top.append(galleryNode("span", "label", props.gallery));
      const nav = galleryNode("nav", "");
      nav.setAttribute("aria-label", "Exhibition sections");
      nav.append(galleryLink(`Works / ${String(props.works.length).padStart(2, "0")}`, `${id}-works`), galleryLink("Visitor notes", `${id}-visit`));
      top.append(nav);
      const opening = galleryNode("section", "opening");
      const headline = galleryNode("div", "headline");
      headline.append(galleryNode("span", "label", "EXHIBITION / CATALOGUE EXCERPT"), galleryNode("h1", "", props.title));
      const intro = galleryNode("div", "intro");
      intro.append(galleryNode("span", "label", props.dates), galleryNode("p", "", props.introduction));
      opening.append(headline, intro);
      const works = galleryNode("section", "works");
      works.id = `${id}-works`;
      works.setAttribute("aria-label", "Selected works");
      for (const [i, work] of props.works.entries()) {
        const row = galleryNode("article", "work");
        row.dataset.picaForm = String(i % 3);
        const figure = galleryNode("figure", "art");
        const drawing = gallerySvg("svg", { viewBox: i % 3 === 1 ? "0 0 260 390" : "0 0 520 310", "aria-hidden": "true" });
        if (i % 3 === 0) {
          for (let line = 0; line < 26; line++) {
            const y = 24 + line * 10;
            drawing.append(gallerySvg("path", { d: `M24 ${y}H${205 + line % 5 * 4} M${246 + line % 3 * 4} ${y}H496` }));
          }
        } else if (i % 3 === 1) {
          drawing.append(gallerySvg("path", { d: "M22 23H176L230 182L182 366H22Z", "data-pica-part": "solid" }));
          for (let line = 0; line < 9; line++) drawing.append(gallerySvg("path", { d: `M${191 + line * 5} 24V365` }));
        } else {
          drawing.append(gallerySvg("circle", { cx: "225", cy: "155", r: "110" }), gallerySvg("circle", { cx: "295", cy: "155", r: "110" }));
          for (let line = 0; line < 11; line++) drawing.append(gallerySvg("path", { d: `M${150 + line * 20} 50V260`, "stroke-dasharray": "1 7" }));
        }
        figure.append(drawing, galleryNode("figcaption", "label", `STUDY ${String(i + 1).padStart(2, "0")} / ORIGINAL ABSTRACT PLATE`));
        const label = galleryNode("div", "work-label");
        label.append(galleryNode("span", "number", String(i + 1).padStart(2, "0")), galleryNode("h2", "", work.title), galleryNode("p", "artist", work.artist), galleryNode("p", "medium", work.medium), galleryNode("p", "curatorial", work.label));
        row.append(figure, label);
        works.append(row);
      }
      const visit = galleryNode("section", "visit");
      visit.id = `${id}-visit`;
      visit.append(galleryNode("span", "label", "Spend a little longer"), galleryNode("p", "", "The gallery is quietest before noon. Seating is available in each room. Large-print labels and a tactile guide can be borrowed from the welcome desk."), galleryNode("p", "muted", "Free entry · Tuesday–Sunday, 10:00–18:00 · Step-free throughout"));
      const footer = galleryNode("footer", "footer");
      footer.append(galleryNode("span", "label", "Curated by Leah Morrow / Edition 003"), galleryLink("Return to the works ↑", `${id}-works`));
      page.append(top, opening, works, visit, footer);
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
  var instance = PicaExhibitionLabels.mount(host, take(initial));
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
