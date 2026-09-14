# Combobox

> An editable field filters a listbox while preserving typed text during suggestion navigation.

Category: ui. Tags: combobox, listbox, search, form, ui. Static. Size: 3.4 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/combobox.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `options` | readonly ComboboxOption[] | `[{"value":"dither-field","label":"Dither Field"},{"value":"mesh-gradient","label":"Mesh Gradient"},{"value":"scanlines","label":"Scanlines"},{"value":"bar-chart","label":"Bar Chart"},{"value":"tabs","label":"Tabs"},{"value":"select","label":"Select"}]` | The suggestions available to filter and choose. |
| `value` | string \| null | `null` | The chosen value, or null to let the component manage its own value. |
| `defaultValue` | string | `""` | The initial chosen value when value is null. |
| `placeholder` | string | `"Search components"` | The hint shown while the editable field is empty. |
| `emptyText` | string | `"No matches"` | The message shown when no option matches the typed text. |
| `label` | string | `"Component"` | The visible and accessible name of the editable field. |
| `disabled` | boolean | `false` | Blocks editing and selection, and dims the control. |

## Events

Each event is a CustomEvent on the host named `pica:` plus the event name in lower case. It does not bubble. In React, pass the matching `on` prop.

| Event | React prop | Detail | Description |
|---|---|---|---|
| `valueChange` | `onValueChange` | `string` | An option was chosen through the keyboard or pointer. |

## Colors

Draws with `--pica-fg`, `--pica-accent`, `--pica-muted`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Combobox · combobox
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

// registry/ui/combobox/core.ts
export interface ComboboxOption {
  /** The value reported when this option is chosen. */
  value: string;
  /** The text shown in the field and listbox. */
  label: string;
  /** Prevents this option from becoming active or chosen. */
  disabled?: boolean;
}

export interface ComboboxProps {
  /** The suggestions available to filter and choose. */
  options: readonly ComboboxOption[];
  /** The chosen value, or null to let the component manage its own value. */
  value: string | null;
  /** The initial chosen value when value is null. */
  defaultValue: string;
  /** The hint shown while the editable field is empty. */
  placeholder: string;
  /** The message shown when no option matches the typed text. */
  emptyText: string;
  /** The visible and accessible name of the editable field. */
  label: string;
  /** Blocks editing and selection, and dims the control. */
  disabled: boolean;
}

export interface ComboboxEvents {
  /** An option was chosen through the keyboard or pointer. */
  valueChange: string;
}

export const defaults: ComboboxProps = {
  options: [
    { value: "dither-field", label: "Dither Field" },
    { value: "mesh-gradient", label: "Mesh Gradient" },
    { value: "scanlines", label: "Scanlines" },
    { value: "bar-chart", label: "Bar Chart" },
    { value: "tabs", label: "Tabs" },
    { value: "select", label: "Select" },
  ],
  value: null,
  defaultValue: "",
  placeholder: "Search components",
  emptyText: "No matches",
  label: "Component",
  disabled: false,
};

function comboboxRules(s: string): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const muted = cssVar("muted");
  return [
    `${s}{color:${fg}}`,
    `${s} [data-part="root"]{width:min(22em,calc(100vw - 2em))}`,
    `${s}[data-disabled="true"]{opacity:0.45}`,
    `${s} [data-part="label"]{display:block;margin:0 0 0.45em;font-family:${GRID_FONT};font-size:0.7em;line-height:1.2;letter-spacing:0.04em;text-transform:uppercase;color:${muted}}`,
    `${s} [data-part="field"]{display:grid;grid-template-columns:minmax(0,1fr) 2.5em;box-sizing:border-box;border:1px solid ${fg};border-radius:0;background:transparent}`,
    `${s} [data-part="field"]:has(input:focus-visible){outline:2px solid ${accent};outline-offset:2px}`,
    `${s} input{box-sizing:border-box;width:100%;min-width:0;margin:0;padding:0.65em 0.75em;border:0;border-radius:0;outline:0;background:transparent;color:${fg};font-family:${GRID_FONT};font-size:1em;line-height:1.25}`,
    `${s} input::placeholder{color:${muted};opacity:1}`,
    `${s} [data-part="toggle"]{appearance:none;display:grid;place-items:center;box-sizing:border-box;width:100%;margin:0;padding:0;border:0;border-left:1px solid color-mix(in srgb, ${fg} 28%, transparent);border-radius:0;background:transparent;color:${accent};font-family:${GRID_FONT};font-size:1em;line-height:1;cursor:pointer}`,
    `${s} [data-part="toggle"]:disabled{cursor:not-allowed}`,
    `${s} [data-part="listbox"]{position:fixed;inset:auto;box-sizing:border-box;max-height:15rem;margin:4px 0 0;padding:0.3em;border:1px solid ${fg};border-radius:0;background:color-mix(in srgb, ${fg} 6%, Canvas);color:${fg};font:inherit;overflow:auto;z-index:2147483647}`,
    `${s} [data-part="option"]{display:grid;grid-template-columns:1.35em minmax(0,1fr);align-items:center;box-sizing:border-box;min-height:2.2em;padding:0.45em 0.6em;cursor:pointer}`,
    `${s} [data-part="option"][data-active="true"]{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${s} [data-part="option"][aria-disabled="true"]{opacity:0.45;cursor:not-allowed}`,
    `${s} [data-part="check"]{color:${accent};font-family:${GRID_FONT}}`,
    `${s} [data-part="empty"]{padding:0.6em;color:${muted}}`,
  ].join("\n");
}

export const mount: Mount<ComboboxProps> = (host, initial = {}) => {
  let props: ComboboxProps = { ...defaults, ...initial };
  let chosenValue = props.value ?? props.defaultValue;
  let query = props.options.find((option) => option.value === chosenValue)?.label ?? "";
  let open = false;
  let active = -1;
  const emit = emitter<ComboboxEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const inputId = nextId("pica-combobox");
  const labelId = nextId("pica-combobox-label");
  const listboxId = nextId("pica-combobox-listbox");
  const anchorName = `--${inputId}`;
  const anchored = CSS.supports("anchor-name", anchorName) && CSS.supports("top", "anchor(bottom)");
  const root = document.createElement("div");
  const label = document.createElement("label");
  const field = document.createElement("div");
  const input = document.createElement("input");
  const toggle = document.createElement("button");
  const listbox = document.createElement("div");

  root.setAttribute("data-pica", "");
  root.dataset.part = "root";
  label.setAttribute("data-pica", "");
  label.dataset.part = "label";
  label.id = labelId;
  label.htmlFor = inputId;
  field.setAttribute("data-pica", "");
  field.dataset.part = "field";
  field.style.setProperty("anchor-name", anchorName);
  input.setAttribute("data-pica", "");
  input.id = inputId;
  input.type = "text";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-haspopup", "listbox");
  input.setAttribute("aria-controls", listboxId);
  input.setAttribute("aria-expanded", "false");
  toggle.setAttribute("data-pica", "");
  toggle.dataset.part = "toggle";
  toggle.type = "button";
  toggle.tabIndex = -1;
  toggle.textContent = "⌄";
  toggle.setAttribute("aria-label", "Show suggestions");
  listbox.setAttribute("data-pica", "");
  listbox.dataset.part = "listbox";
  listbox.id = listboxId;
  listbox.setAttribute("role", "listbox");
  listbox.setAttribute("aria-labelledby", labelId);
  listbox.setAttribute("popover", "manual");
  if (anchored) listbox.style.setProperty("position-anchor", anchorName);

  field.append(input, toggle);
  root.append(label, field, listbox);
  host.append(root);
  sheet.setRules(comboboxRules(sheet.selector));

  const optionId = (index: number): string => `${listboxId}-option-${index}`;
  const visibleIndices = (): number[] => {
    const needle = query.toLowerCase();
    const indices: number[] = [];
    props.options.forEach((option, index) => {
      if (option.label.toLowerCase().includes(needle)) indices.push(index);
    });
    return indices;
  };

  function syncActive(reveal = false): void {
    const optionNodes = listbox.querySelectorAll<HTMLElement>("[data-option]");
    optionNodes.forEach((node) => {
      node.dataset.active = node.dataset.option === String(active) ? "true" : "false";
    });
    if (open && active >= 0) {
      input.setAttribute("aria-activedescendant", optionId(active));
      if (reveal) listbox.querySelector<HTMLElement>(`#${optionId(active)}`)?.scrollIntoView({ block: "nearest" });
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  }

  function renderOptions(): void {
    const fragment = document.createDocumentFragment();
    const visible = visibleIndices();
    if (!visible.includes(active)) active = -1;
    if (visible.length === 0) {
      const empty = document.createElement("div");
      empty.setAttribute("data-pica", "");
      empty.dataset.part = "empty";
      empty.textContent = props.emptyText;
      fragment.append(empty);
    } else {
      for (const index of visible) {
        const option = props.options[index];
        if (!option) continue;
        const row = document.createElement("div");
        const check = document.createElement("span");
        const text = document.createElement("span");
        row.setAttribute("data-pica", "");
        row.dataset.part = "option";
        row.dataset.option = String(index);
        row.id = optionId(index);
        row.setAttribute("role", "option");
        row.setAttribute("aria-selected", option.value === chosenValue ? "true" : "false");
        if (option.disabled) row.setAttribute("aria-disabled", "true");
        check.setAttribute("data-pica", "");
        check.dataset.part = "check";
        check.setAttribute("aria-hidden", "true");
        check.textContent = option.value === chosenValue ? "✓" : "";
        text.setAttribute("data-pica", "");
        text.textContent = option.label;
        row.append(check, text);
        fragment.append(row);
      }
    }
    listbox.replaceChildren(fragment);
    syncActive();
  }

  function placeListbox(): void {
    if (anchored) return;
    const rect = field.getBoundingClientRect();
    listbox.style.left = `${rect.left}px`;
    listbox.style.top = `${rect.bottom}px`;
    listbox.style.width = `${rect.width}px`;
  }

  function setOpen(next: boolean): void {
    if (next && props.disabled) return;
    open = next;
    input.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-expanded", String(open));
    if (open) {
      renderOptions();
      placeListbox();
      if (!listbox.matches(":popover-open")) listbox.showPopover();
    } else {
      active = -1;
      syncActive();
      if (listbox.matches(":popover-open")) listbox.hidePopover();
    }
  }

  function moveActive(direction: 1 | -1): void {
    const enabled = visibleIndices().filter((index) => !props.options[index]?.disabled);
    if (enabled.length === 0) return;
    const position = enabled.indexOf(active);
    active = position < 0
      ? (direction === 1 ? enabled[0] ?? -1 : enabled[enabled.length - 1] ?? -1)
      : enabled[(position + direction + enabled.length) % enabled.length] ?? -1;
    syncActive(true);
  }

  function choose(index: number): void {
    const option = props.options[index];
    if (!option || option.disabled) return;
    if (props.value === null) {
      chosenValue = option.value;
      query = option.label;
      input.value = query;
      renderOptions();
    } else {
      query = props.options.find((item) => item.value === props.value)?.label ?? "";
      input.value = query;
    }
    setOpen(false);
    emit("valueChange", option.value);
  }

  const onInput = (): void => {
    query = input.value;
    active = -1;
    setOpen(true);
  };
  const onInputClick = (): void => setOpen(true);
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) setOpen(true);
      moveActive(1);
    } else if (event.key === "ArrowUp" && event.altKey) {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) setOpen(true);
      moveActive(-1);
    } else if (event.key === "Enter" && open && active >= 0) {
      event.preventDefault();
      choose(active);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };
  const onTogglePointerDown = (event: PointerEvent): void => event.preventDefault();
  const onToggleClick = (): void => {
    input.focus({ preventScroll: true });
    setOpen(!open);
  };
  const optionFromEvent = (event: Event): HTMLElement | null => {
    const target = event.target;
    return target instanceof Element ? target.closest<HTMLElement>("[data-option]") : null;
  };
  const onListboxPointerOver = (event: PointerEvent): void => {
    const row = optionFromEvent(event);
    const index = Number(row?.dataset.option);
    if (row && !props.options[index]?.disabled) {
      active = index;
      syncActive();
    }
  };
  const onListboxPointerDown = (event: PointerEvent): void => event.preventDefault();
  const onListboxClick = (event: MouseEvent): void => {
    const row = optionFromEvent(event);
    if (row) choose(Number(row.dataset.option));
  };
  const onOutsidePointerDown = (event: PointerEvent): void => {
    if (open && event.target instanceof Node && !root.contains(event.target)) setOpen(false);
  };
  const onPosition = (): void => {
    if (open) placeListbox();
  };

  input.addEventListener("input", onInput);
  input.addEventListener("click", onInputClick);
  input.addEventListener("keydown", onKeyDown);
  toggle.addEventListener("pointerdown", onTogglePointerDown);
  toggle.addEventListener("click", onToggleClick);
  listbox.addEventListener("pointerover", onListboxPointerOver);
  listbox.addEventListener("pointerdown", onListboxPointerDown);
  listbox.addEventListener("click", onListboxClick);
  document.addEventListener("pointerdown", onOutsidePointerDown);
  window.addEventListener("resize", onPosition);
  window.addEventListener("scroll", onPosition, true);

  function apply(): void {
    attrs.set("data-disabled", props.disabled ? "true" : null);
    label.textContent = props.label;
    input.placeholder = props.placeholder;
    input.disabled = props.disabled;
    toggle.disabled = props.disabled;
    if (props.disabled) setOpen(false);
    input.value = query;
    renderOptions();
  }

  apply();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const nextValue = next.value;
      props = { ...props, ...next };
      if (nextValue !== undefined && nextValue !== null) {
        chosenValue = nextValue;
        query = props.options.find((option) => option.value === nextValue)?.label ?? "";
      }
      apply();
    },
    destroy() {
      setOpen(false);
      input.removeEventListener("input", onInput);
      input.removeEventListener("click", onInputClick);
      input.removeEventListener("keydown", onKeyDown);
      toggle.removeEventListener("pointerdown", onTogglePointerDown);
      toggle.removeEventListener("click", onToggleClick);
      listbox.removeEventListener("pointerover", onListboxPointerOver);
      listbox.removeEventListener("pointerdown", onListboxPointerDown);
      listbox.removeEventListener("click", onListboxClick);
      document.removeEventListener("pointerdown", onOutsidePointerDown);
      window.removeEventListener("resize", onPosition);
      window.removeEventListener("scroll", onPosition, true);
      root.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};

// registry/ui/combobox/index.tsx
export type ComboboxComponentProps = Partial<ComboboxProps> & Handlers<ComboboxEvents> & WrapperProps;

/** An editable field that filters a listbox without replacing typed text during keyboard navigation. */
export function Combobox({ className, style, palette, ...props }: ComboboxComponentProps) {
  const ref = usePica<ComboboxProps, HTMLDivElement>(mount, props);
  return <div ref={ref} className={className} style={{ display: "inline-block", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Combobox · combobox
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Combobox · Pica</title>
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
<div class="pica-stage"><div id="pica"></div></div>
<script>
"use strict";
var PicaCombobox = (() => {
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

  // registry/ui/combobox/core.ts
  var core_exports = {};
  __export(core_exports, {
    defaults: () => defaults,
    mount: () => mount
  });

  // lib/events.ts
  function eventType(name) {
    return `pica:${name.toLowerCase()}`;
  }
  function emitter(host) {
    return (name, detail) => {
      host.dispatchEvent(new CustomEvent(eventType(name), { detail, bubbles: false }));
    };
  }

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

  // registry/ui/combobox/core.ts
  var defaults = {
    options: [
      { value: "dither-field", label: "Dither Field" },
      { value: "mesh-gradient", label: "Mesh Gradient" },
      { value: "scanlines", label: "Scanlines" },
      { value: "bar-chart", label: "Bar Chart" },
      { value: "tabs", label: "Tabs" },
      { value: "select", label: "Select" }
    ],
    value: null,
    defaultValue: "",
    placeholder: "Search components",
    emptyText: "No matches",
    label: "Component",
    disabled: false
  };
  function comboboxRules(s) {
    const fg = cssVar("fg");
    const accent = cssVar("accent");
    const muted = cssVar("muted");
    return [
      `${s}{color:${fg}}`,
      `${s} [data-part="root"]{width:min(22em,calc(100vw - 2em))}`,
      `${s}[data-disabled="true"]{opacity:0.45}`,
      `${s} [data-part="label"]{display:block;margin:0 0 0.45em;font-family:${GRID_FONT};font-size:0.7em;line-height:1.2;letter-spacing:0.04em;text-transform:uppercase;color:${muted}}`,
      `${s} [data-part="field"]{display:grid;grid-template-columns:minmax(0,1fr) 2.5em;box-sizing:border-box;border:1px solid ${fg};border-radius:0;background:transparent}`,
      `${s} [data-part="field"]:has(input:focus-visible){outline:2px solid ${accent};outline-offset:2px}`,
      `${s} input{box-sizing:border-box;width:100%;min-width:0;margin:0;padding:0.65em 0.75em;border:0;border-radius:0;outline:0;background:transparent;color:${fg};font-family:${GRID_FONT};font-size:1em;line-height:1.25}`,
      `${s} input::placeholder{color:${muted};opacity:1}`,
      `${s} [data-part="toggle"]{appearance:none;display:grid;place-items:center;box-sizing:border-box;width:100%;margin:0;padding:0;border:0;border-left:1px solid color-mix(in srgb, ${fg} 28%, transparent);border-radius:0;background:transparent;color:${accent};font-family:${GRID_FONT};font-size:1em;line-height:1;cursor:pointer}`,
      `${s} [data-part="toggle"]:disabled{cursor:not-allowed}`,
      `${s} [data-part="listbox"]{position:fixed;inset:auto;box-sizing:border-box;max-height:15rem;margin:4px 0 0;padding:0.3em;border:1px solid ${fg};border-radius:0;background:color-mix(in srgb, ${fg} 6%, Canvas);color:${fg};font:inherit;overflow:auto;z-index:2147483647}`,
      `${s} [data-part="option"]{display:grid;grid-template-columns:1.35em minmax(0,1fr);align-items:center;box-sizing:border-box;min-height:2.2em;padding:0.45em 0.6em;cursor:pointer}`,
      `${s} [data-part="option"][data-active="true"]{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
      `${s} [data-part="option"][aria-disabled="true"]{opacity:0.45;cursor:not-allowed}`,
      `${s} [data-part="check"]{color:${accent};font-family:${GRID_FONT}}`,
      `${s} [data-part="empty"]{padding:0.6em;color:${muted}}`
    ].join("\n");
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    let chosenValue = props.value ?? props.defaultValue;
    let query = props.options.find((option) => option.value === chosenValue)?.label ?? "";
    let open = false;
    let active = -1;
    const emit = emitter(host);
    const attrs = hostAttributes(host);
    const sheet = scope(host);
    const inputId = nextId("pica-combobox");
    const labelId = nextId("pica-combobox-label");
    const listboxId = nextId("pica-combobox-listbox");
    const anchorName = `--${inputId}`;
    const anchored = CSS.supports("anchor-name", anchorName) && CSS.supports("top", "anchor(bottom)");
    const root = document.createElement("div");
    const label = document.createElement("label");
    const field = document.createElement("div");
    const input = document.createElement("input");
    const toggle = document.createElement("button");
    const listbox = document.createElement("div");
    root.setAttribute("data-pica", "");
    root.dataset.part = "root";
    label.setAttribute("data-pica", "");
    label.dataset.part = "label";
    label.id = labelId;
    label.htmlFor = inputId;
    field.setAttribute("data-pica", "");
    field.dataset.part = "field";
    field.style.setProperty("anchor-name", anchorName);
    input.setAttribute("data-pica", "");
    input.id = inputId;
    input.type = "text";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-haspopup", "listbox");
    input.setAttribute("aria-controls", listboxId);
    input.setAttribute("aria-expanded", "false");
    toggle.setAttribute("data-pica", "");
    toggle.dataset.part = "toggle";
    toggle.type = "button";
    toggle.tabIndex = -1;
    toggle.textContent = "⌄";
    toggle.setAttribute("aria-label", "Show suggestions");
    listbox.setAttribute("data-pica", "");
    listbox.dataset.part = "listbox";
    listbox.id = listboxId;
    listbox.setAttribute("role", "listbox");
    listbox.setAttribute("aria-labelledby", labelId);
    listbox.setAttribute("popover", "manual");
    if (anchored) listbox.style.setProperty("position-anchor", anchorName);
    field.append(input, toggle);
    root.append(label, field, listbox);
    host.append(root);
    sheet.setRules(comboboxRules(sheet.selector));
    const optionId = (index) => `${listboxId}-option-${index}`;
    const visibleIndices = () => {
      const needle = query.toLowerCase();
      const indices = [];
      props.options.forEach((option, index) => {
        if (option.label.toLowerCase().includes(needle)) indices.push(index);
      });
      return indices;
    };
    function syncActive(reveal = false) {
      const optionNodes = listbox.querySelectorAll("[data-option]");
      optionNodes.forEach((node) => {
        node.dataset.active = node.dataset.option === String(active) ? "true" : "false";
      });
      if (open && active >= 0) {
        input.setAttribute("aria-activedescendant", optionId(active));
        if (reveal) listbox.querySelector(`#${optionId(active)}`)?.scrollIntoView({ block: "nearest" });
      } else {
        input.removeAttribute("aria-activedescendant");
      }
    }
    function renderOptions() {
      const fragment = document.createDocumentFragment();
      const visible = visibleIndices();
      if (!visible.includes(active)) active = -1;
      if (visible.length === 0) {
        const empty = document.createElement("div");
        empty.setAttribute("data-pica", "");
        empty.dataset.part = "empty";
        empty.textContent = props.emptyText;
        fragment.append(empty);
      } else {
        for (const index of visible) {
          const option = props.options[index];
          if (!option) continue;
          const row = document.createElement("div");
          const check = document.createElement("span");
          const text = document.createElement("span");
          row.setAttribute("data-pica", "");
          row.dataset.part = "option";
          row.dataset.option = String(index);
          row.id = optionId(index);
          row.setAttribute("role", "option");
          row.setAttribute("aria-selected", option.value === chosenValue ? "true" : "false");
          if (option.disabled) row.setAttribute("aria-disabled", "true");
          check.setAttribute("data-pica", "");
          check.dataset.part = "check";
          check.setAttribute("aria-hidden", "true");
          check.textContent = option.value === chosenValue ? "✓" : "";
          text.setAttribute("data-pica", "");
          text.textContent = option.label;
          row.append(check, text);
          fragment.append(row);
        }
      }
      listbox.replaceChildren(fragment);
      syncActive();
    }
    function placeListbox() {
      if (anchored) return;
      const rect = field.getBoundingClientRect();
      listbox.style.left = `${rect.left}px`;
      listbox.style.top = `${rect.bottom}px`;
      listbox.style.width = `${rect.width}px`;
    }
    function setOpen(next) {
      if (next && props.disabled) return;
      open = next;
      input.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-expanded", String(open));
      if (open) {
        renderOptions();
        placeListbox();
        if (!listbox.matches(":popover-open")) listbox.showPopover();
      } else {
        active = -1;
        syncActive();
        if (listbox.matches(":popover-open")) listbox.hidePopover();
      }
    }
    function moveActive(direction) {
      const enabled = visibleIndices().filter((index) => !props.options[index]?.disabled);
      if (enabled.length === 0) return;
      const position = enabled.indexOf(active);
      active = position < 0 ? direction === 1 ? enabled[0] ?? -1 : enabled[enabled.length - 1] ?? -1 : enabled[(position + direction + enabled.length) % enabled.length] ?? -1;
      syncActive(true);
    }
    function choose(index) {
      const option = props.options[index];
      if (!option || option.disabled) return;
      if (props.value === null) {
        chosenValue = option.value;
        query = option.label;
        input.value = query;
        renderOptions();
      } else {
        query = props.options.find((item) => item.value === props.value)?.label ?? "";
        input.value = query;
      }
      setOpen(false);
      emit("valueChange", option.value);
    }
    const onInput = () => {
      query = input.value;
      active = -1;
      setOpen(true);
    };
    const onInputClick = () => setOpen(true);
    const onKeyDown = (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!open) setOpen(true);
        moveActive(1);
      } else if (event.key === "ArrowUp" && event.altKey) {
        event.preventDefault();
        setOpen(false);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        if (!open) setOpen(true);
        moveActive(-1);
      } else if (event.key === "Enter" && open && active >= 0) {
        event.preventDefault();
        choose(active);
      } else if (event.key === "Escape" && open) {
        event.preventDefault();
        setOpen(false);
      } else if (event.key === "Tab") {
        setOpen(false);
      }
    };
    const onTogglePointerDown = (event) => event.preventDefault();
    const onToggleClick = () => {
      input.focus({ preventScroll: true });
      setOpen(!open);
    };
    const optionFromEvent = (event) => {
      const target = event.target;
      return target instanceof Element ? target.closest("[data-option]") : null;
    };
    const onListboxPointerOver = (event) => {
      const row = optionFromEvent(event);
      const index = Number(row?.dataset.option);
      if (row && !props.options[index]?.disabled) {
        active = index;
        syncActive();
      }
    };
    const onListboxPointerDown = (event) => event.preventDefault();
    const onListboxClick = (event) => {
      const row = optionFromEvent(event);
      if (row) choose(Number(row.dataset.option));
    };
    const onOutsidePointerDown = (event) => {
      if (open && event.target instanceof Node && !root.contains(event.target)) setOpen(false);
    };
    const onPosition = () => {
      if (open) placeListbox();
    };
    input.addEventListener("input", onInput);
    input.addEventListener("click", onInputClick);
    input.addEventListener("keydown", onKeyDown);
    toggle.addEventListener("pointerdown", onTogglePointerDown);
    toggle.addEventListener("click", onToggleClick);
    listbox.addEventListener("pointerover", onListboxPointerOver);
    listbox.addEventListener("pointerdown", onListboxPointerDown);
    listbox.addEventListener("click", onListboxClick);
    document.addEventListener("pointerdown", onOutsidePointerDown);
    window.addEventListener("resize", onPosition);
    window.addEventListener("scroll", onPosition, true);
    function apply() {
      attrs.set("data-disabled", props.disabled ? "true" : null);
      label.textContent = props.label;
      input.placeholder = props.placeholder;
      input.disabled = props.disabled;
      toggle.disabled = props.disabled;
      if (props.disabled) setOpen(false);
      input.value = query;
      renderOptions();
    }
    apply();
    host.dataset.picaReady = "true";
    return {
      update(next) {
        const nextValue = next.value;
        props = { ...props, ...next };
        if (nextValue !== void 0 && nextValue !== null) {
          chosenValue = nextValue;
          query = props.options.find((option) => option.value === nextValue)?.label ?? "";
        }
        apply();
      },
      destroy() {
        setOpen(false);
        input.removeEventListener("input", onInput);
        input.removeEventListener("click", onInputClick);
        input.removeEventListener("keydown", onKeyDown);
        toggle.removeEventListener("pointerdown", onTogglePointerDown);
        toggle.removeEventListener("click", onToggleClick);
        listbox.removeEventListener("pointerover", onListboxPointerOver);
        listbox.removeEventListener("pointerdown", onListboxPointerDown);
        listbox.removeEventListener("click", onListboxClick);
        document.removeEventListener("pointerdown", onOutsidePointerDown);
        window.removeEventListener("resize", onPosition);
        window.removeEventListener("scroll", onPosition, true);
        root.remove();
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
  var instance = PicaCombobox.mount(host, take(window.PICA_PROPS || {}));
  ["valueChange"].forEach(function (name) {
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

- Technique from [Combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) by W3C WAI-ARIA Authoring Practices Guide (W3C document).
- Technique from [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) by MDN (CC-BY-SA documentation).
