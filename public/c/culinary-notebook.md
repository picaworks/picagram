# Culinary notebook

> A cookbook recipe spread with an original still-life drawing, ingredient weights, timed methods, and practical kitchen notes.

Category: sections. Tags: cooking, recipe, notebook, food. Static. Size: 4.6 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/culinary-notebook.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `author` | string | `"The small table / Kitchen notebook"` | Notebook author. |
| `title` | string | `"Roasted squash, white beans & sage"` | Recipe title. |
| `edition` | string | `"Recipe 014 · Early autumn"` | Recipe number and season. |
| `yield` | string | `"Serves 4 / 20 min preparation / 40 min cooking"` | Yield and timing summary. |
| `introduction` | string | `"A tray of squash becomes a meal with warm beans and a sharp cider dressing. Keep the roasting juices: they are the beginning of the sauce."` | Recipe introduction. |
| `ingredients` | readonly RecipeIngredient[] | `[{"quantity":"900 g","name":"Winter squash","preparation":"Seeds removed, cut into 3 cm wedges"},{"quantity":"500 g","name":"Cooked white beans","preparation":"Drained, cooking liquid reserved"},{"quantity":"3 tbsp","name":"Olive oil","preparation":"Divided between tray and dressing"},{"quantity":"12","name":"Sage leaves","preparation":"Whole, stems removed"},{"quantity":"2 tbsp","name":"Cider vinegar","preparation":"Plus more to taste"},{"quantity":"1 tsp","name":"Wholegrain mustard","preparation":"For the dressing"},{"quantity":"40 g","name":"Toasted hazelnuts","preparation":"Roughly crushed"}]` | Ingredient ledger. |
| `method` | readonly RecipeMethod[] | `[{"title":"Give the squash some room","time":"35—40 min","instruction":"Heat the oven to 210°C. Toss the wedges with two tablespoons of oil and a generous pinch of salt. Spread in one layer, cut sides down. Roast until the edges brown and a knife meets no resistance."},{"title":"Warm, without boiling","time":"8 min","instruction":"Put the beans in a shallow pan with four tablespoons of their cooking liquid. Add the sage and warm gently. Stir once or twice, keeping the beans whole. Add a spoon of water if the pan begins to dry."},{"title":"Make the tray dressing","time":"3 min","instruction":"Lift the squash onto a warm plate. Pour the vinegar onto the roasting tray and scrape up the browned juices. Whisk in the mustard and remaining oil. Taste before adding salt."},{"title":"Bring everything to the table","time":"2 min","instruction":"Spoon the beans around the squash and dress while warm. Scatter over the hazelnuts. Serve in the middle of the table with bread to collect the last of the sauce."}]` | Cooking method. |
| `note` | string | `"Butter beans work equally well. For a nut-free version, use toasted pumpkin seeds. Leftovers keep for two days in a covered container in the refrigerator; warm gently with a splash of water before serving."` | Serving and substitution note. |

## Colors

Draws with `--pica-fg`, `--pica-bg`, `--pica-accent`, `--pica-muted`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Culinary notebook · culinary-notebook
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

// lib/font.ts
/** The monospace stack glyph components default to. It lives in its own module, so a text component that
 *  never draws a grid does not carry lib/glyph-grid.ts into its single React file just for the font. */
const GRID_FONT = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

// registry/sections/culinary-notebook/core.ts
export interface RecipeIngredient {
 /** Ingredient weight or quantity. */
 quantity: string;
 /** Ingredient name. */
 name: string;
 /** Preparation instruction. */
 preparation: string;
}
export interface RecipeMethod {
 /** Step title. */
 title: string;
 /** Step instruction. */
 instruction: string;
 /** Step timing. */
 time: string;
}
export interface CulinaryNotebookProps {
 /** Notebook author. */
 author: string;
 /** Recipe title. */
 title: string;
 /** Recipe number and season. */
 edition: string;
 /** Recipe introduction. */
 introduction: string;
 /** Yield and timing summary. */
 yield: string;
 /** Ingredient ledger. */
 ingredients: readonly RecipeIngredient[];
 /** Cooking method. */
 method: readonly RecipeMethod[];
 /** Serving and substitution note. */
 note: string;
}
export const defaults: CulinaryNotebookProps = {
 author:"The small table / Kitchen notebook",title:"Roasted squash, white beans & sage",edition:"Recipe 014 · Early autumn",yield:"Serves 4 / 20 min preparation / 40 min cooking",
 introduction:"A tray of squash becomes a meal with warm beans and a sharp cider dressing. Keep the roasting juices: they are the beginning of the sauce.",
 ingredients:[
 {quantity:"900 g",name:"Winter squash",preparation:"Seeds removed, cut into 3 cm wedges"},
 {quantity:"500 g",name:"Cooked white beans",preparation:"Drained, cooking liquid reserved"},
 {quantity:"3 tbsp",name:"Olive oil",preparation:"Divided between tray and dressing"},
 {quantity:"12",name:"Sage leaves",preparation:"Whole, stems removed"},
 {quantity:"2 tbsp",name:"Cider vinegar",preparation:"Plus more to taste"},
 {quantity:"1 tsp",name:"Wholegrain mustard",preparation:"For the dressing"},
 {quantity:"40 g",name:"Toasted hazelnuts",preparation:"Roughly crushed"},
 ],
 method:[
 {title:"Give the squash some room",time:"35—40 min",instruction:"Heat the oven to 210°C. Toss the wedges with two tablespoons of oil and a generous pinch of salt. Spread in one layer, cut sides down. Roast until the edges brown and a knife meets no resistance."},
 {title:"Warm, without boiling",time:"8 min",instruction:"Put the beans in a shallow pan with four tablespoons of their cooking liquid. Add the sage and warm gently. Stir once or twice, keeping the beans whole. Add a spoon of water if the pan begins to dry."},
 {title:"Make the tray dressing",time:"3 min",instruction:"Lift the squash onto a warm plate. Pour the vinegar onto the roasting tray and scrape up the browned juices. Whisk in the mustard and remaining oil. Taste before adding salt."},
 {title:"Bring everything to the table",time:"2 min",instruction:"Spoon the beans around the squash and dress while warm. Scatter over the hazelnuts. Serve in the middle of the table with bread to collect the last of the sauce."},
 ],
 note:"Butter beans work equally well. For a nut-free version, use toasted pumpkin seeds. Leftovers keep for two days in a covered container in the refrigerator; warm gently with a splash of water before serving.",
};
function studioNode<K extends keyof HTMLElementTagNameMap>(tag: K, parent: Element, text = "", role = ""): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  if (role) node.setAttribute("data-role", role);
  if (text) node.textContent = text;
  parent.append(node);
  return node;
}
function studioSvg(parent: Element, viewBox: string): SVGSVGElement {
  const node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  node.setAttribute("data-pica", "");
  node.setAttribute("viewBox", viewBox);
  node.setAttribute("aria-hidden", "true");
  node.setAttribute("focusable", "false");
  parent.append(node);
  return node;
}
function studioMark(parent: Element, tag: string, attributes: Record<string, string>): SVGElement {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  node.setAttribute("data-pica", "");
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  parent.append(node);
  return node;
}
function studioLink(parent: Element, label: string, id: string): void {
  const link = studioNode("a", parent, label);
  link.href = `#${id}`;
}
function studioSection(parent: Element, title: string, id: string, role: string): HTMLElement {
  const section = studioNode("section", parent, "", role);
  section.id = id;
  studioNode("h2", section, title);
  return section;
}
function studioRules(s: string): string {
  const fg = cssVar("fg"), bg = cssVar("bg"), muted = cssVar("muted"), accent = cssVar("accent");
  return `
  ${s}{color:${fg};background:${bg};font:inherit;position:relative;box-sizing:border-box}
  ${s} [data-role="page"]{max-width:1440px;margin:auto;padding:clamp(20px,4vw,56px);box-sizing:border-box}
  ${s} [data-role="page"] *{box-sizing:border-box;min-width:0}
  ${s} h1,${s} h2,${s} h3,${s} p,${s} figure{margin:0}
  ${s} h1{font-family:var(--pica-font-wide,inherit);font-weight:500;line-height:.96;letter-spacing:-.055em;font-size:clamp(46px,7vw,104px)}
  ${s} h2{font-weight:500;font-size:clamp(22px,3vw,36px);line-height:1.12;letter-spacing:-.025em}
  ${s} h3{font-size:20px;font-weight:500;line-height:1.2}
  ${s} p{line-height:1.55;max-width:62ch}
  ${s} [data-role="label"],${s} figcaption,${s} th,${s} td,${s} [data-role="number"]{font-family:${GRID_FONT};font-size:11px;line-height:1.5;letter-spacing:.03em}
  ${s} [data-role="label"]{text-transform:uppercase}
  ${s} [data-role="muted"]{color:${muted}}
  ${s} nav{display:flex;gap:20px;flex-wrap:wrap;font-size:12px}
  ${s} a{color:inherit;text-underline-offset:5px;text-decoration-thickness:1px}
  ${s} a:focus-visible,${s} button:focus-visible{outline:2px solid ${accent};outline-offset:5px}
  ${s} button{font:inherit;color:inherit;background:transparent;border:1px solid ${fg};border-radius:0;cursor:pointer}
  ${s} svg{display:block;width:100%;height:auto;color:${fg};fill:none;stroke:currentColor;stroke-width:1;vector-effect:non-scaling-stroke}
  ${s} [data-role="accent"]{color:${accent}}
  ${s} [data-role="top"]>p{color:${muted}}
  ${s} [data-role="top"]{display:flex;justify-content:space-between;gap:24px;align-items:start;padding-bottom:24px;border-bottom:1px solid ${fg}}
  ${s} [data-role="foot"]{display:flex;justify-content:space-between;gap:24px;margin-top:48px;padding-top:18px;border-top:1px solid ${fg};font-size:12px}
  ${s} section{scroll-margin-top:24px}
  @media(max-width:600px){${s} [data-role="top"],${s} [data-role="foot"]{flex-direction:column;gap:14px}${s} h1{font-size:52px}${s} nav{gap:16px}}
  `;
}


function culinaryStillLife(parent: Element): void {
 const s=studioSvg(parent,"0 0 500 340");
 studioMark(s,"ellipse",{cx:"248",cy:"260",rx:"203",ry:"52","stroke-opacity":".4"});studioMark(s,"ellipse",{cx:"248",cy:"256",rx:"168",ry:"35","stroke-opacity":".3"});
 studioMark(s,"path",{d:"M 114 193 C 74 129 105 75 167 71 C 224 67 240 132 210 191 C 190 225 140 231 114 193 Z","stroke-width":"2"});
 for(let i=0;i<7;i++)studioMark(s,"path",{d:`M ${147+i*5} 80 C ${105+i*15} 119 ${111+i*12} 179 ${153+i*5} 213`,"stroke-opacity":".4"});
 studioMark(s,"path",{d:"M 155 72 L 148 47 L 161 40 L 172 68 M 230 226 L 291 124 Q 344 164 353 238 Q 285 254 230 226 Z","stroke-width":"2"});
 studioMark(s,"path",{d:"M 246 222 L 293 145 Q 328 178 338 225 Z","stroke-opacity":".5"});
 for(let i=0;i<12;i++){const x=282+(i%4)*11,y=168+Math.floor(i/4)*16;studioMark(s,"ellipse",{cx:String(x),cy:String(y),rx:"3",ry:"5","stroke-opacity":".6"});}
 for(let i=0;i<15;i++){const x=120+(i*39)%251,y=241+(i*17)%34;studioMark(s,"path",{d:`M ${x} ${y} C ${x-8} ${y-8} ${x+5} ${y-14} ${x+12} ${y-8} C ${x+22} ${y+1} ${x+9} ${y+10} ${x} ${y} Z`,"stroke-opacity":".65"});}
 studioMark(s,"path",{d:"M 350 226 Q 389 165 415 130 M 383 180 Q 351 155 368 136 Q 393 133 390 167 M 397 153 Q 422 139 436 151 Q 433 172 405 170 M 366 207 Q 338 191 344 178 Q 366 170 378 188",stroke:cssVar("accent"),"stroke-width":"2"});
}
export const mount: Mount<CulinaryNotebookProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  const attributes = hostAttributes(host);
  attributes.set("data-pica-id", host.getAttribute("data-pica-id"));
  attributes.set("data-pica-ready", host.getAttribute("data-pica-ready"));
  attributes.set("role", "region");
  attributes.set("aria-label", props.title);
  attributes.set("aria-hidden", null);
  const sheet = scope(host);
  const page = studioNode("div", host, "", "page");
  const ids = [nextId("culinary-notebook-a"), nextId("culinary-notebook-b"), nextId("culinary-notebook-c")];
  sheet.setRules(studioRules(sheet.selector) + `
 ${sheet.selector} [data-role="recipe-opening"]{display:grid;grid-template-columns:1fr 1fr;gap:50px;padding:38px 0 30px;align-items:center}${sheet.selector} [data-role="recipe-title"]{display:flex;flex-direction:column;gap:26px}${sheet.selector} [data-role="recipe-title"] h1{font-family:var(--pica-font-serif,inherit);font-size:clamp(46px,5.5vw,76px);font-weight:400;line-height:1.03;letter-spacing:-.045em}${sheet.selector} [data-role="still-life"]{padding:24px 0;background:color-mix(in srgb,${cssVar("fg")} 3%,transparent)}${sheet.selector} [data-role="still-life"] figcaption{padding:12px 28px;font-size:10px}
 ${sheet.selector} [data-role="recipe-yield"]{max-width:none;padding:18px 0;border-top:1px solid ${cssVar("fg")};border-bottom:1px solid ${cssVar("fg")};font-family:${GRID_FONT};font-size:12px}
 ${sheet.selector} [data-role="recipe-spread"]{display:grid;grid-template-columns:1fr 1.8fr;gap:64px;margin-top:32px}${sheet.selector} [data-role="ingredients"]>p{margin-top:16px;font-size:10px}${sheet.selector} dl{display:grid;grid-template-columns:72px 1fr;margin:24px 0 0;gap:0 12px}${sheet.selector} dt,${sheet.selector} dd{margin:0;padding:17px 0;border-top:1px solid ${cssVar("muted")}}${sheet.selector} dt{font-family:${GRID_FONT};font-size:12px}${sheet.selector} dd p{font-size:15px}${sheet.selector} dd p:last-child{font-size:11px;margin-top:5px}
 ${sheet.selector} [data-role="method"]{border-left:1px solid ${cssVar("fg")};padding-left:36px}${sheet.selector} ol{list-style:none;margin:24px 0 0;padding:0}${sheet.selector} li{padding:0 0 26px;margin-bottom:26px;border-bottom:1px solid ${cssVar("muted")}}${sheet.selector} [data-role="step-head"]{display:grid;grid-template-columns:34px 1fr;gap:12px}${sheet.selector} [data-role="step-number"]{font-family:${GRID_FONT};color:${cssVar("fg")};border-top:2px solid ${cssVar("accent")};padding-top:3px;font-size:18px}${sheet.selector} li>p{margin:14px 0 0 46px;font-size:14px}${sheet.selector} li>p[data-role="label"]{font-size:10px}
 ${sheet.selector} [data-role="kitchen-notes"]{display:grid;grid-template-columns:1fr 1.8fr;gap:64px;margin-top:20px;padding-top:28px;border-top:2px solid ${cssVar("fg")}}${sheet.selector} [data-role="kitchen-notes"] h2{font-family:var(--pica-font-serif,inherit)}
 @media(max-width:700px){${sheet.selector} [data-role="recipe-opening"]{grid-template-columns:1fr;gap:24px}${sheet.selector} [data-role="recipe-title"] h1{font-size:52px}${sheet.selector} [data-role="recipe-spread"]{grid-template-columns:1fr;gap:32px}${sheet.selector} [data-role="method"]{border-left:0;padding-left:0;border-top:1px solid ${cssVar("fg")};padding-top:28px}${sheet.selector} [data-role="kitchen-notes"]{display:block}${sheet.selector} [data-role="kitchen-notes"] h2{margin-bottom:20px}}
`);
  function render(): void {
    page.replaceChildren();
    attributes.set("aria-label", props.title);

 const top=studioNode("header",page,"","top");studioNode("p",top,props.author,"label");const nav=studioNode("nav",top);studioLink(nav,"Ingredients",ids[0]!);studioLink(nav,"Method",ids[1]!);studioLink(nav,"Kitchen notes",ids[2]!);
 const opening=studioNode("div",page,"","recipe-opening");const title=studioNode("div",opening,"","recipe-title");studioNode("p",title,props.edition,"label");studioNode("h1",title,props.title);studioNode("p",title,props.introduction);const illustration=studioNode("figure",opening,"","still-life");culinaryStillLife(illustration);studioNode("figcaption",illustration,"SQUASH / BEANS / SAGE · A study from the kitchen table");
 studioNode("p",page,props.yield,"recipe-yield");
 const spread=studioNode("div",page,"","recipe-spread");const ingredients=studioSection(spread,"For the table",ids[0]!,"ingredients");studioNode("p",ingredients,"Weigh first. Cook with attention.","label");
 const list=studioNode("dl",ingredients);for(const ingredient of props.ingredients){studioNode("dt",list,ingredient.quantity);const dd=studioNode("dd",list);studioNode("p",dd,ingredient.name);studioNode("p",dd,ingredient.preparation,"muted");}
 const method=studioSection(spread,"The method",ids[1]!,"method");const steps=studioNode("ol",method);for(const [i,step] of props.method.entries()){const li=studioNode("li",steps);const heading=studioNode("div",li,"","step-head");studioNode("span",heading,String(i+1).padStart(2,"0"),"step-number");studioNode("h3",heading,step.title);studioNode("p",li,step.time,"label");studioNode("p",li,step.instruction);}
 const notes=studioSection(page,"From the margin",ids[2]!,"kitchen-notes");studioNode("p",notes,props.note);
 const foot=studioNode("footer",page,"","foot");studioNode("p",foot,"One tray / One pan / A shared table");studioLink(foot,"Check the ingredients ↑",ids[0]!);

    attributes.set("data-pica-ready", "true");
  }
  render();
  let destroyed = false;
  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (!sameJson(before, props)) render();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      page.remove();
      sheet.destroy();
      attributes.restore();
    },
  };
};

// registry/sections/culinary-notebook/index.tsx
export type CulinaryNotebookComponentProps = Partial<CulinaryNotebookProps> & WrapperProps;

/** A cookbook recipe spread with an original still-life drawing, ingredient weights, timed methods, and practical kitchen notes. */
export function CulinaryNotebook({ className, style, palette, ...props }: CulinaryNotebookComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Culinary notebook · culinary-notebook
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en" data-stage="flow">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Culinary notebook · Pica</title>
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
var PicaCulinaryNotebook = (() => {
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

  // registry/sections/culinary-notebook/core.ts
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

  // lib/font.ts
  var GRID_FONT = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

  // registry/sections/culinary-notebook/core.ts
  var defaults = {
    author: "The small table / Kitchen notebook",
    title: "Roasted squash, white beans & sage",
    edition: "Recipe 014 · Early autumn",
    yield: "Serves 4 / 20 min preparation / 40 min cooking",
    introduction: "A tray of squash becomes a meal with warm beans and a sharp cider dressing. Keep the roasting juices: they are the beginning of the sauce.",
    ingredients: [
      { quantity: "900 g", name: "Winter squash", preparation: "Seeds removed, cut into 3 cm wedges" },
      { quantity: "500 g", name: "Cooked white beans", preparation: "Drained, cooking liquid reserved" },
      { quantity: "3 tbsp", name: "Olive oil", preparation: "Divided between tray and dressing" },
      { quantity: "12", name: "Sage leaves", preparation: "Whole, stems removed" },
      { quantity: "2 tbsp", name: "Cider vinegar", preparation: "Plus more to taste" },
      { quantity: "1 tsp", name: "Wholegrain mustard", preparation: "For the dressing" },
      { quantity: "40 g", name: "Toasted hazelnuts", preparation: "Roughly crushed" }
    ],
    method: [
      { title: "Give the squash some room", time: "35—40 min", instruction: "Heat the oven to 210°C. Toss the wedges with two tablespoons of oil and a generous pinch of salt. Spread in one layer, cut sides down. Roast until the edges brown and a knife meets no resistance." },
      { title: "Warm, without boiling", time: "8 min", instruction: "Put the beans in a shallow pan with four tablespoons of their cooking liquid. Add the sage and warm gently. Stir once or twice, keeping the beans whole. Add a spoon of water if the pan begins to dry." },
      { title: "Make the tray dressing", time: "3 min", instruction: "Lift the squash onto a warm plate. Pour the vinegar onto the roasting tray and scrape up the browned juices. Whisk in the mustard and remaining oil. Taste before adding salt." },
      { title: "Bring everything to the table", time: "2 min", instruction: "Spoon the beans around the squash and dress while warm. Scatter over the hazelnuts. Serve in the middle of the table with bread to collect the last of the sauce." }
    ],
    note: "Butter beans work equally well. For a nut-free version, use toasted pumpkin seeds. Leftovers keep for two days in a covered container in the refrigerator; warm gently with a splash of water before serving."
  };
  function studioNode(tag, parent, text = "", role = "") {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    if (role) node.setAttribute("data-role", role);
    if (text) node.textContent = text;
    parent.append(node);
    return node;
  }
  function studioSvg(parent, viewBox) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    node.setAttribute("data-pica", "");
    node.setAttribute("viewBox", viewBox);
    node.setAttribute("aria-hidden", "true");
    node.setAttribute("focusable", "false");
    parent.append(node);
    return node;
  }
  function studioMark(parent, tag, attributes) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    node.setAttribute("data-pica", "");
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    parent.append(node);
    return node;
  }
  function studioLink(parent, label, id) {
    const link = studioNode("a", parent, label);
    link.href = `#${id}`;
  }
  function studioSection(parent, title, id, role) {
    const section = studioNode("section", parent, "", role);
    section.id = id;
    studioNode("h2", section, title);
    return section;
  }
  function studioRules(s) {
    const fg = cssVar("fg"), bg = cssVar("bg"), muted = cssVar("muted"), accent = cssVar("accent");
    return `
  ${s}{color:${fg};background:${bg};font:inherit;position:relative;box-sizing:border-box}
  ${s} [data-role="page"]{max-width:1440px;margin:auto;padding:clamp(20px,4vw,56px);box-sizing:border-box}
  ${s} [data-role="page"] *{box-sizing:border-box;min-width:0}
  ${s} h1,${s} h2,${s} h3,${s} p,${s} figure{margin:0}
  ${s} h1{font-family:var(--pica-font-wide,inherit);font-weight:500;line-height:.96;letter-spacing:-.055em;font-size:clamp(46px,7vw,104px)}
  ${s} h2{font-weight:500;font-size:clamp(22px,3vw,36px);line-height:1.12;letter-spacing:-.025em}
  ${s} h3{font-size:20px;font-weight:500;line-height:1.2}
  ${s} p{line-height:1.55;max-width:62ch}
  ${s} [data-role="label"],${s} figcaption,${s} th,${s} td,${s} [data-role="number"]{font-family:${GRID_FONT};font-size:11px;line-height:1.5;letter-spacing:.03em}
  ${s} [data-role="label"]{text-transform:uppercase}
  ${s} [data-role="muted"]{color:${muted}}
  ${s} nav{display:flex;gap:20px;flex-wrap:wrap;font-size:12px}
  ${s} a{color:inherit;text-underline-offset:5px;text-decoration-thickness:1px}
  ${s} a:focus-visible,${s} button:focus-visible{outline:2px solid ${accent};outline-offset:5px}
  ${s} button{font:inherit;color:inherit;background:transparent;border:1px solid ${fg};border-radius:0;cursor:pointer}
  ${s} svg{display:block;width:100%;height:auto;color:${fg};fill:none;stroke:currentColor;stroke-width:1;vector-effect:non-scaling-stroke}
  ${s} [data-role="accent"]{color:${accent}}
  ${s} [data-role="top"]>p{color:${muted}}
  ${s} [data-role="top"]{display:flex;justify-content:space-between;gap:24px;align-items:start;padding-bottom:24px;border-bottom:1px solid ${fg}}
  ${s} [data-role="foot"]{display:flex;justify-content:space-between;gap:24px;margin-top:48px;padding-top:18px;border-top:1px solid ${fg};font-size:12px}
  ${s} section{scroll-margin-top:24px}
  @media(max-width:600px){${s} [data-role="top"],${s} [data-role="foot"]{flex-direction:column;gap:14px}${s} h1{font-size:52px}${s} nav{gap:16px}}
  `;
  }
  function culinaryStillLife(parent) {
    const s = studioSvg(parent, "0 0 500 340");
    studioMark(s, "ellipse", { cx: "248", cy: "260", rx: "203", ry: "52", "stroke-opacity": ".4" });
    studioMark(s, "ellipse", { cx: "248", cy: "256", rx: "168", ry: "35", "stroke-opacity": ".3" });
    studioMark(s, "path", { d: "M 114 193 C 74 129 105 75 167 71 C 224 67 240 132 210 191 C 190 225 140 231 114 193 Z", "stroke-width": "2" });
    for (let i = 0; i < 7; i++) studioMark(s, "path", { d: `M ${147 + i * 5} 80 C ${105 + i * 15} 119 ${111 + i * 12} 179 ${153 + i * 5} 213`, "stroke-opacity": ".4" });
    studioMark(s, "path", { d: "M 155 72 L 148 47 L 161 40 L 172 68 M 230 226 L 291 124 Q 344 164 353 238 Q 285 254 230 226 Z", "stroke-width": "2" });
    studioMark(s, "path", { d: "M 246 222 L 293 145 Q 328 178 338 225 Z", "stroke-opacity": ".5" });
    for (let i = 0; i < 12; i++) {
      const x = 282 + i % 4 * 11, y = 168 + Math.floor(i / 4) * 16;
      studioMark(s, "ellipse", { cx: String(x), cy: String(y), rx: "3", ry: "5", "stroke-opacity": ".6" });
    }
    for (let i = 0; i < 15; i++) {
      const x = 120 + i * 39 % 251, y = 241 + i * 17 % 34;
      studioMark(s, "path", { d: `M ${x} ${y} C ${x - 8} ${y - 8} ${x + 5} ${y - 14} ${x + 12} ${y - 8} C ${x + 22} ${y + 1} ${x + 9} ${y + 10} ${x} ${y} Z`, "stroke-opacity": ".65" });
    }
    studioMark(s, "path", { d: "M 350 226 Q 389 165 415 130 M 383 180 Q 351 155 368 136 Q 393 133 390 167 M 397 153 Q 422 139 436 151 Q 433 172 405 170 M 366 207 Q 338 191 344 178 Q 366 170 378 188", stroke: cssVar("accent"), "stroke-width": "2" });
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    const attributes = hostAttributes(host);
    attributes.set("data-pica-id", host.getAttribute("data-pica-id"));
    attributes.set("data-pica-ready", host.getAttribute("data-pica-ready"));
    attributes.set("role", "region");
    attributes.set("aria-label", props.title);
    attributes.set("aria-hidden", null);
    const sheet = scope(host);
    const page = studioNode("div", host, "", "page");
    const ids = [nextId("culinary-notebook-a"), nextId("culinary-notebook-b"), nextId("culinary-notebook-c")];
    sheet.setRules(studioRules(sheet.selector) + `
 ${sheet.selector} [data-role="recipe-opening"]{display:grid;grid-template-columns:1fr 1fr;gap:50px;padding:38px 0 30px;align-items:center}${sheet.selector} [data-role="recipe-title"]{display:flex;flex-direction:column;gap:26px}${sheet.selector} [data-role="recipe-title"] h1{font-family:var(--pica-font-serif,inherit);font-size:clamp(46px,5.5vw,76px);font-weight:400;line-height:1.03;letter-spacing:-.045em}${sheet.selector} [data-role="still-life"]{padding:24px 0;background:color-mix(in srgb,${cssVar("fg")} 3%,transparent)}${sheet.selector} [data-role="still-life"] figcaption{padding:12px 28px;font-size:10px}
 ${sheet.selector} [data-role="recipe-yield"]{max-width:none;padding:18px 0;border-top:1px solid ${cssVar("fg")};border-bottom:1px solid ${cssVar("fg")};font-family:${GRID_FONT};font-size:12px}
 ${sheet.selector} [data-role="recipe-spread"]{display:grid;grid-template-columns:1fr 1.8fr;gap:64px;margin-top:32px}${sheet.selector} [data-role="ingredients"]>p{margin-top:16px;font-size:10px}${sheet.selector} dl{display:grid;grid-template-columns:72px 1fr;margin:24px 0 0;gap:0 12px}${sheet.selector} dt,${sheet.selector} dd{margin:0;padding:17px 0;border-top:1px solid ${cssVar("muted")}}${sheet.selector} dt{font-family:${GRID_FONT};font-size:12px}${sheet.selector} dd p{font-size:15px}${sheet.selector} dd p:last-child{font-size:11px;margin-top:5px}
 ${sheet.selector} [data-role="method"]{border-left:1px solid ${cssVar("fg")};padding-left:36px}${sheet.selector} ol{list-style:none;margin:24px 0 0;padding:0}${sheet.selector} li{padding:0 0 26px;margin-bottom:26px;border-bottom:1px solid ${cssVar("muted")}}${sheet.selector} [data-role="step-head"]{display:grid;grid-template-columns:34px 1fr;gap:12px}${sheet.selector} [data-role="step-number"]{font-family:${GRID_FONT};color:${cssVar("fg")};border-top:2px solid ${cssVar("accent")};padding-top:3px;font-size:18px}${sheet.selector} li>p{margin:14px 0 0 46px;font-size:14px}${sheet.selector} li>p[data-role="label"]{font-size:10px}
 ${sheet.selector} [data-role="kitchen-notes"]{display:grid;grid-template-columns:1fr 1.8fr;gap:64px;margin-top:20px;padding-top:28px;border-top:2px solid ${cssVar("fg")}}${sheet.selector} [data-role="kitchen-notes"] h2{font-family:var(--pica-font-serif,inherit)}
 @media(max-width:700px){${sheet.selector} [data-role="recipe-opening"]{grid-template-columns:1fr;gap:24px}${sheet.selector} [data-role="recipe-title"] h1{font-size:52px}${sheet.selector} [data-role="recipe-spread"]{grid-template-columns:1fr;gap:32px}${sheet.selector} [data-role="method"]{border-left:0;padding-left:0;border-top:1px solid ${cssVar("fg")};padding-top:28px}${sheet.selector} [data-role="kitchen-notes"]{display:block}${sheet.selector} [data-role="kitchen-notes"] h2{margin-bottom:20px}}
`);
    function render() {
      page.replaceChildren();
      attributes.set("aria-label", props.title);
      const top = studioNode("header", page, "", "top");
      studioNode("p", top, props.author, "label");
      const nav = studioNode("nav", top);
      studioLink(nav, "Ingredients", ids[0]);
      studioLink(nav, "Method", ids[1]);
      studioLink(nav, "Kitchen notes", ids[2]);
      const opening = studioNode("div", page, "", "recipe-opening");
      const title = studioNode("div", opening, "", "recipe-title");
      studioNode("p", title, props.edition, "label");
      studioNode("h1", title, props.title);
      studioNode("p", title, props.introduction);
      const illustration = studioNode("figure", opening, "", "still-life");
      culinaryStillLife(illustration);
      studioNode("figcaption", illustration, "SQUASH / BEANS / SAGE · A study from the kitchen table");
      studioNode("p", page, props.yield, "recipe-yield");
      const spread = studioNode("div", page, "", "recipe-spread");
      const ingredients = studioSection(spread, "For the table", ids[0], "ingredients");
      studioNode("p", ingredients, "Weigh first. Cook with attention.", "label");
      const list = studioNode("dl", ingredients);
      for (const ingredient of props.ingredients) {
        studioNode("dt", list, ingredient.quantity);
        const dd = studioNode("dd", list);
        studioNode("p", dd, ingredient.name);
        studioNode("p", dd, ingredient.preparation, "muted");
      }
      const method = studioSection(spread, "The method", ids[1], "method");
      const steps = studioNode("ol", method);
      for (const [i, step] of props.method.entries()) {
        const li = studioNode("li", steps);
        const heading = studioNode("div", li, "", "step-head");
        studioNode("span", heading, String(i + 1).padStart(2, "0"), "step-number");
        studioNode("h3", heading, step.title);
        studioNode("p", li, step.time, "label");
        studioNode("p", li, step.instruction);
      }
      const notes = studioSection(page, "From the margin", ids[2], "kitchen-notes");
      studioNode("p", notes, props.note);
      const foot = studioNode("footer", page, "", "foot");
      studioNode("p", foot, "One tray / One pan / A shared table");
      studioLink(foot, "Check the ingredients ↑", ids[0]);
      attributes.set("data-pica-ready", "true");
    }
    render();
    let destroyed = false;
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        if (!sameJson(before, props)) render();
      },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        page.remove();
        sheet.destroy();
        attributes.restore();
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
  var instance = PicaCulinaryNotebook.mount(host, take(initial));
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
