import { animatedText } from "../../../lib/a11y";
import { GRID_FONT } from "../../../lib/font";
import { createLoop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import { createRng, hashSeed } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiRevealProps extends MotionProps {
  /** Text to reveal. Assistive technology reads it whole, never the scramble. */
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
  fontFamily: GRID_FONT,
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

/** The glyph shown at `position` on scramble frame `frame`, drawn from `pool`. */
function scrambleGlyph(pool: readonly string[], seed: number, position: number, frame: number): string {
  if (pool.length === 0) return " ";
  const draw = createRng(hashSeed(seed, position, frame))();
  return pool[Math.min(pool.length - 1, Math.floor(draw * pool.length))] ?? " ";
}

export const mount: Mount<AsciiRevealProps> = (host, initial = {}) => {
  let props: AsciiRevealProps = { ...defaults, ...initial };
  let chars = Array.from(props.text);
  let glyphPool = toGlyphs(props.glyphs);
  let shown = "";

  // The host keeps no role, so a heading around it stays a heading. Assistive technology reads the final
  // text from a hidden copy, and the scramble draws into a layer hidden from it.
  const text = animatedText(host, props.text);
  const visible = text.layer;
  visible.style.whiteSpace = "pre";
  visible.style.fontFamily = props.fontFamily;
  visible.style.color = cssVar("fg");

  /** The text at animation time `t`, in milliseconds. Spaces never scramble, and a time at or past the
   *  duration shows the final text. */
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

  // Under reduced motion the loop holds at the duration, which is always the finished text.
  const loop = createLoop({
    el: host,
    fps: props.fps,
    paused: props.paused,
    time: props.time,
    still: props.duration,
    frame: draw,
  });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.text !== before.text) {
        chars = Array.from(props.text);
        text.setText(props.text);
      }
      if (props.glyphs !== before.glyphs) glyphPool = toGlyphs(props.glyphs);
      if (props.fontFamily !== before.fontFamily) visible.style.fontFamily = props.fontFamily;
      loop.update({ paused: props.paused, time: props.time, fps: props.fps, still: props.duration });
      loop.redraw();
    },
    destroy() {
      loop.destroy();
      text.remove();
      delete host.dataset.picaReady;
    },
  };
};
