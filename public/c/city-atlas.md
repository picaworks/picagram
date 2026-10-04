# City Atlas

> An urban publication with an original block map, address index and district narratives.

Category: sections. Tags: editorial, city-atlas, publication, page. Static. Size: 3.7 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/city-atlas.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `publication` | string | `"City Atlas / Local Studies"` | The atlas masthead. |
| `district` | string | `"The East\nQuarter"` | The district name. |
| `introduction` | string | `"A district measured in doorways, shared tables and the distance between a home and its favourite corner. An atlas of everyday public life."` | The district introduction. |
| `addresses` | readonly { name: string; address: string; note: string }[] | `[{"name":"The market hall","address":"01 / 18 Market Street","note":"At nine, the shutters rise in sequence. By noon, the central aisle becomes a meeting place. Stay near the north entrance to see the building change from market to neighbourhood room."},{"name":"The pocket garden","address":"02 / 7 Foundry Lane","note":"A narrow gap between workshops became a garden through a decade of small decisions. Nothing here matches, but every seat has been placed with a reason."},{"name":"The evening library","address":"03 / 42 Canal Walk","note":"The reading room stays open after the offices close. From its windows, the canal looks like a slow second street. A noticeboard carries more local news than any single publication."},{"name":"The repair counter","address":"04 / 3 Bridge Passage","note":"People bring lamps, coats and questions. The counter is less a shop than a practical conversation about what can be kept in use."}]` | The address index and accompanying narratives. |

## Colors

Draws with `--pica-fg`, `--pica-bg`, `--pica-accent`, `--pica-muted`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · City Atlas · city-atlas
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

// registry/sections/city-atlas/core.ts
export interface CityAtlasProps {
  /** The atlas masthead. */
  publication: string;
  /** The district name. */
  district: string;
  /** The district introduction. */
  introduction: string;
  /** The address index and accompanying narratives. */
  addresses: readonly { name: string; address: string; note: string }[];
}

export const defaults: CityAtlasProps = {
  "publication": "City Atlas / Local Studies",
  "district": "The East\nQuarter",
  "introduction": "A district measured in doorways, shared tables and the distance between a home and its favourite corner. An atlas of everyday public life.",
  "addresses": [
    {
      "name": "The market hall",
      "address": "01 / 18 Market Street",
      "note": "At nine, the shutters rise in sequence. By noon, the central aisle becomes a meeting place. Stay near the north entrance to see the building change from market to neighbourhood room."
    },
    {
      "name": "The pocket garden",
      "address": "02 / 7 Foundry Lane",
      "note": "A narrow gap between workshops became a garden through a decade of small decisions. Nothing here matches, but every seat has been placed with a reason."
    },
    {
      "name": "The evening library",
      "address": "03 / 42 Canal Walk",
      "note": "The reading room stays open after the offices close. From its windows, the canal looks like a slow second street. A noticeboard carries more local news than any single publication."
    },
    {
      "name": "The repair counter",
      "address": "04 / 3 Bridge Passage",
      "note": "People bring lamps, coats and questions. The counter is less a shop than a practical conversation about what can be kept in use."
    }
  ]
};

function cityAtlasNode<T extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: T, text = "", className = ""): HTMLElementTagNameMap[T] {
  const element = document.createElement(tag);
  element.setAttribute("data-pica", "");
  element.className = className;
  if (text) element.textContent = text;
  parent.append(element);
  return element;
}
function cityAtlasLink(parent: HTMLElement, text: string, id: string): HTMLAnchorElement {
  const a = cityAtlasNode(parent, "a", text);
  a.href = `#${id}`;
  return a;
}
function cityAtlasMark(parent: Element, tag: string, attributes: Readonly<Record<string, string>>): SVGElement {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  node.setAttribute("data-pica", "");
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  parent.append(node);
  return node;
}

function cityAtlasRules(s: string): string {
  const fg = cssVar("fg");
  const bg = cssVar("bg");
  const accent = cssVar("accent");
  const muted = cssVar("muted");
  return `
${s}{box-sizing:border-box;background:${bg};color:${fg};padding:clamp(1.2rem,4vw,3.6rem);max-width:1440px;margin:auto;line-height:1.65;overflow-wrap:anywhere}
${s} *{box-sizing:border-box;min-width:0}
${s} h1,${s} h2,${s} h3,${s} p,${s} figure,${s} blockquote{margin:0}
${s} h1{font-weight:500;line-height:1.02;letter-spacing:-.045em}
${s} h2{font-weight:500;line-height:1.18;letter-spacing:-.025em;font-size:clamp(1.5rem,2.5vw,2.2rem)}
${s} h3{font-size:1.1rem;font-weight:600;line-height:1.4}
${s} .label{font-family:${GRID_FONT};font-size:.7rem;line-height:1.6;letter-spacing:.08em;text-transform:uppercase}
${s} .muted{color:${muted}}
${s} a{color:inherit;text-decoration:underline;text-underline-offset:.25em}
${s} a:focus-visible,${s} summary:focus-visible{outline:2px solid ${accent};outline-offset:4px}
${s} .mast{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;border-bottom:1px solid ${fg};padding-bottom:1rem}
${s} .nav{display:flex;gap:1.4rem;flex-wrap:wrap}
${s} .nav a{text-decoration:none}
${s} .rule{border-top:1px solid ${muted}}
${s} .colophon{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-top:3rem;padding-top:1rem;border-top:1px solid ${fg}}
${s} details{padding:1rem 0;border-top:1px solid ${muted}}
${s} summary{cursor:pointer;font-family:${GRID_FONT};font-size:.75rem;line-height:1.5}
${s} details p{padding-top:1rem;max-width:65ch}
${s} svg{display:block;width:100%;height:auto;color:${fg}}
${s} .accent{color:color-mix(in srgb, ${fg} 40%, ${accent})}
@media(max-width:600px){${s}{padding:1.2rem}${s} .nav{gap:.8rem}${s} .colophon{margin-top:2rem}}
${s} .atlasgrid{display:grid;grid-template-columns:20rem 1fr;gap:3rem;padding-top:2rem}${s} h1{font-family:var(--pica-font-wide,sans-serif);font-size:clamp(3.8rem,6vw,6rem);white-space:pre-line}${s} .intro{margin-top:1.5rem;font-size:1.1rem}${s} .index{margin-top:2.5rem;border-top:1px solid ${fg};padding-top:1rem}${s} .addresslink{display:block;padding:.85rem 0;border-bottom:1px solid ${muted};text-decoration:none}${s} .addresslink span{display:block}${s} .addresslink strong{font-weight:500;font-size:1rem}
${s} .map{padding:1.2rem;border:1px solid ${fg}}${s} .map svg{height:420px}${s} .map rect{fill:none;stroke:currentColor;stroke-width:1}${s} .map path{fill:none;stroke:currentColor;stroke-width:1}${s} .map text{font-family:${GRID_FONT};font-size:12px;fill:currentColor}${s} .map .districtmark{fill:${accent};stroke:${accent}}${s} .map figcaption{display:flex;justify-content:space-between;gap:1rem;border-top:1px solid ${muted};padding-top:1rem}
${s} .narratives{display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-top:2rem}${s} .districtstory{padding-top:1.2rem;border-top:1px solid ${fg}}${s} .districtstory h2{font-size:1.5rem;margin:.5rem 0 .8rem}${s} .districtstory p{font-size:.95rem}${s} .legend{display:flex;gap:1.5rem;flex-wrap:wrap;margin:1rem 0}${s} .legend span:first-child{color:color-mix(in srgb, ${fg} 40%, ${accent})}
@media(max-width:900px){${s} .atlasgrid{grid-template-columns:15rem 1fr;gap:1.5rem}${s} .narratives{grid-template-columns:1fr}${s} .map svg{height:350px}}
@media(max-width:600px){${s} .atlasgrid{grid-template-columns:1fr}${s} .index{margin-top:1.5rem}${s} .map svg{height:320px}${s} .narratives{gap:1.5rem}}
`;
}

function cityAtlasRender(root: HTMLElement, p: CityAtlasProps, id: string): void {
  root.replaceChildren();
const mast=cityAtlasNode(root,"header","","mast");cityAtlasNode(mast,"span",p.publication,"label");cityAtlasNode(mast,"span","District 04 / Walking edition","label muted");
const grid=cityAtlasNode(root,"div","","atlasgrid");const intro=cityAtlasNode(grid,"div");const title=cityAtlasNode(intro,"h1",p.district);title.id=`${id}-title`;cityAtlasNode(intro,"p",p.introduction,"intro");const index=cityAtlasNode(intro,"nav","","index");index.setAttribute("aria-label","Address index");cityAtlasNode(index,"h2","Address index");p.addresses.forEach((place,i)=>{const a=cityAtlasLink(index,"",`${id}-address-${i}`);a.className="addresslink";cityAtlasNode(a,"span",place.address,"label muted");cityAtlasNode(a,"strong",place.name);});
const content=cityAtlasNode(grid,"div");const figure=cityAtlasNode(content,"figure","","map");const svg=cityAtlasMark(figure,"svg",{viewBox:"0 0 540 420",role:"img","aria-label":"Original schematic block map of the fictional East Quarter"});
for(let row=0;row<4;row++)for(let col=0;col<5;col++){if(col===3&&row>1)continue;cityAtlasMark(svg,"rect",{x:String(35+col*100),y:String(25+row*88),width:"76",height:"60"});}
cityAtlasMark(svg,"path",{d:"M0 356 H540 M0 366 H540 M0 376 H540"});cityAtlasMark(svg,"path",{d:"M388 0 V345","stroke-dasharray":"4 4"});
[[165,57],[265,145],[461,290],[65,235]].forEach(([x,y],i)=>{cityAtlasMark(svg,"rect",{x:String((x??0)-8),y:String((y??0)-8),width:"16",height:"16",class:"districtmark"});const t=cityAtlasMark(svg,"text",{x:String((x??0)+15),y:String((y??0)+4)});t.textContent=String(i+1).padStart(2,"0");});
const canal=cityAtlasMark(svg,"text",{x:"24",y:"403"});canal.textContent="CANAL WALK →";const north=cityAtlasMark(svg,"text",{x:"490",y:"17"});north.textContent="N ↑";
const caption=cityAtlasNode(figure,"figcaption");cityAtlasNode(caption,"span","East Quarter / Block study","label");cityAtlasNode(caption,"span","1 square ≈ 1 minute on foot","label muted");const legend=cityAtlasNode(content,"div","","legend label");cityAtlasNode(legend,"span","■ Places in this issue");cityAtlasNode(legend,"span","□ Neighbourhood blocks","muted");
const narratives=cityAtlasNode(content,"section","","narratives");p.addresses.forEach((place,i)=>{const article=cityAtlasNode(narratives,"article","","districtstory");article.id=`${id}-address-${i}`;cityAtlasNode(article,"span",place.address,"label muted");cityAtlasNode(article,"h2",place.name);cityAtlasNode(article,"p",place.note);});const details=cityAtlasNode(content,"details");cityAtlasNode(details,"summary","How to read this atlas");cityAtlasNode(details,"p","The East Quarter is a fictional district assembled to explore everyday urban life. The diagram shows relationships between places, rather than surveyed distances or public access routes.");
const footer=cityAtlasNode(root,"footer","","colophon");cityAtlasNode(footer,"span",p.publication,"label");cityAtlasLink(footer,"Back to the beginning",`${id}-title`).className="label";
}

export const mount: Mount<CityAtlasProps> = (host, initial = {}) => {
  let props: CityAtlasProps = { ...defaults, ...initial };
  const attributes = hostAttributes(host);
  const id = nextId("city-atlas");
  attributes.set("role", "region");
  attributes.set("aria-label", props.publication);
  const style = cityAtlasNode(host, "style");
  const root = cityAtlasNode(host, "article");
  root.id = id;
  style.textContent = cityAtlasRules(`[id="${id}"]`);
  cityAtlasRender(root, props, id);
  attributes.set("data-pica-ready", "true");
  return {
    update(next) {
      const merged = { ...props, ...next };
      if (sameJson(props, merged)) return;
      props = merged;
      attributes.set("aria-label", props.publication);
      cityAtlasRender(root, props, id);
    },
    destroy() {
      root.remove();
      style.remove();
      attributes.restore();
    },
  };
};

// registry/sections/city-atlas/index.tsx
export type CityAtlasComponentProps = Partial<CityAtlasProps> & WrapperProps;

/** An urban publication with an original block map, address index and district narratives. */
export function CityAtlas({ className, style, palette, ...props }: CityAtlasComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · City Atlas · city-atlas
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en" data-stage="flow">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>City Atlas · Pica</title>
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
var PicaCityAtlas = (() => {
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

  // registry/sections/city-atlas/core.ts
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

  // registry/sections/city-atlas/core.ts
  var defaults = {
    "publication": "City Atlas / Local Studies",
    "district": "The East\nQuarter",
    "introduction": "A district measured in doorways, shared tables and the distance between a home and its favourite corner. An atlas of everyday public life.",
    "addresses": [
      {
        "name": "The market hall",
        "address": "01 / 18 Market Street",
        "note": "At nine, the shutters rise in sequence. By noon, the central aisle becomes a meeting place. Stay near the north entrance to see the building change from market to neighbourhood room."
      },
      {
        "name": "The pocket garden",
        "address": "02 / 7 Foundry Lane",
        "note": "A narrow gap between workshops became a garden through a decade of small decisions. Nothing here matches, but every seat has been placed with a reason."
      },
      {
        "name": "The evening library",
        "address": "03 / 42 Canal Walk",
        "note": "The reading room stays open after the offices close. From its windows, the canal looks like a slow second street. A noticeboard carries more local news than any single publication."
      },
      {
        "name": "The repair counter",
        "address": "04 / 3 Bridge Passage",
        "note": "People bring lamps, coats and questions. The counter is less a shop than a practical conversation about what can be kept in use."
      }
    ]
  };
  function cityAtlasNode(parent, tag, text = "", className = "") {
    const element = document.createElement(tag);
    element.setAttribute("data-pica", "");
    element.className = className;
    if (text) element.textContent = text;
    parent.append(element);
    return element;
  }
  function cityAtlasLink(parent, text, id) {
    const a = cityAtlasNode(parent, "a", text);
    a.href = `#${id}`;
    return a;
  }
  function cityAtlasMark(parent, tag, attributes) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    node.setAttribute("data-pica", "");
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
    parent.append(node);
    return node;
  }
  function cityAtlasRules(s) {
    const fg = cssVar("fg");
    const bg = cssVar("bg");
    const accent = cssVar("accent");
    const muted = cssVar("muted");
    return `
${s}{box-sizing:border-box;background:${bg};color:${fg};padding:clamp(1.2rem,4vw,3.6rem);max-width:1440px;margin:auto;line-height:1.65;overflow-wrap:anywhere}
${s} *{box-sizing:border-box;min-width:0}
${s} h1,${s} h2,${s} h3,${s} p,${s} figure,${s} blockquote{margin:0}
${s} h1{font-weight:500;line-height:1.02;letter-spacing:-.045em}
${s} h2{font-weight:500;line-height:1.18;letter-spacing:-.025em;font-size:clamp(1.5rem,2.5vw,2.2rem)}
${s} h3{font-size:1.1rem;font-weight:600;line-height:1.4}
${s} .label{font-family:${GRID_FONT};font-size:.7rem;line-height:1.6;letter-spacing:.08em;text-transform:uppercase}
${s} .muted{color:${muted}}
${s} a{color:inherit;text-decoration:underline;text-underline-offset:.25em}
${s} a:focus-visible,${s} summary:focus-visible{outline:2px solid ${accent};outline-offset:4px}
${s} .mast{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;border-bottom:1px solid ${fg};padding-bottom:1rem}
${s} .nav{display:flex;gap:1.4rem;flex-wrap:wrap}
${s} .nav a{text-decoration:none}
${s} .rule{border-top:1px solid ${muted}}
${s} .colophon{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-top:3rem;padding-top:1rem;border-top:1px solid ${fg}}
${s} details{padding:1rem 0;border-top:1px solid ${muted}}
${s} summary{cursor:pointer;font-family:${GRID_FONT};font-size:.75rem;line-height:1.5}
${s} details p{padding-top:1rem;max-width:65ch}
${s} svg{display:block;width:100%;height:auto;color:${fg}}
${s} .accent{color:color-mix(in srgb, ${fg} 40%, ${accent})}
@media(max-width:600px){${s}{padding:1.2rem}${s} .nav{gap:.8rem}${s} .colophon{margin-top:2rem}}
${s} .atlasgrid{display:grid;grid-template-columns:20rem 1fr;gap:3rem;padding-top:2rem}${s} h1{font-family:var(--pica-font-wide,sans-serif);font-size:clamp(3.8rem,6vw,6rem);white-space:pre-line}${s} .intro{margin-top:1.5rem;font-size:1.1rem}${s} .index{margin-top:2.5rem;border-top:1px solid ${fg};padding-top:1rem}${s} .addresslink{display:block;padding:.85rem 0;border-bottom:1px solid ${muted};text-decoration:none}${s} .addresslink span{display:block}${s} .addresslink strong{font-weight:500;font-size:1rem}
${s} .map{padding:1.2rem;border:1px solid ${fg}}${s} .map svg{height:420px}${s} .map rect{fill:none;stroke:currentColor;stroke-width:1}${s} .map path{fill:none;stroke:currentColor;stroke-width:1}${s} .map text{font-family:${GRID_FONT};font-size:12px;fill:currentColor}${s} .map .districtmark{fill:${accent};stroke:${accent}}${s} .map figcaption{display:flex;justify-content:space-between;gap:1rem;border-top:1px solid ${muted};padding-top:1rem}
${s} .narratives{display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-top:2rem}${s} .districtstory{padding-top:1.2rem;border-top:1px solid ${fg}}${s} .districtstory h2{font-size:1.5rem;margin:.5rem 0 .8rem}${s} .districtstory p{font-size:.95rem}${s} .legend{display:flex;gap:1.5rem;flex-wrap:wrap;margin:1rem 0}${s} .legend span:first-child{color:color-mix(in srgb, ${fg} 40%, ${accent})}
@media(max-width:900px){${s} .atlasgrid{grid-template-columns:15rem 1fr;gap:1.5rem}${s} .narratives{grid-template-columns:1fr}${s} .map svg{height:350px}}
@media(max-width:600px){${s} .atlasgrid{grid-template-columns:1fr}${s} .index{margin-top:1.5rem}${s} .map svg{height:320px}${s} .narratives{gap:1.5rem}}
`;
  }
  function cityAtlasRender(root, p, id) {
    root.replaceChildren();
    const mast = cityAtlasNode(root, "header", "", "mast");
    cityAtlasNode(mast, "span", p.publication, "label");
    cityAtlasNode(mast, "span", "District 04 / Walking edition", "label muted");
    const grid = cityAtlasNode(root, "div", "", "atlasgrid");
    const intro = cityAtlasNode(grid, "div");
    const title = cityAtlasNode(intro, "h1", p.district);
    title.id = `${id}-title`;
    cityAtlasNode(intro, "p", p.introduction, "intro");
    const index = cityAtlasNode(intro, "nav", "", "index");
    index.setAttribute("aria-label", "Address index");
    cityAtlasNode(index, "h2", "Address index");
    p.addresses.forEach((place, i) => {
      const a = cityAtlasLink(index, "", `${id}-address-${i}`);
      a.className = "addresslink";
      cityAtlasNode(a, "span", place.address, "label muted");
      cityAtlasNode(a, "strong", place.name);
    });
    const content = cityAtlasNode(grid, "div");
    const figure = cityAtlasNode(content, "figure", "", "map");
    const svg = cityAtlasMark(figure, "svg", { viewBox: "0 0 540 420", role: "img", "aria-label": "Original schematic block map of the fictional East Quarter" });
    for (let row = 0; row < 4; row++) for (let col = 0; col < 5; col++) {
      if (col === 3 && row > 1) continue;
      cityAtlasMark(svg, "rect", { x: String(35 + col * 100), y: String(25 + row * 88), width: "76", height: "60" });
    }
    cityAtlasMark(svg, "path", { d: "M0 356 H540 M0 366 H540 M0 376 H540" });
    cityAtlasMark(svg, "path", { d: "M388 0 V345", "stroke-dasharray": "4 4" });
    [[165, 57], [265, 145], [461, 290], [65, 235]].forEach(([x, y], i) => {
      cityAtlasMark(svg, "rect", { x: String((x ?? 0) - 8), y: String((y ?? 0) - 8), width: "16", height: "16", class: "districtmark" });
      const t = cityAtlasMark(svg, "text", { x: String((x ?? 0) + 15), y: String((y ?? 0) + 4) });
      t.textContent = String(i + 1).padStart(2, "0");
    });
    const canal = cityAtlasMark(svg, "text", { x: "24", y: "403" });
    canal.textContent = "CANAL WALK →";
    const north = cityAtlasMark(svg, "text", { x: "490", y: "17" });
    north.textContent = "N ↑";
    const caption = cityAtlasNode(figure, "figcaption");
    cityAtlasNode(caption, "span", "East Quarter / Block study", "label");
    cityAtlasNode(caption, "span", "1 square ≈ 1 minute on foot", "label muted");
    const legend = cityAtlasNode(content, "div", "", "legend label");
    cityAtlasNode(legend, "span", "■ Places in this issue");
    cityAtlasNode(legend, "span", "□ Neighbourhood blocks", "muted");
    const narratives = cityAtlasNode(content, "section", "", "narratives");
    p.addresses.forEach((place, i) => {
      const article = cityAtlasNode(narratives, "article", "", "districtstory");
      article.id = `${id}-address-${i}`;
      cityAtlasNode(article, "span", place.address, "label muted");
      cityAtlasNode(article, "h2", place.name);
      cityAtlasNode(article, "p", place.note);
    });
    const details = cityAtlasNode(content, "details");
    cityAtlasNode(details, "summary", "How to read this atlas");
    cityAtlasNode(details, "p", "The East Quarter is a fictional district assembled to explore everyday urban life. The diagram shows relationships between places, rather than surveyed distances or public access routes.");
    const footer = cityAtlasNode(root, "footer", "", "colophon");
    cityAtlasNode(footer, "span", p.publication, "label");
    cityAtlasLink(footer, "Back to the beginning", `${id}-title`).className = "label";
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    const attributes = hostAttributes(host);
    const id = nextId("city-atlas");
    attributes.set("role", "region");
    attributes.set("aria-label", props.publication);
    const style = cityAtlasNode(host, "style");
    const root = cityAtlasNode(host, "article");
    root.id = id;
    style.textContent = cityAtlasRules(`[id="${id}"]`);
    cityAtlasRender(root, props, id);
    attributes.set("data-pica-ready", "true");
    return {
      update(next) {
        const merged = { ...props, ...next };
        if (sameJson(props, merged)) return;
        props = merged;
        attributes.set("aria-label", props.publication);
        cityAtlasRender(root, props, id);
      },
      destroy() {
        root.remove();
        style.remove();
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
  var instance = PicaCityAtlas.mount(host, take(initial));
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
