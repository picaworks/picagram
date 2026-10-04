"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Sound practice · sound-practice
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

// registry/sections/sound-practice/core.ts
export interface SoundProject {
  /** Project title. */
  title: string;
  /** Project medium and year. */
  medium: string;
  /** Project duration in minutes and seconds. */
  duration: string;
  /** Project description. */
  description: string;
  /** Listening annotation. */
  note: string;
}
export interface SoundPracticeProps {
  /** Accessible name for the portfolio. */
  label: string;
  /** Artist name. */
  artist: string;
  /** Portfolio introduction. */
  intro: string;
  /** Project score records. */
  projects: readonly SoundProject[];
  /** Studio approach. */
  approach: string;
  /** Studio capabilities. */
  services: readonly string[];
  /** Contact information. */
  contact: string;
}

export const defaults: SoundPracticeProps = {
  "label": "Sound design portfolio",
  "artist": "Noah Sato",
  "intro": "Sound for spaces, stories, and the moments in between. An independent practice in composition, field recording, and careful listening.",
  "projects": [
    {
      "title": "Room Tone",
      "medium": "Spatial installation / 2026",
      "duration": "08:24",
      "description": "A four-channel composition built from the everyday acoustics of an empty house. Footsteps, pipes, and window resonance become an evolving portrait of a place.",
      "note": "Begin with the room itself. A low pulse enters at 00:40. At 03:10 the close microphone gives way to the distant courtyard. The final minute leaves only air."
    },
    {
      "title": "Tidal Memory",
      "medium": "Short film / 2025",
      "duration": "12:08",
      "description": "Original score and location sound for a film about a coastline in transition. Bowed textures follow the shoreline; recurring fragments mark the return of the tide.",
      "note": "Listen for the dry percussion against the slow strings. The recurring three-note motif is deliberately incomplete until the last shot."
    },
    {
      "title": "Between Stations",
      "medium": "Radio piece / 2025",
      "duration": "06:36",
      "description": "An audio essay assembled from railway announcements, night trains, and conversations recorded at the edges of travel.",
      "note": "The voice stays close and unprocessed. Environmental recordings shift the listener’s sense of distance without overwhelming the words."
    }
  ],
  "approach": "I begin by listening to the material already present: a room, a voice, a rhythm, a story. The work develops through recordings, sketches, and conversations. Silence is part of the arrangement, not a gap to fill.",
  "services": [
    "Original composition",
    "Sound design and editorial",
    "Field and location recording",
    "Spatial audio and installations"
  ],
  "contact": "For a film, installation, or listening project, write to sound@noahsato.example. Include a short brief, the expected format, and your production schedule."
};

function soundPracticeEl<K extends keyof HTMLElementTagNameMap>(tag: K, text = "", mark = ""): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  if (mark) el.setAttribute(`data-pica-${mark}`, "");
  if (text) el.textContent = text;
  return el;
}
function soundPracticeLink(text: string, target: string): HTMLAnchorElement {
  const el = soundPracticeEl("a", text);
  el.href = `#${target}`;
  return el;
}
function soundPracticeLabel(text: string): HTMLElement { return soundPracticeEl("p", text, "label"); }
function soundPracticeSection(id: string): HTMLElement {
  const el = soundPracticeEl("section", "", "section");
  el.id = id;
  return el;
}
function soundPracticeSvg(viewBox: string, paths: readonly string[]): SVGSVGElement {
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


function soundPracticeRules(s: string): string {
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

${s} [data-pica-page] [data-pica-sound-lead]{display:grid;grid-template-columns:1.2fr 1fr;gap:28px 80px;padding:48px 0}
${s} [data-pica-page] [data-pica-sound-lead] h1{font-size:clamp(55px,8.8vw,120px);letter-spacing:-.065em}
${s} [data-pica-page] [data-pica-sound-lead] [data-pica-body]{font-size:21px;line-height:1.4;align-self:end;max-width:33ch}
${s} [data-pica-page] [data-pica-sound-notation]{grid-column:span 2;display:flex;justify-content:space-between;border-top:1px solid ${muted};padding-top:18px}
${s} [data-pica-page] [data-pica-sound-scores]>:first-child{padding-bottom:18px}
${s} [data-pica-page] [data-pica-sound-project]{display:grid;grid-template-columns:260px 1fr;gap:52px;padding:32px 0;border-top:1px solid ${fg}}
${s} [data-pica-page] [data-pica-sound-metadata] h2{font-size:clamp(31px,3.4vw,48px);letter-spacing:-.04em;margin:16px 0 24px}
${s} [data-pica-page] [data-pica-sound-content] svg{height:130px;stroke-width:1.3}
${s} [data-pica-page] [data-pica-sound-content] svg path:first-child{stroke:${muted};stroke-width:.5}
${s} [data-pica-page] [data-pica-sound-times]{display:flex;justify-content:space-between;gap:12px;padding:6px 0 24px}
${s} [data-pica-page] [data-pica-sound-content] details{margin-top:22px}
${s} [data-pica-page] [data-pica-sound-approach]{display:grid;grid-template-columns:1fr 1fr;gap:80px;border-top:1px solid ${fg};padding-top:40px}
${s} [data-pica-page] [data-pica-sound-approach] h2{font-size:clamp(38px,5vw,68px);letter-spacing:-.05em;white-space:pre-line;margin-top:22px}
${s} [data-pica-page] [data-pica-sound-approach] ul{list-style:none;margin:28px 0 0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px}
${s} [data-pica-page] [data-pica-sound-approach] li{border-top:1px solid ${muted};padding-top:10px}
@media(max-width:800px){${s} [data-pica-page] [data-pica-sound-project]{grid-template-columns:190px 1fr;gap:24px}${s} [data-pica-page] [data-pica-sound-lead],${s} [data-pica-page] [data-pica-sound-approach]{gap:30px}}
@media(max-width:600px){${s} [data-pica-page] [data-pica-sound-lead],${s} [data-pica-page] [data-pica-sound-project],${s} [data-pica-page] [data-pica-sound-approach]{grid-template-columns:1fr}${s} [data-pica-page] [data-pica-sound-notation]{grid-column:auto;flex-direction:column;gap:8px}${s} [data-pica-page] [data-pica-sound-content] svg{height:95px}${s} [data-pica-page] [data-pica-sound-times]>:nth-child(2){font-size:9px;max-width:16ch;text-align:center}${s} [data-pica-page] [data-pica-sound-metadata] h2{margin-bottom:12px}}
`;
}

function soundPracticeRender(root: HTMLElement, p: SoundPracticeProps, ids: Record<string, string>): void {
  root.replaceChildren();

  const header = soundPracticeEl("header", "", "header"); header.append(soundPracticeLabel("NS / Sound practice")); const nav = soundPracticeEl("nav", "", "nav"); nav.setAttribute("aria-label", "Sound practice navigation"); nav.append(soundPracticeLink("Selected scores", ids.scores!), soundPracticeLink("Approach", ids.approach!), soundPracticeLink("Contact", ids.contact!)); header.append(nav); root.append(header);
  const lead = soundPracticeEl("div", "", "sound-lead"); lead.append(soundPracticeEl("h1", p.artist, "accent"), soundPracticeEl("p", p.intro, "body")); const notation = soundPracticeEl("div", "", "sound-notation"); notation.append(soundPracticeLabel("Composition · Recording · Listening"), soundPracticeLabel("Index 01—03 / 2025—2026")); lead.append(notation); root.append(lead);
  const scores = soundPracticeSection(ids.scores!); scores.setAttribute("data-pica-sound-scores", ""); scores.append(soundPracticeLabel("Selected work / Visual scores"));
  p.projects.forEach((project, i) => {
    const article = soundPracticeEl("article", "", "sound-project"); const metadata = soundPracticeEl("div", "", "sound-metadata"); metadata.append(soundPracticeLabel(`0${i + 1} / ${project.medium}`), soundPracticeEl("h2", project.title), soundPracticeLabel(`Duration ${project.duration}`)); article.append(metadata);
    const content = soundPracticeEl("div", "", "sound-content"); const figure = soundPracticeEl("figure");
    const wave: string[] = ["M0 80H800 M0 30H800 M0 130H800"];
    for (let x = 4; x < 798; x += 6) { const envelope = Math.pow(Math.sin((x / 800) * Math.PI), 0.7); const a = (6 + 54 * Math.abs(Math.sin(x * 0.073 + i * 1.7) * Math.cos(x * 0.019 + i))) * envelope; wave.push(`M${x} ${80 - a}V${80 + a}`); }
    figure.append(soundPracticeSvg("0 0 800 160", wave)); const times = soundPracticeEl("figcaption", "", "sound-times"); times.append(soundPracticeLabel("00:00"), soundPracticeLabel("Visual score / Dynamics"), soundPracticeLabel(project.duration)); figure.append(times); content.append(figure, soundPracticeEl("p", project.description, "body"));
    const notes = soundPracticeEl("details"); notes.append(soundPracticeEl("summary", "Read listening notes"), soundPracticeEl("p", project.note)); content.append(notes); article.append(content); scores.append(article);
  }); root.append(scores);
  const approach = soundPracticeSection(ids.approach!); approach.setAttribute("data-pica-sound-approach", ""); const title = soundPracticeEl("div"); title.append(soundPracticeLabel("Practice notes"), soundPracticeEl("h2", "Make space\nfor listening.")); const copy = soundPracticeEl("div"); copy.append(soundPracticeEl("p", p.approach, "body")); const list = soundPracticeEl("ul"); p.services.forEach(service => list.append(soundPracticeEl("li", service))); copy.append(list); approach.append(title, copy); root.append(approach);
  const footer = soundPracticeEl("footer", "", "footer"); footer.id = ids.contact!; footer.append(soundPracticeEl("h2", "What does your project sound like?"), soundPracticeEl("p", p.contact)); root.append(footer);

}

export const mount: Mount<SoundPracticeProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  attrs.set("data-pica-id", host.getAttribute("data-pica-id"));
  attrs.set("role", "region");
  attrs.set("aria-label", props.label);
  const sheet = scope(host);
  const root = soundPracticeEl("div", "", "page");
  host.append(root);
  const ids: Record<string, string> = { scores: nextId("sound-practice-scores"), approach: nextId("sound-practice-approach"), contact: nextId("sound-practice-contact") };
  sheet.setRules(soundPracticeRules(sheet.selector));
  soundPracticeRender(root, props, ids);
  attrs.set("data-pica-ready", "true");
  let destroyed = false;
  return {
    update(next) {
      if (destroyed) return;
      const before = props;
      props = { ...props, ...next };
      if (sameJson(before, props)) return;
      attrs.set("aria-label", props.label);
      soundPracticeRender(root, props, ids);
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

// registry/sections/sound-practice/index.tsx
export type SoundPracticeComponentProps = Partial<SoundPracticeProps> & WrapperProps;

/** A sound designer portfolio with original waveform scores, project timelines, and listening annotations. */
export function SoundPractice({ className, style, palette, ...props }: SoundPracticeComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
