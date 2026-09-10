# Pixel Sort

> An image whose pixel rows or columns are sorted by brightness within threshold bands, smearing tone into streaks.

Category: effects. Tags: image, static, canvas, glitch. Static. Size: 2.5 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/pica/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://raw.githubusercontent.com/rishabbalak/pica/main/public/r/pixel-sort.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `src` | string | `""` | Image URL or data URI. Empty draws a built-in lit sphere, so the component renders with no network. |
| `alt` | string | `""` | Text alternative. Empty marks the image decorative and hides it from assistive technology. |
| `direction` | "horizontal" \| "vertical" | `"horizontal"` | The line the sort runs along: horizontal rows or vertical columns. |
| `low` | number | `0.25` | Lower brightness bound, 0 to 1. A pixel at or below it ends a run instead of joining it. |
| `high` | number | `0.8` | Upper brightness bound, 0 to 1. A pixel at or above it ends a run instead of joining it. |
| `color` | boolean | `false` | Keeps the source's own colors. Off renders one ink tone by luminance instead. |
| `fit` | "cover" \| "contain" | `"cover"` | "cover" fills the host and crops; "contain" fits the whole image. |
| `tone` | "auto" \| "light-on-dark" \| "dark-on-light" | `"auto"` | "auto" reads the host's colors. "light-on-dark" inks the bright pixels; "dark-on-light" inks the dark ones. Has no effect when color is true. |

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Pixel Sort · pixel-sort
// MIT + Commons Clause · https://github.com/rishabbalak/pica/blob/main/LICENSE.md
// Docs and credits: https://github.com/rishabbalak/pica

// lib/types.ts
/** The contract every Pica core implements. See docs/architecture/contract.md. */

/** A mounted component. */
interface PicaInstance<P> {
  /** Merge new prop values. The core decides what has to be rebuilt. */
  update(props: Partial<P>): void;
  /** Stop all work and remove everything the core added. Safe to call twice. */
  destroy(): void;
}

/** Mounts a core into a host element. Props are plain data: strings, numbers, booleans, null. */
type Mount<P> = (host: HTMLElement, props?: Partial<P>) => PicaInstance<P>;

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
/** Mounts a Pica core into the returned ref and forwards prop changes to it.
 *  Props are plain data by contract, so a JSON key is enough to detect a change. */
function usePica<P>(mount: Mount<P>, props: Partial<P>) {
  const ref = useRef<HTMLDivElement>(null);
  const instance = useRef<PicaInstance<P> | null>(null);
  const defined = definedProps(props);
  const latest = useRef(defined);
  latest.current = defined;
  const key = JSON.stringify(defined);

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

  return ref;
}

/** Drops undefined values, so an unset prop keeps the core's default. */
function definedProps<P>(props: Partial<P>): Partial<P> {
  const out: Partial<P> = {};
  for (const name in props) {
    const value = props[name];
    if (value !== undefined) out[name] = value;
  }
  return out;
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

// lib/color.ts
/** Reading colors from the page, so components inherit instead of impose. See STYLE.md, principle 4. */

let colorProbe: CanvasRenderingContext2D | null | undefined;

/** Any CSS color as [r, g, b, a], each 0 to 255. A color the browser cannot parse reads as transparent. */
function parseColor(color: string): [number, number, number, number] {
  if (colorProbe === undefined) {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    colorProbe = canvas.getContext("2d", { willReadFrequently: true });
  }
  if (!colorProbe) return [0, 0, 0, 0];
  colorProbe.clearRect(0, 0, 1, 1);
  colorProbe.fillStyle = "rgba(0, 0, 0, 0)";
  colorProbe.fillStyle = color;
  colorProbe.fillRect(0, 0, 1, 1);
  const d = colorProbe.getImageData(0, 0, 1, 1).data;
  return [d[0] ?? 0, d[1] ?? 0, d[2] ?? 0, d[3] ?? 0];
}

/** WCAG relative luminance of a CSS color: 0 for black, 1 for white. */
function relativeLuminance(color: string): number {
  const [r, g, b] = parseColor(color);
  const linear = (v: number): number => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** The color glyphs are drawn in: --pica-fg when set, otherwise the host's inherited color. */
function inkColor(host: HTMLElement): string {
  const style = getComputedStyle(host);
  return style.getPropertyValue("--pica-fg").trim() || style.color;
}

/** Whether the host shows light glyphs on a dark ground or the reverse, read from computed colors. */
function hostTone(host: HTMLElement): "light-on-dark" | "dark-on-light" {
  const fg = relativeLuminance(inkColor(host));
  let bg = 1; // A page with no background set anywhere renders white.
  for (let el: HTMLElement | null = host; el; el = el.parentElement) {
    const background = getComputedStyle(el).backgroundColor;
    if (parseColor(background)[3] > 0) {
      bg = relativeLuminance(background);
      break;
    }
  }
  return fg > bg ? "light-on-dark" : "dark-on-light";
}

// lib/subject.ts
/** The built-in subject image components draw when given no source: a sphere lit from one side, drawn
 *  locally so nothing is fetched. Animated components move the light by passing its position. */
function litSphere(size = 256, lightX = 0.36, lightY = 0.34): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const light = ctx.createRadialGradient(size * lightX, size * lightY, size * 0.02, size * 0.5, size * 0.5, size * 0.46);
    light.addColorStop(0, "#ffffff");
    light.addColorStop(0.55, "#8a8a8a");
    light.addColorStop(1, "#141414");
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

// registry/effects/pixel-sort/core.ts
export interface PixelSortProps {
  /** Image URL or data URI. Empty draws a built-in lit sphere, so the component renders with no network. */
  src: string;
  /** Text alternative. Empty marks the image decorative and hides it from assistive technology. */
  alt: string;
  /** The line the sort runs along: horizontal rows or vertical columns. */
  direction: "horizontal" | "vertical";
  /** Lower brightness bound, 0 to 1. A pixel at or below it ends a run instead of joining it. */
  low: number;
  /** Upper brightness bound, 0 to 1. A pixel at or above it ends a run instead of joining it. */
  high: number;
  /** Keeps the source's own colors. Off renders one ink tone by luminance instead. */
  color: boolean;
  /** "cover" fills the host and crops; "contain" fits the whole image. */
  fit: "cover" | "contain";
  /** "auto" reads the host's colors. "light-on-dark" inks the bright pixels; "dark-on-light" inks the dark ones. Has no effect when color is true. */
  tone: "auto" | "light-on-dark" | "dark-on-light";
}

export const defaults: PixelSortProps = {
  src: "",
  alt: "",
  direction: "horizontal",
  low: 0.25,
  high: 0.8,
  color: false,
  fit: "cover",
  tone: "auto",
};

/** Longest side, in pixels, the source is downscaled to before sorting, so the one-time sort stays fast. */
const WORK_MAX = 480;

/** Font the fallback note draws in, matching STYLE.md's grid stack. */
const NOTE_FONT = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

/** Perceptual brightness of one pixel, 0 to 1. */
function luma(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** Sorts pixels darkest to brightest within each run that clears `low` and stays under `high`, along rows
 *  (`vertical` false) or columns (`vertical` true). A pixel outside that band anchors the runs on either
 *  side of it and never moves itself. Mutates `data` in place. */
function sortPixels(data: Uint8ClampedArray, width: number, height: number, vertical: boolean, low: number, high: number): void {
  const count = width * height;
  const bright = new Float32Array(count);
  for (let p = 0; p < count; p++) {
    const o = p * 4;
    bright[p] = luma(data[o] ?? 0, data[o + 1] ?? 0, data[o + 2] ?? 0);
  }
  const lines = vertical ? width : height;
  const length = vertical ? height : width;
  const at = (line: number, pos: number): number => (vertical ? pos * width + line : line * width + pos);
  // Scratch space for one run, reused across every line so sorting never allocates in the hot path.
  const order = new Uint32Array(length);
  const rTmp = new Uint8ClampedArray(length);
  const gTmp = new Uint8ClampedArray(length);
  const bTmp = new Uint8ClampedArray(length);
  const aTmp = new Uint8ClampedArray(length);

  for (let line = 0; line < lines; line++) {
    let start = -1;
    for (let pos = 0; pos <= length; pos++) {
      const value = pos < length ? bright[at(line, pos)] ?? 0 : 0;
      const inRun = pos < length && value > low && value < high;
      if (inRun) {
        if (start === -1) start = pos;
        continue;
      }
      if (start !== -1) {
        const n = pos - start;
        if (n > 1) {
          for (let i = 0; i < n; i++) order[i] = start + i;
          const run = order.subarray(0, n);
          run.sort((a, b) => (bright[at(line, a)] ?? 0) - (bright[at(line, b)] ?? 0));
          for (let i = 0; i < n; i++) {
            const src = at(line, run[i] ?? 0) * 4;
            rTmp[i] = data[src] ?? 0;
            gTmp[i] = data[src + 1] ?? 0;
            bTmp[i] = data[src + 2] ?? 0;
            aTmp[i] = data[src + 3] ?? 0;
          }
          for (let i = 0; i < n; i++) {
            const dst = at(line, start + i) * 4;
            data[dst] = rTmp[i] ?? 0;
            data[dst + 1] = gTmp[i] ?? 0;
            data[dst + 2] = bTmp[i] ?? 0;
            data[dst + 3] = aTmp[i] ?? 0;
          }
        }
        start = -1;
      }
    }
  }
}

/** Recolors already-sorted pixels to one ink tone by luminance, in place. */
function inkTint(data: Uint8ClampedArray, lightOnDark: boolean, ink: readonly [number, number, number, number]): void {
  const [ir, ig, ib, ia] = ink;
  const inkAlpha = ia / 255;
  for (let p = 0; p < data.length; p += 4) {
    const value = luma(data[p] ?? 0, data[p + 1] ?? 0, data[p + 2] ?? 0);
    const srcAlpha = (data[p + 3] ?? 0) / 255;
    data[p] = ir;
    data[p + 1] = ig;
    data[p + 2] = ib;
    data[p + 3] = (lightOnDark ? value : 1 - value) * srcAlpha * inkAlpha * 255;
  }
}

export const mount: Mount<PixelSortProps> = (host, initial = {}) => {
  let props: PixelSortProps = { ...defaults, ...initial };
  let source: CanvasImageSource | null = null;
  let sourceW = 0;
  let sourceH = 0;
  let failed = false;
  let request = 0;
  let setAspect = false;
  // The source, downscaled and sorted once. Redrawn straight from here for a resize, a color, or a tone change.
  let sorted: ImageData | null = null;

  const work = document.createElement("canvas");
  const workCtx = work.getContext("2d", { willReadFrequently: true });
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none";
  canvas.setAttribute("aria-hidden", "true");
  const ctx = canvas.getContext("2d");
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  host.style.overflow = "hidden";
  host.appendChild(canvas);

  function load(): void {
    const mine = ++request;
    failed = false;
    if (!props.src) {
      use(litSphere(), 256, 256);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      if (mine === request) use(img, img.naturalWidth, img.naturalHeight);
    };
    img.onerror = () => {
      if (mine !== request) return;
      source = null;
      sorted = null;
      failed = true;
      draw();
    };
    img.src = props.src;
  }

  function use(next: CanvasImageSource, w: number, h: number): void {
    source = next;
    sourceW = w;
    sourceH = h;
    // A host with no height of its own takes the image's proportions.
    if (host.clientHeight < 2 && w > 0 && h > 0) {
      host.style.aspectRatio = `${w} / ${h}`;
      setAspect = true;
    }
    process();
  }

  /** Downscales the source and sorts it once. Only `draw` runs again for a resize or a color or tone change. */
  function process(): void {
    if (!workCtx || !source || sourceW <= 0 || sourceH <= 0) {
      sorted = null;
      draw();
      return;
    }
    const scale = Math.min(1, WORK_MAX / Math.max(sourceW, sourceH));
    const w = Math.max(1, Math.round(sourceW * scale));
    const h = Math.max(1, Math.round(sourceH * scale));
    work.width = w;
    work.height = h;
    workCtx.clearRect(0, 0, w, h);
    workCtx.drawImage(source, 0, 0, w, h);
    const image = workCtx.getImageData(0, 0, w, h);
    sortPixels(image.data, w, h, props.direction === "vertical", props.low, props.high);
    sorted = image;
    draw();
  }

  function draw(): void {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    const pw = Math.max(1, Math.round(w * dpr));
    const ph = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== pw) canvas.width = pw;
    if (canvas.height !== ph) canvas.height = ph;
    if (!ctx) {
      if (source || failed) host.dataset.picaReady = "true";
      return;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (failed) {
      const [r, g, b, a] = parseColor(inkColor(host));
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
      ctx.font = `14px ${NOTE_FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("image unavailable", w / 2, h / 2);
    } else if (sorted && workCtx) {
      if (props.color) {
        workCtx.putImageData(sorted, 0, 0);
      } else {
        const painted = new ImageData(new Uint8ClampedArray(sorted.data), sorted.width, sorted.height);
        const resolved = props.tone === "auto" ? hostTone(host) : props.tone;
        inkTint(painted.data, resolved === "light-on-dark", parseColor(inkColor(host)));
        workCtx.putImageData(painted, 0, 0);
      }
      const scale = props.fit === "cover"
        ? Math.max(w / sorted.width, h / sorted.height)
        : Math.min(w / sorted.width, h / sorted.height);
      const dw = sorted.width * scale;
      const dh = sorted.height * scale;
      ctx.drawImage(work, (w - dw) / 2, (h - dh) / 2, dw, dh);
    }
    if (source || failed) host.dataset.picaReady = "true";
  }

  const resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(() => draw()) : null;
  resizeObserver?.observe(host);

  labelHost(host, props.alt);
  load();

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      labelHost(host, props.alt);
      if (props.src !== before.src) {
        load();
      } else if (props.direction !== before.direction || props.low !== before.low || props.high !== before.high) {
        process();
      } else {
        draw();
      }
    },
    destroy() {
      request++;
      resizeObserver?.disconnect();
      canvas.remove();
      unlabelHost(host);
      if (setAspect) host.style.removeProperty("aspect-ratio");
      delete host.dataset.picaReady;
    },
  };
};

// registry/effects/pixel-sort/index.tsx
export interface PixelSortComponentProps extends Partial<PixelSortProps> {
  className?: string;
  style?: CSSProperties;
}

/** An image with its rows or columns sorted by brightness into smeared bands. */
export function PixelSort({ className, style, ...props }: PixelSortComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Pixel Sort · pixel-sort
  MIT + Commons Clause · https://github.com/rishabbalak/pica/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/pica
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Pixel Sort · Pica</title>
<style>html, body { margin: 0; height: 100%; background: #0a0a0a; color: #f1f1ef; }
@media (prefers-color-scheme: light) { html:not([data-ground]), html:not([data-ground]) body { background: #f1f1ef; color: #0a0a0a; } }
html[data-ground="paper"], html[data-ground="paper"] body { background: #f1f1ef; color: #0a0a0a; }
html[data-ground="checker"] body { background: repeating-conic-gradient(#161616 0% 25%, #0a0a0a 0% 50%) 50% / 24px 24px; }
#pica { width: 100%; height: 100%; }</style>
</head>
<body>
<div id="pica"></div>
<script>
"use strict";
var PicaPixelSort = (() => {
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

  // registry/effects/pixel-sort/core.ts
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

  // lib/color.ts
  var colorProbe;
  function parseColor(color) {
    if (colorProbe === void 0) {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      colorProbe = canvas.getContext("2d", { willReadFrequently: true });
    }
    if (!colorProbe) return [0, 0, 0, 0];
    colorProbe.clearRect(0, 0, 1, 1);
    colorProbe.fillStyle = "rgba(0, 0, 0, 0)";
    colorProbe.fillStyle = color;
    colorProbe.fillRect(0, 0, 1, 1);
    const d = colorProbe.getImageData(0, 0, 1, 1).data;
    return [d[0] ?? 0, d[1] ?? 0, d[2] ?? 0, d[3] ?? 0];
  }
  function relativeLuminance(color) {
    const [r, g, b] = parseColor(color);
    const linear = (v) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  }
  function inkColor(host) {
    const style = getComputedStyle(host);
    return style.getPropertyValue("--pica-fg").trim() || style.color;
  }
  function hostTone(host) {
    const fg = relativeLuminance(inkColor(host));
    let bg = 1;
    for (let el = host; el; el = el.parentElement) {
      const background = getComputedStyle(el).backgroundColor;
      if (parseColor(background)[3] > 0) {
        bg = relativeLuminance(background);
        break;
      }
    }
    return fg > bg ? "light-on-dark" : "dark-on-light";
  }

  // lib/subject.ts
  function litSphere(size = 256, lightX = 0.36, lightY = 0.34) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const light = ctx.createRadialGradient(size * lightX, size * lightY, size * 0.02, size * 0.5, size * 0.5, size * 0.46);
      light.addColorStop(0, "#ffffff");
      light.addColorStop(0.55, "#8a8a8a");
      light.addColorStop(1, "#141414");
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2);
      ctx.fill();
    }
    return canvas;
  }

  // registry/effects/pixel-sort/core.ts
  var defaults = {
    src: "",
    alt: "",
    direction: "horizontal",
    low: 0.25,
    high: 0.8,
    color: false,
    fit: "cover",
    tone: "auto"
  };
  var WORK_MAX = 480;
  var NOTE_FONT = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';
  function luma(r, g, b) {
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }
  function sortPixels(data, width, height, vertical, low, high) {
    const count = width * height;
    const bright = new Float32Array(count);
    for (let p = 0; p < count; p++) {
      const o = p * 4;
      bright[p] = luma(data[o] ?? 0, data[o + 1] ?? 0, data[o + 2] ?? 0);
    }
    const lines = vertical ? width : height;
    const length = vertical ? height : width;
    const at = (line, pos) => vertical ? pos * width + line : line * width + pos;
    const order = new Uint32Array(length);
    const rTmp = new Uint8ClampedArray(length);
    const gTmp = new Uint8ClampedArray(length);
    const bTmp = new Uint8ClampedArray(length);
    const aTmp = new Uint8ClampedArray(length);
    for (let line = 0; line < lines; line++) {
      let start = -1;
      for (let pos = 0; pos <= length; pos++) {
        const value = pos < length ? bright[at(line, pos)] ?? 0 : 0;
        const inRun = pos < length && value > low && value < high;
        if (inRun) {
          if (start === -1) start = pos;
          continue;
        }
        if (start !== -1) {
          const n = pos - start;
          if (n > 1) {
            for (let i = 0; i < n; i++) order[i] = start + i;
            const run = order.subarray(0, n);
            run.sort((a, b) => (bright[at(line, a)] ?? 0) - (bright[at(line, b)] ?? 0));
            for (let i = 0; i < n; i++) {
              const src = at(line, run[i] ?? 0) * 4;
              rTmp[i] = data[src] ?? 0;
              gTmp[i] = data[src + 1] ?? 0;
              bTmp[i] = data[src + 2] ?? 0;
              aTmp[i] = data[src + 3] ?? 0;
            }
            for (let i = 0; i < n; i++) {
              const dst = at(line, start + i) * 4;
              data[dst] = rTmp[i] ?? 0;
              data[dst + 1] = gTmp[i] ?? 0;
              data[dst + 2] = bTmp[i] ?? 0;
              data[dst + 3] = aTmp[i] ?? 0;
            }
          }
          start = -1;
        }
      }
    }
  }
  function inkTint(data, lightOnDark, ink) {
    const [ir, ig, ib, ia] = ink;
    const inkAlpha = ia / 255;
    for (let p = 0; p < data.length; p += 4) {
      const value = luma(data[p] ?? 0, data[p + 1] ?? 0, data[p + 2] ?? 0);
      const srcAlpha = (data[p + 3] ?? 0) / 255;
      data[p] = ir;
      data[p + 1] = ig;
      data[p + 2] = ib;
      data[p + 3] = (lightOnDark ? value : 1 - value) * srcAlpha * inkAlpha * 255;
    }
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    let source = null;
    let sourceW = 0;
    let sourceH = 0;
    let failed = false;
    let request = 0;
    let setAspect = false;
    let sorted = null;
    const work = document.createElement("canvas");
    const workCtx = work.getContext("2d", { willReadFrequently: true });
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none";
    canvas.setAttribute("aria-hidden", "true");
    const ctx = canvas.getContext("2d");
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    host.style.overflow = "hidden";
    host.appendChild(canvas);
    function load() {
      const mine = ++request;
      failed = false;
      if (!props.src) {
        use(litSphere(), 256, 256);
        return;
      }
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = () => {
        if (mine === request) use(img, img.naturalWidth, img.naturalHeight);
      };
      img.onerror = () => {
        if (mine !== request) return;
        source = null;
        sorted = null;
        failed = true;
        draw();
      };
      img.src = props.src;
    }
    function use(next, w, h) {
      source = next;
      sourceW = w;
      sourceH = h;
      if (host.clientHeight < 2 && w > 0 && h > 0) {
        host.style.aspectRatio = `${w} / ${h}`;
        setAspect = true;
      }
      process();
    }
    function process() {
      if (!workCtx || !source || sourceW <= 0 || sourceH <= 0) {
        sorted = null;
        draw();
        return;
      }
      const scale = Math.min(1, WORK_MAX / Math.max(sourceW, sourceH));
      const w = Math.max(1, Math.round(sourceW * scale));
      const h = Math.max(1, Math.round(sourceH * scale));
      work.width = w;
      work.height = h;
      workCtx.clearRect(0, 0, w, h);
      workCtx.drawImage(source, 0, 0, w, h);
      const image = workCtx.getImageData(0, 0, w, h);
      sortPixels(image.data, w, h, props.direction === "vertical", props.low, props.high);
      sorted = image;
      draw();
    }
    function draw() {
      const w = Math.max(1, host.clientWidth);
      const h = Math.max(1, host.clientHeight);
      const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
      const pw = Math.max(1, Math.round(w * dpr));
      const ph = Math.max(1, Math.round(h * dpr));
      if (canvas.width !== pw) canvas.width = pw;
      if (canvas.height !== ph) canvas.height = ph;
      if (!ctx) {
        if (source || failed) host.dataset.picaReady = "true";
        return;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (failed) {
        const [r, g, b, a] = parseColor(inkColor(host));
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
        ctx.font = `14px ${NOTE_FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("image unavailable", w / 2, h / 2);
      } else if (sorted && workCtx) {
        if (props.color) {
          workCtx.putImageData(sorted, 0, 0);
        } else {
          const painted = new ImageData(new Uint8ClampedArray(sorted.data), sorted.width, sorted.height);
          const resolved = props.tone === "auto" ? hostTone(host) : props.tone;
          inkTint(painted.data, resolved === "light-on-dark", parseColor(inkColor(host)));
          workCtx.putImageData(painted, 0, 0);
        }
        const scale = props.fit === "cover" ? Math.max(w / sorted.width, h / sorted.height) : Math.min(w / sorted.width, h / sorted.height);
        const dw = sorted.width * scale;
        const dh = sorted.height * scale;
        ctx.drawImage(work, (w - dw) / 2, (h - dh) / 2, dw, dh);
      }
      if (source || failed) host.dataset.picaReady = "true";
    }
    const resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(() => draw()) : null;
    resizeObserver?.observe(host);
    labelHost(host, props.alt);
    load();
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        labelHost(host, props.alt);
        if (props.src !== before.src) {
          load();
        } else if (props.direction !== before.direction || props.low !== before.low || props.high !== before.high) {
          process();
        } else {
          draw();
        }
      },
      destroy() {
        request++;
        resizeObserver?.disconnect();
        canvas.remove();
        unlabelHost(host);
        if (setAspect) host.style.removeProperty("aspect-ratio");
        delete host.dataset.picaReady;
      }
    };
  };
  return __toCommonJS(core_exports);
})();

(function () {
  var instance = PicaPixelSort.mount(document.getElementById("pica"), window.PICA_PROPS || {});
  window.addEventListener("message", function (event) {
    if (event.source !== window.parent || !event.data) return;
    if (event.data.type === "pica:props") instance.update(event.data.props);
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

- Technique from [ASDF pixel sorting](https://github.com/kimasendorf/ASDFPixelSort) by Kim Asendorf (Technique, no code read).
