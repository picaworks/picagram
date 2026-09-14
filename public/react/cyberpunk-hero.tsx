"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

// Pica · Cyberpunk Hero · cyberpunk-hero
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

// lib/font.ts
/** The monospace stack glyph components default to. It lives in its own module, so a text component that
 *  never draws a grid does not carry lib/glyph-grid.ts into its single React file just for the font. */
const GRID_FONT = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

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
  /** The frame shown under prefers-reduced-motion, in milliseconds of animation time. */
  still: number;
}

interface LoopOptions extends LoopState {
  /** Element whose visibility on screen gates the loop. */
  el: Element;
  /** Draws the frame for animation time `t`, in milliseconds. `reduced` is true while the viewer asks for
   *  reduced motion, so a core can drop pointer effects then too. */
  frame: (t: number, reduced: boolean) => void;
}

interface Loop {
  update(state: Partial<LoopState>): void;
  /** Draws the current frame again, for example after a resize. */
  redraw(): void;
  /** Whether the viewer asks for reduced motion right now. */
  readonly reduced: boolean;
  destroy(): void;
}

/** A gap longer than this, such as a tab switch, advances the animation by this much at most. */
const MAX_STEP_MS = 100;

function createLoop(options: LoopOptions): Loop {
  const { el, frame } = options;
  let state: LoopState = { paused: options.paused, time: options.time, fps: options.fps, still: options.still };
  let t = 0;
  let last = 0;
  let raf = 0;
  let onScreen = true;
  let tabVisible = typeof document === "undefined" || document.visibilityState !== "hidden";
  const motionQuery = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  let reduced = motionQuery?.matches ?? false;

  const animating = (): boolean =>
    !state.paused && state.time === null && !reduced && onScreen && tabVisible;
  const heldTime = (): number => (state.time !== null ? state.time : reduced ? state.still : t);

  function tick(now: number): void {
    raf = 0;
    if (!animating()) return;
    if (last === 0) last = now;
    const elapsed = now - last;
    // One millisecond of tolerance so a 60 Hz display lands evenly on a 30 fps ceiling.
    if (elapsed >= 1000 / Math.max(1, state.fps) - 1) {
      t += Math.min(elapsed, MAX_STEP_MS);
      last = now;
      frame(t, reduced);
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
    if (!go && drawHeld) frame(heldTime(), reduced);
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

  frame(heldTime(), reduced);
  sync(false);

  return {
    update(next) {
      const timeChanged = next.time !== undefined && next.time !== state.time;
      state = { ...state, ...next };
      if (state.time !== null) t = state.time;
      sync(timeChanged || next.paused !== undefined || next.still !== undefined);
    },
    redraw() {
      frame(heldTime(), reduced);
    },
    get reduced() {
      return reduced;
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

// lib/ramp.ts
/** Glyph density measured in the font actually in use. See STYLE.md, principle 2. */

/** Used when no glyphs are given: ten steps from space to at-sign. */
const FALLBACK_RAMP = " .:-=+*#%@";

interface Ramp {
  /** Glyphs from least to most ink. */
  readonly glyphs: readonly string[];
  /** Ink per glyph, scaled so the lightest is 0 and the darkest is 1. */
  readonly levels: readonly number[];
}

interface Shapes {
  readonly glyphs: readonly string[];
  /** Sub-cells per side. */
  readonly n: number;
  /** Ink per glyph in an n by n grid of sub-cells, row-major, scaled so the inkiest sub-cell of any glyph is 1. */
  readonly cells: readonly (readonly number[])[];
}

const rampCache = new Map<string, Ramp>();
const shapeCache = new Map<string, Shapes>();

function uniqueGlyphs(chars: string): string[] {
  return Array.from(new Set(Array.from(chars.length > 0 ? chars : FALLBACK_RAMP)));
}

/** A measurement taken before a web font loads describes the fallback font, so it is not cached. */
function fontSettled(fontFamily: string): boolean {
  try {
    return document.fonts.check(`12px ${fontFamily}`);
  } catch {
    return true;
  }
}

/** Draws each glyph in one cell and reads its ink per sub-cell. Null where there is no canvas. */
function inkMaps(glyphs: readonly string[], fontFamily: string, lineHeight: number, n: number): number[][] | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const fontPx = 40;
  ctx.font = `${fontPx}px ${fontFamily}`;
  const w = Math.max(1, Math.ceil(ctx.measureText("M").width || fontPx * 0.6));
  const h = Math.max(1, Math.ceil(fontPx * lineHeight));
  canvas.width = w;
  canvas.height = h;
  ctx.font = `${fontPx}px ${fontFamily}`;
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#000";
  return glyphs.map((glyph) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillText(glyph, 0, h / 2);
    const alpha = ctx.getImageData(0, 0, w, h).data;
    const sums = new Array<number>(n * n).fill(0);
    for (let y = 0; y < h; y++) {
      const sy = Math.min(n - 1, Math.floor((y / h) * n));
      for (let x = 0; x < w; x++) {
        const k = sy * n + Math.min(n - 1, Math.floor((x / w) * n));
        sums[k] = (sums[k] ?? 0) + (alpha[(y * w + x) * 4 + 3] ?? 0);
      }
    }
    return sums;
  });
}

/** Orders `chars` by the ink each glyph puts down in `fontFamily`. Where there is no canvas
 *  (server rendering, tests) it keeps the given order, evenly spaced. */
function measureRamp(chars: string, fontFamily: string, lineHeight = 1.2): Ramp {
  const glyphs = uniqueGlyphs(chars);
  const key = `${fontFamily}|${lineHeight}|${glyphs.join("")}`;
  const cached = rampCache.get(key);
  if (cached) return cached;
  const maps = inkMaps(glyphs, fontFamily, lineHeight, 1);
  if (!maps) {
    const last = Math.max(1, glyphs.length - 1);
    return { glyphs, levels: glyphs.map((_, i) => i / last) };
  }
  const order = glyphs
    .map((glyph, i) => ({ glyph, ink: maps[i]?.[0] ?? 0 }))
    .sort((a, b) => a.ink - b.ink);
  const lightest = order[0]?.ink ?? 0;
  const span = (order[order.length - 1]?.ink ?? 1) - lightest || 1;
  const ramp: Ramp = {
    glyphs: order.map((o) => o.glyph),
    levels: order.map((o) => (o.ink - lightest) / span),
  };
  if (fontSettled(fontFamily)) rampCache.set(key, ramp);
  return ramp;
}

/** The glyph whose measured ink is nearest `v`, where 0 is no ink and 1 is the darkest glyph. */
function pick(ramp: Ramp, v: number): string {
  const { glyphs, levels } = ramp;
  const last = glyphs.length - 1;
  if (last < 0) return " ";
  if (v <= 0) return glyphs[0] ?? " ";
  if (v >= 1) return glyphs[last] ?? " ";
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((levels[mid] ?? 0) < v) lo = mid;
    else hi = mid;
  }
  const nearer = v - (levels[lo] ?? 0) <= (levels[hi] ?? 1) - v ? lo : hi;
  return glyphs[nearer] ?? " ";
}

/** Measures where inside its cell each glyph puts its ink. Null where there is no canvas. */
function measureShapes(chars: string, fontFamily: string, lineHeight = 1.2, n = 3): Shapes | null {
  const glyphs = uniqueGlyphs(chars);
  const key = `${fontFamily}|${lineHeight}|${n}|${glyphs.join("")}`;
  const cached = shapeCache.get(key);
  if (cached) return cached;
  const maps = inkMaps(glyphs, fontFamily, lineHeight, n);
  if (!maps) return null;
  let max = 1;
  for (const m of maps) for (const v of m) if (v > max) max = v;
  const shapes: Shapes = { glyphs, n, cells: maps.map((m) => m.map((v) => v / max)) };
  if (fontSettled(fontFamily)) shapeCache.set(key, shapes);
  return shapes;
}

/** The glyph whose sub-cell ink is closest to `sample`: n by n values in 0..1, row-major. */
function matchShape(shapes: Shapes, sample: ArrayLike<number>): string {
  let best = 0;
  let bestDistance = Infinity;
  for (let g = 0; g < shapes.cells.length; g++) {
    const cells = shapes.cells[g] ?? [];
    let d = 0;
    for (let i = 0; i < cells.length; i++) {
      const e = (cells[i] ?? 0) - (sample[i] ?? 0);
      d += e * e;
    }
    if (d < bestDistance) {
      bestDistance = d;
      best = g;
    }
  }
  return shapes.glyphs[best] ?? " ";
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

/** The final mixing step of the lowbias32 integer hash: every input bit affects every output bit. */
function hashMix(h: number): number {
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}

/** A new seed from a seed and one or two integers, for an independent stream per column, cell, or burst:
 *  createRng(hashSeed(seed, column, epoch)). Neighboring inputs give unrelated seeds. */
function hashSeed(seed: number, a: number, b = 0): number {
  return hashMix(hashMix(hashMix(seed >>> 0) ^ (a >>> 0)) ^ (b >>> 0));
}

// registry/effects/glitch-text/core.ts
const glitchText = (() => {
interface GlitchTextProps extends MotionProps {
  /** The text to show. Always available to assistive technology, even while the visible layer glitches. */
  text: string;
  /** Milliseconds from the start of one burst to the start of the next. */
  interval: number;
  /** How long each burst lasts, in milliseconds. */
  burst: number;
  /** How strongly a burst distorts the text: 0 never glitches, 1 shifts strips furthest and swaps the most characters. */
  intensity: number;
  /** Glyphs a character may swap to during a burst, in any order: they are sorted by the ink each one puts down in the font. */
  glyphs: string;
  /** CSS font-family stack. Must be monospace, so the sliced strips line up. Size and color are inherited from the host. */
  fontFamily: string;
  /** Frames per second ceiling for the glitch animation. */
  fps: number;
}

const defaults: GlitchTextProps = {
  text: "SIGNAL LOST",
  interval: 2500,
  burst: 280,
  intensity: 0.5,
  glyphs: FALLBACK_RAMP,
  fontFamily: GRID_FONT,
  fps: 30,
  paused: false,
  time: null,
  seed: 1,
};

/** Horizontal strips the line is cut into during a burst. */
const SLICE_COUNT = 4;
/** Largest sideways shift a strip takes, in character widths, at intensity 1. */
const MAX_SHIFT_CH = 1.2;
/** Largest chance any one character swaps to a ramp glyph, at intensity 1. */
const MAX_SWAP_CHANCE = 0.35;

/** Which burst, if any, a moment in time falls inside. */
interface BurstWindow {
  active: boolean;
  /** Counts bursts from the first. Meaningful only when active. */
  index: number;
}

/** The glitched text and each strip's sideways shift for one burst. */
interface Burst {
  /** Same length as the source text, with a few characters swapped for ramp glyphs. */
  text: string;
  /** One sideways shift per strip, in character widths, in drawing order. */
  shifts: number[];
}

/** Where `t` falls in the repeating schedule. The first burst starts two fifths of the way through the
 *  first interval, so the component holds still for a beat before it ever glitches; every later burst
 *  follows exactly `interval` ms after the one before. A pure function of `t`, `interval`, and `burst`. */
function burstAt(t: number, interval: number, burst: number): BurstWindow {
  const period = Math.max(1, interval);
  const duration = Math.min(Math.max(0, burst), period);
  const phase = period * 0.4;
  const shifted = t - phase;
  const index = Math.floor(shifted / period);
  const local = shifted - index * period;
  return { active: duration > 0 && local < duration, index };
}

/** Builds burst `index`: a pure function of the seed, the index, and the props that shape a burst, so the
 *  same burst always draws the same pixels, and no two bursts glitch the same way. */
function buildBurst(props: GlitchTextProps, index: number): Burst {
  const rng = createRng(hashSeed(props.seed, index));
  const ramp = measureRamp(props.glyphs, props.fontFamily);
  const swapChance = MAX_SWAP_CHANCE * props.intensity;
  const text = Array.from(props.text)
    .map((ch) => {
      if (rng() >= swapChance) return ch;
      const at = Math.min(ramp.glyphs.length - 1, Math.floor(rng() * ramp.glyphs.length));
      return ramp.glyphs[at] ?? ch;
    })
    .join("");
  const shifts = Array.from({ length: SLICE_COUNT }, () => (rng() * 2 - 1) * MAX_SHIFT_CH * props.intensity);
  return { text, shifts };
}

const mount: Mount<GlitchTextProps> = (host, initial = {}) => {
  let props: GlitchTextProps = { ...defaults, ...initial };

  // The host keeps no role, so a heading around it stays a heading. Assistive technology reads the text
  // from a hidden copy, and the glitch draws into a layer hidden from it.
  const text = animatedText(host, props.text);
  const view = text.layer;
  view.style.position = "relative";
  view.style.display = "inline-block";
  view.style.whiteSpace = "pre";
  view.style.userSelect = "none";
  view.style.pointerEvents = "none";
  view.style.fontFamily = props.fontFamily;
  view.style.color = cssVar("fg");

  function draw(t: number): void {
    const slot = burstAt(t, props.interval, props.burst);
    view.textContent = "";
    if (slot.active) {
      const glitch = buildBurst(props, slot.index);
      for (let i = 0; i < SLICE_COUNT; i++) {
        const strip = document.createElement("span");
        strip.style.display = "inline-block";
        strip.style.whiteSpace = "pre";
        if (i > 0) {
          strip.style.position = "absolute";
          strip.style.left = "0";
          strip.style.top = "0";
        }
        strip.style.clipPath = `inset(${(i / SLICE_COUNT) * 100}% 0 ${((SLICE_COUNT - i - 1) / SLICE_COUNT) * 100}% 0)`;
        strip.style.transform = `translateX(${(glitch.shifts[i] ?? 0).toFixed(3)}ch)`;
        strip.textContent = glitch.text;
        view.appendChild(strip);
      }
    } else {
      view.textContent = props.text;
    }
    host.dataset.picaReady = "true";
  }

  const motion = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: 0, frame: draw });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.text !== before.text) text.setText(props.text);
      if (props.fontFamily !== before.fontFamily) view.style.fontFamily = props.fontFamily;
      motion.update({ paused: props.paused, time: props.time, fps: props.fps });
      motion.redraw();
    },
    destroy() {
      motion.destroy();
      text.remove();
      delete host.dataset.picaReady;
    },
  };
};
return { mount, defaults };
})();

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

// registry/effects/scanlines/core.ts
const scanlines = (() => {
interface ScanlinesProps extends MotionProps {
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

const defaults: ScanlinesProps = {
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

/** The roll band as one tile the height of the host: transparent above and below a soft ink peak at its
 *  center. Tiled with repeat-y and slid down by lib/loop.ts, adjacent tiles meet at matching transparent
 *  edges, so the drift loops with no seam. */
const ROLL_BAND = `linear-gradient(to bottom, transparent 0%, transparent 38%, ${cssVar("fg")} 50%, transparent 62%, transparent 100%)`;

/** The custom property lib/loop.ts writes the roll band's vertical position into, read back by the
 *  scoped rule. Private to this component; not one of STYLE.md's shared tokens. */
const ROLL_VAR = "--pica-scanlines-roll";

const mount: Mount<ScanlinesProps> = (host, initial = {}) => {
  let props: ScanlinesProps = { ...defaults, ...initial };
  // The lines sit over the content in a layer of their own, hidden from assistive technology. The host
  // and the content inside it stay readable and clickable, exactly as they were.
  const lines = layer(host, "over");
  const sheet = scope(host);

  function draw(t: number): void {
    if (props.roll) {
      // Percentage background-position is a no-op once the image matches the box exactly (the offset
      // formula is (box - image) * percent, which is zero at equal sizes), so the shift is a pixel
      // value computed from the host's own height instead.
      const period = Math.max(1, props.rollSpeed) * 1000;
      const phase = (((t % period) + period) % period) / period;
      lines.el.style.setProperty(ROLL_VAR, `${(phase * host.clientHeight).toFixed(2)}px`);
    }
    host.dataset.picaReady = "true";
  }

  sheet.setRules(rules(sheet.selector, props));
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
        sheet.setRules(rules(sheet.selector, props));
      }
      loop.update({ paused: props.paused, time: props.time, fps: props.fps });
      loop.redraw();
    },
    destroy() {
      loop.destroy();
      sheet.destroy();
      lines.remove();
      delete host.dataset.picaReady;
    },
  };
};

/** The scoped rule for this host's layer: fine horizontal lines from a repeating gradient, plus an optional
 *  roll band whose position lib/loop.ts drives through one custom property. Both live in the layer's
 *  background, so the overlay is a single node. */
function rules(selector: string, p: ScanlinesProps): string {
  const thickness = Math.min(p.thickness, p.spacing);
  const ink = cssVar("fg");
  const stripes = `repeating-linear-gradient(to bottom, ${ink} 0, ${ink} ${thickness}px, transparent ${thickness}px, transparent ${p.spacing}px)`;
  const declarations = [`opacity:${p.opacity}`];
  if (p.roll) {
    declarations.push(
      `background-image:${ROLL_BAND},${stripes}`,
      `background-size:100% 100%,100% ${p.spacing}px`,
      "background-repeat:repeat-y,repeat-y",
      `background-position:0 var(${ROLL_VAR},0px),0 0`,
    );
  } else {
    declarations.push(`background-image:${stripes}`, `background-size:100% ${p.spacing}px`, "background-repeat:repeat-y");
  }
  return `${selector} > div[data-pica]{${declarations.join(";")}}`;
}
return { mount, defaults };
})();

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

// registry/sections/cyberpunk-hero/core.ts
export interface CyberpunkHeroAction {
  /** Text on the link. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface CyberpunkHeroProps extends MotionProps {
  /** The headline, which the composed glitch text tears sideways in rare short bursts. Empty hides it. */
  headline: string;
  /** The line under the headline, set in the page's own font. Empty hides it. */
  subhead: string;
  /** The mono status line above the headline, which a blinking block cursor ends. Empty hides it. */
  kicker: string;
  /** Calls to action, drawn as links. At most three show, and the first fills with the foreground. */
  actions: readonly CyberpunkHeroAction[];
  /** Horizontal alignment of the content column within the host. */
  align: "start" | "center";
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
  /** Mono readouts stacked in the corners, ticking once a second with the session clock. */
  telemetry: boolean;
  /** The scanline overlay drawn over the whole section, with a slow roll band. */
  scanlines: boolean;
  /** How strongly the scanlines show, from 0 to 1. */
  intensity: number;
}

export const defaults: CyberpunkHeroProps = {
  headline: "Still transmitting.",
  subhead: "The session has been open for 47 days. Every line still answers.",
  kicker: "TERM 09 // UPLINK HELD",
  actions: [
    { label: "Browse components", href: "#components" },
    { label: "Read the docs", href: "#docs" },
  ],
  align: "start",
  minHeight: 68,
  telemetry: true,
  scanlines: true,
  intensity: 0.55,
  paused: false,
  time: null,
  seed: 1,
};

/** Corner positions in the order readouts are written: top left, top right, bottom left, bottom right. */
const POSITIONS = ["tl", "tr", "bl", "br"] as const;
/** Which corner's first line carries the one accent figure: the top right, which survives the narrow layout. */
const ACCENT_CORNER = 1;
/** Milliseconds from the start of one headline tear to the start of the next: occasional, seconds apart. */
const TEAR_INTERVAL = 4800;
/** How long one tear lasts. Brief enough that the headline never reads as broken. */
const TEAR_BURST = 240;
/** Frames per second the tearing runs at. One burst draws the same strips on every frame, so a low ceiling
 *  builds each burst once or twice instead of seven times over, with no change in what shows. */
const TEAR_FPS = 8;
/** Milliseconds the roll band takes to cross the full height once before it repeats. */
const ROLL_MS = 14_000;
/** Milliseconds the block cursor spends in each half of one blink. */
const CURSOR_MS = 530;
/** Below this width the bottom corners drop, leaving the top pair, so they never crowd the copy. */
const NARROW = "44rem";
/** Inset for the corner readouts, close to the content padding so the frame reads as one grid. */
const INSET = "clamp(1.1rem, 3.5vw, 3rem)";
/** The roll band's own gradient: transparent above and below a soft ink peak at its center, the same band
 *  the composed overlay drew. Painted once into the band element's own layer, then only moved. */
const ROLL_BAND = `linear-gradient(to bottom, transparent 0%, transparent 38%, ${cssVar("fg")} 50%, transparent 62%, transparent 100%)`;

/** Keeps a 0 to 1 prop inside its range. */
function unit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Keeps minHeight inside a sane range even if a caller passes something outside it. */
function clampVh(minHeight: number): number {
  return Math.min(100, Math.max(0, minHeight));
}

/** Two digits, so the readout's figures never change width as they tick. */
function pad2(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

/** A four digit session id in upper case hex. */
function hex4(n: number): string {
  return Math.floor(n).toString(16).toUpperCase().padStart(4, "0").slice(-4);
}

/** The overlay's strength on a restrained range, since most of the frame must stay near the ground. It
 *  lives on the layer that wraps the stripes and the roll band, so one opacity dims both the way the
 *  composed overlay's single element did. */
function scanOpacity(intensity: number): string {
  return (0.05 + unit(intensity) * 0.3).toFixed(3);
}

/** Props for the composed scanlines: the stripes alone, painted once and then never touched. The roll band
 *  is this section's own element instead, moved by a composited transform: sliding background-position
 *  repainted the whole overlay every frame, which was the long task the review measured. */
function scanProps(p: CyberpunkHeroProps): Partial<typeof scanlines.defaults> {
  return { paused: p.paused, time: p.time, seed: p.seed, opacity: 1, roll: false, fps: 6 };
}

/** Props for the composed glitch text: the headline tears rarely and briefly, in the page's own font,
 *  which "inherit" passes down from the heading the layer sits in. */
function tearProps(p: CyberpunkHeroProps): Partial<typeof glitchText.defaults> {
  return { text: p.headline, interval: TEAR_INTERVAL, burst: TEAR_BURST, intensity: 0.6, fontFamily: "inherit", fps: TEAR_FPS, paused: p.paused, time: p.time, seed: p.seed };
}

/** Fake but plausible telemetry, one pair of lines per corner. Everything is a pure function of the seed
 *  and the epoch second: the session id, uptime, and packet count hold their base values while jittered
 *  figures redraw once a second. */
function readouts(seed: number, epoch: number): string[][] {
  const jitter = (lane: number): number => createRng(hashSeed(seed, epoch, lane))();
  const base = createRng(hashSeed(seed, 0, 77));
  const session = Math.floor(base() * 0xffff);
  const up = Math.floor(base() * 4_000_000) + epoch;
  const pkt = 400_000 + Math.floor(base() * 800_000) + epoch * (120 + Math.floor(base() * 300));
  const dd = Math.floor(up / 86400);
  const hh = Math.floor(up / 3600) % 24;
  const mm = Math.floor(up / 60) % 60;
  const ss = up % 60;
  return [
    [`SES ${hex4(session)}`, `UP ${pad2(dd)}:${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`],
    [`SIG ${(93 + jitter(1) * 6).toFixed(1)}`, `DRP ${(jitter(2) * 0.6).toFixed(1)}%`],
    [`PKT ${pkt}`, `RTT ${(8 + jitter(3) * 30).toFixed(0)}MS`],
    [`MEM ${(52 + jitter(4) * 18).toFixed(1)}%`, `TMP ${(36 + jitter(5) * 9).toFixed(1)}°C`],
  ];
}

/** Creates one element the core owns, marked for identification and scoped styling. */
function part<K extends keyof HTMLElementTagNameMap>(tag: K, name: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute(`data-pica-${name}`, "");
  return node;
}

/** Layout for the host, the calls to action, and the corner readouts. The minimum height goes in a
 *  :where() rule, which carries no specificity at all, so a page that gives this host a height of its
 *  own wins without having to fight an inline style. Corners and lines are square, dimmed foreground
 *  mixes rather than the muted token, and the accent appears on exactly one readout figure. */
function rules(s: string, p: CyberpunkHeroProps): string {
  const fg = cssVar("fg");
  const bg = cssVar("bg");
  const accent = cssVar("accent");
  const dim = `color-mix(in srgb, ${fg} 62%, transparent)`;
  const faint = `color-mix(in srgb, ${fg} 60%, transparent)`;
  const hairline = `color-mix(in srgb, ${fg} 42%, transparent)`;
  const edge = p.align === "center" ? "center" : "flex-start";
  const textAlign = p.align === "center" ? "center" : "start";
  return [
    `:where(${s}){min-height:${clampVh(p.minHeight)}vh}`,
    `${s}{box-sizing:border-box;position:relative;isolation:isolate;display:flex;flex-direction:column;justify-content:center;align-items:${edge};gap:clamp(0.9rem,2.5vh,1.4rem);padding:clamp(3.5rem,9vh,6rem) clamp(1.25rem,5vw,4.5rem);color:${fg};background-color:${bg};overflow-wrap:break-word}`,
    `${s} > :not([data-pica]){margin:0;max-width:44rem;text-align:${textAlign}}`,
    `${s} > [data-pica-head]{display:flex;flex-direction:column;align-items:${edge};gap:0.55em;width:100%;max-width:44rem;text-align:${textAlign}}`,
    `${s} [data-pica-kicker]{margin:0;font-family:${GRID_FONT};font-size:0.72rem;line-height:1.6;letter-spacing:0.12em;text-transform:uppercase;color:${dim}}`,
    `${s} [data-pica-cursor]{display:inline-block;margin-left:0.35em;color:${fg}}`,
    `${s} [data-pica-headline]{margin:0;max-width:100%;font-size:clamp(1.9rem,6vw,4rem);line-height:1.05;font-weight:700;letter-spacing:-0.015em;overflow:hidden}`,
    `${s} [data-pica-subhead]{margin:0;max-width:34rem;font-size:clamp(1rem,1.4vw,1.15rem);line-height:1.55;color:${dim}}`,
    `${s} > [data-pica-actions]{display:flex;flex-wrap:wrap;align-items:center;gap:0.7em;width:100%;max-width:44rem;justify-content:${edge}}`,
    `${s} > [data-pica-actions]:empty{display:none}`,
    `${s} > [data-pica-actions] a{appearance:none;text-decoration:none;font-family:${GRID_FONT};font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;line-height:1.2;padding:0.8em 1.3em;display:inline-flex;align-items:center;border:1px solid ${hairline};border-radius:0;color:${fg};background:transparent;cursor:pointer}`,
    `${s} > [data-pica-actions] a[data-variant="solid"]{color:${fg};background:currentColor;border-color:currentColor}`,
    `${s} > [data-pica-actions] a[data-variant="solid"] > [data-pica-ink]{color:${cssOn("fg")}}`,
    `${s} > [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, currentColor 85%, transparent)}`,
    `${s} > [data-pica-actions] a[data-variant="outline"]:hover{background:color-mix(in srgb, ${fg} 10%, transparent);border-color:${fg}}`,
    `${s} > [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${s} > [data-pica-corners]{position:absolute;inset:0;z-index:1;pointer-events:none}`,
    `${s} [data-pica-corner]{position:absolute;display:flex;flex-direction:column;gap:0.2em;font-family:${GRID_FONT};font-size:0.62rem;line-height:1.6;letter-spacing:0.08em;font-variant-numeric:tabular-nums;color:${faint};white-space:pre}`,
    `${s} [data-pica-corner][data-pica-pos="tl"]{top:${INSET};left:${INSET}}`,
    `${s} [data-pica-corner][data-pica-pos="tr"]{top:${INSET};right:${INSET};text-align:right;align-items:flex-end}`,
    `${s} [data-pica-corner][data-pica-pos="bl"]{bottom:${INSET};left:${INSET}}`,
    `${s} [data-pica-corner][data-pica-pos="br"]{bottom:${INSET};right:${INSET};text-align:right;align-items:flex-end}`,
    `${s} [data-pica-hot]{color:${accent}}`,
    // The band is twice the host's height, hung so it always covers the frame, and the clock shifts it by
    // a translateY in percent of its own box: half of it is exactly the host's height, which is the shift
    // the old background-position math needed, and a percentage needs no layout read on the frame.
    `${s} [data-pica-band]{position:absolute;top:-100%;left:0;right:0;height:200%;z-index:1;will-change:transform;background-image:${ROLL_BAND};background-size:100% 50%;background-repeat:repeat-y}`,
    `@media (max-width: ${NARROW}){${s} [data-pica-corner][data-pica-pos="bl"],${s} [data-pica-corner][data-pica-pos="br"]{display:none}}`,
  ].join("\n");
}

/** Rebuilds the action links from JSON: at most three, the first solid in the foreground, the rest hairline. */
function renderActions(container: HTMLElement, actions: readonly CyberpunkHeroAction[]): void {
  container.replaceChildren();
  for (const [i, action] of actions.slice(0, 3).entries()) {
    const a = document.createElement("a");
    a.setAttribute("data-pica", "");
    a.dataset.variant = i === 0 ? "solid" : "outline";
    a.href = action.href;
    if (i === 0) {
      // The solid link's own color is the fill, painted through currentColor, so the contrast ink has to
      // live on a nested span: cssOn(fg) resolves against the link's color, which is the fill itself.
      const ink = document.createElement("span");
      ink.setAttribute("data-pica", "");
      ink.setAttribute("data-pica-ink", "");
      ink.textContent = action.label;
      a.append(ink);
    } else {
      a.textContent = action.label;
    }
    container.append(a);
  }
}

export const mount: Mount<CyberpunkHeroProps> = (host, initial = {}) => {
  let props: CyberpunkHeroProps = { ...defaults, ...initial };
  const sheet = scope(host);

  // The copy column goes before the page's own children, so the section reads status line, headline,
  // subhead, wrapped content, then the calls to action. Children are never moved or touched.
  const head = part("div", "head");
  const kickerEl = part("p", "kicker");
  const kickerText = document.createTextNode(props.kicker);
  const cursorEl = part("span", "cursor");
  cursorEl.setAttribute("aria-hidden", "true");
  cursorEl.textContent = "█";
  kickerEl.append(kickerText, cursorEl);
  const headlineEl = part("h1", "headline");
  const subheadEl = part("p", "subhead");
  head.append(kickerEl, headlineEl, subheadEl);
  host.prepend(head);

  const actionsEl = part("div", "actions");
  const cornersEl = part("div", "corners");
  cornersEl.setAttribute("aria-hidden", "true");
  const rowEls = POSITIONS.map((pos, i) => {
    const corner = part("div", "corner");
    corner.setAttribute("data-pica-pos", pos);
    const rows = [0, 1].map((j) => {
      const row = document.createElement("div");
      row.setAttribute("data-pica", "");
      if (i === ACCENT_CORNER && j === 0) row.setAttribute("data-pica-hot", "");
      corner.append(row);
      return row;
    });
    cornersEl.append(corner);
    return rows;
  });
  host.append(actionsEl, cornersEl);

  // The scanline host goes on last, so its overlay paints above the copy, the corners, and the content.
  // The band is a span rather than a div: the composed core styles every div[data-pica] child of its host
  // as a stripe element, and the band must keep its own gradient.
  let scanLayer: Layer | null = null;
  let scan: ReturnType<typeof scanlines.mount> | null = null;
  let bandEl: HTMLElement | null = null;
  function mountScan(): void {
    scanLayer = layer(host, "over");
    scanLayer.el.style.overflow = "hidden";
    scanLayer.el.style.opacity = scanOpacity(props.intensity);
    scan = scanlines.mount(scanLayer.el, scanProps(props));
    bandEl = part("span", "band");
    scanLayer.el.append(bandEl);
  }
  function dropScan(): void {
    scan?.destroy();
    scan = null;
    scanLayer?.remove();
    scanLayer = null;
    bandEl = null;
  }
  if (props.scanlines) mountScan();

  // The headline is the glitch text's host: it keeps the heading's role, a hidden copy carries the text
  // to assistive technology, and the tearing draws into a layer hidden from it.
  const tear = glitchText.mount(headlineEl, tearProps(props));

  let epoch = -1;
  function renderReadouts(): void {
    const rows = readouts(props.seed, Math.max(0, epoch));
    rowEls.forEach((pair, i) => {
      const lines = rows[i] ?? [];
      pair.forEach((el, j) => {
        el.textContent = lines[j] ?? "";
      });
    });
  }

  // The section's own clock moves the roll band, blinks the cursor, and ticks the readouts once a second.
  // Everything on the frame is a style write or a text swap; the pictures underneath never redraw.
  let cursorOn = true;
  function draw(t: number): void {
    if (bandEl) {
      const phase = (((t % ROLL_MS) + ROLL_MS) % ROLL_MS) / ROLL_MS;
      bandEl.style.transform = `translateY(${(phase * 50).toFixed(3)}%)`;
    }
    const on = Math.floor(t / CURSOR_MS) % 2 === 0;
    if (on !== cursorOn) {
      cursorOn = on;
      cursorEl.style.opacity = on ? "1" : "0";
    }
    const next = Math.floor(t / 1000);
    if (next !== epoch) {
      epoch = next;
      if (props.telemetry) renderReadouts();
    }
    host.dataset.picaReady = "true";
  }
  const clock = createLoop({ el: host, fps: 30, paused: props.paused, time: props.time, still: 0, frame: draw });

  sheet.setRules(rules(sheet.selector, props));
  kickerEl.hidden = props.kicker.trim() === "";
  subheadEl.textContent = props.subhead;
  subheadEl.hidden = props.subhead.trim() === "";
  headlineEl.hidden = props.headline.trim() === "";
  cornersEl.hidden = !props.telemetry;
  renderActions(actionsEl, props.actions);
  renderReadouts();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      const motion = changed(before, props, ["paused", "time", "seed"]);

      if (props.headline !== before.headline) headlineEl.hidden = props.headline.trim() === "";
      if (motion || props.headline !== before.headline) tear.update(tearProps(props));
      if (props.kicker !== before.kicker) {
        kickerText.nodeValue = props.kicker;
        kickerEl.hidden = props.kicker.trim() === "";
      }
      if (props.subhead !== before.subhead) {
        subheadEl.textContent = props.subhead;
        subheadEl.hidden = props.subhead.trim() === "";
      }
      if (!sameJson(before.actions, props.actions)) renderActions(actionsEl, props.actions);
      if (props.scanlines !== before.scanlines) {
        if (props.scanlines) {
          mountScan();
          clock.redraw();
        } else {
          dropScan();
        }
      } else {
        if (scan && motion) scan.update(scanProps(props));
        if (scanLayer && props.intensity !== before.intensity) scanLayer.el.style.opacity = scanOpacity(props.intensity);
      }
      if (props.telemetry !== before.telemetry) {
        cornersEl.hidden = !props.telemetry;
        if (props.telemetry) renderReadouts();
      }
      if (props.align !== before.align || props.minHeight !== before.minHeight) {
        sheet.setRules(rules(sheet.selector, props));
      }
      if (props.seed !== before.seed) renderReadouts();
      clock.update({ paused: props.paused, time: props.time });
    },
    destroy() {
      clock.destroy();
      tear.destroy();
      dropScan();
      head.remove();
      actionsEl.remove();
      cornersEl.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};

// registry/sections/cyberpunk-hero/index.tsx
export type CyberpunkHeroComponentProps = Partial<CyberpunkHeroProps> & WrapperProps & { children?: ReactNode };

/** A hero that reads as a terminal held open too long: scanlines, a tearing headline, and corner readouts. */
export function CyberpunkHero({ className, style, palette, children, ...props }: CyberpunkHeroComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
