import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { createLoop } from "../../../lib/loop";
import { FALLBACK_RAMP, measureRamp, pick } from "../../../lib/ramp";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiSolidProps extends MotionProps {
  /** Solid to rasterize: a torus, a sphere, or a cube. */
  shape: "torus" | "sphere" | "cube";
  /** Rotation speed. 0 holds the solid at its starting orientation, and 2 tumbles it quickly. */
  speed: number;
  /** Diameter of the solid as a fraction of the host's smaller side. */
  size: number;
  /** Glyphs to shade with, in any order: they are sorted by the ink each one puts down in the font. */
  glyphs: string;
  /** Glyph size in CSS pixels. */
  fontSize: number;
  /** CSS font-family stack for the glyphs. Must be monospace. */
  fontFamily: string;
  /** Line height as a multiple of the glyph size. */
  lineHeight: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: AsciiSolidProps = {
  shape: "torus",
  speed: 0.6,
  size: 0.8,
  glyphs: FALLBACK_RAMP,
  fontSize: 12,
  fontFamily: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace',
  lineHeight: 1.2,
  fps: 30,
  paused: false,
  time: null,
  seed: 1,
};

const TAU = Math.PI * 2;
/** Target cell-units between adjacent samples, so the surface leaves no holes at its widest. */
const SPACING = 0.7;
/** Camera distance in world units, where every solid has a bounding radius of 1. */
const CAM_DIST = 2.6;
/** Radians per second per unit of speed, tilting the solid forward or back. */
const RATE_A = 0.5;
/** Radians per second per unit of speed, turning the solid around its vertical axis. */
const RATE_B = 0.8;
/** Constant tilt added to every frame, so the solid never sits edge-on or face-on at rest. */
const BASE_TILT = 0.39;
/** Constant turn added to every frame, so the default view shows more than one face. */
const BASE_SPIN = 0;
/** Minimum lit fraction, so the shaded side of the solid is dim rather than invisible. */
const AMBIENT = 0.16;
const LIGHT_MAG = Math.sqrt(3);
/** A fixed light from the upper left, and slightly toward the viewer. */
const LIGHT: readonly [number, number, number] = [-1 / LIGHT_MAG, 1 / LIGHT_MAG, -1 / LIGHT_MAG];
/** Sweep radius and tube radius of the torus, in world units. Their sum is the bounding radius. */
const TORUS_R2 = 2 / 3;
const TORUS_R1 = 1 / 3;
/** Half the cube's side, chosen so its corners reach the bounding radius of 1. */
const CUBE_HALF = 1 / Math.sqrt(3);
const CUBE_FACES: readonly (readonly [number, number, number])[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

/** Sample steps around a loop of this radius, in grid cells, close enough to leave no holes. */
function ringSteps(radiusCells: number, min: number, max: number): number {
  const raw = Math.ceil((TAU * Math.max(0, radiusCells)) / SPACING);
  return Math.min(max, Math.max(min, raw));
}

/** Sample steps across a span of this length, in grid cells, close enough to leave no holes. */
function spanSteps(lengthCells: number, min: number, max: number): number {
  const raw = Math.ceil(Math.max(0, lengthCells) / SPACING);
  return Math.min(max, Math.max(min, raw));
}

export const mount: Mount<AsciiSolidProps> = (host, initial = {}) => {
  let props: AsciiSolidProps = { ...defaults, ...initial };
  let lastTime = 0;
  let depth = new Float64Array(0);

  labelHost(host, "");
  const grid = createGrid(host, gridOptions(props), () => draw(lastTime));
  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: 1200, frame: draw });

  function gridOptions(p: AsciiSolidProps): GridOptions {
    return { fontFamily: p.fontFamily, fontSize: p.fontSize, columns: 0, lineHeight: p.lineHeight, renderer: "auto", color: "" };
  }

  function draw(t: number): void {
    lastTime = t;
    grid.clear();
    const { cols, rows, aspect } = grid;
    const scale = (props.size / 2) * Math.min(cols, rows / aspect);
    if (scale > 0) {
      if (depth.length !== cols * rows) depth = new Float64Array(cols * rows);
      depth.fill(-Infinity);
      const ramp = measureRamp(props.glyphs, props.fontFamily, props.lineHeight);
      const seconds = t / 1000;
      const angleA = (BASE_TILT + seconds * props.speed * RATE_A) % TAU;
      const angleB = (BASE_SPIN + seconds * props.speed * RATE_B) % TAU;
      const cosA = Math.cos(angleA);
      const sinA = Math.sin(angleA);
      const cosB = Math.cos(angleB);
      const sinB = Math.sin(angleB);
      const centerCol = (cols - 1) / 2;
      const centerRow = (rows - 1) / 2;
      const [lightX, lightY, lightZ] = LIGHT;

      // Rotates one surface sample (position and normal) by tilting it around the horizontal
      // axis and then turning it around the vertical axis, and, if it is the nearest sample so
      // far for its cell, shades it by the dot product of the rotated normal with the fixed light.
      function plot(x0: number, y0: number, z0: number, nx0: number, ny0: number, nz0: number): void {
        const y1 = y0 * cosA - z0 * sinA;
        const z1 = y0 * sinA + z0 * cosA;
        const x2 = x0 * cosB + z1 * sinB;
        const z2 = z1 * cosB - x0 * sinB;
        const ny1 = ny0 * cosA - nz0 * sinA;
        const nz1 = ny0 * sinA + nz0 * cosA;
        const nx2 = nx0 * cosB + nz1 * sinB;
        const nz2 = nz1 * cosB - nx0 * sinB;
        const zCam = z2 + CAM_DIST;
        if (zCam <= 0.01) return;
        const ooz = CAM_DIST / zCam;
        const col = Math.round(centerCol + x2 * ooz * scale);
        const row = Math.round(centerRow - y1 * ooz * scale * aspect);
        if (col < 0 || col >= cols || row < 0 || row >= rows) return;
        const idx = row * cols + col;
        if (ooz <= (depth[idx] ?? -Infinity)) return;
        depth[idx] = ooz;
        const lambert = nx2 * lightX + ny1 * lightY + nz2 * lightZ;
        const v = AMBIENT + (1 - AMBIENT) * Math.max(0, lambert);
        grid.set(col, row, pick(ramp, v));
      }

      if (props.shape === "torus") {
        const thetaN = ringSteps(TORUS_R1 * scale, 20, 160);
        const phiN = ringSteps((TORUS_R1 + TORUS_R2) * scale, 32, 460);
        const cosPhi = new Array<number>(phiN);
        const sinPhi = new Array<number>(phiN);
        for (let j = 0; j < phiN; j++) {
          const phi = (j / phiN) * TAU;
          cosPhi[j] = Math.cos(phi);
          sinPhi[j] = Math.sin(phi);
        }
        for (let i = 0; i < thetaN; i++) {
          const theta = (i / thetaN) * TAU;
          const ct = Math.cos(theta);
          const st = Math.sin(theta);
          const circleX = TORUS_R2 + TORUS_R1 * ct;
          for (let j = 0; j < phiN; j++) {
            const cp = cosPhi[j] ?? 1;
            const sp = sinPhi[j] ?? 0;
            plot(circleX * cp, circleX * sp, TORUS_R1 * st, ct * cp, ct * sp, st);
          }
        }
      } else if (props.shape === "sphere") {
        const thetaN = spanSteps(Math.PI * scale, 18, 210);
        const phiN = ringSteps(scale, 24, 460);
        const cosPhi = new Array<number>(phiN);
        const sinPhi = new Array<number>(phiN);
        for (let j = 0; j < phiN; j++) {
          const phi = (j / phiN) * TAU;
          cosPhi[j] = Math.cos(phi);
          sinPhi[j] = Math.sin(phi);
        }
        for (let i = 0; i <= thetaN; i++) {
          const theta = (i / thetaN) * Math.PI;
          const ct = Math.cos(theta);
          const st = Math.sin(theta);
          for (let j = 0; j < phiN; j++) {
            const cp = cosPhi[j] ?? 1;
            const sp = sinPhi[j] ?? 0;
            const x0 = st * cp;
            const z0 = st * sp;
            plot(x0, ct, z0, x0, ct, z0);
          }
        }
      } else {
        const n = spanSteps(2 * CUBE_HALF * scale, 8, 90);
        for (const face of CUBE_FACES) {
          const [nx, ny, nz] = face;
          for (let i = 0; i <= n; i++) {
            const u = (i / n) * 2 - 1;
            for (let j = 0; j <= n; j++) {
              const v = (j / n) * 2 - 1;
              let x0: number;
              let y0: number;
              let z0: number;
              if (nx !== 0) {
                x0 = nx * CUBE_HALF;
                y0 = u * CUBE_HALF;
                z0 = v * CUBE_HALF;
              } else if (ny !== 0) {
                x0 = u * CUBE_HALF;
                y0 = ny * CUBE_HALF;
                z0 = v * CUBE_HALF;
              } else {
                x0 = u * CUBE_HALF;
                y0 = v * CUBE_HALF;
                z0 = nz * CUBE_HALF;
              }
              plot(x0, y0, z0, nx, ny, nz);
            }
          }
        }
      }
    }
    grid.flush();
    host.dataset.picaReady = "true";
  }

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.fontFamily !== before.fontFamily || props.fontSize !== before.fontSize || props.lineHeight !== before.lineHeight) {
        grid.update(gridOptions(props));
      }
      loop.update({ paused: props.paused, time: props.time, fps: props.fps });
    },
    destroy() {
      loop.destroy();
      grid.destroy();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};
