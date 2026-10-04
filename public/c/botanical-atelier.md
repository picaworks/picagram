# Botanical atelier

> A botanical portfolio arranged as an herbarium cabinet with original drawings, taxonomy, and field notes.

Category: sections. Tags: portfolio, one-page, botanical-atelier. Static. Size: 4.5 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/botanical-atelier.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | string | `"Botanical atelier portfolio"` | Accessible name for the atelier. |
| `studio` | string | `"Fieldwork / Botanical atelier"` | Atelier name. |
| `title` | string | `"A cabinet of quiet observations."` | Page title. |
| `intro` | string | `"Drawing plants as they are found. An independent practice in botanical illustration, patient observation, and the stories carried by ordinary leaves."` | Practice introduction. |
| `specimens` | readonly BotanicalSpecimen[] | `[{"name":"Olive","latin":"Olea europaea","family":"Oleaceae","form":"branch","location":"Liguria / 18 May 2026","note":"Silver undersides catch the afternoon light. Leaves grow in opposite pairs along the new branch."},{"name":"Wild chamomile","latin":"Matricaria chamomilla","family":"Asteraceae","form":"flower","location":"Meadow edge / 02 June 2026","note":"A hollow receptacle and fine divided foliage distinguish this small annual. Collected as a drawing, left growing."},{"name":"Common fern","latin":"Polypodium vulgare","family":"Polypodiaceae","form":"frond","location":"North wall / 09 June 2026","note":"The frond uncurls toward a narrow patch of light. Rounded sori form in two rows on its underside."}]` | Specimen records. |
| `method` | string | `"Every drawing begins outdoors with a pencil and a notebook. Measurements, growth habit, and small irregularities are recorded before the studio study. The finished line work keeps those observations visible rather than smoothing them away."` | Observation methods. |
| `contact` | string | `"Illustration commissions for books, gardens, cultural institutions, and thoughtful brands. Write to hello@fieldwork.example with your subject, format, and timing."` | Commission information. |

## Colors

Draws with `--pica-fg`, `--pica-bg`, `--pica-accent`, `--pica-muted`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Botanical atelier · botanical-atelier
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

// registry/sections/botanical-atelier/core.ts
export interface BotanicalSpecimen {
  /** Common plant name. */
  name: string;
  /** Scientific name. */
  latin: string;
  /** Botanical family. */
  family: string;
  /** Drawing morphology. */
  form: "branch" | "flower" | "frond";
  /** Place and date of observation. */
  location: string;
  /** Field annotation. */
  note: string;
}
export interface BotanicalAtelierProps {
  /** Accessible name for the atelier. */
  label: string;
  /** Atelier name. */
  studio: string;
  /** Page title. */
  title: string;
  /** Practice introduction. */
  intro: string;
  /** Specimen records. */
  specimens: readonly BotanicalSpecimen[];
  /** Observation methods. */
  method: string;
  /** Commission information. */
  contact: string;
}

export const defaults: BotanicalAtelierProps = {
  "label": "Botanical atelier portfolio",
  "studio": "Fieldwork / Botanical atelier",
  "title": "A cabinet of quiet observations.",
  "intro": "Drawing plants as they are found. An independent practice in botanical illustration, patient observation, and the stories carried by ordinary leaves.",
  "specimens": [
    {
      "name": "Olive",
      "latin": "Olea europaea",
      "family": "Oleaceae",
      "form": "branch",
      "location": "Liguria / 18 May 2026",
      "note": "Silver undersides catch the afternoon light. Leaves grow in opposite pairs along the new branch."
    },
    {
      "name": "Wild chamomile",
      "latin": "Matricaria chamomilla",
      "family": "Asteraceae",
      "form": "flower",
      "location": "Meadow edge / 02 June 2026",
      "note": "A hollow receptacle and fine divided foliage distinguish this small annual. Collected as a drawing, left growing."
    },
    {
      "name": "Common fern",
      "latin": "Polypodium vulgare",
      "family": "Polypodiaceae",
      "form": "frond",
      "location": "North wall / 09 June 2026",
      "note": "The frond uncurls toward a narrow patch of light. Rounded sori form in two rows on its underside."
    }
  ],
  "method": "Every drawing begins outdoors with a pencil and a notebook. Measurements, growth habit, and small irregularities are recorded before the studio study. The finished line work keeps those observations visible rather than smoothing them away.",
  "contact": "Illustration commissions for books, gardens, cultural institutions, and thoughtful brands. Write to hello@fieldwork.example with your subject, format, and timing."
};

function botanicalAtelierEl<K extends keyof HTMLElementTagNameMap>(tag: K, text = "", mark = ""): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  if (mark) el.setAttribute(`data-pica-${mark}`, "");
  if (text) el.textContent = text;
  return el;
}
function botanicalAtelierLink(text: string, target: string): HTMLAnchorElement {
  const el = botanicalAtelierEl("a", text);
  el.href = `#${target}`;
  return el;
}
function botanicalAtelierLabel(text: string): HTMLElement { return botanicalAtelierEl("p", text, "label"); }
function botanicalAtelierSection(id: string): HTMLElement {
  const el = botanicalAtelierEl("section", "", "section");
  el.id = id;
  return el;
}
function botanicalAtelierSvg(viewBox: string, paths: readonly string[]): SVGSVGElement {
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


function botanicalAtelierRules(s: string): string {
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

${s} [data-pica-page] [data-pica-botanical-lead]{display:grid;grid-template-columns:1.5fr 1fr;gap:24px 60px;align-items:end;margin:42px 0}
${s} [data-pica-page] [data-pica-botanical-lead]>:first-child{grid-column:span 2}
${s} [data-pica-page] [data-pica-botanical-lead] h1{font-family:var(--pica-font-serif,Georgia,serif);font-size:clamp(45px,5.7vw,78px);letter-spacing:-.035em;max-width:14ch}
${s} [data-pica-page] [data-pica-botanical-cabinet]{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid ${fg};border-bottom:1px solid ${fg}}
${s} [data-pica-page] [data-pica-botanical-sheet]{padding:22px 28px 18px;border-right:1px solid ${muted}}
${s} [data-pica-page] [data-pica-botanical-sheet]:last-child{border-right:0}
${s} [data-pica-page] [data-pica-botanical-top]{display:flex;justify-content:space-between;gap:10px}
${s} [data-pica-page] [data-pica-botanical-sheet] svg{height:320px;max-height:34vw;margin:20px 0;stroke-width:1.15}
${s} [data-pica-page] [data-pica-botanical-taxonomy] h2{font-family:var(--pica-font-serif,Georgia,serif);font-size:29px;margin-bottom:7px}
${s} [data-pica-page] [data-pica-botanical-latin]{font-family:var(--pica-font-serif,Georgia,serif);font-style:italic;font-size:17px;margin-bottom:17px}
${s} [data-pica-page] [data-pica-botanical-sheet] details{margin-top:18px}
${s} [data-pica-page] [data-pica-botanical-method]{display:grid;grid-template-columns:1fr 1fr;gap:28px 70px;padding-top:44px}
${s} [data-pica-page] [data-pica-botanical-method]>:first-child{grid-column:span 2}
${s} [data-pica-page] [data-pica-botanical-method] h2{font-family:var(--pica-font-serif,Georgia,serif);font-size:clamp(36px,4.5vw,60px);white-space:pre-line}
@media(max-width:800px){${s} [data-pica-page] [data-pica-botanical-sheet]{padding:20px 15px}${s} [data-pica-page] [data-pica-botanical-top]{flex-direction:column;gap:0}${s} [data-pica-page] [data-pica-botanical-lead]{gap:24px}}
@media(max-width:600px){${s} [data-pica-page] [data-pica-botanical-lead],${s} [data-pica-page] [data-pica-botanical-method]{grid-template-columns:1fr}${s} [data-pica-page] [data-pica-botanical-lead]>:first-child,${s} [data-pica-page] [data-pica-botanical-method]>:first-child{grid-column:auto}${s} [data-pica-page] [data-pica-botanical-cabinet]{grid-template-columns:1fr}${s} [data-pica-page] [data-pica-botanical-sheet]{border-right:0;border-bottom:1px solid ${muted};padding:22px 0}${s} [data-pica-page] [data-pica-botanical-sheet]:last-child{border-bottom:0}${s} [data-pica-page] [data-pica-botanical-sheet] svg{height:300px;max-height:none}${s} [data-pica-page] [data-pica-botanical-top]{flex-direction:row}}
`;
}

function botanicalAtelierRender(root: HTMLElement, p: BotanicalAtelierProps, ids: Record<string, string>): void {
  root.replaceChildren();

  const header = botanicalAtelierEl("header", "", "header"); header.append(botanicalAtelierLabel(p.studio)); const nav = botanicalAtelierEl("nav", "", "nav"); nav.setAttribute("aria-label", "Atelier navigation"); nav.append(botanicalAtelierLink("Cabinet", ids.cabinet!), botanicalAtelierLink("Method", ids.method!), botanicalAtelierLink("Commission", ids.contact!)); header.append(nav); root.append(header);
  const lead = botanicalAtelierEl("div", "", "botanical-lead"); lead.append(botanicalAtelierLabel("Herbarium / Volume 01"), botanicalAtelierEl("h1", p.title, "accent"), botanicalAtelierEl("p", p.intro, "body")); root.append(lead);
  const cabinet = botanicalAtelierSection(ids.cabinet!); cabinet.setAttribute("data-pica-botanical-cabinet", "");
  p.specimens.forEach((plant, i) => {
    const card = botanicalAtelierEl("article", "", "botanical-sheet"); const top = botanicalAtelierEl("div", "", "botanical-top"); top.append(botanicalAtelierLabel(`Sheet ${String(i + 1).padStart(3, "0")}`), botanicalAtelierLabel(plant.family)); card.append(top);
    const paths = plant.form === "frond" ? ["M120 280Q116 174 121 45", "M120 65Q94 53 96 38Q111 38 120 65 M120 65Q144 52 145 39Q129 39 120 65", "M120 85Q82 75 77 57Q105 58 120 85 M120 85Q157 75 163 56Q135 58 120 85", "M120 109Q70 93 58 75Q100 80 120 109 M120 109Q166 97 180 73Q141 80 120 109", "M120 136Q60 117 42 94Q99 107 120 136 M120 136Q179 117 196 94Q139 107 120 136", "M119 165Q63 150 39 123Q100 135 119 165 M119 165Q177 149 201 123Q141 135 119 165", "M119 194Q65 180 42 151Q102 165 119 194 M119 194Q175 181 198 151Q139 165 119 194", "M119 224Q72 214 48 183Q100 191 119 224 M119 224Q166 213 193 183Q143 192 119 224", "M119 247Q78 239 58 213Q105 224 119 247 M119 247Q159 239 182 213Q136 224 119 247"] : plant.form === "flower" ? ["M118 286Q130 192 119 96 M129 224Q84 218 60 189 M126 196Q172 194 185 162 M122 164Q84 146 83 119", "M119 71C95 63 104 48 117 60C104 32 126 32 123 58C143 38 155 55 134 67C164 65 157 86 135 79C150 100 128 110 125 87C111 111 94 95 111 82C80 86 83 64 109 73", "M112 69Q121 59 132 70Q137 80 126 86Q113 87 112 69", "M84 215L79 194 M96 219L98 198 M108 221L108 239 M72 203L68 184 M147 191L148 172 M159 184L170 185 M171 177L172 158", "M83 142L72 132 M91 150L92 129 M106 157L112 144"] : ["M104 280Q129 158 125 55 M113 225Q73 182 65 145 M119 176Q164 136 178 95", "M121 96Q81 81 79 54Q113 58 121 96 M124 120Q165 109 170 82Q133 86 124 120", "M116 152Q76 138 75 109Q109 115 116 152 M113 187Q156 182 163 154Q129 153 113 187", "M95 203Q61 213 44 190Q73 175 95 203 M81 178Q49 174 45 145Q72 149 81 178", "M143 151Q148 116 176 111Q179 138 143 151 M160 128Q165 90 188 79Q195 107 160 128", "M123 96L86 62 M124 120L162 90 M116 152L82 117 M113 187L155 162 M95 203L51 190"];
    card.append(botanicalAtelierSvg("0 0 240 310", paths)); const tax = botanicalAtelierEl("div", "", "botanical-taxonomy"); tax.append(botanicalAtelierEl("h2", plant.name), botanicalAtelierEl("p", plant.latin, "botanical-latin"), botanicalAtelierLabel(plant.location)); card.append(tax);
    const detail = botanicalAtelierEl("details"); detail.append(botanicalAtelierEl("summary", "Field annotation"), botanicalAtelierEl("p", plant.note)); card.append(detail); cabinet.append(card);
  }); root.append(cabinet);
  const method = botanicalAtelierSection(ids.method!); method.setAttribute("data-pica-botanical-method", ""); method.append(botanicalAtelierLabel("Practice / Observation before invention"), botanicalAtelierEl("h2", "Look closely.\nLeave things growing."), botanicalAtelierEl("p", p.method, "body")); root.append(method);
  const footer = botanicalAtelierEl("footer", "", "footer"); footer.id = ids.contact!; footer.append(botanicalAtelierEl("h2", "A drawing begins with attention."), botanicalAtelierEl("p", p.contact)); root.append(footer);

}

export const mount: Mount<BotanicalAtelierProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  attrs.set("data-pica-id", host.getAttribute("data-pica-id"));
  attrs.set("role", "region");
  attrs.set("aria-label", props.label);
  const sheet = scope(host);
  const root = botanicalAtelierEl("div", "", "page");
  host.append(root);
  const ids: Record<string, string> = { cabinet: nextId("botanical-atelier-cabinet"), method: nextId("botanical-atelier-method"), contact: nextId("botanical-atelier-contact") };
  sheet.setRules(botanicalAtelierRules(sheet.selector));
  botanicalAtelierRender(root, props, ids);
  attrs.set("data-pica-ready", "true");
  let destroyed = false;
  return {
    update(next) {
      if (destroyed) return;
      const before = props;
      props = { ...props, ...next };
      if (sameJson(before, props)) return;
      attrs.set("aria-label", props.label);
      botanicalAtelierRender(root, props, ids);
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

// registry/sections/botanical-atelier/index.tsx
export type BotanicalAtelierComponentProps = Partial<BotanicalAtelierProps> & WrapperProps;

/** A botanical portfolio arranged as an herbarium cabinet with original drawings, taxonomy, and field notes. */
export function BotanicalAtelier({ className, style, palette, ...props }: BotanicalAtelierComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Botanical atelier · botanical-atelier
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en" data-stage="flow">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Botanical atelier · Pica</title>
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
var PicaBotanicalAtelier = (() => {
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

  // registry/sections/botanical-atelier/core.ts
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

  // registry/sections/botanical-atelier/core.ts
  var defaults = {
    "label": "Botanical atelier portfolio",
    "studio": "Fieldwork / Botanical atelier",
    "title": "A cabinet of quiet observations.",
    "intro": "Drawing plants as they are found. An independent practice in botanical illustration, patient observation, and the stories carried by ordinary leaves.",
    "specimens": [
      {
        "name": "Olive",
        "latin": "Olea europaea",
        "family": "Oleaceae",
        "form": "branch",
        "location": "Liguria / 18 May 2026",
        "note": "Silver undersides catch the afternoon light. Leaves grow in opposite pairs along the new branch."
      },
      {
        "name": "Wild chamomile",
        "latin": "Matricaria chamomilla",
        "family": "Asteraceae",
        "form": "flower",
        "location": "Meadow edge / 02 June 2026",
        "note": "A hollow receptacle and fine divided foliage distinguish this small annual. Collected as a drawing, left growing."
      },
      {
        "name": "Common fern",
        "latin": "Polypodium vulgare",
        "family": "Polypodiaceae",
        "form": "frond",
        "location": "North wall / 09 June 2026",
        "note": "The frond uncurls toward a narrow patch of light. Rounded sori form in two rows on its underside."
      }
    ],
    "method": "Every drawing begins outdoors with a pencil and a notebook. Measurements, growth habit, and small irregularities are recorded before the studio study. The finished line work keeps those observations visible rather than smoothing them away.",
    "contact": "Illustration commissions for books, gardens, cultural institutions, and thoughtful brands. Write to hello@fieldwork.example with your subject, format, and timing."
  };
  function botanicalAtelierEl(tag, text = "", mark = "") {
    const el = document.createElement(tag);
    el.setAttribute("data-pica", "");
    if (mark) el.setAttribute(`data-pica-${mark}`, "");
    if (text) el.textContent = text;
    return el;
  }
  function botanicalAtelierLink(text, target) {
    const el = botanicalAtelierEl("a", text);
    el.href = `#${target}`;
    return el;
  }
  function botanicalAtelierLabel(text) {
    return botanicalAtelierEl("p", text, "label");
  }
  function botanicalAtelierSection(id) {
    const el = botanicalAtelierEl("section", "", "section");
    el.id = id;
    return el;
  }
  function botanicalAtelierSvg(viewBox, paths) {
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
  function botanicalAtelierRules(s) {
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

${s} [data-pica-page] [data-pica-botanical-lead]{display:grid;grid-template-columns:1.5fr 1fr;gap:24px 60px;align-items:end;margin:42px 0}
${s} [data-pica-page] [data-pica-botanical-lead]>:first-child{grid-column:span 2}
${s} [data-pica-page] [data-pica-botanical-lead] h1{font-family:var(--pica-font-serif,Georgia,serif);font-size:clamp(45px,5.7vw,78px);letter-spacing:-.035em;max-width:14ch}
${s} [data-pica-page] [data-pica-botanical-cabinet]{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid ${fg};border-bottom:1px solid ${fg}}
${s} [data-pica-page] [data-pica-botanical-sheet]{padding:22px 28px 18px;border-right:1px solid ${muted}}
${s} [data-pica-page] [data-pica-botanical-sheet]:last-child{border-right:0}
${s} [data-pica-page] [data-pica-botanical-top]{display:flex;justify-content:space-between;gap:10px}
${s} [data-pica-page] [data-pica-botanical-sheet] svg{height:320px;max-height:34vw;margin:20px 0;stroke-width:1.15}
${s} [data-pica-page] [data-pica-botanical-taxonomy] h2{font-family:var(--pica-font-serif,Georgia,serif);font-size:29px;margin-bottom:7px}
${s} [data-pica-page] [data-pica-botanical-latin]{font-family:var(--pica-font-serif,Georgia,serif);font-style:italic;font-size:17px;margin-bottom:17px}
${s} [data-pica-page] [data-pica-botanical-sheet] details{margin-top:18px}
${s} [data-pica-page] [data-pica-botanical-method]{display:grid;grid-template-columns:1fr 1fr;gap:28px 70px;padding-top:44px}
${s} [data-pica-page] [data-pica-botanical-method]>:first-child{grid-column:span 2}
${s} [data-pica-page] [data-pica-botanical-method] h2{font-family:var(--pica-font-serif,Georgia,serif);font-size:clamp(36px,4.5vw,60px);white-space:pre-line}
@media(max-width:800px){${s} [data-pica-page] [data-pica-botanical-sheet]{padding:20px 15px}${s} [data-pica-page] [data-pica-botanical-top]{flex-direction:column;gap:0}${s} [data-pica-page] [data-pica-botanical-lead]{gap:24px}}
@media(max-width:600px){${s} [data-pica-page] [data-pica-botanical-lead],${s} [data-pica-page] [data-pica-botanical-method]{grid-template-columns:1fr}${s} [data-pica-page] [data-pica-botanical-lead]>:first-child,${s} [data-pica-page] [data-pica-botanical-method]>:first-child{grid-column:auto}${s} [data-pica-page] [data-pica-botanical-cabinet]{grid-template-columns:1fr}${s} [data-pica-page] [data-pica-botanical-sheet]{border-right:0;border-bottom:1px solid ${muted};padding:22px 0}${s} [data-pica-page] [data-pica-botanical-sheet]:last-child{border-bottom:0}${s} [data-pica-page] [data-pica-botanical-sheet] svg{height:300px;max-height:none}${s} [data-pica-page] [data-pica-botanical-top]{flex-direction:row}}
`;
  }
  function botanicalAtelierRender(root, p, ids) {
    root.replaceChildren();
    const header = botanicalAtelierEl("header", "", "header");
    header.append(botanicalAtelierLabel(p.studio));
    const nav = botanicalAtelierEl("nav", "", "nav");
    nav.setAttribute("aria-label", "Atelier navigation");
    nav.append(botanicalAtelierLink("Cabinet", ids.cabinet), botanicalAtelierLink("Method", ids.method), botanicalAtelierLink("Commission", ids.contact));
    header.append(nav);
    root.append(header);
    const lead = botanicalAtelierEl("div", "", "botanical-lead");
    lead.append(botanicalAtelierLabel("Herbarium / Volume 01"), botanicalAtelierEl("h1", p.title, "accent"), botanicalAtelierEl("p", p.intro, "body"));
    root.append(lead);
    const cabinet = botanicalAtelierSection(ids.cabinet);
    cabinet.setAttribute("data-pica-botanical-cabinet", "");
    p.specimens.forEach((plant, i) => {
      const card = botanicalAtelierEl("article", "", "botanical-sheet");
      const top = botanicalAtelierEl("div", "", "botanical-top");
      top.append(botanicalAtelierLabel(`Sheet ${String(i + 1).padStart(3, "0")}`), botanicalAtelierLabel(plant.family));
      card.append(top);
      const paths = plant.form === "frond" ? ["M120 280Q116 174 121 45", "M120 65Q94 53 96 38Q111 38 120 65 M120 65Q144 52 145 39Q129 39 120 65", "M120 85Q82 75 77 57Q105 58 120 85 M120 85Q157 75 163 56Q135 58 120 85", "M120 109Q70 93 58 75Q100 80 120 109 M120 109Q166 97 180 73Q141 80 120 109", "M120 136Q60 117 42 94Q99 107 120 136 M120 136Q179 117 196 94Q139 107 120 136", "M119 165Q63 150 39 123Q100 135 119 165 M119 165Q177 149 201 123Q141 135 119 165", "M119 194Q65 180 42 151Q102 165 119 194 M119 194Q175 181 198 151Q139 165 119 194", "M119 224Q72 214 48 183Q100 191 119 224 M119 224Q166 213 193 183Q143 192 119 224", "M119 247Q78 239 58 213Q105 224 119 247 M119 247Q159 239 182 213Q136 224 119 247"] : plant.form === "flower" ? ["M118 286Q130 192 119 96 M129 224Q84 218 60 189 M126 196Q172 194 185 162 M122 164Q84 146 83 119", "M119 71C95 63 104 48 117 60C104 32 126 32 123 58C143 38 155 55 134 67C164 65 157 86 135 79C150 100 128 110 125 87C111 111 94 95 111 82C80 86 83 64 109 73", "M112 69Q121 59 132 70Q137 80 126 86Q113 87 112 69", "M84 215L79 194 M96 219L98 198 M108 221L108 239 M72 203L68 184 M147 191L148 172 M159 184L170 185 M171 177L172 158", "M83 142L72 132 M91 150L92 129 M106 157L112 144"] : ["M104 280Q129 158 125 55 M113 225Q73 182 65 145 M119 176Q164 136 178 95", "M121 96Q81 81 79 54Q113 58 121 96 M124 120Q165 109 170 82Q133 86 124 120", "M116 152Q76 138 75 109Q109 115 116 152 M113 187Q156 182 163 154Q129 153 113 187", "M95 203Q61 213 44 190Q73 175 95 203 M81 178Q49 174 45 145Q72 149 81 178", "M143 151Q148 116 176 111Q179 138 143 151 M160 128Q165 90 188 79Q195 107 160 128", "M123 96L86 62 M124 120L162 90 M116 152L82 117 M113 187L155 162 M95 203L51 190"];
      card.append(botanicalAtelierSvg("0 0 240 310", paths));
      const tax = botanicalAtelierEl("div", "", "botanical-taxonomy");
      tax.append(botanicalAtelierEl("h2", plant.name), botanicalAtelierEl("p", plant.latin, "botanical-latin"), botanicalAtelierLabel(plant.location));
      card.append(tax);
      const detail = botanicalAtelierEl("details");
      detail.append(botanicalAtelierEl("summary", "Field annotation"), botanicalAtelierEl("p", plant.note));
      card.append(detail);
      cabinet.append(card);
    });
    root.append(cabinet);
    const method = botanicalAtelierSection(ids.method);
    method.setAttribute("data-pica-botanical-method", "");
    method.append(botanicalAtelierLabel("Practice / Observation before invention"), botanicalAtelierEl("h2", "Look closely.\nLeave things growing."), botanicalAtelierEl("p", p.method, "body"));
    root.append(method);
    const footer = botanicalAtelierEl("footer", "", "footer");
    footer.id = ids.contact;
    footer.append(botanicalAtelierEl("h2", "A drawing begins with attention."), botanicalAtelierEl("p", p.contact));
    root.append(footer);
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    const attrs = hostAttributes(host);
    attrs.set("data-pica-id", host.getAttribute("data-pica-id"));
    attrs.set("role", "region");
    attrs.set("aria-label", props.label);
    const sheet = scope(host);
    const root = botanicalAtelierEl("div", "", "page");
    host.append(root);
    const ids = { cabinet: nextId("botanical-atelier-cabinet"), method: nextId("botanical-atelier-method"), contact: nextId("botanical-atelier-contact") };
    sheet.setRules(botanicalAtelierRules(sheet.selector));
    botanicalAtelierRender(root, props, ids);
    attrs.set("data-pica-ready", "true");
    let destroyed = false;
    return {
      update(next) {
        if (destroyed) return;
        const before = props;
        props = { ...props, ...next };
        if (sameJson(before, props)) return;
        attrs.set("aria-label", props.label);
        botanicalAtelierRender(root, props, ids);
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
  var instance = PicaBotanicalAtelier.mount(host, take(initial));
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
