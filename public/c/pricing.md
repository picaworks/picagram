# Pricing

> Pricing tiers with a monthly and yearly switch, each plan a card with its own call to action.

Category: sections. Tags: pricing, tiers, billing, radio group, section. Static. Size: 3.1 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://rishabbalak.github.io/picagram/r/pricing.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `tiers` | readonly PricingTier[] | `[{"name":"Starter","monthly":0,"yearly":0,"blurb":"For trying Pica before committing to a plan.","features":["One project","Community support","MIT license"],"cta":{"label":"Start free","href":"#"},"featured":false},{"name":"Team","monthly":24,"yearly":19,"blurb":"For a team shipping components together.","features":["Unlimited projects","Shared component library","Priority support","Usage analytics"],"cta":{"label":"Start trial","href":"#"},"featured":true},{"name":"Studio","monthly":64,"yearly":52,"blurb":"For agencies running client work at scale.","features":["Everything in Team","White-label export","Custom design tokens","Dedicated support","Single sign-on"],"cta":{"label":"Contact sales","href":"#"},"featured":false}]` | Plans to display, each becoming a card that stacks below a width. |
| `billing` | "monthly" \| "yearly" \| null | `null` | The active billing period, "monthly" or "yearly". Null, the default, means uncontrolled. |
| `defaultBilling` | "monthly" \| "yearly" | `"monthly"` | The billing period shown at mount when billing is uncontrolled. Read once, at mount. |
| `currency` | string | `"$"` | Symbol placed before each price. |
| `label` | string | `"Pricing"` | Accessible name for the section. |

## Events

Each event is a CustomEvent on the host named `pica:` plus the event name in lower case. It does not bubble. In React, pass the matching `on` prop.

| Event | React prop | Detail | Description |
|---|---|---|---|
| `billingChange` | `onBillingChange` | `"monthly" \| "yearly"` | The billing switch changed to "monthly" or "yearly". |

## Colors

Draws with `--pica-fg`, `--pica-accent`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Pricing · pricing
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

// registry/sections/pricing/core.ts
/** One call to action: a link's visible text and destination. */
export interface PricingCta {
  /** Text on the link. */
  label: string;
  /** Destination URL. */
  href: string;
}

/** One pricing plan, drawn as a card. */
export interface PricingTier {
  /** The plan's name. */
  name: string;
  /** Price per month, in the given currency, before the currency symbol. */
  monthly: number;
  /** Price per year, in the given currency, before the currency symbol. */
  yearly: number;
  /** One sentence describing who the plan suits. */
  blurb: string;
  /** What the plan includes, one short phrase each. */
  features: readonly string[];
  /** The plan's call to action. */
  cta: PricingCta;
  /** Outlines the card in the accent and marks it recommended. */
  featured: boolean;
}

export interface PricingProps {
  /** Plans to display, each becoming a card that stacks below a width. */
  tiers: readonly PricingTier[];
  /** The active billing period, "monthly" or "yearly". Null, the default, means uncontrolled. */
  billing: "monthly" | "yearly" | null;
  /** The billing period shown at mount when billing is uncontrolled. Read once, at mount. */
  defaultBilling: "monthly" | "yearly";
  /** Symbol placed before each price. */
  currency: string;
  /** Accessible name for the section. */
  label: string;
}

export interface PricingEvents {
  /** The billing switch changed to "monthly" or "yearly". */
  billingChange: "monthly" | "yearly";
}

export const defaults: PricingProps = {
  tiers: [
    {
      name: "Starter",
      monthly: 0,
      yearly: 0,
      blurb: "For trying Pica before committing to a plan.",
      features: ["One project", "Community support", "MIT license"],
      cta: { label: "Start free", href: "#" },
      featured: false,
    },
    {
      name: "Team",
      monthly: 24,
      yearly: 19,
      blurb: "For a team shipping components together.",
      features: ["Unlimited projects", "Shared component library", "Priority support", "Usage analytics"],
      cta: { label: "Start trial", href: "#" },
      featured: true,
    },
    {
      name: "Studio",
      monthly: 64,
      yearly: 52,
      blurb: "For agencies running client work at scale.",
      features: ["Everything in Team", "White-label export", "Custom design tokens", "Dedicated support", "Single sign-on"],
      cta: { label: "Contact sales", href: "#" },
      featured: false,
    },
  ],
  billing: null,
  defaultBilling: "monthly",
  currency: "$",
  label: "Pricing",
};

/** The two periods the switch offers, in the order the buttons appear. */
const OPTIONS = ["monthly", "yearly"] as const;

/** The scoped rules for one pricing section. Prose keeps the page's font; only glyphs and figures go mono. */
function rules(s: string): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const muted = cssVar("muted");
  const onAccent = cssOn("accent");
  const tint = `color-mix(in srgb, ${fg} 10%, transparent)`;
  return [
    `${s} *{box-sizing:border-box}`,
    `${s}{color:${fg}}`,
    `${s} [data-part="switch"]{display:inline-flex;border:1px solid ${muted};border-radius:0}`,
    `${s} [data-part="switch"] button{appearance:none;margin:0;border:0;background:transparent;color:${muted};font:inherit;font-size:0.9em;line-height:1.2;padding:0.5em 1.1em;cursor:pointer;border-radius:0}`,
    `${s} [data-part="switch"] button + button{border-inline-start:1px solid ${muted}}`,
    `${s} [data-part="switch"] button[aria-checked="true"]{background:${tint};color:${fg}}`,
    `${s} [data-part="switch"] button:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${s} [data-part="grid"]{display:grid;grid-template-columns:repeat(auto-fit,minmax(15em,1fr));gap:1.5em;margin-block-start:1.5em}`,
    `${s} article{margin:0;border:1px solid ${muted};border-radius:0;padding:1.5em;display:flex;flex-direction:column;gap:0.85em}`,
    `${s} article[data-featured]{border-color:${accent}}`,
    `${s} [data-part="tag"]{align-self:flex-start;background:${accent};color:${onAccent};border-radius:0;font-family:${GRID_FONT};font-size:0.7em;letter-spacing:0.04em;text-transform:uppercase;padding:0.2em 0.6em}`,
    `${s} h3{margin:0;font-size:1.15em;font-weight:600}`,
    `${s} [data-part="price"]{margin:0;font-family:${GRID_FONT};font-variant-numeric:tabular-nums;font-size:2em;line-height:1}`,
    `${s} [data-part="period"]{font-size:0.4em;color:${muted};margin-inline-start:0.3em}`,
    `${s} [data-part="blurb"]{margin:0;color:${muted}}`,
    `${s} ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:0.5em;flex:1 0 auto}`,
    `${s} li{display:flex;align-items:baseline;gap:0.6em;margin:0}`,
    `${s} [data-part="check"]{font-family:${GRID_FONT};color:${muted}}`,
    `${s} a[data-part="cta"]{appearance:none;margin:0;font:inherit;text-align:center;text-decoration:none;padding:0.6em 1em;border:1px solid ${fg};border-radius:0;color:${fg}}`,
    `${s} a[data-part="cta"]:hover{background:${tint}}`,
    `${s} a[data-part="cta"]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${s} article[data-featured] a[data-part="cta"]{background:${accent};color:${onAccent};border-color:${accent}}`,
    `${s} article[data-featured] a[data-part="cta"]:hover{background:color-mix(in srgb, ${accent} 85%, ${fg})}`,
  ].join("\n");
}

export const mount: Mount<PricingProps> = (host, initial = {}) => {
  let props: PricingProps = { ...defaults, ...initial };
  const emit = emitter<PricingEvents>(host);
  const sheet = scope(host);
  sheet.setRules(rules(sheet.selector));

  /** Creates one element the core owns, marked for identification and restyling. */
  function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Readonly<Record<string, string>>): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    for (const [key, value] of Object.entries(attrs ?? {})) node.setAttribute(key, value);
    return node;
  }

  // Uncontrolled state, applied only while props.billing is null. Read defaultBilling once, at mount.
  let internalBilling: "monthly" | "yearly" = props.defaultBilling;

  function effective(): "monthly" | "yearly" {
    return props.billing ?? internalBilling;
  }

  function isControlled(): boolean {
    return props.billing !== null;
  }

  const switchGroup = el("div", { "data-part": "switch", role: "radiogroup", "aria-label": "Billing period" });
  const monthlyButton = el("button", { type: "button", role: "radio" });
  monthlyButton.textContent = "Monthly";
  const yearlyButton = el("button", { type: "button", role: "radio" });
  yearlyButton.textContent = "Yearly";
  switchGroup.append(monthlyButton, yearlyButton);
  const optionButtons = [monthlyButton, yearlyButton] as const;

  // Which button is reachable by Tab, per the roving tabindex technique. Tracked apart from the checked
  // value, because a controlled switch moves focus on every arrow press but shows only what update() sends.
  let focusIndex = OPTIONS.indexOf(effective());

  function renderSwitch(): void {
    const value = effective();
    for (let i = 0; i < OPTIONS.length; i++) {
      const option = OPTIONS[i];
      const button = optionButtons[i];
      if (!option || !button) continue;
      button.setAttribute("aria-checked", String(option === value));
      button.tabIndex = i === focusIndex ? 0 : -1;
    }
  }

  interface PriceRef {
    tier: PricingTier;
    amount: HTMLElement;
    period: HTMLElement;
  }
  let priceRefs: PriceRef[] = [];

  function renderPrices(): void {
    const billing = effective();
    for (const ref of priceRefs) {
      const value = billing === "yearly" ? ref.tier.yearly : ref.tier.monthly;
      ref.amount.textContent = `${props.currency}${value}`;
      ref.period.textContent = billing === "yearly" ? "/yr" : "/mo";
    }
  }

  /** Moves focus to option `index`, wrapping, and commits it as input when it differs from the current one. */
  function moveTo(index: number): void {
    const next = ((index % OPTIONS.length) + OPTIONS.length) % OPTIONS.length;
    const value = OPTIONS[next];
    if (value === undefined) return;
    const willChange = next !== focusIndex;
    focusIndex = next;
    optionButtons[next]?.focus();
    if (willChange) {
      if (!isControlled()) internalBilling = value;
      emit("billingChange", value);
    }
    renderSwitch();
    renderPrices();
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      moveTo(focusIndex + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      moveTo(focusIndex - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      moveTo(0);
    } else if (event.key === "End") {
      event.preventDefault();
      moveTo(OPTIONS.length - 1);
    }
  }

  function onClick(event: MouseEvent): void {
    const target = event.target;
    const index = target instanceof HTMLButtonElement ? optionButtons.indexOf(target) : -1;
    if (index >= 0) moveTo(index);
  }

  switchGroup.addEventListener("keydown", onKeydown);
  switchGroup.addEventListener("click", onClick);

  const cardsHost = el("div", { "data-part": "grid" });

  function buildCards(): void {
    cardsHost.replaceChildren();
    priceRefs = [];
    for (const tier of props.tiers) {
      const card = el("article", tier.featured ? { "data-featured": "" } : {});
      if (tier.featured) {
        const tag = el("span", { "data-part": "tag" });
        tag.textContent = "Recommended";
        card.append(tag);
      }
      const heading = el("h3");
      heading.textContent = tier.name;
      const price = el("p", { "data-part": "price" });
      const amount = el("span", { "data-part": "amount" });
      const period = el("span", { "data-part": "period" });
      price.append(amount, period);
      const blurb = el("p", { "data-part": "blurb" });
      blurb.textContent = tier.blurb;
      const list = el("ul");
      for (const feature of tier.features) {
        const item = el("li");
        const check = el("span", { "data-part": "check", "aria-hidden": "true" });
        check.textContent = "✓";
        item.append(check, feature);
        list.append(item);
      }
      const link = el("a", { "data-part": "cta", href: tier.cta.href || "#" });
      link.textContent = tier.cta.label;
      card.append(heading, price, blurb, list, link);
      cardsHost.append(card);
      priceRefs.push({ tier, amount, period });
    }
    renderPrices();
  }

  function applyLabel(): void {
    labelHost(host, props.label.trim() ? props.label : "Pricing", "region");
  }

  applyLabel();
  buildCards();
  renderSwitch();
  host.append(switchGroup, cardsHost);
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (before.label !== props.label) applyLabel();
      if (!sameJson(before.tiers, props.tiers)) buildCards();
      else if (before.billing !== props.billing || before.currency !== props.currency) renderPrices();
      if (before.billing !== props.billing) {
        focusIndex = OPTIONS.indexOf(effective());
        renderSwitch();
      }
    },
    destroy() {
      switchGroup.removeEventListener("keydown", onKeydown);
      switchGroup.removeEventListener("click", onClick);
      switchGroup.remove();
      cardsHost.remove();
      sheet.destroy();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};

// registry/sections/pricing/index.tsx
export type PricingComponentProps = Partial<PricingProps> & Handlers<PricingEvents> & WrapperProps;

/** Pricing tiers with a monthly and yearly switch, each plan a card with its own call to action. */
export function Pricing({ className, style, palette, ...props }: PricingComponentProps) {
  const ref = usePica<PricingProps, HTMLDivElement>(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Pricing · pricing
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Pricing · Pica</title>
<style>:root { --pica-accent: #e8a020; }
html, body { margin: 0; height: 100%; background: #0a0a0a; color: #f1f1ef; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
@media (prefers-color-scheme: light) { html:not([data-ground]), html:not([data-ground]) body { background: #f1f1ef; color: #0a0a0a; } }
html[data-ground="paper"], html[data-ground="paper"] body { background: #f1f1ef; color: #0a0a0a; }
html[data-ground="checker"] body { background: repeating-conic-gradient(#161616 0% 25%, #0a0a0a 0% 50%) 50% / 24px 24px; }
#pica { width: 100%; height: 100%; }
.pica-stage { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: clamp(20px, 3.2vw, 40px); }
.pica-stage #pica { width: auto; height: auto; }
.pica-stage span#pica, .pica-stage div#pica { display: inline-block; }</style>
</head>
<body>
<div id="pica"></div>
<script>
"use strict";
var PicaPricing = (() => {
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

  // registry/sections/pricing/core.ts
  var core_exports = {};
  __export(core_exports, {
    defaults: () => defaults,
    mount: () => mount
  });

  // lib/a11y.ts
  function labelHost(host, label, role = "img") {
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
  function unlabelHost(host) {
    host.removeAttribute("role");
    host.removeAttribute("aria-label");
    host.removeAttribute("aria-hidden");
  }

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
  function cssOn(token) {
    return `oklch(from ${cssVar(token)} clamp(0, (0.62 - l) * 1000, 1) 0 0)`;
  }

  // registry/sections/pricing/core.ts
  var defaults = {
    tiers: [
      {
        name: "Starter",
        monthly: 0,
        yearly: 0,
        blurb: "For trying Pica before committing to a plan.",
        features: ["One project", "Community support", "MIT license"],
        cta: { label: "Start free", href: "#" },
        featured: false
      },
      {
        name: "Team",
        monthly: 24,
        yearly: 19,
        blurb: "For a team shipping components together.",
        features: ["Unlimited projects", "Shared component library", "Priority support", "Usage analytics"],
        cta: { label: "Start trial", href: "#" },
        featured: true
      },
      {
        name: "Studio",
        monthly: 64,
        yearly: 52,
        blurb: "For agencies running client work at scale.",
        features: ["Everything in Team", "White-label export", "Custom design tokens", "Dedicated support", "Single sign-on"],
        cta: { label: "Contact sales", href: "#" },
        featured: false
      }
    ],
    billing: null,
    defaultBilling: "monthly",
    currency: "$",
    label: "Pricing"
  };
  var OPTIONS = ["monthly", "yearly"];
  function rules(s) {
    const fg = cssVar("fg");
    const accent = cssVar("accent");
    const muted = cssVar("muted");
    const onAccent = cssOn("accent");
    const tint = `color-mix(in srgb, ${fg} 10%, transparent)`;
    return [
      `${s} *{box-sizing:border-box}`,
      `${s}{color:${fg}}`,
      `${s} [data-part="switch"]{display:inline-flex;border:1px solid ${muted};border-radius:0}`,
      `${s} [data-part="switch"] button{appearance:none;margin:0;border:0;background:transparent;color:${muted};font:inherit;font-size:0.9em;line-height:1.2;padding:0.5em 1.1em;cursor:pointer;border-radius:0}`,
      `${s} [data-part="switch"] button + button{border-inline-start:1px solid ${muted}}`,
      `${s} [data-part="switch"] button[aria-checked="true"]{background:${tint};color:${fg}}`,
      `${s} [data-part="switch"] button:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
      `${s} [data-part="grid"]{display:grid;grid-template-columns:repeat(auto-fit,minmax(15em,1fr));gap:1.5em;margin-block-start:1.5em}`,
      `${s} article{margin:0;border:1px solid ${muted};border-radius:0;padding:1.5em;display:flex;flex-direction:column;gap:0.85em}`,
      `${s} article[data-featured]{border-color:${accent}}`,
      `${s} [data-part="tag"]{align-self:flex-start;background:${accent};color:${onAccent};border-radius:0;font-family:${GRID_FONT};font-size:0.7em;letter-spacing:0.04em;text-transform:uppercase;padding:0.2em 0.6em}`,
      `${s} h3{margin:0;font-size:1.15em;font-weight:600}`,
      `${s} [data-part="price"]{margin:0;font-family:${GRID_FONT};font-variant-numeric:tabular-nums;font-size:2em;line-height:1}`,
      `${s} [data-part="period"]{font-size:0.4em;color:${muted};margin-inline-start:0.3em}`,
      `${s} [data-part="blurb"]{margin:0;color:${muted}}`,
      `${s} ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:0.5em;flex:1 0 auto}`,
      `${s} li{display:flex;align-items:baseline;gap:0.6em;margin:0}`,
      `${s} [data-part="check"]{font-family:${GRID_FONT};color:${muted}}`,
      `${s} a[data-part="cta"]{appearance:none;margin:0;font:inherit;text-align:center;text-decoration:none;padding:0.6em 1em;border:1px solid ${fg};border-radius:0;color:${fg}}`,
      `${s} a[data-part="cta"]:hover{background:${tint}}`,
      `${s} a[data-part="cta"]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
      `${s} article[data-featured] a[data-part="cta"]{background:${accent};color:${onAccent};border-color:${accent}}`,
      `${s} article[data-featured] a[data-part="cta"]:hover{background:color-mix(in srgb, ${accent} 85%, ${fg})}`
    ].join("\n");
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    const emit = emitter(host);
    const sheet = scope(host);
    sheet.setRules(rules(sheet.selector));
    function el(tag, attrs) {
      const node = document.createElement(tag);
      node.setAttribute("data-pica", "");
      for (const [key, value] of Object.entries(attrs ?? {})) node.setAttribute(key, value);
      return node;
    }
    let internalBilling = props.defaultBilling;
    function effective() {
      return props.billing ?? internalBilling;
    }
    function isControlled() {
      return props.billing !== null;
    }
    const switchGroup = el("div", { "data-part": "switch", role: "radiogroup", "aria-label": "Billing period" });
    const monthlyButton = el("button", { type: "button", role: "radio" });
    monthlyButton.textContent = "Monthly";
    const yearlyButton = el("button", { type: "button", role: "radio" });
    yearlyButton.textContent = "Yearly";
    switchGroup.append(monthlyButton, yearlyButton);
    const optionButtons = [monthlyButton, yearlyButton];
    let focusIndex = OPTIONS.indexOf(effective());
    function renderSwitch() {
      const value = effective();
      for (let i = 0; i < OPTIONS.length; i++) {
        const option = OPTIONS[i];
        const button = optionButtons[i];
        if (!option || !button) continue;
        button.setAttribute("aria-checked", String(option === value));
        button.tabIndex = i === focusIndex ? 0 : -1;
      }
    }
    let priceRefs = [];
    function renderPrices() {
      const billing = effective();
      for (const ref of priceRefs) {
        const value = billing === "yearly" ? ref.tier.yearly : ref.tier.monthly;
        ref.amount.textContent = `${props.currency}${value}`;
        ref.period.textContent = billing === "yearly" ? "/yr" : "/mo";
      }
    }
    function moveTo(index) {
      const next = (index % OPTIONS.length + OPTIONS.length) % OPTIONS.length;
      const value = OPTIONS[next];
      if (value === void 0) return;
      const willChange = next !== focusIndex;
      focusIndex = next;
      optionButtons[next]?.focus();
      if (willChange) {
        if (!isControlled()) internalBilling = value;
        emit("billingChange", value);
      }
      renderSwitch();
      renderPrices();
    }
    function onKeydown(event) {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        moveTo(focusIndex + 1);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        moveTo(focusIndex - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        moveTo(0);
      } else if (event.key === "End") {
        event.preventDefault();
        moveTo(OPTIONS.length - 1);
      }
    }
    function onClick(event) {
      const target = event.target;
      const index = target instanceof HTMLButtonElement ? optionButtons.indexOf(target) : -1;
      if (index >= 0) moveTo(index);
    }
    switchGroup.addEventListener("keydown", onKeydown);
    switchGroup.addEventListener("click", onClick);
    const cardsHost = el("div", { "data-part": "grid" });
    function buildCards() {
      cardsHost.replaceChildren();
      priceRefs = [];
      for (const tier of props.tiers) {
        const card = el("article", tier.featured ? { "data-featured": "" } : {});
        if (tier.featured) {
          const tag = el("span", { "data-part": "tag" });
          tag.textContent = "Recommended";
          card.append(tag);
        }
        const heading = el("h3");
        heading.textContent = tier.name;
        const price = el("p", { "data-part": "price" });
        const amount = el("span", { "data-part": "amount" });
        const period = el("span", { "data-part": "period" });
        price.append(amount, period);
        const blurb = el("p", { "data-part": "blurb" });
        blurb.textContent = tier.blurb;
        const list = el("ul");
        for (const feature of tier.features) {
          const item = el("li");
          const check = el("span", { "data-part": "check", "aria-hidden": "true" });
          check.textContent = "✓";
          item.append(check, feature);
          list.append(item);
        }
        const link = el("a", { "data-part": "cta", href: tier.cta.href || "#" });
        link.textContent = tier.cta.label;
        card.append(heading, price, blurb, list, link);
        cardsHost.append(card);
        priceRefs.push({ tier, amount, period });
      }
      renderPrices();
    }
    function applyLabel() {
      labelHost(host, props.label.trim() ? props.label : "Pricing", "region");
    }
    applyLabel();
    buildCards();
    renderSwitch();
    host.append(switchGroup, cardsHost);
    host.dataset.picaReady = "true";
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        if (before.label !== props.label) applyLabel();
        if (!sameJson(before.tiers, props.tiers)) buildCards();
        else if (before.billing !== props.billing || before.currency !== props.currency) renderPrices();
        if (before.billing !== props.billing) {
          focusIndex = OPTIONS.indexOf(effective());
          renderSwitch();
        }
      },
      destroy() {
        switchGroup.removeEventListener("keydown", onKeydown);
        switchGroup.removeEventListener("click", onClick);
        switchGroup.remove();
        cardsHost.remove();
        sheet.destroy();
        unlabelHost(host);
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
  var instance = PicaPricing.mount(host, take(window.PICA_PROPS || {}));
  ["billingChange"].forEach(function (name) {
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

- Technique from [Radio group pattern](https://www.w3.org/WAI/ARIA/apg/patterns/radio/) by W3C WAI-ARIA Authoring Practices Guide (W3C document).
