import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { parseColor } from "../../../lib/color";
import { bayerMatrix } from "../../../lib/dither";
import { createLoop } from "../../../lib/loop";
import { createNoise } from "../../../lib/noise";
import { watchPalette } from "../../../lib/palette";
import { hashSeed } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

export interface CityGridProps extends MotionProps {
  /** Share of blocks that carry a building, from 0 to 1. The rest stay empty lots. */
  density: number;
  /** The street grid's module on screen, in CSS pixels. A block spans a few modules on each side. */
  blockSize: number;
  /** Height of the skyline from 0 to 1. 0 leaves a city of one-storey blocks. */
  height: number;
  /** How wide each cluster of tall blocks grows. Larger spreads reach further past the downtown. */
  spread: number;
  /** Tilt of the axonometric view in degrees. A low angle looks across the roofs. */
  angle: number;
  /** Pan speed along one street axis. 0 holds the city still. */
  speed: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: CityGridProps = {
  density: 0.7,
  blockSize: 18,
  height: 0.5,
  spread: 1.5,
  angle: 30,
  speed: 0.12,
  fps: 20,
  paused: false,
  time: null,
  seed: 1,
};

const DEG = Math.PI / 180;
/** The frame held under reduced motion, and the time captures use. The pinned centre keeps a downtown
 *  cluster a little off centre there. */
const STILL = 1200;
/** Share of pixels the screened wall inks in fg. A little over a third coverage over the ground reads as
 *  the mid tone. */
const MID_TONE = 0.38;
/** Edge of the Bayer tile the screened wall is painted with. */
const SCREEN_TILE = 8;
/** Grid modules along one block's edge, and along the street between two blocks. Streets are left as
 *  bare ground, so a wider module count here is what keeps them legible. */
const BLOCK_UNITS = 4;
const STREET_UNITS = 1.4;
const PITCH = BLOCK_UNITS + STREET_UNITS;
/** Blocks between the centres of high clusters along the pan axis. */
const CENTER_GAP = 7;
/** The most a building rises, in storeys above the first, at height 1. */
const MAX_STORIES = 10;
/** Height of one storey, in grid modules. A storey is a little under a fifth of a block's edge, so a
 *  tall tower stands clear of its own footprint. */
const STOREY = 0.65;
/** Margin around the view in CSS pixels, so faces are never clipped mid edge. */
const MARGIN_PX = 48;
/** Tints the empty lot outlines back from the walls. */
const PAD_ALPHA = 0.25;

export const mount: Mount<CityGridProps> = (host, initial = {}) => {
  let props: CityGridProps = { ...defaults, ...initial };
  let noise = createNoise(props.seed);
  labelHost(host, "");

  const surface = createCanvas(host, { onResize: () => loop.redraw() });
  const ctx = surface.canvas.getContext("2d");
  const palette = watchPalette(host, () => loop.redraw());

  const tile = document.createElement("canvas");
  tile.width = SCREEN_TILE;
  tile.height = SCREEN_TILE;
  const tileCtx = tile.getContext("2d");
  const matrix = bayerMatrix(SCREEN_TILE);
  const pts: number[] = [];
  let screen: CanvasPattern | null = null;
  let screenColor = "";

  /** A stream per cluster centre, kept apart from the per-block stream. */
  function centerRand(k: number, n: number): number {
    return hashSeed(props.seed ^ 0x9e3779b9, k, n) / 4294967296;
  }

  /** The height field in 0..1 at block (bi, bj): a low rolling base plus smooth bumps around seeded
   *  centres, so the city grows a downtown and outskirts instead of uniform noise. The centre at
   *  k = 0 stays near the origin, which is where the camera sits at the still frame. */
  function field(bi: number, bj: number): number {
    let bump = 0;
    const k0 = Math.round(bj / CENTER_GAP);
    for (let k = k0 - 2; k <= k0 + 2; k++) {
      const pinned = k === 0;
      const cj = k * CENTER_GAP + (pinned ? 1.5 : 0) + (centerRand(k, 1) - 0.5) * CENTER_GAP * (pinned ? 0.1 : 0.6);
      const ci = (centerRand(k, 2) - 0.5) * CENTER_GAP * (pinned ? 0.1 : 0.9) - (pinned ? 1.8 : 0);
      const radius = props.spread * (1.2 + 1.8 * centerRand(k, 3));
      const strength = pinned ? 0.9 + 0.1 * centerRand(k, 4) : 0.4 + 0.5 * centerRand(k, 4);
      const dx = bi - ci;
      const dy = bj - cj;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < radius) {
        const s = 1 - d / radius;
        bump = Math.max(bump, strength * s * s * (3 - 2 * s));
      }
    }
    const base = 0.2 + 0.18 * noise.noise2(bi * 0.33, bj * 0.33);
    return base * (1 - bump) + bump;
  }

  /** The mid-tone wall's paint: a Bayer screen of fg dots. Rebuilt when the palette's fg changes. */
  function screenPattern(): CanvasPattern | null {
    const fg = palette.colors.fg;
    if (screen && screenColor === fg) return screen;
    if (!ctx || !tileCtx) return null;
    const [r, g, b] = parseColor(fg);
    const img = tileCtx.createImageData(SCREEN_TILE, SCREEN_TILE);
    for (let i = 0; i < matrix.length; i++) {
      img.data[i * 4] = r;
      img.data[i * 4 + 1] = g;
      img.data[i * 4 + 2] = b;
      img.data[i * 4 + 3] = (matrix[i] ?? 0) < MID_TONE ? 255 : 0;
    }
    tileCtx.putImageData(img, 0, 0);
    screen = ctx.createPattern(tile, "repeat");
    screenColor = fg;
    return screen;
  }

  function draw(t: number): void {
    const { width, height, dpr, cssWidth, cssHeight } = surface;
    if (ctx && width > 0 && height > 0) {
      const W = cssWidth;
      const H = cssHeight;
      const W2 = W / 2;
      const H2 = H / 2;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // On a small host the module shrinks so a street still reads across it.
      const fit = Math.min(1, Math.max(0.7, Math.min(W, H) / 760));
      const u = Math.min(96, Math.max(4, props.blockSize)) * fit;
      const tilt = Math.min(80, Math.max(5, props.angle)) * DEG;
      const ca = Math.cos(tilt);
      const sa = Math.sin(tilt);
      const cau = ca * u;
      const sau = sa * u;
      const density = Math.min(1, Math.max(0, props.density));
      const rise = Math.min(1, Math.max(0, props.height));
      const maxZ = u * STOREY * (1 + rise * MAX_STORIES);
      const pitch = PITCH * u;

      // The pan runs along the world j axis. One module projects to u pixels, so a block takes at
      // least thirty seconds to cross even at full speed.
      const crossing = W * ca + H * sa + 4 * pitch * (ca + sa);
      const rate = (Math.min(1, Math.max(0, props.speed)) * crossing) / (30 * u);
      const cx = 0;
      const cy = (t / 1000) * rate;

      const m = MARGIN_PX;
      const pHalf = (W2 + m) / cau;
      const qLo = (-H2 - m) / sau;
      const qHi = (H2 + m + maxZ) / sau;
      const iLo = cx + (-pHalf + qLo) / 2;
      const iHi = cx + (pHalf + qHi) / 2;
      const jLo = cy + (qLo - pHalf) / 2;
      const jHi = cy + (qHi + pHalf) / 2;
      const bILo = Math.floor(iLo / PITCH);
      const bIHi = Math.floor(iHi / PITCH);
      const bJLo = Math.floor(jLo / PITCH);
      const bJHi = Math.floor(jHi / PITCH);
      const sLo = bILo + bJLo;
      const sHi = bIHi + bJHi;

      const fg = palette.colors.fg;
      const muted = palette.colors.muted;
      const mid = screenPattern();

      const corner = (wx: number, wy: number, z: number): void => {
        const ax = wx - cx;
        const ay = wy - cy;
        pts.push(W2 + (ax - ay) * cau, H2 + (ax + ay) * sau - z);
      };
      const quad = (path: Path2D, a: number, b: number, c: number, d: number): void => {
        path.moveTo(pts[a] ?? 0, pts[a + 1] ?? 0);
        path.lineTo(pts[b] ?? 0, pts[b + 1] ?? 0);
        path.lineTo(pts[c] ?? 0, pts[c + 1] ?? 0);
        path.lineTo(pts[d] ?? 0, pts[d + 1] ?? 0);
        path.closePath();
      };

      // Back to front: a larger bi + bj is nearer the viewer. Blocks on one diagonal can never
      // overlap, so a diagonal's faces gather into one path per role and nearer diagonals paint
      // over farther ones.
      for (let s = sLo; s <= sHi; s++) {
        const erase = new Path2D();
        const flat = new Path2D();
        const screened = new Path2D();
        const roofs = new Path2D();
        const pads = new Path2D();
        const lo = Math.max(bILo, s - bJHi);
        const hi = Math.min(bIHi, s - bJLo);
        for (let bi = lo; bi <= hi; bi++) {
          const bj = s - bi;
          const gx = W2 + (bi * PITCH - cx - (bj * PITCH - cy)) * cau;
          const gy = H2 + (bi * PITCH - cx + (bj * PITCH - cy)) * sau;
          if (gx < -m - pitch || gx > W + m + pitch || gy < -m - pitch - maxZ || gy > H + m + pitch) continue;

          const h = hashSeed(props.seed, bi, bj);
          pts.length = 0;
          if (((h & 1023) / 1024) >= density) {
            // An empty lot keeps only its outline, which is how the street plan still reads.
            corner(bi * PITCH + 0.3, bj * PITCH + 0.3, 0);
            corner(bi * PITCH + BLOCK_UNITS - 0.3, bj * PITCH + 0.3, 0);
            corner(bi * PITCH + BLOCK_UNITS - 0.3, bj * PITCH + BLOCK_UNITS - 0.3, 0);
            corner(bi * PITCH + 0.3, bj * PITCH + BLOCK_UNITS - 0.3, 0);
            quad(pads, 0, 2, 4, 6);
            continue;
          }

          const r2 = ((h >>> 10) & 1023) / 1024;
          const ix = 0.3 + 0.3 * (((h >>> 20) & 255) / 256);
          const iy = 0.3 + 0.3 * ((h >>> 28) / 16);
          const x0 = bi * PITCH + ix;
          const x1 = bi * PITCH + BLOCK_UNITS - ix;
          const y0 = bj * PITCH + iy;
          const y1 = bj * PITCH + BLOCK_UNITS - iy;
          const stories = Math.max(1, Math.round(Math.min(1, field(bi, bj) * (0.65 + 0.55 * r2)) * (1 + rise * MAX_STORIES)));
          const z = stories * u * STOREY;
          corner(x0, y0, 0);
          corner(x1, y0, 0);
          corner(x1, y1, 0);
          corner(x0, y1, 0);
          corner(x0, y0, z);
          corner(x1, y0, z);
          corner(x1, y1, z);
          corner(x0, y1, z);
          // Base corners sit at 0..7, top corners at 8..15. The screened wall and the roof are erased
          // down to the ground, so both occlude whatever stands behind them.
          quad(erase, 12, 14, 6, 4);
          quad(erase, 8, 10, 12, 14);
          quad(flat, 10, 12, 4, 2);
          quad(screened, 12, 14, 6, 4);
          quad(roofs, 8, 10, 12, 14);
        }
        ctx.globalCompositeOperation = "destination-out";
        ctx.fill(erase);
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = fg;
        ctx.fill(flat);
        if (mid) {
          ctx.fillStyle = mid;
          ctx.fill(screened);
        }
        ctx.strokeStyle = muted;
        ctx.lineWidth = 1;
        ctx.stroke(roofs);
        ctx.globalAlpha = PAD_ALPHA;
        ctx.stroke(pads);
        ctx.globalAlpha = 1;
      }
    }
    host.dataset.picaReady = "true";
  }

  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: STILL, frame: draw });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.seed !== before.seed) noise = createNoise(props.seed);
      palette.refresh();
      loop.update({ paused: props.paused, time: props.time, fps: props.fps });
      loop.redraw();
    },
    destroy() {
      loop.destroy();
      surface.destroy();
      palette.destroy();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};
