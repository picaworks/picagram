import { hiddenText, labelHost, unlabelHost } from "../../../lib/a11y";
import { createLoop } from "../../../lib/loop";
import { createRng } from "../../../lib/rng";
import { FALLBACK_RAMP, measureRamp } from "../../../lib/ramp";
import type { Mount, MotionProps } from "../../../lib/types";

export interface GlitchTextProps extends MotionProps {
  /** The text to show. Always available to assistive technology, even while the visible layer glitches. */
  text: string;
  /** Milliseconds from the start of one burst to the start of the next. */
  interval: number;
  /** How long each burst lasts, in milliseconds. */
  burst: number;
  /** How strongly a burst distorts the text: 0 never glitches, 1 shifts strips furthest and swaps the most characters. */
  intensity: number;
  /** Glyphs a character may swap to during a burst, in any order: they are sorted by the ink each one puts down in the font. */
  glyphs: string;
  /** CSS font-family stack. Must be monospace, so the sliced strips line up. Size and color are inherited from the host. */
  fontFamily: string;
  /** Frames per second ceiling for the glitch animation. */
  fps: number;
}

export const defaults: GlitchTextProps = {
  text: "SIGNAL LOST",
  interval: 2500,
  burst: 280,
  intensity: 0.5,
  glyphs: FALLBACK_RAMP,
  fontFamily: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace',
  fps: 30,
  paused: false,
  time: null,
  seed: 1,
};

/** Horizontal strips the line is cut into during a burst. */
const SLICE_COUNT = 4;
/** Largest sideways shift a strip takes, in character widths, at intensity 1. */
const MAX_SHIFT_CH = 1.2;
/** Largest chance any one character swaps to a ramp glyph, at intensity 1. */
const MAX_SWAP_CHANCE = 0.35;

/** Which burst, if any, a moment in time falls inside. */
interface BurstWindow {
  active: boolean;
  /** Counts bursts from the first. Meaningful only when active. */
  index: number;
}

/** The glitched text and each strip's sideways shift for one burst. */
interface Burst {
  /** Same length as the source text, with a few characters swapped for ramp glyphs. */
  text: string;
  /** One sideways shift per strip, in character widths, in drawing order. */
  shifts: number[];
}

/** Where `t` falls in the repeating schedule. The first burst starts two fifths of the way through the
 *  first interval, so the component holds still for a beat before it ever glitches; every later burst
 *  follows exactly `interval` ms after the one before. A pure function of `t`, `interval`, and `burst`. */
function burstAt(t: number, interval: number, burst: number): BurstWindow {
  const period = Math.max(1, interval);
  const duration = Math.min(Math.max(0, burst), period);
  const phase = period * 0.4;
  const shifted = t - phase;
  const index = Math.floor(shifted / period);
  const local = shifted - index * period;
  return { active: duration > 0 && local < duration, index };
}

/** Combines the seed with a burst index into one 32-bit seed for createRng, so every burst gets its own
 *  reproducible pattern and no two bursts glitch the same way. */
function burstSeed(seed: number, index: number): number {
  const mixed = Math.imul((seed >>> 0) ^ (index + 0x9e3779b9), 0x85ebca6b);
  return (mixed ^ (mixed >>> 13)) >>> 0;
}

/** Builds burst `index`: a pure function of the seed, the index, and the props that shape a burst, so the
 *  same burst always draws the same pixels. */
function buildBurst(props: GlitchTextProps, index: number): Burst {
  const rng = createRng(burstSeed(props.seed, index));
  const ramp = measureRamp(props.glyphs, props.fontFamily);
  const swapChance = MAX_SWAP_CHANCE * props.intensity;
  const text = Array.from(props.text)
    .map((ch) => {
      if (rng() >= swapChance) return ch;
      const at = Math.min(ramp.glyphs.length - 1, Math.floor(rng() * ramp.glyphs.length));
      return ramp.glyphs[at] ?? ch;
    })
    .join("");
  const shifts = Array.from({ length: SLICE_COUNT }, () => (rng() * 2 - 1) * MAX_SHIFT_CH * props.intensity);
  return { text, shifts };
}

export const mount: Mount<GlitchTextProps> = (host, initial = {}) => {
  let props: GlitchTextProps = { ...defaults, ...initial };

  const view = document.createElement("span");
  view.setAttribute("aria-hidden", "true");
  view.style.position = "relative";
  view.style.display = "inline-block";
  view.style.whiteSpace = "pre";
  view.style.userSelect = "none";
  view.style.pointerEvents = "none";
  view.style.fontFamily = props.fontFamily;
  host.appendChild(view);

  let hidden = hiddenText(props.text);
  host.appendChild(hidden);

  function draw(t: number): void {
    const slot = burstAt(t, props.interval, props.burst);
    view.textContent = "";
    if (slot.active) {
      const glitch = buildBurst(props, slot.index);
      for (let i = 0; i < SLICE_COUNT; i++) {
        const strip = document.createElement("span");
        strip.style.display = "inline-block";
        strip.style.whiteSpace = "pre";
        if (i > 0) {
          strip.style.position = "absolute";
          strip.style.left = "0";
          strip.style.top = "0";
        }
        strip.style.clipPath = `inset(${(i / SLICE_COUNT) * 100}% 0 ${((SLICE_COUNT - i - 1) / SLICE_COUNT) * 100}% 0)`;
        strip.style.transform = `translateX(${(glitch.shifts[i] ?? 0).toFixed(3)}ch)`;
        strip.textContent = glitch.text;
        view.appendChild(strip);
      }
    } else {
      view.textContent = props.text;
    }
    host.dataset.picaReady = "true";
  }

  labelHost(host, props.text);
  const motion = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: 0, frame: draw });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.text !== before.text) {
        hidden.remove();
        hidden = hiddenText(props.text);
        host.appendChild(hidden);
      }
      labelHost(host, props.text);
      if (props.fontFamily !== before.fontFamily) view.style.fontFamily = props.fontFamily;
      motion.update({ paused: props.paused, time: props.time, fps: props.fps });
    },
    destroy() {
      motion.destroy();
      unlabelHost(host);
      view.remove();
      hidden.remove();
      delete host.dataset.picaReady;
    },
  };
};
