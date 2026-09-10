import { hiddenText, labelHost, unlabelHost } from "../../../lib/a11y";
import { createLoop } from "../../../lib/loop";
import { createRng } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

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
