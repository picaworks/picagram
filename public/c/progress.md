# Progress

> A labelled determinate progress bar drawn as flat block cells with an exact accessible value.

Category: ui. Tags: progress, status, completion, ui. Static. Size: 1.7 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/progress.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | number | `62` | The current amount, clamped between min and max. |
| `min` | number | `0` | The lowest value in the range. |
| `max` | number | `100` | The highest value in the range. |
| `label` | string | `"Upload"` | The visible and accessible name of the progress bar. |
| `showValue` | boolean | `true` | Shows the completed percentage at the end of the label line. |
| `width` | number | `40` | The number of cells in the track, from 8 to 80. |

## Colors

Draws with `--pica-fg`, `--pica-accent`, `--pica-muted`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Progress · progress
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

// lib/blocks.ts
/** Unicode block and braille glyphs for text-mode drawing. Every glyph here is one UTF-16 code unit, so a
 *  table can be indexed like an array. */

/** The braille pattern with no dots raised. Add dot bits to it. */
const BRAILLE_BASE = 0x2800;

/** The bit for the braille dot at `row` 0 to 3 and `col` 0 or 1. Rows 0 to 2 are dots 1 to 3 on the left
 *  and 4 to 6 on the right. Row 3 holds dots 7 and 8, which Unicode added later, so their bits come last. */
function brailleDot(row: number, col: number): number {
  if (row === 3) return col === 0 ? 0x40 : 0x80;
  return 1 << (col === 0 ? row : row + 3);
}

/** The braille glyph for a set of dot bits. */
function braille(bits: number): string {
  return String.fromCharCode(BRAILLE_BASE + (bits & 0xff));
}

/** Quadrant glyphs, indexed by top left 1, top right 2, bottom left 4, and bottom right 8. */
const QUADRANTS = " ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█";

/** The glyph that inks the given quadrants of a cell. */
function quadrant(tl: boolean, tr: boolean, bl: boolean, br: boolean): string {
  return QUADRANTS[(tl ? 1 : 0) | (tr ? 2 : 0) | (bl ? 4 : 0) | (br ? 8 : 0)] ?? " ";
}

/** A cell filled from the bottom by 0 to 8 eighths. */
const LOWER_EIGHTHS = " ▁▂▃▄▅▆▇█";

/** A cell filled from the left by 0 to 8 eighths. */
const LEFT_EIGHTHS = " ▏▎▍▌▋▊▉█";

/** Blank, light shade, medium shade, dark shade, and full block. */
const SHADES = " ░▒▓█";

const clampEighths = (n: number): number => Math.max(0, Math.min(8, Math.round(n)));

/** The glyph filling `n` eighths of a cell from the bottom, clamped to 0 to 8. */
function lowerEighth(n: number): string {
  return LOWER_EIGHTHS[clampEighths(n)] ?? " ";
}

/** The shade glyph for level `n`, clamped to 0 (blank) through 4 (full block). */
function shade(n: number): string {
  return SHADES[Math.max(0, Math.min(4, Math.round(n)))] ?? " ";
}

/** The glyph filling `n` eighths of a cell from the left, clamped to 0 to 8. */
function leftEighth(n: number): string {
  return LEFT_EIGHTHS[clampEighths(n)] ?? " ";
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

// registry/ui/progress/core.ts
export interface ProgressProps {
  /** The current amount, clamped between min and max. */
  value: number;
  /** The lowest value in the range. */
  min: number;
  /** The highest value in the range. */
  max: number;
  /** The visible and accessible name of the progress bar. */
  label: string;
  /** Shows the completed percentage at the end of the label line. */
  showValue: boolean;
  /** The number of cells in the track, from 8 to 80. */
  width: number;
}

export const defaults: ProgressProps = {
  value: 62,
  min: 0,
  max: 100,
  label: "Upload",
  showValue: true,
  width: 40,
};

interface ProgressRange {
  min: number;
  max: number;
  value: number;
  ratio: number;
}

function finiteProgress(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function progressRange(props: ProgressProps): ProgressRange {
  const min = finiteProgress(props.min, defaults.min);
  const requestedMax = finiteProgress(props.max, defaults.max);
  const max = requestedMax > min ? requestedMax : min + 1;
  const requestedValue = finiteProgress(props.value, min);
  const value = Math.max(min, Math.min(max, requestedValue));
  return { min, max, value, ratio: (value - min) / (max - min) };
}

function progressWidth(value: number): number {
  return Math.max(8, Math.min(80, Math.round(finiteProgress(value, defaults.width))));
}

function progressRules(selector: string, width: number): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const muted = cssVar("muted");
  const fittedSize = (145 / width).toFixed(4);
  return [
    `${selector}{display:grid;place-items:center;box-sizing:border-box;padding:1em;color:${fg};container-type:inline-size}`,
    `${selector} [data-pica-progress="frame"]{display:inline-grid;gap:0.55em;max-inline-size:100%}`,
    `${selector} [data-pica-progress="label"]{display:flex;align-items:baseline;justify-content:space-between;gap:2em;font:inherit;line-height:1.2;color:${fg}}`,
    `${selector} [data-pica-progress="value"]{font-family:${GRID_FONT};font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1;text-align:right}`,
    `${selector} [data-pica-progress="track"]{display:flex;inline-size:max-content;max-inline-size:100%;overflow:visible;font-family:${GRID_FONT};font-size:min(1em,${fittedSize}cqi);font-variant-ligatures:none;line-height:1;letter-spacing:0;white-space:pre}`,
    `${selector} [data-pica-progress="fill"]{color:${accent}}`,
    `${selector} [data-pica-progress="rest"]{color:${muted}}`,
  ].join("\n");
}

function progressNode(tag: "div" | "span", part: string): HTMLElement {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute("data-pica-progress", part);
  return node;
}

export const mount: Mount<ProgressProps> = (host, initial = {}) => {
  let props: ProgressProps = { ...defaults, ...initial };
  const sheet = scope(host);
  const frame = progressNode("div", "frame");
  const labelLine = progressNode("div", "label");
  const label = progressNode("span", "label-text");
  const value = progressNode("span", "value");
  const track = progressNode("div", "track");
  const fill = progressNode("span", "fill");
  const rest = progressNode("span", "rest");
  const labelId = nextId("pica-progress-label");

  label.id = labelId;
  labelLine.append(label, value);
  track.setAttribute("role", "progressbar");
  track.setAttribute("aria-labelledby", labelId);
  track.append(fill, rest);
  frame.append(labelLine, track);
  host.append(frame);

  function draw(): void {
    const range = progressRange(props);
    const width = progressWidth(props.width);
    const eighths = Math.round(range.ratio * width * 8);
    const fullCells = Math.floor(eighths / 8);
    const partial = eighths % 8;
    const partialCells = partial > 0 ? 1 : 0;

    label.textContent = props.label;
    value.textContent = `${Math.round(range.ratio * 100)}%`;
    value.hidden = !props.showValue;
    fill.textContent = `${leftEighth(8).repeat(fullCells)}${partial > 0 ? leftEighth(partial) : ""}`;
    rest.textContent = shade(1).repeat(width - fullCells - partialCells);
    track.setAttribute("aria-valuemin", String(range.min));
    track.setAttribute("aria-valuemax", String(range.max));
    track.setAttribute("aria-valuenow", String(range.value));
    sheet.setRules(progressRules(sheet.selector, width));
  }

  draw();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      draw();
    },
    destroy() {
      frame.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};

// registry/ui/progress/index.tsx
export type ProgressComponentProps = Partial<ProgressProps> & WrapperProps;

/** A labelled determinate progress bar drawn as a row of block cells. */
export function Progress({ className, style, palette, ...props }: ProgressComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Progress · progress
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Progress · Pica</title>
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
var PicaProgress = (() => {
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

  // registry/ui/progress/core.ts
  var core_exports = {};
  __export(core_exports, {
    defaults: () => defaults,
    mount: () => mount
  });

  // lib/blocks.ts
  var LEFT_EIGHTHS = " ▏▎▍▌▋▊▉█";
  var SHADES = " ░▒▓█";
  var clampEighths = (n) => Math.max(0, Math.min(8, Math.round(n)));
  function shade(n) {
    return SHADES[Math.max(0, Math.min(4, Math.round(n)))] ?? " ";
  }
  function leftEighth(n) {
    return LEFT_EIGHTHS[clampEighths(n)] ?? " ";
  }

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

  // registry/ui/progress/core.ts
  var defaults = {
    value: 62,
    min: 0,
    max: 100,
    label: "Upload",
    showValue: true,
    width: 40
  };
  function finiteProgress(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }
  function progressRange(props) {
    const min = finiteProgress(props.min, defaults.min);
    const requestedMax = finiteProgress(props.max, defaults.max);
    const max = requestedMax > min ? requestedMax : min + 1;
    const requestedValue = finiteProgress(props.value, min);
    const value = Math.max(min, Math.min(max, requestedValue));
    return { min, max, value, ratio: (value - min) / (max - min) };
  }
  function progressWidth(value) {
    return Math.max(8, Math.min(80, Math.round(finiteProgress(value, defaults.width))));
  }
  function progressRules(selector, width) {
    const fg = cssVar("fg");
    const accent = cssVar("accent");
    const muted = cssVar("muted");
    const fittedSize = (145 / width).toFixed(4);
    return [
      `${selector}{display:grid;place-items:center;box-sizing:border-box;padding:1em;color:${fg};container-type:inline-size}`,
      `${selector} [data-pica-progress="frame"]{display:inline-grid;gap:0.55em;max-inline-size:100%}`,
      `${selector} [data-pica-progress="label"]{display:flex;align-items:baseline;justify-content:space-between;gap:2em;font:inherit;line-height:1.2;color:${fg}}`,
      `${selector} [data-pica-progress="value"]{font-family:${GRID_FONT};font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1;text-align:right}`,
      `${selector} [data-pica-progress="track"]{display:flex;inline-size:max-content;max-inline-size:100%;overflow:visible;font-family:${GRID_FONT};font-size:min(1em,${fittedSize}cqi);font-variant-ligatures:none;line-height:1;letter-spacing:0;white-space:pre}`,
      `${selector} [data-pica-progress="fill"]{color:${accent}}`,
      `${selector} [data-pica-progress="rest"]{color:${muted}}`
    ].join("\n");
  }
  function progressNode(tag, part) {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    node.setAttribute("data-pica-progress", part);
    return node;
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    const sheet = scope(host);
    const frame = progressNode("div", "frame");
    const labelLine = progressNode("div", "label");
    const label = progressNode("span", "label-text");
    const value = progressNode("span", "value");
    const track = progressNode("div", "track");
    const fill = progressNode("span", "fill");
    const rest = progressNode("span", "rest");
    const labelId = nextId("pica-progress-label");
    label.id = labelId;
    labelLine.append(label, value);
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-labelledby", labelId);
    track.append(fill, rest);
    frame.append(labelLine, track);
    host.append(frame);
    function draw() {
      const range = progressRange(props);
      const width = progressWidth(props.width);
      const eighths = Math.round(range.ratio * width * 8);
      const fullCells = Math.floor(eighths / 8);
      const partial = eighths % 8;
      const partialCells = partial > 0 ? 1 : 0;
      label.textContent = props.label;
      value.textContent = `${Math.round(range.ratio * 100)}%`;
      value.hidden = !props.showValue;
      fill.textContent = `${leftEighth(8).repeat(fullCells)}${partial > 0 ? leftEighth(partial) : ""}`;
      rest.textContent = shade(1).repeat(width - fullCells - partialCells);
      track.setAttribute("aria-valuemin", String(range.min));
      track.setAttribute("aria-valuemax", String(range.max));
      track.setAttribute("aria-valuenow", String(range.value));
      sheet.setRules(progressRules(sheet.selector, width));
    }
    draw();
    host.dataset.picaReady = "true";
    return {
      update(next) {
        props = { ...props, ...next };
        draw();
      },
      destroy() {
        frame.remove();
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
  var instance = PicaProgress.mount(host, take(window.PICA_PROPS || {}));
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

- Technique from [progressbar role](https://www.w3.org/TR/wai-aria-1.2/#progressbar) by W3C (W3C document).
