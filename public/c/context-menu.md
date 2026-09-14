# Context Menu

> A framed content region with an accessible action menu at the pointer or keyboard anchor.

Category: ui. Tags: context menu, menu, popover, actions, ui. Static. Size: 3.1 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/context-menu.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` | readonly ContextMenuItem[] | `[{"id":"duplicate","label":"Duplicate","shortcut":"⌘D","disabled":false},{"id":"rename","label":"Rename","shortcut":"","disabled":false},{"id":"archive","label":"Archive","shortcut":"⌘E","disabled":false},{"id":"delete","label":"Delete","shortcut":"⌫","disabled":false}]` | The actions shown in the menu. |
| `hint` | string | `"Right-click for actions"` | The instruction below the content. An empty string hides it. |
| `label` | string | `"Context actions"` | The accessible name of the menu. |

## Events

Each event is a CustomEvent on the host named `pica:` plus the event name in lower case. It does not bubble. In React, pass the matching `on` prop.

| Event | React prop | Detail | Description |
|---|---|---|---|
| `select` | `onSelect` | `string` | A menu item was chosen, carrying its id. |

## Children

Put content inside the component. It decorates that content and never changes it.

## Colors

Draws with `--pica-fg`, `--pica-muted`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

// Pica · Context Menu · context-menu
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

// registry/ui/context-menu/core.ts
export interface ContextMenuItem {
  /** The value reported when this item is chosen. */
  id: string;
  /** The text shown for this item. */
  label: string;
  /** The optional keyboard shortcut shown at the right edge. */
  shortcut: string;
  /** Prevents this item from receiving focus or being chosen. */
  disabled: boolean;
}

export interface ContextMenuProps {
  /** The actions shown in the menu. */
  items: readonly ContextMenuItem[];
  /** The instruction below the content. An empty string hides it. */
  hint: string;
  /** The accessible name of the menu. */
  label: string;
}

export interface ContextMenuEvents {
  /** A menu item was chosen, carrying its id. */
  select: string;
}

export const defaults: ContextMenuProps = {
  items: [
    { id: "duplicate", label: "Duplicate", shortcut: "⌘D", disabled: false },
    { id: "rename", label: "Rename", shortcut: "", disabled: false },
    { id: "archive", label: "Archive", shortcut: "⌘E", disabled: false },
    { id: "delete", label: "Delete", shortcut: "⌫", disabled: false },
  ],
  hint: "Right-click for actions",
  label: "Context actions",
};

const LONG_PRESS_MS = 500;
const VIEWPORT_GAP = 8;

function contextMenuRules(s: string): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  return [
    `:where(${s}){box-sizing:border-box;position:relative;width:100%;height:fit-content!important;min-height:8rem!important;padding:1.25rem;border:1px solid ${muted};color:${fg};background:transparent}`,
    `${s}:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${s} [data-pica-context-hint]{display:block;margin-top:1.5rem;padding-top:0.7rem;border-top:1px solid ${muted};color:${muted};font-family:${GRID_FONT};font-size:0.75em;line-height:1.4;letter-spacing:0.04em;text-transform:uppercase}`,
    `${s} [data-pica-context-hint][hidden]{display:none}`,
    `${s} [data-pica-context-menu]{box-sizing:border-box;position:fixed;inset:auto;margin:0;min-width:min(15rem,calc(100vw - 16px));max-width:calc(100vw - 16px);padding:0.35rem;border:1px solid ${muted};border-radius:0;background:color-mix(in srgb, ${fg} 10%, transparent);color:${fg};font:inherit}`,
    `${s} [data-pica-context-menu]::backdrop{background:transparent}`,
    `${s} [data-pica-context-item]{box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:1.5rem;width:100%;min-height:2.2rem;padding:0.45rem 0.6rem;cursor:default;outline:none}`,
    `${s} [data-pica-context-item][data-active]{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${s} [data-pica-context-item]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${s} [data-pica-context-item][aria-disabled="true"]{opacity:0.45}`,
    `${s} [data-pica-context-shortcut]{margin-left:auto;color:${muted};font-family:${GRID_FONT};font-size:0.8em;white-space:nowrap}`,
  ].join("\n");
}

export const mount: Mount<ContextMenuProps> = (host, initial = {}) => {
  let props: ContextMenuProps = { ...defaults, ...initial };
  let active = -1;
  let pressTimer: ReturnType<typeof setTimeout> | null = null;
  let pressX = 0;
  let pressY = 0;
  let destroyed = false;
  const emit = emitter<ContextMenuEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const menuId = nextId("pica-context-menu");
  const hintId = nextId("pica-context-hint");
  const menu = document.createElement("div");
  const hint = document.createElement("span");

  menu.id = menuId;
  menu.setAttribute("data-pica", "");
  menu.setAttribute("data-pica-context-menu", "");
  menu.setAttribute("popover", "manual");
  menu.setAttribute("role", "menu");
  hint.id = hintId;
  hint.setAttribute("data-pica", "");
  hint.setAttribute("data-pica-context-hint", "");
  host.append(hint, menu);

  function rows(): HTMLElement[] {
    return Array.from(menu.querySelectorAll<HTMLElement>("[data-pica-context-item]"));
  }

  function enabled(index: number): boolean {
    return props.items[index]?.disabled === false;
  }

  function setActive(index: number, focus: boolean): void {
    const all = rows();
    active = enabled(index) ? index : -1;
    for (let i = 0; i < all.length; i++) all[i]?.toggleAttribute("data-active", i === active);
    if (focus && active >= 0) all[active]?.focus({ preventScroll: true });
  }

  function findEnabled(from: number, direction: 1 | -1): number {
    const count = props.items.length;
    for (let step = 1; step <= count; step++) {
      const index = (from + direction * step + count) % count;
      if (enabled(index)) return index;
    }
    return -1;
  }

  function close(returnFocus: boolean): void {
    if (menu.matches(":popover-open")) menu.hidePopover();
    active = -1;
    if (returnFocus) host.focus({ preventScroll: true });
  }

  function openAt(x: number, y: number): void {
    if (!props.items.some((item) => !item.disabled)) return;
    if (!menu.matches(":popover-open")) menu.showPopover();
    const box = menu.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    menu.style.left = `${Math.max(VIEWPORT_GAP, Math.min(x, viewportWidth - box.width - VIEWPORT_GAP))}px`;
    menu.style.top = `${Math.max(VIEWPORT_GAP, Math.min(y, viewportHeight - box.height - VIEWPORT_GAP))}px`;
    setActive(findEnabled(-1, 1), true);
  }

  function choose(index: number): void {
    const item = props.items[index];
    if (!item || item.disabled) return;
    close(true);
    emit("select", item.id);
  }

  function rebuild(): void {
    menu.replaceChildren();
    props.items.forEach((item, index) => {
      const row = document.createElement("div");
      const text = document.createElement("span");
      row.setAttribute("data-pica", "");
      row.setAttribute("data-pica-context-item", "");
      row.setAttribute("data-index", String(index));
      row.setAttribute("role", "menuitem");
      row.setAttribute("tabindex", "-1");
      if (item.disabled) row.setAttribute("aria-disabled", "true");
      text.setAttribute("data-pica", "");
      text.textContent = item.label;
      row.append(text);
      if (item.shortcut) {
        const shortcut = document.createElement("kbd");
        shortcut.setAttribute("data-pica", "");
        shortcut.setAttribute("data-pica-context-shortcut", "");
        shortcut.textContent = item.shortcut;
        row.append(shortcut);
      }
      menu.append(row);
    });
  }

  function stopPress(): void {
    if (pressTimer !== null) clearTimeout(pressTimer);
    pressTimer = null;
  }

  const onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
    openAt(event.clientX, event.clientY);
  };
  const onHostKey = (event: KeyboardEvent): void => {
    if (event.target !== host) return;
    if ((event.key === "F10" && event.shiftKey) || event.key === "ContextMenu") {
      event.preventDefault();
      const box = host.getBoundingClientRect();
      openAt(box.left + VIEWPORT_GAP, box.top + VIEWPORT_GAP);
    }
  };
  const onMenuKey = (event: KeyboardEvent): void => {
    if (!menu.matches(":popover-open")) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActive(findEnabled(active, event.key === "ArrowDown" ? 1 : -1), true);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActive(findEnabled(event.key === "Home" ? -1 : 0, event.key === "Home" ? 1 : -1), true);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(active);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "Tab") {
      close(false);
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const match = props.items.findIndex((item) => !item.disabled && item.label.toLocaleLowerCase().startsWith(event.key.toLocaleLowerCase()));
      if (match >= 0) {
        event.preventDefault();
        setActive(match, true);
      }
    }
  };
  const onMenuPointer = (event: PointerEvent): void => {
    const row = (event.target as Element).closest<HTMLElement>("[data-pica-context-item]");
    if (!row || !menu.contains(row)) return;
    const index = Number(row.dataset.index);
    if (enabled(index)) setActive(index, true);
  };
  const onMenuClick = (event: MouseEvent): void => {
    const row = (event.target as Element).closest<HTMLElement>("[data-pica-context-item]");
    if (row && menu.contains(row)) choose(Number(row.dataset.index));
  };
  const onDocumentPointer = (event: PointerEvent): void => {
    if (menu.matches(":popover-open") && !menu.contains(event.target as Node)) close(false);
  };
  const onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType !== "touch") return;
    pressX = event.clientX;
    pressY = event.clientY;
    stopPress();
    pressTimer = setTimeout(() => {
      pressTimer = null;
      openAt(pressX, pressY);
    }, LONG_PRESS_MS);
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (Math.hypot(event.clientX - pressX, event.clientY - pressY) > 10) stopPress();
  };

  host.addEventListener("contextmenu", onContextMenu);
  host.addEventListener("keydown", onHostKey);
  host.addEventListener("pointerdown", onPointerDown);
  host.addEventListener("pointermove", onPointerMove);
  host.addEventListener("pointerup", stopPress);
  host.addEventListener("pointercancel", stopPress);
  menu.addEventListener("keydown", onMenuKey);
  menu.addEventListener("pointermove", onMenuPointer);
  menu.addEventListener("click", onMenuClick);
  document.addEventListener("pointerdown", onDocumentPointer, true);

  function apply(rebuildItems: boolean): void {
    attrs.set("tabindex", "0");
    attrs.set("aria-haspopup", "menu");
    attrs.set("aria-controls", menuId);
    attrs.set("aria-describedby", props.hint ? hintId : null);
    menu.setAttribute("aria-label", props.label);
    hint.textContent = props.hint;
    hint.hidden = !props.hint;
    sheet.setRules(contextMenuRules(sheet.selector));
    if (rebuildItems) rebuild();
  }

  apply(true);
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      apply(changed(before, props, ["items"]));
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stopPress();
      close(false);
      host.removeEventListener("contextmenu", onContextMenu);
      host.removeEventListener("keydown", onHostKey);
      host.removeEventListener("pointerdown", onPointerDown);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerup", stopPress);
      host.removeEventListener("pointercancel", stopPress);
      menu.removeEventListener("keydown", onMenuKey);
      menu.removeEventListener("pointermove", onMenuPointer);
      menu.removeEventListener("click", onMenuClick);
      document.removeEventListener("pointerdown", onDocumentPointer, true);
      menu.remove();
      hint.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};

// registry/ui/context-menu/index.tsx
export type ContextMenuComponentProps = Partial<ContextMenuProps> & Handlers<ContextMenuEvents> & WrapperProps & { children?: ReactNode };

/** A framed content region with an accessible menu at the pointer or keyboard anchor. */
export function ContextMenu({ className, style, palette, children, ...props }: ContextMenuComponentProps) {
  const ref = usePica<ContextMenuProps, HTMLDivElement>(mount, props);
  return <div ref={ref} className={className} style={{ ...paletteStyle(palette), ...style }}>{children}</div>;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Context Menu · context-menu
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en" data-stage="flow">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Context Menu · Pica</title>
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
<div id="pica"><p>Review this draft and choose an action when you are ready.</p></div>
<script>
"use strict";
var PicaContextMenu = (() => {
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

  // registry/ui/context-menu/core.ts
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

  // registry/ui/context-menu/core.ts
  var defaults = {
    items: [
      { id: "duplicate", label: "Duplicate", shortcut: "⌘D", disabled: false },
      { id: "rename", label: "Rename", shortcut: "", disabled: false },
      { id: "archive", label: "Archive", shortcut: "⌘E", disabled: false },
      { id: "delete", label: "Delete", shortcut: "⌫", disabled: false }
    ],
    hint: "Right-click for actions",
    label: "Context actions"
  };
  var LONG_PRESS_MS = 500;
  var VIEWPORT_GAP = 8;
  function contextMenuRules(s) {
    const fg = cssVar("fg");
    const muted = cssVar("muted");
    const accent = cssVar("accent");
    return [
      `:where(${s}){box-sizing:border-box;position:relative;width:100%;height:fit-content!important;min-height:8rem!important;padding:1.25rem;border:1px solid ${muted};color:${fg};background:transparent}`,
      `${s}:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
      `${s} [data-pica-context-hint]{display:block;margin-top:1.5rem;padding-top:0.7rem;border-top:1px solid ${muted};color:${muted};font-family:${GRID_FONT};font-size:0.75em;line-height:1.4;letter-spacing:0.04em;text-transform:uppercase}`,
      `${s} [data-pica-context-hint][hidden]{display:none}`,
      `${s} [data-pica-context-menu]{box-sizing:border-box;position:fixed;inset:auto;margin:0;min-width:min(15rem,calc(100vw - 16px));max-width:calc(100vw - 16px);padding:0.35rem;border:1px solid ${muted};border-radius:0;background:color-mix(in srgb, ${fg} 10%, transparent);color:${fg};font:inherit}`,
      `${s} [data-pica-context-menu]::backdrop{background:transparent}`,
      `${s} [data-pica-context-item]{box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:1.5rem;width:100%;min-height:2.2rem;padding:0.45rem 0.6rem;cursor:default;outline:none}`,
      `${s} [data-pica-context-item][data-active]{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
      `${s} [data-pica-context-item]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
      `${s} [data-pica-context-item][aria-disabled="true"]{opacity:0.45}`,
      `${s} [data-pica-context-shortcut]{margin-left:auto;color:${muted};font-family:${GRID_FONT};font-size:0.8em;white-space:nowrap}`
    ].join("\n");
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    let active = -1;
    let pressTimer = null;
    let pressX = 0;
    let pressY = 0;
    let destroyed = false;
    const emit = emitter(host);
    const attrs = hostAttributes(host);
    const sheet = scope(host);
    const menuId = nextId("pica-context-menu");
    const hintId = nextId("pica-context-hint");
    const menu = document.createElement("div");
    const hint = document.createElement("span");
    menu.id = menuId;
    menu.setAttribute("data-pica", "");
    menu.setAttribute("data-pica-context-menu", "");
    menu.setAttribute("popover", "manual");
    menu.setAttribute("role", "menu");
    hint.id = hintId;
    hint.setAttribute("data-pica", "");
    hint.setAttribute("data-pica-context-hint", "");
    host.append(hint, menu);
    function rows() {
      return Array.from(menu.querySelectorAll("[data-pica-context-item]"));
    }
    function enabled(index) {
      return props.items[index]?.disabled === false;
    }
    function setActive(index, focus) {
      const all = rows();
      active = enabled(index) ? index : -1;
      for (let i = 0; i < all.length; i++) all[i]?.toggleAttribute("data-active", i === active);
      if (focus && active >= 0) all[active]?.focus({ preventScroll: true });
    }
    function findEnabled(from, direction) {
      const count = props.items.length;
      for (let step = 1; step <= count; step++) {
        const index = (from + direction * step + count) % count;
        if (enabled(index)) return index;
      }
      return -1;
    }
    function close(returnFocus) {
      if (menu.matches(":popover-open")) menu.hidePopover();
      active = -1;
      if (returnFocus) host.focus({ preventScroll: true });
    }
    function openAt(x, y) {
      if (!props.items.some((item) => !item.disabled)) return;
      if (!menu.matches(":popover-open")) menu.showPopover();
      const box = menu.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;
      menu.style.left = `${Math.max(VIEWPORT_GAP, Math.min(x, viewportWidth - box.width - VIEWPORT_GAP))}px`;
      menu.style.top = `${Math.max(VIEWPORT_GAP, Math.min(y, viewportHeight - box.height - VIEWPORT_GAP))}px`;
      setActive(findEnabled(-1, 1), true);
    }
    function choose(index) {
      const item = props.items[index];
      if (!item || item.disabled) return;
      close(true);
      emit("select", item.id);
    }
    function rebuild() {
      menu.replaceChildren();
      props.items.forEach((item, index) => {
        const row = document.createElement("div");
        const text = document.createElement("span");
        row.setAttribute("data-pica", "");
        row.setAttribute("data-pica-context-item", "");
        row.setAttribute("data-index", String(index));
        row.setAttribute("role", "menuitem");
        row.setAttribute("tabindex", "-1");
        if (item.disabled) row.setAttribute("aria-disabled", "true");
        text.setAttribute("data-pica", "");
        text.textContent = item.label;
        row.append(text);
        if (item.shortcut) {
          const shortcut = document.createElement("kbd");
          shortcut.setAttribute("data-pica", "");
          shortcut.setAttribute("data-pica-context-shortcut", "");
          shortcut.textContent = item.shortcut;
          row.append(shortcut);
        }
        menu.append(row);
      });
    }
    function stopPress() {
      if (pressTimer !== null) clearTimeout(pressTimer);
      pressTimer = null;
    }
    const onContextMenu = (event) => {
      event.preventDefault();
      openAt(event.clientX, event.clientY);
    };
    const onHostKey = (event) => {
      if (event.target !== host) return;
      if (event.key === "F10" && event.shiftKey || event.key === "ContextMenu") {
        event.preventDefault();
        const box = host.getBoundingClientRect();
        openAt(box.left + VIEWPORT_GAP, box.top + VIEWPORT_GAP);
      }
    };
    const onMenuKey = (event) => {
      if (!menu.matches(":popover-open")) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setActive(findEnabled(active, event.key === "ArrowDown" ? 1 : -1), true);
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        setActive(findEnabled(event.key === "Home" ? -1 : 0, event.key === "Home" ? 1 : -1), true);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        choose(active);
      } else if (event.key === "Escape") {
        event.preventDefault();
        close(true);
      } else if (event.key === "Tab") {
        close(false);
      } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const match = props.items.findIndex((item) => !item.disabled && item.label.toLocaleLowerCase().startsWith(event.key.toLocaleLowerCase()));
        if (match >= 0) {
          event.preventDefault();
          setActive(match, true);
        }
      }
    };
    const onMenuPointer = (event) => {
      const row = event.target.closest("[data-pica-context-item]");
      if (!row || !menu.contains(row)) return;
      const index = Number(row.dataset.index);
      if (enabled(index)) setActive(index, true);
    };
    const onMenuClick = (event) => {
      const row = event.target.closest("[data-pica-context-item]");
      if (row && menu.contains(row)) choose(Number(row.dataset.index));
    };
    const onDocumentPointer = (event) => {
      if (menu.matches(":popover-open") && !menu.contains(event.target)) close(false);
    };
    const onPointerDown = (event) => {
      if (event.pointerType !== "touch") return;
      pressX = event.clientX;
      pressY = event.clientY;
      stopPress();
      pressTimer = setTimeout(() => {
        pressTimer = null;
        openAt(pressX, pressY);
      }, LONG_PRESS_MS);
    };
    const onPointerMove = (event) => {
      if (Math.hypot(event.clientX - pressX, event.clientY - pressY) > 10) stopPress();
    };
    host.addEventListener("contextmenu", onContextMenu);
    host.addEventListener("keydown", onHostKey);
    host.addEventListener("pointerdown", onPointerDown);
    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerup", stopPress);
    host.addEventListener("pointercancel", stopPress);
    menu.addEventListener("keydown", onMenuKey);
    menu.addEventListener("pointermove", onMenuPointer);
    menu.addEventListener("click", onMenuClick);
    document.addEventListener("pointerdown", onDocumentPointer, true);
    function apply(rebuildItems) {
      attrs.set("tabindex", "0");
      attrs.set("aria-haspopup", "menu");
      attrs.set("aria-controls", menuId);
      attrs.set("aria-describedby", props.hint ? hintId : null);
      menu.setAttribute("aria-label", props.label);
      hint.textContent = props.hint;
      hint.hidden = !props.hint;
      sheet.setRules(contextMenuRules(sheet.selector));
      if (rebuildItems) rebuild();
    }
    apply(true);
    host.dataset.picaReady = "true";
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        apply(changed(before, props, ["items"]));
      },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        stopPress();
        close(false);
        host.removeEventListener("contextmenu", onContextMenu);
        host.removeEventListener("keydown", onHostKey);
        host.removeEventListener("pointerdown", onPointerDown);
        host.removeEventListener("pointermove", onPointerMove);
        host.removeEventListener("pointerup", stopPress);
        host.removeEventListener("pointercancel", stopPress);
        menu.removeEventListener("keydown", onMenuKey);
        menu.removeEventListener("pointermove", onMenuPointer);
        menu.removeEventListener("click", onMenuClick);
        document.removeEventListener("pointerdown", onDocumentPointer, true);
        menu.remove();
        hint.remove();
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
  var instance = PicaContextMenu.mount(host, take(window.PICA_PROPS || {}));
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
