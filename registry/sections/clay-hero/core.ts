import { hostTone, parseColor, relativeLuminance } from "../../../lib/color";
import { createCanvas } from "../../../lib/canvas";
import { bayerMatrix } from "../../../lib/dither";
import { blueNoiseMatrix, clusterMatrix, ditherLevels } from "../../../lib/dither-mask";
import { layer, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { createLoop } from "../../../lib/loop";
import { cssOn, cssVar, watchPalette } from "../../../lib/palette";
import { createRng, hashSeed } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

/** One call to action: a link's visible text and destination. */
export interface ClayHeroAction {
  /** Text on the link. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface ClayHeroProps extends MotionProps {
  /** The headline, set large in the page's own typeface. Empty hides it. */
  headline: string;
  /** Support under the headline, drawn in the muted color. Empty hides it. */
  subhead: string;
  /** Calls to action, drawn as links. At most three show, and the first fills with the accent. */
  actions: readonly ClayHeroAction[];
  /** Horizontal alignment of the content column within the host. */
  align: "start" | "center";
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
  /** How many clay forms settle behind the content, from 2 to 6. */
  forms: number;
  /** Radius multiplier on every form. */
  scale: number;
  /** Tone bands each form is screened into, from 2 to 4. */
  levels: number;
  /** Contrast between the darkest and the lightest band, from 0 to 1. */
  depth: number;
  /** The screen the bands are dithered with: "blue" noise, a "cluster" dot screen, or a "bayer" matrix. */
  mask: "blue" | "cluster" | "bayer";
  /** CSS pixels each screened cell covers before the canvas is scaled up. */
  pixel: number;
  /** How fast the forms drift and deform. 0 holds them still. */
  speed: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: ClayHeroProps = {
  headline: "Soft shapes, hard edges.",
  subhead: "Inflated forms settle behind the type, each shaded in a handful of screened tone bands.",
  actions: [
    { label: "Browse components", href: "#components" },
    { label: "Read the docs", href: "#docs" },
  ],
  align: "start",
  minHeight: 72,
  forms: 4,
  scale: 1,
  levels: 4,
  depth: 0.75,
  mask: "blue",
  pixel: 4,
  speed: 1,
  fps: 15,
  paused: false,
  time: null,
  seed: 1,
};

/** Animation time reduced motion holds, in milliseconds. */
const STILL_TIME = 1200;
/** Cell count of each screen: the dispersed mask and the dot screen from lib/dither-mask.ts, the ordered
 *  matrix from lib/dither.ts. */
const BLUE_SIZE = 32;
const CLUSTER_SIZE = 8;
const BAYER_SIZE = 8;
/** The one direction light comes from, from the upper left and only a little toward the viewer, so a
 *  form's flat facing interior holds its mid band and the lightest band lands on the rim as a crescent. */
const LIGHT = [-0.5, -0.55, 0.45] as const;
const LIGHT_LEN = Math.hypot(LIGHT[0], LIGHT[1], LIGHT[2]);
const LIGHT_X = LIGHT[0] / LIGHT_LEN;
const LIGHT_Y = LIGHT[1] / LIGHT_LEN;
const LIGHT_Z = LIGHT[2] / LIGHT_LEN;
/** The dome shading each form carries: a mid the flat facing interior holds, a bias that keeps the
 *  lightest band to the rim that faces the light, and a gain the depth prop scales. */
const SHADE_MID = 0.55;
const SHADE_BIAS = 0.35;
const SHADE_GAIN = 0.5;
/** Alpha of a muted form's mid band, and of the accent form's, on each ground. The forms stay a backdrop,
 *  so both sit well under full ink, and the light ground carries a little more so the body still shows. */
const MUTED_ALPHA_DARK = 0.4;
const MUTED_ALPHA_LIGHT = 0.6;
const ACCENT_ALPHA_DARK = 0.55;
const ACCENT_ALPHA_LIGHT = 0.65;

/** A color as parseColor returns it: red, green, blue, alpha, each 0 to 255. */
type Rgba = readonly [number, number, number, number];

/** Where one form sits and how large it is. `x` and `y` are fractions of the host, `r` a fraction of its
 *  shorter side. The list is the z order too: later forms draw over earlier ones. The accent pebble rides
 *  second, so it is always present at the default count. */
interface FormSpec {
  x: number;
  y: number;
  r: number;
  accent: boolean;
}

const FORM_SPECS: readonly FormSpec[] = [
  { x: 0.72, y: 0.46, r: 0.34, accent: false },
  { x: 0.24, y: 0.8, r: 0.14, accent: true },
  { x: 0.91, y: 0.18, r: 0.16, accent: false },
  { x: 0.08, y: 0.2, r: 0.1, accent: false },
  { x: 0.46, y: 0.09, r: 0.08, accent: false },
  { x: 0.94, y: 0.74, r: 0.12, accent: false },
];

/** A form's seeded motion: a slow drift, a slower breath, and three harmonics that wobble its silhouette.
 *  Every number comes from the seed, so the same seed and time always draw the same frame. */
interface LiveForm {
  spec: FormSpec;
  /** Drift amplitude, as a fraction of the host's shorter side. */
  driftX: number;
  driftY: number;
  /** Drift rates, in radians per millisecond at speed 1. */
  rateX: number;
  rateY: number;
  phaseX: number;
  phaseY: number;
  /** Breathing amplitude, rate, and phase of the radius. */
  breathe: number;
  breatheRate: number;
  breathePhase: number;
  /** Deformation harmonics of the edge angle: amplitude, order, phase, and rate each. */
  amp: [number, number, number];
  order: [number, number, number];
  phase: [number, number, number];
  rate: [number, number, number];
}

/** Keeps a number inside 0 to 1. */
function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Keeps minHeight inside a sane range even if a caller passes something outside 0 to 100. */
function vh(minHeight: number): number {
  return Math.min(100, Math.max(0, minHeight));
}

/** Scales a color's alpha and leaves its channels alone. */
function dimRgba(color: Rgba, k: number): Rgba {
  return [color[0], color[1], color[2], color[3] * k];
}

/** Blends two colors channel by channel, alpha included. */
function mixRgba(a: Rgba, b: Rgba, t: number): Rgba {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
}

/** The band colors of one form, darkest to lightest, resampled to the level count. On a dark ground the
 *  form sits low against it and its lit edge climbs toward the ink; on a light one the body lifts toward
 *  the paper and the unlit rim sinks toward the ink. Either way the bands are steps of one color, so a
 *  form never carries a shadow, only tone. */
function rampOf(base: Rgba, fg: Rgba, lightOnDark: boolean, levels: number): Rgba[] {
  const stops: Rgba[] = lightOnDark
    ? [dimRgba(base, 0.35), dimRgba(base, 0.65), base, mixRgba(base, fg, 0.45)]
    : [mixRgba(base, fg, 0.45), dimRgba(base, 0.9), dimRgba(base, 0.7), dimRgba(base, 0.4)];
  const top = stops.length - 1;
  const out: Rgba[] = [];
  for (let k = 0; k < levels; k++) {
    const pos = (levels === 1 ? 0 : k / (levels - 1)) * top;
    const i0 = Math.min(top - 1, Math.floor(pos));
    out.push(mixRgba(stops[i0] ?? base, stops[i0 + 1] ?? base, pos - i0));
  }
  return out;
}

/** The forms for the current seed and count, each with its own stream so a reorder never reshuffles the rest. */
function buildLiveForms(seed: number, count: number): LiveForm[] {
  const turn = Math.PI * 2;
  return FORM_SPECS.slice(0, Math.max(2, Math.min(FORM_SPECS.length, Math.round(count)))).map((spec, i) => {
    const rng = createRng(hashSeed(seed, i));
    const slow = (lo: number, hi: number): number => (lo + rng() * (hi - lo)) * (rng() < 0.5 ? -1 : 1);
    return {
      spec,
      driftX: 0.012 + rng() * 0.02,
      driftY: 0.012 + rng() * 0.02,
      rateX: slow(0.00025, 0.0006),
      rateY: slow(0.00025, 0.0006),
      phaseX: rng() * turn,
      phaseY: rng() * turn,
      breathe: 0.02 + rng() * 0.035,
      breatheRate: slow(0.0004, 0.0009),
      breathePhase: rng() * turn,
      amp: [0.05 + rng() * 0.09, 0.03 + rng() * 0.07, 0.02 + rng() * 0.05],
      order: [2 + Math.floor(rng() * 3), 3 + Math.floor(rng() * 3), 4 + Math.floor(rng() * 3)],
      phase: [rng() * turn, rng() * turn, rng() * turn],
      rate: [slow(0.0005, 0.0013), slow(0.0005, 0.0013), slow(0.0005, 0.0013)],
    };
  });
}

/** Creates one element the core owns, marked so the scoped rules can find it. */
function part<K extends keyof HTMLElementTagNameMap>(tag: K, name: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute(`data-pica-${name}`, "");
  return node;
}

export const mount: Mount<ClayHeroProps> = (host, initial = {}) => {
  let props: ClayHeroProps = { ...defaults, ...initial };
  const sheet = scope(host);

  // The canvas sits in an under layer below the wrapped content, so the forms read as objects behind the
  // type and the type keeps its place, its font, and its hit testing.
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
  const pal = watchPalette(host, () => {
    buildRamps();
    loop.redraw();
  });

  // Everything the core adds lands after the children the page wrapped, so a page can put its own heading
  // first, or let the headline prop do it, or both.
  const headline = part("h1", "headline");
  const subhead = part("p", "subhead");
  const actions = part("div", "actions");
  host.append(headline, subhead, actions);

  let cols = 1;
  let rows = 1;
  let values = new Float32Array(1);
  let owner = new Int8Array(1);
  let imageData: ImageData | null = null;
  let liveForms: LiveForm[] = [];
  let ramps: Rgba[][] = [];
  let ground: Rgba = [0, 0, 0, 0];

  /** The scoped rules: the host's layout, the type, and the calls to action. Prose keeps the page's font;
   *  only size, weight, and tracking set the headline apart. The minimum height goes in a :where() rule,
   *  which carries no specificity at all, so a page that gives this host a height of its own wins. */
  function rulesText(): string {
    const s = sheet.selector;
    const fg = cssVar("fg");
    const muted = cssVar("muted");
    const accent = cssVar("accent");
    const center = props.align === "center";
    const edge = center ? "center" : "flex-start";
    const textAlign = center ? "center" : "start";
    return [
      `:where(${s}){min-height:${vh(props.minHeight)}vh}`,
      `${s}{box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:${edge};gap:0.9em;padding:clamp(1.5rem,6vw,5rem);color:${fg};text-align:${textAlign}}`,
      `${s} > :not([data-pica]){margin-block:0;max-width:44rem;text-align:${textAlign}}`,
      `${s} > :is(h1,h2,h3){margin-block:0;max-width:14em;font-size:clamp(2.5rem,6.5vw,4.75rem);line-height:1.04;font-weight:600;letter-spacing:-0.02em;color:${fg};text-wrap:balance;overflow-wrap:break-word}`,
      `${s} > p:not([data-pica]){color:${muted}}`,
      `${s} > [data-pica-subhead]{margin-block:0;max-width:52ch;font-size:clamp(1.02rem,1.35vw,1.18rem);line-height:1.5;color:${muted};overflow-wrap:break-word}`,
      `${s} > :is(h1,h2,h3):empty,${s} > [data-pica-subhead]:empty{display:none}`,
      `${s} > [data-pica-actions]{display:flex;flex-wrap:wrap;align-items:center;gap:0.75em;margin-top:0.7em;max-width:44rem;justify-content:${edge}}`,
      `${s} > [data-pica-actions]:empty{display:none}`,
      `${s} > [data-pica-actions] a{appearance:none;margin:0;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.65em 1.3em;display:inline-flex;align-items:center;border:1px solid transparent;border-radius:0;cursor:pointer}`,
      `${s} > [data-pica-actions] a[data-variant="solid"]{background:${accent};color:${cssOn("accent")}}`,
      `${s} > [data-pica-actions] a[data-variant="outline"]{background:transparent;color:${fg};border-color:${fg}}`,
      `${s} > [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${accent} 85%, ${fg})}`,
      `${s} > [data-pica-actions] a[data-variant="outline"]:hover{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
      `${s} > [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    ].join("\n");
  }

  /** Writes the text parts. An empty prop leaves an empty element, which the :empty rule hides. */
  function renderText(): void {
    headline.textContent = props.headline;
    subhead.textContent = props.subhead;
  }

  /** Rebuilds the action links from JSON: at most three, the first solid in the accent, the rest outline. */
  function renderActions(): void {
    actions.replaceChildren();
    for (const [i, action] of props.actions.slice(0, 3).entries()) {
      const a = document.createElement("a");
      a.setAttribute("data-pica", "");
      a.dataset.variant = i === 0 ? "solid" : "outline";
      a.href = action.href || "#";
      a.textContent = action.label;
      actions.append(a);
    }
  }

  /** Recomputes the low resolution grid from the host and the pixel prop. Returns true when it changed. */
  function layout(): boolean {
    const cell = Math.max(1, props.pixel);
    const w = Math.max(1, Math.round(surface.cssWidth / cell));
    const h = Math.max(1, Math.round(surface.cssHeight / cell));
    if (w === cols && h === rows && imageData) return false;
    cols = w;
    rows = h;
    canvas.width = cols;
    canvas.height = rows;
    imageData = ctx ? ctx.createImageData(cols, rows) : null;
    values = new Float32Array(cols * rows);
    owner = new Int8Array(cols * rows);
    return true;
  }

  /** Rebuilds the seeded motion of every form. Called again only when the seed or the count changes. */
  function buildForms(): void {
    liveForms = buildLiveForms(props.seed, props.forms);
  }

  /** Rebuilds each form's band colors and the ground fill from the current palette. On a dark ground the
   *  bands climb toward the ink; on a light one they sink toward it, so the lightest band always sits on
   *  the same side of the form as the light. */
  function buildRamps(): void {
    const colors = pal.colors;
    ground = parseColor(colors.bg);
    const fg = parseColor(colors.fg);
    const muted = parseColor(colors.muted);
    const accent = parseColor(colors.accent);
    const lightOnDark = ground[3] > 0
      ? relativeLuminance(colors.fg) > relativeLuminance(colors.bg)
      : hostTone(host) === "light-on-dark";
    const bandCount = Math.max(2, Math.min(4, Math.round(props.levels)));
    const mutedBase: Rgba = [muted[0], muted[1], muted[2], 255 * (lightOnDark ? MUTED_ALPHA_DARK : MUTED_ALPHA_LIGHT)];
    const accentBase: Rgba = [accent[0], accent[1], accent[2], 255 * (lightOnDark ? ACCENT_ALPHA_DARK : ACCENT_ALPHA_LIGHT)];
    ramps = liveForms.map((f) => rampOf(f.spec.accent ? accentBase : mutedBase, fg, lightOnDark, bandCount));
  }

  /** Paints one frame: the ground, then each form's silhouette filled with its shaded value, screened into
   *  bands by the chosen mask. A pixel inside several forms takes the last form's shading, which is what
   *  the z order means. */
  function draw(t: number): void {
    if (!ctx || !imageData) {
      host.dataset.picaReady = "true";
      return;
    }
    const n = cols * rows;
    owner.fill(-1);
    values.fill(0);
    const span = Math.min(cols, rows);
    const speed = Math.max(0, props.speed);
    const gain = 0.25 + 0.95 * clamp01(props.depth);
    for (let fi = 0; fi < liveForms.length; fi++) {
      const f = liveForms[fi];
      if (!f) continue;
      const r0 =
        f.spec.r * span * Math.max(0.05, props.scale) * (1 + f.breathe * Math.sin(f.breathePhase + f.breatheRate * speed * t));
      if (r0 < 1) continue;
      const cx = f.spec.x * cols + f.driftX * span * Math.sin(f.phaseX + f.rateX * speed * t);
      const cy = f.spec.y * rows + f.driftY * span * Math.cos(f.phaseY + f.rateY * speed * t);
      const w0 = f.phase[0] + f.rate[0] * speed * t;
      const w1 = f.phase[1] + f.rate[1] * speed * t;
      const w2 = f.phase[2] + f.rate[2] * speed * t;
      const rmax = r0 * (1 + f.amp[0] + f.amp[1] + f.amp[2]) + 1;
      const x0 = Math.max(0, Math.floor(cx - rmax));
      const x1 = Math.min(cols, Math.ceil(cx + rmax));
      const y0 = Math.max(0, Math.floor(cy - rmax));
      const y1 = Math.min(rows, Math.ceil(cy + rmax));
      for (let y = y0; y < y1; y++) {
        const dy = y + 0.5 - cy;
        for (let x = x0; x < x1; x++) {
          const dx = x + 0.5 - cx;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d >= rmax) continue;
          const th = Math.atan2(dy, dx);
          const rth =
            r0 *
            (1 +
              f.amp[0] * Math.sin(f.order[0] * th + w0) +
              f.amp[1] * Math.sin(f.order[1] * th + w1) +
              f.amp[2] * Math.sin(f.order[2] * th + w2));
          if (d >= rth) continue;
          const ux = dx / rth;
          const uy = dy / rth;
          const z = Math.sqrt(Math.max(0, 1 - ux * ux - uy * uy));
          const raw = SHADE_MID + SHADE_GAIN * (ux * LIGHT_X + uy * LIGHT_Y + z * LIGHT_Z - SHADE_BIAS);
          const i = y * cols + x;
          values[i] = clamp01(0.5 + (raw - 0.5) * gain);
          owner[i] = fi;
        }
      }
    }
    const bandCount = Math.max(2, Math.min(4, Math.round(props.levels)));
    const mask = props.mask === "cluster" ? clusterMatrix(CLUSTER_SIZE) : props.mask === "bayer" ? bayerMatrix(BAYER_SIZE) : blueNoiseMatrix(BLUE_SIZE);
    const maskSize = props.mask === "cluster" ? CLUSTER_SIZE : props.mask === "bayer" ? BAYER_SIZE : BLUE_SIZE;
    const bands = ditherLevels(values, cols, rows, bandCount, mask, maskSize);
    const data = imageData.data;
    for (let i = 0; i < n; i++) {
      const o = owner[i] ?? -1;
      const c = o < 0 ? ground : (ramps[o]?.[bands[i] ?? 0] ?? ground);
      const j = i * 4;
      data[j] = c[0];
      data[j + 1] = c[1];
      data[j + 2] = c[2];
      data[j + 3] = c[3];
    }
    ctx.putImageData(imageData, 0, 0);
    host.dataset.picaReady = "true";
  }

  sheet.setRules(rulesText());
  renderText();
  renderActions();
  layout();
  buildForms();
  buildRamps();
  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: STILL_TIME, frame: draw });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (pal.refresh()) buildRamps();
      if (props.headline !== before.headline || props.subhead !== before.subhead) renderText();
      if (!sameJson(before.actions, props.actions)) renderActions();
      if (props.align !== before.align || props.minHeight !== before.minHeight) sheet.setRules(rulesText());
      if (props.seed !== before.seed || props.forms !== before.forms) {
        buildForms();
        buildRamps();
      } else if (props.levels !== before.levels) {
        buildRamps();
      }
      if (props.pixel !== before.pixel) layout();
      loop.update({ paused: props.paused, time: props.time, fps: props.fps });
      loop.redraw();
    },
    destroy() {
      loop.destroy();
      surface.destroy();
      pal.destroy();
      under.remove();
      headline.remove();
      subhead.remove();
      actions.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};
