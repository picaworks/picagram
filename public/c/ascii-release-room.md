# Release room

> A software release page with a character branch graph, version selection and compatibility notes.

Category: ascii. Tags: layout, software, releases. Static. Size: 3.4 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/ascii-release-room.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | string | `"Relay / release room"` | The software project name. |
| `intro` | string | `"A small document transformer for predictable build pipelines. Review the published versions, runtime support and migration notes before upgrading."` | The project purpose. |
| `versions` | { version: string; date: string; runtime: string; status: string; notes: string[] }[] | `[{"version":"2.4.0","date":"03 OCT 2026","runtime":"Node 22 and 24","status":"Current stable","notes":["Add deterministic field ordering to exported documents.","Preserve empty metadata when importing older records.","No configuration migration is required from 2.3."]},{"version":"2.3.1","date":"14 SEP 2026","runtime":"Node 22 and 24","status":"Maintenance","notes":["Correct line endings in plain-text exports.","Use the 2.3 configuration schema; no new flags."]},{"version":"1.9.8","date":"09 AUG 2026","runtime":"Node 20 and 22","status":"Legacy support","notes":["Final maintenance release for the version 1 schema.","Export your settings before migrating to version 2."]}]` | Published versions and their compatibility facts. |

## Colors

Draws with `--pica-fg`, `--pica-bg`, `--pica-accent`, `--pica-muted`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Release room · ascii-release-room
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

// registry/ascii/ascii-release-room/core.ts
export interface AsciiReleaseRoomProps {
  /** The software project name. */
  title: string;
  /** The project purpose. */
  intro: string;
  /** Published versions and their compatibility facts. */
  versions: { version: string; date: string; runtime: string; status: string; notes: string[] }[];
}
export const defaults: AsciiReleaseRoomProps = {
  "title": "Relay / release room",
  "intro": "A small document transformer for predictable build pipelines. Review the published versions, runtime support and migration notes before upgrading.",
  "versions": [
    {
      "version": "2.4.0",
      "date": "03 OCT 2026",
      "runtime": "Node 22 and 24",
      "status": "Current stable",
      "notes": [
        "Add deterministic field ordering to exported documents.",
        "Preserve empty metadata when importing older records.",
        "No configuration migration is required from 2.3."
      ]
    },
    {
      "version": "2.3.1",
      "date": "14 SEP 2026",
      "runtime": "Node 22 and 24",
      "status": "Maintenance",
      "notes": [
        "Correct line endings in plain-text exports.",
        "Use the 2.3 configuration schema; no new flags."
      ]
    },
    {
      "version": "1.9.8",
      "date": "09 AUG 2026",
      "runtime": "Node 20 and 22",
      "status": "Legacy support",
      "notes": [
        "Final maintenance release for the version 1 schema.",
        "Export your settings before migrating to version 2."
      ]
    }
  ]
};

export const mount: Mount<AsciiReleaseRoomProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  const id = nextId("pica-ascii-system");
  attrs.set("data-pica-id", id);
  const sheet = document.createElement("style"); sheet.setAttribute("data-pica", ""); host.append(sheet);
  const s = `[data-pica-id="${id}"]`;
  sheet.textContent = `${s}{color:${cssVar("fg")};background:${cssVar("bg")};font:inherit;line-height:1.6}
${s} [data-root]{max-width:1120px;margin:auto;padding:clamp(20px,4vw,52px);box-sizing:border-box}
${s} *{box-sizing:border-box}
${s} h1{font-size:clamp(32px,5vw,64px);line-height:1.05;font-weight:500;letter-spacing:-.035em;margin:16px 0 24px;max-width:16ch}
${s} h2{font-size:20px;font-weight:500;margin:0 0 16px}
${s} h3{font-size:16px;font-weight:500;margin:0 0 8px}
${s} p{margin:0 0 16px;max-width:65ch}
${s} [data-kicker],${s} dt,${s} button,${s} select,${s} summary,${s} [data-mono]{font-family:${GRID_FONT};font-size:12px;letter-spacing:.04em}
${s} [data-kicker]{text-transform:uppercase;color:${cssVar("muted")}}
${s} pre{font-family:${GRID_FONT};font-size:13px;line-height:1.35;white-space:pre;margin:0;overflow:auto}
${s} figure{margin:0}
${s} figcaption{font-family:${GRID_FONT};font-size:11px;color:${cssVar("muted")};margin-top:16px}
${s} button,${s} select{color:inherit;background:${cssVar("bg")};border:1px solid ${cssVar("muted")};border-radius:0;padding:10px 12px;min-height:44px;cursor:pointer}
${s} button[aria-pressed="true"]{border-bottom:4px solid ${cssVar("accent")}}
${s} :focus-visible{outline:2px solid ${cssVar("accent")};outline-offset:3px}
${s} [data-rule]{border-top:1px solid ${cssVar("muted")};padding-top:24px;margin-top:32px}
${s} details{border-top:1px solid ${cssVar("muted")};padding:12px 0}
${s} summary{cursor:pointer;min-height:32px}
${s} details p{margin:12px 0}
${s} ul,${s} ol{padding-left:20px;margin:12px 0}
${s} li{margin:8px 0}
${s} dl{margin:0}
${s} dt{color:${cssVar("muted")};text-transform:uppercase}
${s} dd{margin:0 0 16px}
${s} [data-compact]{display:none}
@media(max-width:620px){${s} [data-wide]{display:none}${s} [data-compact]{display:block}${s} h1{font-size:38px}${s} pre{font-size:12px}}
${s} [data-header]{display:grid;grid-template-columns:1.3fr 1fr;gap:48px;align-items:center}
${s} [data-branch]{border-left:4px solid ${cssVar("accent")};padding:24px}
${s} [data-work]{display:grid;grid-template-columns:240px 1fr;gap:48px;border-top:1px solid ${cssVar("muted")};margin-top:40px;padding-top:32px}
${s} fieldset{border:0;padding:0;margin:0 0 32px}
${s} legend{font-family:${GRID_FONT};font-size:12px;margin-bottom:12px}
${s} [data-selector] label{display:flex;align-items:center;gap:12px;font-family:${GRID_FONT};font-size:14px;min-height:44px;padding:8px 0}
${s} input{accent-color:${cssVar("fg")};width:18px;height:18px}
${s} [data-release] h2{font-size:32px}
${s} [data-release] dl{display:grid;grid-template-columns:160px 1fr;margin-bottom:24px}
@media(max-width:760px){${s} [data-header],${s} [data-work]{grid-template-columns:1fr;gap:24px}${s} [data-release] dl{grid-template-columns:1fr}}
`;
  const root = document.createElement("div"); root.setAttribute("data-pica", ""); root.setAttribute("data-root", ""); host.append(root);
  function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = "", parent: HTMLElement = root): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag); node.setAttribute("data-pica", ""); node.textContent = text; parent.append(node); return node;
  }
  function marked<K extends keyof HTMLElementTagNameMap>(tag: K, mark: string, text = "", parent: HTMLElement = root): HTMLElementTagNameMap[K] {
    const node = el(tag, text, parent); node.setAttribute(`data-${mark}`, ""); return node;
  }
  function drawing(parent: HTMLElement, wide: string, compact: string, caption: string): void {
    const figure = el("figure", "", parent);
    marked("pre", "wide", wide, figure).setAttribute("aria-hidden", "true");
    marked("pre", "compact", compact, figure).setAttribute("aria-hidden", "true");
    el("figcaption", caption, figure);
  }
  function render(): void {
    root.replaceChildren();
    attrs.set("role", "region"); attrs.set("aria-label", props.title.trim() || "Release room"); attrs.set("aria-hidden", null);
    marked("p", "kicker", "RELAY DOCUMENT TOOLS / PROJECT REFERENCE");
    const header = marked("header", "header"); const lead = el("div", "", header); el("h1", props.title.trim() || "Release room", lead); el("p", props.intro, lead);
    const branch = marked("aside", "branch", "", header);
    drawing(branch, " main      ●────────●────────●\n           │        │        │\n stable    ├─ 2.3 ──┴─ 2.4 ──┘\n           │\n legacy    └─ 1.9 ───────────●", "main    ●──●──●\n        │  │  │\nstable  ├──┴──┘\nlegacy  └─────●", "Main feeds stable releases. The version 1 branch receives maintenance only.");
    const work = marked("section", "work"); const selector = marked("aside", "selector", "", work);
    const group = el("fieldset", "", selector); el("legend", "Published version", group);
    const name = nextId("relay-version"); let selected = 0;
    const radios: HTMLInputElement[] = [];
    props.versions.forEach((v, i) => { const label = el("label", "", group); const radio = el("input", "", label); radio.type = "radio"; radio.name = name; radio.value = String(i); radio.checked = i === 0; radios.push(radio); el("span", v.version, label); });
    marked("p", "kicker", "Support policy", selector); el("p", "Stable releases receive fixes for twelve months. Legacy releases receive critical repairs only.", selector);
    const panel = marked("article", "release", "", work); panel.setAttribute("aria-live", "polite");
    const show = (): void => { panel.replaceChildren(); const v = props.versions[selected]; if (!v) { el("h2", "No published versions", panel); el("p", "Add a version record to begin the release history.", panel); return; } panel.setAttribute("data-version", v.version); marked("p", "kicker", `${v.date} / ${v.status}`, panel); el("h2", `Release ${v.version}`, panel); const facts = el("dl", "", panel); el("dt", "Supported runtime", facts); el("dd", v.runtime, facts); el("dt", "Distribution", facts); el("dd", "Source archive and package registry", facts); el("h3", "Changes in this release", panel); const list = el("ul", "", panel); for (const note of v.notes) el("li", note, list); };
    radios.forEach((radio, i) => radio.addEventListener("change", () => { if (radio.checked) { selected = i; show(); } })); show();
    const migration = marked("section", "rule"); el("h2", "Upgrade checklist", migration); const sequence = el("ol", "", migration); for (const note of ["Save the current configuration and a representative input file.", "Check your runtime against the selected release above.", "Run a local conversion and compare the exported document."]) el("li", note, sequence);
    const detail = el("details", "", migration); el("summary", "Configuration compatibility", detail); el("p", "Version 2 accepts the version 2 schema. Version 1 settings need an explicit export and conversion before use.", detail);
    attrs.set("data-pica-ready", "true");
  }
  render();
  return {
    update(partial) { const next = { ...props, ...partial }; if (!sameJson(props, next)) { props = next; render(); } },
    destroy() { root.remove(); sheet.remove(); attrs.restore(); },
  };
};

// registry/ascii/ascii-release-room/index.tsx
export type AsciiReleaseRoomComponentProps = Partial<AsciiReleaseRoomProps> & WrapperProps;
/** A software release page with a character branch graph, version selection and compatibility notes. */
export function AsciiReleaseRoom({ className, style, palette, ...props }: AsciiReleaseRoomComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Release room · ascii-release-room
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en" data-stage="flow">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Release room · Pica</title>
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
var PicaAsciiReleaseRoom = (() => {
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

  // registry/ascii/ascii-release-room/core.ts
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

  // registry/ascii/ascii-release-room/core.ts
  var defaults = {
    "title": "Relay / release room",
    "intro": "A small document transformer for predictable build pipelines. Review the published versions, runtime support and migration notes before upgrading.",
    "versions": [
      {
        "version": "2.4.0",
        "date": "03 OCT 2026",
        "runtime": "Node 22 and 24",
        "status": "Current stable",
        "notes": [
          "Add deterministic field ordering to exported documents.",
          "Preserve empty metadata when importing older records.",
          "No configuration migration is required from 2.3."
        ]
      },
      {
        "version": "2.3.1",
        "date": "14 SEP 2026",
        "runtime": "Node 22 and 24",
        "status": "Maintenance",
        "notes": [
          "Correct line endings in plain-text exports.",
          "Use the 2.3 configuration schema; no new flags."
        ]
      },
      {
        "version": "1.9.8",
        "date": "09 AUG 2026",
        "runtime": "Node 20 and 22",
        "status": "Legacy support",
        "notes": [
          "Final maintenance release for the version 1 schema.",
          "Export your settings before migrating to version 2."
        ]
      }
    ]
  };
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    const attrs = hostAttributes(host);
    const id = nextId("pica-ascii-system");
    attrs.set("data-pica-id", id);
    const sheet = document.createElement("style");
    sheet.setAttribute("data-pica", "");
    host.append(sheet);
    const s = `[data-pica-id="${id}"]`;
    sheet.textContent = `${s}{color:${cssVar("fg")};background:${cssVar("bg")};font:inherit;line-height:1.6}
${s} [data-root]{max-width:1120px;margin:auto;padding:clamp(20px,4vw,52px);box-sizing:border-box}
${s} *{box-sizing:border-box}
${s} h1{font-size:clamp(32px,5vw,64px);line-height:1.05;font-weight:500;letter-spacing:-.035em;margin:16px 0 24px;max-width:16ch}
${s} h2{font-size:20px;font-weight:500;margin:0 0 16px}
${s} h3{font-size:16px;font-weight:500;margin:0 0 8px}
${s} p{margin:0 0 16px;max-width:65ch}
${s} [data-kicker],${s} dt,${s} button,${s} select,${s} summary,${s} [data-mono]{font-family:${GRID_FONT};font-size:12px;letter-spacing:.04em}
${s} [data-kicker]{text-transform:uppercase;color:${cssVar("muted")}}
${s} pre{font-family:${GRID_FONT};font-size:13px;line-height:1.35;white-space:pre;margin:0;overflow:auto}
${s} figure{margin:0}
${s} figcaption{font-family:${GRID_FONT};font-size:11px;color:${cssVar("muted")};margin-top:16px}
${s} button,${s} select{color:inherit;background:${cssVar("bg")};border:1px solid ${cssVar("muted")};border-radius:0;padding:10px 12px;min-height:44px;cursor:pointer}
${s} button[aria-pressed="true"]{border-bottom:4px solid ${cssVar("accent")}}
${s} :focus-visible{outline:2px solid ${cssVar("accent")};outline-offset:3px}
${s} [data-rule]{border-top:1px solid ${cssVar("muted")};padding-top:24px;margin-top:32px}
${s} details{border-top:1px solid ${cssVar("muted")};padding:12px 0}
${s} summary{cursor:pointer;min-height:32px}
${s} details p{margin:12px 0}
${s} ul,${s} ol{padding-left:20px;margin:12px 0}
${s} li{margin:8px 0}
${s} dl{margin:0}
${s} dt{color:${cssVar("muted")};text-transform:uppercase}
${s} dd{margin:0 0 16px}
${s} [data-compact]{display:none}
@media(max-width:620px){${s} [data-wide]{display:none}${s} [data-compact]{display:block}${s} h1{font-size:38px}${s} pre{font-size:12px}}
${s} [data-header]{display:grid;grid-template-columns:1.3fr 1fr;gap:48px;align-items:center}
${s} [data-branch]{border-left:4px solid ${cssVar("accent")};padding:24px}
${s} [data-work]{display:grid;grid-template-columns:240px 1fr;gap:48px;border-top:1px solid ${cssVar("muted")};margin-top:40px;padding-top:32px}
${s} fieldset{border:0;padding:0;margin:0 0 32px}
${s} legend{font-family:${GRID_FONT};font-size:12px;margin-bottom:12px}
${s} [data-selector] label{display:flex;align-items:center;gap:12px;font-family:${GRID_FONT};font-size:14px;min-height:44px;padding:8px 0}
${s} input{accent-color:${cssVar("fg")};width:18px;height:18px}
${s} [data-release] h2{font-size:32px}
${s} [data-release] dl{display:grid;grid-template-columns:160px 1fr;margin-bottom:24px}
@media(max-width:760px){${s} [data-header],${s} [data-work]{grid-template-columns:1fr;gap:24px}${s} [data-release] dl{grid-template-columns:1fr}}
`;
    const root = document.createElement("div");
    root.setAttribute("data-pica", "");
    root.setAttribute("data-root", "");
    host.append(root);
    function el(tag, text = "", parent = root) {
      const node = document.createElement(tag);
      node.setAttribute("data-pica", "");
      node.textContent = text;
      parent.append(node);
      return node;
    }
    function marked(tag, mark, text = "", parent = root) {
      const node = el(tag, text, parent);
      node.setAttribute(`data-${mark}`, "");
      return node;
    }
    function drawing(parent, wide, compact, caption) {
      const figure = el("figure", "", parent);
      marked("pre", "wide", wide, figure).setAttribute("aria-hidden", "true");
      marked("pre", "compact", compact, figure).setAttribute("aria-hidden", "true");
      el("figcaption", caption, figure);
    }
    function render() {
      root.replaceChildren();
      attrs.set("role", "region");
      attrs.set("aria-label", props.title.trim() || "Release room");
      attrs.set("aria-hidden", null);
      marked("p", "kicker", "RELAY DOCUMENT TOOLS / PROJECT REFERENCE");
      const header = marked("header", "header");
      const lead = el("div", "", header);
      el("h1", props.title.trim() || "Release room", lead);
      el("p", props.intro, lead);
      const branch = marked("aside", "branch", "", header);
      drawing(branch, " main      ●────────●────────●\n           │        │        │\n stable    ├─ 2.3 ──┴─ 2.4 ──┘\n           │\n legacy    └─ 1.9 ───────────●", "main    ●──●──●\n        │  │  │\nstable  ├──┴──┘\nlegacy  └─────●", "Main feeds stable releases. The version 1 branch receives maintenance only.");
      const work = marked("section", "work");
      const selector = marked("aside", "selector", "", work);
      const group = el("fieldset", "", selector);
      el("legend", "Published version", group);
      const name = nextId("relay-version");
      let selected = 0;
      const radios = [];
      props.versions.forEach((v, i) => {
        const label = el("label", "", group);
        const radio = el("input", "", label);
        radio.type = "radio";
        radio.name = name;
        radio.value = String(i);
        radio.checked = i === 0;
        radios.push(radio);
        el("span", v.version, label);
      });
      marked("p", "kicker", "Support policy", selector);
      el("p", "Stable releases receive fixes for twelve months. Legacy releases receive critical repairs only.", selector);
      const panel = marked("article", "release", "", work);
      panel.setAttribute("aria-live", "polite");
      const show = () => {
        panel.replaceChildren();
        const v = props.versions[selected];
        if (!v) {
          el("h2", "No published versions", panel);
          el("p", "Add a version record to begin the release history.", panel);
          return;
        }
        panel.setAttribute("data-version", v.version);
        marked("p", "kicker", `${v.date} / ${v.status}`, panel);
        el("h2", `Release ${v.version}`, panel);
        const facts = el("dl", "", panel);
        el("dt", "Supported runtime", facts);
        el("dd", v.runtime, facts);
        el("dt", "Distribution", facts);
        el("dd", "Source archive and package registry", facts);
        el("h3", "Changes in this release", panel);
        const list = el("ul", "", panel);
        for (const note of v.notes) el("li", note, list);
      };
      radios.forEach((radio, i) => radio.addEventListener("change", () => {
        if (radio.checked) {
          selected = i;
          show();
        }
      }));
      show();
      const migration = marked("section", "rule");
      el("h2", "Upgrade checklist", migration);
      const sequence = el("ol", "", migration);
      for (const note of ["Save the current configuration and a representative input file.", "Check your runtime against the selected release above.", "Run a local conversion and compare the exported document."]) el("li", note, sequence);
      const detail = el("details", "", migration);
      el("summary", "Configuration compatibility", detail);
      el("p", "Version 2 accepts the version 2 schema. Version 1 settings need an explicit export and conversion before use.", detail);
      attrs.set("data-pica-ready", "true");
    }
    render();
    return {
      update(partial) {
        const next = { ...props, ...partial };
        if (!sameJson(props, next)) {
          props = next;
          render();
        }
      },
      destroy() {
        root.remove();
        sheet.remove();
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
  var instance = PicaAsciiReleaseRoom.mount(host, take(initial));
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
