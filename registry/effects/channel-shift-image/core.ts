import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { hostTone, parseColor } from "../../../lib/color";
import { watchPalette } from "../../../lib/palette";
import { inkPixels } from "../../../lib/pixels";
import { createSampler } from "../../../lib/sample";
import { fitFor, fitHostAspect, loadSource, showNote, type Source } from "../../../lib/source";
import type { Mount } from "../../../lib/types";

export interface ChannelShiftImageProps {
  /** Image URL or data URI. Empty draws a built-in lit sphere, so the component renders with no network. */
  src: string;
  /** Text alternative. Empty marks the image decorative and hides it from assistive technology. */
  alt: string;
  /** "cover" fills the host and crops; "contain" fits the whole image. */
  fit: "cover" | "contain";
  /** "auto" reads the host's colors. "light-on-dark" inks the bright pixels; "dark-on-light" inks the dark ones. */
  tone: "auto" | "light-on-dark" | "dark-on-light";
  /** Contrast around mid grey. 1 leaves the image as it is. */
  contrast: number;
  /** How far the light layer slides from the dark one, in CSS pixels. */
  offset: number;
  /** Degrees clockwise from horizontal that the light layer slides in: 0 moves it right, 90 moves it down. */
  angle: number;
  /** The ink value that splits the dark layer from the light one, 0 to 1. */
  split: number;
  /** Draws the light layer in --pica-accent. Off draws both layers in the host's ink color, at two opacities. */
  accent: boolean;
  /** How the layers land where they overlap: "darken" lets their ink accumulate into a third, darker area; "over" lets the light layer simply cover the dark one. */
  overlap: "darken" | "over";
}

export const defaults: ChannelShiftImageProps = {
  src: "",
  alt: "",
  fit: "cover",
  tone: "auto",
  contrast: 1.1,
  offset: 8,
  angle: 0,
  split: 0.5,
  accent: true,
  overlap: "darken",
};

/** The light layer's share of the ink color's own alpha when accent is off, so two passes in one color still
 *  read as two layers rather than one flat shape. */
const GHOST_MIX = 0.55;

/** How much darker the overlap reads than a plain average of the two layers, so two colors that are each
 *  already close to the ground, such as this component's own ink and paper defaults, still accumulate into
 *  a third tone instead of quietly matching one of the layers already on screen. */
const OVERLAP_DARKEN = 0.7;

/** A color with its own alpha scaled by `factor`, for the light layer's second opacity. */
function fadeColor(color: readonly [number, number, number, number], factor: number): readonly [number, number, number, number] {
  return [color[0], color[1], color[2], Math.round(color[3] * factor)];
}

/** Where two inks land on the same pixel, a third tone partway between them and darker still, the way a
 *  second pass of ink over a first deepens the paper under it. Never simply the darker of the two colors,
 *  which two colors this close to the ground would otherwise make indistinguishable from one layer alone. */
function darkenBlend(a: readonly [number, number, number, number], b: readonly [number, number, number, number]): readonly [number, number, number, number] {
  const red = Math.round(((a[0] + b[0]) / 2) * OVERLAP_DARKEN);
  const green = Math.round(((a[1] + b[1]) / 2) * OVERLAP_DARKEN);
  const blue = Math.round(((a[2] + b[2]) / 2) * OVERLAP_DARKEN);
  return [red, green, blue, Math.max(a[3], b[3])];
}

/** `top` alpha-composited over `under`, so a light layer left at reduced opacity by accent still shows the
 *  dark layer mixing through it where "over" lets the two meet, instead of the page's own ground. */
function compositeOver(top: readonly [number, number, number, number], under: readonly [number, number, number, number]): readonly [number, number, number, number] {
  const topA = top[3] / 255;
  const underA = under[3] / 255;
  const outA = topA + underA * (1 - topA);
  if (outA <= 0) return [0, 0, 0, 0];
  const red = Math.round((top[0] * topA + under[0] * underA * (1 - topA)) / outA);
  const green = Math.round((top[1] * topA + under[1] * underA * (1 - topA)) / outA);
  const blue = Math.round((top[2] * topA + under[2] * underA * (1 - topA)) / outA);
  return [red, green, blue, Math.round(outA * 255)];
}

/** Splits ink into two flat masks at `split`: 1 where a pixel belongs to that layer, 0 elsewhere. A pixel the
 *  source never painted, such as the ground around the built-in sphere, joins neither mask, so the two
 *  layers never spill onto the page's own ground. Neither mask carries a gradient: each layer posterizes to
 *  one hard-edged tone, with no screen and no grain. */
function splitLayers(ink: Float32Array, coverage: Float32Array, split: number): { dark: Uint8Array; light: Uint8Array } {
  const dark = new Uint8Array(ink.length);
  const light = new Uint8Array(ink.length);
  for (let i = 0; i < ink.length; i++) {
    if ((coverage[i] ?? 0) < 0.5) continue;
    if ((ink[i] ?? 0) >= split) dark[i] = 1;
    else light[i] = 1;
  }
  return { dark, light };
}

export const mount: Mount<ChannelShiftImageProps> = (host, initial = {}) => {
  let props: ChannelShiftImageProps = { ...defaults, ...initial };
  let source: Source | null = null;
  let failed = false;
  let cancel = (): void => undefined;
  let undoAspect = (): void => undefined;
  let removeNote: (() => void) | null = null;
  const sampler = createSampler();
  // Native pixel resolution, capped, so the posterized edges stay crisp rather than a blurred upscale.
  const surface = createCanvas(host, { onResize: () => draw() });
  const canvas = surface.canvas;
  const ctx = canvas.getContext("2d");
  const palette = watchPalette(host, () => draw());

  function load(): void {
    cancel();
    failed = false;
    cancel = loadSource(props.src, use, () => {
      source = null;
      failed = true;
      draw();
    });
  }

  function use(next: Source): void {
    source = next;
    // A host with no height of its own takes the image's proportions.
    undoAspect();
    undoAspect = fitHostAspect(host, next.width, next.height);
    draw();
  }

  function setNote(on: boolean): void {
    if (on && !removeNote) removeNote = showNote(host, "image unavailable");
    if (!on && removeNote) {
      removeNote();
      removeNote = null;
    }
  }

  function draw(): void {
    const cols = surface.width;
    const rows = surface.height;
    setNote(failed);
    if (ctx && source && !failed) {
      const shared = { cols, rows, aspect: 1, n: 1, fit: fitFor(source, props.fit), contrast: props.contrast, mirror: false };
      // Two passes, one per tone convention, whose ink always sums to the source's own coverage: alpha times
      // linear plus alpha times one minus linear is alpha, whatever linear is. That sum is how a pixel the
      // source never painted, such as the ground around the built-in sphere, is told apart from a real pixel
      // that simply carries little ink, which neither ink value alone can tell apart.
      const inkLight = sampler.sample(source.image, source.width, source.height, host, { ...shared, tone: "light-on-dark" }).slice();
      const inkDark = sampler.sample(source.image, source.width, source.height, host, { ...shared, tone: "dark-on-light" });
      const resolvedTone = props.tone === "auto" ? hostTone(host) : props.tone;
      const coverage = new Float32Array(inkLight.length);
      const ink = new Float32Array(inkLight.length);
      for (let i = 0; i < ink.length; i++) {
        const a = (inkLight[i] ?? 0) + (inkDark[i] ?? 0);
        coverage[i] = a;
        // The sampler linearizes brightness for compositing, which crowds a mid split near one extreme
        // instead of the middle of the visible range; undoing that here with the same curve it used is what
        // makes split fall where the picture actually looks half dark and half light.
        const luma = a > 0 ? ((inkLight[i] ?? 0) / a) ** (1 / 2.2) : 0;
        ink[i] = resolvedTone === "light-on-dark" ? luma : 1 - luma;
      }
      const darkColor = parseColor(palette.colors.fg);
      const lightColor = props.accent ? parseColor(palette.colors.accent) : fadeColor(darkColor, GHOST_MIX);
      const blendColor = darkenBlend(darkColor, lightColor);
      const { dark, light } = splitLayers(ink, coverage, props.split);
      // Registration failing along one direction by the same amount everywhere: a pure, unwarped slide of
      // the whole light layer, rounded to a whole device pixel so the edge it leaves is exactly as hard as
      // the one it came from.
      const radians = (props.angle * Math.PI) / 180;
      const dx = Math.round(Math.cos(radians) * props.offset * surface.dpr);
      const dy = Math.round(Math.sin(radians) * props.offset * surface.dpr);
      // The dark layer sits where the source put it. lib/pixels.ts has nothing for a second, offset layer
      // that has to choose between two colors of its own where it lands on the first, so that part is
      // written here: the light layer is read from its own, unshifted mask at the position the shift came
      // from, and only overlap decides whether it covers the dark layer or accumulates onto it.
      const image = inkPixels(dark, cols, rows, darkColor);
      const data = image.data;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const sx = x - dx;
          const sy = y - dy;
          if (sx < 0 || sx >= cols || sy < 0 || sy >= rows) continue;
          if (!light[sy * cols + sx]) continue;
          const i = y * cols + x;
          const overlapping = dark[i] === 1;
          const color = overlapping ? (props.overlap === "darken" ? blendColor : compositeOver(lightColor, darkColor)) : lightColor;
          const j = i * 4;
          data[j] = color[0];
          data[j + 1] = color[1];
          data[j + 2] = color[2];
          data[j + 3] = color[3];
        }
      }
      ctx.putImageData(image, 0, 0);
    } else if (ctx) {
      ctx.clearRect(0, 0, cols, rows);
    }
    if (source || failed) host.dataset.picaReady = "true";
  }

  labelHost(host, props.alt);
  load();

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      palette.refresh();
      labelHost(host, props.alt);
      if (props.src !== before.src) load();
      else draw();
    },
    destroy() {
      cancel();
      setNote(false);
      surface.destroy();
      undoAspect();
      palette.destroy();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};
