"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Select · select
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

// lib/a11y.ts
/** Accessibility attributes a core sets on its host. See docs/architecture/contract.md, mount step 2. */

/** Gives the host a role and a label, or hides it from assistive technology when the label is empty. */
function labelHost(host: HTMLElement, label: string, role = "img"): void {
  if (label) {
    host.setAttribute("role", role);
    host.setAttribute("aria-label", label);
    host.removeAttribute("aria-hidden");
  } else {
    host.removeAttribute("role");
    host.removeAttribute("aria-label");
    host.setAttribute("aria-hidden", "true");
  }
}

/** Removes what labelHost set. */
function unlabelHost(host: HTMLElement): void {
  host.removeAttribute("role");
  host.removeAttribute("aria-label");
  host.removeAttribute("aria-hidden");
}

/** A visually hidden element that carries text for assistive technology, for components whose visible text
 *  animates. Put the animated layer next to it with aria-hidden. */
function hiddenText(text: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.textContent = text;
  span.style.cssText =
    "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";
  return span;
}

/** Text whose visible glyphs animate, such as a scramble or a typewriter. The host keeps its place in the
 *  document with no role, so a heading around it stays a heading. A visually hidden copy carries the final
 *  text for assistive technology, and the animation draws into the returned layer, which is hidden from it. */
interface AnimatedText {
  /** Where the animation draws. Hidden from assistive technology. */
  readonly layer: HTMLElement;
  /** Changes the text assistive technology reads. */
  setText(text: string): void;
  /** Removes the hidden copy and the layer. */
  remove(): void;
}

function animatedText(host: HTMLElement, text: string, tag: "span" | "div" | "pre" = "span"): AnimatedText {
  const hidden = hiddenText(text);
  hidden.setAttribute("data-pica", "");
  const layer = document.createElement(tag);
  layer.setAttribute("data-pica", "");
  layer.setAttribute("aria-hidden", "true");
  host.append(hidden, layer);
  return {
    layer,
    setText(next) {
      hidden.textContent = next;
    },
    remove() {
      hidden.remove();
      layer.remove();
    },
  };
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
  accent: "#e8a020",
  muted: "color-mix(in srgb, var(--pica-fg, currentColor) 65%, transparent)",
};

/** The CSS value of a token, with its fallback, for use in a style: var(--pica-accent, #e8a020). */
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

// registry/ui/select/core.ts
export interface SelectOption {
  /** The value reported when this option is chosen. */
  value: string;
  /** The text shown for this option, in the trigger and in the listbox. */
  label: string;
  /** Removes the option from keyboard and pointer choice, and dims it. */
  disabled: boolean;
}

export interface SelectProps {
  /** The choices offered, in order. */
  options: readonly SelectOption[];
  /** The chosen value. Null means uncontrolled, so the component tracks its own choice. */
  value: string | null;
  /** The value chosen at mount, read once, while value is null. */
  defaultValue: string;
  /** Shown in the trigger when nothing is chosen. */
  placeholder: string;
  /** The accessible name for the control. An empty label hides it. */
  label: string;
  /** Blocks input and dims the trigger. */
  disabled: boolean;
}

export interface SelectEvents {
  /** The value of the option the user chose. */
  valueChange: string;
}

export const defaults: SelectProps = {
  options: [
    { value: "ascii", label: "ASCII", disabled: false },
    { value: "dither", label: "Dither", disabled: false },
    { value: "shaders", label: "Shaders", disabled: false },
    { value: "charts", label: "Charts", disabled: false },
  ],
  value: null,
  defaultValue: "ascii",
  placeholder: "Choose one",
  label: "Family",
  disabled: false,
};

/** A drawn check, in the accent, beside the chosen option. */
const CHECK = "✓";
/** The chevron glyph, closed and open. It flips instantly; nothing about this component transitions. */
const CHEVRON_CLOSED = "▾";
const CHEVRON_OPEN = "▴";
/** Silence between keystrokes that ends a typeahead search. */
const TYPEAHEAD_RESET_MS = 600;

/** The scoped rules for one select. The trigger and options take the page's font; only the chevron and the
 *  check are mono. The listbox is a Popover API element, positioned by CSS anchoring when the browser has it;
 *  `anchorVar` is the anchor-name shared between the trigger and the listbox's `anchor()` offsets. */
function rules(s: string, anchorVar: string): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  return [
    `${s}{display:inline-flex;align-items:center;justify-content:space-between;gap:0.6em;min-width:8em;box-sizing:border-box;font:inherit;color:${fg};background:transparent;border:1px solid ${fg};border-radius:0;padding:0.45em 0.7em;cursor:pointer;user-select:none;white-space:nowrap;anchor-name:${anchorVar}}`,
    `${s}:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${s}[aria-disabled="true"]{opacity:0.45;cursor:not-allowed}`,
    `${s} [data-pica-chevron]{font-family:${GRID_FONT};color:${accent};line-height:1;flex:none}`,
    `${s} [data-pica-listbox]{position:fixed;inset:auto;top:anchor(${anchorVar} bottom);left:anchor(${anchorVar} left);min-width:anchor-size(${anchorVar} width);margin:0.25em 0 0;padding:0.25em 0;border:1px solid ${fg};background:transparent;color:${fg};font:inherit;max-height:16em;overflow:auto;box-sizing:border-box}`,
    `${s} [data-pica-option]{display:flex;align-items:center;gap:0.5em;padding:0.35em 0.7em;white-space:nowrap;cursor:pointer}`,
    `${s} [data-pica-option][data-active="true"]{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${s} [data-pica-option][aria-disabled="true"]{opacity:0.45;cursor:not-allowed}`,
    `${s} [data-pica-check]{font-family:${GRID_FONT};color:${accent};width:1em;flex:none;text-align:center}`,
  ].join("\n");
}

export const mount: Mount<SelectProps> = (host, initial = {}) => {
  let props: SelectProps = { ...defaults, ...initial };
  // Tracks the choice while uncontrolled, and mirrors the last controlled value so a component that later
  // loses control resumes from it rather than from whatever it held at mount.
  let current: string = props.value ?? props.defaultValue;
  let lastOptions: readonly SelectOption[] | undefined;
  let rows: HTMLElement[] = [];
  let activeIndex = -1;
  let openState = false;
  let typeaheadBuffer = "";
  let typeaheadTimer: ReturnType<typeof setTimeout> | undefined;

  const emit = emitter<SelectEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const listboxId = nextId("pica-select-listbox");
  const anchorVar = `--${nextId("pica-select-anchor")}`;
  const supportsAnchor = typeof CSS !== "undefined" && CSS.supports("anchor-name", anchorVar);

  const valueEl = document.createElement("span");
  valueEl.setAttribute("data-pica", "");
  const chevronEl = document.createElement("span");
  chevronEl.setAttribute("data-pica", "");
  chevronEl.setAttribute("data-pica-chevron", "");
  chevronEl.setAttribute("aria-hidden", "true");
  const listboxEl = document.createElement("div");
  listboxEl.setAttribute("data-pica", "");
  listboxEl.setAttribute("data-pica-listbox", "");
  listboxEl.setAttribute("popover", "manual");
  listboxEl.setAttribute("role", "listbox");
  listboxEl.id = listboxId;
  host.append(valueEl, chevronEl, listboxEl);

  function effectiveValue(): string {
    return props.value !== null ? props.value : current;
  }

  function indexForValue(value: string): number {
    return props.options.findIndex((option) => option.value === value);
  }

  function enabledIndices(): number[] {
    const list: number[] = [];
    for (let i = 0; i < props.options.length; i++) {
      if (!props.options[i]?.disabled) list.push(i);
    }
    return list;
  }

  function firstEnabled(): number {
    return enabledIndices().at(0) ?? -1;
  }

  function lastEnabled(): number {
    return enabledIndices().at(-1) ?? -1;
  }

  /** Moves `delta` enabled options from `from`, clamped at the ends rather than wrapping, for the arrow,
   *  page, home, and end keys while the listbox is open. */
  function stepEnabled(from: number, delta: number): number {
    const list = enabledIndices();
    if (list.length === 0) return -1;
    const at = list.indexOf(from);
    const base = at === -1 ? (delta > 0 ? -1 : list.length) : at;
    const next = Math.max(0, Math.min(list.length - 1, base + delta));
    return list[next] ?? -1;
  }

  function defaultActiveIndex(): number {
    const index = indexForValue(effectiveValue());
    return index !== -1 ? index : firstEnabled();
  }

  function renderOptions(): void {
    listboxEl.replaceChildren();
    rows = props.options.map((option, index) => {
      const row = document.createElement("div");
      row.setAttribute("data-pica", "");
      row.setAttribute("data-pica-option", "");
      row.setAttribute("role", "option");
      row.id = `${listboxId}-opt-${index}`;
      row.dataset.picaIndex = String(index);
      row.setAttribute("aria-selected", "false");
      if (option.disabled) row.setAttribute("aria-disabled", "true");
      const check = document.createElement("span");
      check.setAttribute("data-pica", "");
      check.setAttribute("data-pica-check", "");
      check.setAttribute("aria-hidden", "true");
      row.append(check, document.createTextNode(option.label));
      return row;
    });
    listboxEl.append(...rows);
  }

  function renderChosenMarks(): void {
    const chosen = indexForValue(effectiveValue());
    rows.forEach((row, index) => {
      const check = row.querySelector("[data-pica-check]");
      if (check) check.textContent = index === chosen ? CHECK : "";
    });
  }

  /** The accessible name carries both what the control is for and its current value, the way a native
   *  select's name and value are both announced: there is no external <label> a self-contained component
   *  could point aria-labelledby at, so the two are combined into one aria-label. */
  function renderTrigger(): void {
    const index = indexForValue(effectiveValue());
    const shown = index === -1 ? props.placeholder : (props.options[index]?.label ?? props.placeholder);
    valueEl.textContent = shown;
    labelHost(host, props.label ? `${props.label}, ${shown}` : "", "combobox");
  }

  function applyState(): void {
    const hidden = !props.label;
    attrs.set("aria-controls", hidden ? null : listboxId);
    attrs.set("aria-expanded", String(openState));
    attrs.set("tabindex", hidden || props.disabled ? "-1" : "0");
    attrs.set("aria-disabled", props.disabled ? "true" : null);
    chevronEl.textContent = openState ? CHEVRON_OPEN : CHEVRON_CLOSED;
  }

  function setActive(index: number): void {
    if (index === activeIndex) return;
    const prev = activeIndex >= 0 ? rows[activeIndex] : undefined;
    prev?.removeAttribute("data-active");
    prev?.setAttribute("aria-selected", "false");
    activeIndex = index;
    const row = activeIndex >= 0 ? rows[activeIndex] : undefined;
    if (row) {
      row.setAttribute("data-active", "true");
      row.setAttribute("aria-selected", "true");
      attrs.set("aria-activedescendant", row.id);
      row.scrollIntoView({ block: "nearest" });
    } else {
      attrs.set("aria-activedescendant", null);
    }
  }

  /** The getBoundingClientRect fallback for browsers without CSS anchor positioning. A no-op where anchoring
   *  works, since the scoped stylesheet's anchor() offsets place the listbox there without any script. */
  function position(): void {
    if (supportsAnchor) return;
    const rect = host.getBoundingClientRect();
    listboxEl.style.top = `${rect.bottom}px`;
    listboxEl.style.left = `${rect.left}px`;
    listboxEl.style.minWidth = `${rect.width}px`;
  }

  function setOpen(next: boolean, options?: { activeIndex?: number }): void {
    if (openState === next) {
      if (next && options?.activeIndex !== undefined) setActive(options.activeIndex);
      return;
    }
    openState = next;
    if (next) {
      listboxEl.showPopover();
      position();
      setActive(options?.activeIndex ?? defaultActiveIndex());
      document.addEventListener("pointerdown", onOutsidePointerDown, true);
      if (!supportsAnchor) {
        window.addEventListener("resize", position);
        window.addEventListener("scroll", position, true);
      }
    } else {
      listboxEl.hidePopover();
      document.removeEventListener("pointerdown", onOutsidePointerDown, true);
      if (!supportsAnchor) {
        window.removeEventListener("resize", position);
        window.removeEventListener("scroll", position, true);
      }
      setActive(-1);
    }
    applyState();
  }

  function choose(index: number): void {
    const option = props.options[index];
    if (!option || option.disabled) return;
    if (props.value === null) current = option.value;
    emit("valueChange", option.value);
    setOpen(false);
    renderTrigger();
    renderChosenMarks();
  }

  /** Printable, non-space keys: opens if needed and moves to the next option starting with the typed text.
   *  The same character repeated cycles through its matches; different characters in quick succession match
   *  the whole typed string. Returns whether the key was used, so the caller can suppress its default. */
  function typeaheadKey(key: string): boolean {
    if (key.length !== 1 || key === " ") return false;
    if (typeaheadTimer !== undefined) clearTimeout(typeaheadTimer);
    typeaheadBuffer += key.toLowerCase();
    typeaheadTimer = setTimeout(() => {
      typeaheadBuffer = "";
    }, TYPEAHEAD_RESET_MS);
    const first = typeaheadBuffer[0] ?? "";
    const repeat = [...typeaheadBuffer].every((c) => c === first);
    const query = repeat ? first : typeaheadBuffer;
    const enabled = enabledIndices();
    const at = enabled.indexOf(activeIndex);
    const ordered = at === -1 ? enabled : [...enabled.slice(at + 1), ...enabled.slice(0, at + 1)];
    const match = ordered.find((index) => (props.options[index]?.label ?? "").toLowerCase().startsWith(query));
    if (match !== undefined) {
      if (openState) setActive(match);
      else setOpen(true, { activeIndex: match });
    }
    return true;
  }

  function onOutsidePointerDown(e: PointerEvent): void {
    if (!host.contains(e.target as Node)) setOpen(false);
  }

  function onHostFocusOut(e: FocusEvent): void {
    if (host.contains(e.relatedTarget as Node | null)) return;
    if (openState) setOpen(false);
  }

  function onHostPointerOver(e: PointerEvent): void {
    if (!openState || props.disabled) return;
    const row = (e.target as HTMLElement).closest?.("[data-pica-option]") as HTMLElement | null;
    if (!row || !listboxEl.contains(row)) return;
    const index = Number(row.dataset.picaIndex);
    if (Number.isNaN(index) || props.options[index]?.disabled) return;
    setActive(index);
  }

  function onHostClick(e: MouseEvent): void {
    if (props.disabled || !props.label) return;
    const target = e.target as HTMLElement;
    const row = target.closest("[data-pica-option]") as HTMLElement | null;
    if (row && listboxEl.contains(row)) {
      const index = Number(row.dataset.picaIndex);
      if (!Number.isNaN(index)) choose(index);
      return;
    }
    if (listboxEl.contains(target)) return;
    setOpen(!openState, openState ? undefined : { activeIndex: defaultActiveIndex() });
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (props.disabled || !props.label) return;
    const key = e.key;
    if (!openState) {
      if (key === "ArrowDown" || key === "Enter" || key === " ") {
        e.preventDefault();
        setOpen(true, { activeIndex: defaultActiveIndex() });
        return;
      }
      if (key === "ArrowUp" || key === "Home") {
        e.preventDefault();
        setOpen(true, { activeIndex: firstEnabled() });
        return;
      }
      if (key === "End") {
        e.preventDefault();
        setOpen(true, { activeIndex: lastEnabled() });
        return;
      }
      if (typeaheadKey(key)) e.preventDefault();
      return;
    }
    if (key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (key === "Enter" || key === " ") {
      e.preventDefault();
      choose(activeIndex);
      return;
    }
    if (key === "Tab") {
      choose(activeIndex);
      return;
    }
    if (key === "ArrowDown") {
      e.preventDefault();
      setActive(stepEnabled(activeIndex, 1));
      return;
    }
    if (key === "ArrowUp") {
      e.preventDefault();
      if (e.altKey) choose(activeIndex);
      else setActive(stepEnabled(activeIndex, -1));
      return;
    }
    if (key === "Home") {
      e.preventDefault();
      setActive(firstEnabled());
      return;
    }
    if (key === "End") {
      e.preventDefault();
      setActive(lastEnabled());
      return;
    }
    if (key === "PageDown") {
      e.preventDefault();
      setActive(stepEnabled(activeIndex, 10));
      return;
    }
    if (key === "PageUp") {
      e.preventDefault();
      setActive(stepEnabled(activeIndex, -10));
      return;
    }
    if (typeaheadKey(key)) e.preventDefault();
  }

  function apply(): void {
    sheet.setRules(rules(sheet.selector, anchorVar));
    if (lastOptions === undefined || !sameJson(props.options, lastOptions)) {
      lastOptions = props.options;
      renderOptions();
      activeIndex = -1;
      if (openState) setActive(defaultActiveIndex());
    }
    if (props.value !== null) current = props.value;
    renderTrigger();
    renderChosenMarks();
    if (props.disabled && openState) setOpen(false);
    applyState();
  }

  host.addEventListener("keydown", onKeyDown);
  host.addEventListener("click", onHostClick);
  host.addEventListener("pointerover", onHostPointerOver);
  host.addEventListener("focusout", onHostFocusOut);

  apply();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      apply();
    },
    destroy() {
      setOpen(false);
      host.removeEventListener("keydown", onKeyDown);
      host.removeEventListener("click", onHostClick);
      host.removeEventListener("pointerover", onHostPointerOver);
      host.removeEventListener("focusout", onHostFocusOut);
      if (typeaheadTimer !== undefined) clearTimeout(typeaheadTimer);
      unlabelHost(host);
      valueEl.remove();
      chevronEl.remove();
      listboxEl.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};

// registry/ui/select/index.tsx
export type SelectComponentProps = Partial<SelectProps> & Handlers<SelectEvents> & WrapperProps;

/** A single-choice select, built on the WAI-ARIA select-only combobox pattern with a Popover API listbox. */
export function Select({ className, style, palette, ...props }: SelectComponentProps) {
  const ref = usePica<SelectProps>(mount, props);
  return <div ref={ref} className={className} style={{ display: "inline-block", ...paletteStyle(palette), ...style }} />;
}
