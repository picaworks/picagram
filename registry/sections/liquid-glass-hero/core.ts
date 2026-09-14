import { createCanvas } from "../../../lib/canvas";
import { parseColor } from "../../../lib/color";
import { bayerMatrix } from "../../../lib/dither";
import { blueNoiseMatrix, ditherLevels } from "../../../lib/dither-mask";
import { layer, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { createLoop } from "../../../lib/loop";
import { createNoise, type Noise } from "../../../lib/noise";
import { cssOn, cssVar, watchPalette } from "../../../lib/palette";
import { createRng, hashSeed } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

/** One call to action: a link's visible text and destination. */
export interface LiquidGlassHeroAction {
  /** Text on the link. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface LiquidGlassHeroProps extends MotionProps {
  /** The headline, set large in the page's own font after anything the page wraps. Empty hides it. */
  headline: string;
  /** Supporting copy under the headline, in the muted color. Empty hides it. */
  subhead: string;
  /** Calls to action, drawn as links in source order. At most three: the first draws solid, the rest outline. */
  actions: readonly LiquidGlassHeroAction[];
  /** Horizontal alignment of the content column within the host. */
  align: "start" | "center";
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
  /** The slab's diameter as a share of the host's shorter side, 0.2 to 0.8. */
  size: number;
  /** How far the slab's curved edge bends what lies behind it, from 0 (a flat sheet) to 1 (a strong lens). */
  bend: number;
  /** Spacing of the printed lattice the slab drifts over, in CSS pixels. */
  spacing: number;
  /** How strongly the whole drawing inks, from 0 (the ground alone) to 1. */
  intensity: number;
  /** How fast the slab drifts across the field. 0 holds it still. */
  drift: number;
  /** Tone steps the field is screened into: 2 is one-bit, 6 reads as nearly smooth. */
  levels: number;
  /** The screen the field is dithered through: "blue" scatters the ink, "bayer" orders it. */
  mask: "blue" | "bayer";
  /** CSS pixels each screened cell covers before the canvas is scaled up. */
  pixel: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: LiquidGlassHeroProps = {
  headline: "Glass that bends, never blurs.",
  subhead: "A thick lens drifts over a printed field and displaces what lies beneath its curved edge, drawn in screened ink.",
  actions: [
    { label: "Get started", href: "#start" },
    { label: "How it bends", href: "#how" },
  ],
  align: "start",
  minHeight: 72,
  size: 0.34,
  bend: 0.6,
  spacing: 30,
  intensity: 0.6,
  drift: 0.5,
  levels: 4,
  mask: "blue",
  pixel: 3,
  fps: 30,
  paused: false,
  time: null,
  seed: 1,
};

/** Animation time held under reduced motion, in milliseconds. */
const STILL_TIME = 1200;
/** Cell count of the blue noise mask, from lib/dither-mask.ts. */
const BLUE_SIZE = 32;
/** Cell count of the ordered mask, from lib/dither.ts. */
const BAYER_SIZE = 8;
/** Cells per side of the broad tone tile the field reads back through bilinear sampling. */
const TILE = 32;
/** CSS pixels one tile cell covers: the broad tone varies over roughly four of them. */
const NOISE_PX = 96;
/** Noise cycles across the tile, so the broadest cloud spans about a third of its span. */
const NOISE_CYCLES = 3;
/** Vertical squash of the slab: ry is rx times this, so the lens reads pressed rather than round. */
const SQUASH = 0.86;
/** Direction the lit edge faces, normalized once: the rim is brightest at the upper left. */
const LIGHT_LEN = Math.hypot(0.68, 0.73);
const LIGHT_X = -0.68 / LIGHT_LEN;
const LIGHT_Y = -0.73 / LIGHT_LEN;
/** How far around the rim the specular arc reaches: the cosine of its half angle. */
const ARC = 0.74;
/** Tone a lattice line carries, added to the field where it runs. */
const LINE_TONE = 0.85;
/** Where the broad noise starts to lift the field at all: below it the field sits on the ground, so the
 *  clouds gather into quiet patches instead of speckling the whole frame. */
const KNEE = 0.58;
/** Tone the broad noise reaches at its peaks, once past the knee. */
const NOISE_GAIN = 0.5;
/** Slab body tone at the centre, where a lens is nearly clear. */
const LIFT = 0.04;
/** Extra body tone at the rim, where the slab is thick. */
const LIFT_EDGE = 0.64;
/** Tone of the hairline that outlines the whole slab. */
const EDGE = 0.92;
/** Inner edge of the outline ring, as a share of the slab radius. */
const EDGE_IN = 0.965;
/** Inner edge of the bright specular ring, as a share of the slab radius. */
const SPEC1_IN = 0.968;
/** The dimmer specular ring runs from SPEC2_IN to SPEC2_OUT. */
const SPEC2_IN = 0.928;
const SPEC2_OUT = 0.958;
/** Alpha of the two specular steps, before intensity scales them: a bright hairline and a dimmer one inside it. */
const SPEC_HI = 1;
const SPEC_LO = 0.45;
/** Alpha ceiling of the bg veil inside the slab, reached at the rim. Unset bg leaves the glass clear. */
const VEIL_MAX = 0.65;
/** Displacement in CSS pixels at the rim when bend is 1. */
const BEND_PX = 20;
/** Room the wandering slab keeps from the frame's own edge, in CSS pixels. */
const MARGIN = 40;
/** Clear air the slab's edge keeps from the box the content occupies, in CSS pixels. */
const CLEAR = 36;
/** Elliptical distance where the field starts settling toward the ground, squared: just past the rim. */
const FIELD_IN2 = 1.15 * 1.15;
/** Elliptical distance where the field reaches its floor, squared. */
const FIELD_OUT2 = 2.6 * 2.6;
/** Print left in the far field: a whisper so the ground is never sterile, never busy. */
const FIELD_FLOOR = 0.06;
/** Wander periods in milliseconds at drift 1: incommensurate, so the path never repeats on a page. */
const PERIOD_X = 34000;
const PERIOD_Y = 43000;

const TAU = Math.PI * 2;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** The Hermite step: 0 below e0, 1 above e1, smoothed between. */
function smoothstep(e0: number, e1: number, v: number): number {
  const t = clamp((v - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Keeps minHeight inside a sane range even if a caller passes something outside 0 to 100. */
function vh(minHeight: number): number {
  return clamp(minHeight, 0, 100);
}

/** Fractal noise at one point, its octaves summed with each half the amplitude and twice the frequency of
 *  the last, then brought back to roughly -1 to 1 by the total amplitude they carried. */
function noiseSum(noise: Noise, x: number, y: number, octaves: number): number {
  let amplitude = 0.5;
  let frequency = 1;
  let sum = 0;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amplitude * noise.noise2(x * frequency, y * frequency);
    total += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return total > 0 ? sum / total : 0;
}

/** noiseSum at (nx, ny) in 0 to 1, blended with three copies shifted by one full cycle of `scale`, so the
 *  tile it fills repeats with no seam when its opposite edges are read as neighbors. */
function tileAt(noise: Noise, nx: number, ny: number, scale: number, octaves: number): number {
  const sx = nx * scale;
  const sy = ny * scale;
  const a = noiseSum(noise, sx, sy, octaves);
  const b = noiseSum(noise, sx - scale, sy, octaves);
  const c = noiseSum(noise, sx, sy - scale, octaves);
  const d = noiseSum(noise, sx - scale, sy - scale, octaves);
  return a * (1 - nx) * (1 - ny) + b * nx * (1 - ny) + c * (1 - nx) * ny + d * nx * ny;
}

/** Bilinear read of the tone tile that wraps at its own size, at a fractional cell position. */
function readTile(tile: Float32Array, x: number, y: number): number {
  const wx = ((x % TILE) + TILE) % TILE;
  const wy = ((y % TILE) + TILE) % TILE;
  const x0 = Math.floor(wx);
  const y0 = Math.floor(wy);
  const x1 = (x0 + 1) % TILE;
  const y1 = (y0 + 1) % TILE;
  const tx = wx - x0;
  const ty = wy - y0;
  const v00 = tile[y0 * TILE + x0] ?? 0;
  const v10 = tile[y0 * TILE + x1] ?? 0;
  const v01 = tile[y1 * TILE + x0] ?? 0;
  const v11 = tile[y1 * TILE + x1] ?? 0;
  return v00 * (1 - tx) * (1 - ty) + v10 * tx * (1 - ty) + v01 * (1 - tx) * ty + v11 * tx * ty;
}

/** Layout for the host and the grammar for its calls to action. Prose keeps the page's font; only size,
 *  weight, and tracking set a heading apart, and the muted color carries secondary text. The solid link
 *  paints its background from currentColor, so the fg fallback resolves to the link's own color, and its
 *  label span inverts it back to a readable ink. The minimum height goes in a :where() rule, which carries
 *  no specificity at all, so a page that gives this host a height of its own wins. */
function rules(s: string, p: LiquidGlassHeroProps): string {
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
    `${s}{box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:${edge};gap:0.9em;padding:clamp(1.5rem,6vw,5rem);color:${fg};text-align:${textAlign}}`,
    `${s} > :not([data-pica]){margin-block:0;text-align:${textAlign}}`,
    `${s} > :not([data-pica]):not(:is(h1,h2,h3)){max-width:44rem}`,
    `${s} > p:not([data-pica]){color:${muted}}`,
    `${s} > :is(h1,h2,h3){margin-block:0;max-width:14em;font-size:clamp(2.4rem,6vw,4.6rem);line-height:1.05;font-weight:600;letter-spacing:-0.02em;color:${fg};text-wrap:balance;overflow-wrap:break-word}`,
    `${s} > :is(h1,h2,h3):empty{display:none}`,
    `${s} > [data-pica-subhead]{margin-block:0;max-width:52ch;font-size:clamp(1rem,1.4vw,1.15rem);line-height:1.55;color:${muted};overflow-wrap:break-word}`,
    `${s} > [data-pica-subhead]:empty{display:none}`,
    `${s} > [data-pica-actions]{display:flex;flex-wrap:wrap;align-items:center;gap:0.75em;margin-top:0.8em;justify-content:${edge}}`,
    `${s} > [data-pica-actions]:empty{display:none}`,
    `${s} > [data-pica-actions] a{appearance:none;margin:0;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.65em 1.3em;display:inline-flex;align-items:center;border:1px solid ${muted};border-radius:0;color:${fg};background:transparent;cursor:pointer}`,
    `${s} > [data-pica-actions] a[data-variant="solid"]{background:currentColor;color:${fg};border-color:transparent}`,
    `${s} > [data-pica-actions] a[data-variant="solid"] > [data-pica-label]{color:${onFg}}`,
    `${s} > [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${fg} 86%, transparent)}`,
    `${s} > [data-pica-actions] a[data-variant="outline"]:hover{background:${tint};border-color:${fg}}`,
    `${s} > [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
  ].join("\n");
}

export const mount: Mount<LiquidGlassHeroProps> = (host, initial = {}) => {
  let props: LiquidGlassHeroProps = { ...defaults, ...initial };
  const sheet = scope(host);
  const under = layer(host, "under");

  const headlineEl = document.createElement("h1");
  headlineEl.setAttribute("data-pica", "");
  const subheadEl = document.createElement("p");
  subheadEl.setAttribute("data-pica", "");
  subheadEl.setAttribute("data-pica-subhead", "");
  const actionsEl = document.createElement("div");
  actionsEl.setAttribute("data-pica", "");
  actionsEl.setAttribute("data-pica-actions", "");
  host.append(headlineEl, subheadEl, actionsEl);

  let cols = 1;
  let rows = 1;
  let values = new Float32Array(1);
  let spec = new Uint8Array(1);
  let veils = new Float32Array(1);
  let imageData: ImageData | null = null;
  let tile = new Float32Array(1);
  let builtSeed = Number.NaN;
  let phaseX = 0;
  let phaseY = 0;
  let fgC: readonly [number, number, number, number] = [0, 0, 0, 0];
  let specC: readonly [number, number, number, number] = [0, 0, 0, 0];
  let bgC: readonly [number, number, number, number] = [0, 0, 0, 0];

  const surface = createCanvas(under.el, {
    autoSize: false,
    css: "image-rendering:pixelated",
    onResize: () => {
      if (layout()) loop.redraw();
    },
  });
  const canvas = surface.canvas;
  const ctx = canvas.getContext("2d");
  const palette = watchPalette(host, () => {
    readColors();
    loop.redraw();
  });

  /** The palette's tokens as pixel colors, read again whenever a token moves. */
  function readColors(): void {
    fgC = parseColor(palette.colors.fg);
    specC = parseColor(palette.colors.accent);
    bgC = parseColor(palette.colors.bg);
  }

  /** Recomputes the low-resolution cell grid from the host and `pixel`. Returns true when it changed, so a
   *  caller not already animating knows to redraw. */
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
    spec = new Uint8Array(cols * rows);
    veils = new Float32Array(cols * rows);
    return true;
  }

  /** The box the content occupies, in host pixels: the union of every child's rect but the canvas layer's,
   *  which covers the host. Empty children have no box and add nothing. Measured per frame, so a reflowed
   *  headline or a late font moves the keep-out the wander respects. Null when there is no content. */
  function contentBox(): { l: number; t: number; r: number; b: number } | null {
    const hr = host.getBoundingClientRect();
    let l = Number.POSITIVE_INFINITY;
    let t = Number.POSITIVE_INFINITY;
    let r = Number.NEGATIVE_INFINITY;
    let b = Number.NEGATIVE_INFINITY;
    const kids = host.children;
    for (let k = 0; k < kids.length; k++) {
      const el = kids.item(k);
      if (!el || el === under.el) continue;
      const q = el.getBoundingClientRect();
      if (q.width === 0 || q.height === 0) continue;
      if (q.left < l) l = q.left;
      if (q.top < t) t = q.top;
      if (q.right > r) r = q.right;
      if (q.bottom > b) b = q.bottom;
    }
    if (r < l) return null;
    return { l: l - hr.left, t: t - hr.top, r: r - hr.left, b: b - hr.top };
  }

  /** Builds the broad tone tile once per seed: a seamless field of soft clouds, normalized to its own min
   *  and max so it spends the whole 0 to 1 range it is given. Never called per frame. */
  function rebuildField(): void {
    const noise = createNoise(hashSeed(props.seed, 3));
    const octaves = 3;
    tile = new Float32Array(TILE * TILE);
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const v = tileAt(noise, (x + 0.5) / TILE, (y + 0.5) / TILE, NOISE_CYCLES, octaves);
        tile[y * TILE + x] = v;
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    const span = max > min ? max - min : 1;
    for (let i = 0; i < tile.length; i++) tile[i] = ((tile[i] ?? 0) - min) / span;
    const rng = createRng(hashSeed(props.seed, 17));
    phaseX = rng() * TAU;
    phaseY = rng() * TAU;
    builtSeed = props.seed;
  }

  /** Rebuilds the action links from JSON: the first solid, the rest outline, in source order. */
  function renderActions(): void {
    actionsEl.replaceChildren();
    for (const [i, action] of props.actions.slice(0, 3).entries()) {
      const a = document.createElement("a");
      a.setAttribute("data-pica", "");
      a.href = action.href;
      if (i === 0) {
        a.dataset.variant = "solid";
        const label = document.createElement("span");
        label.setAttribute("data-pica", "");
        label.setAttribute("data-pica-label", "");
        label.textContent = action.label;
        a.append(label);
      } else {
        a.dataset.variant = "outline";
        a.textContent = action.label;
      }
      actionsEl.append(a);
    }
  }

  function draw(t: number): void {
    if (!ctx || !imageData) {
      host.dataset.picaReady = "true";
      return;
    }
    const cell = Math.max(1, props.pixel);
    const w = surface.cssWidth;
    const h = surface.cssHeight;
    const inkMax = clamp(props.intensity, 0, 1);
    const r = Math.min(w, h) * clamp(props.size, 0.2, 0.8) * 0.5;
    const rx = Math.max(8, r);
    const ry = rx * SQUASH;
    // The slab wanders inside a box that keeps it whole inside the frame with a clear inset, on two
    // incommensurate periods. The text's box, inflated by the slab's radii plus a clear gap, is a
    // keep-out: a wander point inside it slides to its nearest face, so the slab rides beside or above
    // the type instead of through it. The slab is the subject, the type is the message; they never
    // share pixels.
    const xl = MARGIN + rx;
    const xr = Math.max(xl, w - MARGIN - rx);
    const yt = MARGIN + ry;
    const yb = Math.max(yt, h - MARGIN - ry);
    const drift = clamp(props.drift, 0, 1);
    let cx = (xl + xr) * 0.5 + (xr - xl) * 0.5 * Math.cos((TAU * drift * t) / PERIOD_X + phaseX);
    let cy = (yt + yb) * 0.5 + (yb - yt) * 0.5 * Math.sin((TAU * drift * t) / PERIOD_Y + phaseY);
    const box = contentBox();
    if (box) {
      const kl = box.l - CLEAR - rx;
      const kr = box.r + CLEAR + rx;
      const kt = box.t - CLEAR - ry;
      const kb = box.b + CLEAR + ry;
      if (cx > kl && cx < kr && cy > kt && cy < kb) {
        let bestD = Number.POSITIVE_INFINITY;
        let bx = cx;
        let by = cy;
        let slid = false;
        for (const [fx, fy, fd] of [
          [kl, cy, cx - kl],
          [kr, cy, kr - cx],
          [cx, kt, cy - kt],
          [cx, kb, kb - cy],
        ] as const) {
          if (fx < xl || fx > xr || fy < yt || fy > yb) continue;
          if (fd < bestD) {
            bestD = fd;
            bx = fx;
            by = fy;
            slid = true;
          }
        }
        if (slid) {
          cx = bx;
          cy = by;
        } else {
          // No face of the keep-out lands inside the frame's inset box: park on the frame corner
          // farthest from the content.
          const midX = (box.l + box.r) * 0.5;
          const midY = (box.t + box.b) * 0.5;
          cx = midX < (xl + xr) * 0.5 ? xr : xl;
          cy = midY < (yt + yb) * 0.5 ? yb : yt;
        }
      }
    }
    const bendPx = clamp(props.bend, 0, 1) * BEND_PX;
    const pitch = Math.max(8, props.spacing);
    // A lattice line inks the cells it crosses: a half width just over half a cell keeps it a continuous
    // hairline at any cell size instead of breaking into dashes.
    const lineW = cell * 0.55;
    const invRx = 1 / rx;
    const invRy = 1 / ry;
    const nRx = 1 / (rx * rx);
    const nRy = 1 / (ry * ry);
    const invNoise = 1 / NOISE_PX;

    let i = 0;
    for (let y = 0; y < rows; y++) {
      const py = (y + 0.5) * cell;
      const qy = (py - cy) * invRy;
      for (let x = 0; x < cols; x++, i++) {
        const px = (x + 0.5) * cell;
        const qx = (px - cx) * invRx;
        const d2 = qx * qx + qy * qy;
        let sx = px;
        let sy = py;
        let lift = 0;
        let edge = 0;
        let sp = 0;
        let vl = 0;
        if (d2 < 1) {
          const d = Math.sqrt(d2);
          const len = Math.hypot(px - cx, py - cy);
          if (len > 0.001) {
            // The lens bends radially, from nothing through its centre to the full offset at its rim, so
            // the field inside is sampled closer to the centre than where it shows: a magnifier's push.
            const off = bendPx * d * d * d;
            sx = px - ((px - cx) / len) * off;
            sy = py - ((py - cy) / len) * off;
          }
          // A thick slab is nearly clear through the centre and densest at its curved edge, where the
          // tone gathers into one screened band rather than a gradient that would read as a blur.
          lift = LIFT + LIFT_EDGE * smoothstep(0.8, 0.94, d);
          if (d >= EDGE_IN) edge = EDGE;
          // The specular rim faces the light: a bright hairline at the very edge and a dimmer one inside
          // it, two tone steps and never a glow.
          const nx = (px - cx) * nRx;
          const ny = (py - cy) * nRy;
          const nl = Math.hypot(nx, ny) || 1;
          const facing = (nx * LIGHT_X + ny * LIGHT_Y) / nl;
          if (facing > ARC && d >= SPEC2_IN && d <= 1) {
            sp = d >= SPEC1_IN ? 2 : d <= SPEC2_OUT ? 1 : 0;
          }
          // The slab's own tint, for a page that gives bg a color: deepest at the rim.
          vl = 0.8 + 0.2 * d * d;
        }
        // The printed field: a fine lattice at `pitch` over broad noise, sampled where the lens sent it.
        // It is at full strength through the rim and a short skirt beyond it, then settles toward the
        // ground with distance, so the displacement at the slab's edge is what the eye finds.
        const gain = FIELD_FLOOR + (1 - FIELD_FLOOR) * (1 - smoothstep(FIELD_IN2, FIELD_OUT2, d2));
        const mx = ((sx % pitch) + pitch) % pitch;
        const my = ((sy % pitch) + pitch) % pitch;
        const dx = Math.min(mx, pitch - mx);
        const dy = Math.min(my, pitch - my);
        const ld = Math.min(dx, dy);
        const line = ld >= lineW ? 0 : (lineW - ld) / lineW;
        const broad = readTile(tile, sx * invNoise, sy * invNoise);
        let v = (line * LINE_TONE + Math.max(0, broad - KNEE) * NOISE_GAIN) * gain;
        if (lift > v) v = lift;
        if (edge > v) v = edge;
        values[i] = v > 1 ? 1 : v;
        spec[i] = sp;
        veils[i] = vl;
      }
    }

    const lv = Math.max(2, Math.min(6, Math.round(props.levels)));
    const maskSize = props.mask === "bayer" ? BAYER_SIZE : BLUE_SIZE;
    const screen = props.mask === "bayer" ? bayerMatrix(BAYER_SIZE) : blueNoiseMatrix(BLUE_SIZE);
    const bands = ditherLevels(values, cols, rows, lv, screen, maskSize);
    const top = lv - 1;
    const [fr, fgv, fb, fa] = fgC;
    const [ar, ag, ab, aa] = specC;
    const [br, bgv, bb, ba] = bgC;
    const fgA = fa / 255;
    const acA = aa / 255;
    const bgA = ba / 255;
    const data = imageData.data;
    for (let k = 0; k < i; k++) {
      const j = k * 4;
      let ir = fr;
      let ig = fgv;
      let ib = fb;
      let a1 = ((bands[k] ?? 0) / top) * inkMax * fgA;
      const sp = spec[k];
      if (sp !== 0) {
        ir = ar;
        ig = ag;
        ib = ab;
        a1 = (sp === 2 ? SPEC_HI : SPEC_LO) * inkMax * acA;
      }
      // Straight-alpha compositing: the ink sits over the slab's bg veil, which sits over the ground.
      // The veil is a tint, not ink, so intensity does not scale it.
      const a2 = (veils[k] ?? 0) * VEIL_MAX * bgA;
      const a = a1 + a2 * (1 - a1);
      if (a <= 0) {
        data[j + 3] = 0;
        continue;
      }
      data[j] = Math.round((ir * a1 + br * a2 * (1 - a1)) / a);
      data[j + 1] = Math.round((ig * a1 + bgv * a2 * (1 - a1)) / a);
      data[j + 2] = Math.round((ib * a1 + bb * a2 * (1 - a1)) / a);
      data[j + 3] = Math.round(a * 255);
    }
    ctx.putImageData(imageData, 0, 0);
    host.dataset.picaReady = "true";
  }

  sheet.setRules(rules(sheet.selector, props));
  headlineEl.textContent = props.headline;
  subheadEl.textContent = props.subhead;
  renderActions();
  readColors();
  rebuildField();
  layout();
  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: STILL_TIME, frame: draw });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.headline !== before.headline) headlineEl.textContent = props.headline;
      if (props.subhead !== before.subhead) subheadEl.textContent = props.subhead;
      if (!sameJson(before.actions, props.actions)) renderActions();
      if (props.align !== before.align || props.minHeight !== before.minHeight) sheet.setRules(rules(sheet.selector, props));
      if (palette.refresh()) readColors();
      if (props.seed !== before.seed || Number.isNaN(builtSeed)) rebuildField();
      layout();
      loop.update({ paused: props.paused, time: props.time, fps: props.fps });
      loop.redraw();
    },
    destroy() {
      loop.destroy();
      surface.destroy();
      palette.destroy();
      under.remove();
      headlineEl.remove();
      subheadEl.remove();
      actionsEl.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};
