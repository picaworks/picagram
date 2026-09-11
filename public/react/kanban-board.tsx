"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Kanban Board · kanban-board
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

// registry/data/kanban-board/core.ts
/** One card on the board. */
export interface KanbanCard {
  /** Identifies the card in the move event, stable across renders. */
  id: string;
  /** The card's short label. */
  title: string;
  /** A short mono tag shown under the title, such as "ui" or "data". */
  tag: string;
}

/** One column of cards. */
export interface KanbanColumn {
  /** Identifies the column as from and to in the move event. */
  id: string;
  /** The column's heading. */
  title: string;
  /** The cards in the column, top to bottom. */
  cards: KanbanCard[];
}

export interface KanbanBoardProps {
  /** The columns to show. Null means uncontrolled, so the board manages its own state from defaultValue. */
  value: KanbanColumn[] | null;
  /** The columns the board starts from when value is null. Read once, at mount. */
  defaultValue: KanbanColumn[];
  /** The accessible name of the board. */
  label: string;
  /** The font stack for every title, count, and tag. */
  fontFamily: string;
}

export interface KanbanBoardEvents {
  /** A card was dropped in a new column or position. */
  move: { card: string; from: string; to: string; index: number };
  /** The columns after a card moved. */
  valueChange: KanbanColumn[];
}

export const defaults: KanbanBoardProps = {
  value: null,
  defaultValue: [
    {
      id: "backlog",
      title: "Backlog",
      cards: [
        { id: "c1", title: "Measure glyph ramp", tag: "ascii" },
        { id: "c2", title: "Wire palette tokens", tag: "data" },
        { id: "c3", title: "Draft focus ring", tag: "ui" },
      ],
    },
    {
      id: "doing",
      title: "Doing",
      cards: [
        { id: "c4", title: "Spec mesh gradient", tag: "shaders" },
        { id: "c5", title: "Scope pointer drag", tag: "ui" },
      ],
    },
    {
      id: "done",
      title: "Done",
      cards: [{ id: "c6", title: "Ship scanlines", tag: "effects" }],
    },
  ],
  label: "Board",
  fontFamily: GRID_FONT,
};

/** A card's place among the columns. */
interface Spot {
  columnIndex: number;
  cardIndex: number;
}

/** A focus target: a real card, or the empty placeholder of a column that holds none. */
interface Stop {
  columnIndex: number;
  cardId: string | null;
}

/** A card being moved, and where it started. */
interface Grabbed {
  cardId: string;
  fromColumnId: string;
  fromIndex: number;
  fromCount: number;
}

function cloneCard(card: KanbanCard): KanbanCard {
  return { id: card.id, title: card.title, tag: card.tag };
}

function cloneColumns(cols: KanbanColumn[]): KanbanColumn[] {
  return cols.map((column) => ({ id: column.id, title: column.title, cards: column.cards.map(cloneCard) }));
}

/** The column and index of a card, by id. */
function locateCard(cols: KanbanColumn[], cardId: string): Spot | null {
  for (let columnIndex = 0; columnIndex < cols.length; columnIndex++) {
    const column = cols[columnIndex];
    if (!column) continue;
    const cardIndex = column.cards.findIndex((card) => card.id === cardId);
    if (cardIndex !== -1) return { columnIndex, cardIndex };
  }
  return null;
}

/** The current place of a focus target, or null when it no longer exists. */
function locateStop(cols: KanbanColumn[], stop: Stop): Spot | null {
  if (stop.cardId === null) {
    const column = cols[stop.columnIndex];
    return column && column.cards.length === 0 ? { columnIndex: stop.columnIndex, cardIndex: -1 } : null;
  }
  return locateCard(cols, stop.cardId);
}

/** The first stop on the board: the first column's first card, or its empty placeholder. */
function firstStop(cols: KanbanColumn[]): Stop | null {
  const column = cols[0];
  if (!column) return null;
  const card = column.cards[0];
  return { columnIndex: 0, cardId: card ? card.id : null };
}

/** Two stops are the same card wherever it now sits, since a card id is unique across the board. Only the
 *  empty placeholder, which has no id, needs its column index to tell columns apart. */
function stopEquals(a: Stop | null, b: Stop | null): boolean {
  if (!a || !b) return a === b;
  if (a.cardId !== null || b.cardId !== null) return a.cardId === b.cardId;
  return a.columnIndex === b.columnIndex;
}

/** Where an arrow key sends focus when nothing is grabbed. Up and down move within a column; left and right
 *  cross into the adjacent column, landing on its first stop. Both clamp at the board's edges. */
function navigate(cols: KanbanColumn[], stop: Stop, key: string): Stop {
  const spot = locateStop(cols, stop);
  if (!spot) return stop;
  if (key === "ArrowUp" || key === "ArrowDown") {
    const column = cols[spot.columnIndex];
    if (!column || column.cards.length === 0) return stop;
    const card = column.cards[spot.cardIndex + (key === "ArrowUp" ? -1 : 1)];
    return card ? { columnIndex: spot.columnIndex, cardId: card.id } : stop;
  }
  if (key === "ArrowLeft" || key === "ArrowRight") {
    const columnIndex = spot.columnIndex + (key === "ArrowLeft" ? -1 : 1);
    const column = cols[columnIndex];
    if (!column) return stop;
    const card = column.cards[0];
    return { columnIndex, cardId: card ? card.id : null };
  }
  return stop;
}

/** Moves the grabbed card one step by arrow key, mutating cols. Up and down reorder within its column; left
 *  and right send it to the front of the adjacent column. Returns whether it moved. */
function dragMove(cols: KanbanColumn[], cardId: string, key: string): boolean {
  const spot = locateCard(cols, cardId);
  const column = spot ? cols[spot.columnIndex] : undefined;
  if (!spot || !column) return false;
  if (key === "ArrowUp" || key === "ArrowDown") {
    const target = spot.cardIndex + (key === "ArrowUp" ? -1 : 1);
    const card = column.cards[spot.cardIndex];
    if (target < 0 || target >= column.cards.length || !card) return false;
    column.cards.splice(spot.cardIndex, 1);
    column.cards.splice(target, 0, card);
    return true;
  }
  if (key === "ArrowLeft" || key === "ArrowRight") {
    const target = cols[spot.columnIndex + (key === "ArrowLeft" ? -1 : 1)];
    const card = column.cards[spot.cardIndex];
    if (!target || !card) return false;
    column.cards.splice(spot.cardIndex, 1);
    target.cards.unshift(card);
    return true;
  }
  return false;
}

/** Moves the grabbed card to an arbitrary column and index, mutating cols, for pointer drags. Returns
 *  whether it moved. */
function relocateTo(cols: KanbanColumn[], cardId: string, columnIndex: number, index: number): boolean {
  const spot = locateCard(cols, cardId);
  const from = spot ? cols[spot.columnIndex] : undefined;
  const to = cols[columnIndex];
  const card = spot && from ? from.cards[spot.cardIndex] : undefined;
  if (!spot || !from || !to || !card) return false;
  const sameColumn = spot.columnIndex === columnIndex;
  if (sameColumn && index === spot.cardIndex) return false;
  from.cards.splice(spot.cardIndex, 1);
  const at = Math.max(0, Math.min(to.cards.length, sameColumn && index > spot.cardIndex ? index - 1 : index));
  to.cards.splice(at, 0, card);
  return true;
}

/** The column and index under a point: the nearest card by vertical middle, or the end of the column when
 *  the point is over empty space. Null when the point is outside every column. */
function hitTest(host: HTMLElement, x: number, y: number): { columnIndex: number; index: number } | null {
  const hit = document.elementFromPoint(x, y);
  const columnEl = hit instanceof HTMLElement ? hit.closest("[data-column-index]") : null;
  if (!(columnEl instanceof HTMLElement) || !host.contains(columnEl)) return null;
  const columnIndex = Number(columnEl.dataset.columnIndex);
  const cardEl = hit instanceof HTMLElement ? hit.closest('[data-pica="card"]') : null;
  if (cardEl instanceof HTMLElement && host.contains(cardEl) && Number(cardEl.dataset.columnIndex) === columnIndex) {
    const cardIndex = Number(cardEl.dataset.cardIndex);
    const rect = cardEl.getBoundingClientRect();
    return { columnIndex, index: y < rect.top + rect.height / 2 ? cardIndex : cardIndex + 1 };
  }
  return { columnIndex, index: Number.POSITIVE_INFINITY };
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Readonly<Record<string, string>>): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  return node;
}

/** The scoped rules for one board. Secondary text and hairlines mix fg toward transparent rather than
 *  reading the muted token, so the default look draws with only fg and accent. */
function rules(s: string, fontFamily: string): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const dim = (pct: number): string => `color-mix(in srgb, ${fg} ${pct}%, transparent)`;
  return [
    `${s}{font-family:${fontFamily};}`,
    `${s} [data-pica="columns"]{display:flex;gap:1em;align-items:flex-start;overflow-x:auto;}`,
    `${s} [data-pica="column"]{flex:0 0 auto;width:16em;box-sizing:border-box;border:1px solid ${dim(35)};}`,
    `${s} [data-pica="column-head"]{display:flex;justify-content:space-between;align-items:baseline;gap:0.5em;padding:0.6em 0.7em;text-transform:uppercase;letter-spacing:0.04em;font-size:0.85em;color:${fg};}`,
    `${s} [data-pica="column-count"]{color:${accent};font-variant-numeric:tabular-nums;}`,
    `${s} [data-pica="sr-only"]{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}`,
    `${s} [data-pica="list"]{display:flex;flex-direction:column;gap:0.6em;padding:0 0.7em 0.7em;min-height:2.6em;}`,
    `${s} [data-pica="card"],${s} [data-pica="placeholder"]{box-sizing:border-box;border:1px solid ${dim(35)};padding:0.5em 0.6em;color:${fg};}`,
    `${s} [data-pica="card"]{cursor:pointer;touch-action:none;}`,
    `${s} [data-pica="placeholder"]{color:${dim(65)};text-align:center;font-size:0.85em;}`,
    `${s} [data-pica="card-title"]{display:block;}`,
    `${s} [data-pica="card-tag"]{display:block;margin-top:0.35em;font-size:0.8em;text-transform:uppercase;letter-spacing:0.04em;color:${dim(65)};}`,
    `${s} [data-pica="card"]:hover{background:${dim(10)};}`,
    `${s} [data-pica="card"]:focus-visible,${s} [data-pica="placeholder"]:focus-visible{outline:2px solid ${accent};outline-offset:2px;}`,
    `${s} [data-pica="card"][data-grabbed="true"]{border-color:${accent};border-width:2px;padding:calc(0.5em - 1px) calc(0.6em - 1px);}`,
  ].join("\n");
}

export const mount: Mount<KanbanBoardProps> = (host, initial = {}) => {
  let props: KanbanBoardProps = { ...defaults, ...initial };
  const emit = emitter<KanbanBoardEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const uid = nextId("kanban");
  let destroyed = false;

  let columns: KanbanColumn[] = cloneColumns(props.defaultValue);
  let grabbed: Grabbed | null = null;
  let working: KanbanColumn[] | null = null;
  let focusedStop: Stop | null = firstStop(props.value ?? columns);

  const live = hiddenText("");
  live.setAttribute("data-pica", "live");
  live.setAttribute("role", "status");
  live.setAttribute("aria-live", "polite");
  live.setAttribute("aria-atomic", "true");
  const board = el("div", { "data-pica": "columns" });
  host.append(live, board);

  const announce = (text: string): void => {
    live.textContent = text;
  };
  const committedColumns = (): KanbanColumn[] => props.value ?? columns;

  function findStopElement(stop: Stop): HTMLElement | null {
    const nodes = board.querySelectorAll('[data-pica="card"],[data-pica="placeholder"]');
    for (const node of nodes) {
      const candidate = node as HTMLElement;
      const at: Stop = { columnIndex: Number(candidate.dataset.columnIndex), cardId: candidate.dataset.cardId ?? null };
      if (stopEquals(at, stop)) return candidate;
    }
    return null;
  }

  function buildCard(card: KanbanCard, column: KanbanColumn, columnIndex: number, cardIndex: number): HTMLElement {
    const isGrabbed = grabbed?.cardId === card.id;
    const node = el("div", {
      "data-pica": "card",
      role: "option",
      "aria-selected": isGrabbed ? "true" : "false",
      "aria-label": `${card.title}, ${cardIndex + 1} of ${column.cards.length}`,
      tabindex: stopEquals(focusedStop, { columnIndex, cardId: card.id }) ? "0" : "-1",
      "data-card-id": card.id,
      "data-column-index": String(columnIndex),
      "data-card-index": String(cardIndex),
    });
    if (isGrabbed) node.setAttribute("data-grabbed", "true");
    const title = el("span", { "data-pica": "card-title" });
    title.textContent = card.title;
    const tag = el("span", { "data-pica": "card-tag" });
    tag.textContent = card.tag;
    node.append(title, tag);
    return node;
  }

  function buildPlaceholder(column: KanbanColumn, columnIndex: number): HTMLElement {
    const node = el("div", {
      "data-pica": "placeholder",
      role: "option",
      "aria-selected": "false",
      "aria-label": `${column.title} is empty`,
      tabindex: stopEquals(focusedStop, { columnIndex, cardId: null }) ? "0" : "-1",
      "data-column-index": String(columnIndex),
      "data-card-index": "0",
    });
    node.textContent = "No cards";
    return node;
  }

  function buildColumn(column: KanbanColumn, columnIndex: number): HTMLElement {
    const headId = `${uid}-head-${columnIndex}`;
    const head = el("div", { "data-pica": "column-head", id: headId });
    const title = el("span", { "data-pica": "column-title" });
    title.textContent = column.title;
    const count = el("span", { "data-pica": "column-count" });
    count.textContent = String(column.cards.length);
    const countWord = el("span", { "data-pica": "sr-only" });
    countWord.textContent = column.cards.length === 1 ? " card" : " cards";
    count.append(countWord);
    head.append(title, " ", count);
    const list = el("div", { "data-pica": "list", role: "listbox", "aria-labelledby": headId, "data-column-index": String(columnIndex) });
    if (column.cards.length === 0) list.append(buildPlaceholder(column, columnIndex));
    else column.cards.forEach((card, cardIndex) => list.append(buildCard(card, column, columnIndex, cardIndex)));
    const wrap = el("div", { "data-pica": "column", "data-column-index": String(columnIndex) });
    wrap.append(head, list);
    return wrap;
  }

  function apply(): void {
    attrs.set("role", "group");
    attrs.set("aria-label", props.label ? props.label : null);
    sheet.setRules(rules(sheet.selector, props.fontFamily));
    const display = grabbed && working ? working : committedColumns();
    const hadFocus = host.contains(document.activeElement);
    board.replaceChildren(...display.map((column, index) => buildColumn(column, index)));
    if (hadFocus && focusedStop) findStopElement(focusedStop)?.focus({ preventScroll: true });
  }

  function pickUp(cardId: string): void {
    const committed = committedColumns();
    const spot = locateCard(committed, cardId);
    const column = spot ? committed[spot.columnIndex] : undefined;
    const card = spot && column ? column.cards[spot.cardIndex] : undefined;
    if (!spot || !column || !card) return;
    grabbed = { cardId, fromColumnId: column.id, fromIndex: spot.cardIndex, fromCount: column.cards.length };
    working = cloneColumns(committed);
    focusedStop = { columnIndex: spot.columnIndex, cardId };
    announce(`Picked up ${card.title}, ${spot.cardIndex + 1} of ${column.cards.length} in ${column.title}. Arrow keys move it, space drops it, escape cancels.`);
    apply();
  }

  function dropGrabbed(): void {
    const active = grabbed;
    const draft = working;
    if (!active || !draft) return;
    const spot = locateCard(draft, active.cardId);
    const column = spot ? draft[spot.columnIndex] : undefined;
    const card = spot && column ? column.cards[spot.cardIndex] : undefined;
    if (spot && column && card) {
      if (column.id !== active.fromColumnId || spot.cardIndex !== active.fromIndex) {
        const snapshot = cloneColumns(draft);
        emit("move", { card: card.id, from: active.fromColumnId, to: column.id, index: spot.cardIndex });
        emit("valueChange", snapshot);
        if (props.value === null) columns = cloneColumns(draft);
        announce(`Dropped ${card.title} in ${column.title}, ${spot.cardIndex + 1} of ${column.cards.length}.`);
      } else {
        announce(`Dropped ${card.title}.`);
      }
    }
    grabbed = null;
    working = null;
    apply();
  }

  function cancelGrab(): void {
    const active = grabbed;
    if (!active) return;
    const committed = committedColumns();
    const spot = locateCard(committed, active.cardId);
    const column = spot ? committed[spot.columnIndex] : undefined;
    const card = spot && column ? column.cards[spot.cardIndex] : undefined;
    announce(card && column ? `Cancelled. ${card.title} stayed in ${column.title}, ${active.fromIndex + 1} of ${active.fromCount}.` : "Cancelled.");
    grabbed = null;
    working = null;
    apply();
  }

  function onKeydown(event: KeyboardEvent): void {
    const target = event.target;
    const stopEl = target instanceof HTMLElement ? target.closest('[data-pica="card"],[data-pica="placeholder"]') : null;
    if (!(stopEl instanceof HTMLElement) || !host.contains(stopEl)) return;
    if (event.key === " ") {
      event.preventDefault();
      if (grabbed) dropGrabbed();
      else if (stopEl.dataset.cardId) pickUp(stopEl.dataset.cardId);
      return;
    }
    if (event.key === "Escape") {
      if (grabbed) {
        event.preventDefault();
        cancelGrab();
      }
      return;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const active = grabbed;
      const draft = working;
      if (active && draft) {
        if (!dragMove(draft, active.cardId, event.key)) return;
        const spot = locateCard(draft, active.cardId);
        const column = spot ? draft[spot.columnIndex] : undefined;
        const card = spot && column ? column.cards[spot.cardIndex] : undefined;
        if (spot && column && card) {
          focusedStop = { columnIndex: spot.columnIndex, cardId: active.cardId };
          announce(`${card.title} now ${spot.cardIndex + 1} of ${column.cards.length} in ${column.title}.`);
        }
        apply();
      } else if (focusedStop) {
        const next = navigate(committedColumns(), focusedStop, event.key);
        if (!stopEquals(next, focusedStop)) {
          focusedStop = next;
          apply();
        }
      }
    }
  }

  let pointerId: number | null = null;
  let pointerCardId: string | null = null;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let dragging = false;

  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    const target = event.target;
    const cardEl = target instanceof HTMLElement ? target.closest('[data-pica="card"]') : null;
    if (!(cardEl instanceof HTMLElement) || !host.contains(cardEl) || !cardEl.dataset.cardId) return;
    if (grabbed && grabbed.cardId !== cardEl.dataset.cardId) cancelGrab();
    pointerId = event.pointerId;
    pointerCardId = cardEl.dataset.cardId;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    dragging = false;
    host.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent): void {
    const activeId = pointerId;
    const cardId = pointerCardId;
    if (activeId === null || event.pointerId !== activeId || !cardId) return;
    if (!dragging) {
      if (Math.hypot(event.clientX - pointerStartX, event.clientY - pointerStartY) < 5) return;
      dragging = true;
      if (!grabbed) pickUp(cardId);
    }
    event.preventDefault();
    const draft = working;
    if (!grabbed || !draft) return;
    const hit = hitTest(host, event.clientX, event.clientY);
    if (hit && relocateTo(draft, cardId, hit.columnIndex, hit.index)) {
      const spot = locateCard(draft, cardId);
      if (spot) focusedStop = { columnIndex: spot.columnIndex, cardId };
      apply();
    }
  }

  function endPointer(event: PointerEvent, cancel: boolean): void {
    const activeId = pointerId;
    if (activeId === null || event.pointerId !== activeId) return;
    if (host.hasPointerCapture(activeId)) host.releasePointerCapture(activeId);
    pointerId = null;
    pointerCardId = null;
    const wasDragging = dragging;
    dragging = false;
    if (wasDragging) {
      if (cancel) cancelGrab();
      else dropGrabbed();
    }
  }

  const onPointerUp = (event: PointerEvent): void => endPointer(event, false);
  const onPointerCancel = (event: PointerEvent): void => endPointer(event, true);

  function onFocusIn(event: FocusEvent): void {
    const target = event.target;
    const stopEl = target instanceof HTMLElement ? target.closest('[data-pica="card"],[data-pica="placeholder"]') : null;
    if (!(stopEl instanceof HTMLElement) || !host.contains(stopEl)) return;
    const next: Stop = { columnIndex: Number(stopEl.dataset.columnIndex), cardId: stopEl.dataset.cardId ?? null };
    if (stopEquals(next, focusedStop)) return;
    focusedStop = next;
    for (const node of board.querySelectorAll('[data-pica="card"],[data-pica="placeholder"]')) (node as HTMLElement).tabIndex = node === stopEl ? 0 : -1;
  }

  host.addEventListener("keydown", onKeydown);
  host.addEventListener("pointerdown", onPointerDown);
  host.addEventListener("pointermove", onPointerMove);
  host.addEventListener("pointerup", onPointerUp);
  host.addEventListener("pointercancel", onPointerCancel);
  host.addEventListener("focusin", onFocusIn);

  apply();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const prevValue = props.value;
      props = { ...props, ...next };
      if (!sameJson(prevValue, props.value)) {
        grabbed = null;
        working = null;
        const committed = committedColumns();
        if (!focusedStop || !locateStop(committed, focusedStop)) focusedStop = firstStop(committed);
      }
      apply();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      host.removeEventListener("keydown", onKeydown);
      host.removeEventListener("pointerdown", onPointerDown);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerup", onPointerUp);
      host.removeEventListener("pointercancel", onPointerCancel);
      host.removeEventListener("focusin", onFocusIn);
      live.remove();
      board.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};

// registry/data/kanban-board/index.tsx
export type KanbanBoardComponentProps = Partial<KanbanBoardProps> & Handlers<KanbanBoardEvents> & WrapperProps;

/** Columns of cards that move between columns by keyboard or by pointer drag. */
export function KanbanBoard({ className, style, palette, ...props }: KanbanBoardComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
