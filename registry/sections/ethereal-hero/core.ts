import { createCanvas } from "../../../lib/canvas";
import { parseColor } from "../../../lib/color";
import { blueNoiseMatrix, maskAt } from "../../../lib/dither-mask";
import { layer, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { createLoop } from "../../../lib/loop";
import { createNoise } from "../../../lib/noise";
import { cssOn, cssVar, watchPalette } from "../../../lib/palette";
import { createRng } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

/** One call to action: a link's visible text and destination. */
export interface EtherealHeroAction {
  /** Text on the link. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface EtherealHeroProps extends MotionProps {
  /** The one idea, drawn as a large heading after anything the page wraps. Empty draws none. */
  headline: string;
  /** Support under the headline, drawn in the muted color. Empty draws none. */
  subhead: string;
  /** Calls to action, drawn as links. At most three: the first solid, the rest outline. */
  actions: readonly EtherealHeroAction[];
  /** Horizontal alignment of the content column within the host. */
  align: "start" | "center";
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
  /** Share of cells carrying grain at the bottom edge, thinning to nothing at the horizon. */
  density: number;
  /** How far down the frame the grain begins, as a share of its height. Above it is clear ground. */
  horizon: number;
  /** Cells per second the grain climbs. */
  rise: number;
  /** Cells the field wanders sideways as it climbs. */
  sway: number;
  /** CSS pixels each grain cell covers before the canvas is scaled up. */
  pixel: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: EtherealHeroProps = {
  headline: "Atmosphere without haze.",
  subhead: "Depth drawn as grain: blue noise that rises and thins until it reads as air.",
  actions: [
    { label: "Enter", href: "#" },
    { label: "How it works", href: "#" },
  ],
  align: "center",
  minHeight: 80,
  density: 0.12,
  horizon: 0.45,
  rise: 6,
  sway: 4,
  pixel: 2,
  fps: 15,
  paused: false,
  time: null,
  seed: 1,
};

/** Animation time reduced motion holds, and what captures use, in milliseconds. */
const STILL_TIME = 1200;
/** Cell count of the blue noise mask, from lib/dither-mask.ts. Blue noise carries no low frequency energy,
 *  so the grain reads as air where an ordered screen would read as a print pattern. */
const BLUE_SIZE = 32;
/** Grain a cell shows even in the clearest air, so the top of the frame is never sterile. */
const AMBIENT = 0.0015;
/** Exponent on the falloff from the horizon to the bottom edge: the ramp waits, then thickens fast. */
const DENSITY_CURVE = 2.1;
/** Bands the falloff is quantized into. A smooth ramp reads as haze; a few discrete tones read as screened
 *  steps, which is how a screen says depth without any softening. */
const TONE_STEPS = 4;
/** Cells between features in the density field. Broad, so the grain gathers into weather, not speckle. */
const CLUMP_SPAN = 48;
/** Gain on the raw simplex value before it is centered, since it rarely reaches its own extremes. */
const CLUMP_GAIN = 1.4;
/** The clump factor's floor and span, applied to the ramp: the ground stays grainy but uneven. */
const CLUMP_BASE = 0.35;
const CLUMP_RANGE = 0.75;
/** Cells of phase difference between columns in the climb, so the field rises unevenly, not as one sheet. */
const BEND_CELLS = 5;
/** Sine cycles of that phase across the frame's width. */
const BEND_TURNS = 1.5;
/** Radians per second the phase pattern slides sideways. */
const BEND_RATE = 0.11;
/** Radians per second of the whole field's sideways meander. */
const SWAY_RATE = 0.23;
/** Mask threshold shift per second: a slow twinkle under the climb, so the field never sits dead still. */
const CRAWL = 0.04;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Keeps minHeight inside a sane range even if a caller passes something outside 30 to 100. */
function vh(minHeight: number): number {
  return Math.min(100, Math.max(0, minHeight));
}

/** Layout for the host and the grammar for its calls to action, from STYLE.md: the first action solid in
 *  the fg color, the rest outline, square corners, and a hairline focus ring. Prose keeps the page's font:
 *  only size, weight, and a generous line height set the copy apart. The block sits high through a large
 *  top padding rather than a transform, so nothing can be pushed out of the host and clipped. The minimum
 *  height goes in a :where() rule, which carries no specificity at all, so a page that gives this host a
 *  height of its own wins. */
function rules(s: string, p: EtherealHeroProps): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  const onFg = cssOn("fg");
  const center = p.align === "center";
  const edge = center ? "center" : "flex-start";
  const textAlign = center ? "center" : "start";
  const tint = `color-mix(in srgb, ${fg} 10%, transparent)`;
  return [
    `:where(${s}){min-height:${vh(p.minHeight)}vh}`,
    `${s}{position:relative;box-sizing:border-box;display:flex;flex-direction:column;justify-content:flex-start;align-items:${edge};padding:clamp(1.5rem,6vw,5rem);padding-block-start:clamp(4rem,16vh,10rem);gap:1.6em;color:${fg};text-align:${textAlign}}`,
    `${s} > :not([data-pica]){margin-block:0;text-align:${textAlign}}`,
    `${s} > :not([data-pica]):not(:is(h1,h2,h3)){max-width:42rem}`,
    `${s} > p:not([data-pica]){color:${muted}}`,
    `${s} > :is(h1,h2,h3){margin-block:0;max-width:16em;font-size:clamp(2.1rem,5.2vw,3.9rem);line-height:1.28;font-weight:500;letter-spacing:-0.01em;color:${fg};text-wrap:balance;overflow-wrap:break-word}`,
    `${s} > :is(h1,h2,h3):empty{display:none}`,
    `${s} > [data-part="subhead"]{margin-block:0;max-width:56ch;font-size:clamp(1rem,1.3vw,1.15rem);line-height:1.85;color:${muted};overflow-wrap:break-word}`,
    `${s} > [data-part="subhead"]:empty{display:none}`,
    `${s} > [data-part="actions"]{display:flex;flex-wrap:wrap;align-items:center;gap:0.8em;margin-top:1.2em;justify-content:${edge}}`,
    `${s} > [data-part="actions"]:empty{display:none}`,
    `${s} > [data-part="actions"] a{appearance:none;margin:0;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.65em 1.3em;display:inline-flex;align-items:center;border:1px solid transparent;border-radius:0;cursor:pointer}`,
    // The solid link paints its background from currentColor and carries the fg itself, so the fallback
    // for --pica-fg resolves to the link's own color rather than its inverted text. Its label sits in a
    // span, where the same fallback resolves to the inherited fg and inverts it back for the text.
    `${s} > [data-part="actions"] a[data-variant="solid"]{background:currentColor;color:${fg}}`,
    `${s} > [data-part="actions"] a[data-variant="solid"] > [data-part="label"]{color:${onFg}}`,
    `${s} > [data-part="actions"] a[data-variant="outline"]{background:transparent;color:${fg};border-color:${fg}}`,
    `${s} > [data-part="actions"] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${fg} 88%, transparent)}`,
    `${s} > [data-part="actions"] a[data-variant="outline"]:hover{background:${tint}}`,
    `${s} > [data-part="actions"] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
  ].join("\n");
}

export const mount: Mount<EtherealHeroProps> = (host, initial = {}) => {
  let props: EtherealHeroProps = { ...defaults, ...initial };
  const sheet = scope(host);
  const under = layer(host, "under");
  const surface = createCanvas(under.el, {
    autoSize: false,
    css: "image-rendering:pixelated",
    onResize: () => {
      if (layout()) loop.redraw();
    },
  });
  const canvas = surface.canvas;
  const ctx = canvas.getContext("2d");
  const mask = blueNoiseMatrix(BLUE_SIZE);

  // Everything the core adds lands after the children the page wrapped, so a page can put its own heading
  // first, or let the headline prop do it, or both.
  const headline = document.createElement("h1");
  headline.setAttribute("data-pica", "");
  headline.setAttribute("data-part", "headline");
  const subhead = document.createElement("p");
  subhead.setAttribute("data-pica", "");
  subhead.setAttribute("data-part", "subhead");
  const actions = document.createElement("div");
  actions.setAttribute("data-pica", "");
  actions.setAttribute("data-part", "actions");
  host.append(headline, subhead, actions);

  let cols = 1;
  let rows = 1;
  let values = new Float32Array(1);
  let imageData: ImageData | null = null;
  let inkR = 0;
  let inkG = 0;
  let inkB = 0;
  let inkA = 0;
  let bgR = 0;
  let bgG = 0;
  let bgB = 0;
  let bgA = 0;
  let builtSeed = Number.NaN;
  let builtDensity = Number.NaN;
  let builtHorizon = Number.NaN;
  let swayPhase = 0;
  let bendPhase = 0;

  function syncColors(): void {
    const [r, g, b, a] = parseColor(palette.colors.muted);
    const [br, bg, bb, ba] = parseColor(palette.colors.bg);
    inkR = r;
    inkG = g;
    inkB = b;
    inkA = a;
    bgR = br;
    bgG = bg;
    bgB = bb;
    bgA = ba;
  }

  const palette = watchPalette(host, () => {
    syncColors();
    loop.redraw();
  });
  syncColors();

  /** The grain each cell carries, from 0 to 1: a ramp that thickens from the horizon to the bottom edge,
   *  gathered into broad clumps by a seeded simplex field so it reads as weather rather than as a flat
   *  gradient. Rebuilt when the size, seed, density, or horizon changes, never per frame. */
  function rebuild(): void {
    const noise = createNoise(props.seed);
    const phases = createRng(props.seed);
    swayPhase = phases() * Math.PI * 2;
    bendPhase = phases() * Math.PI * 2;
    const density = Math.min(1, Math.max(0, props.density));
    const horizon = Math.min(0.95, Math.max(0, props.horizon));
    const span = Math.max(0.05, 1 - horizon);
    for (let y = 0; y < rows; y++) {
      const yn = (y + 0.5) / rows;
      const ramp = Math.pow(clamp01((yn - horizon) / span), DENSITY_CURVE);
      for (let x = 0; x < cols; x++) {
        const clump = clamp01(noise.noise2(x / CLUMP_SPAN, y / CLUMP_SPAN) * CLUMP_GAIN * 0.5 + 0.5);
        const tone = Math.round(ramp * (CLUMP_BASE + CLUMP_RANGE * clump) * TONE_STEPS) / TONE_STEPS;
        values[y * cols + x] = AMBIENT + density * tone;
      }
    }
    builtSeed = props.seed;
    builtDensity = props.density;
    builtHorizon = props.horizon;
  }

  /** Recomputes the low-resolution grid from the layer's size and `pixel`, then the grain field when its
   *  own shape needs to change. Returns true when either did, so a caller not already animating knows to
   *  redraw. */
  function layout(): boolean {
    const px = Math.max(1, Math.round(props.pixel));
    const w = Math.max(1, Math.round(surface.cssWidth / px));
    const h = Math.max(1, Math.round(surface.cssHeight / px));
    let changed = false;
    if (w !== cols || h !== rows || !imageData) {
      cols = w;
      rows = h;
      canvas.width = cols;
      canvas.height = rows;
      imageData = ctx ? ctx.createImageData(cols, rows) : null;
      values = new Float32Array(cols * rows);
      changed = true;
    }
    if (changed || props.seed !== builtSeed || props.density !== builtDensity || props.horizon !== builtHorizon) {
      rebuild();
      changed = true;
    }
    return changed;
  }

  function draw(t: number): void {
    const context = ctx;
    const data = imageData;
    if (!context || !data) {
      host.dataset.picaReady = "true";
      return;
    }
    const tSec = t / 1000;
    const turn = (tSec * CRAWL) % 1;
    const step = props.rise * tSec;
    const swayX = Math.round(props.sway * Math.sin(tSec * SWAY_RATE + swayPhase));
    const bendFreq = (Math.PI * 2 * BEND_TURNS) / Math.max(1, cols);
    const bendSlide = tSec * BEND_RATE + bendPhase;
    const buf = data.data;
    let i = 0;
    // The mask read climbs by whole cells: a blue noise threshold is a rank, so interpolating between
    // cells would smear it into grey. The climb reads as slow hops, and the threshold's own turn keeps
    // the field breathing between them.
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const oy = Math.round(step + BEND_CELLS * Math.sin(x * bendFreq + bendSlide));
        const th = maskAt(mask, BLUE_SIZE, x + swayX, y + oy) + turn;
        const on = (values[i] ?? 0) >= (th >= 1 ? th - 1 : th);
        const o = i * 4;
        buf[o] = on ? inkR : bgR;
        buf[o + 1] = on ? inkG : bgG;
        buf[o + 2] = on ? inkB : bgB;
        buf[o + 3] = on ? inkA : bgA;
        i++;
      }
    }
    context.putImageData(data, 0, 0);
    host.dataset.picaReady = "true";
  }

  function renderText(): void {
    headline.textContent = props.headline;
    subhead.textContent = props.subhead;
  }

  /** Rebuilds the action links from JSON: the first solid, the rest outline, in source order. */
  function renderActions(): void {
    actions.replaceChildren();
    for (const [i, action] of props.actions.slice(0, 3).entries()) {
      const a = document.createElement("a");
      a.setAttribute("data-pica", "");
      a.href = action.href;
      if (i === 0) {
        a.dataset.variant = "solid";
        const label = document.createElement("span");
        label.setAttribute("data-pica", "");
        label.setAttribute("data-part", "label");
        label.textContent = action.label;
        a.append(label);
      } else {
        a.dataset.variant = "outline";
        a.textContent = action.label;
      }
      actions.append(a);
    }
  }

  sheet.setRules(rules(sheet.selector, props));
  renderText();
  renderActions();
  layout();
  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: STILL_TIME, frame: draw });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.headline !== before.headline || props.subhead !== before.subhead) renderText();
      if (!sameJson(before.actions, props.actions)) renderActions();
      if (props.align !== before.align || props.minHeight !== before.minHeight) sheet.setRules(rules(sheet.selector, props));
      palette.refresh();
      syncColors();
      const changed = layout();
      loop.update({ paused: props.paused, time: props.time, fps: props.fps });
      if (changed || props.rise !== before.rise || props.sway !== before.sway) loop.redraw();
    },
    destroy() {
      loop.destroy();
      surface.destroy();
      palette.destroy();
      under.remove();
      headline.remove();
      subhead.remove();
      actions.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};
