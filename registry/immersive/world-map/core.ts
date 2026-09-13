import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { GRID_FONT } from "../../../lib/font";
import { geoDecode, geoEqualEarth, GEO_EQUAL_EARTH_BOX, geoGraticule, geoRaster, geoSeam } from "../../../lib/geo";
import { GEO_LAND } from "../../../lib/geo-land";
import { sameJson } from "../../../lib/json";
import { watchPalette } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface WorldMapMarker {
  /** Degrees north of the equator. Negative is south. */
  lat: number;
  /** Degrees east of the prime meridian. Negative is west. */
  lon: number;
  /** Read after the map's own label, and drawn beside the marker when labels is on. */
  label: string;
}

export interface WorldMapProps {
  /** Places on the map, each an accent dot with a thin ring. */
  markers: readonly WorldMapMarker[];
  /** Text alternative, followed by each marker's label. Empty hides the host from assistive technology. */
  label: string;
  /** CSS pixels between the centres of neighbouring dots. */
  pitch: number;
  /** Side of each square land dot, in CSS pixels. */
  dotSize: number;
  /** How visible ocean dots are against land dots. 0 draws only the land. */
  ocean: number;
  /** Stroke the coastlines themselves over the dots. */
  coastline: boolean;
  /** Degrees between graticule lines, in steps of 15. 0 draws none. */
  graticule: number;
  /** Draw each marker's label beside it, placed so labels never overlap. */
  labels: boolean;
  /** Font stack for the marker labels. */
  fontFamily: string;
}

export const defaults: WorldMapProps = {
  markers: [
    { lat: 37.77, lon: -122.42, label: "San Francisco" },
    { lat: 51.51, lon: -0.13, label: "London" },
    { lat: -1.29, lon: 36.82, label: "Nairobi" },
    { lat: -33.87, lon: 151.21, label: "Sydney" },
  ],
  label: "A dotted world map",
  pitch: 4,
  dotSize: 2.4,
  ocean: 0,
  coastline: false,
  graticule: 0,
  labels: false,
  fontFamily: GRID_FONT,
};

const TAU = Math.PI * 2;
/** Ink the land dots draw at. Ocean dots reach it only at ocean 1. */
const LAND_ALPHA = 0.9;
/** The graticule draws under the dots at this share of a coastline's strength. */
const GRATICULE_ALPHA = 0.45;
/** The boundary line draws at this strength, a hairline that frames the map. */
const OUTLINE_ALPHA = 0.6;
/** Degrees between samples along the projection's boundary, so its curve stays smooth. */
const EDGE_STEP = 3;

/** The Equal Earth boundary as one ring of longitude and latitude pairs: up the 180th meridian, across the
 *  north pole line, down the far meridian, and back along the south pole line. In projected space this is
 *  the map's own outline, neither a rectangle nor a frame around one. */
function boundaryRing(): Float32Array {
  const pts: number[] = [];
  for (let lat = -90; lat <= 90; lat += EDGE_STEP) pts.push(180, lat);
  for (let lon = 180 - EDGE_STEP; lon >= -180; lon -= EDGE_STEP) pts.push(lon, 90);
  for (let lat = 90 - EDGE_STEP; lat >= -90; lat -= EDGE_STEP) pts.push(-180, lat);
  for (let lon = -180 + EDGE_STEP; lon <= 180; lon += EDGE_STEP) pts.push(lon, -90);
  return Float32Array.from(pts);
}

export const mount: Mount<WorldMapProps> = (host, initial = {}) => {
  let props: WorldMapProps = { ...defaults, ...initial };
  const land = geoDecode(GEO_LAND);
  const boundary = boundaryRing();

  function updateLabel(): void {
    const names = props.markers
      .map((m) => (typeof m.label === "string" ? m.label : ""))
      .filter((name) => name !== "");
    const text = props.label === "" ? "" : names.length > 0 ? `${props.label}: ${names.join(", ")}.` : `${props.label}.`;
    labelHost(host, text);
  }

  const surface = createCanvas(host, { onResize: () => draw() });
  const ctx = surface.canvas.getContext("2d");
  const palette = watchPalette(host, () => draw());
  updateLabel();

  function draw(): void {
    const { width, height, dpr, cssWidth, cssHeight } = surface;
    if (ctx && width > 0 && height > 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const em = parseFloat(getComputedStyle(host).fontSize) || 16;
      const box = GEO_EQUAL_EARTH_BOX;
      const scale = Math.min((cssWidth - 2 * em) / box.width, (cssHeight - 2 * em) / box.height);
      const mapW = Math.max(0, box.width * scale);
      const mapH = Math.max(0, box.height * scale);
      const mapX = (cssWidth - mapW) / 2;
      const mapY = (cssHeight - mapH) / 2;
      const pitch = Math.min(12, Math.max(2, props.pitch));
      const cols = Math.max(1, Math.round(mapW / pitch));
      const rows = Math.max(1, Math.round(mapH / pitch));
      const cellW = mapW / cols;
      const cellH = mapH / rows;

      /** A longitude and latitude to the map's fraction box, x left to right and y top to bottom. */
      const uv = (lon: number, lat: number): [number, number] => {
        const [x, y] = geoEqualEarth(lon, lat);
        return [(x - box.x) / box.width, 1 - (y - box.y) / box.height];
      };
      /** The same point in CSS pixels on the canvas. */
      const at = (lon: number, lat: number): [number, number] => {
        const [u, v] = uv(lon, lat);
        return [mapX + u * mapW, mapY + v * mapH];
      };

      // Each raster cell is one dot position, so a point lands a dot only where land covers its own cell.
      const onLand = geoRaster(land, cols, rows, uv);
      const inside = props.ocean > 0 ? geoRaster([boundary], cols, rows, uv) : null;

      if (props.graticule > 0) {
        ctx.strokeStyle = palette.colors.muted;
        ctx.globalAlpha = GRATICULE_ALPHA;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const line of geoGraticule(Math.min(45, Math.max(1, props.graticule)))) {
          for (let p = 0; p + 1 < line.length; p += 2) {
            const [px, py] = at(line[p] ?? 0, line[p + 1] ?? 0);
            if (p === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
        }
        ctx.stroke();
      }

      const dotS = Math.min(3, Math.max(0.5, props.dotSize));
      const dotR = dotS / 2;
      ctx.fillStyle = palette.colors.fg;
      /** One square dot on every cell its mask covers, skipping cells the second mask already claims. */
      const stamp = (mask: Uint8Array, skip: Uint8Array | null): void => {
        ctx.beginPath();
        for (let j = 0; j < rows; j++) {
          const py = mapY + (j + 0.5) * cellH;
          for (let i = 0; i < cols; i++) {
            const cell = j * cols + i;
            if ((mask[cell] ?? 0) === 0 || (skip?.[cell] ?? 0) === 1) continue;
            const px = mapX + (i + 0.5) * cellW;
            ctx.rect(px - dotR, py - dotR, dotS, dotS);
          }
        }
        ctx.fill();
      };
      if (inside) {
        ctx.globalAlpha = LAND_ALPHA * Math.min(1, Math.max(0, props.ocean));
        stamp(inside, onLand);
      }
      ctx.globalAlpha = LAND_ALPHA;
      stamp(onLand, null);

      // The map is framed by its own outline, a muted hairline, never a rectangle.
      ctx.strokeStyle = palette.colors.muted;
      ctx.globalAlpha = OUTLINE_ALPHA;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let p = 0; p + 1 < boundary.length; p += 2) {
        const [px, py] = at(boundary[p] ?? 0, boundary[p + 1] ?? 0);
        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();

      if (props.coastline) {
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const ring of land) {
          for (let p = 0; p + 1 < ring.length; p += 2) {
            const [px, py] = at(ring[p] ?? 0, ring[p + 1] ?? 0);
            if (p === 0 || geoSeam(ring[p - 2] ?? 0, ring[p - 1] ?? 0, ring[p] ?? 0, ring[p + 1] ?? 0)) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
        }
        ctx.stroke();
      }

      // Markers first, so no ring can overprint a name already placed. Each ring's box joins the
      // obstacles a label may not cover.
      ctx.globalAlpha = 1;
      ctx.fillStyle = palette.colors.accent;
      ctx.strokeStyle = palette.colors.accent;
      ctx.lineWidth = 1;
      const markR = Math.max(1.5, dotS);
      const ringR = markR * 2.2;
      const placed: number[] = [];
      const named: { x: number; y: number; text: string }[] = [];
      for (const m of props.markers) {
        const [mx, my] = at(m.lon, m.lat);
        if (!Number.isFinite(mx) || !Number.isFinite(my)) continue;
        ctx.beginPath();
        ctx.arc(mx, my, markR, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(mx, my, ringR, 0, TAU);
        ctx.stroke();
        placed.push(mx - ringR, my - ringR, mx + ringR, my + ringR);
        if (typeof m.label === "string" && m.label !== "") named.push({ x: mx, y: my, text: m.label.toUpperCase() });
      }

      if (props.labels && named.length > 0) {
        const fontSize = Math.max(9, Math.round(em * 0.7));
        ctx.font = `${fontSize}px ${props.fontFamily}`;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.letterSpacing = "0.04em";
        ctx.fillStyle = palette.colors.muted;
        const gap = ringR + 3;
        for (const n of named) {
          const w = ctx.measureText(n.text).width;
          const candidates: readonly [number, number][] = [
            [n.x + gap, n.y],
            [n.x - gap - w, n.y],
            [n.x - w / 2, n.y + gap + fontSize / 2],
            [n.x - w / 2, n.y - gap - fontSize / 2],
          ];
          for (const [tx, ty] of candidates) {
            const x0 = tx - 1;
            const y0 = ty - fontSize / 2 - 1;
            const x1 = tx + w + 1;
            const y1 = ty + fontSize / 2 + 1;
            if (x0 < 0 || y0 < 0 || x1 > cssWidth || y1 > cssHeight) continue;
            let free = true;
            for (let q = 0; q + 3 < placed.length; q += 4) {
              if (x0 - 2 < (placed[q + 2] ?? 0) && x1 + 2 > (placed[q] ?? 0) && y0 - 2 < (placed[q + 3] ?? 0) && y1 + 2 > (placed[q + 1] ?? 0)) {
                free = false;
                break;
              }
            }
            if (!free) continue;
            placed.push(x0, y0, x1, y1);
            ctx.fillText(n.text, tx, ty);
            break;
          }
        }
      }
      ctx.globalAlpha = 1;
    }
    host.dataset.picaReady = "true";
  }

  draw();

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (!sameJson(props.markers, before.markers) || props.label !== before.label) updateLabel();
      palette.refresh();
      draw();
    },
    destroy() {
      surface.destroy();
      palette.destroy();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};
