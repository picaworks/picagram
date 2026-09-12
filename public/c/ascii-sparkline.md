# ASCII Sparkline

> A series of numbers drawn inline as eighth-block bars or a braille line, scaled to its own range.

Category: text-mode. Tags: sparkline, chart, braille, inline. Static. Size: 1.5 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/ascii-sparkline.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `values` | number[] | `[3.1,3.5,3.3,3.9,4.4,4.1,4.7,5.2,4.9,5.5,6.1,5.8,6.4,7,6.7,7.3,7.9,8.4,9.1,9.8,9.3,8.6,7.9,7.2]` | Series to plot, in order. Values that are not finite numbers are skipped. |
| `mode` | "blocks" \| "braille" | `"blocks"` | "blocks" draws one eighth-block bar per cell. "braille" draws a higher-resolution line, two values per cell. |
| `width` | number | `0` | Cells to draw. 0 fits one cell per value in blocks mode, or one cell per two values in braille mode. A positive width resamples the series to that many cells. |
| `min` | number \| null | `null` | Value mapped to the bottom of the range. Null reads the series' own minimum. |
| `max` | number \| null | `null` | Value mapped to the top of the range. Null reads the series' own maximum. |
| `label` | string | `"trend"` | Name for the series, read by assistive technology before its size, range, and latest value. |
| `fontFamily` | string | `"\"JetBrains Mono\", \"IBM Plex Mono\", ui-monospace, \"SFMono-Regular\", Menlo, monospace"` | CSS font-family stack. Must be monospace. |

## Colors

Draws with `--pica-fg`. Set it on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · ASCII Sparkline · ascii-sparkline
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

// lib/a11y.ts
/** Accessibility attributes a core sets on its host. See docs/architecture/contract.md, mount step 2. */

/** Gives the host a role and a label, or hides it from assistive technology when the label is empty. */
function labelHost(host: HTMLElement, label: string, role = "img"): void {
  if (label) {
    host.setAttribute("role", role);
    host.setAttribute("aria-label", label);
    host.removeAttribute("aria-hidden");
  } else {
    host.removeAttribute("role");
    host.removeAttribute("aria-label");
    host.setAttribute("aria-hidden", "true");
  }
}

/** Removes what labelHost set. */
function unlabelHost(host: HTMLElement): void {
  host.removeAttribute("role");
  host.removeAttribute("aria-label");
  host.removeAttribute("aria-hidden");
}

/** A visually hidden element that carries text for assistive technology, for components whose visible text
 *  animates. Put the animated layer next to it with aria-hidden. */
function hiddenText(text: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.textContent = text;
  span.style.cssText =
    "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";
  return span;
}

/** Text whose visible glyphs animate, such as a scramble or a typewriter. The host keeps its place in the
 *  document with no role, so a heading around it stays a heading. A visually hidden copy carries the final
 *  text for assistive technology, and the animation draws into the returned layer, which is hidden from it. */
interface AnimatedText {
  /** Where the animation draws. Hidden from assistive technology. */
  readonly layer: HTMLElement;
  /** Changes the text assistive technology reads. */
  setText(text: string): void;
  /** Removes the hidden copy and the layer. */
  remove(): void;
}

function animatedText(host: HTMLElement, text: string, tag: "span" | "div" | "pre" = "span"): AnimatedText {
  const hidden = hiddenText(text);
  hidden.setAttribute("data-pica", "");
  const layer = document.createElement(tag);
  layer.setAttribute("data-pica", "");
  layer.setAttribute("aria-hidden", "true");
  host.append(hidden, layer);
  return {
    layer,
    setText(next) {
      hidden.textContent = next;
    },
    remove() {
      hidden.remove();
      layer.remove();
    },
  };
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

// registry/text-mode/ascii-sparkline/core.ts
export interface AsciiSparklineProps {
  /** Series to plot, in order. Values that are not finite numbers are skipped. */
  values: number[];
  /** "blocks" draws one eighth-block bar per cell. "braille" draws a higher-resolution line, two values per cell. */
  mode: "blocks" | "braille";
  /** Cells to draw. 0 fits one cell per value in blocks mode, or one cell per two values in braille mode. A positive width resamples the series to that many cells. */
  width: number;
  /** Value mapped to the bottom of the range. Null reads the series' own minimum. */
  min: number | null;
  /** Value mapped to the top of the range. Null reads the series' own maximum. */
  max: number | null;
  /** Name for the series, read by assistive technology before its size, range, and latest value. */
  label: string;
  /** CSS font-family stack. Must be monospace. */
  fontFamily: string;
}

export const defaults: AsciiSparklineProps = {
  values: [
    3.1, 3.5, 3.3, 3.9, 4.4, 4.1, 4.7, 5.2, 4.9, 5.5, 6.1, 5.8,
    6.4, 7.0, 6.7, 7.3, 7.9, 8.4, 9.1, 9.8, 9.3, 8.6, 7.9, 7.2,
  ],
  mode: "blocks",
  width: 0,
  min: null,
  max: null,
  label: "trend",
  fontFamily: GRID_FONT,
};

/** Resamples `source` to `count` points by linear interpolation along its index. */
function resample(source: readonly number[], count: number): number[] {
  const last = source.length - 1;
  const out = new Array<number>(count);
  for (let i = 0; i < count; i++) {
    const t = count > 1 ? (i * last) / (count - 1) : 0;
    const lo = Math.floor(t);
    const hi = Math.min(lo + 1, last);
    const frac = t - lo;
    out[i] = (source[lo] ?? 0) * (1 - frac) + (source[hi] ?? 0) * frac;
  }
  return out;
}

/** The text for one clean series: eighth-block bars, or a braille line at 2 by 4 dots per cell. */
function render(props: AsciiSparklineProps, clean: readonly number[]): string {
  if (clean.length === 0) return "";
  const lo = props.min ?? Math.min(...clean);
  const hi = props.max ?? Math.max(...clean);
  const span = hi - lo;
  // A flat series, or explicit bounds with no span, reads as the middle of the ramp rather than full.
  const scale = (v: number): number => (span > 0 ? Math.min(1, Math.max(0, (v - lo) / span)) : 0.5);

  if (props.mode === "braille") {
    const cells = props.width > 0 ? props.width : Math.ceil(clean.length / 2);
    const dots = resample(clean, cells * 2);
    let text = "";
    for (let c = 0; c < cells; c++) {
      let bits = 0;
      for (let col = 0; col < 2; col++) {
        const t = scale(dots[c * 2 + col] ?? lo);
        const row = Math.min(3, Math.max(0, Math.round((1 - t) * 3)));
        bits |= brailleDot(row, col);
      }
      text += braille(bits);
    }
    return text;
  }

  const cells = props.width > 0 ? props.width : clean.length;
  let text = "";
  for (const v of resample(clean, cells)) {
    const level = Math.min(7, Math.max(0, Math.round(scale(v) * 7)));
    text += lowerEighth(level + 1);
  }
  return text;
}

/** One decimal place, without a trailing zero. */
function short(n: number): string {
  return String(Math.round(n * 10) / 10);
}

/** The label assistive technology reads: the series' name, size, range, and latest value. */
function describe(props: AsciiSparklineProps, clean: readonly number[]): string {
  if (clean.length === 0) return `${props.label}: no data`;
  const lo = props.min ?? Math.min(...clean);
  const hi = props.max ?? Math.max(...clean);
  const last = clean[clean.length - 1] ?? 0;
  const unit = clean.length === 1 ? "value" : "values";
  return `${props.label}: ${clean.length} ${unit} from ${short(lo)} to ${short(hi)}, last ${short(last)}`;
}

export const mount: Mount<AsciiSparklineProps> = (host, initial = {}) => {
  let props: AsciiSparklineProps = { ...defaults, ...initial };
  const view = document.createElement("span");
  view.setAttribute("data-pica", "");
  view.setAttribute("aria-hidden", "true");
  view.style.whiteSpace = "nowrap";
  view.style.userSelect = "none";
  view.style.pointerEvents = "none";
  view.style.color = cssVar("fg");
  host.appendChild(view);

  function draw(): void {
    const clean = props.values.filter((v) => Number.isFinite(v));
    view.style.fontFamily = props.fontFamily;
    view.textContent = render(props, clean);
    labelHost(host, describe(props, clean));
    host.dataset.picaReady = "true";
  }

  draw();

  return {
    update(next) {
      props = { ...props, ...next };
      draw();
    },
    destroy() {
      view.remove();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};

// registry/text-mode/ascii-sparkline/index.tsx
export type AsciiSparklineComponentProps = Partial<AsciiSparklineProps> & WrapperProps;

/** A series of numbers drawn inline as a sparkline, in eighth-block bars or a braille line. */
export function AsciiSparkline({ className, style, palette, ...props }: AsciiSparklineComponentProps) {
  const ref = usePica(mount, props);
  return <span ref={ref} className={className} style={{ display: "inline-block", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · ASCII Sparkline · ascii-sparkline
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>ASCII Sparkline · Pica</title>
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
<div class="pica-stage"><span id="pica"></span></div>
<script>
"use strict";
var PicaAsciiSparkline = (() => {
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

  // registry/text-mode/ascii-sparkline/core.ts
  var core_exports = {};
  __export(core_exports, {
    defaults: () => defaults,
    mount: () => mount
  });

  // lib/a11y.ts
  function labelHost(host, label, role = "img") {
    if (label) {
      host.setAttribute("role", role);
      host.setAttribute("aria-label", label);
      host.removeAttribute("aria-hidden");
    } else {
      host.removeAttribute("role");
      host.removeAttribute("aria-label");
      host.setAttribute("aria-hidden", "true");
    }
  }
  function unlabelHost(host) {
    host.removeAttribute("role");
    host.removeAttribute("aria-label");
    host.removeAttribute("aria-hidden");
  }

  // lib/blocks.ts
  var BRAILLE_BASE = 10240;
  function brailleDot(row, col) {
    if (row === 3) return col === 0 ? 64 : 128;
    return 1 << (col === 0 ? row : row + 3);
  }
  function braille(bits) {
    return String.fromCharCode(BRAILLE_BASE + (bits & 255));
  }
  var LOWER_EIGHTHS = " ▁▂▃▄▅▆▇█";
  var clampEighths = (n) => Math.max(0, Math.min(8, Math.round(n)));
  function lowerEighth(n) {
    return LOWER_EIGHTHS[clampEighths(n)] ?? " ";
  }

  // lib/font.ts
  var GRID_FONT = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

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

  // registry/text-mode/ascii-sparkline/core.ts
  var defaults = {
    values: [
      3.1,
      3.5,
      3.3,
      3.9,
      4.4,
      4.1,
      4.7,
      5.2,
      4.9,
      5.5,
      6.1,
      5.8,
      6.4,
      7,
      6.7,
      7.3,
      7.9,
      8.4,
      9.1,
      9.8,
      9.3,
      8.6,
      7.9,
      7.2
    ],
    mode: "blocks",
    width: 0,
    min: null,
    max: null,
    label: "trend",
    fontFamily: GRID_FONT
  };
  function resample(source, count) {
    const last = source.length - 1;
    const out = new Array(count);
    for (let i = 0; i < count; i++) {
      const t = count > 1 ? i * last / (count - 1) : 0;
      const lo = Math.floor(t);
      const hi = Math.min(lo + 1, last);
      const frac = t - lo;
      out[i] = (source[lo] ?? 0) * (1 - frac) + (source[hi] ?? 0) * frac;
    }
    return out;
  }
  function render(props, clean) {
    if (clean.length === 0) return "";
    const lo = props.min ?? Math.min(...clean);
    const hi = props.max ?? Math.max(...clean);
    const span = hi - lo;
    const scale = (v) => span > 0 ? Math.min(1, Math.max(0, (v - lo) / span)) : 0.5;
    if (props.mode === "braille") {
      const cells2 = props.width > 0 ? props.width : Math.ceil(clean.length / 2);
      const dots = resample(clean, cells2 * 2);
      let text2 = "";
      for (let c = 0; c < cells2; c++) {
        let bits = 0;
        for (let col = 0; col < 2; col++) {
          const t = scale(dots[c * 2 + col] ?? lo);
          const row = Math.min(3, Math.max(0, Math.round((1 - t) * 3)));
          bits |= brailleDot(row, col);
        }
        text2 += braille(bits);
      }
      return text2;
    }
    const cells = props.width > 0 ? props.width : clean.length;
    let text = "";
    for (const v of resample(clean, cells)) {
      const level = Math.min(7, Math.max(0, Math.round(scale(v) * 7)));
      text += lowerEighth(level + 1);
    }
    return text;
  }
  function short(n) {
    return String(Math.round(n * 10) / 10);
  }
  function describe(props, clean) {
    if (clean.length === 0) return `${props.label}: no data`;
    const lo = props.min ?? Math.min(...clean);
    const hi = props.max ?? Math.max(...clean);
    const last = clean[clean.length - 1] ?? 0;
    const unit = clean.length === 1 ? "value" : "values";
    return `${props.label}: ${clean.length} ${unit} from ${short(lo)} to ${short(hi)}, last ${short(last)}`;
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    const view = document.createElement("span");
    view.setAttribute("data-pica", "");
    view.setAttribute("aria-hidden", "true");
    view.style.whiteSpace = "nowrap";
    view.style.userSelect = "none";
    view.style.pointerEvents = "none";
    view.style.color = cssVar("fg");
    host.appendChild(view);
    function draw() {
      const clean = props.values.filter((v) => Number.isFinite(v));
      view.style.fontFamily = props.fontFamily;
      view.textContent = render(props, clean);
      labelHost(host, describe(props, clean));
      host.dataset.picaReady = "true";
    }
    draw();
    return {
      update(next) {
        props = { ...props, ...next };
        draw();
      },
      destroy() {
        view.remove();
        unlabelHost(host);
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
  var instance = PicaAsciiSparkline.mount(host, take(window.PICA_PROPS || {}));
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

- Technique from [Sparkline theory and practice](https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/) by Edward Tufte (Concept, no code).
