# Swiss Hero

> A hero set on a strict twelve column grid: flush left type, hairline rules, white space, and one accent.

Category: sections. Tags: hero, swiss, grid, typography, international style, section. Static. Size: 2.7 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/swiss-hero.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `headline` | string | `"Set on a strict grid."` | The headline, set large and flush left across eight of the twelve columns. Empty hides it. |
| `subhead` | string | `"Twelve columns, one gutter, and nothing placed off it. Type does the ordering; white space does the rest."` | Supporting copy under the headline, in a narrower measure offset a few columns. Empty hides it. |
| `kicker` | string | `"Picagram · component library"` | The small mono metadata block at the top, tracked and uppercase. Newlines start a new line. Empty hides it. |
| `actions` | readonly SwissHeroAction[] | `[{"label":"Browse components","href":"#components"},{"label":"Read the docs","href":"#docs"}]` | Calls to action, drawn as links in source order. The first is the section's one accent, the rest draw hairline. |
| `align` | "start" \| "end" | `"start"` | Which side of the grid the composition sits on: "start" hangs it on the left edge, "end" mirrors it to the right. Text stays flush left either way. |
| `guides` | boolean | `true` | Draw the twelve column guides behind the content at a low strength. |
| `minHeight` | number | `60` | The host's minimum height, in percent of the viewport height. |

## Children

Put content inside the component. It decorates that content and never changes it.

## Colors

Draws with `--pica-fg`, `--pica-muted`, `--pica-accent`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

// Pica · Swiss Hero · swiss-hero
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
  accent: "#e8a020",
  muted: "color-mix(in srgb, var(--pica-fg, currentColor) 65%, transparent)",
};

/** The CSS value of a token, with its fallback, for use in a style: var(--pica-accent, #e8a020). */
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

// registry/sections/swiss-hero/core.ts
/** One call to action: a link's visible text and destination. */
export interface SwissHeroAction {
  /** Text on the link. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface SwissHeroProps {
  /** The headline, set large and flush left across eight of the twelve columns. Empty hides it. */
  headline: string;
  /** Supporting copy under the headline, in a narrower measure offset a few columns. Empty hides it. */
  subhead: string;
  /** The small mono metadata block at the top, tracked and uppercase. Newlines start a new line. Empty hides it. */
  kicker: string;
  /** Calls to action, drawn as links in source order. The first is the section's one accent, the rest draw hairline. */
  actions: readonly SwissHeroAction[];
  /** Which side of the grid the composition sits on: "start" hangs it on the left edge, "end" mirrors it to the right. Text stays flush left either way. */
  align: "start" | "end";
  /** Draw the twelve column guides behind the content at a low strength. */
  guides: boolean;
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
}

export const defaults: SwissHeroProps = {
  headline: "Set on a strict grid.",
  subhead: "Twelve columns, one gutter, and nothing placed off it. Type does the ordering; white space does the rest.",
  kicker: "Picagram · component library",
  actions: [
    { label: "Browse components", href: "#components" },
    { label: "Read the docs", href: "#docs" },
  ],
  align: "start",
  guides: true,
  minHeight: 60,
};

/** Measurements the host grid and the guides share, so the drawn columns land exactly on the real ones:
 *  the guides are a twelve column grid with the same tracks and gutter, inset by the same padding. */
const TRACKS = "repeat(12, minmax(0, 1fr))";
const GUTTER = "clamp(0.75rem, 2vw, 1.75rem)";
const PAD_BLOCK = "clamp(2.5rem, 8vh, 5.5rem)";
const PAD_INLINE = "clamp(1.25rem, 5vw, 4.5rem)";
const NARROW = "44rem";
const COLUMNS = 12;

/** Keeps minHeight inside a sane range even if a caller passes something outside 0 to 100. */
function vh(minHeight: number): number {
  return Math.min(100, Math.max(0, minHeight));
}

/** The column lines each part spans, per side. The headline takes eight of twelve and everything hangs off
 *  one edge; the empty columns are the white space, and "end" mirrors the block without centering it. */
function spans(align: "start" | "end"): { kicker: string; headline: string; subhead: string; actions: string; content: string } {
  return align === "end"
    ? { kicker: "10 / 13", headline: "5 / 13", subhead: "4 / 9", actions: "6 / 13", content: "6 / 13" }
    : { kicker: "1 / 4", headline: "1 / 9", subhead: "5 / 10", actions: "1 / 8", content: "1 / 8" };
}

/** The styles the guides need on the host: a containing block and a stacking context, so the column lines
 *  sit under the content and above the page's ground. The same guard lib/host's layer() uses. */
function hostStyles(host: HTMLElement): Record<string, string> {
  const styles: Record<string, string> = { isolation: "isolate" };
  if (getComputedStyle(host).position === "static") styles.position = "relative";
  return styles;
}

/** Layout for the host and its parts. The host is the grid itself: the page's children and the parts the
 *  core adds are all grid items. Everything explicit takes a row; the children take a column and flow into
 *  the first row below the composition, which is where a hero's own copy belongs. The minimum height sits
 *  in a :where() rule, which carries no specificity, so a page that gives this host a height still wins. */
function rules(selector: string, p: SwissHeroProps): string {
  const s = spans(p.align);
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  const guide = `color-mix(in srgb, ${muted} 32%, transparent)`;
  return [
    `:where(${selector}){min-height:${vh(p.minHeight)}vh}`,
    `${selector}{position:relative;isolation:isolate;box-sizing:border-box;display:grid;grid-template-columns:${TRACKS};column-gap:${GUTTER};row-gap:clamp(1.5rem, 4vh, 3rem);align-content:start;padding:${PAD_BLOCK} ${PAD_INLINE};color:${fg}}`,
    `${selector} *{box-sizing:border-box}`,
    `${selector} > *{min-width:0}`,
    `${selector} > :not([data-pica]){grid-column:${s.content};margin:0}`,
    `${selector} [data-pica-rule]{grid-row:1;grid-column:1 / -1;align-self:start;border-top:1px solid ${muted}}`,
    `${selector} [data-pica-kicker]{grid-row:1;grid-column:${s.kicker};margin:0;padding-block-start:1.1em;font-family:${GRID_FONT};font-size:0.72rem;line-height:1.9;letter-spacing:0.1em;text-transform:uppercase;color:${muted};white-space:pre-line}`,
    `${selector} [data-pica-headline]{grid-row:2;grid-column:${s.headline};margin:clamp(2.5rem, 9vh, 6.5rem) 0 0;font-size:clamp(2.4rem, 6vw, 5.25rem);line-height:1.02;font-weight:700;letter-spacing:-0.01em}`,
    `${selector} [data-pica-subhead]{grid-row:3;grid-column:${s.subhead};margin:0;font-size:clamp(1.05rem, 1.5vw, 1.3rem);line-height:1.5;color:${muted}}`,
    `${selector} [data-pica-actions]{grid-row:4;grid-column:${s.actions};display:flex;flex-wrap:wrap;align-items:center;gap:0.75em;margin-block-start:clamp(0.5rem, 2vh, 1.5rem)}`,
    `${selector} [data-pica-actions]:empty{display:none}`,
    `${selector} [data-pica-actions] a{appearance:none;margin:0;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.65em 1.4em;display:inline-flex;align-items:center;border:1px solid ${muted};border-radius:0;color:${fg};background:transparent;cursor:pointer}`,
    `${selector} [data-pica-actions] a[data-variant="solid"]{background:${accent};border-color:${accent};color:${cssOn("accent")}}`,
    `${selector} [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${accent} 85%, ${fg})}`,
    `${selector} [data-pica-actions] a[data-variant="outline"]:hover{border-color:${fg};background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${selector} [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${selector} [data-pica-guides]{position:absolute;inset:${PAD_BLOCK} ${PAD_INLINE};z-index:-1;display:grid;grid-template-columns:${TRACKS};column-gap:${GUTTER};pointer-events:none}`,
    `${selector} [data-pica-guides] span{border-left:1px solid ${guide}}`,
    `${selector} [data-pica-guides] span:last-of-type{border-right:1px solid ${guide}}`,
    `@media (max-width: ${NARROW}){${selector} [data-pica-kicker],${selector} [data-pica-headline],${selector} [data-pica-subhead],${selector} [data-pica-actions],${selector} > :not([data-pica]){grid-column:1 / -1}${selector} [data-pica-guides]{display:none}}`,
  ].join("\n");
}

/** Creates one element the core owns, marked for identification and restyling. */
function part<K extends keyof HTMLElementTagNameMap>(tag: K, name: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute(`data-pica-${name}`, "");
  return node;
}

/** Rebuilds the action links from JSON: the first solid in the accent, the rest hairline, in source order. */
function renderActions(container: HTMLElement, actions: readonly SwissHeroAction[]): void {
  container.replaceChildren();
  for (const [i, action] of actions.slice(0, 3).entries()) {
    const a = document.createElement("a");
    a.setAttribute("data-pica", "");
    a.dataset.variant = i === 0 ? "solid" : "outline";
    a.href = action.href;
    a.textContent = action.label;
    container.append(a);
  }
}

export const mount: Mount<SwissHeroProps> = (host, initial = {}) => {
  let props: SwissHeroProps = { ...defaults, ...initial };
  const sheet = scope(host);
  const restoreHost = styleHost(host, hostStyles(host));

  const ruleEl = part("div", "rule");
  ruleEl.setAttribute("aria-hidden", "true");
  const kickerEl = part("p", "kicker");
  const headlineEl = part("h1", "headline");
  const subheadEl = part("p", "subhead");
  const actionsEl = part("div", "actions");
  host.append(ruleEl, kickerEl, headlineEl, subheadEl, actionsEl);

  let guidesEl: HTMLElement | null = null;

  function renderGuides(): void {
    if (props.guides && guidesEl === null) {
      guidesEl = part("div", "guides");
      guidesEl.setAttribute("aria-hidden", "true");
      for (let i = 0; i < COLUMNS; i++) {
        const cell = document.createElement("span");
        cell.setAttribute("data-pica", "");
        guidesEl.append(cell);
      }
      host.append(guidesEl);
    } else if (!props.guides && guidesEl !== null) {
      guidesEl.remove();
      guidesEl = null;
    }
  }

  /** Writes a text part and hides it when it has nothing to say, so an empty prop leaves no empty heading. */
  function renderText(el: HTMLElement, text: string): void {
    el.textContent = text;
    el.hidden = text.trim() === "";
  }

  sheet.setRules(rules(sheet.selector, props));
  renderText(kickerEl, props.kicker);
  renderText(headlineEl, props.headline);
  renderText(subheadEl, props.subhead);
  renderActions(actionsEl, props.actions);
  renderGuides();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (before.align !== props.align || before.minHeight !== props.minHeight) {
        sheet.setRules(rules(sheet.selector, props));
      }
      if (before.kicker !== props.kicker) renderText(kickerEl, props.kicker);
      if (before.headline !== props.headline) renderText(headlineEl, props.headline);
      if (before.subhead !== props.subhead) renderText(subheadEl, props.subhead);
      if (!sameJson(before.actions, props.actions)) renderActions(actionsEl, props.actions);
      if (before.guides !== props.guides) renderGuides();
    },
    destroy() {
      guidesEl?.remove();
      guidesEl = null;
      ruleEl.remove();
      kickerEl.remove();
      headlineEl.remove();
      subheadEl.remove();
      actionsEl.remove();
      restoreHost();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};

// registry/sections/swiss-hero/index.tsx
export type SwissHeroComponentProps = Partial<SwissHeroProps> & WrapperProps & { children?: ReactNode };

/** A hero set on a strict twelve column grid, flush left, with hairline rules and one accent. */
export function SwissHero({ className, style, palette, children, ...props }: SwissHeroComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Swiss Hero · swiss-hero
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en" data-stage="flow">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Swiss Hero · Pica</title>
<style>:root { --pica-accent: #e8a020; }
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
<div id="pica"><p>Every component is one source: a framework-free core, a React file, and a single HTML file.</p></div>
<script>
"use strict";
var PicaSwissHero = (() => {
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

  // registry/sections/swiss-hero/core.ts
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
  var unstyled = /* @__PURE__ */ new WeakMap();
  function styleHost(host, styles) {
    if (!unstyled.has(host)) unstyled.set(host, !host.hasAttribute("style"));
    const before = Object.keys(styles).map(
      (name) => [name, host.style.getPropertyValue(name), host.style.getPropertyPriority(name)]
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
    accent: "#e8a020",
    muted: "color-mix(in srgb, var(--pica-fg, currentColor) 65%, transparent)"
  };
  function cssVar(token) {
    return `var(--pica-${token}, ${TOKEN_FALLBACK[token]})`;
  }
  function cssOn(token) {
    return `oklch(from ${cssVar(token)} clamp(0, (0.62 - l) * 1000, 1) 0 0)`;
  }

  // registry/sections/swiss-hero/core.ts
  var defaults = {
    headline: "Set on a strict grid.",
    subhead: "Twelve columns, one gutter, and nothing placed off it. Type does the ordering; white space does the rest.",
    kicker: "Picagram · component library",
    actions: [
      { label: "Browse components", href: "#components" },
      { label: "Read the docs", href: "#docs" }
    ],
    align: "start",
    guides: true,
    minHeight: 60
  };
  var TRACKS = "repeat(12, minmax(0, 1fr))";
  var GUTTER = "clamp(0.75rem, 2vw, 1.75rem)";
  var PAD_BLOCK = "clamp(2.5rem, 8vh, 5.5rem)";
  var PAD_INLINE = "clamp(1.25rem, 5vw, 4.5rem)";
  var NARROW = "44rem";
  var COLUMNS = 12;
  function vh(minHeight) {
    return Math.min(100, Math.max(0, minHeight));
  }
  function spans(align) {
    return align === "end" ? { kicker: "10 / 13", headline: "5 / 13", subhead: "4 / 9", actions: "6 / 13", content: "6 / 13" } : { kicker: "1 / 4", headline: "1 / 9", subhead: "5 / 10", actions: "1 / 8", content: "1 / 8" };
  }
  function hostStyles(host) {
    const styles = { isolation: "isolate" };
    if (getComputedStyle(host).position === "static") styles.position = "relative";
    return styles;
  }
  function rules(selector, p) {
    const s = spans(p.align);
    const fg = cssVar("fg");
    const muted = cssVar("muted");
    const accent = cssVar("accent");
    const guide = `color-mix(in srgb, ${muted} 32%, transparent)`;
    return [
      `:where(${selector}){min-height:${vh(p.minHeight)}vh}`,
      `${selector}{position:relative;isolation:isolate;box-sizing:border-box;display:grid;grid-template-columns:${TRACKS};column-gap:${GUTTER};row-gap:clamp(1.5rem, 4vh, 3rem);align-content:start;padding:${PAD_BLOCK} ${PAD_INLINE};color:${fg}}`,
      `${selector} *{box-sizing:border-box}`,
      `${selector} > *{min-width:0}`,
      `${selector} > :not([data-pica]){grid-column:${s.content};margin:0}`,
      `${selector} [data-pica-rule]{grid-row:1;grid-column:1 / -1;align-self:start;border-top:1px solid ${muted}}`,
      `${selector} [data-pica-kicker]{grid-row:1;grid-column:${s.kicker};margin:0;padding-block-start:1.1em;font-family:${GRID_FONT};font-size:0.72rem;line-height:1.9;letter-spacing:0.1em;text-transform:uppercase;color:${muted};white-space:pre-line}`,
      `${selector} [data-pica-headline]{grid-row:2;grid-column:${s.headline};margin:clamp(2.5rem, 9vh, 6.5rem) 0 0;font-size:clamp(2.4rem, 6vw, 5.25rem);line-height:1.02;font-weight:700;letter-spacing:-0.01em}`,
      `${selector} [data-pica-subhead]{grid-row:3;grid-column:${s.subhead};margin:0;font-size:clamp(1.05rem, 1.5vw, 1.3rem);line-height:1.5;color:${muted}}`,
      `${selector} [data-pica-actions]{grid-row:4;grid-column:${s.actions};display:flex;flex-wrap:wrap;align-items:center;gap:0.75em;margin-block-start:clamp(0.5rem, 2vh, 1.5rem)}`,
      `${selector} [data-pica-actions]:empty{display:none}`,
      `${selector} [data-pica-actions] a{appearance:none;margin:0;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.65em 1.4em;display:inline-flex;align-items:center;border:1px solid ${muted};border-radius:0;color:${fg};background:transparent;cursor:pointer}`,
      `${selector} [data-pica-actions] a[data-variant="solid"]{background:${accent};border-color:${accent};color:${cssOn("accent")}}`,
      `${selector} [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${accent} 85%, ${fg})}`,
      `${selector} [data-pica-actions] a[data-variant="outline"]:hover{border-color:${fg};background:color-mix(in srgb, ${fg} 10%, transparent)}`,
      `${selector} [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
      `${selector} [data-pica-guides]{position:absolute;inset:${PAD_BLOCK} ${PAD_INLINE};z-index:-1;display:grid;grid-template-columns:${TRACKS};column-gap:${GUTTER};pointer-events:none}`,
      `${selector} [data-pica-guides] span{border-left:1px solid ${guide}}`,
      `${selector} [data-pica-guides] span:last-of-type{border-right:1px solid ${guide}}`,
      `@media (max-width: ${NARROW}){${selector} [data-pica-kicker],${selector} [data-pica-headline],${selector} [data-pica-subhead],${selector} [data-pica-actions],${selector} > :not([data-pica]){grid-column:1 / -1}${selector} [data-pica-guides]{display:none}}`
    ].join("\n");
  }
  function part(tag, name) {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    node.setAttribute(`data-pica-${name}`, "");
    return node;
  }
  function renderActions(container, actions) {
    container.replaceChildren();
    for (const [i, action] of actions.slice(0, 3).entries()) {
      const a = document.createElement("a");
      a.setAttribute("data-pica", "");
      a.dataset.variant = i === 0 ? "solid" : "outline";
      a.href = action.href;
      a.textContent = action.label;
      container.append(a);
    }
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    const sheet = scope(host);
    const restoreHost = styleHost(host, hostStyles(host));
    const ruleEl = part("div", "rule");
    ruleEl.setAttribute("aria-hidden", "true");
    const kickerEl = part("p", "kicker");
    const headlineEl = part("h1", "headline");
    const subheadEl = part("p", "subhead");
    const actionsEl = part("div", "actions");
    host.append(ruleEl, kickerEl, headlineEl, subheadEl, actionsEl);
    let guidesEl = null;
    function renderGuides() {
      if (props.guides && guidesEl === null) {
        guidesEl = part("div", "guides");
        guidesEl.setAttribute("aria-hidden", "true");
        for (let i = 0; i < COLUMNS; i++) {
          const cell = document.createElement("span");
          cell.setAttribute("data-pica", "");
          guidesEl.append(cell);
        }
        host.append(guidesEl);
      } else if (!props.guides && guidesEl !== null) {
        guidesEl.remove();
        guidesEl = null;
      }
    }
    function renderText(el, text) {
      el.textContent = text;
      el.hidden = text.trim() === "";
    }
    sheet.setRules(rules(sheet.selector, props));
    renderText(kickerEl, props.kicker);
    renderText(headlineEl, props.headline);
    renderText(subheadEl, props.subhead);
    renderActions(actionsEl, props.actions);
    renderGuides();
    host.dataset.picaReady = "true";
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        if (before.align !== props.align || before.minHeight !== props.minHeight) {
          sheet.setRules(rules(sheet.selector, props));
        }
        if (before.kicker !== props.kicker) renderText(kickerEl, props.kicker);
        if (before.headline !== props.headline) renderText(headlineEl, props.headline);
        if (before.subhead !== props.subhead) renderText(subheadEl, props.subhead);
        if (!sameJson(before.actions, props.actions)) renderActions(actionsEl, props.actions);
        if (before.guides !== props.guides) renderGuides();
      },
      destroy() {
        guidesEl?.remove();
        guidesEl = null;
        ruleEl.remove();
        kickerEl.remove();
        headlineEl.remove();
        subheadEl.remove();
        actionsEl.remove();
        restoreHost();
        sheet.destroy();
        delete host.dataset.picaReady;
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
  var instance = PicaSwissHero.mount(host, take(window.PICA_PROPS || {}));
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
