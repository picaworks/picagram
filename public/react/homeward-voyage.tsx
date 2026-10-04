"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Homeward Voyage · homeward-voyage
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

// registry/sections/homeward-voyage/core.ts
export interface HomewardVoyageProps {
    /** The page headline. Line breaks preserve the editorial composition. */
    title: string;
    /** Introductory copy beneath the headline. */
    description: string;
    /** The archive or programme label in the masthead. */
    edition: string;
}
export interface HomewardVoyageEvents {
    /** Reports the reader opening or closing the supplementary note. */
    reveal: { expanded: boolean };
}
export const defaults: HomewardVoyageProps = {
    "title": "The long way\nhome.",
    "description": "A voyage in five crossings. An account of leaving, losing the route, and learning to return.",
    "edition": "THE HOMEWARD PAPERS / VOLUME I"
};
type homewardVoyageMark = readonly [
    string,
    Record<string, string>
];
function homewardVoyageNode(parent: Element, tag: keyof HTMLElementTagNameMap, part: string, text?: string): HTMLElement {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    if (part)
        node.dataset.part = part;
    if (text !== undefined)
        node.textContent = text;
    parent.append(node);
    return node;
}
function homewardVoyageDiagram(parent: Element, box: string, marks: readonly homewardVoyageMark[]): void {
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
function homewardVoyageRules(s: string): string {
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
HOST [data-part="title"],HOST [data-part="chaptertitle"],HOST [data-part="prose"],HOST [data-part="quote"]{font-family:var(--pica-font-serif,Georgia,serif)}
HOST [data-part="lead"]{padding:58px 0 20px;max-width:820px}HOST [data-part="title"]{font-size:clamp(4rem,9vw,8.5rem);font-weight:400;line-height:.97;letter-spacing:-.06em;white-space:pre-line;margin-top:28px}HOST [data-part="deck"]{max-width:40ch;line-height:1.7;font-size:1.15rem;margin-top:28px}HOST [data-part="coast"]{margin:10px 0 60px}HOST [data-part="coast"] svg{width:100%;height:auto;color:${muted}}HOST [data-part="coast"] figcaption{font-size:.65rem;letter-spacing:.1em;text-align:center}HOST [data-part="story"]{display:grid;grid-template-columns:1fr 2.2fr;gap:70px;border-top:1px solid ${fg};padding-top:50px}HOST [data-part="chapter"]{border-top:1px solid ${muted};margin-top:55px;padding-top:30px}
HOST [data-part="chapterindex"]{position:sticky;top:24px;align-self:start;border-right:1px solid ${muted};padding-right:36px}HOST [data-part="indexrow"]{display:flex;gap:22px;padding:18px 0;border-bottom:1px solid ${muted};font-size:.85rem}HOST [data-part="indexrow"] span:first-child{width:20px;font-family:${GRID_FONT}}HOST [data-part="reading"]{max-width:650px;padding-right:8%}HOST [data-part="chaptertitle"]{font-size:clamp(2rem,3.5vw,3rem);font-weight:400;line-height:1.15;letter-spacing:-.035em;white-space:pre-line;margin:24px 0 32px}HOST [data-part="prose"]{font-size:1.08rem;line-height:1.9;margin:22px 0}HOST [data-part="quote"]{white-space:pre-line;font-size:2rem;line-height:1.3;margin:45px 0;padding-left:25px;border-left:3px solid ${accent}}HOST [data-part="notes"]{border-top:1px solid ${fg};margin-top:70px;padding-top:28px}HOST [data-part="notesgrid"]{display:grid;grid-template-columns:1.2fr 1.3fr 1fr;gap:40px;padding-top:25px}HOST [data-part="sectiontitle"]{white-space:pre-line}@media(max-width:760px){HOST [data-part="story"]{grid-template-columns:1fr;gap:36px}HOST [data-part="chapter"]{border-top:1px solid ${muted};margin-top:55px;padding-top:30px}
HOST [data-part="chapterindex"]{position:static;top:auto;align-self:start;border-right:0;padding-right:0}HOST [data-part="indexrow"]{padding:10px 0}HOST [data-part="reading"]{padding-right:0}HOST [data-part="coast"]{margin-bottom:35px}HOST [data-part="notesgrid"]{grid-template-columns:1fr;gap:22px}}
@media(max-width:760px){HOST [data-part="masthead"]{align-items:flex-start;flex-direction:column;gap:15px}HOST [data-part="page"]{padding-top:20px}HOST [data-part="edition"]{border-left:3px solid ${accent};padding-left:12px}
HOST [data-part="navigation"]{gap:15px}HOST [data-part="footer"]{flex-direction:column;gap:10px}}
`;
    return rules.replaceAll("HOST", s);
}
export const mount: Mount<HomewardVoyageProps> = (host, initial = {}) => {
    let props: HomewardVoyageProps = { ...defaults, ...initial };
    const sheet = scope(host);
    const attributes = hostAttributes(host);
    attributes.set("role", "region");
    attributes.set("aria-label", props.title.replaceAll("\n", " "));
    const root = homewardVoyageNode(host, "div", "page");
    const N = homewardVoyageNode;
    const D = homewardVoyageDiagram;
    type Mark = homewardVoyageMark;
    const ids = [nextId("homeward-voyage-section"), nextId("homeward-voyage-section"), nextId("homeward-voyage-section")];
    const header = N(root, "header", "masthead");
    const editionNode = N(header, "p", "edition", props.edition);
    const nav = N(header, "nav", "navigation");
    nav.setAttribute("aria-label", "Page sections");
    ["The crossing", "Chapters", "Reading notes"].forEach((label, i) => {
        const link = N(nav, "a", "", label);
        link.setAttribute("href", `#${ids[i]}`);
    });
    const lead = N(root, "section", "lead");
    lead.id = ids[0]!;
    N(lead, "p", "label", "AN ORIGINAL VOYAGE / 5 CHAPTERS");
    const titleNode = N(lead, "h1", "title", props.title);
    const descriptionNode = N(lead, "p", "deck", props.description);
    const map = N(root, "figure", "coast");
    D(map, "0 0 1000 250", [["path", { d: "M0 170L65 162 89 189 126 180 139 211 194 190 223 205 259 176 301 185 319 144 367 155 391 110 430 135 469 124 487 158 535 129 567 161 603 131 647 140 666 101 694 121 737 90 774 106 805 66 861 75 896 48 936 73 1000 45", "stroke-width": "2" }], ["path", { d: "M62 115C270 15 348 76 485 63S756 210 927 120", "stroke-dasharray": "5 8" }], ...[[62, 115], [280, 56], [485, 63], [715, 145], [927, 120]].map(([cx, cy]) => ["circle", { cx: String(cx), cy: String(cy), r: "6", fill: "currentColor" }] as Mark)]);
    N(map, "figcaption", "label", "DEPARTURE → OPEN WATER → RETURN");
    const story = N(root, "section", "story");
    story.id = ids[1]!;
    const chapterIds = Array.from({ length: 5 }, () => nextId("homeward-voyage-chapter"));
    const side = N(story, "aside", "chapterindex");
    N(side, "p", "label", "CONTENTS");
    for (const [index, [num, t]] of [["I", "The harbour"], ["II", "A borrowed wind"], ["III", "No familiar stars"], ["IV", "The other shore"], ["V", "A light left on"]].entries()) {
        const row = N(side, "a", "indexrow");
        row.setAttribute("href", `#${chapterIds[index]}`);
        N(row, "span", "", num);
        N(row, "span", "", t);
    }
    const column = N(story, "div", "reading");
    const firstChapter = N(column, "section", "firstchapter");
    firstChapter.id = chapterIds[0]!;
    N(firstChapter, "p", "label", "CHAPTER I / THE HARBOUR");
    N(firstChapter, "h2", "chaptertitle", "You can leave a place.\nIt takes longer to leave\na life.");
    N(firstChapter, "p", "prose", "At first light, the harbour was all ropes and small sounds. A gull stepped between the fish boxes. Somewhere behind the warehouses, a kettle began to sing. These were the things I thought I would forget.");
    N(firstChapter, "p", "prose", "I had packed the map twice and the photograph once. The boat held less than I had expected: a spare shirt, a tin cup, a coil of line. It seemed an impossible arrangement for carrying a whole person into the unknown.");
    const quote = N(firstChapter, "blockquote", "quote", "“The sea offered no promise.\nOnly room.”");
    quote.setAttribute("aria-label", "The sea offered no promise. Only room.");
    N(firstChapter, "p", "prose", "By noon the headland was gone. I looked back at the empty horizon and understood, for the first time, that a departure is not a single act. It is a hundred small refusals to turn around.");
    const chapter2 = N(column, "section", "chapter");
    chapter2.id = chapterIds[1]!;
    N(chapter2, "p", "label", "CHAPTER II / A BORROWED WIND");
    N(chapter2, "h2", "chaptertitle", "A direction is not\nalways a decision.");
    N(chapter2, "p", "prose", "For three days the wind came from the west. I let it choose the course and called that courage. In the evenings, I studied the map as though certainty might appear if I held the paper closer to the lamp.");
    N(chapter2, "p", "prose", "On the fourth morning, the sail fell quiet. The boat turned slowly in its own reflection. I took out the oars. There was no grand revelation, only the plain weight of water against wood. At last the motion belonged to me.");
    const chapter3 = N(column, "section", "chapter");
    chapter3.id = chapterIds[2]!;
    N(chapter3, "p", "label", "CHAPTER III / NO FAMILIAR STARS");
    N(chapter3, "h2", "chaptertitle", "The dark makes\nits own country.");
    N(chapter3, "p", "prose", "The storm arrived after midnight. I lashed the cup to the rail and sat with my back against the cabin door. Every sound seemed to announce an ending. By dawn, only one rope had broken. I had been afraid of a hundred things that never happened.");
    N(chapter3, "p", "prose", "That night the clouds cleared. The stars were unfamiliar, but their distance was the same. I stopped searching for the pattern I knew and began to learn the one above me. For the first time since leaving, I slept without the map beside my hand.");
    const chapter4 = N(column, "section", "chapter");
    chapter4.id = chapterIds[3]!;
    N(chapter4, "p", "label", "CHAPTER IV / THE OTHER SHORE");
    N(chapter4, "h2", "chaptertitle", "A stranger can\nleave the light on.");
    N(chapter4, "p", "prose", "The village had no harbour wall. A woman in a blue apron helped me pull the boat onto the sand, then pointed toward a room above the bakery. We had no language in common. By supper, I knew where the cups were kept.");
    N(chapter4, "p", "prose", "I stayed until the repaired sail was dry. Each morning I carried bread to the landing. Each evening someone asked, with a gesture, whether I would leave tomorrow. The last time, I nodded. It was a different kind of departure: I had learned that leaving need not mean refusing to belong.");
    const chapter5 = N(column, "section", "chapter");
    chapter5.id = chapterIds[4]!;
    N(chapter5, "p", "label", "CHAPTER V / A LIGHT LEFT ON");
    N(chapter5, "h2", "chaptertitle", "Home is a place\nyou enter again.");
    N(chapter5, "p", "prose", "At dusk I saw the headland. The houses rose one by one from the horizon, smaller than memory had made them. I waited outside the harbour until the first window brightened. Then I turned the boat toward shore.");
    N(chapter5, "p", "prose", "The gulls were still arguing over the fish boxes. A kettle sang behind the warehouses. I tied the line, took the photograph from my bag, and stood for a while beside the boat. Nothing had waited unchanged. That was the gift. There was room here for the person who had returned.");
    const notes = N(root, "section", "notes");
    notes.id = ids[2]!;
    N(notes, "p", "label", "READING THE VOYAGE");
    const ng = N(notes, "div", "notesgrid");
    N(ng, "h2", "sectiontitle", "Every return\nchanges the shore.");
    N(ng, "p", "copy", "Read a chapter in one sitting, then let it settle. The story’s five crossings follow departure, doubt, estrangement, recognition and return. The final harbour is familiar; the person entering it is not.");
    N(ng, "p", "label", "READING TIME / 6 MIN\nFORM / LITERARY FICTION\nEDITION / AUTUMN 2026");
    const supplement = N(root, "section", "supplement");
    const button = N(supplement, "button", "note-toggle", "Open the navigator’s note");
    button.setAttribute("type", "button");
    const noteId = nextId("homeward-voyage-note");
    button.setAttribute("aria-controls", noteId);
    button.setAttribute("aria-expanded", "false");
    const note = N(supplement, "div", "note-body");
    note.id = noteId;
    note.hidden = true;
    N(note, "h3", "", "On the unreliable map");
    N(note, "p", "copy", "The route shown here is an imagined coastline. It follows the emotional geography of the story rather than a navigable sea. Each harbour stands for a decision, and every crossing has a cost.");
    const emit = emitter<HomewardVoyageEvents>(host);
    const toggle = (): void => {
        note.hidden = !note.hidden;
        button.setAttribute("aria-expanded", String(!note.hidden));
        emit("reveal", { expanded: !note.hidden });
    };
    button.addEventListener("click", toggle);
    const footer = N(root, "footer", "footer");
    N(footer, "span", "", "ORIGINAL FIELD STUDY / PICAGRAM");
    N(footer, "span", "", "END OF RECORD / 2026");
    sheet.setRules(homewardVoyageRules(sheet.selector));
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

// registry/sections/homeward-voyage/index.tsx
export type HomewardVoyageComponentProps = Partial<HomewardVoyageProps> & WrapperProps & Handlers<HomewardVoyageEvents>;
/** A coastal return narrative with a chapter route, intimate reading column, and voyage notes. */
export function HomewardVoyage({ className, style, palette, ...props }: HomewardVoyageComponentProps) {
    const ref = usePica(mount, props);
    return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}/>;
}
