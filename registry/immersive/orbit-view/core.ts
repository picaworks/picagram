import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { GRID_FONT } from "../../../lib/font";
import { geoDecode, geoRaster, geoVector } from "../../../lib/geo";
import { GEO_LAND } from "../../../lib/geo-land";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
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

const DEG = Math.PI / 180;
/** Depth along the camera axis below which a point sits behind the camera and clamps off the frame. */
const DEN_EPS = 0.02;
/** Atmosphere shell radii in Earth radii, about 40, 100, and 190 km up. */
const SHELLS = [1.006, 1.016, 1.03];
/** Peak dot density of each atmosphere band, thinning away from the surface. */
const BAND_DENSITY = [0.5, 0.27, 0.13];
/** The 4 by 4 Bayer matrix bayerAt(4) returns, times 16 so a band's ink test is one integer compare.
 *  The table is written out rather than built by lib/dither.ts because the generic builder and its
 *  cache weigh more than sixteen numbers in a bundle that needs only this one matrix. */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** Samples around a horizon circle. */
const ARC_N = 240;

export const mount: Mount<OrbitViewProps> = (host, initial = {}) => {
  let props: OrbitViewProps = { ...defaults, ...initial };

  // The land mask is fixed data. Each covered half-degree cell contributes one dot, jittered inside
  // its cell so the field never reads as latitudes and longitudes under foreshortening.
  const mask = geoRaster(geoDecode(GEO_LAND), 720, 360);
  const land: number[] = [];
  for (let row = 0; row < 360; row++) {
    for (let col = 0; col < 720; col++) {
      const i = row * 720 + col;
      if (!mask[i]) continue;
      // A small seeded mix stands in for lib/rng here: two rounds is avalanche enough for a
      // cell-sized jitter, and the whole rng module costs more than this.
      let h = Math.imul(i ^ props.seed, 0x9e3779b1);
      h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
      land.push(...geoVector(-180 + (col + (h & 255) / 256) * 0.5, 90 - (row + ((h >>> 8) & 255) / 256) * 0.5));
    }
  }

  const redraw = (): void => loop.redraw();
  const surface = createCanvas(host, { onResize: redraw });
  const ctx = surface.canvas.getContext("2d")!;
  const palette = watchPalette(host, redraw);
  labelHost(host, props.label);

  function draw(t: number): void {
    const { dpr, cssWidth, cssHeight } = surface;
    if (cssWidth > 0 && cssHeight > 0) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssWidth, cssHeight);

      const P = 1 + props.altitude / 6371;
      const invP = 1 / P;
      const tiltR = props.tilt * DEG;
      const cosT = Math.cos(tiltR);
      const sinT = Math.sin(tiltR);
      // The sub-point S and its track direction T drift along the heading's great circle:
      // one degree of ground track per second at speed 1, so a pass takes minutes.
      const hdg = props.heading * DEG;
      const latR = props.lat * DEG;
      const lonR = props.lon * DEG;
      const [s0x, s0y, s0z] = geoVector(props.lon, props.lat);
      const tx = Math.sin(hdg) * Math.cos(lonR) - Math.cos(hdg) * s0y * Math.sin(lonR);
      const ty = Math.cos(hdg) * Math.cos(latR);
      const tz = -Math.sin(hdg) * Math.sin(lonR) - Math.cos(hdg) * s0y * Math.cos(lonR);
      const sec = t / 1000;
      const drift = sec * props.speed * DEG;
      const cosD = Math.cos(drift);
      const sinD = Math.sin(drift);
      const sX = s0x * cosD + tx * sinD;
      const sY = s0y * cosD + ty * sinD;
      const sZ = s0z * cosD + tz * sinD;
      const tX = tx * cosD - s0x * sinD;
      const tY = ty * cosD - s0y * sinD;
      const tZ = tz * cosD - s0z * sinD;
      const rX = tY * sZ - tZ * sY;
      const rY = tZ * sX - tX * sZ;
      const rZ = tX * sY - tY * sX;

      // Framing: the limb's peak lands on the upper third and the land band below it fills the
      // middle of the frame. A projected unit is the tangent of the angle off the camera axis,
      // so one scale fits every altitude.
      const ha = Math.acos(invP) + tiltR;
      const denTop = P * cosT - Math.cos(ha);
      const topN = denTop > DEN_EPS ? (Math.sin(ha) - P * sinT) / denTop : 3;
      const focal = (0.42 * cssHeight) / Math.max(0.08, topN + Math.tan(tiltR));
      const cx = cssWidth / 2;
      const cy = 0.3 * cssHeight + topN * focal;

      /** Snyder's tilted perspective in the {R, S, T} frame: depth toward the sub-point sets the
       *  horizon, distance along the camera axis the near clip. A kept point lands in px, py. */
      let px = 0, py = 0, pen = false;
      const plot = (): void => {
        ctx[pen ? "lineTo" : "moveTo"](px, py);
        pen = true;
      };
      /** The shared Snyder tail: a point qs along S, qt along T, qr along R at depth den lands in
       *  px, py scaled by focal over den. Callers pass a clamped den when they want the off-frame
       *  projection of a point behind the camera. */
      const place = (qs: number, qt: number, qr: number, den: number): void => {
        px = cx + (qr * focal) / den;
        py = cy - ((qt * cosT + (qs - P) * sinT) * focal) / den;
      };
      const project = (qx: number, qy: number, qz: number): boolean => {
        const qs = qx * sX + qy * sY + qz * sZ;
        const qt = qx * tX + qy * tY + qz * tZ;
        const den = qt * sinT + (P - qs) * cosT;
        // Sit a hair inside the horizon so a dot never touches the drawn limb curve.
        if (qs < invP + 0.0015 || den <= DEN_EPS) return false;
        place(qs, qt, qx * rX + qy * rY + qz * rZ, den);
        return true;
      };

      /** One point on the limb circle of a sphere of `radius` seen from P radii out: the limb sits at
       *  angle c with cos c = radius / P, so the circle is qs along S with radius rs in the R, T plane.
       *  Positions are clamped so a sample behind the camera lands far off frame, and the returned
       *  depth says which side it is on. */
      const limbPt = (radius: number, i: number): number => {
        const c = radius * invP;
        const qs = radius * c;
        const rs = radius * Math.sqrt(1 - c * c);
        const th = Math.PI * (1 + (2 * i) / ARC_N);
        const qt = rs * Math.cos(th);
        const den = qt * sinT + (P - qs) * cosT;
        place(qs, qt, -rs * Math.sin(th), Math.max(DEN_EPS, den));
        return den;
      };
      const radii = [1, ...SHELLS.filter((r) => r < P * 0.999)];

      // Land dots, deduped onto the pitch grid so the stipple stays even on both grounds.
      const pitch = props.pitch;
      const dotR = Math.max(0.6, Math.min(1.7, pitch * 0.34));
      const seen = new Set();
      ctx.fillStyle = palette.colors.fg;
      ctx.globalAlpha = 0.85;
      for (let i = 0; i < land.length; i += 3) {
        if (!project(land[i]!, land[i + 1]!, land[i + 2]!)) continue;
        const key = ((px / pitch) | 0) * 1e5 + ((py / pitch) | 0);
        if (seen.has(key)) continue;
        seen.add(key);
        ctx.fillRect(px - dotR, py - dotR, dotR * 2, dotR * 2);
      }

      // The graticule, clipped at the horizon and at the camera plane: meridians and parallels
      // `grat` degrees apart, sampled every degree, the same lines geoGraticule(grat, 1) rules.
      const grat = props.graticule;
      if (grat > 0) {
        ctx.strokeStyle = palette.colors.muted;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        const seg = (lon: number, lat: number): void => {
          if (project(...geoVector(lon, lat))) plot();
          else pen = false;
        };
        for (let m = -180; m < 180; m += grat) {
          pen = false;
          for (let la = -80; la <= 80; la++) seg(m, la);
        }
        for (let pa = ((80 / grat) | 0) * -grat; pa <= 80; pa += grat) {
          pen = false;
          for (let lo = -180; lo <= 180; lo++) seg(lo, pa);
        }
        ctx.stroke();
      }

      // The limb, a hairline, carried one clamped sample past each visible end so the stroke
      // exits the frame and the horizon reads as a curve and not a gradient.
      ctx.strokeStyle = palette.colors.fg;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      let dp = -1;
      pen = false;
      for (let i = 0; i <= ARC_N; i++) {
        const d = limbPt(1, i);
        if (d > DEN_EPS || dp > DEN_EPS) plot();
        else pen = false;
        dp = d;
      }
      ctx.stroke();

      // Atmosphere: stepped bands between the surface limb and each shell's limb, stippled
      // through the Bayer matrix so they read as printed steps and never as a glow.
      if (props.atmosphere > 0) {
        const ox = props.seed & 3;
        const oy = (props.seed >> 4) & 3;
        ctx.fillStyle = palette.colors.accent;
        ctx.globalAlpha = 1;
        for (let b = 0; b + 1 < radii.length; b++) {
          const inner = radii[b]!;
          const outer = radii[b + 1]!;
          const cut = BAND_DENSITY[b]! * props.atmosphere * 16;
          if (cut <= 0.16) continue;
          for (let i = 0; i <= ARC_N; i++) {
            if (limbPt(inner, i) <= DEN_EPS) continue;
            const ix = px;
            const iy = py;
            limbPt(outer, i);
            const dx = px - ix;
            const dy = py - iy;
            const steps = Math.max(2, (((Math.abs(dx) + Math.abs(dy)) / 3) | 0) + 1);
            for (let j = 0; j <= steps; j++) {
              const gx = ((ix + (dx * j) / steps) / 3) | 0;
              const gy = ((iy + (dy * j) / steps) / 3) | 0;
              if (BAYER4[((gy + oy) & 3) * 4 + ((gx + ox) & 3)]! + 0.5 < cut) ctx.fillRect(gx * 3 - 0.7, gy * 3 - 0.7, 1.4, 1.4);
            }
          }
        }
      }

      // Telemetry: only what the props and the animation's own clock give.
      if (props.telemetry) {
        const la = Math.asin(Math.max(-1, Math.min(1, sY))) / DEG;
        const lo = Math.atan2(sX, sZ) / DEG;
        ctx.font = `11px ${props.fontFamily}`;
        ctx.fillStyle = palette.colors.muted;
        ctx.fillText(`ALT ${Math.round(props.altitude)} KM`, 14, cssHeight - 44);
        ctx.fillText(`SUB ${Math.abs(la).toFixed(1)}${la < 0 ? "S" : "N"} ${Math.abs(lo).toFixed(1)}${lo < 0 ? "W" : "E"}`, 14, cssHeight - 29);
        ctx.fillText(`T+ ${(sec / 60) | 0}:${(sec % 60).toFixed(1)}`, 14, cssHeight - 14);
      }
    }
    host.dataset.picaReady = "true";
  }

  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: 1200, frame: draw });

  return {
    update(next) {
      const prev = props.label;
      props = { ...props, ...next };
      if (props.label !== prev) labelHost(host, props.label);
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
