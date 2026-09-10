"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · ASCII Terminal · ascii-terminal
// MIT + Commons Clause · https://github.com/rishabbalak/pica/blob/main/LICENSE.md
// Docs and credits: https://github.com/rishabbalak/pica

// lib/types.ts
/** The contract every Pica core implements. See docs/architecture/contract.md. */

/** A mounted component. */
interface PicaInstance<P> {
  /** Merge new prop values. The core decides what has to be rebuilt. */
  update(props: Partial<P>): void;
  /** Stop all work and remove everything the core added. Safe to call twice. */
  destroy(): void;
}

/** Mounts a core into a host element. Props are plain data: strings, numbers, booleans, null. */
type Mount<P> = (host: HTMLElement, props?: Partial<P>) => PicaInstance<P>;

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
/** Mounts a Pica core into the returned ref and forwards prop changes to it.
 *  Props are plain data by contract, so a JSON key is enough to detect a change. */
function usePica<P>(mount: Mount<P>, props: Partial<P>) {
  const ref = useRef<HTMLDivElement>(null);
  const instance = useRef<PicaInstance<P> | null>(null);
  const defined = definedProps(props);
  const latest = useRef(defined);
  latest.current = defined;
  const key = JSON.stringify(defined);

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

  return ref;
}

/** Drops undefined values, so an unset prop keeps the core's default. */
function definedProps<P>(props: Partial<P>): Partial<P> {
  const out: Partial<P> = {};
  for (const name in props) {
    const value = props[name];
    if (value !== undefined) out[name] = value;
  }
  return out;
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

// lib/loop.ts
/** The only place Pica schedules frames. Cores never call requestAnimationFrame themselves.
 *  A loop animates only while its element is on screen, the tab is visible, motion is allowed,
 *  it is not paused, and no fixed time is set. Otherwise it shows a single held frame. */

interface LoopState {
  /** Hold the current frame. */
  paused: boolean;
  /** Show exactly this animation time, in milliseconds, and do not animate. Null animates. */
  time: number | null;
  /** Frames per second ceiling. */
  fps: number;
}

interface LoopOptions extends LoopState {
  /** Element whose visibility on screen gates the loop. */
  el: Element;
  /** Draws the frame for animation time `t`, in milliseconds. */
  frame: (t: number) => void;
  /** The frame shown under prefers-reduced-motion, in milliseconds of animation time. */
  still: number;
}

interface Loop {
  update(state: Partial<LoopState>): void;
  /** Draws the current frame again, for example after a resize. */
  redraw(): void;
  destroy(): void;
}

/** A gap longer than this, such as a tab switch, advances the animation by this much at most. */
const MAX_STEP_MS = 100;

function createLoop(options: LoopOptions): Loop {
  const { el, frame, still } = options;
  let state: LoopState = { paused: options.paused, time: options.time, fps: options.fps };
  let t = 0;
  let last = 0;
  let raf = 0;
  let onScreen = true;
  let tabVisible = typeof document === "undefined" || document.visibilityState !== "hidden";
  const motionQuery = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  let reduced = motionQuery?.matches ?? false;

  const animating = (): boolean =>
    !state.paused && state.time === null && !reduced && onScreen && tabVisible;
  const heldTime = (): number => (state.time !== null ? state.time : reduced ? still : t);

  function tick(now: number): void {
    raf = 0;
    if (!animating()) return;
    if (last === 0) last = now;
    const elapsed = now - last;
    // One millisecond of tolerance so a 60 Hz display lands evenly on a 30 fps ceiling.
    if (elapsed >= 1000 / Math.max(1, state.fps) - 1) {
      t += Math.min(elapsed, MAX_STEP_MS);
      last = now;
      frame(t);
    }
    raf = requestAnimationFrame(tick);
  }

  function sync(drawHeld: boolean): void {
    const go = animating();
    if (go && raf === 0) {
      last = 0;
      raf = requestAnimationFrame(tick);
    } else if (!go && raf !== 0) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    if (!go && drawHeld) frame(heldTime());
  }

  const observer = typeof IntersectionObserver === "function"
    ? new IntersectionObserver((entries) => {
        const entry = entries[entries.length - 1];
        onScreen = entry ? entry.isIntersecting : true;
        sync(false);
      })
    : null;
  observer?.observe(el);

  const onVisibility = (): void => {
    tabVisible = document.visibilityState !== "hidden";
    sync(false);
  };
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisibility);

  const onMotion = (): void => {
    reduced = motionQuery?.matches ?? false;
    sync(true);
  };
  motionQuery?.addEventListener("change", onMotion);

  frame(heldTime());
  sync(false);

  return {
    update(next) {
      const timeChanged = next.time !== undefined && next.time !== state.time;
      state = { ...state, ...next };
      if (state.time !== null) t = state.time;
      sync(timeChanged || next.paused !== undefined);
    },
    redraw() {
      frame(heldTime());
    },
    destroy() {
      if (raf !== 0) cancelAnimationFrame(raf);
      raf = 0;
      observer?.disconnect();
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisibility);
      motionQuery?.removeEventListener("change", onMotion);
    },
  };
}

// lib/rng.ts
/** Seeded pseudo-random numbers in [0, 1), mulberry32. The same seed gives the same sequence,
 *  which is what makes every capture reproducible. */
function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// registry/text-mode/ascii-terminal/core.ts
export interface AsciiTerminalProps extends MotionProps {
  /** The full transcript. A line starting with the prompt character and a space is typed as a command, and every other line is shown as output. */
  script: string;
  /** The character shown before each typed command. */
  prompt: string;
  /** Typing speed for commands, in characters per second. */
  typeSpeed: number;
  /** Delay after a line finishes before the next line appears, in milliseconds. */
  lineDelay: number;
  /** Milliseconds to wait after the transcript ends before it types itself again. 0 does not replay. */
  loop: number;
  /** CSS font-family stack for the transcript. Must be monospace. Size and color are inherited from the host. */
  fontFamily: string;
  /** Frames per second ceiling for the typing animation. */
  fps: number;
}

export const defaults: AsciiTerminalProps = {
  script: "$ npx shadcn add pica/ascii-image\nresolving ascii-image\nwrote components/ascii-image.tsx\n$ ",
  prompt: "$",
  typeSpeed: 14,
  lineDelay: 320,
  loop: 0,
  fontFamily: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace',
  fps: 30,
  paused: false,
  time: null,
  seed: 1,
};

/** One line of the transcript, parsed from `script`. */
interface ParsedLine {
  isCommand: boolean;
  /** The prompt and the space after it, or empty for an output line. */
  prefix: string;
  /** The command text for a command line, or the whole line for output. */
  text: string;
}

/** A parsed line plus the schedule that reveals it. */
interface Line extends ParsedLine {
  /** Absolute ms at which each character of `text` is revealed. Empty for an output line. */
  charAt: number[];
  /** Absolute ms at which the line starts appearing. */
  appearAt: number;
  /** Absolute ms at which the line is fully visible. */
  doneAt: number;
}

interface Timeline {
  lines: Line[];
  /** Absolute ms at which the whole transcript is fully visible. */
  total: number;
}

/** The resting and typing cursor glyph. */
const CURSOR_GLYPH = "█";
/** Milliseconds per on or off half of the typing blink. */
const BLINK_MS = 500;
/** Typing cadence jitter: each character's interval is the base interval times a factor in this range. */
const JITTER_MIN = 0.55;
const JITTER_SPREAD = 0.9;

function parseLines(script: string, prompt: string): ParsedLine[] {
  const marker = `${prompt} `;
  return script.split("\n").map((line) => {
    if (line.startsWith(marker)) return { isCommand: true, prefix: marker, text: line.slice(marker.length) };
    return { isCommand: false, prefix: "", text: line };
  });
}

/** Builds the reveal schedule once per (script, prompt, typeSpeed, lineDelay, seed), so a frame is a lookup. */
function buildTimeline(script: string, prompt: string, typeSpeed: number, lineDelay: number, seed: number): Timeline {
  const rng = createRng(seed);
  const perChar = 1000 / Math.max(1, typeSpeed);
  const delay = Math.max(0, lineDelay);
  const lines: Line[] = [];
  let at = 0;
  for (const seg of parseLines(script, prompt)) {
    const appearAt = at;
    const charAt: number[] = [];
    if (seg.isCommand) {
      let t = appearAt;
      for (let c = 0; c < seg.text.length; c++) {
        t += perChar * (JITTER_MIN + rng() * JITTER_SPREAD);
        charAt.push(t);
      }
    }
    const doneAt = charAt[charAt.length - 1] ?? appearAt;
    lines.push({ ...seg, charAt, appearAt, doneAt });
    at = doneAt + delay;
  }
  const last = lines[lines.length - 1];
  return { lines, total: last ? last.doneAt : 0 };
}

/** Folds a raw animation time into the timeline: clamped when `loop` is 0, wrapped to a resting frame otherwise.
 *  A non-finite time (the reduced-motion still frame) always resolves to the finished transcript. */
function resolveTime(raw: number, total: number, loop: number): number {
  if (!Number.isFinite(raw)) return total;
  const t = Math.max(0, raw);
  if (loop <= 0) return Math.min(t, total);
  const cycle = total + loop;
  return cycle > 0 ? Math.min(t % cycle, total) : 0;
}

function blinkOn(t: number): boolean {
  return Math.floor(t / BLINK_MS) % 2 === 0;
}

export const mount: Mount<AsciiTerminalProps> = (host, initial = {}) => {
  let props: AsciiTerminalProps = { ...defaults, ...initial };
  let timeline = buildTimeline(props.script, props.prompt, props.typeSpeed, props.lineDelay, props.seed);

  host.style.overflow = "hidden";

  const view = document.createElement("pre");
  view.setAttribute("aria-hidden", "true");
  view.style.cssText = [
    "margin:0", "padding:1em", "white-space:pre-wrap", "overflow-wrap:break-word",
    "font-kerning:none", "font-variant-ligatures:none", "user-select:none", "pointer-events:none",
  ].join(";");
  view.style.fontFamily = props.fontFamily;
  host.appendChild(view);

  let hidden = hiddenText(props.script);
  host.appendChild(hidden);

  function render(t: number): void {
    const lines = timeline.lines;
    let activeIdx = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line && line.appearAt <= t) activeIdx = i;
      else break;
    }
    view.textContent = "";
    for (let i = 0; i <= activeIdx; i++) {
      const line = lines[i];
      if (!line) continue;
      if (i > 0) view.appendChild(document.createTextNode("\n"));
      if (line.prefix) {
        const prefixEl = document.createElement("span");
        prefixEl.style.color = "var(--pica-accent)";
        prefixEl.textContent = line.prefix;
        view.appendChild(prefixEl);
      }
      const isActive = i === activeIdx;
      let shown = line.text.length;
      if (isActive && line.isCommand) {
        shown = 0;
        while (shown < line.charAt.length && (line.charAt[shown] ?? Infinity) <= t) shown++;
      }
      view.appendChild(document.createTextNode(line.text.slice(0, shown)));
      if (isActive && line.isCommand) {
        const typing = shown < line.text.length;
        const cursorEl = document.createElement("span");
        cursorEl.style.color = "var(--pica-accent)";
        cursorEl.textContent = !typing || blinkOn(t) ? CURSOR_GLYPH : " ";
        view.appendChild(cursorEl);
      }
    }
  }

  function frame(t: number): void {
    render(resolveTime(t, timeline.total, props.loop));
    host.dataset.picaReady = "true";
  }

  labelHost(host, "Terminal transcript", "group");
  const motion = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: Infinity, frame });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      const timingChanged =
        props.script !== before.script ||
        props.prompt !== before.prompt ||
        props.typeSpeed !== before.typeSpeed ||
        props.lineDelay !== before.lineDelay ||
        props.seed !== before.seed;
      if (timingChanged) timeline = buildTimeline(props.script, props.prompt, props.typeSpeed, props.lineDelay, props.seed);
      if (props.script !== before.script) {
        hidden.remove();
        hidden = hiddenText(props.script);
        host.appendChild(hidden);
      }
      if (props.fontFamily !== before.fontFamily) view.style.fontFamily = props.fontFamily;
      motion.update({ paused: props.paused, time: props.time, fps: props.fps });
    },
    destroy() {
      motion.destroy();
      unlabelHost(host);
      view.remove();
      hidden.remove();
      host.style.removeProperty("overflow");
      delete host.dataset.picaReady;
    },
  };
};

// registry/text-mode/ascii-terminal/index.tsx
export interface AsciiTerminalComponentProps extends Partial<AsciiTerminalProps> {
  className?: string;
  style?: CSSProperties;
}

/** A terminal transcript that types its command, prints its output, and rests on a blinking cursor. */
export function AsciiTerminal({ className, style, ...props }: AsciiTerminalComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }} />;
}
