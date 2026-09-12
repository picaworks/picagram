# Tabs

> A tabbed view for switching between panels, with the active tab following keyboard focus.

Category: ui. Tags: tabs, navigation, panels, ui. Static. Size: 2.2 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/tabs.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `tabs` | readonly TabItem[] | `[{"id":"overview","label":"Overview"},{"id":"props","label":"Props"},{"id":"install","label":"Install"}]` | The tabs to show, in order. Each id is matched by position to a panel among the host's children, so a tab past the last panel has none and is disabled. |
| `value` | string \| null | `null` | The active tab's id, or null to let the component manage its own selection. |
| `defaultValue` | string | `"overview"` | The active tab when value is null, read once at mount. |
| `label` | string | `"Sections"` | The tablist's accessible name. |

## Events

Each event is a CustomEvent on the host named `pica:` plus the event name in lower case. It does not bubble. In React, pass the matching `on` prop.

| Event | React prop | Detail | Description |
|---|---|---|---|
| `valueChange` | `onValueChange` | `string` | The active tab changed, from a click or from moving focus with the arrow keys, Home, or End. |

## Children

Each direct child is one panel, in order.

## Colors

Draws with `--pica-fg`, `--pica-accent`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

// Pica · Tabs · tabs
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

// registry/ui/tabs/core.ts
/** One entry in the tabs prop. */
export interface TabItem {
  /** Matched by position to a panel among the host's children. */
  id: string;
  /** Text shown on the tab. */
  label: string;
}

export interface TabsProps {
  /** The tabs to show, in order. Each id is matched by position to a panel among the host's children, so a
   *  tab past the last panel has none and is disabled. */
  tabs: readonly TabItem[];
  /** The active tab's id, or null to let the component manage its own selection. */
  value: string | null;
  /** The active tab when value is null, read once at mount. */
  defaultValue: string;
  /** The tablist's accessible name. */
  label: string;
}

export interface TabsEvents {
  /** The active tab changed, from a click or from moving focus with the arrow keys, Home, or End. */
  valueChange: string;
}

export const defaults: TabsProps = {
  tabs: [
    { id: "overview", label: "Overview" },
    { id: "props", label: "Props" },
    { id: "install", label: "Install" },
  ],
  value: null,
  defaultValue: "overview",
  label: "Sections",
};

/** The scoped rules for one tablist: labels in the page's font, a hairline under the row, and a two-pixel
 *  accent rule under the active tab. No pills, no background fill. */
function rules(s: string): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  return [
    `${s} > [role="tablist"]{display:flex;flex-wrap:wrap;gap:1.5em;margin:0;border-bottom:1px solid color-mix(in srgb, ${fg} 25%, transparent)}`,
    `${s} > [role="tablist"] > [role="tab"]{appearance:none;background:transparent;border:none;border-bottom:2px solid transparent;margin:0;padding:0.5em 0.1em;font:inherit;line-height:1.2;color:${fg};cursor:pointer}`,
    `${s} > [role="tablist"] > [role="tab"][aria-selected="true"]{border-bottom-color:${accent}}`,
    `${s} > [role="tablist"] > [role="tab"]:hover:not(:disabled){color:${accent}}`,
    `${s} > [role="tablist"] > [role="tab"]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${s} > [role="tablist"] > [role="tab"]:disabled{opacity:0.45;cursor:not-allowed}`,
    `${s} > [role="tabpanel"]{margin-top:0.75em}`,
  ].join("\n");
}

/** One tab button the core owns, alongside the id it activates. */
interface TabEntry {
  id: string;
  disabled: boolean;
  button: HTMLButtonElement;
}

export const mount: Mount<TabsProps> = (host, initial = {}) => {
  let props: TabsProps = { ...defaults, ...initial };
  const emit = emitter<TabsEvents>(host);
  const uid = nextId("tabs");
  const tabId = (id: string): string => `${uid}-tab-${id}`;
  const panelId = (id: string): string => `${uid}-panel-${id}`;

  const tablist = document.createElement("div");
  tablist.setAttribute("role", "tablist");
  tablist.setAttribute("data-pica", "");
  const sheet = scope(host);
  sheet.setRules(rules(sheet.selector));

  let entries: TabEntry[] = [];
  let previousTabs: readonly TabItem[] | null = null;
  // The uncontrolled selection. Meaningful only while props.value is null; defaultValue seeds it once.
  let internal = props.defaultValue;
  const panelAttrs = new Map<HTMLElement, HostAttributes>();

  /** The host's direct children other than the tablist: the panels, in order. */
  function panelsOf(): HTMLElement[] {
    const out: HTMLElement[] = [];
    for (const child of Array.from(host.children)) {
      if (child !== tablist && child instanceof HTMLElement) out.push(child);
    }
    return out;
  }

  /** The id to show: the requested one when it names a tab with a panel, else the first tab with one. */
  function resolveCurrent(requested: string, panelCount: number): string {
    const requestedIndex = entries.findIndex((entry) => entry.id === requested);
    if (requestedIndex !== -1 && requestedIndex < panelCount) return requested;
    const firstEnabled = entries.find((_entry, index) => index < panelCount);
    if (firstEnabled) return firstEnabled.id;
    return entries[0]?.id ?? "";
  }

  function select(id: string): void {
    const entry = entries.find((e) => e.id === id);
    if (!entry || entry.disabled) return;
    entry.button.focus();
    emit("valueChange", id);
    if (props.value === null) internal = id;
    apply();
  }

  function onKeydown(event: KeyboardEvent): void {
    const enabled = entries.filter((entry) => !entry.disabled);
    if (enabled.length === 0) return;
    const at = enabled.findIndex((entry) => entry.button === document.activeElement);
    let target: TabEntry | undefined;
    if (event.key === "ArrowRight") target = enabled[(at + 1 + enabled.length) % enabled.length];
    else if (event.key === "ArrowLeft") target = enabled[(at - 1 + enabled.length) % enabled.length];
    else if (event.key === "Home") target = enabled[0];
    else if (event.key === "End") target = enabled[enabled.length - 1];
    else return;
    event.preventDefault();
    if (target) select(target.id);
  }
  tablist.addEventListener("keydown", onKeydown);

  /** Rebuilds the tab buttons only when the tabs prop actually changed, so a plain re-render never steals
   *  focus from the button a user just moved to. */
  function rebuildIfNeeded(): void {
    if (previousTabs !== null && sameJson(props.tabs, previousTabs)) return;
    previousTabs = props.tabs;
    tablist.replaceChildren();
    entries = props.tabs.map((tab) => {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("role", "tab");
      button.id = tabId(tab.id);
      button.textContent = tab.label;
      button.setAttribute("data-pica", "");
      button.addEventListener("click", () => select(tab.id));
      tablist.append(button);
      return { id: tab.id, disabled: false, button };
    });
  }

  function apply(): void {
    rebuildIfNeeded();
    const panels = panelsOf();
    const shown = resolveCurrent(props.value !== null ? props.value : internal, panels.length);
    if (props.value === null) internal = shown;
    if (props.label) tablist.setAttribute("aria-label", props.label);
    else tablist.removeAttribute("aria-label");
    entries.forEach((entry, index) => {
      entry.disabled = index >= panels.length;
      entry.button.disabled = entry.disabled;
      entry.button.setAttribute("aria-selected", entry.id === shown ? "true" : "false");
      entry.button.tabIndex = entry.id === shown ? 0 : -1;
      if (entry.disabled) entry.button.removeAttribute("aria-controls");
      else entry.button.setAttribute("aria-controls", panelId(entry.id));
    });
    panels.forEach((panel, index) => {
      let attrs = panelAttrs.get(panel);
      if (!attrs) {
        attrs = hostAttributes(panel);
        panelAttrs.set(panel, attrs);
      }
      const entry = entries[index];
      if (entry) {
        attrs.set("role", "tabpanel");
        attrs.set("id", panelId(entry.id));
        attrs.set("aria-labelledby", tabId(entry.id));
        attrs.set("hidden", entry.id === shown ? null : "");
      } else {
        attrs.set("role", null);
        attrs.set("id", null);
        attrs.set("aria-labelledby", null);
        attrs.set("hidden", "");
      }
    });
    for (const panel of Array.from(panelAttrs.keys())) {
      if (!panels.includes(panel)) panelAttrs.delete(panel);
    }
  }

  // React can replace a panel outright, for example on a key change, and the fresh node carries none of
  // the attributes the core set. Watching the child list catches that and reapplies them.
  const observer = new MutationObserver(() => apply());

  host.prepend(tablist);
  apply();
  observer.observe(host, { childList: true });
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      apply();
    },
    destroy() {
      observer.disconnect();
      tablist.remove();
      for (const attrs of panelAttrs.values()) attrs.restore();
      panelAttrs.clear();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};

// registry/ui/tabs/index.tsx
export type TabsComponentProps = Partial<TabsProps> & Handlers<TabsEvents> & WrapperProps & { children?: ReactNode };

/** Tabs built from a tabs prop, with the active tab following focus and each direct child treated as a panel. */
export function Tabs({ className, style, palette, children, ...props }: TabsComponentProps) {
  const ref = usePica<TabsProps>(mount, props);
  return (
    <div ref={ref} className={className} style={{ ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Tabs · tabs
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Tabs · Pica</title>
<style>:root { --pica-accent: #e8a020; }
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
<div id="pica"><section><h2>Overview</h2><p>A tabbed view for switching between related panels without leaving the page.</p></section><section><h2>Props</h2><p>Pass tabs, value, and defaultValue as plain data. Every other look follows the palette.</p></section><section><h2>Install</h2><p>Copy the component from the catalog, or run the shadcn command from its page.</p></section></div>
<script>
"use strict";
var PicaTabs = (() => {
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

  // registry/ui/tabs/core.ts
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
    accent: "#e8a020",
    muted: "color-mix(in srgb, var(--pica-fg, currentColor) 65%, transparent)"
  };
  function cssVar(token) {
    return `var(--pica-${token}, ${TOKEN_FALLBACK[token]})`;
  }

  // registry/ui/tabs/core.ts
  var defaults = {
    tabs: [
      { id: "overview", label: "Overview" },
      { id: "props", label: "Props" },
      { id: "install", label: "Install" }
    ],
    value: null,
    defaultValue: "overview",
    label: "Sections"
  };
  function rules(s) {
    const fg = cssVar("fg");
    const accent = cssVar("accent");
    return [
      `${s} > [role="tablist"]{display:flex;flex-wrap:wrap;gap:1.5em;margin:0;border-bottom:1px solid color-mix(in srgb, ${fg} 25%, transparent)}`,
      `${s} > [role="tablist"] > [role="tab"]{appearance:none;background:transparent;border:none;border-bottom:2px solid transparent;margin:0;padding:0.5em 0.1em;font:inherit;line-height:1.2;color:${fg};cursor:pointer}`,
      `${s} > [role="tablist"] > [role="tab"][aria-selected="true"]{border-bottom-color:${accent}}`,
      `${s} > [role="tablist"] > [role="tab"]:hover:not(:disabled){color:${accent}}`,
      `${s} > [role="tablist"] > [role="tab"]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
      `${s} > [role="tablist"] > [role="tab"]:disabled{opacity:0.45;cursor:not-allowed}`,
      `${s} > [role="tabpanel"]{margin-top:0.75em}`
    ].join("\n");
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    const emit = emitter(host);
    const uid = nextId("tabs");
    const tabId = (id) => `${uid}-tab-${id}`;
    const panelId = (id) => `${uid}-panel-${id}`;
    const tablist = document.createElement("div");
    tablist.setAttribute("role", "tablist");
    tablist.setAttribute("data-pica", "");
    const sheet = scope(host);
    sheet.setRules(rules(sheet.selector));
    let entries = [];
    let previousTabs = null;
    let internal = props.defaultValue;
    const panelAttrs = /* @__PURE__ */ new Map();
    function panelsOf() {
      const out = [];
      for (const child of Array.from(host.children)) {
        if (child !== tablist && child instanceof HTMLElement) out.push(child);
      }
      return out;
    }
    function resolveCurrent(requested, panelCount) {
      const requestedIndex = entries.findIndex((entry) => entry.id === requested);
      if (requestedIndex !== -1 && requestedIndex < panelCount) return requested;
      const firstEnabled = entries.find((_entry, index) => index < panelCount);
      if (firstEnabled) return firstEnabled.id;
      return entries[0]?.id ?? "";
    }
    function select(id) {
      const entry = entries.find((e) => e.id === id);
      if (!entry || entry.disabled) return;
      entry.button.focus();
      emit("valueChange", id);
      if (props.value === null) internal = id;
      apply();
    }
    function onKeydown(event) {
      const enabled = entries.filter((entry) => !entry.disabled);
      if (enabled.length === 0) return;
      const at = enabled.findIndex((entry) => entry.button === document.activeElement);
      let target;
      if (event.key === "ArrowRight") target = enabled[(at + 1 + enabled.length) % enabled.length];
      else if (event.key === "ArrowLeft") target = enabled[(at - 1 + enabled.length) % enabled.length];
      else if (event.key === "Home") target = enabled[0];
      else if (event.key === "End") target = enabled[enabled.length - 1];
      else return;
      event.preventDefault();
      if (target) select(target.id);
    }
    tablist.addEventListener("keydown", onKeydown);
    function rebuildIfNeeded() {
      if (previousTabs !== null && sameJson(props.tabs, previousTabs)) return;
      previousTabs = props.tabs;
      tablist.replaceChildren();
      entries = props.tabs.map((tab) => {
        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute("role", "tab");
        button.id = tabId(tab.id);
        button.textContent = tab.label;
        button.setAttribute("data-pica", "");
        button.addEventListener("click", () => select(tab.id));
        tablist.append(button);
        return { id: tab.id, disabled: false, button };
      });
    }
    function apply() {
      rebuildIfNeeded();
      const panels = panelsOf();
      const shown = resolveCurrent(props.value !== null ? props.value : internal, panels.length);
      if (props.value === null) internal = shown;
      if (props.label) tablist.setAttribute("aria-label", props.label);
      else tablist.removeAttribute("aria-label");
      entries.forEach((entry, index) => {
        entry.disabled = index >= panels.length;
        entry.button.disabled = entry.disabled;
        entry.button.setAttribute("aria-selected", entry.id === shown ? "true" : "false");
        entry.button.tabIndex = entry.id === shown ? 0 : -1;
        if (entry.disabled) entry.button.removeAttribute("aria-controls");
        else entry.button.setAttribute("aria-controls", panelId(entry.id));
      });
      panels.forEach((panel, index) => {
        let attrs = panelAttrs.get(panel);
        if (!attrs) {
          attrs = hostAttributes(panel);
          panelAttrs.set(panel, attrs);
        }
        const entry = entries[index];
        if (entry) {
          attrs.set("role", "tabpanel");
          attrs.set("id", panelId(entry.id));
          attrs.set("aria-labelledby", tabId(entry.id));
          attrs.set("hidden", entry.id === shown ? null : "");
        } else {
          attrs.set("role", null);
          attrs.set("id", null);
          attrs.set("aria-labelledby", null);
          attrs.set("hidden", "");
        }
      });
      for (const panel of Array.from(panelAttrs.keys())) {
        if (!panels.includes(panel)) panelAttrs.delete(panel);
      }
    }
    const observer = new MutationObserver(() => apply());
    host.prepend(tablist);
    apply();
    observer.observe(host, { childList: true });
    host.dataset.picaReady = "true";
    return {
      update(next) {
        props = { ...props, ...next };
        apply();
      },
      destroy() {
        observer.disconnect();
        tablist.remove();
        for (const attrs of panelAttrs.values()) attrs.restore();
        panelAttrs.clear();
        sheet.destroy();
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
  var instance = PicaTabs.mount(host, take(window.PICA_PROPS || {}));
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

- Technique from [Tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) by W3C WAI-ARIA Authoring Practices Guide (W3C document).
