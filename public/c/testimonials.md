# Testimonials

> Quotes shown as a grid of cards, or as one quote at a time that resolves from scrambled glyphs.

Category: sections. Tags: testimonials, quotes, carousel, section, social proof. Animated. Holds a still frame under prefers-reduced-motion, and stops offscreen and in hidden tabs. Size: 4.9 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/testimonials.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` | readonly Testimonial[] | `[{"quote":"We dropped it into a static page with no build step, and it just worked.","name":"Jordan Ellis","role":"Frontend developer"},{"quote":"The React import matches our own components so closely that nobody noticed the switch.","name":"Priya Nandan","role":"Design engineer"},{"quote":"Our marketing site finally looks drawn instead of templated.","name":"Sam Okafor","role":"Indie hacker"},{"quote":"Every component we tried stayed under budget, even after we added our own styling.","name":"Mina Chen","role":"Product designer"}]` | Quotes to show, each with who said it and their role. |
| `layout` | "grid" \| "rotate" | `"grid"` | "grid" shows every quote as a card. "rotate" shows one quote at a time, with previous and next controls. |
| `columns` | number | `2` | Columns in the grid layout, before it collapses to one column on a narrow host. |
| `interval` | number | `7000` | Milliseconds a quote stays on screen before rotate advances to the next one. |
| `label` | string | `"What people say"` | Accessible name for the section, and for the carousel in rotate layout. |
| `fontFamily` | string | `"\"JetBrains Mono\", \"IBM Plex Mono\", ui-monospace, \"SFMono-Regular\", Menlo, monospace"` | CSS font family stack for names, the initials badge, the nav buttons, and the rotating quote. |
| `paused` | boolean | `false` | Stop animating and hold the current frame. |
| `time` | number \| null | `null` | Render exactly this animation time, in milliseconds, and do not animate. Null animates. |
| `seed` | number | `1` | Seed for every random choice, so the same seed always draws the same frame. |

## Colors

Draws with `--pica-fg`. Set it on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Testimonials · testimonials
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

// registry/ascii/ascii-reveal/core.ts
const asciiReveal = (() => {
interface AsciiRevealProps extends MotionProps {
  /** Text to reveal. Assistive technology reads it whole, never the scramble. */
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

const defaults: AsciiRevealProps = {
  text: "Drawn on a monospace grid.",
  duration: 1600,
  stagger: 0.6,
  // The fallback ramp (STYLE.md) without its leading space, plus four glyphs of their own.
  glyphs: ".:-=+*#%@/\\|_",
  loop: 0,
  fontFamily: GRID_FONT,
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

/** The glyph shown at `position` on scramble frame `frame`, drawn from `pool`. */
function scrambleGlyph(pool: readonly string[], seed: number, position: number, frame: number): string {
  if (pool.length === 0) return " ";
  const draw = createRng(hashSeed(seed, position, frame))();
  return pool[Math.min(pool.length - 1, Math.floor(draw * pool.length))] ?? " ";
}

const mount: Mount<AsciiRevealProps> = (host, initial = {}) => {
  let props: AsciiRevealProps = { ...defaults, ...initial };
  let chars = Array.from(props.text);
  let glyphPool = toGlyphs(props.glyphs);
  let shown = "";

  // The host keeps no role, so a heading around it stays a heading. Assistive technology reads the final
  // text from a hidden copy, and the scramble draws into a layer hidden from it.
  const text = animatedText(host, props.text);
  const visible = text.layer;
  visible.style.whiteSpace = "pre";
  visible.style.fontFamily = props.fontFamily;
  visible.style.color = cssVar("fg");

  /** The text at animation time `t`, in milliseconds. Spaces never scramble, and a time at or past the
   *  duration shows the final text. */
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

  // Under reduced motion the loop holds at the duration, which is always the finished text.
  const loop = createLoop({
    el: host,
    fps: props.fps,
    paused: props.paused,
    time: props.time,
    still: props.duration,
    frame: draw,
  });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.text !== before.text) {
        chars = Array.from(props.text);
        text.setText(props.text);
      }
      if (props.glyphs !== before.glyphs) glyphPool = toGlyphs(props.glyphs);
      if (props.fontFamily !== before.fontFamily) visible.style.fontFamily = props.fontFamily;
      loop.update({ paused: props.paused, time: props.time, fps: props.fps, still: props.duration });
      loop.redraw();
    },
    destroy() {
      loop.destroy();
      text.remove();
      delete host.dataset.picaReady;
    },
  };
};
return { mount, defaults };
})();

// registry/sections/testimonials/core.ts
export interface Testimonial {
  /** The quoted words. */
  quote: string;
  /** Who said it. */
  name: string;
  /** Their role, shown under the name. */
  role: string;
}

export interface TestimonialsProps extends MotionProps {
  /** Quotes to show, each with who said it and their role. */
  items: readonly Testimonial[];
  /** "grid" shows every quote as a card. "rotate" shows one quote at a time, with previous and next controls. */
  layout: "grid" | "rotate";
  /** Columns in the grid layout, before it collapses to one column on a narrow host. */
  columns: number;
  /** Milliseconds a quote stays on screen before rotate advances to the next one. */
  interval: number;
  /** Accessible name for the section, and for the carousel in rotate layout. */
  label: string;
  /** CSS font family stack for names, the initials badge, the nav buttons, and the rotating quote. */
  fontFamily: string;
}

const DEFAULT_ITEMS: readonly Testimonial[] = [
  {
    quote: "We dropped it into a static page with no build step, and it just worked.",
    name: "Jordan Ellis",
    role: "Frontend developer",
  },
  {
    quote: "The React import matches our own components so closely that nobody noticed the switch.",
    name: "Priya Nandan",
    role: "Design engineer",
  },
  {
    quote: "Our marketing site finally looks drawn instead of templated.",
    name: "Sam Okafor",
    role: "Indie hacker",
  },
  {
    quote: "Every component we tried stayed under budget, even after we added our own styling.",
    name: "Mina Chen",
    role: "Product designer",
  },
];

export const defaults: TestimonialsProps = {
  items: DEFAULT_ITEMS,
  layout: "grid",
  columns: 2,
  interval: 7000,
  label: "What people say",
  fontFamily: GRID_FONT,
  paused: false,
  time: null,
  seed: 1,
};

/** How often the rotate timer checks whether a quote's interval has elapsed. Coarse on purpose: nothing
 *  about the countdown itself needs to be smooth, only the composed reveal it triggers does. */
const ROTATE_FPS = 4;

/** Up to two initials from a name, for the badge. Empty when the name is empty. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1] ?? "") : "";
  return (last ? `${first.charAt(0)}${last.charAt(0)}` : first.slice(0, 2)).toUpperCase();
}

/** An element marked as this core's own, with an optional class for the scoped stylesheet to select. */
function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  if (className) node.className = className;
  return node;
}

/** The scoped rules for both layouts. Selectors below `s`, the host's own [data-pica-id] attribute, target
 *  classes this core alone sets on nodes it created, never the host's own className. */
function rules(s: string, p: TestimonialsProps): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  const cols = Math.max(1, Math.min(4, Math.round(p.columns)));
  return [
    `${s}{display:block;color:${fg}}`,
    `${s} ul.tm-grid{display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:1.5rem;margin:0;padding:0;list-style:none}`,
    `@media (max-width:560px){${s} ul.tm-grid{grid-template-columns:1fr}}`,
    `${s} .tm-card{border:1px solid ${fg};margin:0;padding:1.25rem;display:flex;flex-direction:column;gap:0.85rem}`,
    `${s} .tm-quote{margin:0;font-size:1rem;line-height:1.6}`,
    `${s} .tm-empty{margin:0;font-family:${p.fontFamily};color:${muted}}`,
    `${s} .tm-meta{display:flex;align-items:center;gap:0.75rem;margin:0}`,
    `${s} .tm-badge{display:inline-flex;flex:none;align-items:center;justify-content:center;width:2.25em;height:2.25em;border:1px solid ${fg};font-family:${p.fontFamily};font-size:0.75rem;letter-spacing:0.02em}`,
    `${s} .tm-who{display:flex;flex-direction:column;gap:0.15em;min-width:0}`,
    `${s} .tm-name{font-family:${p.fontFamily};font-style:normal;font-size:0.9rem}`,
    `${s} .tm-role{font-family:${p.fontFamily};font-size:0.8rem;color:${muted}}`,
    `${s} .tm-rotate{display:flex;align-items:flex-start;gap:1rem;max-width:44rem}`,
    `${s} .tm-slidewrap{flex:1;min-width:0}`,
    `${s} .tm-slide{display:flex;flex-direction:column;gap:0.85rem}`,
    `${s} .tm-quotehost{display:block;font-size:1.05rem;line-height:1.6;min-width:0}`,
    `${s} .tm-quotehost>span[aria-hidden="true"]{white-space:pre-wrap!important;overflow-wrap:anywhere;display:block}`,
    `${s} .tm-nav{appearance:none;flex:none;width:2.25em;height:2.25em;margin:0;padding:0;border:1px solid ${fg};border-radius:0;background:transparent;color:${fg};font:inherit;font-family:${p.fontFamily};font-size:1rem;line-height:1;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}`,
    `${s} .tm-nav:hover:not(:disabled){background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${s} .tm-nav:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${s} .tm-nav:disabled{opacity:0.45;cursor:not-allowed}`,
  ].join("\n");
}

export const mount: Mount<TestimonialsProps> = (host, initial = {}) => {
  let props: TestimonialsProps = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  const sheet = scope(host);

  let container: HTMLElement | null = null;

  // Rotate layout only.
  let loop: Loop | null = null;
  let child: ReturnType<typeof asciiReveal.mount> | null = null;
  let quoteHost: HTMLDivElement | null = null;
  let liveWrap: HTMLDivElement | null = null;
  let slideEl: HTMLDivElement | null = null;
  let nameEl: HTMLElement | null = null;
  let roleEl: HTMLElement | null = null;
  let badgeEl: HTMLElement | null = null;
  let prevBtn: HTMLButtonElement | null = null;
  let nextBtn: HTMLButtonElement | null = null;
  let onPrev: (() => void) | null = null;
  let onNext: (() => void) | null = null;
  let onEnter: (() => void) | null = null;
  let onLeave: (() => void) | null = null;
  let onFocusIn: (() => void) | null = null;
  let onFocusOut: (() => void) | null = null;
  let index = 0;
  let mountedIndex = -1;
  let anchorT = 0;
  let lastT = 0;
  let hovering = false;
  let focused = false;
  let emptyShown = false;

  function syncPause(): void {
    loop?.update({ paused: props.paused || hovering || focused });
  }

  function updateNavDisabled(): void {
    const disable = props.items.length <= 1;
    for (const button of [prevBtn, nextBtn]) {
      if (!button) continue;
      button.disabled = disable;
      button.setAttribute("aria-disabled", String(disable));
    }
  }

  /** Destroys the current child, mounts a fresh one for item `i` so its reveal restarts from scrambled
   *  glyphs, and updates the surrounding chrome. `announce` controls the live region for this swap. */
  function mountSlide(i: number, localTime: number | null, announce: boolean): void {
    if (!quoteHost) return;
    const item = props.items[i] ?? null;
    child?.destroy();
    mountedIndex = i;
    child = asciiReveal.mount(quoteHost, {
      text: item ? item.quote : "",
      time: localTime,
      seed: hashSeed(props.seed, i),
      paused: props.paused,
      fontFamily: props.fontFamily,
    });
    if (nameEl) nameEl.textContent = item ? item.name : "";
    if (roleEl) roleEl.textContent = item ? item.role : "";
    if (badgeEl) badgeEl.textContent = item ? initials(item.name) : "";
    if (slideEl) slideEl.setAttribute("aria-label", `${i + 1} of ${props.items.length}`);
    if (liveWrap) liveWrap.setAttribute("aria-live", announce ? "polite" : "off");
    updateNavDisabled();
  }

  function showEmptySlide(): void {
    if (emptyShown) return;
    emptyShown = true;
    child?.destroy();
    child = null;
    mountedIndex = -1;
    if (quoteHost) quoteHost.textContent = "No testimonials yet.";
    if (nameEl) nameEl.textContent = "";
    if (roleEl) roleEl.textContent = "";
    if (badgeEl) badgeEl.textContent = "";
    if (slideEl) slideEl.removeAttribute("aria-label");
    updateNavDisabled();
  }

  /** Moves by one slide from a previous or next press. Always announced, and always restarts the interval
   *  countdown from now. */
  function step(direction: 1 | -1): void {
    const n = props.items.length;
    if (n === 0) return;
    index = ((index + direction) % n + n) % n;
    anchorT = lastT;
    mountSlide(index, props.time !== null ? 0 : null, true);
  }

  /** The rotate timer's frame. A fixed `time` is a pure function of `t`: which slide, and how far into its
   *  reveal. A live `t` advances the index itself, pausing while reduced, hovered, or focused. */
  function draw(t: number, reduced: boolean): void {
    lastT = t;
    const n = props.items.length;
    if (n === 0) {
      showEmptySlide();
    } else {
      emptyShown = false;
      const interval = Math.max(1, props.interval);
      if (props.time !== null) {
        const next = ((Math.floor(t / interval) % n) + n) % n;
        const local = ((t % interval) + interval) % interval;
        if (next !== mountedIndex) {
          index = next;
          mountSlide(index, local, false);
        } else {
          child?.update({ time: local });
        }
      } else {
        if (!reduced && !hovering && !focused && n > 1 && t - anchorT >= interval) {
          anchorT = t;
          index = (index + 1) % n;
        }
        if (index !== mountedIndex) mountSlide(index, null, false);
      }
    }
    if (host.dataset.picaReady !== "true") host.dataset.picaReady = "true";
  }

  function buildGrid(): void {
    const list = el("ul", "tm-grid");
    list.setAttribute("role", "list");
    container = list;
    host.append(list);
    renderGrid();
  }

  function renderGrid(): void {
    const list = container;
    if (!list) return;
    list.textContent = "";
    if (props.items.length === 0) {
      const note = el("p", "tm-empty");
      note.textContent = "No testimonials yet.";
      list.append(note);
      return;
    }
    for (const item of props.items) {
      const card = el("li", "tm-card");
      card.setAttribute("role", "listitem");
      const quote = el("blockquote", "tm-quote");
      quote.textContent = item.quote;
      const footer = el("footer", "tm-meta");
      const badge = el("span", "tm-badge");
      badge.setAttribute("aria-hidden", "true");
      badge.textContent = initials(item.name);
      const who = el("span", "tm-who");
      const name = el("cite", "tm-name");
      name.textContent = item.name;
      const role = el("span", "tm-role");
      role.textContent = item.role;
      who.append(name, role);
      footer.append(badge, who);
      card.append(quote, footer);
      list.append(card);
    }
  }

  function buildRotate(): void {
    const wrap = el("div", "tm-rotate");
    container = wrap;
    prevBtn = el("button", "tm-nav tm-prev");
    prevBtn.type = "button";
    prevBtn.setAttribute("aria-label", "Previous testimonial");
    prevBtn.textContent = "‹";
    nextBtn = el("button", "tm-nav tm-next");
    nextBtn.type = "button";
    nextBtn.setAttribute("aria-label", "Next testimonial");
    nextBtn.textContent = "›";
    liveWrap = el("div", "tm-slidewrap");
    liveWrap.setAttribute("aria-live", "off");
    liveWrap.setAttribute("aria-atomic", "true");
    slideEl = el("div", "tm-slide");
    slideEl.setAttribute("role", "group");
    slideEl.setAttribute("aria-roledescription", "slide");
    quoteHost = el("div", "tm-quotehost");
    const footer = el("footer", "tm-meta");
    badgeEl = el("span", "tm-badge");
    badgeEl.setAttribute("aria-hidden", "true");
    const who = el("span", "tm-who");
    nameEl = el("cite", "tm-name");
    roleEl = el("span", "tm-role");
    who.append(nameEl, roleEl);
    footer.append(badgeEl, who);
    slideEl.append(quoteHost, footer);
    liveWrap.append(slideEl);
    wrap.append(prevBtn, liveWrap, nextBtn);
    host.append(wrap);

    onPrev = () => step(-1);
    onNext = () => step(1);
    prevBtn.addEventListener("click", onPrev);
    nextBtn.addEventListener("click", onNext);
    onEnter = () => {
      hovering = true;
      syncPause();
    };
    onLeave = () => {
      hovering = false;
      syncPause();
    };
    onFocusIn = () => {
      focused = true;
      syncPause();
    };
    onFocusOut = () => {
      focused = false;
      syncPause();
    };
    wrap.addEventListener("pointerenter", onEnter);
    wrap.addEventListener("pointerleave", onLeave);
    wrap.addEventListener("focusin", onFocusIn);
    wrap.addEventListener("focusout", onFocusOut);

    index = 0;
    mountedIndex = -1;
    anchorT = 0;
    emptyShown = false;
    loop = createLoop({ el: host, fps: ROTATE_FPS, paused: props.paused, time: props.time, still: 0, frame: draw });
  }

  function teardownLayout(): void {
    loop?.destroy();
    loop = null;
    child?.destroy();
    child = null;
    if (prevBtn && onPrev) prevBtn.removeEventListener("click", onPrev);
    if (nextBtn && onNext) nextBtn.removeEventListener("click", onNext);
    if (container) {
      if (onEnter) container.removeEventListener("pointerenter", onEnter);
      if (onLeave) container.removeEventListener("pointerleave", onLeave);
      if (onFocusIn) container.removeEventListener("focusin", onFocusIn);
      if (onFocusOut) container.removeEventListener("focusout", onFocusOut);
    }
    container?.remove();
    container = null;
    quoteHost = null;
    liveWrap = null;
    slideEl = null;
    nameEl = null;
    roleEl = null;
    badgeEl = null;
    prevBtn = null;
    nextBtn = null;
    onPrev = null;
    onNext = null;
    onEnter = null;
    onLeave = null;
    onFocusIn = null;
    onFocusOut = null;
    hovering = false;
    focused = false;
  }

  function applyLabel(): void {
    labelHost(host, props.label, "region");
    attrs.set("aria-roledescription", props.layout === "rotate" ? "carousel" : null);
  }

  applyLabel();
  sheet.setRules(rules(sheet.selector, props));
  if (props.layout === "grid") buildGrid();
  else buildRotate();
  if (host.dataset.picaReady !== "true") host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      const layoutChanged = props.layout !== before.layout;
      if (layoutChanged) {
        teardownLayout();
        if (props.layout === "grid") buildGrid();
        else buildRotate();
      } else if (props.layout === "grid") {
        if (!sameJson(props.items, before.items) || props.columns !== before.columns) renderGrid();
      } else {
        if (!sameJson(props.items, before.items)) {
          index = 0;
          mountedIndex = -1;
          anchorT = lastT;
        } else if (props.time !== before.time) {
          // Whether time is live or fixed changed the child's own animating condition, not just its
          // value, so a plain update() cannot fix it: force draw() to remount fresh below.
          anchorT = lastT;
          mountedIndex = -1;
        } else if (
          child &&
          (props.paused !== before.paused || props.fontFamily !== before.fontFamily || props.seed !== before.seed)
        ) {
          child.update({ paused: props.paused, fontFamily: props.fontFamily, seed: hashSeed(props.seed, mountedIndex) });
        }
        loop?.update({ paused: props.paused || hovering || focused, time: props.time, fps: ROTATE_FPS });
        loop?.redraw();
      }
      applyLabel();
      sheet.setRules(rules(sheet.selector, props));
    },
    destroy() {
      teardownLayout();
      attrs.restore();
      unlabelHost(host);
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};

// registry/sections/testimonials/index.tsx
export type TestimonialsComponentProps = Partial<TestimonialsProps> & WrapperProps;

/** Quotes as a grid of cards, or as one quote at a time that rotates on a timer with previous and next controls. */
export function Testimonials({ className, style, palette, ...props }: TestimonialsComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Testimonials · testimonials
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Testimonials · Pica</title>
<style>:root { --pica-accent: #e8a020; }
html, body { margin: 0; height: 100%; background: #0a0a0a; color: #f1f1ef; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
@media (prefers-color-scheme: light) { html:not([data-ground]), html:not([data-ground]) body { background: #f1f1ef; color: #0a0a0a; } }
html[data-ground="paper"], html[data-ground="paper"] body { background: #f1f1ef; color: #0a0a0a; }
html[data-ground="checker"] body { background: repeating-conic-gradient(#161616 0% 25%, #0a0a0a 0% 50%) 50% / 24px 24px; }
#pica { width: 100%; height: 100%; }
.pica-stage { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: clamp(20px, 3.2vw, 40px); }
.pica-stage #pica { width: auto; height: auto; }
.pica-stage span#pica, .pica-stage div#pica { display: inline-block; }</style>
</head>
<body>
<div id="pica"></div>
<script>
"use strict";
var PicaTestimonials = (() => {
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

  // registry/sections/testimonials/core.ts
  var core_exports = {};
  __export(core_exports, {
    defaults: () => defaults2,
    mount: () => mount2
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

  // lib/host.ts
  function nextSerial() {
    const g = globalThis;
    g.__picaSerial = (g.__picaSerial ?? 0) + 1;
    return g.__picaSerial;
  }
  function hostAttributes(host) {
    const original = /* @__PURE__ */ new Map();
    const apply = (name, value) => {
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
      }
    };
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

  // lib/json.ts
  function sameJson(a, b) {
    if (a === b) return true;
    if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
    if (Array.isArray(a) || Array.isArray(b)) {
      if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!sameJson(a[i], b[i])) return false;
      }
      return true;
    }
    const left = a;
    const right = b;
    const keys = Object.keys(left);
    if (keys.length !== Object.keys(right).length) return false;
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(right, key) || !sameJson(left[key], right[key])) return false;
    }
    return true;
  }

  // lib/loop.ts
  var MAX_STEP_MS = 100;
  function createLoop(options) {
    const { el: el2, frame } = options;
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
    observer?.observe(el2);
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
    accent: "#e8a020",
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

  // registry/ascii/ascii-reveal/core.ts
  var defaults = {
    text: "Drawn on a monospace grid.",
    duration: 1600,
    stagger: 0.6,
    // The fallback ramp (STYLE.md) without its leading space, plus four glyphs of their own.
    glyphs: ".:-=+*#%@/\\|_",
    loop: 0,
    fontFamily: GRID_FONT,
    fps: 20,
    paused: false,
    time: null,
    seed: 1
  };
  var WHITESPACE = /\s/;
  function toGlyphs(source) {
    return Array.from(source.length > 0 ? source : defaults.glyphs);
  }
  function scrambleGlyph(pool, seed, position, frame) {
    if (pool.length === 0) return " ";
    const draw = createRng(hashSeed(seed, position, frame))();
    return pool[Math.min(pool.length - 1, Math.floor(draw * pool.length))] ?? " ";
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    let chars = Array.from(props.text);
    let glyphPool = toGlyphs(props.glyphs);
    let shown = "";
    const text = animatedText(host, props.text);
    const visible = text.layer;
    visible.style.whiteSpace = "pre";
    visible.style.fontFamily = props.fontFamily;
    visible.style.color = cssVar("fg");
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
    const loop = createLoop({
      el: host,
      fps: props.fps,
      paused: props.paused,
      time: props.time,
      still: props.duration,
      frame: draw
    });
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        if (props.text !== before.text) {
          chars = Array.from(props.text);
          text.setText(props.text);
        }
        if (props.glyphs !== before.glyphs) glyphPool = toGlyphs(props.glyphs);
        if (props.fontFamily !== before.fontFamily) visible.style.fontFamily = props.fontFamily;
        loop.update({ paused: props.paused, time: props.time, fps: props.fps, still: props.duration });
        loop.redraw();
      },
      destroy() {
        loop.destroy();
        text.remove();
        delete host.dataset.picaReady;
      }
    };
  };

  // registry/sections/testimonials/core.ts
  var DEFAULT_ITEMS = [
    {
      quote: "We dropped it into a static page with no build step, and it just worked.",
      name: "Jordan Ellis",
      role: "Frontend developer"
    },
    {
      quote: "The React import matches our own components so closely that nobody noticed the switch.",
      name: "Priya Nandan",
      role: "Design engineer"
    },
    {
      quote: "Our marketing site finally looks drawn instead of templated.",
      name: "Sam Okafor",
      role: "Indie hacker"
    },
    {
      quote: "Every component we tried stayed under budget, even after we added our own styling.",
      name: "Mina Chen",
      role: "Product designer"
    }
  ];
  var defaults2 = {
    items: DEFAULT_ITEMS,
    layout: "grid",
    columns: 2,
    interval: 7e3,
    label: "What people say",
    fontFamily: GRID_FONT,
    paused: false,
    time: null,
    seed: 1
  };
  var ROTATE_FPS = 4;
  function initials(name) {
    const words = name.trim().split(/\s+/).filter(Boolean);
    const first = words[0] ?? "";
    const last = words.length > 1 ? words[words.length - 1] ?? "" : "";
    return (last ? `${first.charAt(0)}${last.charAt(0)}` : first.slice(0, 2)).toUpperCase();
  }
  function el(tag, className) {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    if (className) node.className = className;
    return node;
  }
  function rules(s, p) {
    const fg = cssVar("fg");
    const muted = cssVar("muted");
    const accent = cssVar("accent");
    const cols = Math.max(1, Math.min(4, Math.round(p.columns)));
    return [
      `${s}{display:block;color:${fg}}`,
      `${s} ul.tm-grid{display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:1.5rem;margin:0;padding:0;list-style:none}`,
      `@media (max-width:560px){${s} ul.tm-grid{grid-template-columns:1fr}}`,
      `${s} .tm-card{border:1px solid ${fg};margin:0;padding:1.25rem;display:flex;flex-direction:column;gap:0.85rem}`,
      `${s} .tm-quote{margin:0;font-size:1rem;line-height:1.6}`,
      `${s} .tm-empty{margin:0;font-family:${p.fontFamily};color:${muted}}`,
      `${s} .tm-meta{display:flex;align-items:center;gap:0.75rem;margin:0}`,
      `${s} .tm-badge{display:inline-flex;flex:none;align-items:center;justify-content:center;width:2.25em;height:2.25em;border:1px solid ${fg};font-family:${p.fontFamily};font-size:0.75rem;letter-spacing:0.02em}`,
      `${s} .tm-who{display:flex;flex-direction:column;gap:0.15em;min-width:0}`,
      `${s} .tm-name{font-family:${p.fontFamily};font-style:normal;font-size:0.9rem}`,
      `${s} .tm-role{font-family:${p.fontFamily};font-size:0.8rem;color:${muted}}`,
      `${s} .tm-rotate{display:flex;align-items:flex-start;gap:1rem;max-width:44rem}`,
      `${s} .tm-slidewrap{flex:1;min-width:0}`,
      `${s} .tm-slide{display:flex;flex-direction:column;gap:0.85rem}`,
      `${s} .tm-quotehost{display:block;font-size:1.05rem;line-height:1.6;min-width:0}`,
      `${s} .tm-quotehost>span[aria-hidden="true"]{white-space:pre-wrap!important;overflow-wrap:anywhere;display:block}`,
      `${s} .tm-nav{appearance:none;flex:none;width:2.25em;height:2.25em;margin:0;padding:0;border:1px solid ${fg};border-radius:0;background:transparent;color:${fg};font:inherit;font-family:${p.fontFamily};font-size:1rem;line-height:1;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}`,
      `${s} .tm-nav:hover:not(:disabled){background:color-mix(in srgb, ${fg} 10%, transparent)}`,
      `${s} .tm-nav:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
      `${s} .tm-nav:disabled{opacity:0.45;cursor:not-allowed}`
    ].join("\n");
  }
  var mount2 = (host, initial = {}) => {
    let props = { ...defaults2, ...initial };
    const attrs = hostAttributes(host);
    const sheet = scope(host);
    let container = null;
    let loop = null;
    let child = null;
    let quoteHost = null;
    let liveWrap = null;
    let slideEl = null;
    let nameEl = null;
    let roleEl = null;
    let badgeEl = null;
    let prevBtn = null;
    let nextBtn = null;
    let onPrev = null;
    let onNext = null;
    let onEnter = null;
    let onLeave = null;
    let onFocusIn = null;
    let onFocusOut = null;
    let index = 0;
    let mountedIndex = -1;
    let anchorT = 0;
    let lastT = 0;
    let hovering = false;
    let focused = false;
    let emptyShown = false;
    function syncPause() {
      loop?.update({ paused: props.paused || hovering || focused });
    }
    function updateNavDisabled() {
      const disable = props.items.length <= 1;
      for (const button of [prevBtn, nextBtn]) {
        if (!button) continue;
        button.disabled = disable;
        button.setAttribute("aria-disabled", String(disable));
      }
    }
    function mountSlide(i, localTime, announce) {
      if (!quoteHost) return;
      const item = props.items[i] ?? null;
      child?.destroy();
      mountedIndex = i;
      child = mount(quoteHost, {
        text: item ? item.quote : "",
        time: localTime,
        seed: hashSeed(props.seed, i),
        paused: props.paused,
        fontFamily: props.fontFamily
      });
      if (nameEl) nameEl.textContent = item ? item.name : "";
      if (roleEl) roleEl.textContent = item ? item.role : "";
      if (badgeEl) badgeEl.textContent = item ? initials(item.name) : "";
      if (slideEl) slideEl.setAttribute("aria-label", `${i + 1} of ${props.items.length}`);
      if (liveWrap) liveWrap.setAttribute("aria-live", announce ? "polite" : "off");
      updateNavDisabled();
    }
    function showEmptySlide() {
      if (emptyShown) return;
      emptyShown = true;
      child?.destroy();
      child = null;
      mountedIndex = -1;
      if (quoteHost) quoteHost.textContent = "No testimonials yet.";
      if (nameEl) nameEl.textContent = "";
      if (roleEl) roleEl.textContent = "";
      if (badgeEl) badgeEl.textContent = "";
      if (slideEl) slideEl.removeAttribute("aria-label");
      updateNavDisabled();
    }
    function step(direction) {
      const n = props.items.length;
      if (n === 0) return;
      index = ((index + direction) % n + n) % n;
      anchorT = lastT;
      mountSlide(index, props.time !== null ? 0 : null, true);
    }
    function draw(t, reduced) {
      lastT = t;
      const n = props.items.length;
      if (n === 0) {
        showEmptySlide();
      } else {
        emptyShown = false;
        const interval = Math.max(1, props.interval);
        if (props.time !== null) {
          const next = (Math.floor(t / interval) % n + n) % n;
          const local = (t % interval + interval) % interval;
          if (next !== mountedIndex) {
            index = next;
            mountSlide(index, local, false);
          } else {
            child?.update({ time: local });
          }
        } else {
          if (!reduced && !hovering && !focused && n > 1 && t - anchorT >= interval) {
            anchorT = t;
            index = (index + 1) % n;
          }
          if (index !== mountedIndex) mountSlide(index, null, false);
        }
      }
      if (host.dataset.picaReady !== "true") host.dataset.picaReady = "true";
    }
    function buildGrid() {
      const list = el("ul", "tm-grid");
      list.setAttribute("role", "list");
      container = list;
      host.append(list);
      renderGrid();
    }
    function renderGrid() {
      const list = container;
      if (!list) return;
      list.textContent = "";
      if (props.items.length === 0) {
        const note = el("p", "tm-empty");
        note.textContent = "No testimonials yet.";
        list.append(note);
        return;
      }
      for (const item of props.items) {
        const card = el("li", "tm-card");
        card.setAttribute("role", "listitem");
        const quote = el("blockquote", "tm-quote");
        quote.textContent = item.quote;
        const footer = el("footer", "tm-meta");
        const badge = el("span", "tm-badge");
        badge.setAttribute("aria-hidden", "true");
        badge.textContent = initials(item.name);
        const who = el("span", "tm-who");
        const name = el("cite", "tm-name");
        name.textContent = item.name;
        const role = el("span", "tm-role");
        role.textContent = item.role;
        who.append(name, role);
        footer.append(badge, who);
        card.append(quote, footer);
        list.append(card);
      }
    }
    function buildRotate() {
      const wrap = el("div", "tm-rotate");
      container = wrap;
      prevBtn = el("button", "tm-nav tm-prev");
      prevBtn.type = "button";
      prevBtn.setAttribute("aria-label", "Previous testimonial");
      prevBtn.textContent = "‹";
      nextBtn = el("button", "tm-nav tm-next");
      nextBtn.type = "button";
      nextBtn.setAttribute("aria-label", "Next testimonial");
      nextBtn.textContent = "›";
      liveWrap = el("div", "tm-slidewrap");
      liveWrap.setAttribute("aria-live", "off");
      liveWrap.setAttribute("aria-atomic", "true");
      slideEl = el("div", "tm-slide");
      slideEl.setAttribute("role", "group");
      slideEl.setAttribute("aria-roledescription", "slide");
      quoteHost = el("div", "tm-quotehost");
      const footer = el("footer", "tm-meta");
      badgeEl = el("span", "tm-badge");
      badgeEl.setAttribute("aria-hidden", "true");
      const who = el("span", "tm-who");
      nameEl = el("cite", "tm-name");
      roleEl = el("span", "tm-role");
      who.append(nameEl, roleEl);
      footer.append(badgeEl, who);
      slideEl.append(quoteHost, footer);
      liveWrap.append(slideEl);
      wrap.append(prevBtn, liveWrap, nextBtn);
      host.append(wrap);
      onPrev = () => step(-1);
      onNext = () => step(1);
      prevBtn.addEventListener("click", onPrev);
      nextBtn.addEventListener("click", onNext);
      onEnter = () => {
        hovering = true;
        syncPause();
      };
      onLeave = () => {
        hovering = false;
        syncPause();
      };
      onFocusIn = () => {
        focused = true;
        syncPause();
      };
      onFocusOut = () => {
        focused = false;
        syncPause();
      };
      wrap.addEventListener("pointerenter", onEnter);
      wrap.addEventListener("pointerleave", onLeave);
      wrap.addEventListener("focusin", onFocusIn);
      wrap.addEventListener("focusout", onFocusOut);
      index = 0;
      mountedIndex = -1;
      anchorT = 0;
      emptyShown = false;
      loop = createLoop({ el: host, fps: ROTATE_FPS, paused: props.paused, time: props.time, still: 0, frame: draw });
    }
    function teardownLayout() {
      loop?.destroy();
      loop = null;
      child?.destroy();
      child = null;
      if (prevBtn && onPrev) prevBtn.removeEventListener("click", onPrev);
      if (nextBtn && onNext) nextBtn.removeEventListener("click", onNext);
      if (container) {
        if (onEnter) container.removeEventListener("pointerenter", onEnter);
        if (onLeave) container.removeEventListener("pointerleave", onLeave);
        if (onFocusIn) container.removeEventListener("focusin", onFocusIn);
        if (onFocusOut) container.removeEventListener("focusout", onFocusOut);
      }
      container?.remove();
      container = null;
      quoteHost = null;
      liveWrap = null;
      slideEl = null;
      nameEl = null;
      roleEl = null;
      badgeEl = null;
      prevBtn = null;
      nextBtn = null;
      onPrev = null;
      onNext = null;
      onEnter = null;
      onLeave = null;
      onFocusIn = null;
      onFocusOut = null;
      hovering = false;
      focused = false;
    }
    function applyLabel() {
      labelHost(host, props.label, "region");
      attrs.set("aria-roledescription", props.layout === "rotate" ? "carousel" : null);
    }
    applyLabel();
    sheet.setRules(rules(sheet.selector, props));
    if (props.layout === "grid") buildGrid();
    else buildRotate();
    if (host.dataset.picaReady !== "true") host.dataset.picaReady = "true";
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        const layoutChanged = props.layout !== before.layout;
        if (layoutChanged) {
          teardownLayout();
          if (props.layout === "grid") buildGrid();
          else buildRotate();
        } else if (props.layout === "grid") {
          if (!sameJson(props.items, before.items) || props.columns !== before.columns) renderGrid();
        } else {
          if (!sameJson(props.items, before.items)) {
            index = 0;
            mountedIndex = -1;
            anchorT = lastT;
          } else if (props.time !== before.time) {
            anchorT = lastT;
            mountedIndex = -1;
          } else if (child && (props.paused !== before.paused || props.fontFamily !== before.fontFamily || props.seed !== before.seed)) {
            child.update({ paused: props.paused, fontFamily: props.fontFamily, seed: hashSeed(props.seed, mountedIndex) });
          }
          loop?.update({ paused: props.paused || hovering || focused, time: props.time, fps: ROTATE_FPS });
          loop?.redraw();
        }
        applyLabel();
        sheet.setRules(rules(sheet.selector, props));
      },
      destroy() {
        teardownLayout();
        attrs.restore();
        unlabelHost(host);
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
  var instance = PicaTestimonials.mount(host, take(window.PICA_PROPS || {}));
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

- Technique from [Carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/) by W3C WAI-ARIA Authoring Practices Guide (W3C document).
