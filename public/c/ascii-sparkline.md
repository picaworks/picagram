# ASCII Sparkline

> A series of numbers drawn inline as eighth-block bars or a braille line, scaled to its own range.

Category: text-mode. Tags: sparkline, chart, braille, inline. Static. Size: 1.3 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/pica/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://raw.githubusercontent.com/rishabbalak/pica/main/public/r/ascii-sparkline.json
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

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · ASCII Sparkline · ascii-sparkline
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
  fontFamily: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace',
};

/** The eighth-block glyphs, emptiest to fullest. Unicode fixes their height, so nothing here is measured. */
const BLOCKS = "▁▂▃▄▅▆▇█";

/** The dot weight for one braille cell, at dot row 0 to 3 (top to bottom) and column 0 (left) or 1 (right).
 *  See the Unicode braille pattern block: the bottom row's dots break the clean bit order the top three keep. */
function brailleDot(row: number, col: number): number {
  if (row === 3) return col === 0 ? 0x40 : 0x80;
  return (col === 0 ? 1 : 8) << row;
}

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
      text += String.fromCodePoint(0x2800 + bits);
    }
    return text;
  }

  const cells = props.width > 0 ? props.width : clean.length;
  let text = "";
  for (const v of resample(clean, cells)) {
    const level = Math.min(7, Math.max(0, Math.round(scale(v) * 7)));
    text += BLOCKS.charAt(level);
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
  view.setAttribute("aria-hidden", "true");
  view.style.whiteSpace = "nowrap";
  view.style.userSelect = "none";
  view.style.pointerEvents = "none";
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
export interface AsciiSparklineComponentProps extends Partial<AsciiSparklineProps> {
  className?: string;
  style?: CSSProperties;
}

/** A series of numbers drawn inline as a sparkline, in eighth-block bars or a braille line. */
export function AsciiSparkline({ className, style, ...props }: AsciiSparklineComponentProps) {
  const ref = usePica(mount, props);
  return <span ref={ref} className={className} style={{ display: "inline-block", ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · ASCII Sparkline · ascii-sparkline
  MIT + Commons Clause · https://github.com/rishabbalak/pica/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/pica
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>ASCII Sparkline · Pica</title>
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
    fontFamily: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace'
  };
  var BLOCKS = "▁▂▃▄▅▆▇█";
  function brailleDot(row, col) {
    if (row === 3) return col === 0 ? 64 : 128;
    return (col === 0 ? 1 : 8) << row;
  }
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
        text2 += String.fromCodePoint(10240 + bits);
      }
      return text2;
    }
    const cells = props.width > 0 ? props.width : clean.length;
    let text = "";
    for (const v of resample(clean, cells)) {
      const level = Math.min(7, Math.max(0, Math.round(scale(v) * 7)));
      text += BLOCKS.charAt(level);
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
    view.setAttribute("aria-hidden", "true");
    view.style.whiteSpace = "nowrap";
    view.style.userSelect = "none";
    view.style.pointerEvents = "none";
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
  var instance = PicaAsciiSparkline.mount(document.getElementById("pica"), window.PICA_PROPS || {});
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

- Technique from [Sparkline theory and practice](https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/) by Edward Tufte (Concept, no code).
