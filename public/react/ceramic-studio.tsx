"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Ceramic studio · ceramic-studio
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

// registry/sections/ceramic-studio/core.ts
export interface CeramicPiece {
  /** Vessel name. */
  name: string;
  /** Vessel drawing form. */
  form: "bowl" | "vase" | "cup";
  /** Material and dimensions. */
  material: string;
  /** Edition and availability. */
  edition: string;
}
export interface CeramicStep {
  /** Process stage. */
  title: string;
  /** Process description. */
  text: string;
}
export interface CeramicStudioProps {
  /** Accessible name for the collection. */
  label: string;
  /** Maker name. */
  studio: string;
  /** Collection name. */
  collection: string;
  /** Collection introduction. */
  intro: string;
  /** Collection pieces and silhouette forms. */
  pieces: readonly CeramicPiece[];
  /** Maker process stages. */
  process: readonly CeramicStep[];
  /** Care notes. */
  care: string;
  /** Ordering instructions. */
  contact: string;
}

export const defaults: CeramicStudioProps = {
  "label": "Ceramic studio collection",
  "studio": "Ruth Vale / Clay works",
  "collection": "Objects for daily rituals.",
  "intro": "Small batches of useful things. Thrown slowly, glazed by hand, and made to gather the marks of a life well lived.",
  "pieces": [
    {
      "name": "Low bowl",
      "form": "bowl",
      "material": "Stoneware / Ø 21 × 6 cm",
      "edition": "Edition 03 / 18 pieces"
    },
    {
      "name": "Stem vessel",
      "form": "vase",
      "material": "Stoneware / Ø 10 × 24 cm",
      "edition": "Edition 03 / 12 pieces"
    },
    {
      "name": "Morning cup",
      "form": "cup",
      "material": "Stoneware / Ø 8 × 9 cm",
      "edition": "Edition 03 / 24 pieces"
    }
  ],
  "process": [
    {
      "title": "The clay",
      "text": "A local stoneware body is wedged by hand. Small mineral flecks remain visible in the fired surface."
    },
    {
      "title": "The wheel",
      "text": "Each form is thrown, rested, and trimmed. The foot carries a quiet record of the maker’s hand."
    },
    {
      "title": "The kiln",
      "text": "A thin ash glaze settles unevenly over the clay. The final firing reaches 1,240 °C and lasts two days, including cooling."
    }
  ],
  "care": "These pieces are made for everyday use. Wash gently and allow to dry fully. Avoid sudden changes in temperature. Subtle differences in glaze and dimension are part of the work.",
  "contact": "To reserve a piece, write to studio@ruthvale.example with the form and quantity. We confirm availability, packing, and delivery before taking payment. Studio visits by appointment."
};

function ceramicStudioEl<K extends keyof HTMLElementTagNameMap>(tag: K, text = "", mark = ""): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  if (mark) el.setAttribute(`data-pica-${mark}`, "");
  if (text) el.textContent = text;
  return el;
}
function ceramicStudioLink(text: string, target: string): HTMLAnchorElement {
  const el = ceramicStudioEl("a", text);
  el.href = `#${target}`;
  return el;
}
function ceramicStudioLabel(text: string): HTMLElement { return ceramicStudioEl("p", text, "label"); }
function ceramicStudioSection(id: string): HTMLElement {
  const el = ceramicStudioEl("section", "", "section");
  el.id = id;
  return el;
}
function ceramicStudioSvg(viewBox: string, paths: readonly string[]): SVGSVGElement {
  const el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  el.setAttribute("data-pica", "");
  el.setAttribute("viewBox", viewBox);
  el.setAttribute("aria-hidden", "true");
  for (const d of paths) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("data-pica", "");
    path.setAttribute("d", d);
    el.append(path);
  }
  return el;
}


function ceramicStudioRules(s: string): string {
  const fg = cssVar("fg");
  const bg = cssVar("bg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  return `
${s}{box-sizing:border-box;color:${fg};background:${bg};font:inherit;line-height:1.5}
${s} [data-pica-page]{max-width:1440px;margin:auto;padding:clamp(20px,4vw,60px)}
${s} [data-pica-page] *{box-sizing:border-box}
${s} [data-pica-page] h1,${s} [data-pica-page] h2,${s} [data-pica-page] h3,${s} [data-pica-page] p,${s} [data-pica-page] figure{margin:0}
${s} [data-pica-page] h1,${s} [data-pica-page] h2,${s} [data-pica-page] h3{font-weight:500;line-height:1.05;overflow-wrap:anywhere}
${s} [data-pica-page] a{color:inherit;text-decoration-thickness:1px;text-underline-offset:.25em}
${s} [data-pica-page] a:focus-visible,${s} [data-pica-page] summary:focus-visible{outline:2px solid ${accent};outline-offset:4px}
${s} [data-pica-page] [data-pica-label]{font-family:${GRID_FONT};font-size:11px;letter-spacing:.07em;text-transform:uppercase;line-height:1.6;color:${muted}}
${s} [data-pica-page] [data-pica-header]{display:flex;justify-content:space-between;gap:24px;padding-bottom:22px;border-bottom:1px solid ${fg};align-items:baseline}
${s} [data-pica-page] [data-pica-nav]{display:flex;gap:20px;flex-wrap:wrap;font-size:13px}
${s} [data-pica-page] [data-pica-footer]{display:grid;grid-template-columns:1fr 1fr;gap:30px;padding-top:30px;margin-top:64px;border-top:1px solid ${fg}}
${s} [data-pica-page] [data-pica-footer] h2{font-size:clamp(28px,4vw,52px);max-width:650px}
${s} [data-pica-page] [data-pica-footer] p{max-width:480px}
${s} [data-pica-page] [data-pica-accent]{color:${fg};border-bottom:6px solid ${accent};padding-bottom:8px}
${s} [data-pica-page] details{border-top:1px solid ${muted};padding:14px 0}
${s} [data-pica-page] summary{cursor:pointer;font-size:14px}
${s} [data-pica-page] details p{margin-top:16px;max-width:58ch;font-size:14px}
${s} [data-pica-page] svg{display:block;width:100%;height:auto;fill:none;stroke:currentColor;stroke-width:1.4;vector-effect:non-scaling-stroke}
${s} [data-pica-page] [data-pica-body]{font-size:15px;max-width:58ch;line-height:1.7}
${s} [data-pica-page] [data-pica-section]{scroll-margin-top:20px}
@media(max-width:600px){${s} [data-pica-page] [data-pica-header]{align-items:flex-start;flex-direction:column;gap:14px}${s} [data-pica-page] [data-pica-nav]{gap:16px}${s} [data-pica-page] [data-pica-footer]{grid-template-columns:1fr;margin-top:44px}}

${s} [data-pica-page] [data-pica-clay-lead]{max-width:750px;margin:48px auto 20px;text-align:center}
${s} [data-pica-page] [data-pica-clay-lead] h1{font-family:var(--pica-font-serif,Georgia,serif);font-size:clamp(48px,6.7vw,90px);letter-spacing:-.04em;margin:20px 0}
${s} [data-pica-page] [data-pica-clay-lead] [data-pica-body]{margin:auto;max-width:43ch;font-size:18px}
${s} [data-pica-page] [data-pica-clay-collection]{display:grid;grid-template-columns:repeat(3,1fr);gap:30px;align-items:end;padding:24px 0 44px}
${s} [data-pica-page] [data-pica-clay-collection] svg{height:340px;max-height:34vw;stroke-width:1.15}
${s} [data-pica-page] [data-pica-clay-collection] figure{text-align:center}
${s} [data-pica-page] [data-pica-clay-collection] h2{font-family:var(--pica-font-serif,Georgia,serif);font-size:30px;margin:12px 0}
${s} [data-pica-page] [data-pica-clay-ledger]{border-top:1px solid ${fg};padding-top:18px}
${s} [data-pica-page] [data-pica-clay-ledger]>div{display:grid;grid-template-columns:65px 1fr 1fr;gap:18px;border-bottom:1px solid ${muted};padding:14px 0;font-size:14px}
${s} [data-pica-page] [data-pica-clay-process]{display:grid;grid-template-columns:1fr 1.2fr;gap:80px;padding-top:56px}
${s} [data-pica-page] [data-pica-clay-process] h2{font-family:var(--pica-font-serif,Georgia,serif);font-size:clamp(40px,5.3vw,70px);margin-top:20px;max-width:11ch}
${s} [data-pica-page] [data-pica-clay-process]>div:last-child>div{margin-bottom:24px}
${s} [data-pica-page] [data-pica-clay-process] [data-pica-body]{margin-top:10px}
@media(max-width:800px){${s} [data-pica-page] [data-pica-clay-process]{gap:36px}}
@media(max-width:600px){${s} [data-pica-page] [data-pica-clay-collection]{grid-template-columns:1fr;gap:34px}${s} [data-pica-page] [data-pica-clay-collection] svg{height:290px;max-height:none}${s} [data-pica-page] [data-pica-clay-ledger]>div{grid-template-columns:30px 1fr}${s} [data-pica-page] [data-pica-clay-ledger]>div>p:last-child{grid-column:2}${s} [data-pica-page] [data-pica-clay-process]{grid-template-columns:1fr;gap:28px}}
`;
}

function ceramicStudioRender(root: HTMLElement, p: CeramicStudioProps, ids: Record<string, string>): void {
  root.replaceChildren();

  const header = ceramicStudioEl("header", "", "header"); header.append(ceramicStudioLabel(p.studio)); const nav = ceramicStudioEl("nav", "", "nav"); nav.setAttribute("aria-label", "Studio navigation"); nav.append(ceramicStudioLink("Collection", ids.collection!), ceramicStudioLink("Process", ids.process!), ceramicStudioLink("Reserve", ids.contact!)); header.append(nav); root.append(header);
  const lead = ceramicStudioEl("div", "", "clay-lead"); lead.append(ceramicStudioLabel("Kiln edition 03 / Spring 2026"), ceramicStudioEl("h1", p.collection, "accent"), ceramicStudioEl("p", p.intro, "body")); root.append(lead);
  const collection = ceramicStudioSection(ids.collection!); collection.setAttribute("data-pica-clay-collection", "");
  p.pieces.forEach((piece, i) => {
    const fig = ceramicStudioEl("figure"); fig.append(ceramicStudioLabel(`${String(i + 1).padStart(2, "0")} / ${piece.form}`));
    const paths = piece.form === "vase" ? ["M112 50C110 80 116 105 96 132C64 175 70 259 88 291C103 302 137 302 153 290C170 257 174 176 143 132C124 105 130 80 128 50", "M112 50C112 45 128 45 128 50C128 55 112 55 112 50 M88 291C103 282 137 282 153 290", "M98 154C87 190 86 244 98 270 M143 158C153 194 150 247 141 276"] : piece.form === "cup" ? ["M60 139C58 177 65 235 76 267C92 284 143 284 157 267C169 230 171 180 167 139", "M60 139C60 125 168 125 167 139C165 154 61 153 60 139 M76 267C96 260 136 261 157 267", "M169 156C220 145 220 236 163 229 M173 171C200 169 204 215 168 214", "M73 165C70 196 77 231 82 250 M153 165C155 196 150 233 145 253"] : ["M29 161C36 203 57 250 82 271C103 283 137 283 158 270C184 250 206 203 212 161", "M29 161C29 143 212 143 212 161C212 183 29 182 29 161 M82 271C102 265 138 265 158 270", "M44 184C54 218 70 243 85 253 M196 184C186 219 170 242 154 254"];
    fig.append(ceramicStudioSvg("0 0 240 330", paths)); const caption = ceramicStudioEl("figcaption"); caption.append(ceramicStudioEl("h2", piece.name), ceramicStudioLabel(piece.material)); fig.append(caption); collection.append(fig);
  }); root.append(collection);
  const ledger = ceramicStudioEl("section", "", "clay-ledger"); ledger.append(ceramicStudioLabel("Firing register / Edition 03"));
  p.pieces.forEach((piece, i) => { const row = ceramicStudioEl("div"); row.append(ceramicStudioLabel(String(i + 1).padStart(2, "0")), ceramicStudioEl("p", piece.name), ceramicStudioEl("p", piece.edition)); ledger.append(row); }); root.append(ledger);
  const process = ceramicStudioSection(ids.process!); process.setAttribute("data-pica-clay-process", ""); const statement = ceramicStudioEl("div"); statement.append(ceramicStudioLabel("A way of making"), ceramicStudioEl("h2", "Time is an ingredient.")); process.append(statement);
  const stages = ceramicStudioEl("div"); p.process.forEach((step, i) => { const part = ceramicStudioEl("div"); part.append(ceramicStudioLabel(`0${i + 1} / ${step.title}`), ceramicStudioEl("p", step.text, "body")); stages.append(part); }); const detail = ceramicStudioEl("details"); detail.append(ceramicStudioEl("summary", "Living with your ceramics"), ceramicStudioEl("p", p.care)); stages.append(detail); process.append(stages); root.append(process);
  const footer = ceramicStudioEl("footer", "", "footer"); footer.id = ids.contact!; footer.append(ceramicStudioEl("h2", "Make a little room for handmade."), ceramicStudioEl("p", p.contact)); root.append(footer);

}

export const mount: Mount<CeramicStudioProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  attrs.set("data-pica-id", host.getAttribute("data-pica-id"));
  attrs.set("role", "region");
  attrs.set("aria-label", props.label);
  const sheet = scope(host);
  const root = ceramicStudioEl("div", "", "page");
  host.append(root);
  const ids: Record<string, string> = { collection: nextId("ceramic-studio-collection"), process: nextId("ceramic-studio-process"), contact: nextId("ceramic-studio-contact") };
  sheet.setRules(ceramicStudioRules(sheet.selector));
  ceramicStudioRender(root, props, ids);
  attrs.set("data-pica-ready", "true");
  let destroyed = false;
  return {
    update(next) {
      if (destroyed) return;
      const before = props;
      props = { ...props, ...next };
      if (sameJson(before, props)) return;
      attrs.set("aria-label", props.label);
      ceramicStudioRender(root, props, ids);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      root.remove();
      sheet.destroy();
      attrs.restore();
    },
  };
};

// registry/sections/ceramic-studio/index.tsx
export type CeramicStudioComponentProps = Partial<CeramicStudioProps> & WrapperProps;

/** A ceramic maker collection with original vessel drawings, process notes, and a kiln edition ledger. */
export function CeramicStudio({ className, style, palette, ...props }: CeramicStudioComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
