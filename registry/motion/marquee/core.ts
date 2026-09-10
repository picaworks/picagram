import { scope, styleHost } from "../../../lib/host";
import { createLoop } from "../../../lib/loop";
import type { Mount, MotionProps } from "../../../lib/types";

export interface MarqueeProps extends MotionProps {
  /** How fast the content scrolls, in pixels per second. */
  speed: number;
  /** Which way the content scrolls. */
  direction: "left" | "right";
  /** Space between adjacent items, in em. */
  gap: number;
  /** Stops the scroll while the pointer rests over the host, or while focus sits inside it. */
  pauseOnHover: boolean;
  /** Frames drawn per second while scrolling. */
  fps: number;
}

export const defaults: MarqueeProps = {
  speed: 40,
  direction: "left",
  gap: 2,
  pauseOnHover: true,
  fps: 30,
  paused: false,
  time: null,
  seed: 1,
};

/** Marks every node this core adds: the clones that continue the loop. The scoped rule that moves the real
 *  children skips anything carrying it, and the child observer ignores it too. */
const DATA_PICA = "data-pica";

/** The custom property lib/loop.ts writes each frame's scroll distance into. The scoped rule reads it to
 *  move the real children; the clones this core builds read the same property from their own inline style,
 *  since a core may style a node it created directly. */
const OFFSET_VAR = "--pica-marquee-x";

export const mount: Mount<MarqueeProps> = (host, initial = {}) => {
  let props: MarqueeProps = { ...defaults, ...initial };

  const sheet = scope(host);
  const restoreHost = styleHost(host, {
    display: "flex",
    "flex-wrap": "nowrap",
    "align-items": "center",
    overflow: "hidden",
    gap: `${props.gap}em`,
    [OFFSET_VAR]: "0px",
  });
  // The real children are never touched directly. This rule alone moves them, by reading the property the
  // loop writes on the host below.
  sheet.setRules(`${sheet.selector} > *:not([${DATA_PICA}]){flex:none;transform:translateX(var(${OFFSET_VAR},0px))}`);

  let hovered = false;
  let focused = false;
  /** Pixel width of one full cycle of the real children, gap to the next cycle included. Zero with no children. */
  let period = 0;
  let clones: HTMLElement[] = [];

  function isOwn(node: Node): boolean {
    return node instanceof HTMLElement && node.hasAttribute(DATA_PICA);
  }

  function realChildren(): HTMLElement[] {
    const out: HTMLElement[] = [];
    for (const child of Array.from(host.children)) {
      if (child instanceof HTMLElement && !child.hasAttribute(DATA_PICA)) out.push(child);
    }
    return out;
  }

  /** One inert copy of every real child, in one row of its own. Hidden and unreachable as a whole, through
   *  the single attribute HTML defines for exactly that. */
  function buildClone(children: readonly HTMLElement[]): HTMLElement {
    const group = document.createElement("div");
    group.setAttribute(DATA_PICA, "");
    group.setAttribute("aria-hidden", "true");
    group.setAttribute("inert", "");
    group.style.cssText = `display:flex;flex:none;gap:${props.gap}em;transform:translateX(var(${OFFSET_VAR},0px))`;
    for (const child of children) group.appendChild(child.cloneNode(true));
    return group;
  }

  function clearClones(): void {
    for (const clone of clones) clone.remove();
    clones = [];
  }

  /** Measures one cycle, then adds just enough clones on the side the content scrolls toward to cover the
   *  host with no gap at any point in the loop. Runs again whenever the real children, the gap, or the
   *  direction changes. */
  function rebuildClones(): void {
    clearClones();
    const children = realChildren();
    const first = children[0];
    if (!first) {
      period = 0;
      return;
    }
    const startLeft = first.getBoundingClientRect().left;
    const probe = buildClone(children);
    host.append(probe);
    period = Math.max(1, probe.getBoundingClientRect().left - startLeft);
    probe.remove();
    const needed = Math.max(1, Math.ceil(host.clientWidth / period));
    const built: HTMLElement[] = [];
    for (let i = 0; i < needed; i++) {
      const clone = buildClone(children);
      if (props.direction === "right") host.prepend(clone);
      else host.append(clone);
      built.push(clone);
    }
    clones = built;
  }

  rebuildClones();

  // Watches only the host's own child list, ignoring the clones it adds and removes here, so a page that
  // swaps the real children is picked up without a resize loop of its own doing.
  const childObserver = new MutationObserver((records) => {
    const changed = records.some(
      (record) => Array.from(record.addedNodes).some((node) => !isOwn(node)) || Array.from(record.removedNodes).some((node) => !isOwn(node)),
    );
    if (changed) rebuildClones();
  });
  childObserver.observe(host, { childList: true });

  function isPaused(): boolean {
    return props.paused || (props.pauseOnHover && hovered) || focused;
  }

  function draw(t: number): void {
    const wrapped = period > 0 ? ((t / 1000) * props.speed) % period : 0;
    const offset = props.direction === "left" ? -wrapped : wrapped;
    host.style.setProperty(OFFSET_VAR, `${offset.toFixed(2)}px`);
    host.dataset.picaReady = "true";
  }

  const loop = createLoop({
    el: host,
    fps: props.fps,
    paused: isPaused(),
    time: props.time,
    still: 0,
    frame: draw,
  });

  function onEnter(): void {
    hovered = true;
    loop.update({ paused: isPaused() });
  }
  function onLeave(): void {
    hovered = false;
    loop.update({ paused: isPaused() });
  }
  function onFocusIn(): void {
    focused = true;
    loop.update({ paused: isPaused() });
  }
  function onFocusOut(event: FocusEvent): void {
    focused = event.relatedTarget instanceof Node && host.contains(event.relatedTarget);
    loop.update({ paused: isPaused() });
  }
  host.addEventListener("mouseenter", onEnter);
  host.addEventListener("mouseleave", onLeave);
  host.addEventListener("focusin", onFocusIn);
  host.addEventListener("focusout", onFocusOut);

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.gap !== before.gap) host.style.setProperty("gap", `${props.gap}em`);
      if (props.gap !== before.gap || props.direction !== before.direction) rebuildClones();
      loop.update({ paused: isPaused(), time: props.time, fps: props.fps });
      loop.redraw();
    },
    destroy() {
      loop.destroy();
      host.removeEventListener("mouseenter", onEnter);
      host.removeEventListener("mouseleave", onLeave);
      host.removeEventListener("focusin", onFocusIn);
      host.removeEventListener("focusout", onFocusOut);
      childObserver.disconnect();
      clearClones();
      sheet.destroy();
      restoreHost();
      delete host.dataset.picaReady;
    },
  };
};
