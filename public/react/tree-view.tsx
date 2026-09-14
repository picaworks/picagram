"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Tree View · tree-view
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

// registry/ui/tree-view/core.ts
export interface TreeNode {
  /** The stable value reported when this node is selected. */
  id: string;
  /** The text shown for this node. */
  label: string;
  /** Child nodes nested beneath this node. */
  children?: readonly TreeNode[];
}

export interface TreeViewProps {
  /** The hierarchical nodes shown in the tree. */
  nodes: readonly TreeNode[];
  /** The selected node id, or null to manage selection inside the core. */
  value: string | null;
  /** The initially selected node id when value is null. */
  defaultValue: string;
  /** Parent ids that start open. */
  expanded: readonly string[];
  /** The accessible name of the tree. */
  label: string;
}

export interface TreeViewEvents {
  /** A node was selected through the keyboard or pointer. */
  valueChange: string;
}

export const defaults: TreeViewProps = {
  nodes: [
    {
      id: "components",
      label: "Components",
      children: [
        { id: "ascii", label: "ASCII" },
        { id: "dither", label: "Dither" },
        { id: "shaders", label: "Shaders" },
      ],
    },
    {
      id: "docs",
      label: "Docs",
      children: [
        { id: "guides", label: "Guides" },
        { id: "reference", label: "Reference" },
      ],
    },
  ],
  value: null,
  defaultValue: "dither",
  expanded: ["components"],
  label: "Contents",
};

interface TreeEntry {
  readonly node: TreeNode;
  readonly el: HTMLElement;
  readonly row: HTMLElement;
  readonly marker: HTMLElement;
  readonly label: HTMLElement;
  readonly group: HTMLElement | null;
  readonly parentId: string | null;
}

function treeRules(selector: string): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  return [
    `${selector}{display:flex;flex-direction:column;justify-content:center;min-height:12rem;color:${fg}}`,
    `${selector}>[role="treeitem"]{width:min(100%,22rem);margin-inline:auto}`,
    `${selector} [role="treeitem"]{list-style:none;outline:none;box-sizing:border-box}`,
    `${selector} [role="group"]{display:block}`,
    `${selector} [role="group"][hidden]{display:none}`,
    `${selector} [data-pica-row]{display:flex;align-items:baseline;min-height:2rem;padding:0.34rem 0.5rem;box-sizing:border-box;cursor:default}`,
    `${selector} [data-pica-row]:hover{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${selector} [role="treeitem"]:focus-visible>[data-pica-row]{outline:2px solid ${accent};outline-offset:2px}`,
    `${selector} [data-pica-guide]{flex:none;color:${muted};font-family:${GRID_FONT};white-space:pre}`,
    `${selector} [data-pica-marker]{flex:none;width:1.5ch;color:${muted};font-family:${GRID_FONT};font-weight:600;cursor:pointer}`,
    `${selector} [data-pica-marker="leaf"]{cursor:default}`,
    `${selector} [data-pica-label]{font:inherit;line-height:1.3;border-bottom:2px solid transparent}`,
    `${selector} [aria-selected="true"]>[data-pica-row]>[data-pica-label]{border-bottom-color:${accent}}`,
  ].join("\n");
}

export const mount: Mount<TreeViewProps> = (host, initial = {}) => {
  let props: TreeViewProps = { ...defaults, ...initial };
  let internalValue = props.defaultValue;
  let open = new Set(props.expanded);
  let focusId = props.nodes[0]?.id ?? "";
  let entries: TreeEntry[] = [];
  let roots: HTMLElement[] = [];
  let byId = new Map<string, TreeEntry>();
  const emit = emitter<TreeViewEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);

  const selected = (): string => props.value === null ? internalValue : props.value;

  function isVisible(entry: TreeEntry): boolean {
    let parentId = entry.parentId;
    while (parentId !== null) {
      if (!open.has(parentId)) return false;
      parentId = byId.get(parentId)?.parentId ?? null;
    }
    return true;
  }

  function visibleEntries(): TreeEntry[] {
    return entries.filter(isVisible);
  }

  function applyRoving(): void {
    const visible = visibleEntries();
    if (!visible.some((entry) => entry.node.id === focusId)) focusId = visible[0]?.node.id ?? "";
    for (const entry of entries) entry.el.tabIndex = entry.node.id === focusId ? 0 : -1;
  }

  function applySelection(): void {
    const value = selected();
    for (const entry of entries) entry.el.setAttribute("aria-selected", String(entry.node.id === value));
  }

  function applyExpansion(): void {
    for (const entry of entries) {
      if (!entry.group) continue;
      const expanded = open.has(entry.node.id);
      entry.el.setAttribute("aria-expanded", String(expanded));
      entry.marker.textContent = expanded ? "-" : "+";
      entry.group.hidden = !expanded;
    }
    applyRoving();
  }

  function focusEntry(entry: TreeEntry): void {
    focusId = entry.node.id;
    applyRoving();
    entry.el.focus();
  }

  function buildLevel(nodes: readonly TreeNode[], parent: HTMLElement, parentId: string | null, depth: number, prefix: string): void {
    nodes.forEach((node, index) => {
      const last = index === nodes.length - 1;
      const item = document.createElement("div");
      const row = document.createElement("div");
      const guide = document.createElement("span");
      const marker = document.createElement("span");
      const label = document.createElement("span");
      const hasChildren = Boolean(node.children?.length);
      item.setAttribute("data-pica", "");
      item.setAttribute("data-node-id", node.id);
      item.setAttribute("role", "treeitem");
      item.setAttribute("aria-label", node.label);
      item.setAttribute("aria-level", String(depth + 1));
      item.setAttribute("aria-posinset", String(index + 1));
      item.setAttribute("aria-setsize", String(nodes.length));
      row.setAttribute("data-pica", "");
      row.setAttribute("data-pica-row", "");
      guide.setAttribute("data-pica", "");
      guide.setAttribute("data-pica-guide", "");
      guide.setAttribute("aria-hidden", "true");
      guide.textContent = depth === 0 ? "─" : `${prefix}${last ? "└" : "├"}`;
      marker.setAttribute("data-pica", "");
      marker.setAttribute("data-pica-marker", hasChildren ? "parent" : "leaf");
      marker.setAttribute("aria-hidden", "true");
      marker.textContent = hasChildren ? "+" : "·";
      label.setAttribute("data-pica", "");
      label.setAttribute("data-pica-label", "");
      label.textContent = node.label;
      row.append(guide, marker, label);
      item.append(row);
      let group: HTMLElement | null = null;
      if (hasChildren) {
        group = document.createElement("div");
        group.setAttribute("data-pica", "");
        group.setAttribute("role", "group");
        item.append(group);
      }
      parent.append(item);
      const entry: TreeEntry = { node, el: item, row, marker, label, group, parentId };
      entries.push(entry);
      byId.set(node.id, entry);
      if (group && node.children) buildLevel(node.children, group, node.id, depth + 1, `${prefix}${last ? " " : "│"}`);
    });
  }

  function rebuild(): void {
    for (const root of roots) root.remove();
    entries = [];
    roots = [];
    byId = new Map();
    const holder = document.createElement("div");
    holder.setAttribute("data-pica", "");
    buildLevel(props.nodes, holder, null, 0, "");
    roots = Array.from(holder.children) as HTMLElement[];
    host.append(...roots);
    applySelection();
    applyExpansion();
  }

  function toggle(entry: TreeEntry): void {
    if (!entry.group) return;
    if (open.has(entry.node.id)) {
      if (entry.group.contains(document.activeElement)) focusEntry(entry);
      open.delete(entry.node.id);
    } else open.add(entry.node.id);
    applyExpansion();
  }

  function choose(entry: TreeEntry): void {
    if (props.value === null) {
      internalValue = entry.node.id;
      applySelection();
    }
    emit("valueChange", entry.node.id);
  }

  const itemFrom = (target: EventTarget | null): TreeEntry | undefined => {
    if (!(target instanceof Element)) return undefined;
    const item = target.closest<HTMLElement>("[role=treeitem]");
    return item ? byId.get(item.getAttribute("data-node-id") ?? "") : undefined;
  };

  const onClick = (event: MouseEvent): void => {
    const entry = itemFrom(event.target);
    if (!entry || !(event.target instanceof Element)) return;
    if (event.target.closest("[data-pica-marker=parent]")) {
      focusEntry(entry);
      toggle(entry);
    } else if (event.target.closest("[data-pica-label]")) {
      focusEntry(entry);
      choose(entry);
    }
  };

  const onFocusIn = (event: FocusEvent): void => {
    const entry = itemFrom(event.target);
    if (!entry) return;
    focusId = entry.node.id;
    applyRoving();
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    const entry = itemFrom(event.target);
    if (!entry) return;
    const visible = visibleEntries();
    const index = visible.indexOf(entry);
    let destination: TreeEntry | undefined;
    if (event.key === "ArrowRight") {
      if (entry.group) {
        if (!open.has(entry.node.id)) toggle(entry);
        else destination = visible[index + 1];
      }
    } else if (event.key === "ArrowLeft") {
      if (entry.group && open.has(entry.node.id)) toggle(entry);
      else if (entry.parentId) destination = byId.get(entry.parentId);
    } else if (event.key === "ArrowDown") destination = visible[index + 1];
    else if (event.key === "ArrowUp") destination = visible[index - 1];
    else if (event.key === "Home") destination = visible[0];
    else if (event.key === "End") destination = visible[visible.length - 1];
    else if (event.key === "Enter" || event.key === " ") choose(entry);
    else if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
      const needle = event.key.toLocaleLowerCase();
      for (let offset = 1; offset <= visible.length; offset++) {
        const candidate = visible[(index + offset) % visible.length];
        if (candidate?.node.label.toLocaleLowerCase().startsWith(needle)) {
          destination = candidate;
          break;
        }
      }
    } else return;
    event.preventDefault();
    if (destination) focusEntry(destination);
  };

  attrs.set("role", "tree");
  attrs.set("aria-label", props.label);
  sheet.setRules(treeRules(sheet.selector));
  host.addEventListener("click", onClick);
  host.addEventListener("focusin", onFocusIn);
  host.addEventListener("keydown", onKeyDown);
  rebuild();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const nodesChanged = next.nodes !== undefined && !sameJson(next.nodes, props.nodes);
      const expandedChanged = next.expanded !== undefined && !sameJson(next.expanded, props.expanded);
      props = { ...props, ...next };
      if (expandedChanged) open = new Set(props.expanded);
      if (nodesChanged) rebuild();
      else {
        if (expandedChanged) applyExpansion();
        if (next.value !== undefined) applySelection();
      }
      if (next.label !== undefined) attrs.set("aria-label", props.label);
    },
    destroy() {
      host.removeEventListener("click", onClick);
      host.removeEventListener("focusin", onFocusIn);
      host.removeEventListener("keydown", onKeyDown);
      for (const root of roots) root.remove();
      roots = [];
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};

// registry/ui/tree-view/index.tsx
export type TreeViewComponentProps = Partial<TreeViewProps> & Handlers<TreeViewEvents> & WrapperProps;

/** A keyboard navigable tree with nested groups, internal expansion, and controlled or uncontrolled selection. */
export function TreeView({ className, style, palette, ...props }: TreeViewComponentProps) {
  const ref = usePica<TreeViewProps, HTMLDivElement>(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
