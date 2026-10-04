# Menu

> A native trigger opens a keyboard navigable popover menu and reports the chosen action.

Category: ui. Tags: menu, popover, actions, ui. Static. Size: 3.1 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/menu.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` | readonly MenuItem[] | `[{"id":"duplicate","label":"Duplicate","shortcut":"⌘D","disabled":false},{"id":"rename","label":"Rename","shortcut":"","disabled":false},{"id":"archive","label":"Archive","shortcut":"⌘E","disabled":false},{"id":"delete","label":"Delete","shortcut":"⌫","disabled":false}]` | The actions shown when the trigger opens the menu. |
| `label` | string | `"Actions"` | The trigger button text. |
| `disabled` | boolean | `false` | Blocks input and dims the trigger. |

## Events

Each event is a CustomEvent on the host named `pica:` plus the event name in lower case. It does not bubble. In React, pass the matching `on` prop.

| Event | React prop | Detail | Description |
|---|---|---|---|
| `select` | `onSelect` | `string` | An enabled item was activated. |

## Colors

Draws with `--pica-fg`, `--pica-accent`, `--pica-muted`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Menu · menu
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

// registry/ui/menu/core.ts
export interface MenuItem {
  /** A stable value reported when the item is chosen. */
  id: string;
  /** The action text shown in the menu. */
  label: string;
  /** An optional keyboard shortcut hint. */
  shortcut: string;
  /** Dims the item and prevents activation. */
  disabled: boolean;
}

export interface MenuProps {
  /** The actions shown when the trigger opens the menu. */
  items: readonly MenuItem[];
  /** The trigger button text. */
  label: string;
  /** Blocks input and dims the trigger. */
  disabled: boolean;
}

export interface MenuEvents {
  /** An enabled item was activated. */
  select: string;
}

export const defaults: MenuProps = {
  items: [
    { id: "duplicate", label: "Duplicate", shortcut: "⌘D", disabled: false },
    { id: "rename", label: "Rename", shortcut: "", disabled: false },
    { id: "archive", label: "Archive", shortcut: "⌘E", disabled: false },
    { id: "delete", label: "Delete", shortcut: "⌫", disabled: false },
  ],
  label: "Actions",
  disabled: false,
};

function menuRules(hostSelector: string, menuSelector: string, anchor: string): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const muted = cssVar("muted");
  return [
    `${hostSelector}{appearance:none;margin:0;padding:0.45em 0.75em;display:inline-flex;align-items:center;gap:0.65em;border:1px solid ${muted};border-radius:0;background:transparent;color:${fg};font:inherit;line-height:1.2;cursor:pointer;anchor-name:${anchor}}`,
    `${hostSelector}:hover:not(:disabled){background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${hostSelector}:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${hostSelector}:disabled{opacity:0.45;cursor:not-allowed}`,
    `${hostSelector}>[data-pica-chevron]{color:${accent};font-family:${GRID_FONT};font-size:0.8em}`,
    `${menuSelector}{box-sizing:border-box;position:fixed;position-anchor:${anchor};inset:auto;margin:6px 0 0;padding:4px;min-width:12em;max-width:calc(100vw - 8px);border:1px solid ${muted};border-radius:0;background:inherit;color:${fg};font:inherit;line-height:1.2}`,
    `${menuSelector}::backdrop{background:transparent}`,
    `${menuSelector}>[role="menuitem"]{box-sizing:border-box;padding:0.5em 0.6em;display:flex;align-items:center;justify-content:space-between;gap:2em;min-width:0;outline:none;cursor:pointer}`,
    `${menuSelector}>[role="menuitem"][data-active="true"]{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${menuSelector}>[role="menuitem"]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${menuSelector}>[role="menuitem"][aria-disabled="true"]{opacity:0.45;cursor:not-allowed}`,
    `${menuSelector} [data-pica-shortcut]{margin-left:auto;color:${muted};font-family:${GRID_FONT};font-size:0.8em;white-space:nowrap}`,
    `@supports (position-anchor:${anchor}){${menuSelector}{top:anchor(bottom);left:anchor(left);min-width:max(12em,anchor-size(width))}}`,
  ].join("\n");
}

export const mount: Mount<MenuProps> = (host, initial = {}) => {
  let props: MenuProps = { ...defaults, ...initial };
  let open = false;
  let activeIndex = -1;
  const emit = emitter<MenuEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const menuId = nextId("pica-menu");
  const menuSelector = `#${menuId}`;
  const anchor = `--${menuId}`;
  const label = document.createElement("span");
  const chevron = document.createElement("span");
  const popover = document.createElement("div");

  label.setAttribute("data-pica", "");
  chevron.setAttribute("data-pica", "");
  chevron.setAttribute("data-pica-chevron", "");
  chevron.setAttribute("aria-hidden", "true");
  chevron.textContent = "▾";
  popover.setAttribute("data-pica", "");
  popover.id = menuId;
  popover.popover = "manual";
  popover.setAttribute("role", "menu");
  host.append(label, chevron);
  document.body.append(popover);

  function rows(): HTMLElement[] {
    return Array.from(popover.querySelectorAll<HTMLElement>(":scope > [role=menuitem]"));
  }

  function setActive(index: number, focus: boolean): void {
    const entries = rows();
    if (entries.length === 0) {
      activeIndex = -1;
      return;
    }
    activeIndex = ((index % entries.length) + entries.length) % entries.length;
    for (const [rowIndex, row] of entries.entries()) {
      const active = rowIndex === activeIndex;
      row.dataset.active = String(active);
      row.tabIndex = active ? 0 : -1;
    }
    if (focus) entries[activeIndex]?.focus();
  }

  function positionPopover(): void {
    if (CSS.supports("position-anchor", anchor)) {
      popover.style.removeProperty("left");
      popover.style.removeProperty("top");
      popover.style.removeProperty("min-width");
      return;
    }
    const rect = host.getBoundingClientRect();
    popover.style.left = `${Math.max(4, Math.min(rect.left, window.innerWidth - 196))}px`;
    popover.style.top = `${rect.bottom}px`;
    popover.style.minWidth = `${rect.width}px`;
  }

  function closeMenu(returnFocus: boolean): void {
    if (!open) return;
    open = false;
    attrs.set("aria-expanded", "false");
    if (popover.matches(":popover-open")) popover.hidePopover();
    if (returnFocus) host.focus();
  }

  function openMenu(edge: "first" | "last"): void {
    if (props.disabled || props.items.length === 0) return;
    if (!open) {
      positionPopover();
      popover.showPopover();
      open = true;
      attrs.set("aria-expanded", "true");
    }
    setActive(edge === "first" ? 0 : props.items.length - 1, true);
  }

  function activate(index: number): void {
    const item = props.items[index];
    if (!item || item.disabled) return;
    emit("select", item.id);
    closeMenu(true);
  }

  function rebuildItems(): void {
    const hadFocus = popover.contains(document.activeElement);
    popover.replaceChildren();
    for (const [index, item] of props.items.entries()) {
      const row = document.createElement("div");
      const itemLabel = document.createElement("span");
      row.setAttribute("data-pica", "");
      row.setAttribute("role", "menuitem");
      row.setAttribute("aria-disabled", String(item.disabled));
      row.dataset.menuIndex = String(index);
      row.tabIndex = -1;
      itemLabel.setAttribute("data-pica", "");
      itemLabel.textContent = item.label;
      row.append(itemLabel);
      if (item.shortcut) {
        const shortcut = document.createElement("span");
        shortcut.setAttribute("data-pica", "");
        shortcut.setAttribute("data-pica-shortcut", "");
        shortcut.setAttribute("aria-hidden", "true");
        shortcut.textContent = item.shortcut;
        row.append(shortcut);
      }
      popover.append(row);
    }
    if (open) setActive(Math.min(Math.max(activeIndex, 0), props.items.length - 1), hadFocus);
  }

  const onTriggerClick = (event: MouseEvent): void => {
    if (props.disabled) return;
    if (event.detail === 0 && open) return;
    if (open) closeMenu(false);
    else openMenu("first");
  };

  const onTriggerKeyDown = (event: KeyboardEvent): void => {
    if (props.disabled) return;
    if (event.key === "ArrowUp") {
      event.preventDefault();
      openMenu("last");
    } else if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openMenu("first");
    }
  };

  const onMenuKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActive(activeIndex + (event.key === "ArrowDown" ? 1 : -1), true);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActive(event.key === "Home" ? 0 : props.items.length - 1, true);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate(activeIndex);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
    } else if (event.key === "Tab") {
      closeMenu(false);
    } else if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
      const needle = event.key.toLocaleLowerCase();
      for (let offset = 1; offset <= props.items.length; offset++) {
        const index = (activeIndex + offset) % props.items.length;
        if (props.items[index]?.label.trim().toLocaleLowerCase().startsWith(needle)) {
          event.preventDefault();
          setActive(index, true);
          break;
        }
      }
    }
  };

  const onMenuPointerMove = (event: PointerEvent): void => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[role=menuitem]") : null;
    if (target && popover.contains(target)) setActive(Number(target.dataset.menuIndex), false);
  };

  const onMenuClick = (event: MouseEvent): void => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[role=menuitem]") : null;
    if (target && popover.contains(target)) activate(Number(target.dataset.menuIndex));
  };

  const onOutsidePointerDown = (event: PointerEvent): void => {
    const path = event.composedPath();
    if (open && !path.includes(host) && !path.includes(popover)) closeMenu(false);
  };

  const onReposition = (): void => {
    if (open) positionPopover();
  };

  const onToggle = (): void => {
    if (open && !popover.matches(":popover-open")) {
      open = false;
      attrs.set("aria-expanded", "false");
    }
  };

  host.addEventListener("click", onTriggerClick);
  host.addEventListener("keydown", onTriggerKeyDown);
  popover.addEventListener("keydown", onMenuKeyDown);
  popover.addEventListener("pointermove", onMenuPointerMove);
  popover.addEventListener("click", onMenuClick);
  popover.addEventListener("toggle", onToggle);
  document.addEventListener("pointerdown", onOutsidePointerDown, true);
  window.addEventListener("resize", onReposition);
  window.addEventListener("scroll", onReposition, true);

  function apply(previousItems?: readonly MenuItem[]): void {
    attrs.set("type", "button");
    attrs.set("disabled", props.disabled ? "" : null);
    attrs.set("aria-haspopup", "menu");
    attrs.set("aria-expanded", String(open));
    attrs.set("aria-controls", menuId);
    label.textContent = props.label;
    popover.setAttribute("aria-label", `${props.label} menu`);
    sheet.setRules(menuRules(sheet.selector, menuSelector, anchor));
    if (!previousItems || !sameJson(previousItems, props.items)) rebuildItems();
    if (props.disabled) closeMenu(false);
  }

  apply();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const previousItems = props.items;
      props = { ...props, ...next };
      apply(previousItems);
    },
    destroy() {
      closeMenu(false);
      host.removeEventListener("click", onTriggerClick);
      host.removeEventListener("keydown", onTriggerKeyDown);
      popover.removeEventListener("keydown", onMenuKeyDown);
      popover.removeEventListener("pointermove", onMenuPointerMove);
      popover.removeEventListener("click", onMenuClick);
      popover.removeEventListener("toggle", onToggle);
      document.removeEventListener("pointerdown", onOutsidePointerDown, true);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
      label.remove();
      chevron.remove();
      popover.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};

// registry/ui/menu/index.tsx
export type MenuComponentProps = Partial<MenuProps> & Handlers<MenuEvents> & WrapperProps;

/** A button that opens a keyboard navigable menu of actions. */
export function Menu({ className, style, palette, ...props }: MenuComponentProps) {
  const ref = usePica<MenuProps, HTMLButtonElement>(mount, props);
  return <button ref={ref} type="button" className={className} style={{ ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Menu · menu
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Menu · Pica</title>
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
<div class="pica-stage"><button id="pica" type="button"></button></div>
<script>
"use strict";
var PicaMenu = (() => {
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

  // registry/ui/menu/core.ts
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

  // registry/ui/menu/core.ts
  var defaults = {
    items: [
      { id: "duplicate", label: "Duplicate", shortcut: "⌘D", disabled: false },
      { id: "rename", label: "Rename", shortcut: "", disabled: false },
      { id: "archive", label: "Archive", shortcut: "⌘E", disabled: false },
      { id: "delete", label: "Delete", shortcut: "⌫", disabled: false }
    ],
    label: "Actions",
    disabled: false
  };
  function menuRules(hostSelector, menuSelector, anchor) {
    const fg = cssVar("fg");
    const accent = cssVar("accent");
    const muted = cssVar("muted");
    return [
      `${hostSelector}{appearance:none;margin:0;padding:0.45em 0.75em;display:inline-flex;align-items:center;gap:0.65em;border:1px solid ${muted};border-radius:0;background:transparent;color:${fg};font:inherit;line-height:1.2;cursor:pointer;anchor-name:${anchor}}`,
      `${hostSelector}:hover:not(:disabled){background:color-mix(in srgb, ${fg} 10%, transparent)}`,
      `${hostSelector}:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
      `${hostSelector}:disabled{opacity:0.45;cursor:not-allowed}`,
      `${hostSelector}>[data-pica-chevron]{color:${accent};font-family:${GRID_FONT};font-size:0.8em}`,
      `${menuSelector}{box-sizing:border-box;position:fixed;position-anchor:${anchor};inset:auto;margin:6px 0 0;padding:4px;min-width:12em;max-width:calc(100vw - 8px);border:1px solid ${muted};border-radius:0;background:inherit;color:${fg};font:inherit;line-height:1.2}`,
      `${menuSelector}::backdrop{background:transparent}`,
      `${menuSelector}>[role="menuitem"]{box-sizing:border-box;padding:0.5em 0.6em;display:flex;align-items:center;justify-content:space-between;gap:2em;min-width:0;outline:none;cursor:pointer}`,
      `${menuSelector}>[role="menuitem"][data-active="true"]{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
      `${menuSelector}>[role="menuitem"]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
      `${menuSelector}>[role="menuitem"][aria-disabled="true"]{opacity:0.45;cursor:not-allowed}`,
      `${menuSelector} [data-pica-shortcut]{margin-left:auto;color:${muted};font-family:${GRID_FONT};font-size:0.8em;white-space:nowrap}`,
      `@supports (position-anchor:${anchor}){${menuSelector}{top:anchor(bottom);left:anchor(left);min-width:max(12em,anchor-size(width))}}`
    ].join("\n");
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    let open = false;
    let activeIndex = -1;
    const emit = emitter(host);
    const attrs = hostAttributes(host);
    const sheet = scope(host);
    const menuId = nextId("pica-menu");
    const menuSelector = `#${menuId}`;
    const anchor = `--${menuId}`;
    const label = document.createElement("span");
    const chevron = document.createElement("span");
    const popover = document.createElement("div");
    label.setAttribute("data-pica", "");
    chevron.setAttribute("data-pica", "");
    chevron.setAttribute("data-pica-chevron", "");
    chevron.setAttribute("aria-hidden", "true");
    chevron.textContent = "▾";
    popover.setAttribute("data-pica", "");
    popover.id = menuId;
    popover.popover = "manual";
    popover.setAttribute("role", "menu");
    host.append(label, chevron);
    document.body.append(popover);
    function rows() {
      return Array.from(popover.querySelectorAll(":scope > [role=menuitem]"));
    }
    function setActive(index, focus) {
      const entries = rows();
      if (entries.length === 0) {
        activeIndex = -1;
        return;
      }
      activeIndex = (index % entries.length + entries.length) % entries.length;
      for (const [rowIndex, row] of entries.entries()) {
        const active = rowIndex === activeIndex;
        row.dataset.active = String(active);
        row.tabIndex = active ? 0 : -1;
      }
      if (focus) entries[activeIndex]?.focus();
    }
    function positionPopover() {
      if (CSS.supports("position-anchor", anchor)) {
        popover.style.removeProperty("left");
        popover.style.removeProperty("top");
        popover.style.removeProperty("min-width");
        return;
      }
      const rect = host.getBoundingClientRect();
      popover.style.left = `${Math.max(4, Math.min(rect.left, window.innerWidth - 196))}px`;
      popover.style.top = `${rect.bottom}px`;
      popover.style.minWidth = `${rect.width}px`;
    }
    function closeMenu(returnFocus) {
      if (!open) return;
      open = false;
      attrs.set("aria-expanded", "false");
      if (popover.matches(":popover-open")) popover.hidePopover();
      if (returnFocus) host.focus();
    }
    function openMenu(edge) {
      if (props.disabled || props.items.length === 0) return;
      if (!open) {
        positionPopover();
        popover.showPopover();
        open = true;
        attrs.set("aria-expanded", "true");
      }
      setActive(edge === "first" ? 0 : props.items.length - 1, true);
    }
    function activate(index) {
      const item = props.items[index];
      if (!item || item.disabled) return;
      emit("select", item.id);
      closeMenu(true);
    }
    function rebuildItems() {
      const hadFocus = popover.contains(document.activeElement);
      popover.replaceChildren();
      for (const [index, item] of props.items.entries()) {
        const row = document.createElement("div");
        const itemLabel = document.createElement("span");
        row.setAttribute("data-pica", "");
        row.setAttribute("role", "menuitem");
        row.setAttribute("aria-disabled", String(item.disabled));
        row.dataset.menuIndex = String(index);
        row.tabIndex = -1;
        itemLabel.setAttribute("data-pica", "");
        itemLabel.textContent = item.label;
        row.append(itemLabel);
        if (item.shortcut) {
          const shortcut = document.createElement("span");
          shortcut.setAttribute("data-pica", "");
          shortcut.setAttribute("data-pica-shortcut", "");
          shortcut.setAttribute("aria-hidden", "true");
          shortcut.textContent = item.shortcut;
          row.append(shortcut);
        }
        popover.append(row);
      }
      if (open) setActive(Math.min(Math.max(activeIndex, 0), props.items.length - 1), hadFocus);
    }
    const onTriggerClick = (event) => {
      if (props.disabled) return;
      if (event.detail === 0 && open) return;
      if (open) closeMenu(false);
      else openMenu("first");
    };
    const onTriggerKeyDown = (event) => {
      if (props.disabled) return;
      if (event.key === "ArrowUp") {
        event.preventDefault();
        openMenu("last");
      } else if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openMenu("first");
      }
    };
    const onMenuKeyDown = (event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setActive(activeIndex + (event.key === "ArrowDown" ? 1 : -1), true);
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        setActive(event.key === "Home" ? 0 : props.items.length - 1, true);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate(activeIndex);
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeMenu(true);
      } else if (event.key === "Tab") {
        closeMenu(false);
      } else if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
        const needle = event.key.toLocaleLowerCase();
        for (let offset = 1; offset <= props.items.length; offset++) {
          const index = (activeIndex + offset) % props.items.length;
          if (props.items[index]?.label.trim().toLocaleLowerCase().startsWith(needle)) {
            event.preventDefault();
            setActive(index, true);
            break;
          }
        }
      }
    };
    const onMenuPointerMove = (event) => {
      const target = event.target instanceof Element ? event.target.closest("[role=menuitem]") : null;
      if (target && popover.contains(target)) setActive(Number(target.dataset.menuIndex), false);
    };
    const onMenuClick = (event) => {
      const target = event.target instanceof Element ? event.target.closest("[role=menuitem]") : null;
      if (target && popover.contains(target)) activate(Number(target.dataset.menuIndex));
    };
    const onOutsidePointerDown = (event) => {
      const path = event.composedPath();
      if (open && !path.includes(host) && !path.includes(popover)) closeMenu(false);
    };
    const onReposition = () => {
      if (open) positionPopover();
    };
    const onToggle = () => {
      if (open && !popover.matches(":popover-open")) {
        open = false;
        attrs.set("aria-expanded", "false");
      }
    };
    host.addEventListener("click", onTriggerClick);
    host.addEventListener("keydown", onTriggerKeyDown);
    popover.addEventListener("keydown", onMenuKeyDown);
    popover.addEventListener("pointermove", onMenuPointerMove);
    popover.addEventListener("click", onMenuClick);
    popover.addEventListener("toggle", onToggle);
    document.addEventListener("pointerdown", onOutsidePointerDown, true);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    function apply(previousItems) {
      attrs.set("type", "button");
      attrs.set("disabled", props.disabled ? "" : null);
      attrs.set("aria-haspopup", "menu");
      attrs.set("aria-expanded", String(open));
      attrs.set("aria-controls", menuId);
      label.textContent = props.label;
      popover.setAttribute("aria-label", `${props.label} menu`);
      sheet.setRules(menuRules(sheet.selector, menuSelector, anchor));
      if (!previousItems || !sameJson(previousItems, props.items)) rebuildItems();
      if (props.disabled) closeMenu(false);
    }
    apply();
    host.dataset.picaReady = "true";
    return {
      update(next) {
        const previousItems = props.items;
        props = { ...props, ...next };
        apply(previousItems);
      },
      destroy() {
        closeMenu(false);
        host.removeEventListener("click", onTriggerClick);
        host.removeEventListener("keydown", onTriggerKeyDown);
        popover.removeEventListener("keydown", onMenuKeyDown);
        popover.removeEventListener("pointermove", onMenuPointerMove);
        popover.removeEventListener("click", onMenuClick);
        popover.removeEventListener("toggle", onToggle);
        document.removeEventListener("pointerdown", onOutsidePointerDown, true);
        window.removeEventListener("resize", onReposition);
        window.removeEventListener("scroll", onReposition, true);
        label.remove();
        chevron.remove();
        popover.remove();
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
  var instance = PicaMenu.mount(host, take(window.PICA_PROPS || {}));
  ["select"].forEach(function (name) {
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

- Technique from [Menu and menubar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/) by W3C WAI-ARIA Authoring Practices Guide (W3C document).
- Technique from [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) by MDN (CC-BY-SA documentation).
