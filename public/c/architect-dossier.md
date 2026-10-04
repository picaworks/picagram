# Architect dossier

> An architectural project dossier with original plan drawings, marginal specifications, and design notes.

Category: sections. Tags: portfolio, one-page, architect-dossier. Static. Size: 4.2 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/architect-dossier.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | string | `"Architecture project dossier"` | Accessible name for the dossier. |
| `studio` | string | `"Office for Common Ground"` | Architecture practice. |
| `title` | string | `"Courtyard House"` | Project title. |
| `subtitle` | string | `"Residential study / Aarhus, Denmark / 2026"` | Project location and stage. |
| `concept` | string | `"A small house arranged around an open room. The courtyard brings daylight into the depth of the plan, while a continuous timber threshold connects everyday life to the garden."` | Project concept. |
| `facts` | readonly ArchitectFact[] | `[{"label":"Project number","value":"CG–026 / Revision B"},{"label":"Site area","value":"480 m²"},{"label":"Floor area","value":"126 m²"},{"label":"Structure","value":"Timber frame"},{"label":"Orientation","value":"Courtyard faces south"},{"label":"Stage","value":"Design development"}]` | Marginal specifications. |
| `materials` | string | `"A low brick plinth anchors a lightweight timber frame. Untreated larch cladding records the seasons, while lime plaster and oak joinery bring warmth to the interior."` | Material strategy. |
| `environment` | string | `"Deep eaves provide summer shade. Openings across the courtyard allow natural ventilation. A compact envelope and insulated slab reduce the heating demand before systems are introduced."` | Environmental strategy. |
| `contact` | string | `"For commissions and collaborations: studio@commonground.example. We welcome conversations about thoughtful buildings, modest budgets, and lasting places."` | Contact text. |

## Colors

Draws with `--pica-fg`, `--pica-bg`, `--pica-accent`, `--pica-muted`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Architect dossier · architect-dossier
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

// registry/sections/architect-dossier/core.ts
export interface ArchitectFact {
  /** Specification name. */
  label: string;
  /** Specification value. */
  value: string;
}
export interface ArchitectDossierProps {
  /** Accessible name for the dossier. */
  label: string;
  /** Architecture practice. */
  studio: string;
  /** Project title. */
  title: string;
  /** Project location and stage. */
  subtitle: string;
  /** Project concept. */
  concept: string;
  /** Marginal specifications. */
  facts: readonly ArchitectFact[];
  /** Material strategy. */
  materials: string;
  /** Environmental strategy. */
  environment: string;
  /** Contact text. */
  contact: string;
}

export const defaults: ArchitectDossierProps = {
  "label": "Architecture project dossier",
  "studio": "Office for Common Ground",
  "title": "Courtyard House",
  "subtitle": "Residential study / Aarhus, Denmark / 2026",
  "concept": "A small house arranged around an open room. The courtyard brings daylight into the depth of the plan, while a continuous timber threshold connects everyday life to the garden.",
  "facts": [
    {
      "label": "Project number",
      "value": "CG–026 / Revision B"
    },
    {
      "label": "Site area",
      "value": "480 m²"
    },
    {
      "label": "Floor area",
      "value": "126 m²"
    },
    {
      "label": "Structure",
      "value": "Timber frame"
    },
    {
      "label": "Orientation",
      "value": "Courtyard faces south"
    },
    {
      "label": "Stage",
      "value": "Design development"
    }
  ],
  "materials": "A low brick plinth anchors a lightweight timber frame. Untreated larch cladding records the seasons, while lime plaster and oak joinery bring warmth to the interior.",
  "environment": "Deep eaves provide summer shade. Openings across the courtyard allow natural ventilation. A compact envelope and insulated slab reduce the heating demand before systems are introduced.",
  "contact": "For commissions and collaborations: studio@commonground.example. We welcome conversations about thoughtful buildings, modest budgets, and lasting places."
};

function architectDossierEl<K extends keyof HTMLElementTagNameMap>(tag: K, text = "", mark = ""): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  if (mark) el.setAttribute(`data-pica-${mark}`, "");
  if (text) el.textContent = text;
  return el;
}
function architectDossierLink(text: string, target: string): HTMLAnchorElement {
  const el = architectDossierEl("a", text);
  el.href = `#${target}`;
  return el;
}
function architectDossierLabel(text: string): HTMLElement { return architectDossierEl("p", text, "label"); }
function architectDossierSection(id: string): HTMLElement {
  const el = architectDossierEl("section", "", "section");
  el.id = id;
  return el;
}
function architectDossierSvg(viewBox: string, paths: readonly string[]): SVGSVGElement {
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


function architectDossierRules(s: string): string {
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

${s} [data-pica-page] [data-pica-arch-title]{margin:44px 0;display:grid;grid-template-columns:1fr auto;gap:16px;align-items:end}
${s} [data-pica-page] [data-pica-arch-title]>:first-child{grid-column:span 2}
${s} [data-pica-page] [data-pica-arch-title] h1{font-size:clamp(44px,6.5vw,88px);letter-spacing:-.05em}
${s} [data-pica-page] [data-pica-arch-title]>:last-child{max-width:20ch;font-size:17px}
${s} [data-pica-page] [data-pica-arch-layout]{display:grid;grid-template-columns:190px 1fr;gap:44px;border-top:1px solid ${fg};padding-top:26px}
${s} [data-pica-page] [data-pica-arch-margin]>div{padding:16px 0;border-bottom:1px solid ${muted};font-size:13px}
${s} [data-pica-page] [data-pica-arch-drawings] figure{margin-bottom:38px}
${s} [data-pica-page] [data-pica-arch-drawings] svg{max-height:550px}
${s} [data-pica-page] [data-pica-arch-drawings] figcaption{display:grid;grid-template-columns:200px 1fr;gap:22px;border-top:1px solid ${muted};padding-top:14px;font-size:13px}
${s} [data-pica-page] [data-pica-arch-notes]{display:grid;grid-template-columns:190px 1fr;gap:26px 44px;border-top:1px solid ${fg};padding-top:30px}
${s} [data-pica-page] [data-pica-arch-notes] h2{font-size:38px;margin-bottom:18px}
${s} [data-pica-page] [data-pica-arch-notes] details{grid-column:2}
@media(max-width:800px){${s} [data-pica-page] [data-pica-arch-layout]{grid-template-columns:150px 1fr;gap:24px}${s} [data-pica-page] [data-pica-arch-notes]{grid-template-columns:150px 1fr;gap:24px}${s} [data-pica-page] [data-pica-arch-drawings] figcaption{grid-template-columns:1fr;gap:4px}}
@media(max-width:600px){${s} [data-pica-page] [data-pica-arch-title]{grid-template-columns:1fr}${s} [data-pica-page] [data-pica-arch-title]>:first-child{grid-column:auto}${s} [data-pica-page] [data-pica-arch-layout]{display:flex;flex-direction:column-reverse;gap:18px}${s} [data-pica-page] [data-pica-arch-margin]{display:grid;grid-template-columns:1fr 1fr;gap:0 20px}${s} [data-pica-page] [data-pica-arch-margin]>:first-child{grid-column:span 2}${s} [data-pica-page] [data-pica-arch-notes]{grid-template-columns:1fr}${s} [data-pica-page] [data-pica-arch-notes] details{grid-column:auto}}
`;
}

function architectDossierRender(root: HTMLElement, p: ArchitectDossierProps, ids: Record<string, string>): void {
  root.replaceChildren();

  const header = architectDossierEl("header", "", "header"); header.append(architectDossierLabel(p.studio));
  const nav = architectDossierEl("nav", "", "nav"); nav.setAttribute("aria-label", "Dossier navigation"); nav.append(architectDossierLink("Drawings", ids.drawings!), architectDossierLink("Notes", ids.notes!), architectDossierLink("Enquiries", ids.contact!)); header.append(nav); root.append(header);
  const title = architectDossierEl("div", "", "arch-title"); title.append(architectDossierLabel(p.subtitle), architectDossierEl("h1", p.title), architectDossierEl("p", "A house with an open heart.", "accent")); root.append(title);
  const layout = architectDossierEl("div", "", "arch-layout");
  const margin = architectDossierEl("aside", "", "arch-margin"); margin.setAttribute("aria-label", "Project specifications"); margin.append(architectDossierLabel("Project register"));
  for (const fact of p.facts) { const pair = architectDossierEl("div"); pair.append(architectDossierLabel(fact.label), architectDossierEl("p", fact.value)); margin.append(pair); }
  const drawings = architectDossierSection(ids.drawings!); drawings.setAttribute("data-pica-arch-drawings", "");
  const plan = architectDossierEl("figure"); plan.append(architectDossierSvg("0 0 740 470", ["M90 60H650V400H90Z M105 75H635V385H105Z M290 165H470V305H290Z M275 150H485V320H275Z", "M105 165H275 M105 175H275 M105 305H275 M105 315H275 M485 165H635 M485 175H635 M485 305H635 M485 315H635", "M200 75V165 M210 75V165 M550 75V165 M560 75V165 M200 315V385 M210 315V385 M550 315V385 M560 315V385", "M300 175H460V295H300Z M315 190H445V280H315Z M325 203H435 M325 218H435 M325 233H435 M325 248H435 M325 263H435", "M125 90H185V135H125Z M575 205H615V260H575Z M125 330H180V365H125Z", "M65 60V400 M60 60H70 M60 400H70 M90 435H650 M90 430V440 M650 430V440", "M670 78V40L665 50 M670 40L675 50 M90 425V410 M650 425V410", "M20 240H720 M370 20V450"]));
  const cap = architectDossierEl("figcaption"); cap.append(architectDossierLabel("01 / Ground floor plan"), architectDossierEl("p", "Courtyard, living spaces, and a continuous sheltered threshold. Diagrammatic study, not a construction drawing.")); plan.append(cap); drawings.append(plan);
  const section = architectDossierEl("figure"); section.append(architectDossierSvg("0 0 740 260", ["M70 220H670 M90 205H650V220H90Z M110 205V95H290V205 M470 205V95H630V205", "M90 95H300V85H90Z M460 95H650V85H460Z M110 95V70H290 M470 70H630V95", "M130 205V115H260V205 M495 205V115H610V205", "M300 205V185H460V205 M305 190H455 M305 196H455", "M65 85V220 M60 85H70 M60 220H70", "M90 230V250 M650 230V250 M90 245H650", "M70 225L85 240 M100 225L115 240 M130 225L145 240 M160 225L175 240 M190 225L205 240 M220 225L235 240 M250 225L265 240 M280 225L295 240 M310 225L325 240 M340 225L355 240 M370 225L385 240 M400 225L415 240 M430 225L445 240 M460 225L475 240 M490 225L505 240 M520 225L535 240 M550 225L565 240 M580 225L595 240 M610 225L625 240"]));
  const secCap = architectDossierEl("figcaption"); secCap.append(architectDossierLabel("02 / Section through courtyard"), architectDossierEl("p", "Two inhabited edges frame an outdoor room. Low eaves preserve a domestic scale.")); section.append(secCap); drawings.append(section); layout.append(margin, drawings); root.append(layout);
  const notes = architectDossierSection(ids.notes!); notes.setAttribute("data-pica-arch-notes", ""); notes.append(architectDossierLabel("Design notes"));
  const concept = architectDossierEl("div"); concept.append(architectDossierEl("h2", "The open room"), architectDossierEl("p", p.concept, "body")); notes.append(concept);
  for (const [heading, copy] of [["Material assembly", p.materials], ["Passive climate", p.environment]]) { const detail = architectDossierEl("details"); detail.append(architectDossierEl("summary", heading), architectDossierEl("p", copy)); notes.append(detail); } root.append(notes);
  const footer = architectDossierEl("footer", "", "footer"); footer.id = ids.contact!; footer.append(architectDossierEl("h2", "Architecture for everyday life."), architectDossierEl("p", p.contact)); root.append(footer);

}

export const mount: Mount<ArchitectDossierProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  attrs.set("data-pica-id", host.getAttribute("data-pica-id"));
  attrs.set("role", "region");
  attrs.set("aria-label", props.label);
  const sheet = scope(host);
  const root = architectDossierEl("div", "", "page");
  host.append(root);
  const ids: Record<string, string> = { drawings: nextId("architect-dossier-drawings"), notes: nextId("architect-dossier-notes"), contact: nextId("architect-dossier-contact") };
  sheet.setRules(architectDossierRules(sheet.selector));
  architectDossierRender(root, props, ids);
  attrs.set("data-pica-ready", "true");
  let destroyed = false;
  return {
    update(next) {
      if (destroyed) return;
      const before = props;
      props = { ...props, ...next };
      if (sameJson(before, props)) return;
      attrs.set("aria-label", props.label);
      architectDossierRender(root, props, ids);
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

// registry/sections/architect-dossier/index.tsx
export type ArchitectDossierComponentProps = Partial<ArchitectDossierProps> & WrapperProps;

/** An architectural project dossier with original plan drawings, marginal specifications, and design notes. */
export function ArchitectDossier({ className, style, palette, ...props }: ArchitectDossierComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Architect dossier · architect-dossier
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en" data-stage="flow">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Architect dossier · Pica</title>
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
var PicaArchitectDossier = (() => {
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

  // registry/sections/architect-dossier/core.ts
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

  // registry/sections/architect-dossier/core.ts
  var defaults = {
    "label": "Architecture project dossier",
    "studio": "Office for Common Ground",
    "title": "Courtyard House",
    "subtitle": "Residential study / Aarhus, Denmark / 2026",
    "concept": "A small house arranged around an open room. The courtyard brings daylight into the depth of the plan, while a continuous timber threshold connects everyday life to the garden.",
    "facts": [
      {
        "label": "Project number",
        "value": "CG–026 / Revision B"
      },
      {
        "label": "Site area",
        "value": "480 m²"
      },
      {
        "label": "Floor area",
        "value": "126 m²"
      },
      {
        "label": "Structure",
        "value": "Timber frame"
      },
      {
        "label": "Orientation",
        "value": "Courtyard faces south"
      },
      {
        "label": "Stage",
        "value": "Design development"
      }
    ],
    "materials": "A low brick plinth anchors a lightweight timber frame. Untreated larch cladding records the seasons, while lime plaster and oak joinery bring warmth to the interior.",
    "environment": "Deep eaves provide summer shade. Openings across the courtyard allow natural ventilation. A compact envelope and insulated slab reduce the heating demand before systems are introduced.",
    "contact": "For commissions and collaborations: studio@commonground.example. We welcome conversations about thoughtful buildings, modest budgets, and lasting places."
  };
  function architectDossierEl(tag, text = "", mark = "") {
    const el = document.createElement(tag);
    el.setAttribute("data-pica", "");
    if (mark) el.setAttribute(`data-pica-${mark}`, "");
    if (text) el.textContent = text;
    return el;
  }
  function architectDossierLink(text, target) {
    const el = architectDossierEl("a", text);
    el.href = `#${target}`;
    return el;
  }
  function architectDossierLabel(text) {
    return architectDossierEl("p", text, "label");
  }
  function architectDossierSection(id) {
    const el = architectDossierEl("section", "", "section");
    el.id = id;
    return el;
  }
  function architectDossierSvg(viewBox, paths) {
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
  function architectDossierRules(s) {
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

${s} [data-pica-page] [data-pica-arch-title]{margin:44px 0;display:grid;grid-template-columns:1fr auto;gap:16px;align-items:end}
${s} [data-pica-page] [data-pica-arch-title]>:first-child{grid-column:span 2}
${s} [data-pica-page] [data-pica-arch-title] h1{font-size:clamp(44px,6.5vw,88px);letter-spacing:-.05em}
${s} [data-pica-page] [data-pica-arch-title]>:last-child{max-width:20ch;font-size:17px}
${s} [data-pica-page] [data-pica-arch-layout]{display:grid;grid-template-columns:190px 1fr;gap:44px;border-top:1px solid ${fg};padding-top:26px}
${s} [data-pica-page] [data-pica-arch-margin]>div{padding:16px 0;border-bottom:1px solid ${muted};font-size:13px}
${s} [data-pica-page] [data-pica-arch-drawings] figure{margin-bottom:38px}
${s} [data-pica-page] [data-pica-arch-drawings] svg{max-height:550px}
${s} [data-pica-page] [data-pica-arch-drawings] figcaption{display:grid;grid-template-columns:200px 1fr;gap:22px;border-top:1px solid ${muted};padding-top:14px;font-size:13px}
${s} [data-pica-page] [data-pica-arch-notes]{display:grid;grid-template-columns:190px 1fr;gap:26px 44px;border-top:1px solid ${fg};padding-top:30px}
${s} [data-pica-page] [data-pica-arch-notes] h2{font-size:38px;margin-bottom:18px}
${s} [data-pica-page] [data-pica-arch-notes] details{grid-column:2}
@media(max-width:800px){${s} [data-pica-page] [data-pica-arch-layout]{grid-template-columns:150px 1fr;gap:24px}${s} [data-pica-page] [data-pica-arch-notes]{grid-template-columns:150px 1fr;gap:24px}${s} [data-pica-page] [data-pica-arch-drawings] figcaption{grid-template-columns:1fr;gap:4px}}
@media(max-width:600px){${s} [data-pica-page] [data-pica-arch-title]{grid-template-columns:1fr}${s} [data-pica-page] [data-pica-arch-title]>:first-child{grid-column:auto}${s} [data-pica-page] [data-pica-arch-layout]{display:flex;flex-direction:column-reverse;gap:18px}${s} [data-pica-page] [data-pica-arch-margin]{display:grid;grid-template-columns:1fr 1fr;gap:0 20px}${s} [data-pica-page] [data-pica-arch-margin]>:first-child{grid-column:span 2}${s} [data-pica-page] [data-pica-arch-notes]{grid-template-columns:1fr}${s} [data-pica-page] [data-pica-arch-notes] details{grid-column:auto}}
`;
  }
  function architectDossierRender(root, p, ids) {
    root.replaceChildren();
    const header = architectDossierEl("header", "", "header");
    header.append(architectDossierLabel(p.studio));
    const nav = architectDossierEl("nav", "", "nav");
    nav.setAttribute("aria-label", "Dossier navigation");
    nav.append(architectDossierLink("Drawings", ids.drawings), architectDossierLink("Notes", ids.notes), architectDossierLink("Enquiries", ids.contact));
    header.append(nav);
    root.append(header);
    const title = architectDossierEl("div", "", "arch-title");
    title.append(architectDossierLabel(p.subtitle), architectDossierEl("h1", p.title), architectDossierEl("p", "A house with an open heart.", "accent"));
    root.append(title);
    const layout = architectDossierEl("div", "", "arch-layout");
    const margin = architectDossierEl("aside", "", "arch-margin");
    margin.setAttribute("aria-label", "Project specifications");
    margin.append(architectDossierLabel("Project register"));
    for (const fact of p.facts) {
      const pair = architectDossierEl("div");
      pair.append(architectDossierLabel(fact.label), architectDossierEl("p", fact.value));
      margin.append(pair);
    }
    const drawings = architectDossierSection(ids.drawings);
    drawings.setAttribute("data-pica-arch-drawings", "");
    const plan = architectDossierEl("figure");
    plan.append(architectDossierSvg("0 0 740 470", ["M90 60H650V400H90Z M105 75H635V385H105Z M290 165H470V305H290Z M275 150H485V320H275Z", "M105 165H275 M105 175H275 M105 305H275 M105 315H275 M485 165H635 M485 175H635 M485 305H635 M485 315H635", "M200 75V165 M210 75V165 M550 75V165 M560 75V165 M200 315V385 M210 315V385 M550 315V385 M560 315V385", "M300 175H460V295H300Z M315 190H445V280H315Z M325 203H435 M325 218H435 M325 233H435 M325 248H435 M325 263H435", "M125 90H185V135H125Z M575 205H615V260H575Z M125 330H180V365H125Z", "M65 60V400 M60 60H70 M60 400H70 M90 435H650 M90 430V440 M650 430V440", "M670 78V40L665 50 M670 40L675 50 M90 425V410 M650 425V410", "M20 240H720 M370 20V450"]));
    const cap = architectDossierEl("figcaption");
    cap.append(architectDossierLabel("01 / Ground floor plan"), architectDossierEl("p", "Courtyard, living spaces, and a continuous sheltered threshold. Diagrammatic study, not a construction drawing."));
    plan.append(cap);
    drawings.append(plan);
    const section = architectDossierEl("figure");
    section.append(architectDossierSvg("0 0 740 260", ["M70 220H670 M90 205H650V220H90Z M110 205V95H290V205 M470 205V95H630V205", "M90 95H300V85H90Z M460 95H650V85H460Z M110 95V70H290 M470 70H630V95", "M130 205V115H260V205 M495 205V115H610V205", "M300 205V185H460V205 M305 190H455 M305 196H455", "M65 85V220 M60 85H70 M60 220H70", "M90 230V250 M650 230V250 M90 245H650", "M70 225L85 240 M100 225L115 240 M130 225L145 240 M160 225L175 240 M190 225L205 240 M220 225L235 240 M250 225L265 240 M280 225L295 240 M310 225L325 240 M340 225L355 240 M370 225L385 240 M400 225L415 240 M430 225L445 240 M460 225L475 240 M490 225L505 240 M520 225L535 240 M550 225L565 240 M580 225L595 240 M610 225L625 240"]));
    const secCap = architectDossierEl("figcaption");
    secCap.append(architectDossierLabel("02 / Section through courtyard"), architectDossierEl("p", "Two inhabited edges frame an outdoor room. Low eaves preserve a domestic scale."));
    section.append(secCap);
    drawings.append(section);
    layout.append(margin, drawings);
    root.append(layout);
    const notes = architectDossierSection(ids.notes);
    notes.setAttribute("data-pica-arch-notes", "");
    notes.append(architectDossierLabel("Design notes"));
    const concept = architectDossierEl("div");
    concept.append(architectDossierEl("h2", "The open room"), architectDossierEl("p", p.concept, "body"));
    notes.append(concept);
    for (const [heading, copy] of [["Material assembly", p.materials], ["Passive climate", p.environment]]) {
      const detail = architectDossierEl("details");
      detail.append(architectDossierEl("summary", heading), architectDossierEl("p", copy));
      notes.append(detail);
    }
    root.append(notes);
    const footer = architectDossierEl("footer", "", "footer");
    footer.id = ids.contact;
    footer.append(architectDossierEl("h2", "Architecture for everyday life."), architectDossierEl("p", p.contact));
    root.append(footer);
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    const attrs = hostAttributes(host);
    attrs.set("data-pica-id", host.getAttribute("data-pica-id"));
    attrs.set("role", "region");
    attrs.set("aria-label", props.label);
    const sheet = scope(host);
    const root = architectDossierEl("div", "", "page");
    host.append(root);
    const ids = { drawings: nextId("architect-dossier-drawings"), notes: nextId("architect-dossier-notes"), contact: nextId("architect-dossier-contact") };
    sheet.setRules(architectDossierRules(sheet.selector));
    architectDossierRender(root, props, ids);
    attrs.set("data-pica-ready", "true");
    let destroyed = false;
    return {
      update(next) {
        if (destroyed) return;
        const before = props;
        props = { ...props, ...next };
        if (sameJson(before, props)) return;
        attrs.set("aria-label", props.label);
        architectDossierRender(root, props, ids);
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
  var instance = PicaArchitectDossier.mount(host, take(initial));
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
