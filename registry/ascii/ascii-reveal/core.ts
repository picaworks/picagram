import { hiddenText, labelHost, unlabelHost } from "../../../lib/a11y";
import { createLoop } from "../../../lib/loop";
import { createRng } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiRevealProps extends MotionProps {
  /** Text to reveal. Also the host's accessible label. */
  text: string;
  /** Milliseconds from the first frame to the last character locking onto its own glyph. */
  duration: number;
  /** Share of the duration spent spreading out when characters lock, from 0 (all lock together) to 1 (locks spread across nearly the whole duration). */
  stagger: number;
  /** Glyphs a character cycles through before it settles on its own character. */
  glyphs: string;
  /** Milliseconds to hold the settled text before it scrambles again. 0 never replays. */
  loop: number;
  /** CSS font family stack. Kept monospace so the revealed width never jitters. */
  fontFamily: string;
  /** Frames per second the scramble cycles through glyphs at. */
  fps: number;
}

export const defaults: AsciiRevealProps = {
  text: "Drawn on a monospace grid.",
  duration: 1600,
  stagger: 0.6,
  // The fallback ramp (STYLE.md) without its leading space, plus four glyphs of their own.
  glyphs: ".:-=+*#%@/\\|_",
  loop: 0,
  fontFamily: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace',
  fps: 20,
  paused: false,
  time: null,
  seed: 1,
};

const WHITESPACE = /\s/;

/** A glyph string as single characters, falling back to the default set when empty. */
function toGlyphs(source: string): string[] {
  return Array.from(source.length > 0 ? source : defaults.glyphs);
}

/** Mixes three integers into one 32 bit seed, so createRng draws an independent value per cell and frame. */
function mixSeed(seed: number, position: number, frame: number): number {
  let h = (seed ^ Math.imul(position + 1, 0x27d4eb2f) ^ Math.imul(frame + 1, 0x165667b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), h | 1);
  h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
  return (h ^ (h >>> 14)) >>> 0;
}

/** The glyph shown at `position` on scramble frame `frame`, drawn from `pool`. */
function scrambleGlyph(pool: readonly string[], seed: number, position: number, frame: number): string {
  if (pool.length === 0) return " ";
  const draw = createRng(mixSeed(seed, position, frame))();
  return pool[Math.min(pool.length - 1, Math.floor(draw * pool.length))] ?? " ";
}

export const mount: Mount<AsciiRevealProps> = (host, initial = {}) => {
  let props: AsciiRevealProps = { ...defaults, ...initial };
  let chars = Array.from(props.text);
  let glyphPool = toGlyphs(props.glyphs);
  let shown = "";

  const hidden = hiddenText(props.text);
  const visible = document.createElement("span");
  visible.setAttribute("aria-hidden", "true");
  visible.style.whiteSpace = "pre";
  visible.style.fontFamily = props.fontFamily;
  host.appendChild(hidden);
  host.appendChild(visible);

  /** The text at animation time `t`, in milliseconds. Spaces never scramble, and a time at or past
   *  the duration, including the Infinity used for the reduced motion still frame, shows the final text. */
  function revealAt(t: number): string {
    const n = chars.length;
    if (n === 0) return "";
    const cycle = props.duration + props.loop;
    const local = props.loop > 0 && Number.isFinite(t) ? t % cycle : t;
    if (!(local < props.duration)) return props.text;
    const frameIndex = Math.floor(local / (1000 / props.fps));
    const minScramble = (1 - props.stagger) * props.duration;
    const spread = props.stagger * props.duration;
    const span = Math.max(1, n - 1);
    let out = "";
    for (let i = 0; i < n; i++) {
      const ch = chars[i] ?? "";
      if (WHITESPACE.test(ch)) {
        out += ch;
        continue;
      }
      const lock = n <= 1 ? props.duration : minScramble + spread * (i / span);
      out += local < lock ? scrambleGlyph(glyphPool, props.seed, i, frameIndex) : ch;
    }
    return out;
  }

  function draw(t: number): void {
    const revealed = revealAt(t);
    if (revealed !== shown) {
      shown = revealed;
      visible.textContent = revealed;
    }
    if (host.dataset.picaReady !== "true") host.dataset.picaReady = "true";
  }

  labelHost(host, props.text, "text");
  const loop = createLoop({
    el: host,
    fps: props.fps,
    paused: props.paused,
    time: props.time,
    // Past any duration and loop combination, so reduced motion always lands on the final text.
    still: Infinity,
    frame: draw,
  });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.text !== before.text) {
        chars = Array.from(props.text);
        hidden.textContent = props.text;
        labelHost(host, props.text, "text");
      }
      if (props.glyphs !== before.glyphs) glyphPool = toGlyphs(props.glyphs);
      if (props.fontFamily !== before.fontFamily) visible.style.fontFamily = props.fontFamily;
      loop.update({ paused: props.paused, time: props.time, fps: props.fps });
    },
    destroy() {
      loop.destroy();
      unlabelHost(host);
      hidden.remove();
      visible.remove();
      delete host.dataset.picaReady;
    },
  };
};
