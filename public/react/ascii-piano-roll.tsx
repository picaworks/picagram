"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · ASCII Piano Roll · ascii-piano-roll
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

// registry/ascii/ascii-piano-roll/core.ts
export interface AsciiPianoRollNote {
  /** Unique, stable identifier used by selection. */
  id: string;
  /** Pitch label matching an entry in pitches. */
  pitch: string;
  /** Starting beat, measured from zero. */
  start: number;
  /** Note length in beats; positive durations occupy at least one cell. */
  duration: number;
}

export interface AsciiPianoRollProps {
  /** Notes to draw; out-of-range notes are clipped and invalid notes are omitted. */
  notes: AsciiPianoRollNote[];
  /** Visible beat count, from 1 to 32. */
  beats: number;
  /** Pitch rows in display order, from top to bottom. */
  pitches: string[];
  /** Selected note ID; null enables internal selection. An empty string clears selection. */
  value: string | null;
  /** Initial selected note ID, read once when mounting in uncontrolled mode. */
  defaultValue: string;
  /** Horizontal cells per beat, from 2 to 12; durations snap outward to cell boundaries. */
  cellsPerBeat: number;
  /** Accessible name for the roll; an empty name hides it from assistive technology. */
  label: string;
  /** Monospace glyph size in CSS pixels, from 10 to 24. */
  fontSize: number;
}

export interface AsciiPianoRollEvents {
  /** Selected note ID, emitted only after pointer or keyboard input. */
  valueChange: string;
  /** The supplied note's musical values and original array index. */
  noteSelect: AsciiPianoRollNote & { index: number };
}

export const defaults: AsciiPianoRollProps = {
  notes: [
    { id: "lead-1", pitch: "G4", start: 0, duration: 1.5 },
    { id: "lead-2", pitch: "A4", start: 1.5, duration: 0.5 },
    { id: "lead-3", pitch: "C5", start: 2, duration: 1 },
    { id: "lead-4", pitch: "B4", start: 3, duration: 1 },
    { id: "lead-5", pitch: "G4", start: 4, duration: 1.5 },
    { id: "lead-6", pitch: "E4", start: 5.5, duration: 0.5 },
    { id: "lead-7", pitch: "D4", start: 6, duration: 1 },
    { id: "lead-8", pitch: "C4", start: 7, duration: 1 },
    { id: "bass-1", pitch: "C4", start: 0, duration: 3 },
  ],
  beats: 8,
  pitches: ["C5", "B4", "A4", "G4", "F4", "E4", "D4", "C4"],
  value: null,
  defaultValue: "lead-1",
  cellsPerBeat: 4,
  label: "Piano roll. Select a note to inspect its pitch, start, and duration.",
  fontSize: 14,
};

interface PianoRollPlacedNote {
  note: AsciiPianoRollNote;
  index: number;
  row: number;
  button: HTMLButtonElement;
}

function pianoRollNumber(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

function pianoRollElement<K extends keyof HTMLElementTagNameMap>(tag: K, part: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.setAttribute("data-pica", "");
  element.setAttribute("data-piano-part", part);
  return element;
}

export const mount: Mount<AsciiPianoRollProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let internalValue = props.defaultValue;
  let focusedId = "";
  let alive = true;
  let placed: PianoRollPlacedNote[] = [];
  const attributes = hostAttributes(host);
  // Preserve a possible pre-existing scope attribute for exact teardown.
  attributes.set("data-pica-id", host.getAttribute("data-pica-id"));
  const styles = scope(host);
  const selector = styles.selector;
  const restore = styleHost(host, {
    display: "grid",
    "place-items": "center",
    "background-color": cssVar("bg"),
  });
  const viewport = pianoRollElement("div", "viewport");
  const roll = pianoRollElement("div", "roll");
  viewport.append(roll);
  host.append(viewport);
  const emit = emitter<AsciiPianoRollEvents>(host);

  styles.setRules(`
    ${selector} [data-piano-part="viewport"] { width:100%; max-height:100%; min-width:0; overflow:auto; overscroll-behavior:contain; }
    ${selector} [data-piano-part="roll"] { display:grid; width:max-content; margin:0 auto; font-family:${GRID_FONT}; line-height:1.8; color:${cssVar("fg")}; padding:1ch; }
    ${selector} [data-piano-part="pitch"], ${selector} [data-piano-part="beats"], ${selector} [data-piano-part="ruler"], ${selector} [data-piano-part="track"] { white-space:pre; min-width:0; pointer-events:none; }
    ${selector} [data-piano-part="pitch"] { text-align:right; padding-right:1ch; }
    ${selector} [data-piano-part="beats"] { color:${cssVar("fg")}; }
    ${selector} [data-piano-part="ruler"], ${selector} [data-piano-part="track"] { color:${cssVar("muted")}; }
    ${selector} [data-piano-part="note"] { appearance:none; box-sizing:border-box; min-width:0; padding:0; margin:0; border:0; border-radius:0; font:inherit; line-height:inherit; white-space:pre; text-align:left; cursor:pointer; color:${cssVar("fg")}; background:transparent; overflow:hidden; position:relative; }
    ${selector} [data-piano-part="note"][aria-pressed="true"] { color:${cssOn("accent")}; background:${cssVar("accent")}; z-index:2; }
    ${selector} [data-piano-part="note"]:hover { text-decoration:underline; }
    ${selector} [data-piano-part="note"]:focus-visible { outline:1px solid ${cssVar("fg")}; outline-offset:0; z-index:3; }
  `);

  function accessibility(): void {
    const label = props.label.trim();
    attributes.set("role", label ? "group" : null);
    attributes.set("aria-label", label || null);
    attributes.set("aria-hidden", label ? null : "true");
  }

  function selection(): string {
    return props.value === null ? internalValue : props.value;
  }

  function synchronize(): void {
    const selected = selection();
    if (!placed.some((item) => item.note.id === focusedId)) {
      focusedId = placed.find((item) => item.note.id === selected)?.note.id ?? placed[0]?.note.id ?? "";
    }
    for (const item of placed) {
      item.button.setAttribute("aria-pressed", String(item.note.id === selected));
      item.button.tabIndex = item.note.id === focusedId ? 0 : -1;
    }
  }

  function select(item: PianoRollPlacedNote): void {
    const detail = { ...item.note, index: item.index };
    focusedId = item.note.id;
    if (props.value === null) internalValue = item.note.id;
    synchronize();
    emit("valueChange", item.note.id);
    emit("noteSelect", detail);
  }

  function render(): void {
    const hadFocus = roll.contains(document.activeElement);
    const beats = Math.round(pianoRollNumber(props.beats, 8, 1, 32));
    const resolution = Math.round(pianoRollNumber(props.cellsPerBeat, 4, 2, 12));
    const columns = beats * resolution;
    const pitches = (Array.isArray(props.pitches) ? props.pitches : [])
      .filter((pitch): pitch is string => typeof pitch === "string" && pitch.trim().length > 0)
      .filter((pitch, index, all) => all.indexOf(pitch) === index).slice(0, 32);
    const gutter = Math.max(4, ...pitches.map((pitch) => [...pitch].length + 1));
    roll.style.gridTemplateColumns = `${gutter}ch repeat(${columns}, 1ch)`;
    roll.style.gridTemplateRows = `repeat(${pitches.length + 2}, 1.8em)`;
    roll.style.fontSize = `${pianoRollNumber(props.fontSize, 14, 10, 24)}px`;
    roll.replaceChildren();
    placed = [];

    const beatLabel = pianoRollElement("span", "beats");
    const ruler = pianoRollElement("span", "ruler");
    let beatText = "";
    for (let beat = 0; beat < beats; beat++) beatText += String(beat + 1).padEnd(resolution, " ");
    beatLabel.textContent = beatText;
    ruler.textContent = ("+" + "-".repeat(resolution - 1)).repeat(beats);
    beatLabel.style.gridArea = `1 / 2 / 2 / ${columns + 2}`;
    ruler.style.gridArea = `2 / 2 / 3 / ${columns + 2}`;
    beatLabel.setAttribute("aria-hidden", "true");
    ruler.setAttribute("aria-hidden", "true");
    roll.append(beatLabel, ruler);

    pitches.forEach((pitch, index) => {
      const label = pianoRollElement("span", "pitch");
      const track = pianoRollElement("span", "track");
      label.textContent = pitch;
      label.style.gridArea = `${index + 3} / 1`;
      label.setAttribute("aria-hidden", "true");
      track.textContent = ("|" + ".".repeat(resolution - 1)).repeat(beats);
      track.style.gridArea = `${index + 3} / 2 / ${index + 4} / ${columns + 2}`;
      track.setAttribute("aria-hidden", "true");
      roll.append(label, track);
    });

    const ids = new Set<string>();
    const notes = Array.isArray(props.notes) ? props.notes : [];
    notes.slice(0, 512).forEach((raw, index) => {
      if (!raw || typeof raw.id !== "string" || !raw.id || ids.has(raw.id)) return;
      const row = pitches.indexOf(raw.pitch);
      if (row < 0 || !Number.isFinite(raw.start) || !Number.isFinite(raw.duration) || raw.duration <= 0) return;
      const end = raw.start + raw.duration;
      if (end <= 0 || raw.start >= beats) return;
      ids.add(raw.id);
      const cell = Math.max(0, Math.floor(raw.start * resolution));
      const last = Math.min(columns, Math.ceil(end * resolution));
      const width = Math.max(1, last - cell);
      const note: AsciiPianoRollNote = { id: raw.id, pitch: raw.pitch, start: raw.start, duration: raw.duration };
      const button = pianoRollElement("button", "note");
      button.type = "button";
      button.setAttribute("data-note-id", note.id);
      button.setAttribute("aria-label", `${note.pitch}, starts at beat ${note.start + 1}, duration ${note.duration} ${note.duration === 1 ? "beat" : "beats"}`);
      button.title = `${note.pitch} · beat ${note.start + 1} · ${note.duration} beats`;
      button.textContent = width === 1 ? "#" : "[" + "=".repeat(width - 2) + "]";
      button.style.gridArea = `${row + 3} / ${cell + 2} / ${row + 4} / span ${width}`;
      placed.push({ note, index, row, button });
      roll.append(button);
    });
    placed.sort((a, b) => a.note.start - b.note.start || a.row - b.row || a.index - b.index);
    synchronize();
    if (hadFocus) placed.find((item) => item.note.id === focusedId)?.button.focus({ preventScroll: true });
    attributes.set("data-pica-ready", "true");
  }

  function inputItem(event: Event): PianoRollPlacedNote | undefined {
    const target = event.target;
    return target instanceof Element ? placed.find((item) => item.button === target.closest("[data-piano-part='note']")) : undefined;
  }

  function click(event: MouseEvent): void {
    const item = inputItem(event);
    if (item) select(item);
  }

  function focus(event: FocusEvent): void {
    const item = inputItem(event);
    if (item) {
      focusedId = item.note.id;
      synchronize();
    }
  }

  function keyboard(event: KeyboardEvent): void {
    const current = inputItem(event);
    if (!current) return;
    let next: PianoRollPlacedNote | undefined;
    if (event.key === "Home") next = placed[0];
    else if (event.key === "End") next = placed[placed.length - 1];
    else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      next = placed.filter((item) => (item.note.start - current.note.start) * direction > 0)
        .sort((a, b) => Math.abs(a.note.start - current.note.start) - Math.abs(b.note.start - current.note.start) || Math.abs(a.row - current.row) - Math.abs(b.row - current.row))[0];
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const direction = event.key === "ArrowUp" ? -1 : 1;
      next = placed.filter((item) => (item.row - current.row) * direction > 0)
        .sort((a, b) => Math.abs(a.row - current.row) - Math.abs(b.row - current.row) || Math.abs(a.note.start - current.note.start) - Math.abs(b.note.start - current.note.start))[0];
    } else return;
    event.preventDefault();
    if (next) {
      next.button.focus({ preventScroll: true });
      next.button.scrollIntoView({ block: "nearest", inline: "nearest" });
      select(next);
    }
  }

  roll.addEventListener("click", click);
  roll.addEventListener("focusin", focus);
  roll.addEventListener("keydown", keyboard);
  accessibility();
  render();

  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      if (before.label !== props.label) accessibility();
      if (changed(before, props, ["notes", "pitches", "beats", "cellsPerBeat"])) render();
      else {
        if (before.fontSize !== props.fontSize) roll.style.fontSize = `${pianoRollNumber(props.fontSize, 14, 10, 24)}px`;
        synchronize();
      }
    },
    destroy() {
      if (!alive) return;
      alive = false;
      roll.removeEventListener("click", click);
      roll.removeEventListener("focusin", focus);
      roll.removeEventListener("keydown", keyboard);
      viewport.remove();
      styles.destroy();
      restore();
      attributes.restore();
      placed = [];
    },
  };
};

// registry/ascii/ascii-piano-roll/index.tsx
export type AsciiPianoRollComponentProps = Partial<AsciiPianoRollProps> & WrapperProps & Handlers<AsciiPianoRollEvents>;

/** A selectable monospace note roll whose supplied pitches and durations occupy musical grid cells. */
export function AsciiPianoRoll({ className, style, palette, ...props }: AsciiPianoRollComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
