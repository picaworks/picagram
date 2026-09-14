# Scroll Area

> A native scroll container with quiet edge rules and a position marker that leave content and keyboard behavior untouched.

Category: ui. Tags: scroll, overflow, container, ui. Static. Size: 2.0 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/scroll-area.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `height` | number | `14` | Height of the scrollable region in rem. |
| `thumb` | boolean | `true` | Shows a slim position marker at the end edge. |
| `edges` | boolean | `true` | Shows hairline rules when content continues beyond an edge. |
| `label` | string | `"Content"` | Accessible name used while the content overflows. |

## Children

Put content inside the component. It decorates that content and never changes it.

## Colors

Draws with `--pica-fg`, `--pica-muted`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

// Pica · Scroll Area · scroll-area
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

// registry/ui/scroll-area/core.ts
export interface ScrollAreaProps {
  /** Height of the scrollable region in rem. */
  height: number;
  /** Shows a slim position marker at the end edge. */
  thumb: boolean;
  /** Shows hairline rules when content continues beyond an edge. */
  edges: boolean;
  /** Accessible name used while the content overflows. */
  label: string;
}

export const defaults: ScrollAreaProps = {
  height: 14,
  thumb: true,
  edges: true,
  label: "Content",
};

function scrollAreaHeight(value: number): number {
  if (!Number.isFinite(value)) return defaults.height;
  return Math.min(40, Math.max(4, value));
}

function scrollAreaNode(name: string, tag: "div" | "span" = "div"): HTMLElement {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  el.setAttribute(`data-pica-scroll-${name}`, "");
  return el;
}

function scrollAreaRules(selector: string): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  return [
    `${selector}{box-sizing:border-box;scrollbar-width:none;-ms-overflow-style:none}`,
    `${selector}::-webkit-scrollbar{display:none;width:0;height:0}`,
    `${selector}:focus-visible{outline:2px solid ${fg};outline-offset:2px}`,
    `${selector}>[data-pica-scroll-layer]{position:sticky;top:0;height:0;overflow:visible;pointer-events:none;z-index:1}`,
    `${selector} [data-pica-scroll-top],${selector} [data-pica-scroll-bottom]{position:absolute;inset-inline:0;height:1px;background:${muted}}`,
    `${selector} [data-pica-scroll-thumb]{position:absolute;inset-inline-end:3px;width:2px;background:color-mix(in srgb, ${fg} 42%, transparent)}`,
    `${selector}>[data-scroll-rows]{list-style:none;margin:0;padding:0 12px 0 0}`,
    `${selector}>[data-scroll-rows]>li{box-sizing:border-box;display:grid;grid-template-columns:3ch 1fr;gap:1rem;align-items:center;min-height:2rem;border-bottom:1px solid color-mix(in srgb, ${muted} 38%, transparent)}`,
    `${selector}>[data-scroll-rows]>li>span{color:${muted};font-family:${GRID_FONT};font-size:.75em;font-variant-numeric:tabular-nums}`,
  ].join("\n");
}

export const mount: Mount<ScrollAreaProps> = (host, initial = {}) => {
  let props: ScrollAreaProps = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const edgeLayer = scrollAreaNode("layer");
  const topEdge = scrollAreaNode("top", "span");
  const bottomEdge = scrollAreaNode("bottom", "span");
  const thumbLayer = scrollAreaNode("layer");
  const thumbMark = scrollAreaNode("thumb", "span");
  edgeLayer.setAttribute("aria-hidden", "true");
  thumbLayer.setAttribute("aria-hidden", "true");
  edgeLayer.append(topEdge, bottomEdge);
  thumbLayer.append(thumbMark);
  host.prepend(edgeLayer, thumbLayer);
  sheet.setRules(scrollAreaRules(sheet.selector));

  let styledHeight = scrollAreaHeight(props.height);
  let restoreHost = styleHost(host, { height: `${styledHeight}rem`, "min-height": "0", "overflow-y": "auto" });

  function refresh(): void {
    const viewport = host.clientHeight;
    const content = host.scrollHeight;
    const maxScroll = Math.max(0, content - viewport);
    const position = Math.min(maxScroll, Math.max(0, host.scrollTop));
    const overflowing = maxScroll > 1;
    const name = props.label.trim();

    attrs.set("tabindex", overflowing ? "0" : null);
    attrs.set("role", overflowing && name ? "region" : null);
    attrs.set("aria-label", overflowing && name ? name : null);

    edgeLayer.hidden = !props.edges || !overflowing;
    topEdge.style.opacity = position > 1 ? "1" : "0";
    bottomEdge.style.top = `${Math.max(0, viewport - 1)}px`;
    bottomEdge.style.opacity = position < maxScroll - 1 ? "1" : "0";

    thumbLayer.hidden = !props.thumb || !overflowing;
    const inset = 4;
    const track = Math.max(0, viewport - inset * 2);
    const thumbHeight = Math.min(track, Math.max(18, Math.round(track * viewport / content)));
    const travel = Math.max(0, track - thumbHeight);
    const thumbTop = inset + (maxScroll ? position / maxScroll * travel : 0);
    thumbMark.style.top = `${thumbTop}px`;
    thumbMark.style.height = `${thumbHeight}px`;
  }

  const observer = new ResizeObserver(refresh);
  const onScroll = (): void => refresh();
  host.addEventListener("scroll", onScroll, { passive: true });
  observer.observe(host);
  refresh();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      const nextHeight = scrollAreaHeight(props.height);
      if (nextHeight !== styledHeight) {
        restoreHost();
        styledHeight = nextHeight;
        restoreHost = styleHost(host, { height: `${styledHeight}rem`, "min-height": "0", "overflow-y": "auto" });
      }
      refresh();
    },
    destroy() {
      observer.disconnect();
      host.removeEventListener("scroll", onScroll);
      edgeLayer.remove();
      thumbLayer.remove();
      sheet.destroy();
      attrs.restore();
      restoreHost();
      delete host.dataset.picaReady;
    },
  };
};

// registry/ui/scroll-area/index.tsx
export type ScrollAreaComponentProps = Partial<ScrollAreaProps> & WrapperProps & { children?: ReactNode };

/** A native scroll container with quiet edge and position indicators. */
export function ScrollArea({ className, style, palette, children, ...props }: ScrollAreaComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Scroll Area · scroll-area
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en" data-stage="flow">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Scroll Area · Pica</title>
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
<div id="pica"><ol data-scroll-rows>
  <li><span aria-hidden="true">01</span>Overview</li>
  <li><span aria-hidden="true">02</span>Principles</li>
  <li><span aria-hidden="true">03</span>Typography</li>
  <li><span aria-hidden="true">04</span>Spacing</li>
  <li><span aria-hidden="true">05</span>Color</li>
  <li><span aria-hidden="true">06</span>Structure</li>
  <li><span aria-hidden="true">07</span>Navigation</li>
  <li><span aria-hidden="true">08</span>Controls</li>
  <li><span aria-hidden="true">09</span>Inputs</li>
  <li><span aria-hidden="true">10</span>Feedback</li>
  <li><span aria-hidden="true">11</span>States</li>
  <li><span aria-hidden="true">12</span>Motion</li>
  <li><span aria-hidden="true">13</span>Charts</li>
  <li><span aria-hidden="true">14</span>Patterns</li>
  <li><span aria-hidden="true">15</span>Shaders</li>
  <li><span aria-hidden="true">16</span>Sections</li>
  <li><span aria-hidden="true">17</span>Accessibility</li>
  <li><span aria-hidden="true">18</span>Performance</li>
  <li><span aria-hidden="true">19</span>Testing</li>
  <li><span aria-hidden="true">20</span>Release</li>
</ol></div>
<script>
"use strict";
var PicaScrollArea = (() => {
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

  // registry/ui/scroll-area/core.ts
  var core_exports = {};
  __export(core_exports, {
    defaults: () => defaults,
    mount: () => mount
  });

  // lib/font.ts
  var GRID_FONT = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

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

  // registry/ui/scroll-area/core.ts
  var defaults = {
    height: 14,
    thumb: true,
    edges: true,
    label: "Content"
  };
  function scrollAreaHeight(value) {
    if (!Number.isFinite(value)) return defaults.height;
    return Math.min(40, Math.max(4, value));
  }
  function scrollAreaNode(name, tag = "div") {
    const el = document.createElement(tag);
    el.setAttribute("data-pica", "");
    el.setAttribute(`data-pica-scroll-${name}`, "");
    return el;
  }
  function scrollAreaRules(selector) {
    const fg = cssVar("fg");
    const muted = cssVar("muted");
    return [
      `${selector}{box-sizing:border-box;scrollbar-width:none;-ms-overflow-style:none}`,
      `${selector}::-webkit-scrollbar{display:none;width:0;height:0}`,
      `${selector}:focus-visible{outline:2px solid ${fg};outline-offset:2px}`,
      `${selector}>[data-pica-scroll-layer]{position:sticky;top:0;height:0;overflow:visible;pointer-events:none;z-index:1}`,
      `${selector} [data-pica-scroll-top],${selector} [data-pica-scroll-bottom]{position:absolute;inset-inline:0;height:1px;background:${muted}}`,
      `${selector} [data-pica-scroll-thumb]{position:absolute;inset-inline-end:3px;width:2px;background:color-mix(in srgb, ${fg} 42%, transparent)}`,
      `${selector}>[data-scroll-rows]{list-style:none;margin:0;padding:0 12px 0 0}`,
      `${selector}>[data-scroll-rows]>li{box-sizing:border-box;display:grid;grid-template-columns:3ch 1fr;gap:1rem;align-items:center;min-height:2rem;border-bottom:1px solid color-mix(in srgb, ${muted} 38%, transparent)}`,
      `${selector}>[data-scroll-rows]>li>span{color:${muted};font-family:${GRID_FONT};font-size:.75em;font-variant-numeric:tabular-nums}`
    ].join("\n");
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    const attrs = hostAttributes(host);
    const sheet = scope(host);
    const edgeLayer = scrollAreaNode("layer");
    const topEdge = scrollAreaNode("top", "span");
    const bottomEdge = scrollAreaNode("bottom", "span");
    const thumbLayer = scrollAreaNode("layer");
    const thumbMark = scrollAreaNode("thumb", "span");
    edgeLayer.setAttribute("aria-hidden", "true");
    thumbLayer.setAttribute("aria-hidden", "true");
    edgeLayer.append(topEdge, bottomEdge);
    thumbLayer.append(thumbMark);
    host.prepend(edgeLayer, thumbLayer);
    sheet.setRules(scrollAreaRules(sheet.selector));
    let styledHeight = scrollAreaHeight(props.height);
    let restoreHost = styleHost(host, { height: `${styledHeight}rem`, "min-height": "0", "overflow-y": "auto" });
    function refresh() {
      const viewport = host.clientHeight;
      const content = host.scrollHeight;
      const maxScroll = Math.max(0, content - viewport);
      const position = Math.min(maxScroll, Math.max(0, host.scrollTop));
      const overflowing = maxScroll > 1;
      const name = props.label.trim();
      attrs.set("tabindex", overflowing ? "0" : null);
      attrs.set("role", overflowing && name ? "region" : null);
      attrs.set("aria-label", overflowing && name ? name : null);
      edgeLayer.hidden = !props.edges || !overflowing;
      topEdge.style.opacity = position > 1 ? "1" : "0";
      bottomEdge.style.top = `${Math.max(0, viewport - 1)}px`;
      bottomEdge.style.opacity = position < maxScroll - 1 ? "1" : "0";
      thumbLayer.hidden = !props.thumb || !overflowing;
      const inset = 4;
      const track = Math.max(0, viewport - inset * 2);
      const thumbHeight = Math.min(track, Math.max(18, Math.round(track * viewport / content)));
      const travel = Math.max(0, track - thumbHeight);
      const thumbTop = inset + (maxScroll ? position / maxScroll * travel : 0);
      thumbMark.style.top = `${thumbTop}px`;
      thumbMark.style.height = `${thumbHeight}px`;
    }
    const observer = new ResizeObserver(refresh);
    const onScroll = () => refresh();
    host.addEventListener("scroll", onScroll, { passive: true });
    observer.observe(host);
    refresh();
    host.dataset.picaReady = "true";
    return {
      update(next) {
        props = { ...props, ...next };
        const nextHeight = scrollAreaHeight(props.height);
        if (nextHeight !== styledHeight) {
          restoreHost();
          styledHeight = nextHeight;
          restoreHost = styleHost(host, { height: `${styledHeight}rem`, "min-height": "0", "overflow-y": "auto" });
        }
        refresh();
      },
      destroy() {
        observer.disconnect();
        host.removeEventListener("scroll", onScroll);
        edgeLayer.remove();
        thumbLayer.remove();
        sheet.destroy();
        attrs.restore();
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
  var instance = PicaScrollArea.mount(host, take(window.PICA_PROPS || {}));
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
