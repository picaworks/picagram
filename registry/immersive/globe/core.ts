import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { sameJson } from "../../../lib/json";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface GlobeMarker {
  /** Degrees north of the equator. Negative is south. */
  lat: number;
  /** Degrees east of the prime meridian. Negative is west. */
  lon: number;
  /** Read after the globe's own label. Not drawn on screen. */
  label: string;
}

export interface GlobeProps extends MotionProps {
  /** Places on the sphere, drawn in the accent with a thin ring, and hidden when they turn to the back. */
  markers: readonly GlobeMarker[];
  /** Text alternative for the globe, followed by each marker's label. Empty hides the host from assistive technology. */
  label: string;
  /** Points spread over the sphere's surface with a Fibonacci lattice. */
  dots: number;
  /** Spin speed. 0 holds the globe at its starting turn. */
  speed: number;
  /** Tilt of the spin axis away from the viewer, in degrees. */
  tilt: number;
  /** Diameter of each surface dot facing the viewer straight on, in CSS pixels. */
  dotSize: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: GlobeProps = {
  markers: [
    { lat: 37.77, lon: -122.42, label: "San Francisco" },
    { lat: 51.51, lon: -0.13, label: "London" },
    { lat: 35.68, lon: 139.69, label: "Tokyo" },
    { lat: -33.87, lon: 151.21, label: "Sydney" },
  ],
  label: "A dotted globe",
  dots: 2400,
  speed: 0.25,
  tilt: 20,
  dotSize: 1.2,
  fps: 30,
  paused: false,
  time: null,
  seed: 1,
};

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
/** The golden angle, the azimuthal step between consecutive lattice points, in radians. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
/** Radians of spin per second at speed 1. A full turn then takes 24 seconds. */
const SPIN_RATE = TAU / 24;
/** A fixed starting turn, chosen only so the default markers already read well at the still frame. */
const BASE_SPIN = 171 * DEG;
/** The frame held under reduced motion, and the time captures use. With the defaults it shows most markers. */
const STILL = 1200;
/** Cosine to the viewer above which a point counts as on the front hemisphere. */
const HORIZON = 0.02;
/** Shade steps the surface dots are grouped into, so one fill draws every dot at that shade in one call. */
const LEVELS = 12;

/** How far the first sample sits from the pole, as a fraction of one lattice step. A larger offset keeps a
 *  bigger lattice from crowding its poles, and a small one already spaces a small lattice evenly. */
function poleEpsilon(n: number): number {
  if (n < 24) return 0.33;
  if (n < 177) return 1.33;
  if (n < 890) return 3.33;
  return 10;
}

/** Points on the unit sphere from a Fibonacci lattice, y as the pole axis, flattened as x, y, z triples. */
function buildLattice(n: number): Float32Array {
  const count = Math.max(0, Math.floor(n));
  const out = new Float32Array(count * 3);
  const epsilon = poleEpsilon(count);
  const denom = Math.max(1e-6, count - 1 + 2 * epsilon);
  for (let i = 0; i < count; i++) {
    const y = 1 - (2 * (i + epsilon)) / denom;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = i * GOLDEN_ANGLE;
    out[i * 3] = r * Math.cos(theta);
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = r * Math.sin(theta);
  }
  return out;
}

/** A point on the unit sphere for a latitude and longitude in degrees, in the same frame as the lattice. */
function llToVec3(lat: number, lon: number): readonly [number, number, number] {
  const latR = lat * DEG;
  const lonR = lon * DEG;
  const y = Math.sin(latR);
  const r = Math.cos(latR);
  return [r * Math.sin(lonR), y, r * Math.cos(lonR)];
}

/** Spins a unit point around the vertical axis, then tilts the whole globe around the horizontal axis.
 *  Returns its unscaled screen x and y and the cosine of its angle to the viewer, positive on the front. */
function project(
  x0: number,
  y0: number,
  z0: number,
  cosSpin: number,
  sinSpin: number,
  cosTilt: number,
  sinTilt: number,
): readonly [number, number, number] {
  const x1 = x0 * cosSpin + z0 * sinSpin;
  const z1 = z0 * cosSpin - x0 * sinSpin;
  const y2 = y0 * cosTilt - z1 * sinTilt;
  const z2 = y0 * sinTilt + z1 * cosTilt;
  return [x1, y2, z2];
}

export const mount: Mount<GlobeProps> = (host, initial = {}) => {
  let props: GlobeProps = { ...defaults, ...initial };
  let lattice = buildLattice(props.dots);
  let markerVecs: (readonly [number, number, number])[] = props.markers.map((m) => llToVec3(m.lat, m.lon));

  function updateLabel(): void {
    const names = props.markers.map((m) => m.label).filter((name) => name !== "");
    const text = props.label === "" ? "" : names.length > 0 ? `${props.label}: ${names.join(", ")}.` : `${props.label}.`;
    labelHost(host, text);
  }

  const surface = createCanvas(host, { onResize: () => loop.redraw() });
  const ctx = surface.canvas.getContext("2d");
  const palette = watchPalette(host, () => loop.redraw());
  updateLabel();

  function draw(t: number): void {
    const { width, height, dpr, cssWidth, cssHeight } = surface;
    if (ctx && width > 0 && height > 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cx = cssWidth / 2;
      const cy = cssHeight / 2;
      const sphereRadius = (Math.min(cssWidth, cssHeight) / 2) * 0.84;
      const spin = BASE_SPIN + (t / 1000) * props.speed * SPIN_RATE;
      const cosSpin = Math.cos(spin);
      const sinSpin = Math.sin(spin);
      const tiltRad = props.tilt * DEG;
      const cosTilt = Math.cos(tiltRad);
      const sinTilt = Math.sin(tiltRad);

      const buckets: number[][] = [];
      for (let level = 0; level < LEVELS; level++) buckets.push([]);
      for (let i = 0; i < lattice.length; i += 3) {
        const x0 = lattice[i]!;
        const y0 = lattice[i + 1]!;
        const z0 = lattice[i + 2]!;
        const [ux, uy, depth] = project(x0, y0, z0, cosSpin, sinSpin, cosTilt, sinTilt);
        if (depth <= HORIZON) continue;
        const level = Math.min(LEVELS - 1, Math.floor(depth * LEVELS));
        buckets[level]?.push(ux, uy);
      }
      ctx.fillStyle = palette.colors.fg;
      for (let level = 0; level < LEVELS; level++) {
        const points = buckets[level];
        if (!points || points.length === 0) continue;
        const shade = (level + 0.5) / LEVELS;
        const dotRadius = (props.dotSize * (0.55 + 0.45 * shade)) / 2;
        ctx.globalAlpha = shade;
        ctx.beginPath();
        for (let p = 0; p < points.length; p += 2) {
          const px = cx + (points[p] ?? 0) * sphereRadius;
          const py = cy - (points[p + 1] ?? 0) * sphereRadius;
          ctx.moveTo(px + dotRadius, py);
          ctx.arc(px, py, dotRadius, 0, TAU);
        }
        ctx.fill();
      }

      ctx.fillStyle = palette.colors.accent;
      ctx.strokeStyle = palette.colors.accent;
      ctx.lineWidth = Math.max(1, props.dotSize * 0.6);
      for (const vec of markerVecs) {
        const [ux, uy, depth] = project(vec[0], vec[1], vec[2], cosSpin, sinSpin, cosTilt, sinTilt);
        if (depth <= HORIZON) continue;
        const shade = Math.min(1, depth);
        const px = cx + ux * sphereRadius;
        const py = cy - uy * sphereRadius;
        const dotRadius = (props.dotSize * 1.8 * (0.55 + 0.45 * shade)) / 2;
        ctx.globalAlpha = 0.65 + 0.35 * shade;
        ctx.beginPath();
        ctx.arc(px, py, dotRadius, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px, py, dotRadius * 2.2, 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    host.dataset.picaReady = "true";
  }

  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: STILL, frame: draw });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.dots !== before.dots) lattice = buildLattice(props.dots);
      const markersChanged = !sameJson(props.markers, before.markers);
      if (markersChanged) markerVecs = props.markers.map((m) => llToVec3(m.lat, m.lon));
      if (markersChanged || props.label !== before.label) updateLabel();
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
