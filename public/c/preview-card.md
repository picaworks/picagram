# Preview Card

> A link that reveals a compact reference preview after a short hover or when focused.

Category: ui. Tags: preview, card, link, reference, overlay. Static. Size: 2.4 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/preview-card.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `triggerLabel` | string | `"Component source"` | The visible label of the link that opens the preview. |
| `href` | string | `"#"` | The destination followed when the trigger is activated. |
| `title` | string | `"registry/ui/button"` | The preview heading. |
| `description` | string | `"A button in four looks with a braille spinner while it loads."` | A short summary of the linked destination. |
| `meta` | string | `"picagram.dev/components/button"` | One line of secondary reference information. |
| `placement` | "top" \| "bottom" \| "start" \| "end" | `"top"` | Which side of the trigger the card opens toward. |
| `delay` | number | `300` | Milliseconds of unbroken trigger hover required before the card opens. |
| `open` | boolean \| null | `null` | Whether the card is open. Null leaves it uncontrolled. |
| `defaultOpen` | boolean | `false` | The card's state at mount, read once, when open is null. |

## Events

Each event is a CustomEvent on the host named `pica:` plus the event name in lower case. It does not bubble. In React, pass the matching `on` prop.

| Event | React prop | Detail | Description |
|---|---|---|---|
| `openChange` | `onOpenChange` | `boolean` | The card's requested open state. |

## Colors

Draws with `--pica-fg`, `--pica-muted`, `--pica-accent`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Preview Card · preview-card
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

// registry/ui/preview-card/core.ts
export interface PreviewCardProps {
  /** The visible label of the link that opens the preview. */
  triggerLabel: string;
  /** The destination followed when the trigger is activated. */
  href: string;
  /** The preview heading. */
  title: string;
  /** A short summary of the linked destination. */
  description: string;
  /** One line of secondary reference information. */
  meta: string;
  /** Which side of the trigger the card opens toward. */
  placement: "top" | "bottom" | "start" | "end";
  /** Milliseconds of unbroken trigger hover required before the card opens. */
  delay: number;
  /** Whether the card is open. Null leaves it uncontrolled. */
  open: boolean | null;
  /** The card's state at mount, read once, when open is null. */
  defaultOpen: boolean;
}

export interface PreviewCardEvents {
  /** The card's requested open state. */
  openChange: boolean;
}

export const defaults: PreviewCardProps = {
  triggerLabel: "Component source",
  href: "#",
  title: "registry/ui/button",
  description: "A button in four looks with a braille spinner while it loads.",
  meta: "picagram.dev/components/button",
  placement: "top",
  delay: 300,
  open: null,
  defaultOpen: false,
};

/** Distance between the link and the preview card. */
const PREVIEW_GAP = "0.6em";
/** Time allowed for the pointer to cross the gap between the link and card. */
const LEAVE_GRACE_MS = 140;

/** Card placement against the link's CSS anchor. */
const PREVIEW_PLACEMENT: Readonly<Record<PreviewCardProps["placement"], string>> = {
  top: `bottom:calc(anchor(top) + ${PREVIEW_GAP});justify-self:anchor-center`,
  bottom: `top:calc(anchor(bottom) + ${PREVIEW_GAP});justify-self:anchor-center`,
  start: `right:calc(anchor(left) + ${PREVIEW_GAP});align-self:anchor-center`,
  end: `left:calc(anchor(right) + ${PREVIEW_GAP});align-self:anchor-center`,
};

/** Scoped rules for the link and its small preview document. */
function previewRules(s: string, p: PreviewCardProps, anchorName: string): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  return [
    `${s} [data-pica="trigger"]{display:inline-block;padding:0.2em 0.1em;color:${fg};font:inherit;line-height:1.25;text-decoration-line:underline;text-decoration-thickness:1px;text-underline-offset:0.22em;anchor-name:${anchorName}}`,
    `${s} [data-pica="trigger"]:hover{color:${accent}}`,
    `${s} [data-pica="trigger"]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${s} [data-pica="panel"]{position:fixed;position-anchor:${anchorName};inset:auto;margin:0;box-sizing:border-box;width:max-content;max-width:min(24em,calc(100vw - 2em));padding:0.85em 1em;border:1px solid ${fg};border-inline-start:2px solid ${accent};border-radius:0;background:transparent;color:${fg};line-height:1.4;overflow-wrap:break-word}`,
    `${s} [data-pica="panel"]{${PREVIEW_PLACEMENT[p.placement]}}`,
    `${s} [data-pica="title"]{font:inherit;font-weight:600;line-height:1.25}`,
    `${s} [data-pica="description"]{margin:0.55em 0 0;font:inherit}`,
    `${s} [data-pica="meta"]{margin-top:0.8em;color:${muted};font-family:${GRID_FONT};font-size:0.72em;line-height:1.35;letter-spacing:0.04em}`,
  ].join("\n");
}

export const mount: Mount<PreviewCardProps> = (host, initial = {}) => {
  let props: PreviewCardProps = { ...defaults, ...initial };
  const emit = emitter<PreviewCardEvents>(host);
  const sheet = scope(host);
  const panelId = nextId("pica-preview");
  const anchorName = `--${nextId("pica-anchor")}`;
  const supportsAnchor = CSS.supports("anchor-name", anchorName);

  const trigger = document.createElement("a");
  trigger.setAttribute("data-pica", "trigger");
  trigger.setAttribute("aria-details", panelId);

  const panel = document.createElement("div");
  panel.setAttribute("data-pica", "panel");
  panel.setAttribute("data-state", "closed");
  panel.id = panelId;
  panel.popover = "manual";

  const title = document.createElement("div");
  title.setAttribute("data-pica", "title");
  const description = document.createElement("p");
  description.setAttribute("data-pica", "description");
  const meta = document.createElement("div");
  meta.setAttribute("data-pica", "meta");
  panel.append(title, description, meta);
  host.append(trigger, panel);

  let openState = false;
  let overTrigger = false;
  let overPanel = false;
  let openTimer: ReturnType<typeof setTimeout> | null = null;
  let closeTimer: ReturnType<typeof setTimeout> | null = null;

  const desired = (): boolean => props.open ?? openState;

  function clearOpenTimer(): void {
    if (openTimer === null) return;
    clearTimeout(openTimer);
    openTimer = null;
  }

  function clearCloseTimer(): void {
    if (closeTimer === null) return;
    clearTimeout(closeTimer);
    closeTimer = null;
  }

  /** Places the card from measured boxes where CSS anchor positioning is unavailable. */
  function positionFallback(): void {
    if (supportsAnchor) return;
    const linkBox = trigger.getBoundingClientRect();
    const cardBox = panel.getBoundingClientRect();
    const gap = 10;
    let top: number;
    let left: number;
    if (props.placement === "top") {
      top = linkBox.top - cardBox.height - gap;
      left = linkBox.left + linkBox.width / 2 - cardBox.width / 2;
    } else if (props.placement === "bottom") {
      top = linkBox.bottom + gap;
      left = linkBox.left + linkBox.width / 2 - cardBox.width / 2;
    } else if (props.placement === "start") {
      top = linkBox.top + linkBox.height / 2 - cardBox.height / 2;
      left = linkBox.left - cardBox.width - gap;
    } else {
      top = linkBox.top + linkBox.height / 2 - cardBox.height / 2;
      left = linkBox.right + gap;
    }
    const inset = 8;
    top = Math.max(inset, Math.min(top, window.innerHeight - cardBox.height - inset));
    left = Math.max(inset, Math.min(left, window.innerWidth - cardBox.width - inset));
    panel.style.top = `${Math.round(top)}px`;
    panel.style.left = `${Math.round(left)}px`;
  }

  function reflect(next: boolean): void {
    if (next && !panel.matches(":popover-open")) panel.showPopover();
    if (!next && panel.matches(":popover-open")) panel.hidePopover();
    panel.setAttribute("data-state", next ? "open" : "closed");
    openState = next;
    if (next) positionFallback();
  }

  /** Reports input intent, and applies it only while the card is uncontrolled. */
  function request(next: boolean): void {
    if (next === desired()) return;
    clearOpenTimer();
    clearCloseTimer();
    emit("openChange", next);
    if (props.open === null) reflect(next);
  }

  function scheduleOpen(): void {
    clearOpenTimer();
    clearCloseTimer();
    if (desired()) return;
    const delay = Math.max(0, Math.min(1500, props.delay));
    openTimer = setTimeout(() => {
      openTimer = null;
      if (overTrigger) request(true);
    }, delay);
  }

  function scheduleClose(): void {
    clearCloseTimer();
    if (overTrigger || overPanel) return;
    closeTimer = setTimeout(() => {
      closeTimer = null;
      if (!overTrigger && !overPanel) request(false);
    }, LEAVE_GRACE_MS);
  }

  const onTriggerEnter = (): void => {
    overTrigger = true;
    scheduleOpen();
  };
  const onTriggerLeave = (): void => {
    overTrigger = false;
    clearOpenTimer();
    scheduleClose();
  };
  const onPanelEnter = (): void => {
    overPanel = true;
    clearCloseTimer();
  };
  const onPanelLeave = (): void => {
    overPanel = false;
    scheduleClose();
  };
  const onFocus = (): void => {
    clearOpenTimer();
    clearCloseTimer();
    request(true);
  };
  const onBlur = (): void => {
    clearOpenTimer();
    clearCloseTimer();
    request(false);
  };
  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || !desired()) return;
    event.preventDefault();
    request(false);
    trigger.focus();
  };

  trigger.addEventListener("pointerenter", onTriggerEnter);
  trigger.addEventListener("pointerleave", onTriggerLeave);
  trigger.addEventListener("focus", onFocus);
  trigger.addEventListener("blur", onBlur);
  panel.addEventListener("pointerenter", onPanelEnter);
  panel.addEventListener("pointerleave", onPanelLeave);
  document.addEventListener("keydown", onKeydown);

  function apply(): void {
    trigger.textContent = props.triggerLabel;
    trigger.href = props.href;
    title.textContent = props.title;
    description.textContent = props.description;
    meta.textContent = props.meta;
    sheet.setRules(previewRules(sheet.selector, props, anchorName));
    if (props.open !== null) reflect(props.open);
    else if (openState) positionFallback();
  }

  apply();
  if (props.open === null && props.defaultOpen) reflect(true);
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      apply();
    },
    destroy() {
      clearOpenTimer();
      clearCloseTimer();
      trigger.removeEventListener("pointerenter", onTriggerEnter);
      trigger.removeEventListener("pointerleave", onTriggerLeave);
      trigger.removeEventListener("focus", onFocus);
      trigger.removeEventListener("blur", onBlur);
      panel.removeEventListener("pointerenter", onPanelEnter);
      panel.removeEventListener("pointerleave", onPanelLeave);
      document.removeEventListener("keydown", onKeydown);
      if (panel.matches(":popover-open")) panel.hidePopover();
      trigger.remove();
      panel.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};

// registry/ui/preview-card/index.tsx
export type PreviewCardComponentProps = Partial<PreviewCardProps> & Handlers<PreviewCardEvents> & WrapperProps;

/** A link that reveals a small reference preview after a short hover or when focused. */
export function PreviewCard({ className, style, palette, ...props }: PreviewCardComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ display: "inline-block", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Preview Card · preview-card
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Preview Card · Pica</title>
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
<div class="pica-stage"><div id="pica"></div></div>
<script>
"use strict";
var PicaPreviewCard = (() => {
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

  // registry/ui/preview-card/core.ts
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

  // registry/ui/preview-card/core.ts
  var defaults = {
    triggerLabel: "Component source",
    href: "#",
    title: "registry/ui/button",
    description: "A button in four looks with a braille spinner while it loads.",
    meta: "picagram.dev/components/button",
    placement: "top",
    delay: 300,
    open: null,
    defaultOpen: false
  };
  var PREVIEW_GAP = "0.6em";
  var LEAVE_GRACE_MS = 140;
  var PREVIEW_PLACEMENT = {
    top: `bottom:calc(anchor(top) + ${PREVIEW_GAP});justify-self:anchor-center`,
    bottom: `top:calc(anchor(bottom) + ${PREVIEW_GAP});justify-self:anchor-center`,
    start: `right:calc(anchor(left) + ${PREVIEW_GAP});align-self:anchor-center`,
    end: `left:calc(anchor(right) + ${PREVIEW_GAP});align-self:anchor-center`
  };
  function previewRules(s, p, anchorName) {
    const fg = cssVar("fg");
    const muted = cssVar("muted");
    const accent = cssVar("accent");
    return [
      `${s} [data-pica="trigger"]{display:inline-block;padding:0.2em 0.1em;color:${fg};font:inherit;line-height:1.25;text-decoration-line:underline;text-decoration-thickness:1px;text-underline-offset:0.22em;anchor-name:${anchorName}}`,
      `${s} [data-pica="trigger"]:hover{color:${accent}}`,
      `${s} [data-pica="trigger"]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
      `${s} [data-pica="panel"]{position:fixed;position-anchor:${anchorName};inset:auto;margin:0;box-sizing:border-box;width:max-content;max-width:min(24em,calc(100vw - 2em));padding:0.85em 1em;border:1px solid ${fg};border-inline-start:2px solid ${accent};border-radius:0;background:transparent;color:${fg};line-height:1.4;overflow-wrap:break-word}`,
      `${s} [data-pica="panel"]{${PREVIEW_PLACEMENT[p.placement]}}`,
      `${s} [data-pica="title"]{font:inherit;font-weight:600;line-height:1.25}`,
      `${s} [data-pica="description"]{margin:0.55em 0 0;font:inherit}`,
      `${s} [data-pica="meta"]{margin-top:0.8em;color:${muted};font-family:${GRID_FONT};font-size:0.72em;line-height:1.35;letter-spacing:0.04em}`
    ].join("\n");
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    const emit = emitter(host);
    const sheet = scope(host);
    const panelId = nextId("pica-preview");
    const anchorName = `--${nextId("pica-anchor")}`;
    const supportsAnchor = CSS.supports("anchor-name", anchorName);
    const trigger = document.createElement("a");
    trigger.setAttribute("data-pica", "trigger");
    trigger.setAttribute("aria-details", panelId);
    const panel = document.createElement("div");
    panel.setAttribute("data-pica", "panel");
    panel.setAttribute("data-state", "closed");
    panel.id = panelId;
    panel.popover = "manual";
    const title = document.createElement("div");
    title.setAttribute("data-pica", "title");
    const description = document.createElement("p");
    description.setAttribute("data-pica", "description");
    const meta = document.createElement("div");
    meta.setAttribute("data-pica", "meta");
    panel.append(title, description, meta);
    host.append(trigger, panel);
    let openState = false;
    let overTrigger = false;
    let overPanel = false;
    let openTimer = null;
    let closeTimer = null;
    const desired = () => props.open ?? openState;
    function clearOpenTimer() {
      if (openTimer === null) return;
      clearTimeout(openTimer);
      openTimer = null;
    }
    function clearCloseTimer() {
      if (closeTimer === null) return;
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    function positionFallback() {
      if (supportsAnchor) return;
      const linkBox = trigger.getBoundingClientRect();
      const cardBox = panel.getBoundingClientRect();
      const gap = 10;
      let top;
      let left;
      if (props.placement === "top") {
        top = linkBox.top - cardBox.height - gap;
        left = linkBox.left + linkBox.width / 2 - cardBox.width / 2;
      } else if (props.placement === "bottom") {
        top = linkBox.bottom + gap;
        left = linkBox.left + linkBox.width / 2 - cardBox.width / 2;
      } else if (props.placement === "start") {
        top = linkBox.top + linkBox.height / 2 - cardBox.height / 2;
        left = linkBox.left - cardBox.width - gap;
      } else {
        top = linkBox.top + linkBox.height / 2 - cardBox.height / 2;
        left = linkBox.right + gap;
      }
      const inset = 8;
      top = Math.max(inset, Math.min(top, window.innerHeight - cardBox.height - inset));
      left = Math.max(inset, Math.min(left, window.innerWidth - cardBox.width - inset));
      panel.style.top = `${Math.round(top)}px`;
      panel.style.left = `${Math.round(left)}px`;
    }
    function reflect(next) {
      if (next && !panel.matches(":popover-open")) panel.showPopover();
      if (!next && panel.matches(":popover-open")) panel.hidePopover();
      panel.setAttribute("data-state", next ? "open" : "closed");
      openState = next;
      if (next) positionFallback();
    }
    function request(next) {
      if (next === desired()) return;
      clearOpenTimer();
      clearCloseTimer();
      emit("openChange", next);
      if (props.open === null) reflect(next);
    }
    function scheduleOpen() {
      clearOpenTimer();
      clearCloseTimer();
      if (desired()) return;
      const delay = Math.max(0, Math.min(1500, props.delay));
      openTimer = setTimeout(() => {
        openTimer = null;
        if (overTrigger) request(true);
      }, delay);
    }
    function scheduleClose() {
      clearCloseTimer();
      if (overTrigger || overPanel) return;
      closeTimer = setTimeout(() => {
        closeTimer = null;
        if (!overTrigger && !overPanel) request(false);
      }, LEAVE_GRACE_MS);
    }
    const onTriggerEnter = () => {
      overTrigger = true;
      scheduleOpen();
    };
    const onTriggerLeave = () => {
      overTrigger = false;
      clearOpenTimer();
      scheduleClose();
    };
    const onPanelEnter = () => {
      overPanel = true;
      clearCloseTimer();
    };
    const onPanelLeave = () => {
      overPanel = false;
      scheduleClose();
    };
    const onFocus = () => {
      clearOpenTimer();
      clearCloseTimer();
      request(true);
    };
    const onBlur = () => {
      clearOpenTimer();
      clearCloseTimer();
      request(false);
    };
    const onKeydown = (event) => {
      if (event.key !== "Escape" || !desired()) return;
      event.preventDefault();
      request(false);
      trigger.focus();
    };
    trigger.addEventListener("pointerenter", onTriggerEnter);
    trigger.addEventListener("pointerleave", onTriggerLeave);
    trigger.addEventListener("focus", onFocus);
    trigger.addEventListener("blur", onBlur);
    panel.addEventListener("pointerenter", onPanelEnter);
    panel.addEventListener("pointerleave", onPanelLeave);
    document.addEventListener("keydown", onKeydown);
    function apply() {
      trigger.textContent = props.triggerLabel;
      trigger.href = props.href;
      title.textContent = props.title;
      description.textContent = props.description;
      meta.textContent = props.meta;
      sheet.setRules(previewRules(sheet.selector, props, anchorName));
      if (props.open !== null) reflect(props.open);
      else if (openState) positionFallback();
    }
    apply();
    if (props.open === null && props.defaultOpen) reflect(true);
    host.dataset.picaReady = "true";
    return {
      update(next) {
        props = { ...props, ...next };
        apply();
      },
      destroy() {
        clearOpenTimer();
        clearCloseTimer();
        trigger.removeEventListener("pointerenter", onTriggerEnter);
        trigger.removeEventListener("pointerleave", onTriggerLeave);
        trigger.removeEventListener("focus", onFocus);
        trigger.removeEventListener("blur", onBlur);
        panel.removeEventListener("pointerenter", onPanelEnter);
        panel.removeEventListener("pointerleave", onPanelLeave);
        document.removeEventListener("keydown", onKeydown);
        if (panel.matches(":popover-open")) panel.hidePopover();
        trigger.remove();
        panel.remove();
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
  var instance = PicaPreviewCard.mount(host, take(window.PICA_PROPS || {}));
  ["openChange"].forEach(function (name) {
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

Original to Picagram.
