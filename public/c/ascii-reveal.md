# ASCII Reveal

> Text that resolves from scrambled glyphs into its final characters, left to right.

Category: ascii. Tags: text, reveal, scramble, decode. Animated. Holds a still frame under prefers-reduced-motion, and stops offscreen and in hidden tabs. Size: 1.9 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/pica/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://raw.githubusercontent.com/rishabbalak/pica/main/public/r/ascii-reveal.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `text` | string | `"Drawn on a monospace grid."` | Text to reveal. Also the host's accessible label. |
| `duration` | number | `1600` | Milliseconds from the first frame to the last character locking onto its own glyph. |
| `stagger` | number | `0.6` | Share of the duration spent spreading out when characters lock, from 0 (all lock together) to 1 (locks spread across nearly the whole duration). |
| `glyphs` | string | `".:-=+*#%@/\\\|_"` | Glyphs a character cycles through before it settles on its own character. |
| `loop` | number | `0` | Milliseconds to hold the settled text before it scrambles again. 0 never replays. |
| `fontFamily` | string | `"\"JetBrains Mono\", \"IBM Plex Mono\", ui-monospace, \"SFMono-Regular\", Menlo, monospace"` | CSS font family stack. Kept monospace so the revealed width never jitters. |
| `fps` | number | `20` | Frames per second the scramble cycles through glyphs at. |
| `paused` | boolean | `false` | Stop animating and hold the current frame. |
| `time` | number \| null | `null` | Render exactly this animation time, in milliseconds, and do not animate. Null animates. |
| `seed` | number | `1` | Seed for every random choice, so the same seed always draws the same frame. |

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · ASCII Reveal · ascii-reveal
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

// registry/ascii/ascii-reveal/core.ts
export interface AsciiRevealProps extends MotionProps {
  /** Text to reveal. Also the host's accessible label. */
  text: string;
  /** Milliseconds from the first frame to the last character locking onto its own glyph. */
  duration: number;
  /** Share of the duration spent spreading out when characters lock, from 0 (all lock together) to 1 (locks spread across nearly the whole duration). */
  stagger: number;
  /** Glyphs a character cycles through before it settles on its own character. */
  glyphs: string;
  /** Milliseconds to hold the settled text before it scrambles again. 0 never replays. */
  loop: number;
  /** CSS font family stack. Kept monospace so the revealed width never jitters. */
  fontFamily: string;
  /** Frames per second the scramble cycles through glyphs at. */
  fps: number;
}

export const defaults: AsciiRevealProps = {
  text: "Drawn on a monospace grid.",
  duration: 1600,
  stagger: 0.6,
  // The fallback ramp (STYLE.md) without its leading space, plus four glyphs of their own.
  glyphs: ".:-=+*#%@/\\|_",
  loop: 0,
  fontFamily: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace',
  fps: 20,
  paused: false,
  time: null,
  seed: 1,
};

const WHITESPACE = /\s/;

/** A glyph string as single characters, falling back to the default set when empty. */
function toGlyphs(source: string): string[] {
  return Array.from(source.length > 0 ? source : defaults.glyphs);
}

/** Mixes three integers into one 32 bit seed, so createRng draws an independent value per cell and frame. */
function mixSeed(seed: number, position: number, frame: number): number {
  let h = (seed ^ Math.imul(position + 1, 0x27d4eb2f) ^ Math.imul(frame + 1, 0x165667b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), h | 1);
  h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
  return (h ^ (h >>> 14)) >>> 0;
}

/** The glyph shown at `position` on scramble frame `frame`, drawn from `pool`. */
function scrambleGlyph(pool: readonly string[], seed: number, position: number, frame: number): string {
  if (pool.length === 0) return " ";
  const draw = createRng(mixSeed(seed, position, frame))();
  return pool[Math.min(pool.length - 1, Math.floor(draw * pool.length))] ?? " ";
}

export const mount: Mount<AsciiRevealProps> = (host, initial = {}) => {
  let props: AsciiRevealProps = { ...defaults, ...initial };
  let chars = Array.from(props.text);
  let glyphPool = toGlyphs(props.glyphs);
  let shown = "";

  const hidden = hiddenText(props.text);
  const visible = document.createElement("span");
  visible.setAttribute("aria-hidden", "true");
  visible.style.whiteSpace = "pre";
  visible.style.fontFamily = props.fontFamily;
  host.appendChild(hidden);
  host.appendChild(visible);

  /** The text at animation time `t`, in milliseconds. Spaces never scramble, and a time at or past
   *  the duration, including the Infinity used for the reduced motion still frame, shows the final text. */
  function revealAt(t: number): string {
    const n = chars.length;
    if (n === 0) return "";
    const cycle = props.duration + props.loop;
    const local = props.loop > 0 && Number.isFinite(t) ? t % cycle : t;
    if (!(local < props.duration)) return props.text;
    const frameIndex = Math.floor(local / (1000 / props.fps));
    const minScramble = (1 - props.stagger) * props.duration;
    const spread = props.stagger * props.duration;
    const span = Math.max(1, n - 1);
    let out = "";
    for (let i = 0; i < n; i++) {
      const ch = chars[i] ?? "";
      if (WHITESPACE.test(ch)) {
        out += ch;
        continue;
      }
      const lock = n <= 1 ? props.duration : minScramble + spread * (i / span);
      out += local < lock ? scrambleGlyph(glyphPool, props.seed, i, frameIndex) : ch;
    }
    return out;
  }

  function draw(t: number): void {
    const revealed = revealAt(t);
    if (revealed !== shown) {
      shown = revealed;
      visible.textContent = revealed;
    }
    if (host.dataset.picaReady !== "true") host.dataset.picaReady = "true";
  }

  labelHost(host, props.text, "text");
  const loop = createLoop({
    el: host,
    fps: props.fps,
    paused: props.paused,
    time: props.time,
    // Past any duration and loop combination, so reduced motion always lands on the final text.
    still: Infinity,
    frame: draw,
  });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.text !== before.text) {
        chars = Array.from(props.text);
        hidden.textContent = props.text;
        labelHost(host, props.text, "text");
      }
      if (props.glyphs !== before.glyphs) glyphPool = toGlyphs(props.glyphs);
      if (props.fontFamily !== before.fontFamily) visible.style.fontFamily = props.fontFamily;
      loop.update({ paused: props.paused, time: props.time, fps: props.fps });
    },
    destroy() {
      loop.destroy();
      unlabelHost(host);
      hidden.remove();
      visible.remove();
      delete host.dataset.picaReady;
    },
  };
};

// registry/ascii/ascii-reveal/index.tsx
export interface AsciiRevealComponentProps extends Partial<AsciiRevealProps> {
  className?: string;
  style?: CSSProperties;
}

/** Text that cycles through scramble glyphs before settling into its final characters, left to right. */
export function AsciiReveal({ className, style, ...props }: AsciiRevealComponentProps) {
  const ref = usePica(mount, props);
  return <span ref={ref} className={className} style={{ display: "inline-block", ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · ASCII Reveal · ascii-reveal
  MIT + Commons Clause · https://github.com/rishabbalak/pica/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/pica
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>ASCII Reveal · Pica</title>
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
var PicaAsciiReveal = (() => {
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

  // registry/ascii/ascii-reveal/core.ts
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
  function hiddenText(text) {
    const span = document.createElement("span");
    span.textContent = text;
    span.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";
    return span;
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

  // registry/ascii/ascii-reveal/core.ts
  var defaults = {
    text: "Drawn on a monospace grid.",
    duration: 1600,
    stagger: 0.6,
    // The fallback ramp (STYLE.md) without its leading space, plus four glyphs of their own.
    glyphs: ".:-=+*#%@/\\|_",
    loop: 0,
    fontFamily: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace',
    fps: 20,
    paused: false,
    time: null,
    seed: 1
  };
  var WHITESPACE = /\s/;
  function toGlyphs(source) {
    return Array.from(source.length > 0 ? source : defaults.glyphs);
  }
  function mixSeed(seed, position, frame) {
    let h = (seed ^ Math.imul(position + 1, 668265263) ^ Math.imul(frame + 1, 374761393)) >>> 0;
    h = Math.imul(h ^ h >>> 15, h | 1);
    h ^= h + Math.imul(h ^ h >>> 7, h | 61);
    return (h ^ h >>> 14) >>> 0;
  }
  function scrambleGlyph(pool, seed, position, frame) {
    if (pool.length === 0) return " ";
    const draw = createRng(mixSeed(seed, position, frame))();
    return pool[Math.min(pool.length - 1, Math.floor(draw * pool.length))] ?? " ";
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    let chars = Array.from(props.text);
    let glyphPool = toGlyphs(props.glyphs);
    let shown = "";
    const hidden = hiddenText(props.text);
    const visible = document.createElement("span");
    visible.setAttribute("aria-hidden", "true");
    visible.style.whiteSpace = "pre";
    visible.style.fontFamily = props.fontFamily;
    host.appendChild(hidden);
    host.appendChild(visible);
    function revealAt(t) {
      const n = chars.length;
      if (n === 0) return "";
      const cycle = props.duration + props.loop;
      const local = props.loop > 0 && Number.isFinite(t) ? t % cycle : t;
      if (!(local < props.duration)) return props.text;
      const frameIndex = Math.floor(local / (1e3 / props.fps));
      const minScramble = (1 - props.stagger) * props.duration;
      const spread = props.stagger * props.duration;
      const span = Math.max(1, n - 1);
      let out = "";
      for (let i = 0; i < n; i++) {
        const ch = chars[i] ?? "";
        if (WHITESPACE.test(ch)) {
          out += ch;
          continue;
        }
        const lock = n <= 1 ? props.duration : minScramble + spread * (i / span);
        out += local < lock ? scrambleGlyph(glyphPool, props.seed, i, frameIndex) : ch;
      }
      return out;
    }
    function draw(t) {
      const revealed = revealAt(t);
      if (revealed !== shown) {
        shown = revealed;
        visible.textContent = revealed;
      }
      if (host.dataset.picaReady !== "true") host.dataset.picaReady = "true";
    }
    labelHost(host, props.text, "text");
    const loop = createLoop({
      el: host,
      fps: props.fps,
      paused: props.paused,
      time: props.time,
      // Past any duration and loop combination, so reduced motion always lands on the final text.
      still: Infinity,
      frame: draw
    });
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        if (props.text !== before.text) {
          chars = Array.from(props.text);
          hidden.textContent = props.text;
          labelHost(host, props.text, "text");
        }
        if (props.glyphs !== before.glyphs) glyphPool = toGlyphs(props.glyphs);
        if (props.fontFamily !== before.fontFamily) visible.style.fontFamily = props.fontFamily;
        loop.update({ paused: props.paused, time: props.time, fps: props.fps });
      },
      destroy() {
        loop.destroy();
        unlabelHost(host);
        hidden.remove();
        visible.remove();
        delete host.dataset.picaReady;
      }
    };
  };
  return __toCommonJS(core_exports);
})();

(function () {
  var instance = PicaAsciiReveal.mount(document.getElementById("pica"), window.PICA_PROPS || {});
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
