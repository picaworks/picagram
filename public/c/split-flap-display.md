# Split-Flap Display

> A short label in aligned split-flap cells, where only the characters that changed turn through the drum to their new glyph.

Category: motion. Tags: split-flap, departure board, flip, label, text, mechanical. Animated. Holds a still frame under prefers-reduced-motion, and stops offscreen and in hidden tabs. Size: 2.7 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/split-flap-display.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `text` | string | `"SPLIT FLAP"` | The label to show. Assistive technology reads it whole, and every cell lands on its own character. |
| `duration` | number | `2400` | Milliseconds one cell takes to turn through the whole drum. A cell turns only as far as its glyph needs, so most changes finish sooner. |
| `chars` | string | `" ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:.-"` | The drum: the glyphs in the order a cell turns through them. A cell only turns forward, and a character the drum lacks becomes one last flap. |
| `label` | string | `""` | A small caption above the cells, read before the text and set in the host's own font. Empty shows none. |
| `paused` | boolean | `false` | Stop animating and hold the current frame. |
| `time` | number \| null | `null` | Render exactly this animation time, in milliseconds, and do not animate. Null animates. |
| `seed` | number | `1` | Seed for every random choice, so the same seed always draws the same frame. |

## Colors

Draws with `--pica-fg`, `--pica-bg`, `--pica-muted`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Split-Flap Display · split-flap-display
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

// registry/motion/split-flap-display/core.ts
export interface SplitFlapDisplayProps extends MotionProps {
  /** The label to show. Assistive technology reads it whole, and every cell lands on its own character. */
  text: string;
  /** Milliseconds one cell takes to turn through the whole drum. A cell turns only as far as its glyph needs, so most changes finish sooner. */
  duration: number;
  /** The drum: the glyphs in the order a cell turns through them. A cell only turns forward, and a character the drum lacks becomes one last flap. */
  chars: string;
  /** A small caption above the cells, read before the text and set in the host's own font. Empty shows none. */
  label: string;
}

export const defaults: SplitFlapDisplayProps = {
  text: "SPLIT FLAP",
  duration: 2400,
  // A blank flap first, so a cell at rest is empty, then letters, digits, and the marks a time or a code needs.
  chars: " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:.-",
  label: "",
  paused: false,
  time: null,
  seed: 1,
};

/** Frames per second a turn is sampled at. A flap is a glyph swap, so this only bounds how finely it is drawn. */
const FPS = 30;
/** The longest a cell waits before its first flap, as a share of the duration. Each cell draws its own wait from the seed. */
const STAGGER = 0.15;
/** The animation time reduced motion holds: far past every landing, so each cell rests on its own character. */
const RESTING = 1e9;
const WHITESPACE = /\s/;

const EDGE = `color-mix(in srgb,${cssVar("muted")} 55%,transparent)`;
const HINGE = `color-mix(in srgb,${cssVar("muted")} 35%,transparent)`;
const ROW = `display:flex;flex-wrap:wrap;gap:2px;max-width:100%;user-select:none;font-family:${GRID_FONT}`;
/** One flap: a fixed box, so the row stays on a grid whatever it shows, with a hairline hinge across its middle. */
const CELL = [
  "box-sizing:border-box",
  "flex:none",
  "width:.95em",
  "height:1.4em",
  "line-height:calc(1.4em - 2px)",
  "text-align:center",
  `color:${cssVar("fg")}`,
  `border:1px solid ${EDGE}`,
  `background:linear-gradient(transparent calc(50% - .5px),${HINGE} calc(50% - .5px) calc(50% + .5px),transparent calc(50% + .5px)),${cssVar("bg")}`,
].join(";");
const CAPTION = `display:block;margin-bottom:.6em;font-size:max(.4em,11px);line-height:1.2;letter-spacing:.04em;text-transform:uppercase;color:${cssVar("muted")}`;

/** How one cell gets from the glyph it shows to the one it must land on. */
interface Turn {
  /** The glyph it shows until its first flap. */
  from: string;
  /** Every glyph it turns through, ending on the one it lands on. Empty when it already shows that glyph. */
  path: readonly string[];
  /** Milliseconds it waits before its first flap. */
  wait: number;
}

/** The drum as single glyphs, each once, falling back to the default drum when empty. */
function toDrum(chars: string): string[] {
  return [...new Set(chars.length > 0 ? chars : defaults.chars)];
}

/** A text as one glyph per cell. Any whitespace is a blank flap. */
function toGlyphs(text: string): string[] {
  return Array.from(text, (ch) => (WHITESPACE.test(ch) ? " " : ch));
}

/** The glyphs a cell shows, in order, turning forward from `from` until it lands on `to`. A glyph the drum
 *  lacks is one last flap after the rest of the drum. */
function route(drum: readonly string[], from: string, to: string): string[] {
  const out: string[] = [];
  if (from === to) return out;
  const goal = drum.indexOf(to);
  let at = drum.indexOf(from);
  if (goal < 0) {
    for (at += 1; at < drum.length; at++) out.push(drum[at] ?? to);
    out.push(to);
    return out;
  }
  do {
    at = (at + 1) % drum.length;
    out.push(drum[at] ?? to);
  } while (at !== goal);
  return out;
}

export const mount: Mount<SplitFlapDisplayProps> = (host, initial = {}) => {
  let props: SplitFlapDisplayProps = { ...defaults, ...initial };
  let drum = toDrum(props.chars);
  let target = toGlyphs(props.text);
  // What each cell showed when the current change began. A cell with no entry begins on the blank flap.
  let origin: string[] = [];
  let turns: Turn[] = [];
  let flapMs = 1;
  let changes = 0;
  let settled = false;
  let loop: Loop | null = null;
  let caption: HTMLElement | null = null;
  const cells: HTMLElement[] = [];
  const shown: string[] = [];

  // The host keeps no role, so a heading around it stays a heading. Assistive technology reads the final
  // text from a hidden copy, and the cells draw into a layer hidden from it.
  const text = animatedText(host, props.text);
  const row = text.layer;
  row.style.cssText = ROW;

  /** Adds or removes cells until the row has one per glyph. */
  function fit(count: number): void {
    while (cells.length < count) {
      const cell = document.createElement("span");
      cell.setAttribute("data-pica", "");
      cell.style.cssText = CELL;
      row.append(cell);
      cells.push(cell);
      shown.push("");
    }
    while (cells.length > count) {
      cells.pop()?.remove();
      shown.pop();
    }
  }

  /** Shows the caption, or removes it when the label is empty. It sits first, so it is read first. */
  function setCaption(): void {
    if (props.label === "") {
      caption?.remove();
      caption = null;
      return;
    }
    if (!caption) {
      caption = document.createElement("span");
      caption.setAttribute("data-pica", "");
      caption.style.cssText = CAPTION;
      host.prepend(caption);
    }
    caption.textContent = props.label;
  }

  /** Works out each cell's turn from `origin` to `target`. A cell that already shows its glyph has no turn,
   *  so it never moves. Every cell flips at the same speed, so the ones with less to turn land first. */
  function plan(): void {
    const blank = drum[0] ?? " ";
    flapMs = Math.max(1, props.duration / drum.length);
    turns = target.map((to, i) => {
      const from = origin[i] || blank;
      const path = route(drum, from, to);
      const wait = path.length > 0 ? createRng(hashSeed(props.seed, i, changes))() * props.duration * STAGGER : 0;
      return { from, path, wait };
    });
  }

  /** The glyph cell `i` shows `t` milliseconds into the change. */
  function glyphAt(i: number, t: number): string {
    const turn = turns[i];
    const to = target[i] ?? " ";
    if (!turn || turn.path.length === 0) return to;
    if (!(t >= turn.wait)) return turn.from;
    const flaps = Math.min(turn.path.length, Math.floor((t - turn.wait) / flapMs) + 1);
    return turn.path[flaps - 1] ?? to;
  }

  /** Holds the loop once every cell has landed, so a settled board costs no frames, and releases it on the
   *  next change. The paused prop holds it either way. */
  function hold(): void {
    loop?.update({ paused: props.paused || settled });
  }

  function draw(t: number): void {
    let pending = 0;
    for (const [i, cell] of cells.entries()) {
      const glyph = glyphAt(i, t);
      if (glyph !== target[i]) pending++;
      if (glyph !== shown[i]) {
        shown[i] = glyph;
        cell.textContent = glyph;
      }
    }
    if ((pending === 0) !== settled) {
      settled = pending === 0;
      hold();
    }
    if (host.dataset.picaReady !== "true") host.dataset.picaReady = "true";
  }

  /** Starts a change from what the cells show now to the new text, on a clock that starts again at zero. A
   *  pinned time then shows that moment of this change. */
  function begin(): void {
    origin = shown.slice();
    target = toGlyphs(props.text);
    changes += 1;
    fit(target.length);
    plan();
    settled = false;
    loop?.update({ time: 0 });
    loop?.update({ time: props.time, paused: props.paused || settled });
    loop?.redraw();
  }

  setCaption();
  fit(target.length);
  plan();
  // The first change is the board coming up: every cell begins on the blank flap and turns to its glyph.
  loop = createLoop({ el: host, fps: FPS, paused: props.paused, time: props.time, still: RESTING, frame: draw });
  if (settled) hold();

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.label !== before.label) setCaption();
      if (props.chars !== before.chars) drum = toDrum(props.chars);
      if (props.text !== before.text) {
        text.setText(props.text);
        begin();
        return;
      }
      // A settled board has nothing left to turn, so a new speed, seed, or drum applies from the next change.
      if (!settled && (props.chars !== before.chars || props.duration !== before.duration || props.seed !== before.seed)) plan();
      loop?.update({ time: props.time, paused: props.paused || settled });
    },
    destroy() {
      loop?.destroy();
      loop = null;
      text.remove();
      caption?.remove();
      delete host.dataset.picaReady;
    },
  };
};

// registry/motion/split-flap-display/index.tsx
export type SplitFlapDisplayComponentProps = Partial<SplitFlapDisplayProps> & WrapperProps;

/** A short label in aligned split-flap cells, where only the characters that changed turn through the drum. */
export function SplitFlapDisplay({ className, style, palette, ...props }: SplitFlapDisplayComponentProps) {
  const ref = usePica(mount, props);
  return <span ref={ref} className={className} style={{ display: "inline-block", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Split-Flap Display · split-flap-display
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Split-Flap Display · Pica</title>
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
<div class="pica-stage"><span id="pica"></span></div>
<script>
"use strict";
var PicaSplitFlapDisplay = (() => {
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

  // registry/motion/split-flap-display/core.ts
  var core_exports = {};
  __export(core_exports, {
    defaults: () => defaults,
    mount: () => mount
  });

  // lib/a11y.ts
  function hiddenText(text) {
    const span = document.createElement("span");
    span.textContent = text;
    span.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";
    return span;
  }
  function animatedText(host, text, tag = "span") {
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
      }
    };
  }

  // lib/font.ts
  var GRID_FONT = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

  // lib/loop.ts
  var MAX_STEP_MS = 100;
  function createLoop(options) {
    const { el, frame } = options;
    let state = { paused: options.paused, time: options.time, fps: options.fps, still: options.still };
    let t = 0;
    let last = 0;
    let raf = 0;
    let onScreen = true;
    let tabVisible = typeof document === "undefined" || document.visibilityState !== "hidden";
    const motionQuery = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
    let reduced = motionQuery?.matches ?? false;
    const animating = () => !state.paused && state.time === null && !reduced && onScreen && tabVisible;
    const heldTime = () => state.time !== null ? state.time : reduced ? state.still : t;
    function tick(now) {
      raf = 0;
      if (!animating()) return;
      if (last === 0) last = now;
      const elapsed = now - last;
      if (elapsed >= 1e3 / Math.max(1, state.fps) - 1) {
        t += Math.min(elapsed, MAX_STEP_MS);
        last = now;
        frame(t, reduced);
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
      if (!go && drawHeld) frame(heldTime(), reduced);
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
    frame(heldTime(), reduced);
    sync(false);
    return {
      update(next) {
        const timeChanged = next.time !== void 0 && next.time !== state.time;
        state = { ...state, ...next };
        if (state.time !== null) t = state.time;
        sync(timeChanged || next.paused !== void 0 || next.still !== void 0);
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
  function hashMix(h) {
    h = Math.imul(h ^ h >>> 16, 2146121005);
    h = Math.imul(h ^ h >>> 15, 2221713035);
    return (h ^ h >>> 16) >>> 0;
  }
  function hashSeed(seed, a, b = 0) {
    return hashMix(hashMix(hashMix(seed >>> 0) ^ a >>> 0) ^ b >>> 0);
  }

  // registry/motion/split-flap-display/core.ts
  var defaults = {
    text: "SPLIT FLAP",
    duration: 2400,
    // A blank flap first, so a cell at rest is empty, then letters, digits, and the marks a time or a code needs.
    chars: " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:.-",
    label: "",
    paused: false,
    time: null,
    seed: 1
  };
  var FPS = 30;
  var STAGGER = 0.15;
  var RESTING = 1e9;
  var WHITESPACE = /\s/;
  var EDGE = `color-mix(in srgb,${cssVar("muted")} 55%,transparent)`;
  var HINGE = `color-mix(in srgb,${cssVar("muted")} 35%,transparent)`;
  var ROW = `display:flex;flex-wrap:wrap;gap:2px;max-width:100%;user-select:none;font-family:${GRID_FONT}`;
  var CELL = [
    "box-sizing:border-box",
    "flex:none",
    "width:.95em",
    "height:1.4em",
    "line-height:calc(1.4em - 2px)",
    "text-align:center",
    `color:${cssVar("fg")}`,
    `border:1px solid ${EDGE}`,
    `background:linear-gradient(transparent calc(50% - .5px),${HINGE} calc(50% - .5px) calc(50% + .5px),transparent calc(50% + .5px)),${cssVar("bg")}`
  ].join(";");
  var CAPTION = `display:block;margin-bottom:.6em;font-size:max(.4em,11px);line-height:1.2;letter-spacing:.04em;text-transform:uppercase;color:${cssVar("muted")}`;
  function toDrum(chars) {
    return [...new Set(chars.length > 0 ? chars : defaults.chars)];
  }
  function toGlyphs(text) {
    return Array.from(text, (ch) => WHITESPACE.test(ch) ? " " : ch);
  }
  function route(drum, from, to) {
    const out = [];
    if (from === to) return out;
    const goal = drum.indexOf(to);
    let at = drum.indexOf(from);
    if (goal < 0) {
      for (at += 1; at < drum.length; at++) out.push(drum[at] ?? to);
      out.push(to);
      return out;
    }
    do {
      at = (at + 1) % drum.length;
      out.push(drum[at] ?? to);
    } while (at !== goal);
    return out;
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    let drum = toDrum(props.chars);
    let target = toGlyphs(props.text);
    let origin = [];
    let turns = [];
    let flapMs = 1;
    let changes = 0;
    let settled = false;
    let loop = null;
    let caption = null;
    const cells = [];
    const shown = [];
    const text = animatedText(host, props.text);
    const row = text.layer;
    row.style.cssText = ROW;
    function fit(count) {
      while (cells.length < count) {
        const cell = document.createElement("span");
        cell.setAttribute("data-pica", "");
        cell.style.cssText = CELL;
        row.append(cell);
        cells.push(cell);
        shown.push("");
      }
      while (cells.length > count) {
        cells.pop()?.remove();
        shown.pop();
      }
    }
    function setCaption() {
      if (props.label === "") {
        caption?.remove();
        caption = null;
        return;
      }
      if (!caption) {
        caption = document.createElement("span");
        caption.setAttribute("data-pica", "");
        caption.style.cssText = CAPTION;
        host.prepend(caption);
      }
      caption.textContent = props.label;
    }
    function plan() {
      const blank = drum[0] ?? " ";
      flapMs = Math.max(1, props.duration / drum.length);
      turns = target.map((to, i) => {
        const from = origin[i] || blank;
        const path = route(drum, from, to);
        const wait = path.length > 0 ? createRng(hashSeed(props.seed, i, changes))() * props.duration * STAGGER : 0;
        return { from, path, wait };
      });
    }
    function glyphAt(i, t) {
      const turn = turns[i];
      const to = target[i] ?? " ";
      if (!turn || turn.path.length === 0) return to;
      if (!(t >= turn.wait)) return turn.from;
      const flaps = Math.min(turn.path.length, Math.floor((t - turn.wait) / flapMs) + 1);
      return turn.path[flaps - 1] ?? to;
    }
    function hold() {
      loop?.update({ paused: props.paused || settled });
    }
    function draw(t) {
      let pending = 0;
      for (const [i, cell] of cells.entries()) {
        const glyph = glyphAt(i, t);
        if (glyph !== target[i]) pending++;
        if (glyph !== shown[i]) {
          shown[i] = glyph;
          cell.textContent = glyph;
        }
      }
      if (pending === 0 !== settled) {
        settled = pending === 0;
        hold();
      }
      if (host.dataset.picaReady !== "true") host.dataset.picaReady = "true";
    }
    function begin() {
      origin = shown.slice();
      target = toGlyphs(props.text);
      changes += 1;
      fit(target.length);
      plan();
      settled = false;
      loop?.update({ time: 0 });
      loop?.update({ time: props.time, paused: props.paused || settled });
      loop?.redraw();
    }
    setCaption();
    fit(target.length);
    plan();
    loop = createLoop({ el: host, fps: FPS, paused: props.paused, time: props.time, still: RESTING, frame: draw });
    if (settled) hold();
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        if (props.label !== before.label) setCaption();
        if (props.chars !== before.chars) drum = toDrum(props.chars);
        if (props.text !== before.text) {
          text.setText(props.text);
          begin();
          return;
        }
        if (!settled && (props.chars !== before.chars || props.duration !== before.duration || props.seed !== before.seed)) plan();
        loop?.update({ time: props.time, paused: props.paused || settled });
      },
      destroy() {
        loop?.destroy();
        loop = null;
        text.remove();
        caption?.remove();
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
  var initial = Object.assign({}, {"text":"ON TIME","label":"Status"}, window.PICA_PROPS || {});
  var instance = PicaSplitFlapDisplay.mount(host, take(initial));
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
