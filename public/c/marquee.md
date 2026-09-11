# Marquee

> Scrolls its children sideways in an endless loop, like a ticker.

Category: motion. Tags: ticker, scroll, loop, css. Animated. Holds a still frame under prefers-reduced-motion, and stops offscreen and in hidden tabs. Size: 2.1 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/marquee.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `speed` | number | `40` | How fast the content scrolls, in pixels per second. |
| `direction` | "left" \| "right" | `"left"` | Which way the content scrolls. |
| `gap` | number | `2` | Space between adjacent items, in em. |
| `pauseOnHover` | boolean | `true` | Stops the scroll while the pointer rests over the host, or while focus sits inside it. |
| `fps` | number | `30` | Frames drawn per second while scrolling. |
| `paused` | boolean | `false` | Stop animating and hold the current frame. |
| `time` | number \| null | `null` | Render exactly this animation time, in milliseconds, and do not animate. Null animates. |
| `seed` | number | `1` | Seed for every random choice, so the same seed always draws the same frame. |

## Children

Put content inside the component. It decorates that content and never changes it.

## Colors

Draws with . Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

// Pica · Marquee · marquee
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

// registry/motion/marquee/core.ts
export interface MarqueeProps extends MotionProps {
  /** How fast the content scrolls, in pixels per second. */
  speed: number;
  /** Which way the content scrolls. */
  direction: "left" | "right";
  /** Space between adjacent items, in em. */
  gap: number;
  /** Stops the scroll while the pointer rests over the host, or while focus sits inside it. */
  pauseOnHover: boolean;
  /** Frames drawn per second while scrolling. */
  fps: number;
}

export const defaults: MarqueeProps = {
  speed: 40,
  direction: "left",
  gap: 2,
  pauseOnHover: true,
  fps: 30,
  paused: false,
  time: null,
  seed: 1,
};

/** Marks every node this core adds: the clones that continue the loop. The scoped rule that moves the real
 *  children skips anything carrying it, and the child observer ignores it too. */
const DATA_PICA = "data-pica";

/** The custom property lib/loop.ts writes each frame's scroll distance into. The scoped rule reads it to
 *  move the real children; the clones this core builds read the same property from their own inline style,
 *  since a core may style a node it created directly. */
const OFFSET_VAR = "--pica-marquee-x";

export const mount: Mount<MarqueeProps> = (host, initial = {}) => {
  let props: MarqueeProps = { ...defaults, ...initial };

  const sheet = scope(host);
  const restoreHost = styleHost(host, {
    display: "flex",
    "flex-wrap": "nowrap",
    "align-items": "center",
    overflow: "hidden",
    gap: `${props.gap}em`,
    [OFFSET_VAR]: "0px",
  });
  // The real children are never touched directly. This rule alone moves them, by reading the property the
  // loop writes on the host below.
  sheet.setRules(`${sheet.selector} > *:not([${DATA_PICA}]){flex:none;transform:translateX(var(${OFFSET_VAR},0px))}`);

  let hovered = false;
  let focused = false;
  /** Pixel width of one full cycle of the real children, gap to the next cycle included. Zero with no children. */
  let period = 0;
  let clones: HTMLElement[] = [];

  function isOwn(node: Node): boolean {
    return node instanceof HTMLElement && node.hasAttribute(DATA_PICA);
  }

  function realChildren(): HTMLElement[] {
    const out: HTMLElement[] = [];
    for (const child of Array.from(host.children)) {
      if (child instanceof HTMLElement && !child.hasAttribute(DATA_PICA)) out.push(child);
    }
    return out;
  }

  /** One inert copy of every real child, in one row of its own. Hidden and unreachable as a whole, through
   *  the single attribute HTML defines for exactly that. */
  function buildClone(children: readonly HTMLElement[]): HTMLElement {
    const group = document.createElement("div");
    group.setAttribute(DATA_PICA, "");
    group.setAttribute("aria-hidden", "true");
    group.setAttribute("inert", "");
    group.style.cssText = `display:flex;flex:none;gap:${props.gap}em;transform:translateX(var(${OFFSET_VAR},0px))`;
    for (const child of children) group.appendChild(child.cloneNode(true));
    return group;
  }

  function clearClones(): void {
    for (const clone of clones) clone.remove();
    clones = [];
  }

  /** Measures one cycle, then adds just enough clones on the side the content scrolls toward to cover the
   *  host with no gap at any point in the loop. Runs again whenever the real children, the gap, or the
   *  direction changes. */
  function rebuildClones(): void {
    clearClones();
    const children = realChildren();
    const first = children[0];
    if (!first) {
      period = 0;
      return;
    }
    const startLeft = first.getBoundingClientRect().left;
    const probe = buildClone(children);
    host.append(probe);
    period = Math.max(1, probe.getBoundingClientRect().left - startLeft);
    probe.remove();
    const needed = Math.max(1, Math.ceil(host.clientWidth / period));
    const built: HTMLElement[] = [];
    for (let i = 0; i < needed; i++) {
      const clone = buildClone(children);
      if (props.direction === "right") host.prepend(clone);
      else host.append(clone);
      built.push(clone);
    }
    clones = built;
  }

  rebuildClones();

  // Watches only the host's own child list, ignoring the clones it adds and removes here, so a page that
  // swaps the real children is picked up without a resize loop of its own doing.
  const childObserver = new MutationObserver((records) => {
    const changed = records.some(
      (record) => Array.from(record.addedNodes).some((node) => !isOwn(node)) || Array.from(record.removedNodes).some((node) => !isOwn(node)),
    );
    if (changed) rebuildClones();
  });
  childObserver.observe(host, { childList: true });

  function isPaused(): boolean {
    return props.paused || (props.pauseOnHover && hovered) || focused;
  }

  function draw(t: number): void {
    const wrapped = period > 0 ? ((t / 1000) * props.speed) % period : 0;
    const offset = props.direction === "left" ? -wrapped : wrapped;
    host.style.setProperty(OFFSET_VAR, `${offset.toFixed(2)}px`);
    host.dataset.picaReady = "true";
  }

  const loop = createLoop({
    el: host,
    fps: props.fps,
    paused: isPaused(),
    time: props.time,
    still: 0,
    frame: draw,
  });

  function onEnter(): void {
    hovered = true;
    loop.update({ paused: isPaused() });
  }
  function onLeave(): void {
    hovered = false;
    loop.update({ paused: isPaused() });
  }
  function onFocusIn(): void {
    focused = true;
    loop.update({ paused: isPaused() });
  }
  function onFocusOut(event: FocusEvent): void {
    focused = event.relatedTarget instanceof Node && host.contains(event.relatedTarget);
    loop.update({ paused: isPaused() });
  }
  host.addEventListener("mouseenter", onEnter);
  host.addEventListener("mouseleave", onLeave);
  host.addEventListener("focusin", onFocusIn);
  host.addEventListener("focusout", onFocusOut);

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.gap !== before.gap) host.style.setProperty("gap", `${props.gap}em`);
      if (props.gap !== before.gap || props.direction !== before.direction) rebuildClones();
      loop.update({ paused: isPaused(), time: props.time, fps: props.fps });
      loop.redraw();
    },
    destroy() {
      loop.destroy();
      host.removeEventListener("mouseenter", onEnter);
      host.removeEventListener("mouseleave", onLeave);
      host.removeEventListener("focusin", onFocusIn);
      host.removeEventListener("focusout", onFocusOut);
      childObserver.disconnect();
      clearClones();
      sheet.destroy();
      restoreHost();
      delete host.dataset.picaReady;
    },
  };
};

// registry/motion/marquee/index.tsx
export type MarqueeComponentProps = Partial<MarqueeProps> & WrapperProps & { children?: ReactNode };

/** A row of children that scrolls sideways in an endless loop, like a ticker. */
export function Marquee({ className, style, palette, children, ...props }: MarqueeComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Marquee · marquee
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Marquee · Pica</title>
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
<div id="pica"><span>ASCII</span><span>Dither</span><span>Effects</span><span>Shaders</span><span>Motion</span><span>Controls</span></div>
<script>
"use strict";
var PicaMarquee = (() => {
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

  // registry/motion/marquee/core.ts
  var core_exports = {};
  __export(core_exports, {
    defaults: () => defaults,
    mount: () => mount
  });

  // lib/host.ts
  function nextSerial() {
    const g = globalThis;
    g.__picaSerial = (g.__picaSerial ?? 0) + 1;
    return g.__picaSerial;
  }
  var unstyled = /* @__PURE__ */ new WeakMap();
  function styleHost(host, styles) {
    if (!unstyled.has(host)) unstyled.set(host, !host.hasAttribute("style"));
    const before = Object.keys(styles).map(
      (name) => [name, host.style.getPropertyValue(name), host.style.getPropertyPriority(name)]
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

  // registry/motion/marquee/core.ts
  var defaults = {
    speed: 40,
    direction: "left",
    gap: 2,
    pauseOnHover: true,
    fps: 30,
    paused: false,
    time: null,
    seed: 1
  };
  var DATA_PICA = "data-pica";
  var OFFSET_VAR = "--pica-marquee-x";
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    const sheet = scope(host);
    const restoreHost = styleHost(host, {
      display: "flex",
      "flex-wrap": "nowrap",
      "align-items": "center",
      overflow: "hidden",
      gap: `${props.gap}em`,
      [OFFSET_VAR]: "0px"
    });
    sheet.setRules(`${sheet.selector} > *:not([${DATA_PICA}]){flex:none;transform:translateX(var(${OFFSET_VAR},0px))}`);
    let hovered = false;
    let focused = false;
    let period = 0;
    let clones = [];
    function isOwn(node) {
      return node instanceof HTMLElement && node.hasAttribute(DATA_PICA);
    }
    function realChildren() {
      const out = [];
      for (const child of Array.from(host.children)) {
        if (child instanceof HTMLElement && !child.hasAttribute(DATA_PICA)) out.push(child);
      }
      return out;
    }
    function buildClone(children) {
      const group = document.createElement("div");
      group.setAttribute(DATA_PICA, "");
      group.setAttribute("aria-hidden", "true");
      group.setAttribute("inert", "");
      group.style.cssText = `display:flex;flex:none;gap:${props.gap}em;transform:translateX(var(${OFFSET_VAR},0px))`;
      for (const child of children) group.appendChild(child.cloneNode(true));
      return group;
    }
    function clearClones() {
      for (const clone of clones) clone.remove();
      clones = [];
    }
    function rebuildClones() {
      clearClones();
      const children = realChildren();
      const first = children[0];
      if (!first) {
        period = 0;
        return;
      }
      const startLeft = first.getBoundingClientRect().left;
      const probe = buildClone(children);
      host.append(probe);
      period = Math.max(1, probe.getBoundingClientRect().left - startLeft);
      probe.remove();
      const needed = Math.max(1, Math.ceil(host.clientWidth / period));
      const built = [];
      for (let i = 0; i < needed; i++) {
        const clone = buildClone(children);
        if (props.direction === "right") host.prepend(clone);
        else host.append(clone);
        built.push(clone);
      }
      clones = built;
    }
    rebuildClones();
    const childObserver = new MutationObserver((records) => {
      const changed = records.some(
        (record) => Array.from(record.addedNodes).some((node) => !isOwn(node)) || Array.from(record.removedNodes).some((node) => !isOwn(node))
      );
      if (changed) rebuildClones();
    });
    childObserver.observe(host, { childList: true });
    function isPaused() {
      return props.paused || props.pauseOnHover && hovered || focused;
    }
    function draw(t) {
      const wrapped = period > 0 ? t / 1e3 * props.speed % period : 0;
      const offset = props.direction === "left" ? -wrapped : wrapped;
      host.style.setProperty(OFFSET_VAR, `${offset.toFixed(2)}px`);
      host.dataset.picaReady = "true";
    }
    const loop = createLoop({
      el: host,
      fps: props.fps,
      paused: isPaused(),
      time: props.time,
      still: 0,
      frame: draw
    });
    function onEnter() {
      hovered = true;
      loop.update({ paused: isPaused() });
    }
    function onLeave() {
      hovered = false;
      loop.update({ paused: isPaused() });
    }
    function onFocusIn() {
      focused = true;
      loop.update({ paused: isPaused() });
    }
    function onFocusOut(event) {
      focused = event.relatedTarget instanceof Node && host.contains(event.relatedTarget);
      loop.update({ paused: isPaused() });
    }
    host.addEventListener("mouseenter", onEnter);
    host.addEventListener("mouseleave", onLeave);
    host.addEventListener("focusin", onFocusIn);
    host.addEventListener("focusout", onFocusOut);
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        if (props.gap !== before.gap) host.style.setProperty("gap", `${props.gap}em`);
        if (props.gap !== before.gap || props.direction !== before.direction) rebuildClones();
        loop.update({ paused: isPaused(), time: props.time, fps: props.fps });
        loop.redraw();
      },
      destroy() {
        loop.destroy();
        host.removeEventListener("mouseenter", onEnter);
        host.removeEventListener("mouseleave", onLeave);
        host.removeEventListener("focusin", onFocusIn);
        host.removeEventListener("focusout", onFocusOut);
        childObserver.disconnect();
        clearClones();
        sheet.destroy();
        restoreHost();
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
  var instance = PicaMarquee.mount(host, take(window.PICA_PROPS || {}));
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
