import { labelHost, unlabelHost } from "../../../lib/a11y";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import { hashSeed } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";
import * as asciiReveal from "../../ascii/ascii-reveal/core";

export interface Testimonial {
  /** The quoted words. */
  quote: string;
  /** Who said it. */
  name: string;
  /** Their role, shown under the name. */
  role: string;
}

export interface TestimonialsProps extends MotionProps {
  /** Quotes to show, each with who said it and their role. */
  items: readonly Testimonial[];
  /** "grid" shows every quote as a card. "rotate" shows one quote at a time, with previous and next controls. */
  layout: "grid" | "rotate";
  /** Columns in the grid layout, before it collapses to one column on a narrow host. */
  columns: number;
  /** Milliseconds a quote stays on screen before rotate advances to the next one. */
  interval: number;
  /** Accessible name for the section, and for the carousel in rotate layout. */
  label: string;
  /** CSS font family stack for names, the initials badge, the nav buttons, and the rotating quote. */
  fontFamily: string;
}

const DEFAULT_ITEMS: readonly Testimonial[] = [
  {
    quote: "We dropped it into a static page with no build step, and it just worked.",
    name: "Jordan Ellis",
    role: "Frontend developer",
  },
  {
    quote: "The React import matches our own components so closely that nobody noticed the switch.",
    name: "Priya Nandan",
    role: "Design engineer",
  },
  {
    quote: "Our marketing site finally looks drawn instead of templated.",
    name: "Sam Okafor",
    role: "Indie hacker",
  },
  {
    quote: "Every component we tried stayed under budget, even after we added our own styling.",
    name: "Mina Chen",
    role: "Product designer",
  },
];

export const defaults: TestimonialsProps = {
  items: DEFAULT_ITEMS,
  layout: "grid",
  columns: 2,
  interval: 7000,
  label: "What people say",
  fontFamily: GRID_FONT,
  paused: false,
  time: null,
  seed: 1,
};

/** How often the rotate timer checks whether a quote's interval has elapsed. Coarse on purpose: nothing
 *  about the countdown itself needs to be smooth, only the composed reveal it triggers does. */
const ROTATE_FPS = 4;

/** Up to two initials from a name, for the badge. Empty when the name is empty. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1] ?? "") : "";
  return (last ? `${first.charAt(0)}${last.charAt(0)}` : first.slice(0, 2)).toUpperCase();
}

/** An element marked as this core's own, with an optional class for the scoped stylesheet to select. */
function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  if (className) node.className = className;
  return node;
}

/** The scoped rules for both layouts. Selectors below `s`, the host's own [data-pica-id] attribute, target
 *  classes this core alone sets on nodes it created, never the host's own className. */
function rules(s: string, p: TestimonialsProps): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  const cols = Math.max(1, Math.min(4, Math.round(p.columns)));
  return [
    `${s}{display:block;color:${fg}}`,
    `${s} ul.tm-grid{display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:1.5rem;margin:0;padding:0;list-style:none}`,
    `@media (max-width:560px){${s} ul.tm-grid{grid-template-columns:1fr}}`,
    `${s} .tm-card{border:1px solid ${fg};margin:0;padding:1.25rem;display:flex;flex-direction:column;gap:0.85rem}`,
    `${s} .tm-quote{margin:0;font-size:1rem;line-height:1.6}`,
    `${s} .tm-empty{margin:0;font-family:${p.fontFamily};color:${muted}}`,
    `${s} .tm-meta{display:flex;align-items:center;gap:0.75rem;margin:0}`,
    `${s} .tm-badge{display:inline-flex;flex:none;align-items:center;justify-content:center;width:2.25em;height:2.25em;border:1px solid ${fg};font-family:${p.fontFamily};font-size:0.75rem;letter-spacing:0.02em}`,
    `${s} .tm-who{display:flex;flex-direction:column;gap:0.15em;min-width:0}`,
    `${s} .tm-name{font-family:${p.fontFamily};font-style:normal;font-size:0.9rem}`,
    `${s} .tm-role{font-family:${p.fontFamily};font-size:0.8rem;color:${muted}}`,
    `${s} .tm-rotate{display:flex;align-items:flex-start;gap:1rem;max-width:44rem}`,
    `${s} .tm-slidewrap{flex:1;min-width:0}`,
    `${s} .tm-slide{display:flex;flex-direction:column;gap:0.85rem}`,
    `${s} .tm-quotehost{display:block;font-size:1.05rem;line-height:1.6;min-width:0}`,
    `${s} .tm-quotehost>span[aria-hidden="true"]{white-space:pre-wrap!important;overflow-wrap:anywhere;display:block}`,
    `${s} .tm-nav{appearance:none;flex:none;width:2.25em;height:2.25em;margin:0;padding:0;border:1px solid ${fg};border-radius:0;background:transparent;color:${fg};font:inherit;font-family:${p.fontFamily};font-size:1rem;line-height:1;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}`,
    `${s} .tm-nav:hover:not(:disabled){background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${s} .tm-nav:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${s} .tm-nav:disabled{opacity:0.45;cursor:not-allowed}`,
  ].join("\n");
}

export const mount: Mount<TestimonialsProps> = (host, initial = {}) => {
  let props: TestimonialsProps = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  const sheet = scope(host);

  let container: HTMLElement | null = null;

  // Rotate layout only.
  let loop: Loop | null = null;
  let child: ReturnType<typeof asciiReveal.mount> | null = null;
  let quoteHost: HTMLDivElement | null = null;
  let liveWrap: HTMLDivElement | null = null;
  let slideEl: HTMLDivElement | null = null;
  let nameEl: HTMLElement | null = null;
  let roleEl: HTMLElement | null = null;
  let badgeEl: HTMLElement | null = null;
  let prevBtn: HTMLButtonElement | null = null;
  let nextBtn: HTMLButtonElement | null = null;
  let onPrev: (() => void) | null = null;
  let onNext: (() => void) | null = null;
  let onEnter: (() => void) | null = null;
  let onLeave: (() => void) | null = null;
  let onFocusIn: (() => void) | null = null;
  let onFocusOut: (() => void) | null = null;
  let index = 0;
  let mountedIndex = -1;
  let anchorT = 0;
  let lastT = 0;
  let hovering = false;
  let focused = false;
  let emptyShown = false;

  function syncPause(): void {
    loop?.update({ paused: props.paused || hovering || focused });
  }

  function updateNavDisabled(): void {
    const disable = props.items.length <= 1;
    for (const button of [prevBtn, nextBtn]) {
      if (!button) continue;
      button.disabled = disable;
      button.setAttribute("aria-disabled", String(disable));
    }
  }

  /** Destroys the current child, mounts a fresh one for item `i` so its reveal restarts from scrambled
   *  glyphs, and updates the surrounding chrome. `announce` controls the live region for this swap. */
  function mountSlide(i: number, localTime: number | null, announce: boolean): void {
    if (!quoteHost) return;
    const item = props.items[i] ?? null;
    child?.destroy();
    mountedIndex = i;
    child = asciiReveal.mount(quoteHost, {
      text: item ? item.quote : "",
      time: localTime,
      seed: hashSeed(props.seed, i),
      paused: props.paused,
      fontFamily: props.fontFamily,
    });
    if (nameEl) nameEl.textContent = item ? item.name : "";
    if (roleEl) roleEl.textContent = item ? item.role : "";
    if (badgeEl) badgeEl.textContent = item ? initials(item.name) : "";
    if (slideEl) slideEl.setAttribute("aria-label", `${i + 1} of ${props.items.length}`);
    if (liveWrap) liveWrap.setAttribute("aria-live", announce ? "polite" : "off");
    updateNavDisabled();
  }

  function showEmptySlide(): void {
    if (emptyShown) return;
    emptyShown = true;
    child?.destroy();
    child = null;
    mountedIndex = -1;
    if (quoteHost) quoteHost.textContent = "No testimonials yet.";
    if (nameEl) nameEl.textContent = "";
    if (roleEl) roleEl.textContent = "";
    if (badgeEl) badgeEl.textContent = "";
    if (slideEl) slideEl.removeAttribute("aria-label");
    updateNavDisabled();
  }

  /** Moves by one slide from a previous or next press. Always announced, and always restarts the interval
   *  countdown from now. */
  function step(direction: 1 | -1): void {
    const n = props.items.length;
    if (n === 0) return;
    index = ((index + direction) % n + n) % n;
    anchorT = lastT;
    mountSlide(index, props.time !== null ? 0 : null, true);
  }

  /** The rotate timer's frame. A fixed `time` is a pure function of `t`: which slide, and how far into its
   *  reveal. A live `t` advances the index itself, pausing while reduced, hovered, or focused. */
  function draw(t: number, reduced: boolean): void {
    lastT = t;
    const n = props.items.length;
    if (n === 0) {
      showEmptySlide();
    } else {
      emptyShown = false;
      const interval = Math.max(1, props.interval);
      if (props.time !== null) {
        const next = ((Math.floor(t / interval) % n) + n) % n;
        const local = ((t % interval) + interval) % interval;
        if (next !== mountedIndex) {
          index = next;
          mountSlide(index, local, false);
        } else {
          child?.update({ time: local });
        }
      } else {
        if (!reduced && !hovering && !focused && n > 1 && t - anchorT >= interval) {
          anchorT = t;
          index = (index + 1) % n;
        }
        if (index !== mountedIndex) mountSlide(index, null, false);
      }
    }
    if (host.dataset.picaReady !== "true") host.dataset.picaReady = "true";
  }

  function buildGrid(): void {
    const list = el("ul", "tm-grid");
    list.setAttribute("role", "list");
    container = list;
    host.append(list);
    renderGrid();
  }

  function renderGrid(): void {
    const list = container;
    if (!list) return;
    list.textContent = "";
    if (props.items.length === 0) {
      const note = el("p", "tm-empty");
      note.textContent = "No testimonials yet.";
      list.append(note);
      return;
    }
    for (const item of props.items) {
      const card = el("li", "tm-card");
      card.setAttribute("role", "listitem");
      const quote = el("blockquote", "tm-quote");
      quote.textContent = item.quote;
      const footer = el("footer", "tm-meta");
      const badge = el("span", "tm-badge");
      badge.setAttribute("aria-hidden", "true");
      badge.textContent = initials(item.name);
      const who = el("span", "tm-who");
      const name = el("cite", "tm-name");
      name.textContent = item.name;
      const role = el("span", "tm-role");
      role.textContent = item.role;
      who.append(name, role);
      footer.append(badge, who);
      card.append(quote, footer);
      list.append(card);
    }
  }

  function buildRotate(): void {
    const wrap = el("div", "tm-rotate");
    container = wrap;
    prevBtn = el("button", "tm-nav tm-prev");
    prevBtn.type = "button";
    prevBtn.setAttribute("aria-label", "Previous testimonial");
    prevBtn.textContent = "‹";
    nextBtn = el("button", "tm-nav tm-next");
    nextBtn.type = "button";
    nextBtn.setAttribute("aria-label", "Next testimonial");
    nextBtn.textContent = "›";
    liveWrap = el("div", "tm-slidewrap");
    liveWrap.setAttribute("aria-live", "off");
    liveWrap.setAttribute("aria-atomic", "true");
    slideEl = el("div", "tm-slide");
    slideEl.setAttribute("role", "group");
    slideEl.setAttribute("aria-roledescription", "slide");
    quoteHost = el("div", "tm-quotehost");
    const footer = el("footer", "tm-meta");
    badgeEl = el("span", "tm-badge");
    badgeEl.setAttribute("aria-hidden", "true");
    const who = el("span", "tm-who");
    nameEl = el("cite", "tm-name");
    roleEl = el("span", "tm-role");
    who.append(nameEl, roleEl);
    footer.append(badgeEl, who);
    slideEl.append(quoteHost, footer);
    liveWrap.append(slideEl);
    wrap.append(prevBtn, liveWrap, nextBtn);
    host.append(wrap);

    onPrev = () => step(-1);
    onNext = () => step(1);
    prevBtn.addEventListener("click", onPrev);
    nextBtn.addEventListener("click", onNext);
    onEnter = () => {
      hovering = true;
      syncPause();
    };
    onLeave = () => {
      hovering = false;
      syncPause();
    };
    onFocusIn = () => {
      focused = true;
      syncPause();
    };
    onFocusOut = () => {
      focused = false;
      syncPause();
    };
    wrap.addEventListener("pointerenter", onEnter);
    wrap.addEventListener("pointerleave", onLeave);
    wrap.addEventListener("focusin", onFocusIn);
    wrap.addEventListener("focusout", onFocusOut);

    index = 0;
    mountedIndex = -1;
    anchorT = 0;
    emptyShown = false;
    loop = createLoop({ el: host, fps: ROTATE_FPS, paused: props.paused, time: props.time, still: 0, frame: draw });
  }

  function teardownLayout(): void {
    loop?.destroy();
    loop = null;
    child?.destroy();
    child = null;
    if (prevBtn && onPrev) prevBtn.removeEventListener("click", onPrev);
    if (nextBtn && onNext) nextBtn.removeEventListener("click", onNext);
    if (container) {
      if (onEnter) container.removeEventListener("pointerenter", onEnter);
      if (onLeave) container.removeEventListener("pointerleave", onLeave);
      if (onFocusIn) container.removeEventListener("focusin", onFocusIn);
      if (onFocusOut) container.removeEventListener("focusout", onFocusOut);
    }
    container?.remove();
    container = null;
    quoteHost = null;
    liveWrap = null;
    slideEl = null;
    nameEl = null;
    roleEl = null;
    badgeEl = null;
    prevBtn = null;
    nextBtn = null;
    onPrev = null;
    onNext = null;
    onEnter = null;
    onLeave = null;
    onFocusIn = null;
    onFocusOut = null;
    hovering = false;
    focused = false;
  }

  function applyLabel(): void {
    labelHost(host, props.label, "region");
    attrs.set("aria-roledescription", props.layout === "rotate" ? "carousel" : null);
  }

  applyLabel();
  sheet.setRules(rules(sheet.selector, props));
  if (props.layout === "grid") buildGrid();
  else buildRotate();
  if (host.dataset.picaReady !== "true") host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      const layoutChanged = props.layout !== before.layout;
      if (layoutChanged) {
        teardownLayout();
        if (props.layout === "grid") buildGrid();
        else buildRotate();
      } else if (props.layout === "grid") {
        if (!sameJson(props.items, before.items) || props.columns !== before.columns) renderGrid();
      } else {
        if (!sameJson(props.items, before.items)) {
          index = 0;
          mountedIndex = -1;
          anchorT = lastT;
        } else if (props.time !== before.time) {
          // Whether time is live or fixed changed the child's own animating condition, not just its
          // value, so a plain update() cannot fix it: force draw() to remount fresh below.
          anchorT = lastT;
          mountedIndex = -1;
        } else if (
          child &&
          (props.paused !== before.paused || props.fontFamily !== before.fontFamily || props.seed !== before.seed)
        ) {
          child.update({ paused: props.paused, fontFamily: props.fontFamily, seed: hashSeed(props.seed, mountedIndex) });
        }
        loop?.update({ paused: props.paused || hovering || focused, time: props.time, fps: ROTATE_FPS });
        loop?.redraw();
      }
      applyLabel();
      sheet.setRules(rules(sheet.selector, props));
    },
    destroy() {
      teardownLayout();
      attrs.restore();
      unlabelHost(host);
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};
