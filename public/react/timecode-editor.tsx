"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Timecode Editor · timecode-editor
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

// registry/ui/timecode-editor/core.ts
export interface TimecodeEditorProps {
  /** Nominal frames per second, rounded and clamped to 1–120; counting is non-drop. */
  fps: number;
  /** Total frame count; null uses internal state. Changing fps reformats the same frame count. */
  value: number | null;
  /** Initial total frame count, read once when mounted in uncontrolled mode. */
  defaultValue: number;
  /** Visible and accessible name of the grouped timecode editor; empty hides it from assistive technology. */
  label: string;
  /** Disable all four native inputs. */
  disabled: boolean;
}

export interface TimecodeEditorEvents {
  /** New total frame count, emitted only after a user commits or steps a segment. */
  valueChange: number;
}

export const defaults: TimecodeEditorProps = {
  fps: 24,
  value: null,
  defaultValue: 2009,
  label: "Timecode",
  disabled: false,
};

const TIMECODE_NAMES = ["hours", "minutes", "seconds", "frames"] as const;
const TIMECODE_CAPTIONS = ["HH", "MM", "SS", "FF"] as const;

function timecodeRate(value: number): number {
  return Math.min(120, Math.max(1, Math.round(Number.isFinite(value) ? value : 24)));
}

function timecodeClamp(value: number, rate: number): number {
  return Math.min(100 * 3600 * rate - 1, Math.max(0, Math.round(Number.isFinite(value) ? value : 0)));
}

function timecodeParts(value: number, rate: number): [number, number, number, number] {
  const frames = timecodeClamp(value, rate);
  const seconds = Math.floor(frames / rate);
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60, frames % rate];
}

function timecodePart<K extends keyof HTMLElementTagNameMap>(tag: K, name: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute("data-part", name);
  return node;
}

function timecodeRules(selector: string): string {
  const part = (name: string): string => `${selector} [data-part="${name}"]`;
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  const input = `${selector} input`;
  return [
    `${selector}{display:inline-block;max-width:100%;vertical-align:middle;color:${fg}}`,
    `${part("root")}{display:grid;gap:0.55em;max-width:100%;line-height:1.2}`,
    `${part("heading")}{display:flex;align-items:baseline;justify-content:space-between;gap:1em}`,
    `${part("label")}{font:inherit;font-size:0.8em}`,
    `${part("rate")}{font-family:${GRID_FONT};font-size:0.65em;color:${muted};white-space:nowrap}`,
    `${part("segments")}{display:flex;align-items:center;gap:0.22em;box-sizing:border-box;max-width:100%;padding:0.65em 0.7em;border:1px solid color-mix(in srgb,${fg} 30%,transparent);background:${cssVar("bg")}}`,
    `${part("field")}{display:grid;justify-items:center;gap:0.4em;min-width:0}`,
    `${part("caption")}{font-family:${GRID_FONT};font-size:0.6em;letter-spacing:0.08em;color:${muted}}`,
    `${part("separator")}{font-family:${GRID_FONT};font-size:1.35em;padding-top:0.65em;color:${muted};user-select:none}`,
    `${input}{box-sizing:content-box;width:2ch;min-width:0;margin:0;padding:0.22em 0.3em;font-family:${GRID_FONT};font-size:1.4em;font-variant-numeric:tabular-nums;font-weight:500;line-height:1.2;text-align:center;color:${fg};background:transparent;border:0;border-bottom:2px solid color-mix(in srgb,${fg} 25%,transparent);border-radius:0;appearance:textfield;-moz-appearance:textfield;caret-color:${fg}}`,
    `${part("frames")}{border-bottom-color:${accent}}`,
    `${input}::-webkit-inner-spin-button,${input}::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}`,
    `${input}:hover:not(:disabled){background:color-mix(in srgb,${fg} 7%,transparent)}`,
    `${input}:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${input}:invalid{box-shadow:none}`,
    `${input}:disabled{cursor:not-allowed;color:${muted}}`,
    `${part("help")}{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}`,
  ].join("\n");
}

export const mount: Mount<TimecodeEditorProps> = (host, initial = {}) => {
  let props: TimecodeEditorProps = { ...defaults, ...initial };
  let current = timecodeClamp(props.defaultValue, timecodeRate(props.fps));
  let alive = true;
  let draft: HTMLInputElement | null = null;
  const emit = emitter<TimecodeEditorEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  sheet.setRules(timecodeRules(sheet.selector));
  const abort = new AbortController();
  const on = { signal: abort.signal };
  const root = timecodePart("div", "root");
  const heading = timecodePart("div", "heading");
  const label = timecodePart("span", "label");
  const rateLabel = timecodePart("span", "rate");
  const segments = timecodePart("div", "segments");
  const help = timecodePart("span", "help");
  help.id = nextId("timecode-help");
  help.textContent = "Non-drop timecode, hours through frames. Up and Down step the focused segment with carrying; Shift or Page keys step ten. Left and Right move between segments. Enter commits, Escape cancels, and pasting HH:MM:SS:FF sets the whole timecode. Range: zero through 99 hours, 59 minutes, 59 seconds and the last frame.";
  const inputs = TIMECODE_NAMES.map((name, index) => {
    const field = timecodePart("label", "field");
    const caption = timecodePart("span", "caption");
    caption.textContent = TIMECODE_CAPTIONS[index] ?? name;
    const input = timecodePart("input", name);
    input.type = "number";
    input.inputMode = "numeric";
    input.autocomplete = "off";
    input.step = "1";
    input.min = "0";
    field.append(caption, input);
    if (index > 0) {
      const separator = timecodePart("span", "separator");
      separator.textContent = ":";
      separator.setAttribute("aria-hidden", "true");
      segments.append(separator);
    }
    segments.append(field);
    return input;
  });
  heading.append(label, rateLabel);
  root.append(heading, segments, help);
  host.append(root);

  function rate(): number { return timecodeRate(props.fps); }
  function shown(): number { return timecodeClamp(props.value === null ? current : props.value, rate()); }
  function weights(): readonly [number, number, number, number] { return [3600 * rate(), 60 * rate(), rate(), 1]; }
  function limits(): readonly [number, number, number, number] { return [99, 59, 59, rate() - 1]; }

  function configure(): void {
    const title = props.label.trim();
    label.textContent = props.label;
    label.hidden = !title;
    rateLabel.textContent = `${rate()} FPS`;
    attrs.set("role", title ? "group" : null);
    attrs.set("aria-label", title || null);
    attrs.set("aria-hidden", title ? null : "true");
    attrs.set("aria-describedby", title ? help.id : null);
    inputs.forEach((input, index) => {
      input.max = String((limits()[index] ?? 0));
      input.disabled = props.disabled;
      input.setAttribute("aria-label", `${title || "Timecode"} ${TIMECODE_NAMES[index]}`);
      input.setAttribute("aria-describedby", help.id);
      input.style.width = index === 3 && rate() > 100 ? "3ch" : "2ch";
    });
  }

  function paint(): void {
    const parts = timecodeParts(shown(), rate());
    inputs.forEach((input, index) => {
      if (input === draft) return;
      const width = index === 3 && rate() > 100 ? 3 : 2;
      const text = String((parts[index] ?? 0)).padStart(width, "0");
      if (input.value !== text) input.value = text;
    });
    attrs.set("data-pica-ready", "true");
  }

  function choose(raw: number): void {
    const next = timecodeClamp(raw, rate());
    const moved = next !== shown();
    if (moved && props.value === null) current = next;
    draft = null;
    paint();
    if (moved) emit("valueChange", next);
  }

  function edited(input: HTMLInputElement, index: number): number {
    const displayed = input.valueAsNumber;
    if (!Number.isFinite(displayed)) return shown();
    const parts = timecodeParts(shown(), rate());
    return shown() + (Math.round(displayed) - (parts[index] ?? 0)) * (weights()[index] ?? 1);
  }

  function commit(input: HTMLInputElement): void {
    const index = inputs.indexOf(input);
    if (index < 0) return;
    choose(edited(input, index));
  }

  const onInput = (event: Event): void => {
    const input = event.target as HTMLInputElement;
    if (inputs.includes(input)) draft = input;
  };
  const onChange = (event: Event): void => {
    const input = event.target as HTMLInputElement;
    if (!props.disabled && inputs.includes(input)) commit(input);
  };
  const onBlur = (event: FocusEvent): void => {
    const input = event.target as HTMLInputElement;
    if (draft === input && !props.disabled) commit(input);
  };
  const onKey = (event: KeyboardEvent): void => {
    const input = event.target as HTMLInputElement;
    const index = inputs.indexOf(input);
    if (index < 0 || props.disabled || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === "Enter") { event.preventDefault(); commit(input); return; }
    if (event.key === "Escape") { event.preventDefault(); draft = null; paint(); return; }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      if (draft === input) commit(input);
      inputs[Math.max(0, Math.min(3, index + (event.key === "ArrowRight" ? 1 : -1)))]?.focus();
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const parts = timecodeParts(shown(), rate());
      choose(shown() + ((event.key === "Home" ? 0 : (limits()[index] ?? 0)) - (parts[index] ?? 0)) * (weights()[index] ?? 1));
      return;
    }
    const sign = event.key === "ArrowUp" || event.key === "PageUp" ? 1 : event.key === "ArrowDown" || event.key === "PageDown" ? -1 : 0;
    if (!sign) return;
    event.preventDefault();
    const jump = event.shiftKey || event.key.startsWith("Page") ? 10 : 1;
    choose((draft === input ? edited(input, index) : shown()) + sign * jump * (weights()[index] ?? 1));
  };
  const onPaste = (event: ClipboardEvent): void => {
    if (props.disabled || !inputs.includes(event.target as HTMLInputElement)) return;
    const text = event.clipboardData?.getData("text") ?? "";
    const match = /^\s*(\d{1,2}):(\d{1,2}):(\d{1,2}):(\d{1,3})\s*$/.exec(text);
    if (!match) return;
    event.preventDefault();
    choose(((Number(match[1]) * 60 + Number(match[2])) * 60 + Number(match[3])) * rate() + Number(match[4]));
  };
  segments.addEventListener("input", onInput, on);
  segments.addEventListener("change", onChange, on);
  segments.addEventListener("focusout", onBlur, on);
  segments.addEventListener("keydown", onKey, on);
  segments.addEventListener("paste", onPaste, on);
  configure();
  paint();

  return {
    update(partial) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...partial };
      if (before.fps !== props.fps) current = timecodeClamp(current, rate());
      if (before.value !== props.value || before.fps !== props.fps || before.disabled !== props.disabled) draft = null;
      if (before.fps !== props.fps || before.label !== props.label || before.disabled !== props.disabled) configure();
      paint();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      abort.abort();
      root.remove();
      sheet.destroy();
      attrs.restore();
    },
  };
};

// registry/ui/timecode-editor/index.tsx
export type TimecodeEditorComponentProps = Partial<TimecodeEditorProps> & Handlers<TimecodeEditorEvents> & WrapperProps;

/** A compact native timecode editor with frame-rate-aware carrying between four segments. */
export function TimecodeEditor({ className, style, palette, ...props }: TimecodeEditorComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ ...paletteStyle(palette), ...style }} />;
}
