"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Orbit View · orbit-view
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

// registry/immersive/orbit-view/core.ts
export interface OrbitViewProps extends MotionProps {
  /** Text alternative naming the view. Empty hides the host from assistive technology. */
  label: string;
  /** Spacecraft height above the surface in kilometres. Higher sees more of the disc and a flatter limb. */
  altitude: number;
  /** Camera tilt away from straight down, in degrees. 0 looks at the sub-point, 80 nearly at the horizon. */
  tilt: number;
  /** Compass azimuth of the camera's lean and of the ground track, in degrees clockwise from north. */
  heading: number;
  /** Starting latitude of the point under the spacecraft, in degrees north. */
  lat: number;
  /** Starting longitude of the point under the spacecraft, in degrees east. */
  lon: number;
  /** Ground track speed. 0 holds the sub-point at lat and lon. */
  speed: number;
  /** Spacing of the land dots in CSS pixels. */
  pitch: number;
  /** Graticule spacing in degrees. 0 draws no graticule. */
  graticule: number;
  /** Strength of the dithered atmosphere bands above the limb. 0 draws no atmosphere. */
  atmosphere: number;
  /** Show the telemetry block. */
  telemetry: boolean;
  /** Frames per second ceiling. */
  fps: number;
  /** Font for the telemetry readout. */
  fontFamily: string;
}

export const defaults: OrbitViewProps = {
  label: "Earth's limb from orbit",
  altitude: 420,
  tilt: 35,
  heading: 110,
  lat: 42,
  lon: 12,
  speed: 0.15,
  pitch: 4,
  graticule: 15,
  atmosphere: 0.6,
  telemetry: true,
  fps: 24,
  fontFamily: GRID_FONT,
  paused: false,
  time: null,
  seed: 1,
};

const DEG = Math.PI / 180;
/** Depth along the camera axis below which a point sits behind the camera and clamps off the frame. */
const DEN_EPS = 0.02;
/** Atmosphere shell radii in Earth radii, about 40, 100, and 190 km up. */
const SHELLS = [1.006, 1.016, 1.03];
/** Peak dot density of each atmosphere band, thinning away from the surface. */
const BAND_DENSITY = [0.5, 0.27, 0.13];
/** The 4 by 4 Bayer matrix bayerAt(4) returns, times 16 so a band's ink test is one integer compare.
 *  The table is written out rather than built by lib/dither.ts because the generic builder and its
 *  cache weigh more than sixteen numbers in a bundle that needs only this one matrix. */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** Samples around a horizon circle. */
const ARC_N = 240;

export const mount: Mount<OrbitViewProps> = (host, initial = {}) => {
  let props: OrbitViewProps = { ...defaults, ...initial };

  // The land mask is fixed data. Each covered half-degree cell contributes one dot, jittered inside
  // its cell so the field never reads as latitudes and longitudes under foreshortening.
  const mask = geoRaster(geoDecode(GEO_LAND), 720, 360);
  const land: number[] = [];
  for (let row = 0; row < 360; row++) {
    for (let col = 0; col < 720; col++) {
      const i = row * 720 + col;
      if (!mask[i]) continue;
      // A small seeded mix stands in for lib/rng here: two rounds is avalanche enough for a
      // cell-sized jitter, and the whole rng module costs more than this.
      let h = Math.imul(i ^ props.seed, 0x9e3779b1);
      h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
      land.push(...geoVector(-180 + (col + (h & 255) / 256) * 0.5, 90 - (row + ((h >>> 8) & 255) / 256) * 0.5));
    }
  }

  const redraw = (): void => loop.redraw();
  const surface = createCanvas(host, { onResize: redraw });
  const ctx = surface.canvas.getContext("2d")!;
  const palette = watchPalette(host, redraw);
  labelHost(host, props.label);

  function draw(t: number): void {
    const { dpr, cssWidth, cssHeight } = surface;
    if (cssWidth > 0 && cssHeight > 0) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssWidth, cssHeight);

      const P = 1 + props.altitude / 6371;
      const invP = 1 / P;
      const tiltR = props.tilt * DEG;
      const cosT = Math.cos(tiltR);
      const sinT = Math.sin(tiltR);
      // The sub-point S and its track direction T drift along the heading's great circle:
      // one degree of ground track per second at speed 1, so a pass takes minutes.
      const hdg = props.heading * DEG;
      const latR = props.lat * DEG;
      const lonR = props.lon * DEG;
      const [s0x, s0y, s0z] = geoVector(props.lon, props.lat);
      const tx = Math.sin(hdg) * Math.cos(lonR) - Math.cos(hdg) * s0y * Math.sin(lonR);
      const ty = Math.cos(hdg) * Math.cos(latR);
      const tz = -Math.sin(hdg) * Math.sin(lonR) - Math.cos(hdg) * s0y * Math.cos(lonR);
      const sec = t / 1000;
      const drift = sec * props.speed * DEG;
      const cosD = Math.cos(drift);
      const sinD = Math.sin(drift);
      const sX = s0x * cosD + tx * sinD;
      const sY = s0y * cosD + ty * sinD;
      const sZ = s0z * cosD + tz * sinD;
      const tX = tx * cosD - s0x * sinD;
      const tY = ty * cosD - s0y * sinD;
      const tZ = tz * cosD - s0z * sinD;
      const rX = tY * sZ - tZ * sY;
      const rY = tZ * sX - tX * sZ;
      const rZ = tX * sY - tY * sX;

      // Framing: the limb's peak lands on the upper third and the land band below it fills the
      // middle of the frame. A projected unit is the tangent of the angle off the camera axis,
      // so one scale fits every altitude.
      const ha = Math.acos(invP) + tiltR;
      const denTop = P * cosT - Math.cos(ha);
      const topN = denTop > DEN_EPS ? (Math.sin(ha) - P * sinT) / denTop : 3;
      const focal = (0.42 * cssHeight) / Math.max(0.08, topN + Math.tan(tiltR));
      const cx = cssWidth / 2;
      const cy = 0.3 * cssHeight + topN * focal;

      /** Snyder's tilted perspective in the {R, S, T} frame: depth toward the sub-point sets the
       *  horizon, distance along the camera axis the near clip. A kept point lands in px, py. */
      let px = 0, py = 0, pen = false;
      const plot = (): void => {
        ctx[pen ? "lineTo" : "moveTo"](px, py);
        pen = true;
      };
      /** The shared Snyder tail: a point qs along S, qt along T, qr along R at depth den lands in
       *  px, py scaled by focal over den. Callers pass a clamped den when they want the off-frame
       *  projection of a point behind the camera. */
      const place = (qs: number, qt: number, qr: number, den: number): void => {
        px = cx + (qr * focal) / den;
        py = cy - ((qt * cosT + (qs - P) * sinT) * focal) / den;
      };
      const project = (qx: number, qy: number, qz: number): boolean => {
        const qs = qx * sX + qy * sY + qz * sZ;
        const qt = qx * tX + qy * tY + qz * tZ;
        const den = qt * sinT + (P - qs) * cosT;
        // Sit a hair inside the horizon so a dot never touches the drawn limb curve.
        if (qs < invP + 0.0015 || den <= DEN_EPS) return false;
        place(qs, qt, qx * rX + qy * rY + qz * rZ, den);
        return true;
      };

      /** One point on the limb circle of a sphere of `radius` seen from P radii out: the limb sits at
       *  angle c with cos c = radius / P, so the circle is qs along S with radius rs in the R, T plane.
       *  Positions are clamped so a sample behind the camera lands far off frame, and the returned
       *  depth says which side it is on. */
      const limbPt = (radius: number, i: number): number => {
        const c = radius * invP;
        const qs = radius * c;
        const rs = radius * Math.sqrt(1 - c * c);
        const th = Math.PI * (1 + (2 * i) / ARC_N);
        const qt = rs * Math.cos(th);
        const den = qt * sinT + (P - qs) * cosT;
        place(qs, qt, -rs * Math.sin(th), Math.max(DEN_EPS, den));
        return den;
      };
      const radii = [1, ...SHELLS.filter((r) => r < P * 0.999)];

      // Land dots, deduped onto the pitch grid so the stipple stays even on both grounds.
      const pitch = props.pitch;
      const dotR = Math.max(0.6, Math.min(1.7, pitch * 0.34));
      const seen = new Set();
      ctx.fillStyle = palette.colors.fg;
      ctx.globalAlpha = 0.85;
      for (let i = 0; i < land.length; i += 3) {
        if (!project(land[i]!, land[i + 1]!, land[i + 2]!)) continue;
        const key = ((px / pitch) | 0) * 1e5 + ((py / pitch) | 0);
        if (seen.has(key)) continue;
        seen.add(key);
        ctx.fillRect(px - dotR, py - dotR, dotR * 2, dotR * 2);
      }

      // The graticule, clipped at the horizon and at the camera plane: meridians and parallels
      // `grat` degrees apart, sampled every degree, the same lines geoGraticule(grat, 1) rules.
      const grat = props.graticule;
      if (grat > 0) {
        ctx.strokeStyle = palette.colors.muted;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        const seg = (lon: number, lat: number): void => {
          if (project(...geoVector(lon, lat))) plot();
          else pen = false;
        };
        for (let m = -180; m < 180; m += grat) {
          pen = false;
          for (let la = -80; la <= 80; la++) seg(m, la);
        }
        for (let pa = ((80 / grat) | 0) * -grat; pa <= 80; pa += grat) {
          pen = false;
          for (let lo = -180; lo <= 180; lo++) seg(lo, pa);
        }
        ctx.stroke();
      }

      // The limb, a hairline, carried one clamped sample past each visible end so the stroke
      // exits the frame and the horizon reads as a curve and not a gradient.
      ctx.strokeStyle = palette.colors.fg;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      let dp = -1;
      pen = false;
      for (let i = 0; i <= ARC_N; i++) {
        const d = limbPt(1, i);
        if (d > DEN_EPS || dp > DEN_EPS) plot();
        else pen = false;
        dp = d;
      }
      ctx.stroke();

      // Atmosphere: stepped bands between the surface limb and each shell's limb, stippled
      // through the Bayer matrix so they read as printed steps and never as a glow.
      if (props.atmosphere > 0) {
        const ox = props.seed & 3;
        const oy = (props.seed >> 4) & 3;
        ctx.fillStyle = palette.colors.accent;
        ctx.globalAlpha = 1;
        for (let b = 0; b + 1 < radii.length; b++) {
          const inner = radii[b]!;
          const outer = radii[b + 1]!;
          const cut = BAND_DENSITY[b]! * props.atmosphere * 16;
          if (cut <= 0.16) continue;
          for (let i = 0; i <= ARC_N; i++) {
            if (limbPt(inner, i) <= DEN_EPS) continue;
            const ix = px;
            const iy = py;
            limbPt(outer, i);
            const dx = px - ix;
            const dy = py - iy;
            const steps = Math.max(2, (((Math.abs(dx) + Math.abs(dy)) / 3) | 0) + 1);
            for (let j = 0; j <= steps; j++) {
              const gx = ((ix + (dx * j) / steps) / 3) | 0;
              const gy = ((iy + (dy * j) / steps) / 3) | 0;
              if (BAYER4[((gy + oy) & 3) * 4 + ((gx + ox) & 3)]! + 0.5 < cut) ctx.fillRect(gx * 3 - 0.7, gy * 3 - 0.7, 1.4, 1.4);
            }
          }
        }
      }

      // Telemetry: only what the props and the animation's own clock give.
      if (props.telemetry) {
        const la = Math.asin(Math.max(-1, Math.min(1, sY))) / DEG;
        const lo = Math.atan2(sX, sZ) / DEG;
        ctx.font = `11px ${props.fontFamily}`;
        ctx.fillStyle = palette.colors.muted;
        ctx.fillText(`ALT ${Math.round(props.altitude)} KM`, 14, cssHeight - 44);
        ctx.fillText(`SUB ${Math.abs(la).toFixed(1)}${la < 0 ? "S" : "N"} ${Math.abs(lo).toFixed(1)}${lo < 0 ? "W" : "E"}`, 14, cssHeight - 29);
        ctx.fillText(`T+ ${(sec / 60) | 0}:${(sec % 60).toFixed(1)}`, 14, cssHeight - 14);
      }
    }
    host.dataset.picaReady = "true";
  }

  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: 1200, frame: draw });

  return {
    update(next) {
      const prev = props.label;
      props = { ...props, ...next };
      if (props.label !== prev) labelHost(host, props.label);
      palette.refresh();
      loop.update({ paused: props.paused, time: props.time, fps: props.fps });
      loop.redraw();
    },
    destroy() {
      loop.destroy();
      surface.destroy();
      palette.destroy();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};

// registry/immersive/orbit-view/index.tsx
export type OrbitViewComponentProps = Partial<OrbitViewProps> & WrapperProps;

/** The Earth's limb seen from orbit: dotted land below a curved horizon and a stepped dithered atmosphere. */
export function OrbitView({ className, style, palette, ...props }: OrbitViewComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
