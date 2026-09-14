# Y2K Hero

> A centered turn of the millennium hero with banded chrome rails, seeded starbursts, a scrolling ticker, and real calls to action.

Category: sections. Tags: y2k, hero, section, chrome, starburst, ticker, cta. Animated. Holds a still frame under prefers-reduced-motion, and stops offscreen and in hidden tabs. Size: 7.0 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/y2k-hero.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `headline` | string | `"Welcome To The Future"` | The big line drawn above the wrapped content. An empty string hides it. |
| `subhead` | string | `"Everything here is chrome plated, hand assembled, and best viewed at any resolution."` | A quieter line under the headline, in the muted ink. An empty string hides it. |
| `actions` | readonly Y2kAction[] | `[{"label":"Enter","href":"#enter"},{"label":"Guestbook","href":"#guestbook"}]` | Calls to action, drawn as real beveled links. At most three are shown. |
| `align` | "center" \| "start" | `"center"` | Text alignment inside the column: centered, the way of the era, or flush to the start edge. |
| `minHeight` | number | `78` | The host's minimum height, in percent of the viewport height. |
| `ticker` | string | `"EST. 2000"` | Text for the scrolling strip pinned to the top edge. An empty string removes the strip. |
| `scanlines` | boolean | `true` | A fine line screen over the whole section, mounted from the scanlines core. |
| `rails` | boolean | `true` | The two chrome bars framing the content. |
| `stars` | number | `2` | Starbursts the seed scatters behind the content, from 0 to 4. |
| `intensity` | number | `0.9` | How strongly the drawn frame inks, from 0 to 1. |
| `sheen` | boolean | `true` | The bright band that sweeps along the chrome while the clock runs. |
| `fps` | number | `24` | Frames drawn per second while animating. |
| `paused` | boolean | `false` | Stop animating and hold the current frame. |
| `time` | number \| null | `null` | Render exactly this animation time, in milliseconds, and do not animate. Null animates. |
| `seed` | number | `1` | Seed for every random choice, so the same seed always draws the same frame. |

## Children

Put content inside the component. It decorates that content and never changes it.

## Colors

Draws with `--pica-fg`, `--pica-accent`, `--pica-bg`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

// Pica · Y2K Hero · y2k-hero
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
const marquee = (() => {
interface MarqueeProps extends MotionProps {
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

const defaults: MarqueeProps = {
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

const mount: Mount<MarqueeProps> = (host, initial = {}) => {
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
return { mount, defaults };
})();

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

// lib/canvas.ts
/** A canvas that covers the host, marked as the core's own and hidden from assistive technology. By default
 *  its backing store follows the host's size in device pixels. Used by canvas components and lib/gl.ts. */

interface CanvasOptions {
  /** Device pixel ratio ceiling. */
  maxDpr: number;
  /** Backing-store pixel ceiling, so a very large host cannot allocate a very large canvas. */
  maxPixels: number;
  /** Size the backing store to the host in device pixels. Off leaves sizing to the caller, for drawing at a
   *  lower resolution that CSS scales up. */
  autoSize: boolean;
  /** Extra inline CSS for the canvas, such as image-rendering:pixelated. */
  css: string;
  /** Runs when the host's size changes, with its new size in CSS pixels. It is not called at creation, so
   *  draw once yourself after creating the canvas. With autoSize on, the backing store is already resized. */
  onResize: (cssWidth: number, cssHeight: number) => void;
}

interface Surface {
  readonly canvas: HTMLCanvasElement;
  /** Backing-store size in device pixels, kept up to date when autoSize is on. */
  readonly width: number;
  readonly height: number;
  /** Device pixels per CSS pixel, after the ceilings. */
  readonly dpr: number;
  /** The host's size in CSS pixels. */
  readonly cssWidth: number;
  readonly cssHeight: number;
  /** Stops following the host, removes the canvas, and restores the host's styles. */
  destroy(): void;
}

function createCanvas(host: HTMLElement, options: Partial<CanvasOptions> = {}): Surface {
  const { maxDpr = 2, maxPixels = Number.POSITIVE_INFINITY, autoSize = true, css = "", onResize } = options;
  const restore = styleHost(
    host,
    getComputedStyle(host).position === "static" ? { position: "relative", overflow: "hidden" } : { overflow: "hidden" },
  );
  const canvas = document.createElement("canvas");
  canvas.setAttribute("data-pica", "");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = `position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;${css}`;
  host.appendChild(canvas);
  let cssWidth = -1;
  let cssHeight = -1;
  let width = 0;
  let height = 0;
  let dpr = 1;

  /** Reads the host's size. Returns true when it changed. */
  function measure(): boolean {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (w === cssWidth && h === cssHeight) return false;
    cssWidth = w;
    cssHeight = h;
    dpr = Math.min(globalThis.devicePixelRatio || 1, maxDpr, Math.sqrt(maxPixels / (Math.max(1, w) * Math.max(1, h))));
    if (autoSize) {
      width = Math.max(1, Math.round(w * dpr));
      height = Math.max(1, Math.round(h * dpr));
      canvas.width = width;
      canvas.height = height;
    }
    return true;
  }

  measure();
  const observer = typeof ResizeObserver === "function"
    ? new ResizeObserver(() => {
        if (measure()) onResize?.(cssWidth, cssHeight);
      })
    : null;
  observer?.observe(host);

  return {
    canvas,
    get width() {
      return width;
    },
    get height() {
      return height;
    },
    get dpr() {
      return dpr;
    },
    get cssWidth() {
      return cssWidth;
    },
    get cssHeight() {
      return cssHeight;
    },
    destroy() {
      observer?.disconnect();
      canvas.remove();
      restore();
    },
  };
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

/** The color glyphs are drawn in: --pica-fg when set, otherwise the host's inherited color. It reads once;
 *  a core that needs the color every frame keeps a watchPalette handle from lib/palette.ts instead. */
function inkColor(host: HTMLElement): string {
  return readPalette(host).fg;
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

// lib/dither.ts
/** Reducing tone to ink or no ink. Thresholds and kernels follow Surma's "Ditherpunk". */

/** Ordered-dither thresholds for a size by size Bayer matrix, row-major, each in (0, 1). */
function bayerMatrix(size: 2 | 4 | 8): Float32Array {
  // Built by doubling: each step places 4M, 4M + 2, 4M + 3, and 4M + 1 in the four quadrants.
  let m = [0];
  let n = 1;
  while (n < size) {
    const next = new Array<number>(4 * n * n).fill(0);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const v = 4 * (m[y * n + x] ?? 0);
        next[y * 2 * n + x] = v;
        next[y * 2 * n + x + n] = v + 2;
        next[(y + n) * 2 * n + x] = v + 3;
        next[(y + n) * 2 * n + x + n] = v + 1;
      }
    }
    m = next;
    n *= 2;
  }
  const out = new Float32Array(size * size);
  for (let i = 0; i < out.length; i++) out[i] = ((m[i] ?? 0) + 0.5) / (size * size);
  return out;
}

const bayerCache = new Map<number, Float32Array>();

/** The ordered-dither threshold at pixel (x, y) of a tiled Bayer matrix, in (0, 1). Each size is built once. */
function bayerAt(size: 2 | 4 | 8, x: number, y: number): number {
  let m = bayerCache.get(size);
  if (!m) {
    m = bayerMatrix(size);
    bayerCache.set(size, m);
  }
  const mx = ((x % size) + size) % size;
  const my = ((y % size) + size) % size;
  return m[my * size + mx] ?? 0.5;
}

/** Ink or no ink for each value in 0..1, row-major. `bayer` 0 cuts flat at `level`; 2, 4, or 8 dithers
 *  around `level` with that Bayer matrix. Ink goes where a value reaches its threshold. Returns 1 where
 *  ink goes. */
function threshold(values: ArrayLike<number>, width: number, height: number, level = 0.5, bayer: 0 | 2 | 4 | 8 = 0): Uint8Array {
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const cut = bayer === 0 ? level : level + bayerAt(bayer, x, y) - 0.5;
      out[i] = (values[i] ?? 0) >= cut ? 1 : 0;
    }
  }
  return out;
}

type Diffusion = "floyd-steinberg" | "atkinson";

const KERNELS: Record<Diffusion, readonly (readonly [number, number, number])[]> = {
  "floyd-steinberg": [[1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]],
  // Atkinson spreads three quarters of the error, which keeps highlights and shadows cleaner.
  atkinson: [[1, 0, 1 / 8], [2, 0, 1 / 8], [-1, 1, 1 / 8], [0, 1, 1 / 8], [1, 1, 1 / 8], [0, 2, 1 / 8]],
};

/** Error diffusion over ink values in 0..1, row-major. Returns 1 where ink goes. The input is not changed. */
function diffuse(values: ArrayLike<number>, width: number, height: number, kernel: Diffusion): Uint8Array {
  const v = Float32Array.from(values);
  const out = new Uint8Array(width * height);
  const taps = KERNELS[kernel];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const old = v[i] ?? 0;
      const bit = old >= 0.5 ? 1 : 0;
      out[i] = bit;
      const error = old - bit;
      for (const [dx, dy, weight] of taps) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny < height) {
          const j = ny * width + nx;
          v[j] = (v[j] ?? 0) + error * weight;
        }
      }
    }
  }
  return out;
}

// lib/font.ts
/** The monospace stack glyph components default to. It lives in its own module, so a text component that
 *  never draws a grid does not carry lib/glyph-grid.ts into its single React file just for the font. */
const GRID_FONT = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

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

// registry/sections/y2k-hero/core.ts
/** One call to action: a link's visible text and destination. */
export interface Y2kAction {
  /** Text on the link. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface Y2kHeroProps extends MotionProps {
  /** The big line drawn above the wrapped content. An empty string hides it. */
  headline: string;
  /** A quieter line under the headline, in the muted ink. An empty string hides it. */
  subhead: string;
  /** Calls to action, drawn as real beveled links. At most three are shown. */
  actions: readonly Y2kAction[];
  /** Text alignment inside the column: centered, the way of the era, or flush to the start edge. */
  align: "center" | "start";
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
  /** Text for the scrolling strip pinned to the top edge. An empty string removes the strip. */
  ticker: string;
  /** A fine line screen over the whole section, mounted from the scanlines core. */
  scanlines: boolean;
  /** The two chrome bars framing the content. */
  rails: boolean;
  /** Starbursts the seed scatters behind the content, from 0 to 4. */
  stars: number;
  /** How strongly the drawn frame inks, from 0 to 1. */
  intensity: number;
  /** The bright band that sweeps along the chrome while the clock runs. */
  sheen: boolean;
  /** Frames drawn per second while animating. */
  fps: number;
}

export const defaults: Y2kHeroProps = {
  headline: "Welcome To The Future",
  subhead: "Everything here is chrome plated, hand assembled, and best viewed at any resolution.",
  actions: [
    { label: "Enter", href: "#enter" },
    { label: "Guestbook", href: "#guestbook" },
  ],
  align: "center",
  minHeight: 78,
  ticker: "EST. 2000",
  scanlines: true,
  rails: true,
  stars: 2,
  intensity: 0.9,
  sheen: true,
  fps: 24,
  paused: false,
  time: null,
  seed: 1,
};

/** Edge of one dither cell in canvas pixels. Every cell shares a single ordered threshold, which is what
 *  makes the chrome read as printed bands rather than as a smooth gradient. */
const DOT = 3;

/** Ink codes in the block grid: which palette color a cell takes once its threshold is met. */
const INK_FG = 1;
const INK_ACCENT = 2;
const INK_BG = 3;

/** A palette color resolved to channel values for the pixel buffer. */
type Rgba = readonly [number, number, number, number];

/** One scattered starburst, all of its randomness drawn from the seed at mount or on update. */
interface Burst {
  /** Center across the host, as a fraction of its width. */
  fx: number;
  /** Center down the host, as a fraction of its height. */
  fy: number;
  /** Radius in dither cells. */
  rb: number;
  /** One cell of flat offset ink behind the burst, the two step bevel read. */
  twin: number;
  /** Resting rotation, in radians. */
  ang: number;
  /** Spin rate, in radians per second, sign included. */
  spin: number;
  /** Phase offset for the breathing pulse. */
  phase: number;
}

/** Keeps minHeight inside a sane range even if a caller passes something outside 0 to 100. */
function clampVh(minHeight: number): number {
  return Math.min(100, Math.max(0, minHeight));
}

/** The chrome ramp as hard tone steps: a bright lip, a fall through the dark horizon, and a bright base.
 *  Every step is a flat tone, so the bar reads as machined metal printed in dither rather than as a blend. */
function chromeStep(v: number): number {
  if (v < 0.12) return 0.97;
  if (v < 0.4) return 0.62;
  if (v < 0.62) return 0.08;
  if (v < 0.8) return 0.45;
  return 0.9;
}

/** Creates one element the core owns, marked with data-pica and a part attribute the scoped rules select by. */
function part<K extends keyof HTMLElementTagNameMap>(tag: K, name: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute(`data-pica-${name}`, "");
  return node;
}

/** Rebuilds the action links from JSON: at most three, the first solid in the accent and the rest outline.
 *  Every one is a real link, so the browser's own keyboard and middle click come with it. */
function fillLinks(container: HTMLElement, actions: readonly Y2kAction[]): void {
  container.replaceChildren();
  for (const [i, action] of actions.slice(0, 3).entries()) {
    const a = document.createElement("a");
    a.setAttribute("data-pica", "");
    a.dataset.variant = i === 0 ? "solid" : "outline";
    a.href = action.href || "#";
    a.textContent = action.label;
    container.append(a);
  }
}

/** Scoped layout for the host and every node the core owns. Bevels are two flat tone steps: the top and
 *  left edges take the full ink, the bottom and right a dimmed step, with square corners and no shadow.
 *  The minimum height sits in a :where() rule, which carries no specificity, so a page that gives this
 *  host a height of its own still wins. */
function sheetCss(s: string, p: Y2kHeroProps): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const muted = cssVar("muted");
  const dim = `color-mix(in srgb, ${fg} 38%, transparent)`;
  const centered = p.align !== "start";
  const edge = centered ? "center" : "flex-start";
  const textAlign = centered ? "center" : "start";
  const padX = "clamp(1rem, 5vw, 4rem)";
  return [
    `:where(${s}){min-height:${clampVh(p.minHeight)}vh}`,
    `${s}{box-sizing:border-box;position:relative;display:flex;flex-direction:column;align-items:${edge};justify-content:center;gap:0.7em;color:${fg};padding:clamp(96px,14vh,136px) ${padX} clamp(76px,10vh,108px)}`,
    `${s} > :not([data-pica]){max-width:42rem;text-align:${textAlign}}`,
    `${s} > [data-pica-headline]{max-width:42rem;margin:0;font-size:clamp(2rem,6vw,3.6rem);font-weight:700;line-height:1.05;text-align:${textAlign}}`,
    `${s} > [data-pica-subhead]{max-width:36rem;margin:0;color:${muted};font-size:clamp(0.95rem,1.5vw,1.1rem);line-height:1.5;text-align:${textAlign}}`,
    `${s} > [data-pica-ticker]{position:absolute;top:0;left:0;right:0;font-family:${GRID_FONT};font-size:0.72em;letter-spacing:0.16em;line-height:1.4;text-transform:uppercase;color:${fg};border-top:2px solid ${fg};border-bottom:2px solid ${dim};padding:0.4em 0.8em}`,
    `${s} > [data-pica-actions]{display:flex;flex-wrap:wrap;align-items:center;gap:0.75em;max-width:42rem;margin-top:0.5em;justify-content:${edge}}`,
    `${s} > [data-pica-actions]:empty{display:none}`,
    `${s} > [data-pica-actions] a{appearance:none;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.6em 1.3em;display:inline-flex;align-items:center;border:2px solid ${fg};border-color:${fg} ${dim} ${dim} ${fg};border-radius:0;cursor:pointer}`,
    `${s} > [data-pica-actions] a[data-variant="solid"]{background:${accent};color:${cssOn("accent")}}`,
    `${s} > [data-pica-actions] a[data-variant="outline"]{background:transparent;color:${fg}}`,
    `${s} > [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${accent} 85%, ${fg})}`,
    `${s} > [data-pica-actions] a[data-variant="outline"]:hover{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${s} > [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${s} > [data-pica-scan]{position:absolute;inset:0;z-index:1;pointer-events:none}`,
  ].join("\n");
}

export const mount: Mount<Y2kHeroProps> = (host, initial = {}) => {
  let props: Y2kHeroProps = { ...defaults, ...initial };
  const sheet = scope(host);

  // The chrome scene draws into a canvas on a layer under the wrapped content, one ordered dither cell
  // at a time, upscaled with no smoothing so every cell stays a printed dot.
  const under = layer(host, "under");
  const surface = createCanvas(under.el, {
    maxDpr: 1,
    onResize: () => {
      sizeScene();
      loop.redraw();
    },
  });
  const view = surface.canvas.getContext("2d");
  const plate = document.createElement("canvas");
  const plateCtx = plate.getContext("2d");
  const bayer = bayerMatrix(8);

  const headlineEl = part("h1", "headline");
  const subheadEl = part("p", "subhead");
  const actions = part("div", "actions");
  const tickerHost = part("div", "ticker");
  tickerHost.setAttribute("aria-hidden", "true");
  const scanHost = part("div", "scan");
  scanHost.setAttribute("aria-hidden", "true");

  let bw = 0;
  let bh = 0;
  let img: ImageData | null = null;
  let tone = new Float32Array(0);
  let ink = new Uint8Array(0);
  let bursts: Burst[] = [];
  let marks: readonly (readonly [number, number])[] = [];
  let fgInk: Rgba = [0, 0, 0, 0];
  let accentInk: Rgba = [0, 0, 0, 0];
  let bgInk: Rgba = [0, 0, 0, 0];

  /** Reallocates the block grid and its plate to match the canvas backing store. */
  function sizeScene(): void {
    bw = Math.max(1, Math.ceil(surface.width / DOT));
    bh = Math.max(1, Math.ceil(surface.height / DOT));
    tone = new Float32Array(bw * bh);
    ink = new Uint8Array(bw * bh);
    plate.width = bw;
    plate.height = bh;
    img = plateCtx ? plateCtx.createImageData(bw, bh) : null;
  }

  function readInks(): void {
    fgInk = parseColor(pal.colors.fg);
    accentInk = parseColor(pal.colors.accent);
    bgInk = parseColor(pal.colors.bg);
  }

  const pal = watchPalette(host, () => {
    readInks();
    loop.redraw();
  });

  /** Scatters the starbursts and the small registration marks from the seed: alternating sides, clear of
   *  the rails, spinning slowly. */
  function seedBursts(): void {
    const rng = createRng(props.seed);
    const count = Math.max(0, Math.min(4, Math.round(props.stars)));
    const next: Burst[] = [];
    for (let i = 0; i < count; i++) {
      next.push({
        fx: i % 2 === 0 ? 0.1 + 0.16 * rng() : 0.74 + 0.16 * rng(),
        fy: 0.3 + 0.4 * rng(),
        rb: 11 + 10 * rng(),
        twin: 1 + Math.floor(rng() * 2),
        ang: rng() * Math.PI,
        spin: (rng() < 0.5 ? -1 : 1) * (0.08 + 0.1 * rng()),
        phase: rng() * Math.PI * 2,
      });
    }
    bursts = next;
    const pluses: [number, number][] = [];
    for (let i = 0; i < 7; i++) pluses.push([0.04 + 0.92 * rng(), 0.16 + 0.68 * rng()]);
    marks = pluses;
  }

  function plotBlock(bx: number, by: number, code: number, level: number): void {
    if (bx < 0 || by < 0 || bx >= bw || by >= bh) return;
    const i = by * bw + bx;
    ink[i] = code;
    tone[i] = level;
  }

  /** One chrome bar: the banded ramp with machined ends and a brighter band sweeping along it while the
   *  clock runs, trailed by a dark one. Every mark it makes is a flat tone step. */
  function paintRail(x0: number, y0: number, x1: number, y1: number, t: number, phase0: number, gain: number): void {
    const h = Math.max(1, y1 - y0);
    const mid = (y0 + y1) / 2;
    const sheenW = Math.max(5, Math.round((x1 - x0) * 0.13));
    const sx = x0 - sheenW + ((t / 6400 + phase0) % 1) * (x1 - x0 + sheenW * 2);
    for (let by = y0; by < y1; by++) {
      const base = chromeStep((by - y0) / h);
      const slant = (by - mid) * 0.55;
      for (let bx = x0; bx < x1; bx++) {
        let level = base;
        if (props.sheen) {
          const d = bx - sx - slant;
          if (Math.abs(d) <= sheenW * 0.5) level = 0.98;
          else if (d < -sheenW * 0.5 && d >= -sheenW * 1.5) level = 0.06;
        }
        if (bx < x0 + 3 || bx >= x1 - 3) level = Math.min(level, base * 0.45);
        plotBlock(bx, by, INK_FG, level * gain);
      }
    }
  }

  /** A rotated astroid: the four pointed sparkle of the era, one flat tone where it lands. */
  function paintAstroid(cx: number, cy: number, r: number, cos: number, sin: number, code: number, level: number): void {
    const e = 0.62;
    const rp = Math.pow(r, e);
    const x0 = Math.max(0, Math.floor(cx - r));
    const x1 = Math.min(bw - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r));
    const y1 = Math.min(bh - 1, Math.ceil(cy + r));
    for (let by = y0; by <= y1; by++) {
      for (let bx = x0; bx <= x1; bx++) {
        const dx = bx - cx;
        const dy = by - cy;
        const u = dx * cos + dy * sin;
        const v = -dx * sin + dy * cos;
        if (Math.pow(Math.abs(u), e) + Math.pow(Math.abs(v), e) <= rp) plotBlock(bx, by, code, level);
      }
    }
  }

  /** One starburst as flat steps: a ground knockout, a flat offset twin, the sparkle, and a brighter core,
   *  so the chrome bands never show through it. */
  function paintBurst(burst: Burst, t: number, gain: number): void {
    const cx = burst.fx * bw;
    const cy = burst.fy * bh;
    const r = burst.rb * (1 + 0.05 * Math.sin(t * 0.0011 + burst.phase));
    const a = burst.ang + (burst.spin * t) / 1000;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    paintAstroid(cx, cy, r * 1.24, cos, sin, INK_BG, 1);
    paintAstroid(cx + burst.twin, cy + burst.twin, r, cos, sin, INK_FG, 0.45 * gain);
    paintAstroid(cx, cy, r, cos, sin, INK_ACCENT, 0.6 * gain);
    paintAstroid(cx, cy, r * 0.5, cos, sin, INK_ACCENT, 0.82 * gain);
  }

  /** One small registration mark: a plus of five cells at a flat tone. */
  function paintMark(fx: number, fy: number, gain: number): void {
    const bx = Math.round(fx * bw);
    const by = Math.round(fy * bh);
    const level = 0.5 * gain;
    plotBlock(bx, by, INK_FG, level);
    plotBlock(bx - 1, by, INK_FG, level);
    plotBlock(bx + 1, by, INK_FG, level);
    plotBlock(bx, by - 1, INK_FG, level);
    plotBlock(bx, by + 1, INK_FG, level);
  }

  function draw(t: number): void {
    if (!view || !plateCtx || !img) return;
    const W = surface.width;
    const H = surface.height;
    if (W === 0 || H === 0) return;
    tone.fill(0);
    ink.fill(0);
    const gain = Math.min(1, Math.max(0, props.intensity));

    if (props.rails) {
      const railH = Math.max(9, Math.min(16, Math.round(bh * 0.055)));
      const x0 = Math.round(bw * 0.05);
      const tickH = props.ticker.trim() === "" ? 0 : Math.ceil(tickerHost.clientHeight / DOT);
      paintRail(x0, tickH + 5, bw - x0, tickH + 5 + railH, t, 0.3, gain);
      paintRail(x0, bh - 6 - railH, bw - x0, bh - 6, t, 0.8, gain);
    }
    for (const [fx, fy] of marks) paintMark(fx, fy, gain);
    for (const burst of bursts) paintBurst(burst, t, gain);

    const data = img.data;
    data.fill(0);
    let i = 0;
    for (let by = 0; by < bh; by++) {
      const row = by * bw;
      const cut = (by & 7) * 8;
      for (let bx = 0; bx < bw; bx++) {
        const code = ink[row + bx] ?? 0;
        if (code !== 0 && (tone[row + bx] ?? 0) > (bayer[cut + (bx & 7)] ?? 1)) {
          const col = code === INK_ACCENT ? accentInk : code === INK_BG ? bgInk : fgInk;
          data[i] = col[0];
          data[i + 1] = col[1];
          data[i + 2] = col[2];
          data[i + 3] = col[3];
        }
        i += 4;
      }
    }
    plateCtx.putImageData(img, 0, 0);
    view.imageSmoothingEnabled = false;
    view.clearRect(0, 0, W, H);
    view.drawImage(plate, 0, 0, bw * DOT, bh * DOT);
    host.dataset.picaReady = "true";
  }

  const loop = createLoop({
    el: host,
    fps: props.fps,
    paused: props.paused,
    time: props.time,
    still: 1200,
    frame: draw,
  });

  let tickerInstance: ReturnType<typeof marquee.mount> | null = null;
  let scanInstance: ReturnType<typeof scanlines.mount> | null = null;

  function tickerProps(): Partial<typeof marquee.defaults> {
    return { speed: 30, direction: "left", gap: 3, pauseOnHover: true, paused: props.paused, time: props.time, fps: props.fps };
  }

  /** Rebuilds the scrolling strip: fresh text inside the same sub-host, remounted so the cycle is measured
   *  against the new line rather than the old one's width. */
  function renderTicker(): void {
    tickerInstance?.destroy();
    tickerInstance = null;
    tickerHost.replaceChildren();
    const text = props.ticker.trim();
    tickerHost.style.display = text ? "" : "none";
    if (!text) return;
    const item = document.createElement("span");
    item.textContent = `${text} ✶`;
    tickerHost.append(item);
    tickerInstance = marquee.mount(tickerHost, tickerProps());
  }

  function scanProps(): Partial<typeof scanlines.defaults> {
    return { spacing: 3, thickness: 1, opacity: 0.12, roll: true, rollSpeed: 18, paused: props.paused, time: props.time, fps: props.fps };
  }

  function renderScan(): void {
    if (props.scanlines && !scanInstance) scanInstance = scanlines.mount(scanHost, scanProps());
    else if (!props.scanlines && scanInstance) {
      scanInstance.destroy();
      scanInstance = null;
    } else scanInstance?.update(scanProps());
  }

  /** Keeps the text parts before the wrapped children, dropping empty ones entirely. */
  function syncTop(): void {
    headlineEl.textContent = props.headline;
    subheadEl.textContent = props.subhead;
    const top: HTMLElement[] = [];
    if (props.headline.trim()) top.push(headlineEl);
    else headlineEl.remove();
    if (props.subhead.trim()) top.push(subheadEl);
    else subheadEl.remove();
    host.prepend(...top);
  }

  readInks();
  sizeScene();
  seedBursts();
  sheet.setRules(sheetCss(sheet.selector, props));
  syncTop();
  fillLinks(actions, props.actions);
  host.append(actions, tickerHost, scanHost);
  renderTicker();
  renderScan();
  draw(props.time ?? 1200);

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };

      if (props.paused !== before.paused || props.time !== before.time || props.fps !== before.fps) {
        loop.update({ paused: props.paused, time: props.time, fps: props.fps });
        tickerInstance?.update(tickerProps());
        scanInstance?.update(scanProps());
      }
      if (props.ticker !== before.ticker) renderTicker();
      if (props.scanlines !== before.scanlines) renderScan();
      if (props.align !== before.align || props.minHeight !== before.minHeight) sheet.setRules(sheetCss(sheet.selector, props));
      if (props.headline !== before.headline || props.subhead !== before.subhead) syncTop();
      if (!sameJson(before.actions, props.actions)) fillLinks(actions, props.actions);
      if (props.seed !== before.seed || props.stars !== before.stars) seedBursts();
      if (
        props.seed !== before.seed ||
        props.stars !== before.stars ||
        props.rails !== before.rails ||
        props.sheen !== before.sheen ||
        props.intensity !== before.intensity
      ) {
        loop.redraw();
      }
      if (pal.refresh()) loop.redraw();
    },
    destroy() {
      tickerInstance?.destroy();
      scanInstance?.destroy();
      loop.destroy();
      pal.destroy();
      surface.destroy();
      under.remove();
      for (const node of [headlineEl, subheadEl, actions, tickerHost, scanHost]) node.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};

// registry/sections/y2k-hero/index.tsx
export type Y2kHeroComponentProps = Partial<Y2kHeroProps> & WrapperProps & { children?: ReactNode };

/** A centered millennium hero: banded chrome rails, seeded starbursts, a scrolling ticker, and beveled links. */
export function Y2kHero({ className, style, palette, children, ...props }: Y2kHeroComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Y2K Hero · y2k-hero
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en" data-stage="flow">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Y2K Hero · Pica</title>
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
<div id="pica"><p>Hand assembled, seeded fresh on every visit, and best viewed at any resolution.</p></div>
<script>
"use strict";
var PicaY2kHero = (() => {
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

  // registry/sections/y2k-hero/core.ts
  var core_exports = {};
  __export(core_exports, {
    defaults: () => defaults3,
    mount: () => mount3
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
  function layer(host, where, tag = "div") {
    const el = document.createElement(tag);
    el.setAttribute("data-pica", "");
    el.setAttribute("aria-hidden", "true");
    el.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:${where === "under" ? -1 : 1}`;
    const styles = {};
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

  // lib/palette.ts
  var TOKENS = ["fg", "bg", "accent", "muted"];
  var TOKEN_FALLBACK = {
    fg: "currentColor",
    bg: "transparent",
    accent: "#13C4A3",
    muted: "color-mix(in srgb, var(--pica-fg, currentColor) 65%, transparent)"
  };
  function cssVar(token) {
    return `var(--pica-${token}, ${TOKEN_FALLBACK[token]})`;
  }
  function cssOn(token) {
    return `oklch(from ${cssVar(token)} clamp(0, (0.62 - l) * 1000, 1) 0 0)`;
  }
  var PROBE_EVENTS = ["transitionrun", "transitionstart", "transitionend", "transitioncancel"];
  function createProbe(host) {
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
      "transition:color 1ms,background-color 1ms,border-top-color 1ms,outline-color 1ms"
    ].join(";");
    host.appendChild(probe);
    return probe;
  }
  function probeColors(probe) {
    const style = getComputedStyle(probe);
    return { fg: style.color, bg: style.backgroundColor, accent: style.borderTopColor, muted: style.outlineColor };
  }
  function watchPalette(host, onChange) {
    const probe = createProbe(host);
    let colors = probeColors(probe);
    function refresh() {
      const next = probeColors(probe);
      const differs = TOKENS.some((token) => next[token] !== colors[token]);
      colors = next;
      return differs;
    }
    const onEvent = (event) => {
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
      }
    };
  }

  // registry/effects/scanlines/core.ts
  var defaults2 = {
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
  var ROLL_BAND = `linear-gradient(to bottom, transparent 0%, transparent 38%, ${cssVar("fg")} 50%, transparent 62%, transparent 100%)`;
  var ROLL_VAR = "--pica-scanlines-roll";
  var mount2 = (host, initial = {}) => {
    let props = { ...defaults2, ...initial };
    const lines = layer(host, "over");
    const sheet = scope(host);
    function draw(t) {
      if (props.roll) {
        const period = Math.max(1, props.rollSpeed) * 1e3;
        const phase = (t % period + period) % period / period;
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
      frame: draw
    });
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        if (props.spacing !== before.spacing || props.thickness !== before.thickness || props.opacity !== before.opacity || props.roll !== before.roll) {
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
      }
    };
  };
  function rules(selector, p) {
    const thickness = Math.min(p.thickness, p.spacing);
    const ink = cssVar("fg");
    const stripes = `repeating-linear-gradient(to bottom, ${ink} 0, ${ink} ${thickness}px, transparent ${thickness}px, transparent ${p.spacing}px)`;
    const declarations = [`opacity:${p.opacity}`];
    if (p.roll) {
      declarations.push(
        `background-image:${ROLL_BAND},${stripes}`,
        `background-size:100% 100%,100% ${p.spacing}px`,
        "background-repeat:repeat-y,repeat-y",
        `background-position:0 var(${ROLL_VAR},0px),0 0`
      );
    } else {
      declarations.push(`background-image:${stripes}`, `background-size:100% ${p.spacing}px`, "background-repeat:repeat-y");
    }
    return `${selector} > div[data-pica]{${declarations.join(";")}}`;
  }

  // lib/canvas.ts
  function createCanvas(host, options = {}) {
    const { maxDpr = 2, maxPixels = Number.POSITIVE_INFINITY, autoSize = true, css = "", onResize } = options;
    const restore = styleHost(
      host,
      getComputedStyle(host).position === "static" ? { position: "relative", overflow: "hidden" } : { overflow: "hidden" }
    );
    const canvas = document.createElement("canvas");
    canvas.setAttribute("data-pica", "");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = `position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;${css}`;
    host.appendChild(canvas);
    let cssWidth = -1;
    let cssHeight = -1;
    let width = 0;
    let height = 0;
    let dpr = 1;
    function measure() {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w === cssWidth && h === cssHeight) return false;
      cssWidth = w;
      cssHeight = h;
      dpr = Math.min(globalThis.devicePixelRatio || 1, maxDpr, Math.sqrt(maxPixels / (Math.max(1, w) * Math.max(1, h))));
      if (autoSize) {
        width = Math.max(1, Math.round(w * dpr));
        height = Math.max(1, Math.round(h * dpr));
        canvas.width = width;
        canvas.height = height;
      }
      return true;
    }
    measure();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(() => {
      if (measure()) onResize?.(cssWidth, cssHeight);
    }) : null;
    observer?.observe(host);
    return {
      canvas,
      get width() {
        return width;
      },
      get height() {
        return height;
      },
      get dpr() {
        return dpr;
      },
      get cssWidth() {
        return cssWidth;
      },
      get cssHeight() {
        return cssHeight;
      },
      destroy() {
        observer?.disconnect();
        canvas.remove();
        restore();
      }
    };
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

  // lib/dither.ts
  function bayerMatrix(size) {
    let m = [0];
    let n = 1;
    while (n < size) {
      const next = new Array(4 * n * n).fill(0);
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const v = 4 * (m[y * n + x] ?? 0);
          next[y * 2 * n + x] = v;
          next[y * 2 * n + x + n] = v + 2;
          next[(y + n) * 2 * n + x] = v + 3;
          next[(y + n) * 2 * n + x + n] = v + 1;
        }
      }
      m = next;
      n *= 2;
    }
    const out = new Float32Array(size * size);
    for (let i = 0; i < out.length; i++) out[i] = ((m[i] ?? 0) + 0.5) / (size * size);
    return out;
  }
  var KERNELS = {
    "floyd-steinberg": [[1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]],
    // Atkinson spreads three quarters of the error, which keeps highlights and shadows cleaner.
    atkinson: [[1, 0, 1 / 8], [2, 0, 1 / 8], [-1, 1, 1 / 8], [0, 1, 1 / 8], [1, 1, 1 / 8], [0, 2, 1 / 8]]
  };

  // lib/font.ts
  var GRID_FONT = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

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

  // registry/sections/y2k-hero/core.ts
  var defaults3 = {
    headline: "Welcome To The Future",
    subhead: "Everything here is chrome plated, hand assembled, and best viewed at any resolution.",
    actions: [
      { label: "Enter", href: "#enter" },
      { label: "Guestbook", href: "#guestbook" }
    ],
    align: "center",
    minHeight: 78,
    ticker: "EST. 2000",
    scanlines: true,
    rails: true,
    stars: 2,
    intensity: 0.9,
    sheen: true,
    fps: 24,
    paused: false,
    time: null,
    seed: 1
  };
  var DOT = 3;
  var INK_FG = 1;
  var INK_ACCENT = 2;
  var INK_BG = 3;
  function clampVh(minHeight) {
    return Math.min(100, Math.max(0, minHeight));
  }
  function chromeStep(v) {
    if (v < 0.12) return 0.97;
    if (v < 0.4) return 0.62;
    if (v < 0.62) return 0.08;
    if (v < 0.8) return 0.45;
    return 0.9;
  }
  function part(tag, name) {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    node.setAttribute(`data-pica-${name}`, "");
    return node;
  }
  function fillLinks(container, actions) {
    container.replaceChildren();
    for (const [i, action] of actions.slice(0, 3).entries()) {
      const a = document.createElement("a");
      a.setAttribute("data-pica", "");
      a.dataset.variant = i === 0 ? "solid" : "outline";
      a.href = action.href || "#";
      a.textContent = action.label;
      container.append(a);
    }
  }
  function sheetCss(s, p) {
    const fg = cssVar("fg");
    const accent = cssVar("accent");
    const muted = cssVar("muted");
    const dim = `color-mix(in srgb, ${fg} 38%, transparent)`;
    const centered = p.align !== "start";
    const edge = centered ? "center" : "flex-start";
    const textAlign = centered ? "center" : "start";
    const padX = "clamp(1rem, 5vw, 4rem)";
    return [
      `:where(${s}){min-height:${clampVh(p.minHeight)}vh}`,
      `${s}{box-sizing:border-box;position:relative;display:flex;flex-direction:column;align-items:${edge};justify-content:center;gap:0.7em;color:${fg};padding:clamp(96px,14vh,136px) ${padX} clamp(76px,10vh,108px)}`,
      `${s} > :not([data-pica]){max-width:42rem;text-align:${textAlign}}`,
      `${s} > [data-pica-headline]{max-width:42rem;margin:0;font-size:clamp(2rem,6vw,3.6rem);font-weight:700;line-height:1.05;text-align:${textAlign}}`,
      `${s} > [data-pica-subhead]{max-width:36rem;margin:0;color:${muted};font-size:clamp(0.95rem,1.5vw,1.1rem);line-height:1.5;text-align:${textAlign}}`,
      `${s} > [data-pica-ticker]{position:absolute;top:0;left:0;right:0;font-family:${GRID_FONT};font-size:0.72em;letter-spacing:0.16em;line-height:1.4;text-transform:uppercase;color:${fg};border-top:2px solid ${fg};border-bottom:2px solid ${dim};padding:0.4em 0.8em}`,
      `${s} > [data-pica-actions]{display:flex;flex-wrap:wrap;align-items:center;gap:0.75em;max-width:42rem;margin-top:0.5em;justify-content:${edge}}`,
      `${s} > [data-pica-actions]:empty{display:none}`,
      `${s} > [data-pica-actions] a{appearance:none;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.6em 1.3em;display:inline-flex;align-items:center;border:2px solid ${fg};border-color:${fg} ${dim} ${dim} ${fg};border-radius:0;cursor:pointer}`,
      `${s} > [data-pica-actions] a[data-variant="solid"]{background:${accent};color:${cssOn("accent")}}`,
      `${s} > [data-pica-actions] a[data-variant="outline"]{background:transparent;color:${fg}}`,
      `${s} > [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${accent} 85%, ${fg})}`,
      `${s} > [data-pica-actions] a[data-variant="outline"]:hover{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
      `${s} > [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
      `${s} > [data-pica-scan]{position:absolute;inset:0;z-index:1;pointer-events:none}`
    ].join("\n");
  }
  var mount3 = (host, initial = {}) => {
    let props = { ...defaults3, ...initial };
    const sheet = scope(host);
    const under = layer(host, "under");
    const surface = createCanvas(under.el, {
      maxDpr: 1,
      onResize: () => {
        sizeScene();
        loop.redraw();
      }
    });
    const view = surface.canvas.getContext("2d");
    const plate = document.createElement("canvas");
    const plateCtx = plate.getContext("2d");
    const bayer = bayerMatrix(8);
    const headlineEl = part("h1", "headline");
    const subheadEl = part("p", "subhead");
    const actions = part("div", "actions");
    const tickerHost = part("div", "ticker");
    tickerHost.setAttribute("aria-hidden", "true");
    const scanHost = part("div", "scan");
    scanHost.setAttribute("aria-hidden", "true");
    let bw = 0;
    let bh = 0;
    let img = null;
    let tone = new Float32Array(0);
    let ink = new Uint8Array(0);
    let bursts = [];
    let marks = [];
    let fgInk = [0, 0, 0, 0];
    let accentInk = [0, 0, 0, 0];
    let bgInk = [0, 0, 0, 0];
    function sizeScene() {
      bw = Math.max(1, Math.ceil(surface.width / DOT));
      bh = Math.max(1, Math.ceil(surface.height / DOT));
      tone = new Float32Array(bw * bh);
      ink = new Uint8Array(bw * bh);
      plate.width = bw;
      plate.height = bh;
      img = plateCtx ? plateCtx.createImageData(bw, bh) : null;
    }
    function readInks() {
      fgInk = parseColor(pal.colors.fg);
      accentInk = parseColor(pal.colors.accent);
      bgInk = parseColor(pal.colors.bg);
    }
    const pal = watchPalette(host, () => {
      readInks();
      loop.redraw();
    });
    function seedBursts() {
      const rng = createRng(props.seed);
      const count = Math.max(0, Math.min(4, Math.round(props.stars)));
      const next = [];
      for (let i = 0; i < count; i++) {
        next.push({
          fx: i % 2 === 0 ? 0.1 + 0.16 * rng() : 0.74 + 0.16 * rng(),
          fy: 0.3 + 0.4 * rng(),
          rb: 11 + 10 * rng(),
          twin: 1 + Math.floor(rng() * 2),
          ang: rng() * Math.PI,
          spin: (rng() < 0.5 ? -1 : 1) * (0.08 + 0.1 * rng()),
          phase: rng() * Math.PI * 2
        });
      }
      bursts = next;
      const pluses = [];
      for (let i = 0; i < 7; i++) pluses.push([0.04 + 0.92 * rng(), 0.16 + 0.68 * rng()]);
      marks = pluses;
    }
    function plotBlock(bx, by, code, level) {
      if (bx < 0 || by < 0 || bx >= bw || by >= bh) return;
      const i = by * bw + bx;
      ink[i] = code;
      tone[i] = level;
    }
    function paintRail(x0, y0, x1, y1, t, phase0, gain) {
      const h = Math.max(1, y1 - y0);
      const mid = (y0 + y1) / 2;
      const sheenW = Math.max(5, Math.round((x1 - x0) * 0.13));
      const sx = x0 - sheenW + (t / 6400 + phase0) % 1 * (x1 - x0 + sheenW * 2);
      for (let by = y0; by < y1; by++) {
        const base = chromeStep((by - y0) / h);
        const slant = (by - mid) * 0.55;
        for (let bx = x0; bx < x1; bx++) {
          let level = base;
          if (props.sheen) {
            const d = bx - sx - slant;
            if (Math.abs(d) <= sheenW * 0.5) level = 0.98;
            else if (d < -sheenW * 0.5 && d >= -sheenW * 1.5) level = 0.06;
          }
          if (bx < x0 + 3 || bx >= x1 - 3) level = Math.min(level, base * 0.45);
          plotBlock(bx, by, INK_FG, level * gain);
        }
      }
    }
    function paintAstroid(cx, cy, r, cos, sin, code, level) {
      const e = 0.62;
      const rp = Math.pow(r, e);
      const x0 = Math.max(0, Math.floor(cx - r));
      const x1 = Math.min(bw - 1, Math.ceil(cx + r));
      const y0 = Math.max(0, Math.floor(cy - r));
      const y1 = Math.min(bh - 1, Math.ceil(cy + r));
      for (let by = y0; by <= y1; by++) {
        for (let bx = x0; bx <= x1; bx++) {
          const dx = bx - cx;
          const dy = by - cy;
          const u = dx * cos + dy * sin;
          const v = -dx * sin + dy * cos;
          if (Math.pow(Math.abs(u), e) + Math.pow(Math.abs(v), e) <= rp) plotBlock(bx, by, code, level);
        }
      }
    }
    function paintBurst(burst, t, gain) {
      const cx = burst.fx * bw;
      const cy = burst.fy * bh;
      const r = burst.rb * (1 + 0.05 * Math.sin(t * 11e-4 + burst.phase));
      const a = burst.ang + burst.spin * t / 1e3;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      paintAstroid(cx, cy, r * 1.24, cos, sin, INK_BG, 1);
      paintAstroid(cx + burst.twin, cy + burst.twin, r, cos, sin, INK_FG, 0.45 * gain);
      paintAstroid(cx, cy, r, cos, sin, INK_ACCENT, 0.6 * gain);
      paintAstroid(cx, cy, r * 0.5, cos, sin, INK_ACCENT, 0.82 * gain);
    }
    function paintMark(fx, fy, gain) {
      const bx = Math.round(fx * bw);
      const by = Math.round(fy * bh);
      const level = 0.5 * gain;
      plotBlock(bx, by, INK_FG, level);
      plotBlock(bx - 1, by, INK_FG, level);
      plotBlock(bx + 1, by, INK_FG, level);
      plotBlock(bx, by - 1, INK_FG, level);
      plotBlock(bx, by + 1, INK_FG, level);
    }
    function draw(t) {
      if (!view || !plateCtx || !img) return;
      const W = surface.width;
      const H = surface.height;
      if (W === 0 || H === 0) return;
      tone.fill(0);
      ink.fill(0);
      const gain = Math.min(1, Math.max(0, props.intensity));
      if (props.rails) {
        const railH = Math.max(9, Math.min(16, Math.round(bh * 0.055)));
        const x0 = Math.round(bw * 0.05);
        const tickH = props.ticker.trim() === "" ? 0 : Math.ceil(tickerHost.clientHeight / DOT);
        paintRail(x0, tickH + 5, bw - x0, tickH + 5 + railH, t, 0.3, gain);
        paintRail(x0, bh - 6 - railH, bw - x0, bh - 6, t, 0.8, gain);
      }
      for (const [fx, fy] of marks) paintMark(fx, fy, gain);
      for (const burst of bursts) paintBurst(burst, t, gain);
      const data = img.data;
      data.fill(0);
      let i = 0;
      for (let by = 0; by < bh; by++) {
        const row = by * bw;
        const cut = (by & 7) * 8;
        for (let bx = 0; bx < bw; bx++) {
          const code = ink[row + bx] ?? 0;
          if (code !== 0 && (tone[row + bx] ?? 0) > (bayer[cut + (bx & 7)] ?? 1)) {
            const col = code === INK_ACCENT ? accentInk : code === INK_BG ? bgInk : fgInk;
            data[i] = col[0];
            data[i + 1] = col[1];
            data[i + 2] = col[2];
            data[i + 3] = col[3];
          }
          i += 4;
        }
      }
      plateCtx.putImageData(img, 0, 0);
      view.imageSmoothingEnabled = false;
      view.clearRect(0, 0, W, H);
      view.drawImage(plate, 0, 0, bw * DOT, bh * DOT);
      host.dataset.picaReady = "true";
    }
    const loop = createLoop({
      el: host,
      fps: props.fps,
      paused: props.paused,
      time: props.time,
      still: 1200,
      frame: draw
    });
    let tickerInstance = null;
    let scanInstance = null;
    function tickerProps() {
      return { speed: 30, direction: "left", gap: 3, pauseOnHover: true, paused: props.paused, time: props.time, fps: props.fps };
    }
    function renderTicker() {
      tickerInstance?.destroy();
      tickerInstance = null;
      tickerHost.replaceChildren();
      const text = props.ticker.trim();
      tickerHost.style.display = text ? "" : "none";
      if (!text) return;
      const item = document.createElement("span");
      item.textContent = `${text} ✶`;
      tickerHost.append(item);
      tickerInstance = mount(tickerHost, tickerProps());
    }
    function scanProps() {
      return { spacing: 3, thickness: 1, opacity: 0.12, roll: true, rollSpeed: 18, paused: props.paused, time: props.time, fps: props.fps };
    }
    function renderScan() {
      if (props.scanlines && !scanInstance) scanInstance = mount2(scanHost, scanProps());
      else if (!props.scanlines && scanInstance) {
        scanInstance.destroy();
        scanInstance = null;
      } else scanInstance?.update(scanProps());
    }
    function syncTop() {
      headlineEl.textContent = props.headline;
      subheadEl.textContent = props.subhead;
      const top = [];
      if (props.headline.trim()) top.push(headlineEl);
      else headlineEl.remove();
      if (props.subhead.trim()) top.push(subheadEl);
      else subheadEl.remove();
      host.prepend(...top);
    }
    readInks();
    sizeScene();
    seedBursts();
    sheet.setRules(sheetCss(sheet.selector, props));
    syncTop();
    fillLinks(actions, props.actions);
    host.append(actions, tickerHost, scanHost);
    renderTicker();
    renderScan();
    draw(props.time ?? 1200);
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        if (props.paused !== before.paused || props.time !== before.time || props.fps !== before.fps) {
          loop.update({ paused: props.paused, time: props.time, fps: props.fps });
          tickerInstance?.update(tickerProps());
          scanInstance?.update(scanProps());
        }
        if (props.ticker !== before.ticker) renderTicker();
        if (props.scanlines !== before.scanlines) renderScan();
        if (props.align !== before.align || props.minHeight !== before.minHeight) sheet.setRules(sheetCss(sheet.selector, props));
        if (props.headline !== before.headline || props.subhead !== before.subhead) syncTop();
        if (!sameJson(before.actions, props.actions)) fillLinks(actions, props.actions);
        if (props.seed !== before.seed || props.stars !== before.stars) seedBursts();
        if (props.seed !== before.seed || props.stars !== before.stars || props.rails !== before.rails || props.sheen !== before.sheen || props.intensity !== before.intensity) {
          loop.redraw();
        }
        if (pal.refresh()) loop.redraw();
      },
      destroy() {
        tickerInstance?.destroy();
        scanInstance?.destroy();
        loop.destroy();
        pal.destroy();
        surface.destroy();
        under.remove();
        for (const node of [headlineEl, subheadEl, actions, tickerHost, scanHost]) node.remove();
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
  var instance = PicaY2kHero.mount(host, take(window.PICA_PROPS || {}));
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
