# Polar Expedition

> A polar field notebook with a route topology, specimen annotations, dispatches, and expedition details.

Category: sections. Tags: editorial, microsite, cinematic, polar. Static. Size: 4.5 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/polar-expedition.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | string | `"At the edge\nof the known."` | The page headline. Line breaks preserve the editorial composition. |
| `description` | string | `"Route notes, collected specimens and four dispatches from the fictional White Reach expedition."` | Introductory copy beneath the headline. |
| `edition` | string | `"WHITE REACH / FIELD NOTEBOOK 09"` | The archive or programme label in the masthead. |

## Events

Each event is a CustomEvent on the host named `pica:` plus the event name in lower case. It does not bubble. In React, pass the matching `on` prop.

| Event | React prop | Detail | Description |
|---|---|---|---|
| `reveal` | `onReveal` | `{ expanded: boolean }` | Reports the reader opening or closing the supplementary note. |

## Colors

Draws with `--pica-fg`, `--pica-bg`, `--pica-accent`, `--pica-muted`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Polar Expedition · polar-expedition
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

// lib/font.ts
/** The monospace stack glyph components default to. It lives in its own module, so a text component that
 *  never draws a grid does not carry lib/glyph-grid.ts into its single React file just for the font. */
const GRID_FONT = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

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

// registry/sections/polar-expedition/core.ts
export interface PolarExpeditionProps {
    /** The page headline. Line breaks preserve the editorial composition. */
    title: string;
    /** Introductory copy beneath the headline. */
    description: string;
    /** The archive or programme label in the masthead. */
    edition: string;
}
export interface PolarExpeditionEvents {
    /** Reports the reader opening or closing the supplementary note. */
    reveal: { expanded: boolean };
}
export const defaults: PolarExpeditionProps = {
    "title": "At the edge\nof the known.",
    "description": "Route notes, collected specimens and four dispatches from the fictional White Reach expedition.",
    "edition": "WHITE REACH / FIELD NOTEBOOK 09"
};
type polarExpeditionMark = readonly [
    string,
    Record<string, string>
];
function polarExpeditionNode(parent: Element, tag: keyof HTMLElementTagNameMap, part: string, text?: string): HTMLElement {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    if (part)
        node.dataset.part = part;
    if (text !== undefined)
        node.textContent = text;
    parent.append(node);
    return node;
}
function polarExpeditionDiagram(parent: Element, box: string, marks: readonly polarExpeditionMark[]): void {
    const drawing = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    drawing.setAttribute("data-pica", "");
    drawing.setAttribute("viewBox", box);
    drawing.setAttribute("aria-hidden", "true");
    drawing.setAttribute("fill", "none");
    drawing.setAttribute("stroke", "currentColor");
    drawing.setAttribute("stroke-width", "1");
    for (const [tag, attrs] of marks) {
        const mark = document.createElementNS("http://www.w3.org/2000/svg", tag);
        mark.setAttribute("data-pica", "");
        for (const [key, value] of Object.entries(attrs))
            mark.setAttribute(key, value);
        drawing.append(mark);
    }
    parent.append(drawing);
}
function polarExpeditionRules(s: string): string {
    const fg = cssVar("fg");
    const muted = cssVar("muted");
    const accent = cssVar("accent");
    const rules = `
:where(HOST){min-height:100vh}
HOST{color:${fg};background:${cssVar("bg")};position:relative;box-sizing:border-box}
HOST [data-part="page"]{max-width:1200px;margin:0 auto;padding:28px clamp(22px,5vw,65px) 24px;box-sizing:border-box}
HOST [data-pica]{box-sizing:border-box;min-width:0}
HOST h1{overflow-wrap:anywhere}
HOST h1,HOST h2,HOST h3,HOST p,HOST figure,HOST dl,HOST dd,HOST blockquote{margin:0}
HOST [data-part="masthead"]{display:flex;justify-content:space-between;align-items:center;gap:25px;border-top:3px solid ${fg};border-bottom:1px solid ${fg};padding:17px 0}
HOST [data-part="label"],HOST [data-part="edition"]{font-family:${GRID_FONT};font-size:.7rem;line-height:1.7;letter-spacing:.035em;white-space:pre-line}
HOST [data-part="edition"]{border-left:3px solid ${accent};padding-left:12px}
HOST [data-part="navigation"]{display:flex;flex-wrap:wrap;gap:18px}
HOST a{color:${fg};text-decoration:none;font-family:${GRID_FONT};font-size:.7rem;line-height:1.5;border-bottom:1px solid ${muted};padding-bottom:3px}
HOST a:focus-visible,HOST button:focus-visible{outline:2px solid ${accent};outline-offset:4px}
HOST [data-part="sectiontitle"]{font-size:clamp(1.7rem,2.8vw,2.5rem);font-weight:450;line-height:1.12;letter-spacing:-.035em;margin-bottom:24px}
HOST [data-part="copy"]{font-size:1rem;line-height:1.65}
HOST [data-part="supplement"]{margin:38px 0 32px;border-top:1px solid ${muted};border-bottom:1px solid ${muted}}
HOST [data-part="note-toggle"]{appearance:none;display:flex;align-items:center;justify-content:space-between;gap:20px;width:100%;padding:20px 0;border:0;background:transparent;color:${fg};font:inherit;font-size:.95rem;text-align:left;cursor:pointer}
HOST [data-part="note-toggle"]::after{content:"+";font-family:${GRID_FONT};font-size:1.4rem;color:${accent}}
HOST [data-part="note-toggle"][aria-expanded="true"]::after{content:"−"}
HOST [data-part="note-body"]{padding:0 0 25px;max-width:760px}
HOST [data-part="note-body"] h3{font-weight:500;font-size:1.3rem;margin:5px 0 15px}
HOST [data-part="footer"]{display:flex;justify-content:space-between;gap:20px;font-family:${GRID_FONT};font-size:.64rem;letter-spacing:.03em;line-height:1.6}
HOST [data-part="cover"]{display:grid;grid-template-columns:1fr 1fr;gap:65px;padding:48px 0 60px;align-items:center}HOST [data-part="title"]{font-size:clamp(3.4rem,6.5vw,6.2rem);font-weight:450;letter-spacing:-.05em;line-height:1;white-space:pre-line;margin:26px 0}HOST [data-part="deck"]{font-size:1.08rem;line-height:1.7;max-width:38ch}HOST [data-part="route"]{border:1px solid ${muted};padding:20px;margin:0}HOST [data-part="route"] svg{width:100%;height:auto}HOST [data-part="route"] figcaption{border-top:1px solid ${muted};padding-top:18px;font-size:.67rem}HOST [data-part="record"]{display:grid;grid-template-columns:.8fr 1.7fr;gap:65px;border-top:1px solid ${fg};padding:35px 0 50px}HOST [data-part="recordtitle"] h2{white-space:pre-line;margin-top:24px}HOST [data-part="specimen"]{display:grid;grid-template-columns:70px 1fr;gap:22px;padding:25px 0;border-bottom:1px solid ${muted}}HOST [data-part="code"]{font-family:${GRID_FONT};font-size:1.1rem}HOST [data-part="specimen"] h3{font-size:1.35rem;font-weight:500;margin-bottom:10px}HOST [data-part="specimen"] [data-part="copy"]{margin-top:15px}HOST [data-part="dispatches"]{border-top:1px solid ${fg};padding-top:35px}HOST [data-part="dispatchgrid"]{display:grid;grid-template-columns:repeat(4,1fr);gap:28px;margin:30px 0}HOST [data-part="dispatch"]{border-left:1px solid ${muted};padding-left:20px}HOST [data-part="dispatch"] h3{font-weight:500;font-size:1.2rem;line-height:1.3;margin:20px 0 12px}HOST [data-part="closing"]{font-size:clamp(1.5rem,2.6vw,2.25rem);line-height:1.35;max-width:700px;margin:55px 0 40px;letter-spacing:-.025em}@media(max-width:1000px){HOST [data-part="dispatchgrid"]{grid-template-columns:repeat(2,1fr)}}
@media(max-width:760px){HOST [data-part="cover"]{grid-template-columns:1fr;gap:32px;padding-top:32px}HOST [data-part="route"]{max-width:470px;justify-self:center}HOST [data-part="record"]{grid-template-columns:1fr;gap:20px}HOST [data-part="specimen"]{grid-template-columns:52px 1fr;gap:15px}HOST [data-part="dispatchgrid"]{grid-template-columns:repeat(2,1fr);gap:28px 22px}HOST [data-part="dispatch"]{padding-left:12px}}@media(max-width:430px){HOST [data-part="dispatchgrid"]{grid-template-columns:1fr}HOST [data-part="dispatch"]{padding-bottom:20px;border-bottom:1px solid ${muted}}}
@media(max-width:760px){HOST [data-part="masthead"]{align-items:flex-start;flex-direction:column;gap:15px}HOST [data-part="page"]{padding-top:20px}HOST [data-part="edition"]{border-left:3px solid ${accent};padding-left:12px}
HOST [data-part="navigation"]{gap:15px}HOST [data-part="footer"]{flex-direction:column;gap:10px}}
`;
    return rules.replaceAll("HOST", s);
}
export const mount: Mount<PolarExpeditionProps> = (host, initial = {}) => {
    let props: PolarExpeditionProps = { ...defaults, ...initial };
    const sheet = scope(host);
    const attributes = hostAttributes(host);
    attributes.set("role", "region");
    attributes.set("aria-label", props.title.replaceAll("\n", " "));
    const root = polarExpeditionNode(host, "div", "page");
    const N = polarExpeditionNode;
    const D = polarExpeditionDiagram;
    type Mark = polarExpeditionMark;
    const ids = [nextId("polar-expedition-section"), nextId("polar-expedition-section"), nextId("polar-expedition-section")];
    const header = N(root, "header", "masthead");
    const editionNode = N(header, "p", "edition", props.edition);
    const nav = N(header, "nav", "navigation");
    nav.setAttribute("aria-label", "Page sections");
    ["Route", "Specimens", "Dispatches"].forEach((label, i) => {
        const link = N(nav, "a", "", label);
        link.setAttribute("href", `#${ids[i]}`);
    });
    const cover = N(root, "section", "cover");
    cover.id = ids[0]!;
    const headline = N(cover, "div", "headline");
    N(headline, "p", "label", "AN EXPEDITION IN ATTENTION / 81° N");
    const titleNode = N(headline, "h1", "title", props.title);
    const descriptionNode = N(headline, "p", "deck", props.description);
    const map = N(cover, "figure", "route");
    D(map, "0 0 500 430", [["path", { d: "M10 160Q130 30 270 140T490 65M0 230Q115 95 260 200T500 135M0 310Q130 175 275 260T500 215M20 395Q150 260 290 330T490 300" }], ["path", { d: "M75 365L178 278 222 188 336 131 390 64", "stroke-width": "2", "stroke-dasharray": "6 5" }], ...[[75, 365], [178, 278], [222, 188], [336, 131], [390, 64]].map(([cx, cy]) => ["circle", { cx: String(cx), cy: String(cy), r: "6", fill: "currentColor" }] as Mark), ["path", { d: "M452 360V304M444 314L452 304 460 314M32 401H132M32 396V406M132 396V406" }]]);
    N(map, "figcaption", "label", "FIVE STATIONS / 42 KM / NORTH ↑");
    const record = N(root, "section", "record");
    record.id = ids[1]!;
    const rid = N(record, "div", "recordtitle");
    N(rid, "p", "label", "COLLECTION RECORD / 03 ITEMS");
    N(rid, "h2", "sectiontitle", "Small evidence\nof a vast place.");
    const specimens = N(record, "div", "specimens");
    for (const [code, name, where, text] of [["S–01", "Wind-polished stone", "STATION 02 / WEST MORAINE", "One face smooth, one face rough. The exposed edge shows the prevailing wind better than our compass notes."], ["S–02", "Ice core fragment", "STATION 03 / RIDGE SHELF", "Three clear layers separated by a thin band of trapped air. Photographed in place, then returned to the shelf."], ["S–03", "Lichen trace", "STATION 05 / RETURN POINT", "A small colony on the sheltered side of a boulder. Its presence changes our sense of what can endure here."]]) {
        const s = N(specimens, "article", "specimen");
        N(s, "p", "code", code);
        const c = N(s, "div", "");
        N(c, "h3", "", name);
        N(c, "p", "label", where);
        N(c, "p", "copy", text);
    }
    const dispatch = N(root, "section", "dispatches");
    dispatch.id = ids[2]!;
    N(dispatch, "h2", "sectiontitle", "From the field");
    const dg = N(dispatch, "div", "dispatchgrid");
    for (const [n, day, title, copy] of [["01", "04 OCT / 07:40", "A line to follow", "We laid the first markers before the light rose. From camp, they look less like a route than a sentence waiting to be finished."], ["02", "06 OCT / 13:10", "The sound of stillness", "The wind stopped at noon. We could hear the buckles on each other’s packs. For six minutes, the place seemed almost close."], ["03", "08 OCT / 16:25", "Weather turns", "Cloud crossed the ridge faster than expected. We ended the survey with one station unrecorded. The blank belongs in the notebook."], ["04", "09 OCT / 09:05", "The return", "Our own footprints had softened overnight. The markers held. We reached camp with three specimens and a better question."]]) {
        const c = N(dg, "article", "dispatch");
        N(c, "p", "label", n + " / " + day);
        N(c, "h3", "", title);
        N(c, "p", "copy", copy);
    }
    const final = N(root, "p", "closing", "What we brought back was not a claim on the place. It was a record of having paid attention.");
    final.setAttribute("role", "note");
    const supplement = N(root, "section", "supplement");
    const button = N(supplement, "button", "note-toggle", "Read the field safety note");
    button.setAttribute("type", "button");
    const noteId = nextId("polar-expedition-note");
    button.setAttribute("aria-controls", noteId);
    button.setAttribute("aria-expanded", "false");
    const note = N(supplement, "div", "note-body");
    note.id = noteId;
    note.hidden = true;
    N(note, "h3", "", "The rule of the return route");
    N(note, "p", "copy", "At each station the team marks a return bearing before beginning observations. If visibility falls below the next marker, work stops and the party returns together. A specimen is never worth losing the route home.");
    const emit = emitter<PolarExpeditionEvents>(host);
    const toggle = (): void => {
        note.hidden = !note.hidden;
        button.setAttribute("aria-expanded", String(!note.hidden));
        emit("reveal", { expanded: !note.hidden });
    };
    button.addEventListener("click", toggle);
    const footer = N(root, "footer", "footer");
    N(footer, "span", "", "ORIGINAL FIELD STUDY / PICAGRAM");
    N(footer, "span", "", "END OF RECORD / 2026");
    sheet.setRules(polarExpeditionRules(sheet.selector));
    attributes.set("data-pica-ready", "true");
    let destroyed = false;
    return {
        update(next) {
            if (destroyed)
                return;
            props = { ...props, ...next };
            titleNode.textContent = props.title;
            descriptionNode.textContent = props.description;
            editionNode.textContent = props.edition;
            attributes.set("aria-label", props.title.replaceAll("\n", " "));
        },
        destroy() {
            if (destroyed)
                return;
            destroyed = true;
            button.removeEventListener("click", toggle);
            root.remove();
            sheet.destroy();
            attributes.restore();
        },
    };
};

// registry/sections/polar-expedition/index.tsx
export type PolarExpeditionComponentProps = Partial<PolarExpeditionProps> & WrapperProps & Handlers<PolarExpeditionEvents>;
/** A polar field notebook with a route topology, specimen annotations, dispatches, and expedition details. */
export function PolarExpedition({ className, style, palette, ...props }: PolarExpeditionComponentProps) {
    const ref = usePica(mount, props);
    return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}/>;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Polar Expedition · polar-expedition
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en" data-stage="flow">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Polar Expedition · Pica</title>
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
var PicaPolarExpedition = (() => {
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

  // registry/sections/polar-expedition/core.ts
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

  // lib/font.ts
  var GRID_FONT = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

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

  // lib/events.ts
  function eventType(name) {
    return `pica:${name.toLowerCase()}`;
  }
  function emitter(host) {
    return (name, detail) => {
      host.dispatchEvent(new CustomEvent(eventType(name), { detail, bubbles: false }));
    };
  }

  // registry/sections/polar-expedition/core.ts
  var defaults = {
    "title": "At the edge\nof the known.",
    "description": "Route notes, collected specimens and four dispatches from the fictional White Reach expedition.",
    "edition": "WHITE REACH / FIELD NOTEBOOK 09"
  };
  function polarExpeditionNode(parent, tag, part, text) {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    if (part)
      node.dataset.part = part;
    if (text !== void 0)
      node.textContent = text;
    parent.append(node);
    return node;
  }
  function polarExpeditionDiagram(parent, box, marks) {
    const drawing = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    drawing.setAttribute("data-pica", "");
    drawing.setAttribute("viewBox", box);
    drawing.setAttribute("aria-hidden", "true");
    drawing.setAttribute("fill", "none");
    drawing.setAttribute("stroke", "currentColor");
    drawing.setAttribute("stroke-width", "1");
    for (const [tag, attrs] of marks) {
      const mark = document.createElementNS("http://www.w3.org/2000/svg", tag);
      mark.setAttribute("data-pica", "");
      for (const [key, value] of Object.entries(attrs))
        mark.setAttribute(key, value);
      drawing.append(mark);
    }
    parent.append(drawing);
  }
  function polarExpeditionRules(s) {
    const fg = cssVar("fg");
    const muted = cssVar("muted");
    const accent = cssVar("accent");
    const rules = `
:where(HOST){min-height:100vh}
HOST{color:${fg};background:${cssVar("bg")};position:relative;box-sizing:border-box}
HOST [data-part="page"]{max-width:1200px;margin:0 auto;padding:28px clamp(22px,5vw,65px) 24px;box-sizing:border-box}
HOST [data-pica]{box-sizing:border-box;min-width:0}
HOST h1{overflow-wrap:anywhere}
HOST h1,HOST h2,HOST h3,HOST p,HOST figure,HOST dl,HOST dd,HOST blockquote{margin:0}
HOST [data-part="masthead"]{display:flex;justify-content:space-between;align-items:center;gap:25px;border-top:3px solid ${fg};border-bottom:1px solid ${fg};padding:17px 0}
HOST [data-part="label"],HOST [data-part="edition"]{font-family:${GRID_FONT};font-size:.7rem;line-height:1.7;letter-spacing:.035em;white-space:pre-line}
HOST [data-part="edition"]{border-left:3px solid ${accent};padding-left:12px}
HOST [data-part="navigation"]{display:flex;flex-wrap:wrap;gap:18px}
HOST a{color:${fg};text-decoration:none;font-family:${GRID_FONT};font-size:.7rem;line-height:1.5;border-bottom:1px solid ${muted};padding-bottom:3px}
HOST a:focus-visible,HOST button:focus-visible{outline:2px solid ${accent};outline-offset:4px}
HOST [data-part="sectiontitle"]{font-size:clamp(1.7rem,2.8vw,2.5rem);font-weight:450;line-height:1.12;letter-spacing:-.035em;margin-bottom:24px}
HOST [data-part="copy"]{font-size:1rem;line-height:1.65}
HOST [data-part="supplement"]{margin:38px 0 32px;border-top:1px solid ${muted};border-bottom:1px solid ${muted}}
HOST [data-part="note-toggle"]{appearance:none;display:flex;align-items:center;justify-content:space-between;gap:20px;width:100%;padding:20px 0;border:0;background:transparent;color:${fg};font:inherit;font-size:.95rem;text-align:left;cursor:pointer}
HOST [data-part="note-toggle"]::after{content:"+";font-family:${GRID_FONT};font-size:1.4rem;color:${accent}}
HOST [data-part="note-toggle"][aria-expanded="true"]::after{content:"−"}
HOST [data-part="note-body"]{padding:0 0 25px;max-width:760px}
HOST [data-part="note-body"] h3{font-weight:500;font-size:1.3rem;margin:5px 0 15px}
HOST [data-part="footer"]{display:flex;justify-content:space-between;gap:20px;font-family:${GRID_FONT};font-size:.64rem;letter-spacing:.03em;line-height:1.6}
HOST [data-part="cover"]{display:grid;grid-template-columns:1fr 1fr;gap:65px;padding:48px 0 60px;align-items:center}HOST [data-part="title"]{font-size:clamp(3.4rem,6.5vw,6.2rem);font-weight:450;letter-spacing:-.05em;line-height:1;white-space:pre-line;margin:26px 0}HOST [data-part="deck"]{font-size:1.08rem;line-height:1.7;max-width:38ch}HOST [data-part="route"]{border:1px solid ${muted};padding:20px;margin:0}HOST [data-part="route"] svg{width:100%;height:auto}HOST [data-part="route"] figcaption{border-top:1px solid ${muted};padding-top:18px;font-size:.67rem}HOST [data-part="record"]{display:grid;grid-template-columns:.8fr 1.7fr;gap:65px;border-top:1px solid ${fg};padding:35px 0 50px}HOST [data-part="recordtitle"] h2{white-space:pre-line;margin-top:24px}HOST [data-part="specimen"]{display:grid;grid-template-columns:70px 1fr;gap:22px;padding:25px 0;border-bottom:1px solid ${muted}}HOST [data-part="code"]{font-family:${GRID_FONT};font-size:1.1rem}HOST [data-part="specimen"] h3{font-size:1.35rem;font-weight:500;margin-bottom:10px}HOST [data-part="specimen"] [data-part="copy"]{margin-top:15px}HOST [data-part="dispatches"]{border-top:1px solid ${fg};padding-top:35px}HOST [data-part="dispatchgrid"]{display:grid;grid-template-columns:repeat(4,1fr);gap:28px;margin:30px 0}HOST [data-part="dispatch"]{border-left:1px solid ${muted};padding-left:20px}HOST [data-part="dispatch"] h3{font-weight:500;font-size:1.2rem;line-height:1.3;margin:20px 0 12px}HOST [data-part="closing"]{font-size:clamp(1.5rem,2.6vw,2.25rem);line-height:1.35;max-width:700px;margin:55px 0 40px;letter-spacing:-.025em}@media(max-width:1000px){HOST [data-part="dispatchgrid"]{grid-template-columns:repeat(2,1fr)}}
@media(max-width:760px){HOST [data-part="cover"]{grid-template-columns:1fr;gap:32px;padding-top:32px}HOST [data-part="route"]{max-width:470px;justify-self:center}HOST [data-part="record"]{grid-template-columns:1fr;gap:20px}HOST [data-part="specimen"]{grid-template-columns:52px 1fr;gap:15px}HOST [data-part="dispatchgrid"]{grid-template-columns:repeat(2,1fr);gap:28px 22px}HOST [data-part="dispatch"]{padding-left:12px}}@media(max-width:430px){HOST [data-part="dispatchgrid"]{grid-template-columns:1fr}HOST [data-part="dispatch"]{padding-bottom:20px;border-bottom:1px solid ${muted}}}
@media(max-width:760px){HOST [data-part="masthead"]{align-items:flex-start;flex-direction:column;gap:15px}HOST [data-part="page"]{padding-top:20px}HOST [data-part="edition"]{border-left:3px solid ${accent};padding-left:12px}
HOST [data-part="navigation"]{gap:15px}HOST [data-part="footer"]{flex-direction:column;gap:10px}}
`;
    return rules.replaceAll("HOST", s);
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    const sheet = scope(host);
    const attributes = hostAttributes(host);
    attributes.set("role", "region");
    attributes.set("aria-label", props.title.replaceAll("\n", " "));
    const root = polarExpeditionNode(host, "div", "page");
    const N = polarExpeditionNode;
    const D = polarExpeditionDiagram;
    const ids = [nextId("polar-expedition-section"), nextId("polar-expedition-section"), nextId("polar-expedition-section")];
    const header = N(root, "header", "masthead");
    const editionNode = N(header, "p", "edition", props.edition);
    const nav = N(header, "nav", "navigation");
    nav.setAttribute("aria-label", "Page sections");
    ["Route", "Specimens", "Dispatches"].forEach((label, i) => {
      const link = N(nav, "a", "", label);
      link.setAttribute("href", `#${ids[i]}`);
    });
    const cover = N(root, "section", "cover");
    cover.id = ids[0];
    const headline = N(cover, "div", "headline");
    N(headline, "p", "label", "AN EXPEDITION IN ATTENTION / 81° N");
    const titleNode = N(headline, "h1", "title", props.title);
    const descriptionNode = N(headline, "p", "deck", props.description);
    const map = N(cover, "figure", "route");
    D(map, "0 0 500 430", [["path", { d: "M10 160Q130 30 270 140T490 65M0 230Q115 95 260 200T500 135M0 310Q130 175 275 260T500 215M20 395Q150 260 290 330T490 300" }], ["path", { d: "M75 365L178 278 222 188 336 131 390 64", "stroke-width": "2", "stroke-dasharray": "6 5" }], ...[[75, 365], [178, 278], [222, 188], [336, 131], [390, 64]].map(([cx, cy]) => ["circle", { cx: String(cx), cy: String(cy), r: "6", fill: "currentColor" }]), ["path", { d: "M452 360V304M444 314L452 304 460 314M32 401H132M32 396V406M132 396V406" }]]);
    N(map, "figcaption", "label", "FIVE STATIONS / 42 KM / NORTH ↑");
    const record = N(root, "section", "record");
    record.id = ids[1];
    const rid = N(record, "div", "recordtitle");
    N(rid, "p", "label", "COLLECTION RECORD / 03 ITEMS");
    N(rid, "h2", "sectiontitle", "Small evidence\nof a vast place.");
    const specimens = N(record, "div", "specimens");
    for (const [code, name, where, text] of [["S–01", "Wind-polished stone", "STATION 02 / WEST MORAINE", "One face smooth, one face rough. The exposed edge shows the prevailing wind better than our compass notes."], ["S–02", "Ice core fragment", "STATION 03 / RIDGE SHELF", "Three clear layers separated by a thin band of trapped air. Photographed in place, then returned to the shelf."], ["S–03", "Lichen trace", "STATION 05 / RETURN POINT", "A small colony on the sheltered side of a boulder. Its presence changes our sense of what can endure here."]]) {
      const s = N(specimens, "article", "specimen");
      N(s, "p", "code", code);
      const c = N(s, "div", "");
      N(c, "h3", "", name);
      N(c, "p", "label", where);
      N(c, "p", "copy", text);
    }
    const dispatch = N(root, "section", "dispatches");
    dispatch.id = ids[2];
    N(dispatch, "h2", "sectiontitle", "From the field");
    const dg = N(dispatch, "div", "dispatchgrid");
    for (const [n, day, title, copy] of [["01", "04 OCT / 07:40", "A line to follow", "We laid the first markers before the light rose. From camp, they look less like a route than a sentence waiting to be finished."], ["02", "06 OCT / 13:10", "The sound of stillness", "The wind stopped at noon. We could hear the buckles on each other’s packs. For six minutes, the place seemed almost close."], ["03", "08 OCT / 16:25", "Weather turns", "Cloud crossed the ridge faster than expected. We ended the survey with one station unrecorded. The blank belongs in the notebook."], ["04", "09 OCT / 09:05", "The return", "Our own footprints had softened overnight. The markers held. We reached camp with three specimens and a better question."]]) {
      const c = N(dg, "article", "dispatch");
      N(c, "p", "label", n + " / " + day);
      N(c, "h3", "", title);
      N(c, "p", "copy", copy);
    }
    const final = N(root, "p", "closing", "What we brought back was not a claim on the place. It was a record of having paid attention.");
    final.setAttribute("role", "note");
    const supplement = N(root, "section", "supplement");
    const button = N(supplement, "button", "note-toggle", "Read the field safety note");
    button.setAttribute("type", "button");
    const noteId = nextId("polar-expedition-note");
    button.setAttribute("aria-controls", noteId);
    button.setAttribute("aria-expanded", "false");
    const note = N(supplement, "div", "note-body");
    note.id = noteId;
    note.hidden = true;
    N(note, "h3", "", "The rule of the return route");
    N(note, "p", "copy", "At each station the team marks a return bearing before beginning observations. If visibility falls below the next marker, work stops and the party returns together. A specimen is never worth losing the route home.");
    const emit = emitter(host);
    const toggle = () => {
      note.hidden = !note.hidden;
      button.setAttribute("aria-expanded", String(!note.hidden));
      emit("reveal", { expanded: !note.hidden });
    };
    button.addEventListener("click", toggle);
    const footer = N(root, "footer", "footer");
    N(footer, "span", "", "ORIGINAL FIELD STUDY / PICAGRAM");
    N(footer, "span", "", "END OF RECORD / 2026");
    sheet.setRules(polarExpeditionRules(sheet.selector));
    attributes.set("data-pica-ready", "true");
    let destroyed = false;
    return {
      update(next) {
        if (destroyed)
          return;
        props = { ...props, ...next };
        titleNode.textContent = props.title;
        descriptionNode.textContent = props.description;
        editionNode.textContent = props.edition;
        attributes.set("aria-label", props.title.replaceAll("\n", " "));
      },
      destroy() {
        if (destroyed)
          return;
        destroyed = true;
        button.removeEventListener("click", toggle);
        root.remove();
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
  var instance = PicaPolarExpedition.mount(host, take(initial));
  ["reveal"].forEach(function (name) {
    host.addEventListener("pica:" + name.toLowerCase(), function (event) {
      if (window.parent !== window) window.parent.postMessage({ type: "pica:event", name: name, detail: event.detail }, "*");
    });
  });
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
