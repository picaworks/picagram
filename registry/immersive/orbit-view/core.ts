import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { bayerAt } from "../../../lib/dither";
import { GRID_FONT } from "../../../lib/font";
import { geoDecode, geoGraticule, geoRaster, geoVector } from "../../../lib/geo";
import { GEO_LAND } from "../../../lib/geo-land";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { createRng, hashSeed } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

export interface OrbitViewProps extends MotionProps {
  /** Text alternative naming the view. Empty hides the host from assistive technology. */
  label: string;
  /** Spacecraft height above the surface in kilometres. Higher sees more of the disc and a flatter limb. */
  altitude: number;
  /** Camera tilt away from straight down, in degrees. 0 looks at the sub-point, 80 nearly at the horizon. */
  tilt: number;
  /** Compass azimuth of the camera's lean and of the ground track, in degrees clockwise from north. */
  heading: number;
  /** Starting latitude of the point under the spacecraft, in degrees north. */
  lat: number;
  /** Starting longitude of the point under the spacecraft, in degrees east. */
  lon: number;
  /** Ground track speed. 0 holds the sub-point at lat and lon. */
  speed: number;
  /** Spacing of the land dots in CSS pixels. */
  pitch: number;
  /** Graticule spacing in degrees. 0 draws no graticule. */
  graticule: number;
  /** Strength of the dithered atmosphere bands above the limb. 0 draws no atmosphere. */
  atmosphere: number;
  /** Show the telemetry block. */
  telemetry: boolean;
  /** Frames per second ceiling. */
  fps: number;
  /** Font for the telemetry readout. */
  fontFamily: string;
}

export const defaults: OrbitViewProps = {
  label: "Earth's limb from orbit",
  altitude: 420,
  tilt: 35,
  heading: 110,
  lat: 42,
  lon: 12,
  speed: 0.15,
  pitch: 4,
  graticule: 15,
  atmosphere: 0.6,
  telemetry: true,
  fps: 24,
  fontFamily: GRID_FONT,
  paused: false,
  time: null,
  seed: 1,
};

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
/** Projected points below this denominator are behind the camera and clamp off the frame. */
const DEN_EPS = 0.02;
/** Land mask size: half degree cells, fine enough for a coastline to read at this scale. */
const MASK_W = 720;
const MASK_H = 360;
/** Atmosphere shell radii in Earth radii, about 40, 100, and 190 km up. */
const SHELLS = [1.006, 1.016, 1.03];
/** Peak dot density of each atmosphere band, thinning away from the surface. */
const BAND_DENSITY = [0.5, 0.27, 0.13];
/** Screen pitch of the atmosphere dither grid in CSS pixels. */
const BAND_PITCH = 3;
/** Samples around a horizon circle. */
const ARC_N = 240;

/** One sampled horizon circle: clamped screen positions and which samples sit in front of the camera. */
interface Arc {
  x: Float64Array;
  y: Float64Array;
  ok: boolean[];
}

export const mount: Mount<OrbitViewProps> = (host, initial = {}) => {
  let props: OrbitViewProps = { ...defaults, ...initial };

  // The land mask is fixed data. Each land cell contributes one dot, jittered inside its cell so the
  // field never reads as latitudes and longitudes under foreshortening.
  const rng = createRng(props.seed);
  const cells: number[] = [];
  const mask = geoRaster(geoDecode(GEO_LAND), MASK_W, MASK_H);
  for (let row = 0; row < MASK_H; row++) {
    for (let col = 0; col < MASK_W; col++) {
      if (mask[row * MASK_W + col] === 0) continue;
      cells.push(...geoVector(-180 + (col + rng()) * (360 / MASK_W), 90 - (row + rng()) * (180 / MASK_H)));
    }
  }
  const land = new Float32Array(cells);

  const surface = createCanvas(host, { onResize: () => loop.redraw() });
  const ctx = surface.canvas.getContext("2d");
  const palette = watchPalette(host, () => loop.redraw());
  labelHost(host, props.label);

  function draw(t: number): void {
    const { width, height, dpr, cssWidth, cssHeight } = surface;
    if (ctx && width > 0 && height > 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const P = 1 + props.altitude / 6371;
      const invP = 1 / P;
      const horizon = Math.acos(Math.min(1, invP));
      const tiltR = props.tilt * DEG;
      const cosT = Math.cos(tiltR);
      const sinT = Math.sin(tiltR);
      // The sub-point and its track direction drift along the heading's great circle.
      const hdg = props.heading * DEG;
      const latR = props.lat * DEG;
      const lonR = props.lon * DEG;
      const s0 = geoVector(props.lon, props.lat);
      const t0x = Math.sin(hdg) * Math.cos(lonR) - Math.cos(hdg) * Math.sin(latR) * Math.sin(lonR);
      const t0y = Math.cos(hdg) * Math.cos(latR);
      const t0z = -Math.sin(hdg) * Math.sin(lonR) - Math.cos(hdg) * Math.sin(latR) * Math.cos(lonR);
      // One degree of ground track per second at speed 1: a pass over the visible cap takes minutes.
      const drift = (t / 1000) * props.speed * DEG;
      const cosD = Math.cos(drift);
      const sinD = Math.sin(drift);
      const sX = s0[0] * cosD + t0x * sinD;
      const sY = s0[1] * cosD + t0y * sinD;
      const sZ = s0[2] * cosD + t0z * sinD;
      const tX = t0x * cosD - s0[0] * sinD;
      const tY = t0y * cosD - s0[1] * sinD;
      const tZ = t0z * cosD - s0[2] * sinD;

      // The camera frame: D is the view direction, U the frame's up, R its right.
      const dX = tX * sinT - sX * cosT;
      const dY = tY * sinT - sY * cosT;
      const dZ = tZ * sinT - sZ * cosT;
      const uX = tX * cosT + sX * sinT;
      const uY = tY * cosT + sY * sinT;
      const uZ = tZ * cosT + sZ * sinT;
      const rX = tY * sZ - tZ * sY;
      const rY = tZ * sX - tX * sZ;
      const rZ = tX * sY - tY * sX;

      // Framing: the limb's peak lands at the upper third and the land band below it fills
      // the middle of the frame. In normalized screen units a point is a tangent of its
      // angle off the camera axis, so one scale fits every altitude.
      const denTop = P * cosT - Math.cos(horizon + tiltR);
      const topN = denTop > DEN_EPS ? (Math.sin(horizon + tiltR) - P * sinT) / denTop : 3;
      const subN = -Math.tan(tiltR);
      const band = Math.max(0.08, topN - subN);
      const focal = (0.42 * cssHeight) / band;
      const cx = cssWidth / 2;
      const cy = 0.3 * cssHeight + topN * focal;
      const toX = (nx: number): number => cx + nx * focal;
      const toY = (ny: number): number => cy - ny * focal;

      /** Snyder's tilted perspective: depth toward the sub-point, distance along the camera axis,
       *  and the projected position in tangent units, pinned below the horizon of the camera plane. */
      const project = (qx: number, qy: number, qz: number): [number, number, number, number] => {
        const den = qx * dX + qy * dY + qz * dZ + P * cosT;
        const denC = Math.max(DEN_EPS, den);
        return [qx * sX + qy * sY + qz * sZ, den, (qx * rX + qy * rY + qz * rZ) / denC, (qx * uX + qy * uY + qz * uZ - P * sinT) / denC];
      };

      /** Samples the limb of a sphere of `radius` around the sub-point, one entry per azimuth step
       *  starting on the hidden side. Positions are clamped so off-camera samples land far off frame. */
      function horizonArc(radius: number): Arc {
        const cosC = Math.min(1, radius * invP);
        const sinC = Math.sqrt(Math.max(0, 1 - cosC * cosC));
        const arc: Arc = { x: new Float64Array(ARC_N + 1), y: new Float64Array(ARC_N + 1), ok: [] };
        for (let i = 0; i <= ARC_N; i++) {
          const th = Math.PI + (i / ARC_N) * TAU;
          const cth = Math.cos(th);
          const sth = Math.sin(th);
          const p = project(
            radius * (sX * cosC + sinC * (cth * tX - sth * rX)),
            radius * (sY * cosC + sinC * (cth * tY - sth * rY)),
            radius * (sZ * cosC + sinC * (cth * tZ - sth * rZ)),
          );
          arc.x[i] = toX(p[2]);
          arc.y[i] = toY(p[3]);
          arc.ok[i] = p[1] > DEN_EPS;
        }
        return arc;
      }

      const arcs = [1, ...SHELLS.filter((r) => r < P * 0.999)].map(horizonArc);
      const surfaceArc = arcs[0]!;

      // Land dots, snapped to a pitch grid so the stipple stays even on both grounds.
      const pitch = props.pitch;
      const dotR = Math.max(0.6, Math.min(1.7, pitch * 0.34));
      const seen = new Set<number>();
      ctx.fillStyle = palette.colors.fg;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      for (let i = 0; i < land.length; i += 3) {
        const p = project(land[i]!, land[i + 1]!, land[i + 2]!);
        // Sit a hair inside the horizon so a dot never touches the drawn limb curve.
        if (p[0] < invP + 0.0015 || p[1] <= DEN_EPS) continue;
        const sx = toX(p[2]);
        const sy = toY(p[3]);
        const key = Math.round(sx / pitch) * 100000 + Math.round(sy / pitch);
        if (seen.has(key)) continue;
        seen.add(key);
        ctx.rect(sx - dotR, sy - dotR, dotR * 2, dotR * 2);
      }
      ctx.fill();

      // The graticule, clipped at the horizon and at the camera plane.
      if (props.graticule > 0) {
        ctx.strokeStyle = palette.colors.muted;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        for (const line of geoGraticule(props.graticule, 1)) {
          let pen = false;
          for (let i = 0; i + 1 < line.length; i += 2) {
            const p = project(...geoVector(line[i]!, line[i + 1]!));
            if (p[0] >= invP && p[1] > DEN_EPS) {
              if (pen) ctx.lineTo(toX(p[2]), toY(p[3]));
              else ctx.moveTo(toX(p[2]), toY(p[3]));
              pen = true;
            } else pen = false;
          }
        }
        ctx.stroke();
      }

      // The limb, a hairline so the horizon reads as a curve and not a gradient.
      ctx.strokeStyle = palette.colors.fg;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i <= ARC_N; i++) {
        // Draw each visible run plus one clamped sample past its ends so the stroke exits the frame.
        if (surfaceArc.ok[i] || (i > 0 && surfaceArc.ok[i - 1]!) || (i < ARC_N && surfaceArc.ok[i + 1]!)) {
          if (pen) ctx.lineTo(surfaceArc.x[i]!, surfaceArc.y[i]!);
          else ctx.moveTo(surfaceArc.x[i]!, surfaceArc.y[i]!);
          pen = true;
        } else pen = false;
      }
      ctx.stroke();

      // Atmosphere: stepped bands between the surface limb and each shell's limb, stippled
      // through the Bayer matrix so they read as printed steps and never as a glow.
      if (props.atmosphere > 0) {
        const o = hashSeed(props.seed, 3);
        ctx.fillStyle = palette.colors.accent;
        for (let b = 0; b + 1 < arcs.length; b++) {
          const inner = arcs[b]!;
          const outer = arcs[b + 1]!;
          const cut = BAND_DENSITY[b]! * props.atmosphere;
          if (cut <= 0.01) continue;
          ctx.globalAlpha = 1;
          ctx.beginPath();
          for (let i = 0; i <= ARC_N; i++) {
            if (!inner.ok[i]) continue;
            const ax = inner.x[i]!;
            const ay = inner.y[i]!;
            const dx = outer.x[i]! - ax;
            const dy = outer.y[i]! - ay;
            const steps = Math.max(2, Math.ceil((Math.abs(dx) + Math.abs(dy)) / BAND_PITCH));
            for (let j = 0; j <= steps; j++) {
              const gx = Math.round((ax + (dx * j) / steps) / BAND_PITCH);
              const gy = Math.round((ay + (dy * j) / steps) / BAND_PITCH);
              if (bayerAt(4, gx + (o & 3), gy + ((o >> 4) & 3)) < cut) ctx.rect(gx * BAND_PITCH - 0.7, gy * BAND_PITCH - 0.7, 1.4, 1.4);
            }
          }
          ctx.fill();
        }
      }

      // Telemetry: only what the props and the clock of the animation itself give.
      if (props.telemetry) {
        const la = Math.asin(Math.max(-1, Math.min(1, sY))) / DEG;
        const lo = Math.atan2(sX, sZ) / DEG;
        const sec = t / 1000;
        const lines = [
          `ALT ${Math.round(props.altitude)} KM`,
          `SUB ${Math.abs(la).toFixed(1)}${la < 0 ? "S" : "N"} ${Math.abs(lo).toFixed(1)}${lo < 0 ? "W" : "E"}`,
          `T+ ${Math.floor(sec / 60)}:${(sec % 60).toFixed(1)}`,
        ];
        ctx.font = `11px ${props.fontFamily}`;
        ctx.fillStyle = palette.colors.muted;
        for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i]!, 14, cssHeight - 14 - (lines.length - 1 - i) * 15);
      }
      ctx.globalAlpha = 1;
    }
    host.dataset.picaReady = "true";
  }

  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: 1200, frame: draw });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.label !== before.label) labelHost(host, props.label);
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
