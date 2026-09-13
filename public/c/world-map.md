# World Map

> A world map on the Equal Earth projection, its land an even grid of dots with named places marked.

Category: immersive. Tags: map, world, projection, canvas. Static. Size: 6.8 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/world-map.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `markers` | readonly WorldMapMarker[] | `[{"lat":37.77,"lon":-122.42,"label":"San Francisco"},{"lat":51.51,"lon":-0.13,"label":"London"},{"lat":-1.29,"lon":36.82,"label":"Nairobi"},{"lat":-33.87,"lon":151.21,"label":"Sydney"}]` | Places on the map, each an accent dot with a thin ring. |
| `label` | string | `"A dotted world map"` | Text alternative, followed by each marker's label. Empty hides the host from assistive technology. |
| `pitch` | number | `4` | CSS pixels between the centres of neighbouring dots. |
| `dotSize` | number | `2.4` | Side of each square land dot, in CSS pixels. |
| `ocean` | number | `0` | How visible ocean dots are against land dots. 0 draws only the land. |
| `coastline` | boolean | `false` | Stroke the coastlines themselves over the dots. |
| `graticule` | number | `0` | Degrees between graticule lines, in steps of 15. 0 draws none. |
| `labels` | boolean | `false` | Draw each marker's label beside it, placed so labels never overlap. |
| `fontFamily` | string | `"\"JetBrains Mono\", \"IBM Plex Mono\", ui-monospace, \"SFMono-Regular\", Menlo, monospace"` | Font stack for the marker labels. |

## Colors

Draws with `--pica-fg`, `--pica-accent`, `--pica-muted`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · World Map · world-map
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

// lib/font.ts
/** The monospace stack glyph components default to. It lives in its own module, so a text component that
 *  never draws a grid does not carry lib/glyph-grid.ts into its single React file just for the font. */
const GRID_FONT = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

// lib/geo.ts
/** The world, for the components that draw it: the globe, the world map, and the orbit view. The coastlines
 *  themselves live in lib/geo-land.ts, which scripts/geo.ts generates from Natural Earth's public domain
 *  1:110m land theme, and a component decodes that string here. Nothing in this module reads the generated
 *  file, so the module compiles and its projections work before the data lands.
 *  Every name starts with geo or GEO_, because the single React file puts every lib module in one scope.
 *  Equal Earth follows the 2019 paper by Savric, Patterson and Jenny. The turn onto the screen and its
 *  horizon are Snyder's orthographic projection, Map Projections: A Working Manual, pages 145 to 153. */

/** Degrees between two coordinates the encoding can tell apart. Every coordinate geoDecode returns is a
 *  multiple of it, so a component can snap its own points onto the same grid. */
const GEO_STEP = 0.25;

/** The alphabet the rings are written in: one URL safe character per five bits, the sixth bit saying that
 *  another character follows. scripts/geo.ts writes it and geoDecode reads it. */
const GEO_DIGITS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** Radians per degree. */
const GEO_RAD = Math.PI / 180;

/** How far from 180 degrees east or 90 degrees south a coordinate may sit and still count as on a seam. The
 *  data lands exactly on those lines, so this only absorbs arithmetic. */
const GEO_SEAM_SLACK = 0.05;

/** How far a graticule's meridian runs from the equator, in degrees. Short of the pole, where they all meet. */
const GEO_GRATICULE_LIMIT = 80;

/** Equal Earth's four coefficients, from the 2019 paper. */
const GEO_EE_A1 = 1.340264;
const GEO_EE_A2 = -0.081106;
const GEO_EE_A3 = 0.000893;
const GEO_EE_A4 = 0.003796;

/** The rings of an encoded land string, as flat longitude and latitude pairs in degrees. Each ring closes on
 *  its first point, and the set is drawn with the even-odd rule, so a ring inside another is a hole. */
function geoDecode(encoded: string): Float32Array[] {
  const rings: Float32Array[] = [];
  let at = 0;
  /** The next zigzag varint. Returns 0 once the string runs out, so a truncated string cannot throw. */
  function pull(): number {
    let bits = 0;
    let place = 1;
    while (at < encoded.length) {
      const digit = GEO_DIGITS.indexOf(encoded.charAt(at++));
      if (digit < 0) return 0;
      bits += (digit % 32) * place;
      if (digit < 32) return bits % 2 === 0 ? bits / 2 : -(bits + 1) / 2;
      place *= 32;
    }
    return 0;
  }
  while (at < encoded.length) {
    const count = pull();
    if (count < 2) break;
    const ring = new Float32Array(count * 2);
    let lon = 0;
    let lat = 0;
    for (let p = 0; p < count; p++) {
      lon += pull();
      lat += pull();
      ring[p * 2] = lon * GEO_STEP;
      ring[p * 2 + 1] = lat * GEO_STEP;
    }
    rings.push(ring);
  }
  return rings;
}

/** The unit vector for a longitude and latitude in degrees: y through the north pole, z toward a viewer
 *  looking at longitude 0, x east of them. */
function geoVector(lon: number, lat: number): [number, number, number] {
  const phi = lat * GEO_RAD;
  const lambda = lon * GEO_RAD;
  const ring = Math.cos(phi);
  return [ring * Math.sin(lambda), Math.sin(phi), ring * Math.cos(lambda)];
}

/** Spins a unit vector around the pole, then tilts the world around the horizontal axis. Returns the screen
 *  x, the screen y with north up, and the depth, which is the cosine of the point's angle to the viewer.
 *  Those are Snyder's orthographic x, y, and cos c, for a centre latitude of the tilt and a central longitude
 *  of minus the spin, so a point is on the near side while its depth is above the horizon. */
function geoTurn(
  x: number,
  y: number,
  z: number,
  cosSpin: number,
  sinSpin: number,
  cosTilt: number,
  sinTilt: number,
): [number, number, number] {
  const east = x * cosSpin + z * sinSpin;
  const front = z * cosSpin - x * sinSpin;
  return [east, y * cosTilt - front * sinTilt, y * sinTilt + front * cosTilt];
}

/** Where a segment between two depths crosses the horizon, as a fraction from the first point to the second.
 *  `limit` is the depth the horizon sits at: 0 for an orthographic view, and 1 / P for a perspective one seen
 *  from P radii away. A segment that never crosses gives whichever end its crossing lies past, so a caller
 *  that clips with the fraction cannot draw a line through the far side of the world. */
function geoCut(depth0: number, depth1: number, limit: number): number {
  const span = depth1 - depth0;
  return span === 0 ? 0 : Math.min(1, Math.max(0, (limit - depth0) / span));
}

/** Whether an edge is one of the artificial ones a ring is cut along rather than a coastline: the meridian at
 *  180 degrees, where a ring that wraps the world is split, and the parallel at 90 degrees south, where
 *  Antarctica is closed across the pole. A fill needs those edges and a stroke must skip them. */
function geoSeam(lon0: number, lat0: number, lon1: number, lat1: number): boolean {
  const meridian = 180 - GEO_SEAM_SLACK;
  const pole = GEO_SEAM_SLACK - 90;
  return (Math.abs(lon0) >= meridian && Math.abs(lon1) >= meridian) || (lat0 <= pole && lat1 <= pole);
}

/** The Equal Earth projection of a longitude and latitude in degrees, about the prime meridian, in projection
 *  units with y increasing north. Fit it to a box with GEO_EQUAL_EARTH_BOX. */
function geoEqualEarth(lon: number, lat: number): [number, number] {
  const theta = Math.asin((Math.sqrt(3) / 2) * Math.sin(lat * GEO_RAD));
  const t2 = theta * theta;
  const t3 = t2 * theta;
  const t6 = t3 * t3;
  const slope = 9 * GEO_EE_A4 * t6 * t2 + 7 * GEO_EE_A3 * t6 + 3 * GEO_EE_A2 * t2 + GEO_EE_A1;
  const x = (2 * Math.sqrt(3) * lon * GEO_RAD * Math.cos(theta)) / (3 * slope);
  const y = GEO_EE_A4 * t6 * t3 + GEO_EE_A3 * t6 * theta + GEO_EE_A2 * t3 + GEO_EE_A1 * theta;
  return [x, y];
}

/** Half the projection's width and height, measured from the formula rather than written down twice. */
const GEO_EE_EDGE = [geoEqualEarth(180, 0)[0], geoEqualEarth(0, 90)[1]] as const;

/** Everything Equal Earth draws, in the units geoEqualEarth returns, with y increasing north. A point lands
 *  in a rectangle at ((x - box.x) / box.width, 1 - (y - box.y) / box.height), which is the whole map fitted
 *  with the top left at 0, 0. Its aspect, width over height, is a little over two to one. */
const GEO_EQUAL_EARTH_BOX = {
  x: -GEO_EE_EDGE[0],
  y: -GEO_EE_EDGE[1],
  width: 2 * GEO_EE_EDGE[0],
  height: 2 * GEO_EE_EDGE[1],
};

/** The meridians and then the parallels of a graticule, `step` degrees apart, as flat longitude and latitude
 *  pairs. A meridian runs to 80 degrees north and south rather than to the poles, where every meridian would
 *  meet, and a parallel runs the whole way round. `sample` is the spacing of the points along a line, which
 *  is what keeps a line curved once it is projected. */
function geoGraticule(step: number, sample = 5): Float32Array[] {
  const gap = Math.min(180, Math.max(1, step));
  const fine = Math.min(gap, Math.max(0.5, sample));
  const out: Float32Array[] = [];
  const down = Math.max(1, Math.round((2 * GEO_GRATICULE_LIMIT) / fine));
  for (let m = 0; m < Math.ceil(360 / gap - 1e-9); m++) {
    const line = new Float32Array((down + 1) * 2);
    for (let i = 0; i <= down; i++) {
      line[i * 2] = -180 + m * gap;
      line[i * 2 + 1] = -GEO_GRATICULE_LIMIT + (2 * GEO_GRATICULE_LIMIT * i) / down;
    }
    out.push(line);
  }
  const across = Math.max(1, Math.round(360 / fine));
  const rows = Math.floor(GEO_GRATICULE_LIMIT / gap + 1e-9);
  for (let r = -rows; r <= rows; r++) {
    const line = new Float32Array((across + 1) * 2);
    for (let i = 0; i <= across; i++) {
      line[i * 2] = -180 + (360 * i) / across;
      line[i * 2 + 1] = r * gap;
    }
    out.push(line);
  }
  return out;
}

/** A land mask, one byte per cell and 1 where land covers it, `width` cells across and `height` down. The
 *  rings are filled once with the even-odd rule, so an inner ring is a hole, and the pixels are read back
 *  once. `project` maps a longitude and latitude to the picture, x from 0 at the left to 1 at the right and y
 *  from 0 at the top to 1 at the bottom. The default is equirectangular. */
function geoRaster(
  rings: readonly Float32Array[],
  width: number,
  height: number,
  project?: (lon: number, lat: number) => [number, number],
): Uint8Array {
  const cols = Math.max(0, Math.floor(width));
  const rows = Math.max(0, Math.floor(height));
  const mask = new Uint8Array(cols * rows);
  const canvas = document.createElement("canvas");
  canvas.width = cols;
  canvas.height = rows;
  const ctx = cols > 0 && rows > 0 ? canvas.getContext("2d", { willReadFrequently: true }) : null;
  if (!ctx) return mask;
  // The default fill is opaque black, so coverage reads straight off the alpha channel.
  ctx.beginPath();
  for (const ring of rings) {
    for (let p = 0; p + 1 < ring.length; p += 2) {
      const lon = ring[p] ?? 0;
      const lat = ring[p + 1] ?? 0;
      const [ux, uy] = project ? project(lon, lat) : [(lon + 180) / 360, (90 - lat) / 180];
      if (p === 0) ctx.moveTo(ux * cols, uy * rows);
      else ctx.lineTo(ux * cols, uy * rows);
    }
    ctx.closePath();
  }
  ctx.fill("evenodd");
  const pixels = ctx.getImageData(0, 0, cols, rows).data;
  for (let i = 0; i < mask.length; i++) mask[i] = (pixels[i * 4 + 3] ?? 0) > 127 ? 1 : 0;
  return mask;
}

// lib/geo-land.ts
/** The world's coastlines, reduced to fit inside a component's byte budget.
 *  Generated by npm run geo. Never edited by hand.
 *  Source: Natural Earth 1:110m land, version 4.1.0, public domain, from sources/geo/ne_110m_land.shp
 *  and originally https://naciscdn.org/naturalearth/110m/physical/ne_110m_land.zip
 *  SHA-256: 8689e6932b8e370e2ca4587cf3ba21e460b1235db37b6ed3c172c35b4a6088de
 *  Parameters: islands under 10000 square kilometres dropped, simplified by Visvalingam and
 *  Whyatt to 0.5 square degrees weighted by the cosine of latitude, then quantized to
 *  0.25 degrees.
 *  Rings: 70. Points: 1380. Encoded: 3232 characters.
 *  Decode it with geoDecode from lib/geo.ts. */
const GEO_LAND = "MpLvTQP5BHbGqBScAKjR3RBJrBAgBaOP6GzOhQfFEJbJgBbGRJJjCR1BAcJhBDWN8DRMFkCM4BByDOJIvBBAK2BM0BG2BMFGyBUcC0BFuCOKFWGuBAaF2BEkBOoBJKG2CQOIeAUJeFMEoBDENLPYBWSgBCoBSmBCaBoCAYOcLgBCaGQFqBDMG0BBwBECIUNgCAKHuBFOCkCRuBBWFPPZFTTcNpBDPNsDb2BBApB_5CAAqBwCGgDJ4DGzCGGOwBQjCINOuBB4BQoCK8DBuBG0BL2BAXW8BH-BE4BFKEgBF6BIOKJOGWmBUkBKAFQ9QtNWHZFVEdSeJSKIHIzO3MHJNEWGIyRtMLACIKHMskBlKWBBRPBJSGEUorBnKKFVTHNJFTECKcQSUCDW0rBhJGHSFICTbROGGBSLQMFCHI4pBxFLELOYRawMrDENbtCLDLEFYIQBUEKOEMKMUGLuD8jBtDOJKfSLINIBCHONGVDdJJNbAHNBPJJELBVGJOLGCILFISNPNUXInBFPFDHdAPHXGGWLcFcGW0BQMMGOWSKEKHKCIQQEBGYHOALTeTOAGSAUGOIXKkfxCDIIEQATLIwd_BKFTBKII4e_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-TJXzBY-BAIsGkUEHlCGiCCIgZ4TlCKmBIgBRM3V-TPLfAdQQI-BLSjR4U0BFrDdnBRnCCkBWzBWiDK2CBoC3G8UyBF5CDmCH8BGcF7BTKNFVhBHOTdGFJgBArBNfDTJrBJXVFVlBGbYRcaWVFRUIGdYVE5BAlBU8BIRE2CSyFMgCB";

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

// registry/immersive/world-map/core.ts
export interface WorldMapMarker {
  /** Degrees north of the equator. Negative is south. */
  lat: number;
  /** Degrees east of the prime meridian. Negative is west. */
  lon: number;
  /** Read after the map's own label, and drawn beside the marker when labels is on. */
  label: string;
}

export interface WorldMapProps {
  /** Places on the map, each an accent dot with a thin ring. */
  markers: readonly WorldMapMarker[];
  /** Text alternative, followed by each marker's label. Empty hides the host from assistive technology. */
  label: string;
  /** CSS pixels between the centres of neighbouring dots. */
  pitch: number;
  /** Side of each square land dot, in CSS pixels. */
  dotSize: number;
  /** How visible ocean dots are against land dots. 0 draws only the land. */
  ocean: number;
  /** Stroke the coastlines themselves over the dots. */
  coastline: boolean;
  /** Degrees between graticule lines, in steps of 15. 0 draws none. */
  graticule: number;
  /** Draw each marker's label beside it, placed so labels never overlap. */
  labels: boolean;
  /** Font stack for the marker labels. */
  fontFamily: string;
}

export const defaults: WorldMapProps = {
  markers: [
    { lat: 37.77, lon: -122.42, label: "San Francisco" },
    { lat: 51.51, lon: -0.13, label: "London" },
    { lat: -1.29, lon: 36.82, label: "Nairobi" },
    { lat: -33.87, lon: 151.21, label: "Sydney" },
  ],
  label: "A dotted world map",
  pitch: 4,
  dotSize: 2.4,
  ocean: 0,
  coastline: false,
  graticule: 0,
  labels: false,
  fontFamily: GRID_FONT,
};

const TAU = Math.PI * 2;
/** Ink the land dots draw at. Ocean dots reach it only at ocean 1. */
const LAND_ALPHA = 0.9;
/** The graticule draws under the dots at this share of a coastline's strength. */
const GRATICULE_ALPHA = 0.45;
/** The boundary line draws at this strength, a hairline that frames the map. */
const OUTLINE_ALPHA = 0.6;
/** Degrees between samples along the projection's boundary, so its curve stays smooth. */
const EDGE_STEP = 3;

/** The Equal Earth boundary as one ring of longitude and latitude pairs: up the 180th meridian, across the
 *  north pole line, down the far meridian, and back along the south pole line. In projected space this is
 *  the map's own outline, neither a rectangle nor a frame around one. */
function boundaryRing(): Float32Array {
  const pts: number[] = [];
  for (let lat = -90; lat <= 90; lat += EDGE_STEP) pts.push(180, lat);
  for (let lon = 180 - EDGE_STEP; lon >= -180; lon -= EDGE_STEP) pts.push(lon, 90);
  for (let lat = 90 - EDGE_STEP; lat >= -90; lat -= EDGE_STEP) pts.push(-180, lat);
  for (let lon = -180 + EDGE_STEP; lon <= 180; lon += EDGE_STEP) pts.push(lon, -90);
  return Float32Array.from(pts);
}

export const mount: Mount<WorldMapProps> = (host, initial = {}) => {
  let props: WorldMapProps = { ...defaults, ...initial };
  const land = geoDecode(GEO_LAND);
  const boundary = boundaryRing();

  function updateLabel(): void {
    const names = props.markers
      .map((m) => (typeof m.label === "string" ? m.label : ""))
      .filter((name) => name !== "");
    const text = props.label === "" ? "" : names.length > 0 ? `${props.label}: ${names.join(", ")}.` : `${props.label}.`;
    labelHost(host, text);
  }

  const surface = createCanvas(host, { onResize: () => draw() });
  const ctx = surface.canvas.getContext("2d");
  const palette = watchPalette(host, () => draw());
  updateLabel();

  function draw(): void {
    const { width, height, dpr, cssWidth, cssHeight } = surface;
    if (ctx && width > 0 && height > 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const em = parseFloat(getComputedStyle(host).fontSize) || 16;
      const box = GEO_EQUAL_EARTH_BOX;
      const scale = Math.min((cssWidth - 2 * em) / box.width, (cssHeight - 2 * em) / box.height);
      const mapW = Math.max(0, box.width * scale);
      const mapH = Math.max(0, box.height * scale);
      const mapX = (cssWidth - mapW) / 2;
      const mapY = (cssHeight - mapH) / 2;
      const pitch = Math.min(12, Math.max(2, props.pitch));
      const cols = Math.max(1, Math.round(mapW / pitch));
      const rows = Math.max(1, Math.round(mapH / pitch));
      const cellW = mapW / cols;
      const cellH = mapH / rows;

      /** A longitude and latitude to the map's fraction box, x left to right and y top to bottom. */
      const uv = (lon: number, lat: number): [number, number] => {
        const [x, y] = geoEqualEarth(lon, lat);
        return [(x - box.x) / box.width, 1 - (y - box.y) / box.height];
      };
      /** The same point in CSS pixels on the canvas. */
      const at = (lon: number, lat: number): [number, number] => {
        const [u, v] = uv(lon, lat);
        return [mapX + u * mapW, mapY + v * mapH];
      };

      // Each raster cell is one dot position, so a point lands a dot only where land covers its own cell.
      const onLand = geoRaster(land, cols, rows, uv);
      const inside = props.ocean > 0 ? geoRaster([boundary], cols, rows, uv) : null;

      if (props.graticule > 0) {
        ctx.strokeStyle = palette.colors.muted;
        ctx.globalAlpha = GRATICULE_ALPHA;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const line of geoGraticule(Math.min(45, Math.max(1, props.graticule)))) {
          for (let p = 0; p + 1 < line.length; p += 2) {
            const [px, py] = at(line[p] ?? 0, line[p + 1] ?? 0);
            if (p === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
        }
        ctx.stroke();
      }

      const dotS = Math.min(3, Math.max(0.5, props.dotSize));
      const dotR = dotS / 2;
      ctx.fillStyle = palette.colors.fg;
      /** One square dot on every cell its mask covers, skipping cells the second mask already claims. */
      const stamp = (mask: Uint8Array, skip: Uint8Array | null): void => {
        ctx.beginPath();
        for (let j = 0; j < rows; j++) {
          const py = mapY + (j + 0.5) * cellH;
          for (let i = 0; i < cols; i++) {
            const cell = j * cols + i;
            if ((mask[cell] ?? 0) === 0 || (skip?.[cell] ?? 0) === 1) continue;
            const px = mapX + (i + 0.5) * cellW;
            ctx.rect(px - dotR, py - dotR, dotS, dotS);
          }
        }
        ctx.fill();
      };
      if (inside) {
        ctx.globalAlpha = LAND_ALPHA * Math.min(1, Math.max(0, props.ocean));
        stamp(inside, onLand);
      }
      ctx.globalAlpha = LAND_ALPHA;
      stamp(onLand, null);

      // The map is framed by its own outline, a muted hairline, never a rectangle.
      ctx.strokeStyle = palette.colors.muted;
      ctx.globalAlpha = OUTLINE_ALPHA;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let p = 0; p + 1 < boundary.length; p += 2) {
        const [px, py] = at(boundary[p] ?? 0, boundary[p + 1] ?? 0);
        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();

      if (props.coastline) {
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const ring of land) {
          for (let p = 0; p + 1 < ring.length; p += 2) {
            const [px, py] = at(ring[p] ?? 0, ring[p + 1] ?? 0);
            if (p === 0 || geoSeam(ring[p - 2] ?? 0, ring[p - 1] ?? 0, ring[p] ?? 0, ring[p + 1] ?? 0)) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
        }
        ctx.stroke();
      }

      // Markers first, so no ring can overprint a name already placed. Each ring's box joins the
      // obstacles a label may not cover.
      ctx.globalAlpha = 1;
      ctx.fillStyle = palette.colors.accent;
      ctx.strokeStyle = palette.colors.accent;
      ctx.lineWidth = 1;
      const markR = Math.max(1.5, dotS);
      const ringR = markR * 2.2;
      const placed: number[] = [];
      const named: { x: number; y: number; text: string }[] = [];
      for (const m of props.markers) {
        const [mx, my] = at(m.lon, m.lat);
        if (!Number.isFinite(mx) || !Number.isFinite(my)) continue;
        ctx.beginPath();
        ctx.arc(mx, my, markR, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(mx, my, ringR, 0, TAU);
        ctx.stroke();
        placed.push(mx - ringR, my - ringR, mx + ringR, my + ringR);
        if (typeof m.label === "string" && m.label !== "") named.push({ x: mx, y: my, text: m.label.toUpperCase() });
      }

      if (props.labels && named.length > 0) {
        const fontSize = Math.max(9, Math.round(em * 0.7));
        ctx.font = `${fontSize}px ${props.fontFamily}`;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.letterSpacing = "0.04em";
        ctx.fillStyle = palette.colors.muted;
        const gap = ringR + 3;
        for (const n of named) {
          const w = ctx.measureText(n.text).width;
          const candidates: readonly [number, number][] = [
            [n.x + gap, n.y],
            [n.x - gap - w, n.y],
            [n.x - w / 2, n.y + gap + fontSize / 2],
            [n.x - w / 2, n.y - gap - fontSize / 2],
          ];
          for (const [tx, ty] of candidates) {
            const x0 = tx - 1;
            const y0 = ty - fontSize / 2 - 1;
            const x1 = tx + w + 1;
            const y1 = ty + fontSize / 2 + 1;
            if (x0 < 0 || y0 < 0 || x1 > cssWidth || y1 > cssHeight) continue;
            let free = true;
            for (let q = 0; q + 3 < placed.length; q += 4) {
              if (x0 - 2 < (placed[q + 2] ?? 0) && x1 + 2 > (placed[q] ?? 0) && y0 - 2 < (placed[q + 3] ?? 0) && y1 + 2 > (placed[q + 1] ?? 0)) {
                free = false;
                break;
              }
            }
            if (!free) continue;
            placed.push(x0, y0, x1, y1);
            ctx.fillText(n.text, tx, ty);
            break;
          }
        }
      }
      ctx.globalAlpha = 1;
    }
    host.dataset.picaReady = "true";
  }

  draw();

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (!sameJson(props.markers, before.markers) || props.label !== before.label) updateLabel();
      palette.refresh();
      draw();
    },
    destroy() {
      surface.destroy();
      palette.destroy();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};

// registry/immersive/world-map/index.tsx
export type WorldMapComponentProps = Partial<WorldMapProps> & WrapperProps;

/** A world map on the Equal Earth projection, its land an even grid of dots with named places marked. */
export function WorldMap({ className, style, palette, ...props }: WorldMapComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · World Map · world-map
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>World Map · Pica</title>
<style>:root { --pica-accent: #e8a020; }
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
<div id="pica"></div>
<script>
"use strict";
var PicaWorldMap = (() => {
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

  // registry/immersive/world-map/core.ts
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

  // lib/host.ts
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

  // lib/font.ts
  var GRID_FONT = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

  // lib/geo.ts
  var GEO_STEP = 0.25;
  var GEO_DIGITS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  var GEO_RAD = Math.PI / 180;
  var GEO_SEAM_SLACK = 0.05;
  var GEO_GRATICULE_LIMIT = 80;
  var GEO_EE_A1 = 1.340264;
  var GEO_EE_A2 = -0.081106;
  var GEO_EE_A3 = 893e-6;
  var GEO_EE_A4 = 3796e-6;
  function geoDecode(encoded) {
    const rings = [];
    let at = 0;
    function pull() {
      let bits = 0;
      let place = 1;
      while (at < encoded.length) {
        const digit = GEO_DIGITS.indexOf(encoded.charAt(at++));
        if (digit < 0) return 0;
        bits += digit % 32 * place;
        if (digit < 32) return bits % 2 === 0 ? bits / 2 : -(bits + 1) / 2;
        place *= 32;
      }
      return 0;
    }
    while (at < encoded.length) {
      const count = pull();
      if (count < 2) break;
      const ring = new Float32Array(count * 2);
      let lon = 0;
      let lat = 0;
      for (let p = 0; p < count; p++) {
        lon += pull();
        lat += pull();
        ring[p * 2] = lon * GEO_STEP;
        ring[p * 2 + 1] = lat * GEO_STEP;
      }
      rings.push(ring);
    }
    return rings;
  }
  function geoSeam(lon0, lat0, lon1, lat1) {
    const meridian = 180 - GEO_SEAM_SLACK;
    const pole = GEO_SEAM_SLACK - 90;
    return Math.abs(lon0) >= meridian && Math.abs(lon1) >= meridian || lat0 <= pole && lat1 <= pole;
  }
  function geoEqualEarth(lon, lat) {
    const theta = Math.asin(Math.sqrt(3) / 2 * Math.sin(lat * GEO_RAD));
    const t2 = theta * theta;
    const t3 = t2 * theta;
    const t6 = t3 * t3;
    const slope = 9 * GEO_EE_A4 * t6 * t2 + 7 * GEO_EE_A3 * t6 + 3 * GEO_EE_A2 * t2 + GEO_EE_A1;
    const x = 2 * Math.sqrt(3) * lon * GEO_RAD * Math.cos(theta) / (3 * slope);
    const y = GEO_EE_A4 * t6 * t3 + GEO_EE_A3 * t6 * theta + GEO_EE_A2 * t3 + GEO_EE_A1 * theta;
    return [x, y];
  }
  var GEO_EE_EDGE = [geoEqualEarth(180, 0)[0], geoEqualEarth(0, 90)[1]];
  var GEO_EQUAL_EARTH_BOX = {
    x: -GEO_EE_EDGE[0],
    y: -GEO_EE_EDGE[1],
    width: 2 * GEO_EE_EDGE[0],
    height: 2 * GEO_EE_EDGE[1]
  };
  function geoGraticule(step, sample = 5) {
    const gap = Math.min(180, Math.max(1, step));
    const fine = Math.min(gap, Math.max(0.5, sample));
    const out = [];
    const down = Math.max(1, Math.round(2 * GEO_GRATICULE_LIMIT / fine));
    for (let m = 0; m < Math.ceil(360 / gap - 1e-9); m++) {
      const line = new Float32Array((down + 1) * 2);
      for (let i = 0; i <= down; i++) {
        line[i * 2] = -180 + m * gap;
        line[i * 2 + 1] = -GEO_GRATICULE_LIMIT + 2 * GEO_GRATICULE_LIMIT * i / down;
      }
      out.push(line);
    }
    const across = Math.max(1, Math.round(360 / fine));
    const rows = Math.floor(GEO_GRATICULE_LIMIT / gap + 1e-9);
    for (let r = -rows; r <= rows; r++) {
      const line = new Float32Array((across + 1) * 2);
      for (let i = 0; i <= across; i++) {
        line[i * 2] = -180 + 360 * i / across;
        line[i * 2 + 1] = r * gap;
      }
      out.push(line);
    }
    return out;
  }
  function geoRaster(rings, width, height, project) {
    const cols = Math.max(0, Math.floor(width));
    const rows = Math.max(0, Math.floor(height));
    const mask = new Uint8Array(cols * rows);
    const canvas = document.createElement("canvas");
    canvas.width = cols;
    canvas.height = rows;
    const ctx = cols > 0 && rows > 0 ? canvas.getContext("2d", { willReadFrequently: true }) : null;
    if (!ctx) return mask;
    ctx.beginPath();
    for (const ring of rings) {
      for (let p = 0; p + 1 < ring.length; p += 2) {
        const lon = ring[p] ?? 0;
        const lat = ring[p + 1] ?? 0;
        const [ux, uy] = project ? project(lon, lat) : [(lon + 180) / 360, (90 - lat) / 180];
        if (p === 0) ctx.moveTo(ux * cols, uy * rows);
        else ctx.lineTo(ux * cols, uy * rows);
      }
      ctx.closePath();
    }
    ctx.fill("evenodd");
    const pixels = ctx.getImageData(0, 0, cols, rows).data;
    for (let i = 0; i < mask.length; i++) mask[i] = (pixels[i * 4 + 3] ?? 0) > 127 ? 1 : 0;
    return mask;
  }

  // lib/geo-land.ts
  var GEO_LAND = "MpLvTQP5BHbGqBScAKjR3RBJrBAgBaOP6GzOhQfFEJbJgBbGRJJjCR1BAcJhBDWN8DRMFkCM4BByDOJIvBBAK2BM0BG2BMFGyBUcC0BFuCOKFWGuBAaF2BEkBOoBJKG2CQOIeAUJeFMEoBDENLPYBWSgBCoBSmBCaBoCAYOcLgBCaGQFqBDMG0BBwBECIUNgCAKHuBFOCkCRuBBWFPPZFTTcNpBDPNsDb2BBApB_5CAAqBwCGgDJ4DGzCGGOwBQjCINOuBB4BQoCK8DBuBG0BL2BAXW8BH-BE4BFKEgBF6BIOKJOGWmBUkBKAFQ9QtNWHZFVEdSeJSKIHIzO3MHJNEWGIyRtMLACIKHMskBlKWBBRPBJSGEUorBnKKFVTHNJFTECKcQSUCDW0rBhJGHSFICTbROGGBSLQMFCHI4pBxFLELOYRawMrDENbtCLDLEFYIQBUEKOEMKMUGLuD8jBtDOJKfSLINIBCHONGVDdJJNbAHNBPJJELBVGJOLGCILFISNPNUXInBFPFDHdAPHXGGWLcFcGW0BQMMGOWSKEKHKCIQQEBGYHOALTeTOAGSAUGOIXKkfxCDIIEQATLIwd_BKFTBKII4e_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-TJXzBY-BAIsGkUEHlCGiCCIgZ4TlCKmBIgBRM3V-TPLfAdQQI-BLSjR4U0BFrDdnBRnCCkBWzBWiDK2CBoC3G8UyBF5CDmCH8BGcF7BTKNFVhBHOTdGFJgBArBNfDTJrBJXVFVlBGbYRcaWVFRUIGdYVE5BAlBU8BIRE2CSyFMgCB";

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

  // lib/palette.ts
  var TOKENS = ["fg", "bg", "accent", "muted"];
  var TOKEN_FALLBACK = {
    fg: "currentColor",
    bg: "transparent",
    accent: "#e8a020",
    muted: "color-mix(in srgb, var(--pica-fg, currentColor) 65%, transparent)"
  };
  function cssVar(token) {
    return `var(--pica-${token}, ${TOKEN_FALLBACK[token]})`;
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

  // registry/immersive/world-map/core.ts
  var defaults = {
    markers: [
      { lat: 37.77, lon: -122.42, label: "San Francisco" },
      { lat: 51.51, lon: -0.13, label: "London" },
      { lat: -1.29, lon: 36.82, label: "Nairobi" },
      { lat: -33.87, lon: 151.21, label: "Sydney" }
    ],
    label: "A dotted world map",
    pitch: 4,
    dotSize: 2.4,
    ocean: 0,
    coastline: false,
    graticule: 0,
    labels: false,
    fontFamily: GRID_FONT
  };
  var TAU = Math.PI * 2;
  var LAND_ALPHA = 0.9;
  var GRATICULE_ALPHA = 0.45;
  var OUTLINE_ALPHA = 0.6;
  var EDGE_STEP = 3;
  function boundaryRing() {
    const pts = [];
    for (let lat = -90; lat <= 90; lat += EDGE_STEP) pts.push(180, lat);
    for (let lon = 180 - EDGE_STEP; lon >= -180; lon -= EDGE_STEP) pts.push(lon, 90);
    for (let lat = 90 - EDGE_STEP; lat >= -90; lat -= EDGE_STEP) pts.push(-180, lat);
    for (let lon = -180 + EDGE_STEP; lon <= 180; lon += EDGE_STEP) pts.push(lon, -90);
    return Float32Array.from(pts);
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    const land = geoDecode(GEO_LAND);
    const boundary = boundaryRing();
    function updateLabel() {
      const names = props.markers.map((m) => typeof m.label === "string" ? m.label : "").filter((name) => name !== "");
      const text = props.label === "" ? "" : names.length > 0 ? `${props.label}: ${names.join(", ")}.` : `${props.label}.`;
      labelHost(host, text);
    }
    const surface = createCanvas(host, { onResize: () => draw() });
    const ctx = surface.canvas.getContext("2d");
    const palette = watchPalette(host, () => draw());
    updateLabel();
    function draw() {
      const { width, height, dpr, cssWidth, cssHeight } = surface;
      if (ctx && width > 0 && height > 0) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, width, height);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const em = parseFloat(getComputedStyle(host).fontSize) || 16;
        const box = GEO_EQUAL_EARTH_BOX;
        const scale = Math.min((cssWidth - 2 * em) / box.width, (cssHeight - 2 * em) / box.height);
        const mapW = Math.max(0, box.width * scale);
        const mapH = Math.max(0, box.height * scale);
        const mapX = (cssWidth - mapW) / 2;
        const mapY = (cssHeight - mapH) / 2;
        const pitch = Math.min(12, Math.max(2, props.pitch));
        const cols = Math.max(1, Math.round(mapW / pitch));
        const rows = Math.max(1, Math.round(mapH / pitch));
        const cellW = mapW / cols;
        const cellH = mapH / rows;
        const uv = (lon, lat) => {
          const [x, y] = geoEqualEarth(lon, lat);
          return [(x - box.x) / box.width, 1 - (y - box.y) / box.height];
        };
        const at = (lon, lat) => {
          const [u, v] = uv(lon, lat);
          return [mapX + u * mapW, mapY + v * mapH];
        };
        const onLand = geoRaster(land, cols, rows, uv);
        const inside = props.ocean > 0 ? geoRaster([boundary], cols, rows, uv) : null;
        if (props.graticule > 0) {
          ctx.strokeStyle = palette.colors.muted;
          ctx.globalAlpha = GRATICULE_ALPHA;
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (const line of geoGraticule(Math.min(45, Math.max(1, props.graticule)))) {
            for (let p = 0; p + 1 < line.length; p += 2) {
              const [px, py] = at(line[p] ?? 0, line[p + 1] ?? 0);
              if (p === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
          }
          ctx.stroke();
        }
        const dotS = Math.min(3, Math.max(0.5, props.dotSize));
        const dotR = dotS / 2;
        ctx.fillStyle = palette.colors.fg;
        const stamp = (mask, skip) => {
          ctx.beginPath();
          for (let j = 0; j < rows; j++) {
            const py = mapY + (j + 0.5) * cellH;
            for (let i = 0; i < cols; i++) {
              const cell = j * cols + i;
              if ((mask[cell] ?? 0) === 0 || (skip?.[cell] ?? 0) === 1) continue;
              const px = mapX + (i + 0.5) * cellW;
              ctx.rect(px - dotR, py - dotR, dotS, dotS);
            }
          }
          ctx.fill();
        };
        if (inside) {
          ctx.globalAlpha = LAND_ALPHA * Math.min(1, Math.max(0, props.ocean));
          stamp(inside, onLand);
        }
        ctx.globalAlpha = LAND_ALPHA;
        stamp(onLand, null);
        ctx.strokeStyle = palette.colors.muted;
        ctx.globalAlpha = OUTLINE_ALPHA;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let p = 0; p + 1 < boundary.length; p += 2) {
          const [px, py] = at(boundary[p] ?? 0, boundary[p + 1] ?? 0);
          if (p === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        if (props.coastline) {
          ctx.globalAlpha = 1;
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (const ring of land) {
            for (let p = 0; p + 1 < ring.length; p += 2) {
              const [px, py] = at(ring[p] ?? 0, ring[p + 1] ?? 0);
              if (p === 0 || geoSeam(ring[p - 2] ?? 0, ring[p - 1] ?? 0, ring[p] ?? 0, ring[p + 1] ?? 0)) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = palette.colors.accent;
        ctx.strokeStyle = palette.colors.accent;
        ctx.lineWidth = 1;
        const markR = Math.max(1.5, dotS);
        const ringR = markR * 2.2;
        const placed = [];
        const named = [];
        for (const m of props.markers) {
          const [mx, my] = at(m.lon, m.lat);
          if (!Number.isFinite(mx) || !Number.isFinite(my)) continue;
          ctx.beginPath();
          ctx.arc(mx, my, markR, 0, TAU);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(mx, my, ringR, 0, TAU);
          ctx.stroke();
          placed.push(mx - ringR, my - ringR, mx + ringR, my + ringR);
          if (typeof m.label === "string" && m.label !== "") named.push({ x: mx, y: my, text: m.label.toUpperCase() });
        }
        if (props.labels && named.length > 0) {
          const fontSize = Math.max(9, Math.round(em * 0.7));
          ctx.font = `${fontSize}px ${props.fontFamily}`;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.letterSpacing = "0.04em";
          ctx.fillStyle = palette.colors.muted;
          const gap = ringR + 3;
          for (const n of named) {
            const w = ctx.measureText(n.text).width;
            const candidates = [
              [n.x + gap, n.y],
              [n.x - gap - w, n.y],
              [n.x - w / 2, n.y + gap + fontSize / 2],
              [n.x - w / 2, n.y - gap - fontSize / 2]
            ];
            for (const [tx, ty] of candidates) {
              const x0 = tx - 1;
              const y0 = ty - fontSize / 2 - 1;
              const x1 = tx + w + 1;
              const y1 = ty + fontSize / 2 + 1;
              if (x0 < 0 || y0 < 0 || x1 > cssWidth || y1 > cssHeight) continue;
              let free = true;
              for (let q = 0; q + 3 < placed.length; q += 4) {
                if (x0 - 2 < (placed[q + 2] ?? 0) && x1 + 2 > (placed[q] ?? 0) && y0 - 2 < (placed[q + 3] ?? 0) && y1 + 2 > (placed[q + 1] ?? 0)) {
                  free = false;
                  break;
                }
              }
              if (!free) continue;
              placed.push(x0, y0, x1, y1);
              ctx.fillText(n.text, tx, ty);
              break;
            }
          }
        }
        ctx.globalAlpha = 1;
      }
      host.dataset.picaReady = "true";
    }
    draw();
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        if (!sameJson(props.markers, before.markers) || props.label !== before.label) updateLabel();
        palette.refresh();
        draw();
      },
      destroy() {
        surface.destroy();
        palette.destroy();
        unlabelHost(host);
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
  var instance = PicaWorldMap.mount(host, take(window.PICA_PROPS || {}));
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

- Technique from [The Equal Earth map projection](https://doi.org/10.1080/13658816.2018.1504949) by Bojan Šavrič, Tom Patterson and Bernhard Jenny (Paper).
- Technique from [Equal Earth, EPSG method 1078](https://epsg.io/1078-method) by IOGP (Standard, no code).
- Port of [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/) by Tom Patterson and Nathaniel Vaughn Kelso (Public domain).
