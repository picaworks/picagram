# Article Lead

> The opening of an article: a dateline, the page's own headline and standfirst in a reading measure, and a ruled column of facts and key points.

Category: sections. Tags: article, essay, dateline, byline, standfirst, measure, key points, section. Static. Size: 3.3 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/article-lead.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `section` | string | `"ESSAY"` | The section name at the left of the dateline. Empty removes it. |
| `date` | string | `"2026-09-14"` | The publication date as an ISO date, such as 2026-09-14. It sets the time element's datetime. An empty or invalid date removes the date and the Published row. |
| `authors` | readonly ArticleLeadAuthor[] | `[{"name":"Mara Quill","role":"Editor"},{"name":"Jonas Reed","role":"Design"}]` | Who wrote the piece. At most four show. An empty list removes the Words by row. |
| `readingTime` | number | `8` | The reading time in minutes, from 0 to 60. Zero removes the Read time row. |
| `points` | readonly string[] | `["A line near sixty characters is the length a reader can hold without losing the next one.","Rhythm comes from one steady rule for spacing, repeated until the page stops asking to be noticed.","Restraint is a choice about what to leave out, made before the first word is set."]` | Up to three key points, each a sentence. An empty list removes the whole group. |
| `pointsLabel` | string | `"In brief"` | The label above the key points. |
| `label` | string | `"Article details"` | The accessible name of the aside that holds the facts and the key points. |
| `measure` | number | `62` | The width of the text column, in characters of the page's own font, from 48 to 80. |

## Children

Put content inside the component. It decorates that content and never changes it.

## Colors

Draws with `--pica-fg`, `--pica-muted`, `--pica-accent`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

// Pica · Article Lead · article-lead
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

// registry/sections/article-lead/core.ts
export interface ArticleLeadAuthor {
  /** The author's name, set in the page's own font. */
  name: string;
  /** What they did on the piece, set as a small mono label under the name. Empty shows no role. */
  role: string;
}

export interface ArticleLeadProps {
  /** The section name at the left of the dateline. Empty removes it. */
  section: string;
  /** The publication date as an ISO date, such as 2026-09-14. It sets the time element's datetime. An empty or invalid date removes the date and the Published row. */
  date: string;
  /** Who wrote the piece. At most four show. An empty list removes the Words by row. */
  authors: readonly ArticleLeadAuthor[];
  /** The reading time in minutes, from 0 to 60. Zero removes the Read time row. */
  readingTime: number;
  /** Up to three key points, each a sentence. An empty list removes the whole group. */
  points: readonly string[];
  /** The label above the key points. */
  pointsLabel: string;
  /** The accessible name of the aside that holds the facts and the key points. */
  label: string;
  /** The width of the text column, in characters of the page's own font, from 48 to 80. */
  measure: number;
}

export const defaults: ArticleLeadProps = {
  section: "ESSAY",
  date: "2026-09-14",
  authors: [
    { name: "Mara Quill", role: "Editor" },
    { name: "Jonas Reed", role: "Design" },
  ],
  readingTime: 8,
  points: [
    "A line near sixty characters is the length a reader can hold without losing the next one.",
    "Rhythm comes from one steady rule for spacing, repeated until the page stops asking to be noticed.",
    "Restraint is a choice about what to leave out, made before the first word is set.",
  ],
  pointsLabel: "In brief",
  label: "Article details",
  measure: 62,
};

const LEAD_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const LEAD_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

/** An ISO date as the machine-readable stamp and the text a reader sees. It is written by hand from fixed
 *  English tables, in UTC terms, because a locale would let the two generated shapes print different text.
 *  Anything that is not a real calendar day gives null. */
function leadDate(iso: string): { stamp: string; text: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof iso === "string" ? iso.trim() : "");
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const length = month === 2 && leap ? 29 : LEAD_DAYS[month - 1];
  const name = LEAD_MONTHS[month - 1];
  if (length === undefined || name === undefined || day < 1 || day > length) return null;
  return { stamp: `${m[1]}-${m[2]}-${m[3]}`, text: `${day} ${name} ${year}` };
}

/** The authors that can be shown: objects with a name, at most four. */
function leadAuthors(value: unknown): ArticleLeadAuthor[] {
  if (!Array.isArray(value)) return [];
  const out: ArticleLeadAuthor[] = [];
  for (const item of value as unknown[]) {
    if (typeof item !== "object" || item === null) continue;
    const { name, role } = item as { name?: unknown; role?: unknown };
    if (typeof name !== "string" || !name.trim()) continue;
    out.push({ name: name.trim(), role: typeof role === "string" ? role.trim() : "" });
  }
  return out.slice(0, 4);
}

/** The key points that can be shown: non-empty strings, at most three. */
function leadPoints(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value as unknown[]) {
    if (typeof item === "string" && item.trim()) out.push(item.trim());
  }
  return out.slice(0, 3);
}

/** The reading time as whole minutes from 0 to 60. */
function leadMinutes(value: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(Math.min(60, Math.max(0, value))) : 0;
}

/** The measure in characters, from 48 to 80. */
function leadMeasure(value: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(80, Math.max(48, value)) : 62;
}

/** One of the core's own nodes: marked, and named for its part so the scoped rules can find it. */
function part(name: string, tag: keyof HTMLElementTagNameMap = "div"): HTMLElement {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute("data-part", name);
  return node;
}

/** A text-bearing child of one of the core's own nodes. */
function bit(name: string, tag: keyof HTMLElementTagNameMap, text: string): HTMLElement {
  const node = part(name, tag);
  node.textContent = text;
  return node;
}

/** Layout for the host and the lead's grammar, from STYLE.md: hairline rules, square corners, prose in the
 *  page's own font, and mono only on labels and figures. The accent sets one short rule and the focus
 *  outline, never text. The host is a grid: the page's children take the first column, held to the measure, and the aside sits at the host's right content edge so both margins match, and
 *  below 720px the grid folds to one column in source order. The floor goes in a :where() rule, which
 *  carries no specificity, so a page that gives this host a height of its own wins. */
function rules(selector: string, measure: number, aside: boolean): string {
  const s = selector;
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const muted = cssVar("muted");
  const hairline = `color-mix(in srgb, ${fg} 26%, transparent)`;
  const label = `font-family:${GRID_FONT};font-size:0.75em;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;font-variant-numeric:tabular-nums;color:${muted}`;
  const columns = aside ? `minmax(0,${measure}ch) 15rem` : `minmax(0,${measure}ch)`;
  return [
    `:where(${s}){min-height:10rem}`,
    `${s}{box-sizing:border-box;display:grid;grid-template-columns:${columns};column-gap:clamp(2rem,5vw,4rem);row-gap:0;align-content:start;justify-content:space-between;color:${fg};padding:clamp(1.5rem,5vw,4rem);overflow-wrap:break-word}`,
    `${s} > :not([data-pica]){grid-column:1;min-width:0}`,
    `${s} > p:first-of-type:not([data-pica]){font-family:inherit;font-size:1.25em;line-height:1.5}`,
    `${s} [data-part="dateline"]{grid-column:1;margin:0 0 1.25rem;${label};color:${fg}}`,
    `${s} [data-part="dateline"]::before{content:"";display:block;width:2rem;height:2px;margin-bottom:0.9rem;background:${accent}}`,
    `${s} [data-part="date"]{color:${muted}}`,
    `${s} [data-part="section"] + [data-part="date"]{margin-left:0.9em;padding-left:0.9em;border-left:1px solid ${hairline}}`,
    `${s} [data-part="aside"]{grid-column:2;grid-row:1 / span 99;align-self:stretch;min-width:0;box-sizing:border-box;padding-left:1.5rem;border-left:1px solid ${hairline}}`,
    `${s} [data-part="facts"]{margin:0;padding:0}`,
    `${s} [data-part="fact"]{padding:0.9rem 0;border-bottom:1px solid ${hairline}}`,
    `${s} [data-part="fact"]:first-child{padding-top:0}`,
    `${s} [data-part="fact"] dt{margin:0 0 0.35rem;${label}}`,
    `${s} [data-part="fact"] dd{margin:0}`,
    `${s} [data-part="fact"] dd + dd{margin-top:0.85rem}`,
    `${s} [data-part="role"]{display:block;margin-top:0.3rem;${label}}`,
    `${s} [data-part="figure"]{font-family:${GRID_FONT};font-variant-numeric:tabular-nums;letter-spacing:0.04em;text-transform:uppercase}`,
    `${s} [data-part="points"]{padding:0.9rem 0 0}`,
    `${s} [data-part="points-label"]{margin:0 0 0.35rem;${label}}`,
    `${s} [data-part="list"]{margin:0;padding:0;list-style:none;counter-reset:pica-lead}`,
    `${s} [data-part="list"] li{counter-increment:pica-lead;display:grid;grid-template-columns:2em minmax(0,1fr);column-gap:0.5em;padding:0.75rem 0;line-height:1.4;border-top:1px solid ${hairline}}`,
    `${s} [data-part="list"] li:first-child{border-top:0;padding-top:0.5rem}`,
    `${s} [data-part="list"] li::before{content:counter(pica-lead, decimal-leading-zero);${label}}`,
    `${s}[data-pica-fit="min"]{grid-template-columns:minmax(0,1fr);padding:1.25rem}`,
    `${s}[data-pica-fit="min"] [data-part="aside"]{grid-column:1;grid-row:auto;margin-top:1.75rem;padding:1.25rem 0 0;border-left:0;border-top:1px solid ${hairline}}`,
    `${s} :is(a,button):focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${s} :is(button,input,select,textarea):disabled{opacity:0.45}`,
  ].join("\n");
}

export const mount: Mount<ArticleLeadProps> = (host, initial = {}) => {
  let props: ArticleLeadProps = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  const sheet = scope(host);

  const dateline = part("dateline");
  const section = part("section", "span");
  const when = part("date", "time");
  dateline.append(section, when);
  const aside = part("aside", "aside");
  host.prepend(dateline);
  host.append(aside);

  let shown = true;

  /** A fact row holding its term, ready for one or more values. */
  function row(term: string): HTMLElement {
    const fact = part("fact");
    fact.append(bit("term", "dt", term));
    return fact;
  }

  /** Writes the dateline: the section name and the date, each removed when empty. */
  function renderDateline(): void {
    const date = leadDate(props.date);
    section.textContent = props.section;
    section.style.display = props.section ? "" : "none";
    if (date) {
      when.textContent = date.text;
      when.setAttribute("datetime", date.stamp);
    } else {
      when.textContent = "";
      when.removeAttribute("datetime");
    }
    when.style.display = date ? "" : "none";
  }

  /** Rebuilds the aside from the props. A row or group with nothing to show is never created, and an aside
   *  with nothing at all is hidden and its column dropped, so the layout never keeps an empty frame. */
  function renderAside(): void {
    const date = leadDate(props.date);
    const authors = leadAuthors(props.authors);
    const minutes = leadMinutes(props.readingTime);
    const points = leadPoints(props.points);
    const facts = part("facts", "dl");
    if (authors.length > 0) {
      const fact = row("Words by");
      for (const author of authors) {
        const dd = part("author", "dd");
        dd.append(bit("name", "span", author.name));
        if (author.role) dd.append(bit("role", "span", author.role));
        fact.append(dd);
      }
      facts.append(fact);
    }
    if (date) {
      const fact = row("Published");
      fact.append(bit("published", "dd", date.text));
      facts.append(fact);
    }
    if (minutes > 0) {
      const fact = row("Read time");
      fact.append(bit("figure", "dd", `${minutes} min`));
      facts.append(fact);
    }
    const children: HTMLElement[] = [];
    if (facts.childElementCount > 0) children.push(facts);
    if (points.length > 0) {
      const group = part("points");
      const list = part("list", "ol");
      if (props.pointsLabel) {
        const id = nextId("pica-lead");
        const heading = bit("points-label", "p", props.pointsLabel);
        heading.id = id;
        list.setAttribute("aria-labelledby", id);
        group.append(heading);
      }
      for (const point of points) {
        const li = document.createElement("li");
        li.setAttribute("data-pica", "");
        li.textContent = point;
        list.append(li);
      }
      group.append(list);
      children.push(group);
    }
    aside.replaceChildren(...children);
    if (props.label) aside.setAttribute("aria-label", props.label);
    else aside.removeAttribute("aria-label");
    const has = children.length > 0;
    aside.style.display = has ? "" : "none";
    if (has !== shown) {
      shown = has;
      sheet.setRules(rules(sheet.selector, leadMeasure(props.measure), shown));
    }
  }

  /** Below 720px the grid folds to one column and the aside drops under the children. */
  function fit(): void {
    attrs.set("data-pica-fit", host.clientWidth < 720 ? "min" : null);
  }

  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(fit) : null;

  sheet.setRules(rules(sheet.selector, leadMeasure(props.measure), true));
  renderDateline();
  renderAside();
  fit();
  observer?.observe(host);
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.measure !== before.measure) sheet.setRules(rules(sheet.selector, leadMeasure(props.measure), shown));
      if (changed(before, props, ["section", "date"])) renderDateline();
      if (changed(before, props, ["date", "authors", "readingTime", "points", "pointsLabel", "label"])) renderAside();
    },
    destroy() {
      observer?.disconnect();
      dateline.remove();
      aside.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};

// registry/sections/article-lead/index.tsx
export type ArticleLeadComponentProps = Partial<ArticleLeadProps> & WrapperProps & { children?: ReactNode };

/** The opening of an article: a dateline, the page's own headline and standfirst in a reading measure, and a ruled column of facts and key points. */
export function ArticleLead({ className, style, palette, children, ...props }: ArticleLeadComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Article Lead · article-lead
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en" data-stage="flow">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Article Lead · Pica</title>
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
<div id="pica"><h1>Why a measure matters.</h1><p>Sixty characters is where a line stops being a guess and starts being a reading habit, and every other choice on the page answers to it.</p><p>The paragraphs below hold to the same width.</p></div>
<script>
"use strict";
var PicaArticleLead = (() => {
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

  // registry/sections/article-lead/core.ts
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
  function changed(before, after, keys) {
    return keys.some((key) => !sameJson(before[key], after[key]));
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

  // registry/sections/article-lead/core.ts
  var defaults = {
    section: "ESSAY",
    date: "2026-09-14",
    authors: [
      { name: "Mara Quill", role: "Editor" },
      { name: "Jonas Reed", role: "Design" }
    ],
    readingTime: 8,
    points: [
      "A line near sixty characters is the length a reader can hold without losing the next one.",
      "Rhythm comes from one steady rule for spacing, repeated until the page stops asking to be noticed.",
      "Restraint is a choice about what to leave out, made before the first word is set."
    ],
    pointsLabel: "In brief",
    label: "Article details",
    measure: 62
  };
  var LEAD_MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];
  var LEAD_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  function leadDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof iso === "string" ? iso.trim() : "");
    if (!m) return null;
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const length = month === 2 && leap ? 29 : LEAD_DAYS[month - 1];
    const name = LEAD_MONTHS[month - 1];
    if (length === void 0 || name === void 0 || day < 1 || day > length) return null;
    return { stamp: `${m[1]}-${m[2]}-${m[3]}`, text: `${day} ${name} ${year}` };
  }
  function leadAuthors(value) {
    if (!Array.isArray(value)) return [];
    const out = [];
    for (const item of value) {
      if (typeof item !== "object" || item === null) continue;
      const { name, role } = item;
      if (typeof name !== "string" || !name.trim()) continue;
      out.push({ name: name.trim(), role: typeof role === "string" ? role.trim() : "" });
    }
    return out.slice(0, 4);
  }
  function leadPoints(value) {
    if (!Array.isArray(value)) return [];
    const out = [];
    for (const item of value) {
      if (typeof item === "string" && item.trim()) out.push(item.trim());
    }
    return out.slice(0, 3);
  }
  function leadMinutes(value) {
    return typeof value === "number" && Number.isFinite(value) ? Math.round(Math.min(60, Math.max(0, value))) : 0;
  }
  function leadMeasure(value) {
    return typeof value === "number" && Number.isFinite(value) ? Math.min(80, Math.max(48, value)) : 62;
  }
  function part(name, tag = "div") {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    node.setAttribute("data-part", name);
    return node;
  }
  function bit(name, tag, text) {
    const node = part(name, tag);
    node.textContent = text;
    return node;
  }
  function rules(selector, measure, aside) {
    const s = selector;
    const fg = cssVar("fg");
    const accent = cssVar("accent");
    const muted = cssVar("muted");
    const hairline = `color-mix(in srgb, ${fg} 26%, transparent)`;
    const label = `font-family:${GRID_FONT};font-size:0.75em;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;font-variant-numeric:tabular-nums;color:${muted}`;
    const columns = aside ? `minmax(0,${measure}ch) 15rem` : `minmax(0,${measure}ch)`;
    return [
      `:where(${s}){min-height:10rem}`,
      `${s}{box-sizing:border-box;display:grid;grid-template-columns:${columns};column-gap:clamp(2rem,5vw,4rem);row-gap:0;align-content:start;justify-content:space-between;color:${fg};padding:clamp(1.5rem,5vw,4rem);overflow-wrap:break-word}`,
      `${s} > :not([data-pica]){grid-column:1;min-width:0}`,
      `${s} > p:first-of-type:not([data-pica]){font-family:inherit;font-size:1.25em;line-height:1.5}`,
      `${s} [data-part="dateline"]{grid-column:1;margin:0 0 1.25rem;${label};color:${fg}}`,
      `${s} [data-part="dateline"]::before{content:"";display:block;width:2rem;height:2px;margin-bottom:0.9rem;background:${accent}}`,
      `${s} [data-part="date"]{color:${muted}}`,
      `${s} [data-part="section"] + [data-part="date"]{margin-left:0.9em;padding-left:0.9em;border-left:1px solid ${hairline}}`,
      `${s} [data-part="aside"]{grid-column:2;grid-row:1 / span 99;align-self:stretch;min-width:0;box-sizing:border-box;padding-left:1.5rem;border-left:1px solid ${hairline}}`,
      `${s} [data-part="facts"]{margin:0;padding:0}`,
      `${s} [data-part="fact"]{padding:0.9rem 0;border-bottom:1px solid ${hairline}}`,
      `${s} [data-part="fact"]:first-child{padding-top:0}`,
      `${s} [data-part="fact"] dt{margin:0 0 0.35rem;${label}}`,
      `${s} [data-part="fact"] dd{margin:0}`,
      `${s} [data-part="fact"] dd + dd{margin-top:0.85rem}`,
      `${s} [data-part="role"]{display:block;margin-top:0.3rem;${label}}`,
      `${s} [data-part="figure"]{font-family:${GRID_FONT};font-variant-numeric:tabular-nums;letter-spacing:0.04em;text-transform:uppercase}`,
      `${s} [data-part="points"]{padding:0.9rem 0 0}`,
      `${s} [data-part="points-label"]{margin:0 0 0.35rem;${label}}`,
      `${s} [data-part="list"]{margin:0;padding:0;list-style:none;counter-reset:pica-lead}`,
      `${s} [data-part="list"] li{counter-increment:pica-lead;display:grid;grid-template-columns:2em minmax(0,1fr);column-gap:0.5em;padding:0.75rem 0;line-height:1.4;border-top:1px solid ${hairline}}`,
      `${s} [data-part="list"] li:first-child{border-top:0;padding-top:0.5rem}`,
      `${s} [data-part="list"] li::before{content:counter(pica-lead, decimal-leading-zero);${label}}`,
      `${s}[data-pica-fit="min"]{grid-template-columns:minmax(0,1fr);padding:1.25rem}`,
      `${s}[data-pica-fit="min"] [data-part="aside"]{grid-column:1;grid-row:auto;margin-top:1.75rem;padding:1.25rem 0 0;border-left:0;border-top:1px solid ${hairline}}`,
      `${s} :is(a,button):focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
      `${s} :is(button,input,select,textarea):disabled{opacity:0.45}`
    ].join("\n");
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    const attrs = hostAttributes(host);
    const sheet = scope(host);
    const dateline = part("dateline");
    const section = part("section", "span");
    const when = part("date", "time");
    dateline.append(section, when);
    const aside = part("aside", "aside");
    host.prepend(dateline);
    host.append(aside);
    let shown = true;
    function row(term) {
      const fact = part("fact");
      fact.append(bit("term", "dt", term));
      return fact;
    }
    function renderDateline() {
      const date = leadDate(props.date);
      section.textContent = props.section;
      section.style.display = props.section ? "" : "none";
      if (date) {
        when.textContent = date.text;
        when.setAttribute("datetime", date.stamp);
      } else {
        when.textContent = "";
        when.removeAttribute("datetime");
      }
      when.style.display = date ? "" : "none";
    }
    function renderAside() {
      const date = leadDate(props.date);
      const authors = leadAuthors(props.authors);
      const minutes = leadMinutes(props.readingTime);
      const points = leadPoints(props.points);
      const facts = part("facts", "dl");
      if (authors.length > 0) {
        const fact = row("Words by");
        for (const author of authors) {
          const dd = part("author", "dd");
          dd.append(bit("name", "span", author.name));
          if (author.role) dd.append(bit("role", "span", author.role));
          fact.append(dd);
        }
        facts.append(fact);
      }
      if (date) {
        const fact = row("Published");
        fact.append(bit("published", "dd", date.text));
        facts.append(fact);
      }
      if (minutes > 0) {
        const fact = row("Read time");
        fact.append(bit("figure", "dd", `${minutes} min`));
        facts.append(fact);
      }
      const children = [];
      if (facts.childElementCount > 0) children.push(facts);
      if (points.length > 0) {
        const group = part("points");
        const list = part("list", "ol");
        if (props.pointsLabel) {
          const id = nextId("pica-lead");
          const heading = bit("points-label", "p", props.pointsLabel);
          heading.id = id;
          list.setAttribute("aria-labelledby", id);
          group.append(heading);
        }
        for (const point of points) {
          const li = document.createElement("li");
          li.setAttribute("data-pica", "");
          li.textContent = point;
          list.append(li);
        }
        group.append(list);
        children.push(group);
      }
      aside.replaceChildren(...children);
      if (props.label) aside.setAttribute("aria-label", props.label);
      else aside.removeAttribute("aria-label");
      const has = children.length > 0;
      aside.style.display = has ? "" : "none";
      if (has !== shown) {
        shown = has;
        sheet.setRules(rules(sheet.selector, leadMeasure(props.measure), shown));
      }
    }
    function fit() {
      attrs.set("data-pica-fit", host.clientWidth < 720 ? "min" : null);
    }
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(fit) : null;
    sheet.setRules(rules(sheet.selector, leadMeasure(props.measure), true));
    renderDateline();
    renderAside();
    fit();
    observer?.observe(host);
    host.dataset.picaReady = "true";
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        if (props.measure !== before.measure) sheet.setRules(rules(sheet.selector, leadMeasure(props.measure), shown));
        if (changed(before, props, ["section", "date"])) renderDateline();
        if (changed(before, props, ["date", "authors", "readingTime", "points", "pointsLabel", "label"])) renderAside();
      },
      destroy() {
        observer?.disconnect();
        dateline.remove();
        aside.remove();
        sheet.destroy();
        attrs.restore();
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
  var instance = PicaArticleLead.mount(host, take(window.PICA_PROPS || {}));
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
