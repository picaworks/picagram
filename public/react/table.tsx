"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Table · table
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

// registry/ui/table/core.ts
export interface TableColumn {
  /** The row object key read by this column. */
  key: string;
  /** The visible column heading. */
  label: string;
  /** The horizontal alignment for the heading and its cells. */
  align?: "left" | "right";
}

export type TableRow = Readonly<Record<string, string | number>>;

export interface TableSort {
  /** The column key used for the initial ordering. */
  key: string;
  /** The initial ordering direction. */
  direction: "asc" | "desc";
}

export interface TableProps {
  /** The keys, labels, and alignment that define the columns. */
  columns: readonly TableColumn[];
  /** The records shown in the table body. */
  rows: readonly TableRow[];
  /** The caption that names the table. */
  label: string;
  /** Lets each column heading cycle the table ordering. */
  sortable: boolean;
  /** The ordering read when the table mounts, or null to preserve row order. */
  defaultSort: TableSort | null;
}

export interface TableEvents {
  /** A heading changed the table ordering. */
  sortChange: { key: string; direction: "asc" | "desc" | null };
}

export const defaults: TableProps = {
  columns: [
    { key: "name", label: "Name" },
    { key: "family", label: "Family" },
    { key: "size", label: "Size KB", align: "right" },
    { key: "checks", label: "Checks", align: "right" },
  ],
  rows: [
    { name: "Quiet Hero", family: "Section", size: 11.6, checks: 24 },
    { name: "Orbit Plot", family: "Data", size: 6.4, checks: 22 },
    { name: "Glyph Atlas", family: "ASCII", size: 5.8, checks: 18 },
    { name: "Signal Button", family: "UI", size: 4.2, checks: 16 },
    { name: "Grid Field", family: "Pattern", size: 3.7, checks: 12 },
  ],
  label: "Components",
  sortable: true,
  defaultSort: { key: "size", direction: "desc" },
};

type ActiveTableSort = { key: string; direction: "asc" | "desc" | null };

function tableElement<K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  return node;
}

function tableCompare(left: string | number, right: string | number): number {
  if (typeof left === "number" && typeof right === "number") return left - right;
  const a = String(left).toLowerCase();
  const b = String(right).toLowerCase();
  return a < b ? -1 : a > b ? 1 : 0;
}

function tableRules(selector: string): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  return [
    `:where(${selector}){display:block;width:100%;box-sizing:border-box;padding:clamp(1rem,3vw,2.5rem);color:${fg}}`,
    `${selector} table{width:100%;border-collapse:collapse;border-spacing:0;font-size:clamp(.75rem,1.5vw,1rem);line-height:1.45}`,
    `${selector} caption{text-align:left;padding:0 0 1.1rem;color:${muted};font-family:${GRID_FONT};font-size:.72em;font-weight:600;letter-spacing:.08em;text-transform:uppercase}`,
    `${selector} th,${selector} td{box-sizing:border-box;text-align:left;vertical-align:middle;padding:.85em clamp(.55em,2vw,1.4em) .85em 0}`,
    `${selector} th:last-child,${selector} td:last-child{padding-right:0}`,
    `${selector} th{border-bottom:1px solid color-mix(in srgb,${fg} 34%,transparent);font-size:.82em;font-weight:600;letter-spacing:.025em}`,
    `${selector} tbody tr:not(:last-child) td{border-bottom:1px solid color-mix(in srgb,${fg} 16%,transparent)}`,
    `${selector} tbody tr{height:clamp(4.5rem,9vh,5rem)}`,
    `${selector} [data-align="right"]{text-align:right}`,
    `${selector} td[data-numeric]{font-family:${GRID_FONT};font-variant-numeric:tabular-nums lining-nums}`,
    `${selector} button{appearance:none;display:inline-flex;align-items:center;gap:.55em;margin:0;padding:0;border:0;border-radius:0;background:transparent;color:inherit;font:inherit;letter-spacing:inherit;cursor:pointer}`,
    `${selector} th[data-align="right"] button{margin-left:auto}`,
    `${selector} button:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${selector} [data-caret]{color:${accent};font-family:${GRID_FONT};font-size:.9em;line-height:1}`,
  ].join("\n");
}

export const mount: Mount<TableProps> = (host, initial = {}) => {
  let props: TableProps = { ...defaults, ...initial };
  let activeSort: ActiveTableSort | null = props.defaultSort ? { ...props.defaultSort } : null;
  const emit = emitter<TableEvents>(host);
  const sheet = scope(host);
  const table = tableElement("table");
  host.append(table);

  function orderedRows(): readonly TableRow[] {
    if (!activeSort?.direction) return props.rows;
    const { key, direction } = activeSort;
    return props.rows
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const order = tableCompare(a.row[key] ?? "", b.row[key] ?? "");
        return order === 0 ? a.index - b.index : direction === "asc" ? order : -order;
      })
      .map(({ row }) => row);
  }

  function draw(): void {
    if (activeSort && !props.columns.some((column) => column.key === activeSort?.key)) activeSort = null;

    const caption = tableElement("caption");
    caption.textContent = props.label;
    caption.hidden = props.label.length === 0;

    const head = tableElement("thead");
    const headRow = tableElement("tr");
    for (const column of props.columns) {
      const cell = tableElement("th");
      cell.scope = "col";
      cell.dataset.column = column.key;
      cell.dataset.align = column.align ?? "left";
      if (activeSort?.key === column.key && activeSort.direction) {
        cell.setAttribute("aria-sort", activeSort.direction === "asc" ? "ascending" : "descending");
      }
      if (props.sortable) {
        const button = tableElement("button");
        button.type = "button";
        button.dataset.sortKey = column.key;
        const text = tableElement("span");
        text.textContent = column.label;
        button.append(text);
        if (activeSort?.key === column.key && activeSort.direction) {
          const caret = tableElement("span");
          caret.dataset.caret = "";
          caret.setAttribute("aria-hidden", "true");
          caret.textContent = activeSort.direction === "asc" ? "▴" : "▾";
          button.append(caret);
        }
        cell.append(button);
      } else {
        cell.textContent = column.label;
      }
      headRow.append(cell);
    }
    head.append(headRow);

    const body = tableElement("tbody");
    for (const row of orderedRows()) {
      const bodyRow = tableElement("tr");
      for (const column of props.columns) {
        const cell = tableElement("td");
        const value = row[column.key] ?? "";
        cell.dataset.align = column.align ?? "left";
        if (typeof value === "number") cell.dataset.numeric = "";
        cell.textContent = String(value);
        bodyRow.append(cell);
      }
      body.append(bodyRow);
    }

    table.replaceChildren(caption, head, body);
  }

  const onClick = (event: MouseEvent): void => {
    if (!props.sortable || !(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>("button[data-sort-key]");
    if (!button || !table.contains(button)) return;
    const key = button.dataset.sortKey;
    if (!key) return;
    const direction = activeSort?.key !== key ? "asc" : activeSort.direction === "desc" ? "asc" : activeSort.direction === "asc" ? null : "desc";
    activeSort = { key, direction };
    draw();
    emit("sortChange", { key, direction });
  };

  table.addEventListener("click", onClick);
  sheet.setRules(tableRules(sheet.selector));
  draw();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      draw();
    },
    destroy() {
      table.removeEventListener("click", onClick);
      table.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};

// registry/ui/table/index.tsx
export type TableComponentProps = Partial<TableProps> & Handlers<TableEvents> & WrapperProps;

/** A semantic data table with native headings, tabular figures, and optional three-state sorting. */
export function Table({ className, style, palette, ...props }: TableComponentProps) {
  const ref = usePica<TableProps, HTMLDivElement>(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
