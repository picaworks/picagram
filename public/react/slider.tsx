"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Slider · slider
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

// registry/ui/slider/core.ts
export interface SliderProps {
  /** The current value, or null to let the slider manage its own value. */
  value: number | null;
  /** The initial value when value is null. */
  defaultValue: number;
  /** The lowest selectable value. */
  min: number;
  /** The highest selectable value. */
  max: number;
  /** The interval between selectable values. */
  step: number;
  /** The amount added or subtracted by Page Up and Page Down. */
  largeStep: number;
  /** The direction in which the track runs. */
  orientation: "horizontal" | "vertical";
  /** The visible and accessible name of the slider. */
  label: string;
  /** Shows the current value beside the label. */
  showValue: boolean;
  /** The track height in rem when orientation is vertical. */
  height: number;
}

export interface SliderEvents {
  /** The user chose a value with the keyboard or pointer. */
  valueChange: number;
}

export const defaults: SliderProps = {
  value: null,
  defaultValue: 30,
  min: 0,
  max: 100,
  step: 1,
  largeStep: 10,
  orientation: "horizontal",
  label: "Volume",
  showValue: true,
  height: 10,
};

function sliderLimits(props: SliderProps): readonly [number, number] {
  return props.max >= props.min ? [props.min, props.max] : [props.min, props.min];
}

function sliderStep(props: SliderProps): number {
  return Number.isFinite(props.step) && props.step > 0 ? props.step : 1;
}

function sliderSnap(raw: number, props: SliderProps): number {
  const [min, max] = sliderLimits(props);
  const step = sliderStep(props);
  const clamped = Math.min(max, Math.max(min, raw));
  const snapped = min + Math.round((clamped - min) / step) * step;
  return Number(Math.min(max, Math.max(min, snapped)).toFixed(10));
}

function sliderRules(s: string, props: SliderProps): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const vertical = props.orientation === "vertical";
  const height = Math.min(30, Math.max(6, props.height));
  const root = `${s} [data-part="root"]`;
  const head = `${s} [data-part="head"]`;
  const value = `${s} [data-part="value"]`;
  const track = `${s} [data-part="track"]`;
  const rail = `${s} [data-part="rail"]`;
  const fill = `${s} [data-part="fill"]`;
  const thumb = `${s} [data-part="thumb"]`;
  return [
    `${s}{display:inline-block;color:${fg};vertical-align:middle}`,
    `${root}{display:grid;gap:0.35em;${vertical ? "justify-items:center" : "width:min(22rem,80vw)"}}`,
    `${head}{display:flex;align-items:baseline;justify-content:space-between;gap:2em;width:100%;font:inherit;line-height:1.2}`,
    `${value}{font-family:${GRID_FONT};font-variant-numeric:tabular-nums;text-align:right;min-width:4ch}`,
    `${track}{position:relative;touch-action:none;user-select:none;cursor:pointer;${vertical ? `width:2rem;height:${height}rem` : "width:100%;height:2rem"}}`,
    `${rail}{position:absolute;background:color-mix(in srgb, ${fg} 35%, transparent);${vertical ? "top:0.5rem;bottom:0.5rem;left:50%;width:1px" : "left:0.5rem;right:0.5rem;top:50%;height:1px"}}`,
    `${fill}{position:absolute;background:${accent};${vertical ? "left:0;right:0;bottom:0;height:var(--slider-fill)" : "left:0;top:0;bottom:0;width:var(--slider-fill)"}}`,
    `${thumb}{position:absolute;box-sizing:border-box;width:0.9rem;height:0.9rem;border:1px solid ${fg};border-radius:0;background:transparent;cursor:grab;${vertical ? "left:50%;bottom:var(--slider-fill);transform:translate(-50%,50%)" : "top:50%;left:var(--slider-fill);transform:translate(-50%,-50%)"}}`,
    `${thumb}:hover,${track}[data-dragging="true"] ${thumb}{background:${accent};border-color:${accent}}`,
    `${thumb}:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${track}[data-dragging="true"] ${thumb}{cursor:grabbing}`,
  ].join("\n");
}

export const mount: Mount<SliderProps> = (host, initial = {}) => {
  let props: SliderProps = { ...defaults, ...initial };
  let current = sliderSnap(props.value ?? props.defaultValue, props);
  let dragging = false;
  let pointerId = -1;
  const emit = emitter<SliderEvents>(host);
  const sheet = scope(host);
  const labelId = nextId("pica-slider-label");
  const root = document.createElement("div");
  const head = document.createElement("div");
  const label = document.createElement("span");
  const value = document.createElement("span");
  const track = document.createElement("div");
  const rail = document.createElement("div");
  const fill = document.createElement("div");
  const thumb = document.createElement("div");

  for (const [node, part] of [
    [root, "root"],
    [head, "head"],
    [label, "label"],
    [value, "value"],
    [track, "track"],
    [rail, "rail"],
    [fill, "fill"],
    [thumb, "thumb"],
  ] as const) {
    node.setAttribute("data-pica", "");
    node.setAttribute("data-part", part);
  }
  label.id = labelId;
  thumb.setAttribute("role", "slider");
  thumb.tabIndex = 0;
  rail.append(fill, thumb);
  track.append(rail);
  head.append(label, value);
  root.append(head, track);
  host.append(root);

  function shownValue(): number {
    return sliderSnap(props.value ?? current, props);
  }

  function render(): void {
    const [min, max] = sliderLimits(props);
    const shown = shownValue();
    const ratio = max === min ? 0 : (shown - min) / (max - min);
    label.textContent = props.label;
    value.textContent = String(shown);
    value.hidden = !props.showValue;
    thumb.setAttribute("aria-labelledby", labelId);
    thumb.setAttribute("aria-valuemin", String(min));
    thumb.setAttribute("aria-valuemax", String(max));
    thumb.setAttribute("aria-valuenow", String(shown));
    if (props.orientation === "vertical") thumb.setAttribute("aria-orientation", "vertical");
    else thumb.removeAttribute("aria-orientation");
    rail.style.setProperty("--slider-fill", `${ratio * 100}%`);
    sheet.setRules(sliderRules(sheet.selector, props));
  }

  function choose(raw: number): void {
    const next = sliderSnap(raw, props);
    if (props.value === null) {
      current = next;
      render();
    }
    emit("valueChange", next);
  }

  function chooseFromPointer(event: PointerEvent): void {
    const rect = rail.getBoundingClientRect();
    const [min, max] = sliderLimits(props);
    const ratio = props.orientation === "vertical"
      ? (rect.bottom - event.clientY) / Math.max(1, rect.height)
      : (event.clientX - rect.left) / Math.max(1, rect.width);
    choose(min + Math.min(1, Math.max(0, ratio)) * (max - min));
  }

  const onKeyDown = (event: KeyboardEvent): void => {
    const shown = shownValue();
    const [min, max] = sliderLimits(props);
    const large = Number.isFinite(props.largeStep) ? Math.abs(props.largeStep) : 10;
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next = shown + sliderStep(props);
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = shown - sliderStep(props);
    else if (event.key === "PageUp") next = shown + large;
    else if (event.key === "PageDown") next = shown - large;
    else if (event.key === "Home") next = min;
    else if (event.key === "End") next = max;
    if (next === null) return;
    event.preventDefault();
    choose(next);
  };
  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    event.preventDefault();
    dragging = true;
    pointerId = event.pointerId;
    track.dataset.dragging = "true";
    thumb.focus();
    track.setPointerCapture(event.pointerId);
    chooseFromPointer(event);
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (dragging && event.pointerId === pointerId) chooseFromPointer(event);
  };
  const endPointer = (event: PointerEvent): void => {
    if (event.pointerId !== pointerId) return;
    dragging = false;
    pointerId = -1;
    track.removeAttribute("data-dragging");
  };

  thumb.addEventListener("keydown", onKeyDown);
  track.addEventListener("pointerdown", onPointerDown);
  track.addEventListener("pointermove", onPointerMove);
  track.addEventListener("pointerup", endPointer);
  track.addEventListener("pointercancel", endPointer);
  track.addEventListener("lostpointercapture", endPointer);
  render();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      if (next.value !== undefined && next.value !== null) current = sliderSnap(next.value, props);
      else current = sliderSnap(current, props);
      render();
    },
    destroy() {
      thumb.removeEventListener("keydown", onKeyDown);
      track.removeEventListener("pointerdown", onPointerDown);
      track.removeEventListener("pointermove", onPointerMove);
      track.removeEventListener("pointerup", endPointer);
      track.removeEventListener("pointercancel", endPointer);
      track.removeEventListener("lostpointercapture", endPointer);
      root.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};

// registry/ui/slider/index.tsx
export type SliderComponentProps = Partial<SliderProps> & Handlers<SliderEvents> & WrapperProps;

/** A labelled slider with stepped keyboard and pointer input in horizontal and vertical orientations. */
export function Slider({ className, style, palette, ...props }: SliderComponentProps) {
  const ref = usePica<SliderProps, HTMLDivElement>(mount, props);
  return <div ref={ref} className={className} style={{ ...paletteStyle(palette), ...style }} />;
}
