# Grain Overlay

> An SVG turbulence tile rendered once as a data URI and laid over content as film grain that jitters a few pixels several times a second.

Category: effects. Tags: overlay, grain, texture, blend mode. Animated. Holds a still frame under prefers-reduced-motion, and stops offscreen and in hidden tabs. Size: 2.1 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/pica/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://raw.githubusercontent.com/rishabbalak/pica/main/public/r/grain-overlay.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `frequency` | number | `0.8` | Spatial frequency of the turbulence noise. Lower values draw coarser flecks, higher values draw finer grain. |
| `opacity` | number | `0.12` | How strongly the grain shows over the content beneath it. |
| `size` | number | `160` | Width and height of the noise tile, in pixels, before it repeats. |
| `blend` | "overlay" \| "soft-light" \| "normal" | `"overlay"` | CSS blend mode the grain composites with the content beneath it. |
| `jitter` | boolean | `true` | Shifts the tile a few pixels several times a second, so the grain lives instead of sitting fixed. |
| `fps` | number | `10` | Frames per second the jitter steps at. |
| `paused` | boolean | `false` | Stop animating and hold the current frame. |
| `time` | number \| null | `null` | Render exactly this animation time, in milliseconds, and do not animate. Null animates. |
| `seed` | number | `1` | Seed for every random choice, so the same seed always draws the same frame. |

## React

```tsx
"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

// Pica · Grain Overlay · grain-overlay
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

// lib/rng.ts
/** Seeded pseudo-random numbers in [0, 1), mulberry32. The same seed gives the same sequence,
 *  which is what makes every capture reproducible. */
function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// registry/effects/grain-overlay/core.ts
export interface GrainOverlayProps extends MotionProps {
  /** Spatial frequency of the turbulence noise. Lower values draw coarser flecks, higher values draw finer grain. */
  frequency: number;
  /** How strongly the grain shows over the content beneath it. */
  opacity: number;
  /** Width and height of the noise tile, in pixels, before it repeats. */
  size: number;
  /** CSS blend mode the grain composites with the content beneath it. */
  blend: "overlay" | "soft-light" | "normal";
  /** Shifts the tile a few pixels several times a second, so the grain lives instead of sitting fixed. */
  jitter: boolean;
  /** Frames per second the jitter steps at. */
  fps: number;
}

export const defaults: GrainOverlayProps = {
  frequency: 0.8,
  opacity: 0.12,
  size: 160,
  blend: "overlay",
  jitter: true,
  fps: 10,
  paused: false,
  time: null,
  seed: 1,
};

/** The animation time held under reduced motion. Captures use the same value, so the default capture
 *  and the reduced-motion frame always agree. */
const STILL_TIME = 1200;

/** Turbulence octaves baked into the tile. Fixed, because one well-tuned grain reads better than a prop for it. */
const OCTAVES = 3;

/** Contrast the raw turbulence is stretched by before it is used. Fractal noise settles close to a flat
 *  mid gray on its own; this pushes it back out toward black and white so individual flecks read as
 *  grain instead of haze. */
const CONTRAST_SLOPE = 3;
const CONTRAST_INTERCEPT = -1;

/** How far a jitter step shifts the tile from rest, in pixels, along each axis. */
const SHIFT_PX = 6;

/** Counts instances so every host gets a class name of its own, even with several copies on one page. */
let instances = 0;

/** Mixes a seed and a step index into one 32-bit value, so the jitter offset at any step is a pure
 *  function of the seed and the animation time, never of how many steps came before it. */
function stepSeed(seed: number, step: number): number {
  return (Math.imul(Math.round(seed), 0x9e3779b1) + step) >>> 0;
}

/** The pixel offset one jitter step draws the tile at: two independent draws of the same generator. */
function jitterOffset(seed: number, step: number): [number, number] {
  const rng = createRng(stepSeed(seed, step));
  return [Math.round((rng() * 2 - 1) * SHIFT_PX), Math.round((rng() * 2 - 1) * SHIFT_PX)];
}

/** The data URI for one seamless, opaque, grayscale turbulence tile. Built once per seed, frequency, or
 *  size change, never fetched, so the component draws with no network. The color matrix averages the
 *  turbulence's own red, green, and blue channels into one gray value, so the grain carries no hue, and
 *  the transfer function stretches that gray value's contrast before it reaches the page. */
function noiseTile(seed: number, frequency: number, size: number): string {
  const curve = `type="linear" slope="${CONTRAST_SLOPE}" intercept="${CONTRAST_INTERCEPT}"`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<filter id="g" x="0" y="0" width="100%" height="100%">` +
    `<feTurbulence type="fractalNoise" baseFrequency="${frequency}" numOctaves="${OCTAVES}" seed="${Math.round(seed)}" stitchTiles="stitch"/>` +
    `<feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 0 1"/>` +
    `<feComponentTransfer><feFuncR ${curve}/><feFuncG ${curve}/><feFuncB ${curve}/></feComponentTransfer>` +
    `</filter>` +
    `<rect width="100%" height="100%" filter="url(#g)"/>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** The scoped rule for one instance's grain layer: the tile as a repeating background, composited with
 *  `blend` at `opacity`. Jitter moves the tile through `backgroundPosition` directly, not through here. */
function sheet(className: string, p: GrainOverlayProps): string {
  const rules = [
    "position:absolute",
    "inset:0",
    "pointer-events:none",
    `background-image:url("${noiseTile(p.seed, p.frequency, p.size)}")`,
    "background-repeat:repeat",
    `background-size:${p.size}px ${p.size}px`,
    `mix-blend-mode:${p.blend}`,
    `opacity:${p.opacity}`,
  ];
  return `.${className}{${rules.join(";")}}`;
}

/** Whether the loop should actually tick. Turning jitter off holds the frame exactly like pausing does. */
function shouldAnimate(p: GrainOverlayProps): boolean {
  return !p.paused && p.jitter;
}

export const mount: Mount<GrainOverlayProps> = (host, initial = {}) => {
  let props: GrainOverlayProps = { ...defaults, ...initial };
  const className = `pica-grain-overlay-${++instances}`;
  const reposition = getComputedStyle(host).position === "static";
  const style = document.createElement("style");
  const layer = document.createElement("div");
  layer.className = className;
  layer.setAttribute("aria-hidden", "true");

  function frame(t: number): void {
    if (props.jitter) {
      const step = Math.floor(t / (1000 / Math.max(1, props.fps)));
      const [dx, dy] = jitterOffset(props.seed, step);
      layer.style.backgroundPosition = `${dx}px ${dy}px`;
    } else {
      layer.style.backgroundPosition = "0px 0px";
    }
    host.dataset.picaReady = "true";
  }

  labelHost(host, "");
  if (reposition) host.style.position = "relative";
  // Keeps the blend mode composited only against this host's own content, not the rest of the page.
  host.style.isolation = "isolate";
  style.textContent = sheet(className, props);
  host.appendChild(style);
  host.appendChild(layer);
  const loop = createLoop({ el: host, fps: props.fps, paused: !shouldAnimate(props), time: props.time, still: STILL_TIME, frame });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (
        props.seed !== before.seed ||
        props.frequency !== before.frequency ||
        props.size !== before.size ||
        props.opacity !== before.opacity ||
        props.blend !== before.blend
      ) {
        style.textContent = sheet(className, props);
      }
      const motion: Partial<LoopState> = {};
      if (shouldAnimate(props) !== shouldAnimate(before)) motion.paused = !shouldAnimate(props);
      if (props.time !== before.time) motion.time = props.time;
      if (props.fps !== before.fps) motion.fps = props.fps;
      if (Object.keys(motion).length > 0) loop.update(motion);
      else if (props.jitter !== before.jitter || props.seed !== before.seed) loop.redraw();
    },
    destroy() {
      loop.destroy();
      style.remove();
      layer.remove();
      unlabelHost(host);
      if (reposition) host.style.removeProperty("position");
      host.style.removeProperty("isolation");
      delete host.dataset.picaReady;
    },
  };
};

// registry/effects/grain-overlay/index.tsx
export interface GrainOverlayComponentProps extends Partial<GrainOverlayProps> {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** Film grain laid over its content, a turbulence texture that jitters a few pixels several times a second. */
export function GrainOverlay({ className, style, children, ...props }: GrainOverlayComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }}>
      {children}
    </div>
  );
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Grain Overlay · grain-overlay
  MIT + Commons Clause · https://github.com/rishabbalak/pica/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/pica
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Grain Overlay · Pica</title>
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
var PicaGrainOverlay = (() => {
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

  // registry/effects/grain-overlay/core.ts
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

  // lib/rng.ts
  function createRng(seed) {
    let state = seed >>> 0;
    return () => {
      state = state + 1831565813 >>> 0;
      let t = state;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // registry/effects/grain-overlay/core.ts
  var defaults = {
    frequency: 0.8,
    opacity: 0.12,
    size: 160,
    blend: "overlay",
    jitter: true,
    fps: 10,
    paused: false,
    time: null,
    seed: 1
  };
  var STILL_TIME = 1200;
  var OCTAVES = 3;
  var CONTRAST_SLOPE = 3;
  var CONTRAST_INTERCEPT = -1;
  var SHIFT_PX = 6;
  var instances = 0;
  function stepSeed(seed, step) {
    return Math.imul(Math.round(seed), 2654435761) + step >>> 0;
  }
  function jitterOffset(seed, step) {
    const rng = createRng(stepSeed(seed, step));
    return [Math.round((rng() * 2 - 1) * SHIFT_PX), Math.round((rng() * 2 - 1) * SHIFT_PX)];
  }
  function noiseTile(seed, frequency, size) {
    const curve = `type="linear" slope="${CONTRAST_SLOPE}" intercept="${CONTRAST_INTERCEPT}"`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><filter id="g" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${frequency}" numOctaves="${OCTAVES}" seed="${Math.round(seed)}" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 0 1"/><feComponentTransfer><feFuncR ${curve}/><feFuncG ${curve}/><feFuncB ${curve}/></feComponentTransfer></filter><rect width="100%" height="100%" filter="url(#g)"/></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }
  function sheet(className, p) {
    const rules = [
      "position:absolute",
      "inset:0",
      "pointer-events:none",
      `background-image:url("${noiseTile(p.seed, p.frequency, p.size)}")`,
      "background-repeat:repeat",
      `background-size:${p.size}px ${p.size}px`,
      `mix-blend-mode:${p.blend}`,
      `opacity:${p.opacity}`
    ];
    return `.${className}{${rules.join(";")}}`;
  }
  function shouldAnimate(p) {
    return !p.paused && p.jitter;
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    const className = `pica-grain-overlay-${++instances}`;
    const reposition = getComputedStyle(host).position === "static";
    const style = document.createElement("style");
    const layer = document.createElement("div");
    layer.className = className;
    layer.setAttribute("aria-hidden", "true");
    function frame(t) {
      if (props.jitter) {
        const step = Math.floor(t / (1e3 / Math.max(1, props.fps)));
        const [dx, dy] = jitterOffset(props.seed, step);
        layer.style.backgroundPosition = `${dx}px ${dy}px`;
      } else {
        layer.style.backgroundPosition = "0px 0px";
      }
      host.dataset.picaReady = "true";
    }
    labelHost(host, "");
    if (reposition) host.style.position = "relative";
    host.style.isolation = "isolate";
    style.textContent = sheet(className, props);
    host.appendChild(style);
    host.appendChild(layer);
    const loop = createLoop({ el: host, fps: props.fps, paused: !shouldAnimate(props), time: props.time, still: STILL_TIME, frame });
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        if (props.seed !== before.seed || props.frequency !== before.frequency || props.size !== before.size || props.opacity !== before.opacity || props.blend !== before.blend) {
          style.textContent = sheet(className, props);
        }
        const motion = {};
        if (shouldAnimate(props) !== shouldAnimate(before)) motion.paused = !shouldAnimate(props);
        if (props.time !== before.time) motion.time = props.time;
        if (props.fps !== before.fps) motion.fps = props.fps;
        if (Object.keys(motion).length > 0) loop.update(motion);
        else if (props.jitter !== before.jitter || props.seed !== before.seed) loop.redraw();
      },
      destroy() {
        loop.destroy();
        style.remove();
        layer.remove();
        unlabelHost(host);
        if (reposition) host.style.removeProperty("position");
        host.style.removeProperty("isolation");
        delete host.dataset.picaReady;
      }
    };
  };
  return __toCommonJS(core_exports);
})();

(function () {
  var instance = PicaGrainOverlay.mount(document.getElementById("pica"), window.PICA_PROPS || {});
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

- Technique from [Grainy gradients](https://css-tricks.com/grainy-gradients/) by CSS-Tricks (Article).
