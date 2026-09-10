# Scanlines

> A CRT scanline overlay in the ink color, with an optional soft band that rolls slowly down the screen.

Category: effects. Tags: overlay, crt, scanlines, css. Animated. Holds a still frame under prefers-reduced-motion, and stops offscreen and in hidden tabs. Size: 1.7 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/pica/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://raw.githubusercontent.com/rishabbalak/pica/main/public/r/scanlines.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `spacing` | number | `3` | Vertical gap from the top of one line to the top of the next, in pixels. |
| `thickness` | number | `1` | Thickness of each line, in pixels. Never drawn thicker than spacing. |
| `opacity` | number | `0.18` | Opacity of the whole overlay, from barely visible to strong. |
| `roll` | boolean | `true` | Draws a soft, brighter band that drifts down the screen and loops. |
| `rollSpeed` | number | `9` | Seconds for the roll band to cross the full height once before it repeats. |
| `fps` | number | `30` | Frames drawn per second while the roll band moves. |
| `paused` | boolean | `false` | Stop animating and hold the current frame. |
| `time` | number \| null | `null` | Render exactly this animation time, in milliseconds, and do not animate. Null animates. |
| `seed` | number | `1` | Seed for every random choice, so the same seed always draws the same frame. |

## React

```tsx
"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

// Pica · Scanlines · scanlines
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

// registry/effects/scanlines/core.ts
export interface ScanlinesProps extends MotionProps {
  /** Vertical gap from the top of one line to the top of the next, in pixels. */
  spacing: number;
  /** Thickness of each line, in pixels. Never drawn thicker than spacing. */
  thickness: number;
  /** Opacity of the whole overlay, from barely visible to strong. */
  opacity: number;
  /** Draws a soft, brighter band that drifts down the screen and loops. */
  roll: boolean;
  /** Seconds for the roll band to cross the full height once before it repeats. */
  rollSpeed: number;
  /** Frames drawn per second while the roll band moves. */
  fps: number;
}

export const defaults: ScanlinesProps = {
  spacing: 3,
  thickness: 1,
  opacity: 0.18,
  roll: true,
  rollSpeed: 9,
  fps: 30,
  paused: false,
  time: null,
  seed: 1,
};

/** Counts instances so each one gets its own class, never repeated while the page is open. */
let instances = 0;

/** The roll band as one tile the height of the host: transparent above and below a soft ink peak at its
 *  center. Tiled with repeat-y and slid down by lib/loop.ts, adjacent tiles meet at matching transparent
 *  edges, so the drift loops with no seam. */
const ROLL_BAND =
  "linear-gradient(to bottom, transparent 0%, transparent 38%, var(--pica-fg, currentColor) 50%, transparent 62%, transparent 100%)";

/** The custom property lib/loop.ts writes the roll band's vertical position into, read back by the
 *  scoped rule in `sheet`. Private to this component; not one of STYLE.md's shared tokens. */
const ROLL_VAR = "--pica-scanlines-roll";

export const mount: Mount<ScanlinesProps> = (host, initial = {}) => {
  let props: ScanlinesProps = { ...defaults, ...initial };
  const className = `pica-scanlines-${++instances}`;
  const reposition = getComputedStyle(host).position === "static";
  const styleEl = document.createElement("style");
  const layer = document.createElement("div");
  layer.className = className;
  layer.setAttribute("aria-hidden", "true");

  function draw(t: number): void {
    if (props.roll) {
      // Percentage background-position is a no-op once the image matches the box exactly (the offset
      // formula is (box - image) * percent, which is zero at equal sizes), so the shift is a pixel
      // value computed from the host's own height instead.
      const period = Math.max(1, props.rollSpeed) * 1000;
      const phase = ((t % period) + period) % period / period;
      const height = host.clientHeight;
      layer.style.setProperty(ROLL_VAR, `${(phase * height).toFixed(2)}px`);
    }
    host.dataset.picaReady = "true";
  }

  labelHost(host, "");
  if (reposition) host.style.position = "relative";
  styleEl.textContent = sheet(className, props);
  host.appendChild(styleEl);
  host.appendChild(layer);

  const loop = createLoop({
    el: host,
    fps: props.fps,
    paused: props.paused,
    time: props.time,
    still: 0,
    frame: draw,
  });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (
        props.spacing !== before.spacing ||
        props.thickness !== before.thickness ||
        props.opacity !== before.opacity ||
        props.roll !== before.roll
      ) {
        styleEl.textContent = sheet(className, props);
      }
      loop.update({ paused: props.paused, time: props.time, fps: props.fps });
      loop.redraw();
    },
    destroy() {
      loop.destroy();
      styleEl.remove();
      layer.remove();
      unlabelHost(host);
      if (reposition) host.style.removeProperty("position");
      delete host.dataset.picaReady;
    },
  };
};

/** The scoped rule for one instance: fine horizontal lines from a repeating gradient, plus an optional
 *  roll band whose position lib/loop.ts drives through one custom property. Both layers live in one
 *  element's background, so only one div is ever added. */
function sheet(className: string, p: ScanlinesProps): string {
  const thickness = Math.min(p.thickness, p.spacing);
  const lines =
    `repeating-linear-gradient(to bottom, var(--pica-fg, currentColor) 0, ` +
    `var(--pica-fg, currentColor) ${thickness}px, transparent ${thickness}px, transparent ${p.spacing}px)`;
  const rules = ["position:absolute", "inset:0", "pointer-events:none", `opacity:${p.opacity}`];
  if (p.roll) {
    rules.push(
      `background-image:${ROLL_BAND},${lines}`,
      `background-size:100% 100%,100% ${p.spacing}px`,
      "background-repeat:repeat-y,repeat-y",
      `background-position:0 var(${ROLL_VAR},0px),0 0`,
    );
  } else {
    rules.push(`background-image:${lines}`, `background-size:100% ${p.spacing}px`, "background-repeat:repeat-y");
  }
  return `.${className}{${rules.join(";")}}`;
}

// registry/effects/scanlines/index.tsx
export interface ScanlinesComponentProps extends Partial<ScanlinesProps> {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** A CRT scanline overlay, in the ink color, drawn above whatever content sits inside it. */
export function Scanlines({ className, style, children, ...props }: ScanlinesComponentProps) {
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
  Pica · Scanlines · scanlines
  MIT + Commons Clause · https://github.com/rishabbalak/pica/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/pica
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Scanlines · Pica</title>
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
var PicaScanlines = (() => {
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

  // registry/effects/scanlines/core.ts
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

  // registry/effects/scanlines/core.ts
  var defaults = {
    spacing: 3,
    thickness: 1,
    opacity: 0.18,
    roll: true,
    rollSpeed: 9,
    fps: 30,
    paused: false,
    time: null,
    seed: 1
  };
  var instances = 0;
  var ROLL_BAND = "linear-gradient(to bottom, transparent 0%, transparent 38%, var(--pica-fg, currentColor) 50%, transparent 62%, transparent 100%)";
  var ROLL_VAR = "--pica-scanlines-roll";
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    const className = `pica-scanlines-${++instances}`;
    const reposition = getComputedStyle(host).position === "static";
    const styleEl = document.createElement("style");
    const layer = document.createElement("div");
    layer.className = className;
    layer.setAttribute("aria-hidden", "true");
    function draw(t) {
      if (props.roll) {
        const period = Math.max(1, props.rollSpeed) * 1e3;
        const phase = (t % period + period) % period / period;
        const height = host.clientHeight;
        layer.style.setProperty(ROLL_VAR, `${(phase * height).toFixed(2)}px`);
      }
      host.dataset.picaReady = "true";
    }
    labelHost(host, "");
    if (reposition) host.style.position = "relative";
    styleEl.textContent = sheet(className, props);
    host.appendChild(styleEl);
    host.appendChild(layer);
    const loop = createLoop({
      el: host,
      fps: props.fps,
      paused: props.paused,
      time: props.time,
      still: 0,
      frame: draw
    });
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        if (props.spacing !== before.spacing || props.thickness !== before.thickness || props.opacity !== before.opacity || props.roll !== before.roll) {
          styleEl.textContent = sheet(className, props);
        }
        loop.update({ paused: props.paused, time: props.time, fps: props.fps });
        loop.redraw();
      },
      destroy() {
        loop.destroy();
        styleEl.remove();
        layer.remove();
        unlabelHost(host);
        if (reposition) host.style.removeProperty("position");
        delete host.dataset.picaReady;
      }
    };
  };
  function sheet(className, p) {
    const thickness = Math.min(p.thickness, p.spacing);
    const lines = `repeating-linear-gradient(to bottom, var(--pica-fg, currentColor) 0, var(--pica-fg, currentColor) ${thickness}px, transparent ${thickness}px, transparent ${p.spacing}px)`;
    const rules = ["position:absolute", "inset:0", "pointer-events:none", `opacity:${p.opacity}`];
    if (p.roll) {
      rules.push(
        `background-image:${ROLL_BAND},${lines}`,
        `background-size:100% 100%,100% ${p.spacing}px`,
        "background-repeat:repeat-y,repeat-y",
        `background-position:0 var(${ROLL_VAR},0px),0 0`
      );
    } else {
      rules.push(`background-image:${lines}`, `background-size:100% ${p.spacing}px`, "background-repeat:repeat-y");
    }
    return `.${className}{${rules.join(";")}}`;
  }
  return __toCommonJS(core_exports);
})();

(function () {
  var instance = PicaScanlines.mount(document.getElementById("pica"), window.PICA_PROPS || {});
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
