import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createLoop, type LoopState } from "../../../lib/loop";
import { createRng } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

export interface GrainOverlayProps extends MotionProps {
  /** Spatial frequency of the turbulence noise. Lower values draw coarser flecks, higher values draw finer grain. */
  frequency: number;
  /** How strongly the grain shows over the content beneath it. */
  opacity: number;
  /** Width and height of the noise tile, in pixels, before it repeats. */
  size: number;
  /** CSS blend mode the grain composites with the content beneath it. */
  blend: "overlay" | "soft-light" | "normal";
  /** Shifts the tile a few pixels several times a second, so the grain lives instead of sitting fixed. */
  jitter: boolean;
  /** Frames per second the jitter steps at. */
  fps: number;
}

export const defaults: GrainOverlayProps = {
  frequency: 0.8,
  opacity: 0.12,
  size: 160,
  blend: "overlay",
  jitter: true,
  fps: 10,
  paused: false,
  time: null,
  seed: 1,
};

/** The animation time held under reduced motion. Captures use the same value, so the default capture
 *  and the reduced-motion frame always agree. */
const STILL_TIME = 1200;

/** Turbulence octaves baked into the tile. Fixed, because one well-tuned grain reads better than a prop for it. */
const OCTAVES = 3;

/** Contrast the raw turbulence is stretched by before it is used. Fractal noise settles close to a flat
 *  mid gray on its own; this pushes it back out toward black and white so individual flecks read as
 *  grain instead of haze. */
const CONTRAST_SLOPE = 3;
const CONTRAST_INTERCEPT = -1;

/** How far a jitter step shifts the tile from rest, in pixels, along each axis. */
const SHIFT_PX = 6;

/** Counts instances so every host gets a class name of its own, even with several copies on one page. */
let instances = 0;

/** Mixes a seed and a step index into one 32-bit value, so the jitter offset at any step is a pure
 *  function of the seed and the animation time, never of how many steps came before it. */
function stepSeed(seed: number, step: number): number {
  return (Math.imul(Math.round(seed), 0x9e3779b1) + step) >>> 0;
}

/** The pixel offset one jitter step draws the tile at: two independent draws of the same generator. */
function jitterOffset(seed: number, step: number): [number, number] {
  const rng = createRng(stepSeed(seed, step));
  return [Math.round((rng() * 2 - 1) * SHIFT_PX), Math.round((rng() * 2 - 1) * SHIFT_PX)];
}

/** The data URI for one seamless, opaque, grayscale turbulence tile. Built once per seed, frequency, or
 *  size change, never fetched, so the component draws with no network. The color matrix averages the
 *  turbulence's own red, green, and blue channels into one gray value, so the grain carries no hue, and
 *  the transfer function stretches that gray value's contrast before it reaches the page. */
function noiseTile(seed: number, frequency: number, size: number): string {
  const curve = `type="linear" slope="${CONTRAST_SLOPE}" intercept="${CONTRAST_INTERCEPT}"`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<filter id="g" x="0" y="0" width="100%" height="100%">` +
    `<feTurbulence type="fractalNoise" baseFrequency="${frequency}" numOctaves="${OCTAVES}" seed="${Math.round(seed)}" stitchTiles="stitch"/>` +
    `<feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 0 1"/>` +
    `<feComponentTransfer><feFuncR ${curve}/><feFuncG ${curve}/><feFuncB ${curve}/></feComponentTransfer>` +
    `</filter>` +
    `<rect width="100%" height="100%" filter="url(#g)"/>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** The scoped rule for one instance's grain layer: the tile as a repeating background, composited with
 *  `blend` at `opacity`. Jitter moves the tile through `backgroundPosition` directly, not through here. */
function sheet(className: string, p: GrainOverlayProps): string {
  const rules = [
    "position:absolute",
    "inset:0",
    "pointer-events:none",
    `background-image:url("${noiseTile(p.seed, p.frequency, p.size)}")`,
    "background-repeat:repeat",
    `background-size:${p.size}px ${p.size}px`,
    `mix-blend-mode:${p.blend}`,
    `opacity:${p.opacity}`,
  ];
  return `.${className}{${rules.join(";")}}`;
}

/** Whether the loop should actually tick. Turning jitter off holds the frame exactly like pausing does. */
function shouldAnimate(p: GrainOverlayProps): boolean {
  return !p.paused && p.jitter;
}

export const mount: Mount<GrainOverlayProps> = (host, initial = {}) => {
  let props: GrainOverlayProps = { ...defaults, ...initial };
  const className = `pica-grain-overlay-${++instances}`;
  const reposition = getComputedStyle(host).position === "static";
  const style = document.createElement("style");
  const layer = document.createElement("div");
  layer.className = className;
  layer.setAttribute("aria-hidden", "true");

  function frame(t: number): void {
    if (props.jitter) {
      const step = Math.floor(t / (1000 / Math.max(1, props.fps)));
      const [dx, dy] = jitterOffset(props.seed, step);
      layer.style.backgroundPosition = `${dx}px ${dy}px`;
    } else {
      layer.style.backgroundPosition = "0px 0px";
    }
    host.dataset.picaReady = "true";
  }

  labelHost(host, "");
  if (reposition) host.style.position = "relative";
  // Keeps the blend mode composited only against this host's own content, not the rest of the page.
  host.style.isolation = "isolate";
  style.textContent = sheet(className, props);
  host.appendChild(style);
  host.appendChild(layer);
  const loop = createLoop({ el: host, fps: props.fps, paused: !shouldAnimate(props), time: props.time, still: STILL_TIME, frame });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (
        props.seed !== before.seed ||
        props.frequency !== before.frequency ||
        props.size !== before.size ||
        props.opacity !== before.opacity ||
        props.blend !== before.blend
      ) {
        style.textContent = sheet(className, props);
      }
      const motion: Partial<LoopState> = {};
      if (shouldAnimate(props) !== shouldAnimate(before)) motion.paused = !shouldAnimate(props);
      if (props.time !== before.time) motion.time = props.time;
      if (props.fps !== before.fps) motion.fps = props.fps;
      if (Object.keys(motion).length > 0) loop.update(motion);
      else if (props.jitter !== before.jitter || props.seed !== before.seed) loop.redraw();
    },
    destroy() {
      loop.destroy();
      style.remove();
      layer.remove();
      unlabelHost(host);
      if (reposition) host.style.removeProperty("position");
      host.style.removeProperty("isolation");
      delete host.dataset.picaReady;
    },
  };
};
