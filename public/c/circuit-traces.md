# Circuit Traces

> Seeded circuit traces follow an orthogonal grid with accent pads and optional via rings.

Category: patterns. Tags: circuit, traces, grid, pcb, background. Static. Size: 2.2 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/circuit-traces.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `pitch` | number | `16` | Distance between grid points, from 8 to 48 pixels. |
| `traces` | number | `28` | Number of routed traces, from 4 to 60. |
| `vias` | boolean | `true` | Adds open accent rings at a seeded selection of bends. |
| `strength` | number | `0.4` | Opacity of the complete pattern, from 0 to 1. |
| `seed` | number | `1` | Integer seed that determines every route and mark. |

## Children

Put content inside the component. It decorates that content and never changes it.

## Colors

Draws with `--pica-fg`, `--pica-accent`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

// Pica · Circuit Traces · circuit-traces
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

// registry/patterns/circuit-traces/core.ts
export interface CircuitTracesProps {
  /** Distance between grid points, from 8 to 48 pixels. */
  pitch: number;
  /** Number of routed traces, from 4 to 60. */
  traces: number;
  /** Adds open accent rings at a seeded selection of bends. */
  vias: boolean;
  /** Opacity of the complete pattern, from 0 to 1. */
  strength: number;
  /** Integer seed that determines every route and mark. */
  seed: number;
}

export const defaults: CircuitTracesProps = {
  pitch: 16,
  traces: 28,
  vias: true,
  strength: 0.4,
  seed: 1,
};

const SVG_NS = "http://www.w3.org/2000/svg";

export const mount: Mount<CircuitTracesProps> = (host, initial = {}) => {
  let props: CircuitTracesProps = { ...defaults, ...initial };
  let width = -1;
  let height = -1;
  const board = layer(host, "under");
  const sheet = scope(host);
  const svg = document.createElementNS(SVG_NS, "svg");
  const runs = document.createElementNS(SVG_NS, "path");
  const pads = document.createElementNS(SVG_NS, "path");
  const rings = document.createElementNS(SVG_NS, "path");

  for (const node of [svg, runs, pads, rings]) node.setAttribute("data-pica", "");
  svg.style.cssText = "display:block;overflow:hidden";
  sheet.setRules(rules(sheet.selector));
  svg.append(runs, pads, rings);
  board.el.append(svg);

  function draw(force = false): void {
    const nextWidth = Math.max(1, host.clientWidth);
    const nextHeight = Math.max(1, host.clientHeight);
    if (!force && nextWidth === width && nextHeight === height) return;
    width = nextWidth;
    height = nextHeight;

    const pitch = Math.round(limit(props.pitch, 8, 48));
    const count = Math.round(limit(props.traces, 4, 60));
    const columns = Math.max(2, Math.floor((width - pitch * 2) / pitch) + 1);
    const rows = Math.max(2, Math.floor((height - pitch * 2) / pitch) + 1);
    const offsetX = Math.floor((width - (columns - 1) * pitch) / 2) + 0.5;
    const offsetY = Math.floor((height - (rows - 1) * pitch) / 2) + 0.5;
    const runParts: string[] = [];
    const padParts: string[] = [];
    const ringParts: string[] = [];

    for (let n = 0; n < count; n += 1) {
      const random = createRng(hashSeed(Math.trunc(props.seed), n));
      const startColumn = Math.floor(random() * columns);
      const startRow = Math.floor(random() * rows);
      const endColumn = routeEnd(startColumn, columns, random(), random());
      const endRow = routeEnd(startRow, rows, random(), random());
      const startX = offsetX + startColumn * pitch;
      const startY = offsetY + startRow * pitch;
      const endX = offsetX + endColumn * pitch;
      const endY = offsetY + endRow * pitch;
      const bends: [number, number][] = [];
      runParts.push(`M${startX} ${startY}`);

      if (random() < 0.62) {
        const horizontalFirst = random() < 0.5;
        const bend: [number, number] = horizontalFirst ? [endX, startY] : [startX, endY];
        runParts.push(`L${bend[0]} ${bend[1]}L${endX} ${endY}`);
        bends.push(bend);
      } else if (random() < 0.5) {
        const middleColumn = between(startColumn, endColumn, random());
        const middleX = offsetX + middleColumn * pitch;
        runParts.push(`L${middleX} ${startY}L${middleX} ${endY}L${endX} ${endY}`);
        bends.push([middleX, startY], [middleX, endY]);
      } else {
        const middleRow = between(startRow, endRow, random());
        const middleY = offsetY + middleRow * pitch;
        runParts.push(`L${startX} ${middleY}L${endX} ${middleY}L${endX} ${endY}`);
        bends.push([startX, middleY], [endX, middleY]);
      }

      padParts.push(square(startX, startY, 3), square(endX, endY, 3));
      if (props.vias) {
        for (const [x, y] of bends) {
          if (random() < 0.32) ringParts.push(circle(x, y, 4));
        }
      }
    }

    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    runs.setAttribute("d", runParts.join(""));
    pads.setAttribute("d", padParts.join(""));
    rings.setAttribute("d", ringParts.join(""));
    const strength = limit(props.strength, 0, 1);
    runs.style.opacity = String(strength);
    pads.style.opacity = String(Math.min(1, strength * 2.5));
    rings.style.opacity = String(Math.min(1, strength * 2.5));
    host.dataset.picaReady = "true";
  }

  draw(true);
  const observer = new ResizeObserver(() => draw());
  observer.observe(host);

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (
        props.pitch !== before.pitch ||
        props.traces !== before.traces ||
        props.vias !== before.vias ||
        props.strength !== before.strength ||
        props.seed !== before.seed
      ) {
        draw(true);
      }
    },
    destroy() {
      observer.disconnect();
      sheet.destroy();
      board.remove();
      delete host.dataset.picaReady;
    },
  };
};

function rules(selector: string): string {
  const path = `${selector}>div[data-pica]>svg[data-pica]>path[data-pica]`;
  return [
    `${path}:nth-child(1){fill:none;stroke:${cssVar("fg")};stroke-width:1;vector-effect:non-scaling-stroke}`,
    `${path}:nth-child(2){fill:${cssVar("accent")}}`,
    `${path}:nth-child(3){fill:none;stroke:${cssVar("accent")};stroke-width:1;vector-effect:non-scaling-stroke}`,
  ].join("");
}

function limit(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function routeEnd(start: number, cells: number, side: number, distance: number): number {
  const span = Math.min(6, cells - 1);
  const length = Math.min(cells - 1, 2 + Math.floor(distance * Math.max(1, span - 1)));
  const direction = side < 0.5 ? -1 : 1;
  if (start + direction * length >= 0 && start + direction * length < cells) return start + direction * length;
  if (start - direction * length >= 0 && start - direction * length < cells) return start - direction * length;
  return direction < 0 ? 0 : cells - 1;
}

function between(start: number, end: number, value: number): number {
  const low = Math.min(start, end) + 1;
  const high = Math.max(start, end) - 1;
  return low + Math.floor(value * Math.max(1, high - low + 1));
}

function square(x: number, y: number, size: number): string {
  const edge = size / 2;
  return `M${x - edge} ${y - edge}h${size}v${size}h-${size}Z`;
}

function circle(x: number, y: number, radius: number): string {
  return `M${x - radius} ${y}a${radius} ${radius} 0 1 0 ${radius * 2} 0a${radius} ${radius} 0 1 0 -${radius * 2} 0`;
}

// registry/patterns/circuit-traces/index.tsx
export type CircuitTracesComponentProps = Partial<CircuitTracesProps> & WrapperProps & { children?: ReactNode };

/** A seeded circuit board pattern that sits behind content. */
export function CircuitTraces({ className, style, palette, children, ...props }: CircuitTracesComponentProps) {
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
  Pica · Circuit Traces · circuit-traces
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Circuit Traces · Pica</title>
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
<div id="pica"><h2>Signal paths</h2><p>Orthogonal routes leave open ground for the message.</p></div>
<script>
"use strict";
var PicaCircuitTraces = (() => {
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

  // registry/patterns/circuit-traces/core.ts
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

  // registry/patterns/circuit-traces/core.ts
  var defaults = {
    pitch: 16,
    traces: 28,
    vias: true,
    strength: 0.4,
    seed: 1
  };
  var SVG_NS = "http://www.w3.org/2000/svg";
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    let width = -1;
    let height = -1;
    const board = layer(host, "under");
    const sheet = scope(host);
    const svg = document.createElementNS(SVG_NS, "svg");
    const runs = document.createElementNS(SVG_NS, "path");
    const pads = document.createElementNS(SVG_NS, "path");
    const rings = document.createElementNS(SVG_NS, "path");
    for (const node of [svg, runs, pads, rings]) node.setAttribute("data-pica", "");
    svg.style.cssText = "display:block;overflow:hidden";
    sheet.setRules(rules(sheet.selector));
    svg.append(runs, pads, rings);
    board.el.append(svg);
    function draw(force = false) {
      const nextWidth = Math.max(1, host.clientWidth);
      const nextHeight = Math.max(1, host.clientHeight);
      if (!force && nextWidth === width && nextHeight === height) return;
      width = nextWidth;
      height = nextHeight;
      const pitch = Math.round(limit(props.pitch, 8, 48));
      const count = Math.round(limit(props.traces, 4, 60));
      const columns = Math.max(2, Math.floor((width - pitch * 2) / pitch) + 1);
      const rows = Math.max(2, Math.floor((height - pitch * 2) / pitch) + 1);
      const offsetX = Math.floor((width - (columns - 1) * pitch) / 2) + 0.5;
      const offsetY = Math.floor((height - (rows - 1) * pitch) / 2) + 0.5;
      const runParts = [];
      const padParts = [];
      const ringParts = [];
      for (let n = 0; n < count; n += 1) {
        const random = createRng(hashSeed(Math.trunc(props.seed), n));
        const startColumn = Math.floor(random() * columns);
        const startRow = Math.floor(random() * rows);
        const endColumn = routeEnd(startColumn, columns, random(), random());
        const endRow = routeEnd(startRow, rows, random(), random());
        const startX = offsetX + startColumn * pitch;
        const startY = offsetY + startRow * pitch;
        const endX = offsetX + endColumn * pitch;
        const endY = offsetY + endRow * pitch;
        const bends = [];
        runParts.push(`M${startX} ${startY}`);
        if (random() < 0.62) {
          const horizontalFirst = random() < 0.5;
          const bend = horizontalFirst ? [endX, startY] : [startX, endY];
          runParts.push(`L${bend[0]} ${bend[1]}L${endX} ${endY}`);
          bends.push(bend);
        } else if (random() < 0.5) {
          const middleColumn = between(startColumn, endColumn, random());
          const middleX = offsetX + middleColumn * pitch;
          runParts.push(`L${middleX} ${startY}L${middleX} ${endY}L${endX} ${endY}`);
          bends.push([middleX, startY], [middleX, endY]);
        } else {
          const middleRow = between(startRow, endRow, random());
          const middleY = offsetY + middleRow * pitch;
          runParts.push(`L${startX} ${middleY}L${endX} ${middleY}L${endX} ${endY}`);
          bends.push([startX, middleY], [endX, middleY]);
        }
        padParts.push(square(startX, startY, 3), square(endX, endY, 3));
        if (props.vias) {
          for (const [x, y] of bends) {
            if (random() < 0.32) ringParts.push(circle(x, y, 4));
          }
        }
      }
      svg.setAttribute("width", String(width));
      svg.setAttribute("height", String(height));
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      runs.setAttribute("d", runParts.join(""));
      pads.setAttribute("d", padParts.join(""));
      rings.setAttribute("d", ringParts.join(""));
      const strength = limit(props.strength, 0, 1);
      runs.style.opacity = String(strength);
      pads.style.opacity = String(Math.min(1, strength * 2.5));
      rings.style.opacity = String(Math.min(1, strength * 2.5));
      host.dataset.picaReady = "true";
    }
    draw(true);
    const observer = new ResizeObserver(() => draw());
    observer.observe(host);
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        if (props.pitch !== before.pitch || props.traces !== before.traces || props.vias !== before.vias || props.strength !== before.strength || props.seed !== before.seed) {
          draw(true);
        }
      },
      destroy() {
        observer.disconnect();
        sheet.destroy();
        board.remove();
        delete host.dataset.picaReady;
      }
    };
  };
  function rules(selector) {
    const path = `${selector}>div[data-pica]>svg[data-pica]>path[data-pica]`;
    return [
      `${path}:nth-child(1){fill:none;stroke:${cssVar("fg")};stroke-width:1;vector-effect:non-scaling-stroke}`,
      `${path}:nth-child(2){fill:${cssVar("accent")}}`,
      `${path}:nth-child(3){fill:none;stroke:${cssVar("accent")};stroke-width:1;vector-effect:non-scaling-stroke}`
    ].join("");
  }
  function limit(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }
  function routeEnd(start, cells, side, distance) {
    const span = Math.min(6, cells - 1);
    const length = Math.min(cells - 1, 2 + Math.floor(distance * Math.max(1, span - 1)));
    const direction = side < 0.5 ? -1 : 1;
    if (start + direction * length >= 0 && start + direction * length < cells) return start + direction * length;
    if (start - direction * length >= 0 && start - direction * length < cells) return start - direction * length;
    return direction < 0 ? 0 : cells - 1;
  }
  function between(start, end, value) {
    const low = Math.min(start, end) + 1;
    const high = Math.max(start, end) - 1;
    return low + Math.floor(value * Math.max(1, high - low + 1));
  }
  function square(x, y, size) {
    const edge = size / 2;
    return `M${x - edge} ${y - edge}h${size}v${size}h-${size}Z`;
  }
  function circle(x, y, radius) {
    return `M${x - radius} ${y}a${radius} ${radius} 0 1 0 ${radius * 2} 0a${radius} ${radius} 0 1 0 -${radius * 2} 0`;
  }
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
  var instance = PicaCircuitTraces.mount(host, take(window.PICA_PROPS || {}));
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
