# ASCII Loader

> A text-mode loading indicator: a braille dot orbit, a progress bar, a shade pulse, or animated dots.

Category: text-mode. Tags: loader, spinner, progress, inline. Animated. Holds a still frame under prefers-reduced-motion, and stops offscreen and in hidden tabs. Size: 1.9 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/pica/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://raw.githubusercontent.com/rishabbalak/pica/main/public/r/ascii-loader.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | "braille" \| "bar" \| "blocks" \| "dots" | `"braille"` | Which indicator to draw: a braille dot orbit, a progress bar, a shade pulse, or animated dots. |
| `progress` | number \| null | `null` | Progress from 0 to 1, clamped. Null animates indeterminately; the bar variant fills to this value instead. |
| `width` | number | `24` | Width of the bar variant, in character cells. The other variants ignore it. |
| `label` | string | `"loading"` | Accessible label, read as the progress bar or status announcement. Empty hides the host from assistive technology. |
| `speed` | number | `1` | Multiplies how fast the indeterminate animation plays. |
| `fontFamily` | string | `"\"JetBrains Mono\", \"IBM Plex Mono\", ui-monospace, \"SFMono-Regular\", Menlo, monospace"` | CSS font-family stack for the glyphs. Must be monospace; size and color are inherited from the host. |
| `fps` | number | `12` | Frames drawn per second, at speed 1. |
| `paused` | boolean | `false` | Stop animating and hold the current frame. |
| `time` | number \| null | `null` | Render exactly this animation time, in milliseconds, and do not animate. Null animates. |
| `seed` | number | `1` | Seed for every random choice, so the same seed always draws the same frame. |

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · ASCII Loader · ascii-loader
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

// lib/loop.ts
/** The only place Pica schedules frames. Cores never call requestAnimationFrame themselves.
 *  A loop animates only while its element is on screen, the tab is visible, motion is allowed,
 *  it is not paused, and no fixed time is set. Otherwise it shows a single held frame. */

interface LoopState {
  /** Hold the current frame. */
  paused: boolean;
  /** Show exactly this animation time, in milliseconds, and do not animate. Null animates. */
  time: number | null;
  /** Frames per second ceiling. */
  fps: number;
}

interface LoopOptions extends LoopState {
  /** Element whose visibility on screen gates the loop. */
  el: Element;
  /** Draws the frame for animation time `t`, in milliseconds. */
  frame: (t: number) => void;
  /** The frame shown under prefers-reduced-motion, in milliseconds of animation time. */
  still: number;
}

interface Loop {
  update(state: Partial<LoopState>): void;
  /** Draws the current frame again, for example after a resize. */
  redraw(): void;
  destroy(): void;
}

/** A gap longer than this, such as a tab switch, advances the animation by this much at most. */
const MAX_STEP_MS = 100;

function createLoop(options: LoopOptions): Loop {
  const { el, frame, still } = options;
  let state: LoopState = { paused: options.paused, time: options.time, fps: options.fps };
  let t = 0;
  let last = 0;
  let raf = 0;
  let onScreen = true;
  let tabVisible = typeof document === "undefined" || document.visibilityState !== "hidden";
  const motionQuery = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  let reduced = motionQuery?.matches ?? false;

  const animating = (): boolean =>
    !state.paused && state.time === null && !reduced && onScreen && tabVisible;
  const heldTime = (): number => (state.time !== null ? state.time : reduced ? still : t);

  function tick(now: number): void {
    raf = 0;
    if (!animating()) return;
    if (last === 0) last = now;
    const elapsed = now - last;
    // One millisecond of tolerance so a 60 Hz display lands evenly on a 30 fps ceiling.
    if (elapsed >= 1000 / Math.max(1, state.fps) - 1) {
      t += Math.min(elapsed, MAX_STEP_MS);
      last = now;
      frame(t);
    }
    raf = requestAnimationFrame(tick);
  }

  function sync(drawHeld: boolean): void {
    const go = animating();
    if (go && raf === 0) {
      last = 0;
      raf = requestAnimationFrame(tick);
    } else if (!go && raf !== 0) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    if (!go && drawHeld) frame(heldTime());
  }

  const observer = typeof IntersectionObserver === "function"
    ? new IntersectionObserver((entries) => {
        const entry = entries[entries.length - 1];
        onScreen = entry ? entry.isIntersecting : true;
        sync(false);
      })
    : null;
  observer?.observe(el);

  const onVisibility = (): void => {
    tabVisible = document.visibilityState !== "hidden";
    sync(false);
  };
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisibility);

  const onMotion = (): void => {
    reduced = motionQuery?.matches ?? false;
    sync(true);
  };
  motionQuery?.addEventListener("change", onMotion);

  frame(heldTime());
  sync(false);

  return {
    update(next) {
      const timeChanged = next.time !== undefined && next.time !== state.time;
      state = { ...state, ...next };
      if (state.time !== null) t = state.time;
      sync(timeChanged || next.paused !== undefined);
    },
    redraw() {
      frame(heldTime());
    },
    destroy() {
      if (raf !== 0) cancelAnimationFrame(raf);
      raf = 0;
      observer?.disconnect();
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisibility);
      motionQuery?.removeEventListener("change", onMotion);
    },
  };
}

// registry/text-mode/ascii-loader/core.ts
export interface AsciiLoaderProps extends MotionProps {
  /** Which indicator to draw: a braille dot orbit, a progress bar, a shade pulse, or animated dots. */
  variant: "braille" | "bar" | "blocks" | "dots";
  /** Progress from 0 to 1, clamped. Null animates indeterminately; the bar variant fills to this value instead. */
  progress: number | null;
  /** Width of the bar variant, in character cells. The other variants ignore it. */
  width: number;
  /** Accessible label, read as the progress bar or status announcement. Empty hides the host from assistive technology. */
  label: string;
  /** Multiplies how fast the indeterminate animation plays. */
  speed: number;
  /** CSS font-family stack for the glyphs. Must be monospace; size and color are inherited from the host. */
  fontFamily: string;
  /** Frames drawn per second, at speed 1. */
  fps: number;
}

export const defaults: AsciiLoaderProps = {
  variant: "braille",
  progress: null,
  width: 24,
  label: "loading",
  speed: 1,
  fontFamily: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace',
  fps: 12,
  paused: false,
  time: null,
  seed: 1,
};

/** First codepoint of the Unicode braille patterns block. A cell's glyph is this plus a dot bitmask. */
const BRAILLE_BASE = 0x2800;
/** Row and column, in the cell's 2 by 4 dot grid, that the lit dot visits, in order: clockwise from the top left. */
const BRAILLE_PATH: ReadonlyArray<readonly [row: number, col: number]> = [
  [0, 0],
  [0, 1],
  [1, 1],
  [2, 1],
  [3, 1],
  [3, 0],
  [2, 0],
  [1, 0],
];
/** Milliseconds the lit dot spends at each position, at speed 1. Chosen so a real three second check
 *  in scripts/verify.ts lands on the position opposite the start, the largest visible change available
 *  to a single dot. */
const BRAILLE_STEP_MS = 150;

/** The Unicode braille dot number, expressed as a bit index from 0 to 7, for one cell position. */
function brailleBit(row: number, col: number): number {
  if (col === 0) return row < 3 ? row : 6;
  return row < 3 ? row + 3 : 7;
}

function brailleFrame(t: number, speed: number): string {
  const step = Math.floor((t * speed) / BRAILLE_STEP_MS);
  const at = BRAILLE_PATH[((step % BRAILLE_PATH.length) + BRAILLE_PATH.length) % BRAILLE_PATH.length];
  const [row, col] = at ?? [0, 0];
  return String.fromCodePoint(BRAILLE_BASE + (1 << brailleBit(row, col)));
}

/** Light, medium, dark, and full shade, breathing in and back out so the loop has no seam. */
const SHADES = ["░", "▒", "▓", "█"];
const SHADE_PATH = [0, 1, 2, 3, 2, 1];
const SHADE_STEP_MS = 150;

function blocksFrame(t: number, speed: number): string {
  const step = Math.floor((t * speed) / SHADE_STEP_MS);
  const at = ((step % SHADE_PATH.length) + SHADE_PATH.length) % SHADE_PATH.length;
  const idx = SHADE_PATH[at] ?? 0;
  return SHADES[idx] ?? "";
}

const DOTS_STEP_MS = 400;

function dotsFrame(t: number, speed: number): string {
  const step = Math.floor((t * speed) / DOTS_STEP_MS);
  const at = ((step % 3) + 3) % 3;
  return ".".repeat(at + 1);
}

const FULL_BLOCK = "█";
const TRACK = "░";

/** A block filling n eighths of a cell from the left, n from 1 to 8, using the Unicode block elements. */
function eighthBlock(n: number): string {
  if (n <= 0) return TRACK;
  if (n >= 8) return FULL_BLOCK;
  return String.fromCodePoint(0x2588 + (8 - n));
}

/** A filled bar reading `progress`, in eighths of a cell. Depends only on data, so it holds still under
 *  reduced motion without special handling. */
function barDeterminate(progress: number, width: number): string {
  const clamped = Math.min(1, Math.max(0, progress));
  const totalEighths = width * 8;
  const filled = Math.round(clamped * totalEighths);
  const fullCells = Math.floor(filled / 8);
  const remainder = filled - fullCells * 8;
  let out = "";
  for (let i = 0; i < width; i++) {
    if (i < fullCells) out += FULL_BLOCK;
    else if (i === fullCells && remainder > 0) out += eighthBlock(remainder);
    else out += TRACK;
  }
  return out;
}

/** A short block sweeping back and forth across the track, for when no progress value is known. */
function barIndeterminate(t: number, speed: number, width: number): string {
  const segment = Math.min(6, Math.max(2, Math.round(width / 4)));
  const travel = Math.max(1, width - segment);
  const cellMs = 70;
  const period = travel * 2 * cellMs;
  const phase = ((t * speed) % period) / period;
  const triangle = phase < 0.5 ? phase * 2 : 2 - phase * 2;
  const pos = Math.round(triangle * travel);
  let out = "";
  for (let i = 0; i < width; i++) out += i >= pos && i < pos + segment ? FULL_BLOCK : TRACK;
  return out;
}

function frameText(p: AsciiLoaderProps, t: number): string {
  if (p.variant === "bar") return p.progress === null ? barIndeterminate(t, p.speed, p.width) : barDeterminate(p.progress, p.width);
  if (p.variant === "blocks") return blocksFrame(t, p.speed);
  if (p.variant === "dots") return dotsFrame(t, p.speed);
  return brailleFrame(t, p.speed);
}

export const mount: Mount<AsciiLoaderProps> = (host, initial = {}) => {
  let props: AsciiLoaderProps = { ...defaults, ...initial };
  const glyphs = document.createElement("span");
  glyphs.setAttribute("aria-hidden", "true");
  glyphs.style.cssText = "white-space:nowrap;";
  host.appendChild(glyphs);

  function applyA11y(): void {
    labelHost(host, props.label, props.progress === null ? "status" : "progressbar");
    if (props.progress === null) {
      host.removeAttribute("aria-valuemin");
      host.removeAttribute("aria-valuemax");
      host.removeAttribute("aria-valuenow");
    } else {
      host.setAttribute("aria-valuemin", "0");
      host.setAttribute("aria-valuemax", "100");
      host.setAttribute("aria-valuenow", String(Math.round(Math.min(1, Math.max(0, props.progress)) * 100)));
    }
  }

  function draw(t: number): void {
    glyphs.style.fontFamily = props.fontFamily;
    glyphs.textContent = frameText(props, t);
    host.dataset.picaReady = "true";
  }

  const loop = createLoop({
    el: host,
    fps: props.fps,
    paused: props.paused,
    time: props.time,
    still: 0,
    frame: draw,
  });

  applyA11y();

  return {
    update(next) {
      props = { ...props, ...next };
      applyA11y();
      loop.update({ paused: props.paused, time: props.time, fps: props.fps });
      loop.redraw();
    },
    destroy() {
      loop.destroy();
      unlabelHost(host);
      host.removeAttribute("aria-valuemin");
      host.removeAttribute("aria-valuemax");
      host.removeAttribute("aria-valuenow");
      glyphs.remove();
      delete host.dataset.picaReady;
    },
  };
};

// registry/text-mode/ascii-loader/index.tsx
export interface AsciiLoaderComponentProps extends Partial<AsciiLoaderProps> {
  className?: string;
  style?: CSSProperties;
}

/** A text-mode loading indicator: a braille dot orbit, a progress bar, a shade pulse, or animated dots. */
export function AsciiLoader({ className, style, ...props }: AsciiLoaderComponentProps) {
  const ref = usePica(mount, props);
  return <span ref={ref} className={className} style={{ display: "inline-block", ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · ASCII Loader · ascii-loader
  MIT + Commons Clause · https://github.com/rishabbalak/pica/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/pica
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>ASCII Loader · Pica</title>
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
var PicaAsciiLoader = (() => {
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

  // registry/text-mode/ascii-loader/core.ts
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

  // lib/loop.ts
  var MAX_STEP_MS = 100;
  function createLoop(options) {
    const { el, frame, still } = options;
    let state = { paused: options.paused, time: options.time, fps: options.fps };
    let t = 0;
    let last = 0;
    let raf = 0;
    let onScreen = true;
    let tabVisible = typeof document === "undefined" || document.visibilityState !== "hidden";
    const motionQuery = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
    let reduced = motionQuery?.matches ?? false;
    const animating = () => !state.paused && state.time === null && !reduced && onScreen && tabVisible;
    const heldTime = () => state.time !== null ? state.time : reduced ? still : t;
    function tick(now) {
      raf = 0;
      if (!animating()) return;
      if (last === 0) last = now;
      const elapsed = now - last;
      if (elapsed >= 1e3 / Math.max(1, state.fps) - 1) {
        t += Math.min(elapsed, MAX_STEP_MS);
        last = now;
        frame(t);
      }
      raf = requestAnimationFrame(tick);
    }
    function sync(drawHeld) {
      const go = animating();
      if (go && raf === 0) {
        last = 0;
        raf = requestAnimationFrame(tick);
      } else if (!go && raf !== 0) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      if (!go && drawHeld) frame(heldTime());
    }
    const observer = typeof IntersectionObserver === "function" ? new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      onScreen = entry ? entry.isIntersecting : true;
      sync(false);
    }) : null;
    observer?.observe(el);
    const onVisibility = () => {
      tabVisible = document.visibilityState !== "hidden";
      sync(false);
    };
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisibility);
    const onMotion = () => {
      reduced = motionQuery?.matches ?? false;
      sync(true);
    };
    motionQuery?.addEventListener("change", onMotion);
    frame(heldTime());
    sync(false);
    return {
      update(next) {
        const timeChanged = next.time !== void 0 && next.time !== state.time;
        state = { ...state, ...next };
        if (state.time !== null) t = state.time;
        sync(timeChanged || next.paused !== void 0);
      },
      redraw() {
        frame(heldTime());
      },
      destroy() {
        if (raf !== 0) cancelAnimationFrame(raf);
        raf = 0;
        observer?.disconnect();
        if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisibility);
        motionQuery?.removeEventListener("change", onMotion);
      }
    };
  }

  // registry/text-mode/ascii-loader/core.ts
  var defaults = {
    variant: "braille",
    progress: null,
    width: 24,
    label: "loading",
    speed: 1,
    fontFamily: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace',
    fps: 12,
    paused: false,
    time: null,
    seed: 1
  };
  var BRAILLE_BASE = 10240;
  var BRAILLE_PATH = [
    [0, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 1],
    [3, 0],
    [2, 0],
    [1, 0]
  ];
  var BRAILLE_STEP_MS = 150;
  function brailleBit(row, col) {
    if (col === 0) return row < 3 ? row : 6;
    return row < 3 ? row + 3 : 7;
  }
  function brailleFrame(t, speed) {
    const step = Math.floor(t * speed / BRAILLE_STEP_MS);
    const at = BRAILLE_PATH[(step % BRAILLE_PATH.length + BRAILLE_PATH.length) % BRAILLE_PATH.length];
    const [row, col] = at ?? [0, 0];
    return String.fromCodePoint(BRAILLE_BASE + (1 << brailleBit(row, col)));
  }
  var SHADES = ["░", "▒", "▓", "█"];
  var SHADE_PATH = [0, 1, 2, 3, 2, 1];
  var SHADE_STEP_MS = 150;
  function blocksFrame(t, speed) {
    const step = Math.floor(t * speed / SHADE_STEP_MS);
    const at = (step % SHADE_PATH.length + SHADE_PATH.length) % SHADE_PATH.length;
    const idx = SHADE_PATH[at] ?? 0;
    return SHADES[idx] ?? "";
  }
  var DOTS_STEP_MS = 400;
  function dotsFrame(t, speed) {
    const step = Math.floor(t * speed / DOTS_STEP_MS);
    const at = (step % 3 + 3) % 3;
    return ".".repeat(at + 1);
  }
  var FULL_BLOCK = "█";
  var TRACK = "░";
  function eighthBlock(n) {
    if (n <= 0) return TRACK;
    if (n >= 8) return FULL_BLOCK;
    return String.fromCodePoint(9608 + (8 - n));
  }
  function barDeterminate(progress, width) {
    const clamped = Math.min(1, Math.max(0, progress));
    const totalEighths = width * 8;
    const filled = Math.round(clamped * totalEighths);
    const fullCells = Math.floor(filled / 8);
    const remainder = filled - fullCells * 8;
    let out = "";
    for (let i = 0; i < width; i++) {
      if (i < fullCells) out += FULL_BLOCK;
      else if (i === fullCells && remainder > 0) out += eighthBlock(remainder);
      else out += TRACK;
    }
    return out;
  }
  function barIndeterminate(t, speed, width) {
    const segment = Math.min(6, Math.max(2, Math.round(width / 4)));
    const travel = Math.max(1, width - segment);
    const cellMs = 70;
    const period = travel * 2 * cellMs;
    const phase = t * speed % period / period;
    const triangle = phase < 0.5 ? phase * 2 : 2 - phase * 2;
    const pos = Math.round(triangle * travel);
    let out = "";
    for (let i = 0; i < width; i++) out += i >= pos && i < pos + segment ? FULL_BLOCK : TRACK;
    return out;
  }
  function frameText(p, t) {
    if (p.variant === "bar") return p.progress === null ? barIndeterminate(t, p.speed, p.width) : barDeterminate(p.progress, p.width);
    if (p.variant === "blocks") return blocksFrame(t, p.speed);
    if (p.variant === "dots") return dotsFrame(t, p.speed);
    return brailleFrame(t, p.speed);
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    const glyphs = document.createElement("span");
    glyphs.setAttribute("aria-hidden", "true");
    glyphs.style.cssText = "white-space:nowrap;";
    host.appendChild(glyphs);
    function applyA11y() {
      labelHost(host, props.label, props.progress === null ? "status" : "progressbar");
      if (props.progress === null) {
        host.removeAttribute("aria-valuemin");
        host.removeAttribute("aria-valuemax");
        host.removeAttribute("aria-valuenow");
      } else {
        host.setAttribute("aria-valuemin", "0");
        host.setAttribute("aria-valuemax", "100");
        host.setAttribute("aria-valuenow", String(Math.round(Math.min(1, Math.max(0, props.progress)) * 100)));
      }
    }
    function draw(t) {
      glyphs.style.fontFamily = props.fontFamily;
      glyphs.textContent = frameText(props, t);
      host.dataset.picaReady = "true";
    }
    const loop = createLoop({
      el: host,
      fps: props.fps,
      paused: props.paused,
      time: props.time,
      still: 0,
      frame: draw
    });
    applyA11y();
    return {
      update(next) {
        props = { ...props, ...next };
        applyA11y();
        loop.update({ paused: props.paused, time: props.time, fps: props.fps });
        loop.redraw();
      },
      destroy() {
        loop.destroy();
        unlabelHost(host);
        host.removeAttribute("aria-valuemin");
        host.removeAttribute("aria-valuemax");
        host.removeAttribute("aria-valuenow");
        glyphs.remove();
        delete host.dataset.picaReady;
      }
    };
  };
  return __toCommonJS(core_exports);
})();

(function () {
  var instance = PicaAsciiLoader.mount(document.getElementById("pica"), window.PICA_PROPS || {});
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

Original to Pica.
