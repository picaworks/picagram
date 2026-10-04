# Folio index

> A designer portfolio with a numbered project index, project dossiers, and a practice statement.

Category: sections. Tags: portfolio, one-page, folio-index. Static. Size: 3.6 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/folio-index.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | string | `"Designer portfolio"` | Accessible name for the portfolio. |
| `name` | string | `"Mara Ellis"` | Designer name. |
| `intro` | string | `"Independent designer working between identity, digital products, and the printed page."` | Introduction above the project index. |
| `status` | string | `"Based in Copenhagen / Available for selected collaborations"` | Studio location and availability. |
| `projects` | readonly FolioProject[] | `[{"title":"Public Assembly","category":"Identity / 2026","summary":"A civic identity built around the simple act of coming together.","outcome":"A flexible typographic system, wayfinding toolkit, and accessible website for a network of neighborhood spaces. The open framework lets each place keep its own voice."},{"title":"Interval","category":"Digital product / 2025","summary":"Making room for reflection in a fast-moving planning tool.","outcome":"Research, product strategy, and interface design for an independent calendar. A quieter weekly view reduced scheduling friction and gave the team a clear product language."},{"title":"Soft Matter","category":"Publication / 2025","summary":"An annual journal about materials and the people who make them.","outcome":"Art direction and a modular editorial grid for 176 pages of essays, photography, and field notes. A tactile cover and restrained type hierarchy unite varied voices."}]` | Selected projects in index order. |
| `practice` | string | `"I work closely with small teams to turn complex ideas into clear systems. My practice connects research, thoughtful typography, and careful execution. Every project begins with listening."` | Studio approach. |
| `contact` | string | `"For a new project, write to hello@mara.example. Include a little about your team, timing, and the question you are trying to answer."` | Contact text. |

## Colors

Draws with `--pica-fg`, `--pica-bg`, `--pica-accent`, `--pica-muted`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Folio index · folio-index
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

// registry/sections/folio-index/core.ts
export interface FolioProject {
  /** Project name. */
  title: string;
  /** Discipline and completion year. */
  category: string;
  /** Short project summary. */
  summary: string;
  /** Detailed project outcome. */
  outcome: string;
}
export interface FolioIndexProps {
  /** Accessible name for the portfolio. */
  label: string;
  /** Designer name. */
  name: string;
  /** Introduction above the project index. */
  intro: string;
  /** Studio location and availability. */
  status: string;
  /** Selected projects in index order. */
  projects: readonly FolioProject[];
  /** Studio approach. */
  practice: string;
  /** Contact text. */
  contact: string;
}

export const defaults: FolioIndexProps = {
  "label": "Designer portfolio",
  "name": "Mara Ellis",
  "intro": "Independent designer working between identity, digital products, and the printed page.",
  "status": "Based in Copenhagen / Available for selected collaborations",
  "projects": [
    {
      "title": "Public Assembly",
      "category": "Identity / 2026",
      "summary": "A civic identity built around the simple act of coming together.",
      "outcome": "A flexible typographic system, wayfinding toolkit, and accessible website for a network of neighborhood spaces. The open framework lets each place keep its own voice."
    },
    {
      "title": "Interval",
      "category": "Digital product / 2025",
      "summary": "Making room for reflection in a fast-moving planning tool.",
      "outcome": "Research, product strategy, and interface design for an independent calendar. A quieter weekly view reduced scheduling friction and gave the team a clear product language."
    },
    {
      "title": "Soft Matter",
      "category": "Publication / 2025",
      "summary": "An annual journal about materials and the people who make them.",
      "outcome": "Art direction and a modular editorial grid for 176 pages of essays, photography, and field notes. A tactile cover and restrained type hierarchy unite varied voices."
    }
  ],
  "practice": "I work closely with small teams to turn complex ideas into clear systems. My practice connects research, thoughtful typography, and careful execution. Every project begins with listening.",
  "contact": "For a new project, write to hello@mara.example. Include a little about your team, timing, and the question you are trying to answer."
};

function folioIndexEl<K extends keyof HTMLElementTagNameMap>(tag: K, text = "", mark = ""): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  if (mark) el.setAttribute(`data-pica-${mark}`, "");
  if (text) el.textContent = text;
  return el;
}
function folioIndexLink(text: string, target: string): HTMLAnchorElement {
  const el = folioIndexEl("a", text);
  el.href = `#${target}`;
  return el;
}
function folioIndexLabel(text: string): HTMLElement { return folioIndexEl("p", text, "label"); }
function folioIndexSection(id: string): HTMLElement {
  const el = folioIndexEl("section", "", "section");
  el.id = id;
  return el;
}


function folioIndexRules(s: string): string {
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

${s} [data-pica-page] [data-pica-folio-lead]{display:grid;grid-template-columns:1.45fr 1fr;gap:24px;padding:52px 0 66px;align-items:end}
${s} [data-pica-page] [data-pica-folio-lead] h1{font-size:clamp(54px,8.7vw,124px);letter-spacing:-.07em;line-height:.95;grid-row:span 2}
${s} [data-pica-page] [data-pica-folio-lead] [data-pica-body]{font-size:clamp(19px,2vw,25px);line-height:1.35;max-width:29ch}
${s} [data-pica-page] [data-pica-folio-index]{list-style:none;margin:18px 0 0;padding:0;border-top:1px solid ${fg}}
${s} [data-pica-page] [data-pica-folio-index] li{border-bottom:1px solid ${fg}}
${s} [data-pica-page] [data-pica-folio-index] a{display:grid;grid-template-columns:76px 1fr 180px;align-items:center;gap:16px;text-decoration:none;padding:18px 0}
${s} [data-pica-page] [data-pica-folio-number]{font-family:${GRID_FONT};font-size:16px;align-self:start;padding-top:10px;color:${muted}}
${s} [data-pica-page] [data-pica-folio-title]{font-size:clamp(34px,6.3vw,88px);letter-spacing:-.055em;line-height:1.05}
${s} [data-pica-page] [data-pica-folio-dossiers]{display:grid;grid-template-columns:repeat(3,1fr);gap:40px;margin-top:56px}
${s} [data-pica-page] [data-pica-folio-dossiers] h2{font-size:24px;margin:18px 0}
${s} [data-pica-page] [data-pica-folio-summary]{font-size:20px;line-height:1.3;margin-bottom:18px}
${s} [data-pica-page] [data-pica-folio-practice]{display:grid;grid-template-columns:.65fr 1.15fr 1fr;gap:32px;border-top:1px solid ${fg};padding-top:30px;margin-top:64px}
${s} [data-pica-page] [data-pica-folio-practice] h2{font-size:clamp(32px,4.4vw,60px);white-space:pre-line}
@media(max-width:800px){${s} [data-pica-page] [data-pica-folio-index] a{grid-template-columns:42px 1fr}${s} [data-pica-page] [data-pica-folio-index] [data-pica-label]{grid-column:2}${s} [data-pica-page] [data-pica-folio-dossiers]{grid-template-columns:1fr;gap:34px}${s} [data-pica-page] [data-pica-folio-practice]{grid-template-columns:1fr 1fr}${s} [data-pica-page] [data-pica-folio-practice]>:first-child{grid-column:span 2}}
@media(max-width:600px){${s} [data-pica-page] [data-pica-folio-lead]{grid-template-columns:1fr;padding:36px 0}${s} [data-pica-page] [data-pica-folio-lead] h1{grid-row:auto}${s} [data-pica-page] [data-pica-folio-practice]{grid-template-columns:1fr}${s} [data-pica-page] [data-pica-folio-practice]>:first-child{grid-column:auto}}
`;
}

function folioIndexRender(root: HTMLElement, p: FolioIndexProps, ids: Record<string, string>): void {
  root.replaceChildren();

  const header = folioIndexEl("header", "", "header");
  header.append(folioIndexLabel("ME / Independent design"));
  const nav = folioIndexEl("nav", "", "nav"); nav.setAttribute("aria-label", "Portfolio navigation");
  nav.append(folioIndexLink("Selected work", ids.work!), folioIndexLink("Practice", ids.practice!), folioIndexLink("Contact", ids.contact!)); header.append(nav); root.append(header);
  const lead = folioIndexEl("div", "", "folio-lead"); lead.append(folioIndexEl("h1", p.name, "accent"), folioIndexEl("p", p.intro, "body"), folioIndexLabel(p.status)); root.append(lead);
  const work = folioIndexSection(ids.work!); work.append(folioIndexLabel("01 / Selected work"));
  const list = folioIndexEl("ol", "", "folio-index");
  p.projects.forEach((project, i) => {
    const item = folioIndexEl("li"); const link = folioIndexLink(project.title, `${ids.work!}-${i}`); const num = folioIndexEl("span", String(i + 1).padStart(2, "0"), "folio-number");
    const text = folioIndexEl("span", project.title, "folio-title"); const type = folioIndexLabel(project.category); link.textContent = ""; link.append(num, text, type); item.append(link); list.append(item);
  }); work.append(list); root.append(work);
  const dossiers = folioIndexEl("div", "", "folio-dossiers");
  p.projects.forEach((project, i) => {
    const article = folioIndexSection(`${ids.work!}-${i}`); article.append(folioIndexLabel(`${String(i + 1).padStart(2, "0")} / ${project.category}`), folioIndexEl("h2", project.title));
    article.append(folioIndexEl("p", project.summary, "folio-summary"), folioIndexEl("p", project.outcome, "body")); dossiers.append(article);
  }); root.append(dossiers);
  const practice = folioIndexSection(ids.practice!); practice.setAttribute("data-pica-folio-practice", ""); practice.append(folioIndexLabel("02 / Practice"), folioIndexEl("h2", "Clear ideas.\nCarefully made."), folioIndexEl("p", p.practice, "body")); root.append(practice);
  const footer = folioIndexEl("footer", "", "footer"); footer.id = ids.contact!; footer.append(folioIndexEl("h2", "Good work starts with a conversation."), folioIndexEl("p", p.contact)); root.append(footer);

}

export const mount: Mount<FolioIndexProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  attrs.set("data-pica-id", host.getAttribute("data-pica-id"));
  attrs.set("role", "region");
  attrs.set("aria-label", props.label);
  const sheet = scope(host);
  const root = folioIndexEl("div", "", "page");
  host.append(root);
  const ids: Record<string, string> = { work: nextId("folio-index-work"), practice: nextId("folio-index-practice"), contact: nextId("folio-index-contact") };
  sheet.setRules(folioIndexRules(sheet.selector));
  folioIndexRender(root, props, ids);
  attrs.set("data-pica-ready", "true");
  let destroyed = false;
  return {
    update(next) {
      if (destroyed) return;
      const before = props;
      props = { ...props, ...next };
      if (sameJson(before, props)) return;
      attrs.set("aria-label", props.label);
      folioIndexRender(root, props, ids);
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

// registry/sections/folio-index/index.tsx
export type FolioIndexComponentProps = Partial<FolioIndexProps> & WrapperProps;

/** A designer portfolio with a numbered project index, project dossiers, and a practice statement. */
export function FolioIndex({ className, style, palette, ...props }: FolioIndexComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Folio index · folio-index
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en" data-stage="flow">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Folio index · Pica</title>
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
<div id="pica"></div>
<script>
"use strict";
var PicaFolioIndex = (() => {
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

  // registry/sections/folio-index/core.ts
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
  function nextId(prefix) {
    return `${prefix}-${nextSerial()}`;
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

  // registry/sections/folio-index/core.ts
  var defaults = {
    "label": "Designer portfolio",
    "name": "Mara Ellis",
    "intro": "Independent designer working between identity, digital products, and the printed page.",
    "status": "Based in Copenhagen / Available for selected collaborations",
    "projects": [
      {
        "title": "Public Assembly",
        "category": "Identity / 2026",
        "summary": "A civic identity built around the simple act of coming together.",
        "outcome": "A flexible typographic system, wayfinding toolkit, and accessible website for a network of neighborhood spaces. The open framework lets each place keep its own voice."
      },
      {
        "title": "Interval",
        "category": "Digital product / 2025",
        "summary": "Making room for reflection in a fast-moving planning tool.",
        "outcome": "Research, product strategy, and interface design for an independent calendar. A quieter weekly view reduced scheduling friction and gave the team a clear product language."
      },
      {
        "title": "Soft Matter",
        "category": "Publication / 2025",
        "summary": "An annual journal about materials and the people who make them.",
        "outcome": "Art direction and a modular editorial grid for 176 pages of essays, photography, and field notes. A tactile cover and restrained type hierarchy unite varied voices."
      }
    ],
    "practice": "I work closely with small teams to turn complex ideas into clear systems. My practice connects research, thoughtful typography, and careful execution. Every project begins with listening.",
    "contact": "For a new project, write to hello@mara.example. Include a little about your team, timing, and the question you are trying to answer."
  };
  function folioIndexEl(tag, text = "", mark = "") {
    const el = document.createElement(tag);
    el.setAttribute("data-pica", "");
    if (mark) el.setAttribute(`data-pica-${mark}`, "");
    if (text) el.textContent = text;
    return el;
  }
  function folioIndexLink(text, target) {
    const el = folioIndexEl("a", text);
    el.href = `#${target}`;
    return el;
  }
  function folioIndexLabel(text) {
    return folioIndexEl("p", text, "label");
  }
  function folioIndexSection(id) {
    const el = folioIndexEl("section", "", "section");
    el.id = id;
    return el;
  }
  function folioIndexRules(s) {
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

${s} [data-pica-page] [data-pica-folio-lead]{display:grid;grid-template-columns:1.45fr 1fr;gap:24px;padding:52px 0 66px;align-items:end}
${s} [data-pica-page] [data-pica-folio-lead] h1{font-size:clamp(54px,8.7vw,124px);letter-spacing:-.07em;line-height:.95;grid-row:span 2}
${s} [data-pica-page] [data-pica-folio-lead] [data-pica-body]{font-size:clamp(19px,2vw,25px);line-height:1.35;max-width:29ch}
${s} [data-pica-page] [data-pica-folio-index]{list-style:none;margin:18px 0 0;padding:0;border-top:1px solid ${fg}}
${s} [data-pica-page] [data-pica-folio-index] li{border-bottom:1px solid ${fg}}
${s} [data-pica-page] [data-pica-folio-index] a{display:grid;grid-template-columns:76px 1fr 180px;align-items:center;gap:16px;text-decoration:none;padding:18px 0}
${s} [data-pica-page] [data-pica-folio-number]{font-family:${GRID_FONT};font-size:16px;align-self:start;padding-top:10px;color:${muted}}
${s} [data-pica-page] [data-pica-folio-title]{font-size:clamp(34px,6.3vw,88px);letter-spacing:-.055em;line-height:1.05}
${s} [data-pica-page] [data-pica-folio-dossiers]{display:grid;grid-template-columns:repeat(3,1fr);gap:40px;margin-top:56px}
${s} [data-pica-page] [data-pica-folio-dossiers] h2{font-size:24px;margin:18px 0}
${s} [data-pica-page] [data-pica-folio-summary]{font-size:20px;line-height:1.3;margin-bottom:18px}
${s} [data-pica-page] [data-pica-folio-practice]{display:grid;grid-template-columns:.65fr 1.15fr 1fr;gap:32px;border-top:1px solid ${fg};padding-top:30px;margin-top:64px}
${s} [data-pica-page] [data-pica-folio-practice] h2{font-size:clamp(32px,4.4vw,60px);white-space:pre-line}
@media(max-width:800px){${s} [data-pica-page] [data-pica-folio-index] a{grid-template-columns:42px 1fr}${s} [data-pica-page] [data-pica-folio-index] [data-pica-label]{grid-column:2}${s} [data-pica-page] [data-pica-folio-dossiers]{grid-template-columns:1fr;gap:34px}${s} [data-pica-page] [data-pica-folio-practice]{grid-template-columns:1fr 1fr}${s} [data-pica-page] [data-pica-folio-practice]>:first-child{grid-column:span 2}}
@media(max-width:600px){${s} [data-pica-page] [data-pica-folio-lead]{grid-template-columns:1fr;padding:36px 0}${s} [data-pica-page] [data-pica-folio-lead] h1{grid-row:auto}${s} [data-pica-page] [data-pica-folio-practice]{grid-template-columns:1fr}${s} [data-pica-page] [data-pica-folio-practice]>:first-child{grid-column:auto}}
`;
  }
  function folioIndexRender(root, p, ids) {
    root.replaceChildren();
    const header = folioIndexEl("header", "", "header");
    header.append(folioIndexLabel("ME / Independent design"));
    const nav = folioIndexEl("nav", "", "nav");
    nav.setAttribute("aria-label", "Portfolio navigation");
    nav.append(folioIndexLink("Selected work", ids.work), folioIndexLink("Practice", ids.practice), folioIndexLink("Contact", ids.contact));
    header.append(nav);
    root.append(header);
    const lead = folioIndexEl("div", "", "folio-lead");
    lead.append(folioIndexEl("h1", p.name, "accent"), folioIndexEl("p", p.intro, "body"), folioIndexLabel(p.status));
    root.append(lead);
    const work = folioIndexSection(ids.work);
    work.append(folioIndexLabel("01 / Selected work"));
    const list = folioIndexEl("ol", "", "folio-index");
    p.projects.forEach((project, i) => {
      const item = folioIndexEl("li");
      const link = folioIndexLink(project.title, `${ids.work}-${i}`);
      const num = folioIndexEl("span", String(i + 1).padStart(2, "0"), "folio-number");
      const text = folioIndexEl("span", project.title, "folio-title");
      const type = folioIndexLabel(project.category);
      link.textContent = "";
      link.append(num, text, type);
      item.append(link);
      list.append(item);
    });
    work.append(list);
    root.append(work);
    const dossiers = folioIndexEl("div", "", "folio-dossiers");
    p.projects.forEach((project, i) => {
      const article = folioIndexSection(`${ids.work}-${i}`);
      article.append(folioIndexLabel(`${String(i + 1).padStart(2, "0")} / ${project.category}`), folioIndexEl("h2", project.title));
      article.append(folioIndexEl("p", project.summary, "folio-summary"), folioIndexEl("p", project.outcome, "body"));
      dossiers.append(article);
    });
    root.append(dossiers);
    const practice = folioIndexSection(ids.practice);
    practice.setAttribute("data-pica-folio-practice", "");
    practice.append(folioIndexLabel("02 / Practice"), folioIndexEl("h2", "Clear ideas.\nCarefully made."), folioIndexEl("p", p.practice, "body"));
    root.append(practice);
    const footer = folioIndexEl("footer", "", "footer");
    footer.id = ids.contact;
    footer.append(folioIndexEl("h2", "Good work starts with a conversation."), folioIndexEl("p", p.contact));
    root.append(footer);
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    const attrs = hostAttributes(host);
    attrs.set("data-pica-id", host.getAttribute("data-pica-id"));
    attrs.set("role", "region");
    attrs.set("aria-label", props.label);
    const sheet = scope(host);
    const root = folioIndexEl("div", "", "page");
    host.append(root);
    const ids = { work: nextId("folio-index-work"), practice: nextId("folio-index-practice"), contact: nextId("folio-index-contact") };
    sheet.setRules(folioIndexRules(sheet.selector));
    folioIndexRender(root, props, ids);
    attrs.set("data-pica-ready", "true");
    let destroyed = false;
    return {
      update(next) {
        if (destroyed) return;
        const before = props;
        props = { ...props, ...next };
        if (sameJson(before, props)) return;
        attrs.set("aria-label", props.label);
        folioIndexRender(root, props, ids);
      },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        root.remove();
        sheet.destroy();
        attrs.restore();
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
  var initial = Object.assign({}, {}, window.PICA_PROPS || {});
  var instance = PicaFolioIndex.mount(host, take(initial));
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
