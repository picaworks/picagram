"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

// Pica · Contact Panel · contact-panel
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

// registry/sections/contact-panel/core.ts
export interface ContactChannel {
  /** The channel's name, shown as a mono label above its value. */
  label: string;
  /** The text a visitor reads, such as an address or a number. */
  value: string;
  /** Where the value links, such as mailto: or tel:. Without it the value is plain text. */
  href?: string;
}

export interface ContactValues {
  /** The text the name field starts with. */
  name: string;
  /** The address the email field starts with. */
  email: string;
  /** The text the message field starts with. */
  message: string;
}

export interface ContactPanelProps {
  /** The contact details, one row each. A channel with an href links, and one without is plain text. */
  channels: readonly ContactChannel[];
  /** The values the three fields start with, read once at mount. */
  defaultValues: ContactValues;
  /** The accessible name of the form. */
  label: string;
  /** The accessible name of the contact details. */
  detailsLabel: string;
  /** The text on the submit button. */
  buttonLabel: string;
  /** The text announced in the status region after a valid send. */
  confirmation: string;
  /** The mono note beside the button. */
  note: string;
  /** Disables every control and the button, and dims them to 45 percent. */
  disabled: boolean;
}

export type ContactSend = { name: string; email: string; message: string };

export interface ContactPanelEvents {
  /** The visitor submitted a valid form. The detail holds the three field values. */
  send: ContactSend;
}

export const defaults: ContactPanelProps = {
  channels: [
    { label: "Email", value: "hello@example.com", href: "mailto:hello@example.com" },
    { label: "Phone", value: "+1 555 0100", href: "tel:+15550100" },
    { label: "Studio", value: "14 Foundry Lane, Leeds LS1 4AB" },
    { label: "Hours", value: "Monday to Friday, 09:00 to 17:00" },
  ],
  defaultValues: {
    name: "Ada Reader",
    email: "reader@example.com",
    message: "I would like to talk about using these sections in our docs.",
  },
  label: "Contact form",
  detailsLabel: "Contact details",
  buttonLabel: "Send message",
  confirmation: "Thank you. We will reply within two working days.",
  note: "Nothing is sent until your page handles the send event.",
  disabled: false,
};

/** Labels whose plain value is a postal address, which belongs in an address element. */
const ADDRESS_LABEL = /address|studio|office|location|visit|post/i;

/** A link target is kept only when it cannot run script. */
function safeHref(href: string | undefined): string {
  const value = (href ?? "").trim();
  return value && !/^(javascript|data|vbscript):/i.test(value) ? value : "";
}

/** Layout and type for the section. The minimum height goes in a :where() rule, which carries no specificity,
 *  so a page that sizes this host itself wins without fighting an inline style. The two columns are flex
 *  items whose bases are one to two, so they sit side by side when the host is wide and stack when it is not,
 *  with no media query. */
function rules(selector: string): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  const hairline = `color-mix(in srgb, ${fg} 30%, transparent)`;
  const tint = `color-mix(in srgb, ${fg} 10%, transparent)`;
  const control = `${selector} [data-pica-control]`;
  return [
    `:where(${selector}){min-height:24rem}`,
    `${selector}{box-sizing:border-box;display:flex;flex-direction:column;padding:clamp(1.5rem, 5vw, 4rem);color:${fg}}`,
    `${selector} > [data-pica-panel]{display:flex;flex-wrap:wrap;align-items:flex-start;gap:clamp(1.75rem, 4vw, 3rem);margin-top:clamp(1.75rem, 4vw, 3rem)}`,
    `${selector} [data-pica-details]{flex:1 1 16rem;min-width:0}`,
    `${selector} [data-pica-form]{flex:2 1 32rem;min-width:0;margin:0}`,
    `${selector} [data-pica-list]{margin:0;padding:0;border-bottom:1px solid ${hairline}}`,
    `${selector} [data-pica-channel]{padding:0.9em 0;border-top:1px solid ${hairline}}`,
    `${selector} [data-pica-term]{margin:0 0 0.35em;color:${muted};font-family:${GRID_FONT};font-size:0.72em;line-height:1.2;letter-spacing:0.04em;text-transform:uppercase}`,
    `${selector} [data-pica-value]{margin:0;color:${fg};font:inherit;font-style:normal;line-height:1.4;overflow-wrap:anywhere}`,
    `${selector} [data-pica-value] address{margin:0;font:inherit;font-style:normal}`,
    `${selector} [data-pica-value] a{color:${fg};text-decoration:underline;text-underline-offset:0.2em;text-decoration-thickness:1px}`,
    `${selector} [data-pica-value] a:hover{background:${tint}}`,
    `${selector} [data-pica-fields]{display:grid;grid-template-columns:repeat(auto-fit, minmax(min(100%, 18rem), 1fr));gap:1.25em}`,
    `${selector} [data-pica-wide]{grid-column:1 / -1}`,
    `${control}{display:grid;gap:0.45em;min-width:0}`,
    `${control}[data-disabled]{opacity:0.45}`,
    `${control} label{color:${fg};font:inherit;font-size:0.9em;line-height:1.25}`,
    `${control} input,${control} textarea{appearance:none;box-sizing:border-box;display:block;width:100%;min-width:0;margin:0;padding:0.7em 0.8em;border:1px solid ${muted};border-radius:0;background:transparent;color:${fg};font:inherit;line-height:1.5;outline:none}`,
    `${control} textarea{min-height:7rem;resize:vertical}`,
    `${control} input:hover,${control} textarea:hover{background:${tint}}`,
    `${control} input:disabled,${control} textarea:disabled{cursor:not-allowed}`,
    `${selector} [data-pica-actions]{display:flex;flex-wrap:wrap;align-items:center;gap:0.75em 1.25em;margin-top:1.5em}`,
    `${selector} [data-pica-submit]{appearance:none;display:inline-flex;align-items:center;margin:0;padding:0.7em 1.4em;border:1px solid ${accent};border-radius:0;background:${accent};color:${cssOn("accent")};font:inherit;line-height:1.2;cursor:pointer}`,
    `${selector} [data-pica-submit]:hover{background:color-mix(in srgb, ${accent}, ${fg} 10%)}`,
    `${selector} [data-pica-submit]:disabled{opacity:0.45;cursor:not-allowed}`,
    `${selector} [data-pica-note]{margin:0;flex:1 1 14rem;color:${muted};font-family:${GRID_FONT};font-size:0.72em;line-height:1.4;letter-spacing:0.04em}`,
    `${selector} [data-pica-status]{margin:0;color:${fg};font:inherit;line-height:1.4}`,
    `${selector} [data-pica-status]:not(:empty){margin-top:1.25em}`,
    `${selector} a:focus-visible,${selector} input:focus-visible,${selector} textarea:focus-visible,${selector} button:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
  ].join("\n");
}

/** Creates an element that carries data-pica, with optional extra marker attributes. */
function make<K extends keyof HTMLElementTagNameMap>(tag: K, ...marks: string[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  for (const mark of marks) el.setAttribute(mark, "");
  return el;
}

/** Rebuilds the details list from JSON: a dt label and a dd value per channel, in source order. */
function renderChannels(list: HTMLElement, channels: readonly ContactChannel[]): void {
  list.replaceChildren();
  for (const channel of channels) {
    const row = make("div", "data-pica-channel");
    const term = make("dt", "data-pica-term");
    const value = make("dd", "data-pica-value");
    term.textContent = channel.label;
    const href = safeHref(channel.href);
    if (href) {
      const link = make("a");
      link.href = href;
      link.textContent = channel.value;
      value.append(link);
    } else if (ADDRESS_LABEL.test(channel.label)) {
      const address = make("address");
      address.textContent = channel.value;
      value.append(address);
    } else {
      value.textContent = channel.value;
    }
    row.append(term, value);
    list.append(row);
  }
}

export const mount: Mount<ContactPanelProps> = (host, initial = {}) => {
  let props: ContactPanelProps = { ...defaults, ...initial };
  let sent = false;
  let destroyed = false;
  const emit = emitter<ContactPanelEvents>(host);
  const sheet = scope(host);

  const panel = make("div", "data-pica-panel");
  const details = make("div", "data-pica-details");
  details.setAttribute("role", "group");
  const list = make("dl", "data-pica-list");
  const form = make("form", "data-pica-form");
  form.noValidate = true;
  const fields = make("div", "data-pica-fields");
  const nameInput = make("input");
  const emailInput = make("input");
  const messageInput = make("textarea");
  const submit = make("button", "data-pica-submit");
  const note = make("p", "data-pica-note");
  const actions = make("div", "data-pica-actions");
  const status = make("p", "data-pica-status");

  nameInput.type = "text";
  nameInput.name = "name";
  nameInput.autocomplete = "name";
  emailInput.type = "email";
  emailInput.name = "email";
  emailInput.autocomplete = "email";
  messageInput.name = "message";
  messageInput.rows = 5;
  submit.type = "submit";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  const seed = { ...defaults.defaultValues, ...props.defaultValues };
  nameInput.value = seed.name;
  emailInput.value = seed.email;
  messageInput.value = seed.message;

  const inputs = [nameInput, emailInput, messageInput];
  const wraps: HTMLElement[] = [];
  for (const [text, input, wide] of [
    ["Name", nameInput, false],
    ["Email", emailInput, false],
    ["Message", messageInput, true],
  ] as const) {
    const wrap = make("div", "data-pica-control");
    if (wide) wrap.setAttribute("data-pica-wide", "");
    const label = make("label");
    const id = nextId("pica-contact");
    input.id = id;
    input.required = true;
    label.htmlFor = id;
    label.textContent = text;
    wrap.append(label, input);
    fields.append(wrap);
    wraps.push(wrap);
  }

  actions.append(submit, note);
  form.append(fields, actions, status);
  details.append(list);
  panel.append(details, form);
  host.append(panel);

  const onSubmit = (event: Event): void => {
    event.preventDefault();
    if (props.disabled) return;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    sent = true;
    status.textContent = props.confirmation;
    emit("send", { name: nameInput.value, email: emailInput.value, message: messageInput.value });
  };
  form.addEventListener("submit", onSubmit);

  function setDisabled(): void {
    for (const input of inputs) input.disabled = props.disabled;
    submit.disabled = props.disabled;
    for (const wrap of wraps) wrap.toggleAttribute("data-disabled", props.disabled);
  }

  renderChannels(list, props.channels);
  details.setAttribute("aria-label", props.detailsLabel);
  form.setAttribute("aria-label", props.label);
  submit.textContent = props.buttonLabel;
  note.textContent = props.note;
  setDisabled();
  sheet.setRules(rules(sheet.selector));
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (!sameJson(before.channels, props.channels)) renderChannels(list, props.channels);
      if (props.detailsLabel !== before.detailsLabel) details.setAttribute("aria-label", props.detailsLabel);
      if (props.label !== before.label) form.setAttribute("aria-label", props.label);
      if (props.buttonLabel !== before.buttonLabel) submit.textContent = props.buttonLabel;
      if (props.note !== before.note) note.textContent = props.note;
      if (sent && props.confirmation !== before.confirmation) status.textContent = props.confirmation;
      if (props.disabled !== before.disabled) setDisabled();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      form.removeEventListener("submit", onSubmit);
      panel.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};

// registry/sections/contact-panel/index.tsx
export type ContactPanelComponentProps = Partial<ContactPanelProps> & Handlers<ContactPanelEvents> & WrapperProps & { children?: ReactNode };

/** A page section that adds a contact details list and a short message form below a heading and copy. */
export function ContactPanel({ className, style, palette, children, ...props }: ContactPanelComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
