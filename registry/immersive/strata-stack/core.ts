import { createCanvas } from "../../../lib/canvas";
import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar, watchPalette } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface StrataLayer {
  /** Stable record identifier returned when the layer is selected. */
  id: string;
  /** Geological name shown on the layer's selection button. */
  label: string;
  /** Actual layer thickness in metres; invalid or negative values are treated as zero. */
  thickness: number;
}

export interface StrataStackProps {
  /** Geological records ordered from the top surface downward. */
  layers: readonly StrataLayer[];
  /** Gap between adjacent layers in metres, from 0 to 30. */
  separation: number;
  /** Controlled selected record ID, or null to let the stack manage selection. */
  value: string | null;
  /** Initial selected record ID, read once while value is null. */
  defaultValue: string;
  /** Orthographic camera used to show the stack's thickness and exposed section faces. */
  view: "isometric" | "oblique" | "front";
  /** Accessible name for the stack and its current selected geological record. */
  label: string;
}

export interface StrataStackEvents {
  /** ID of the supplied geological layer requested by pointer or keyboard input. */
  valueChange: string;
}

export const defaults: StrataStackProps = {
  layers: [
    { id: "sandstone", label: "Sandstone", thickness: 22 },
    { id: "shale", label: "Shale", thickness: 9 },
    { id: "limestone", label: "Limestone", thickness: 34 },
    { id: "siltstone", label: "Siltstone", thickness: 14 },
    { id: "basalt", label: "Basalt", thickness: 18 },
  ],
  separation: 8,
  value: null,
  defaultValue: "limestone",
  view: "isometric",
  label: "Geological strata",
};

type StrataPoint = readonly [number, number];
type StrataFace = readonly [StrataPoint, StrataPoint, StrataPoint, StrataPoint];
type StrataHit = { id: string; polygon: StrataFace };

function strataNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function strataRecords(raw: readonly StrataLayer[]): StrataLayer[] {
  if (!Array.isArray(raw)) return [];
  const ids = new Set<string>();
  const result: StrataLayer[] = [];
  for (const record of raw) {
    if (!record || typeof record.id !== "string" || !record.id.trim() || ids.has(record.id)) continue;
    ids.add(record.id);
    result.push({ id: record.id, label: String(record.label || record.id), thickness: Math.max(0, strataNumber(record.thickness, 0)) });
  }
  return result;
}

function strataInside(point: StrataPoint, polygon: StrataFace): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (!a || !b) continue;
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

export const mount: Mount<StrataStackProps> = (host, initial = {}) => {
  let props: StrataStackProps = { ...defaults, ...initial };
  let records = strataRecords(props.layers);
  let current = props.defaultValue;
  let alive = true;
  let initialized = false;
  let hits: StrataHit[] = [];
  const attributes = hostAttributes(host);
  attributes.set("data-pica-id", host.getAttribute("data-pica-id"));
  const sheet = scope(host);
  const emit = emitter<StrataStackEvents>(host);
  const abort = new AbortController();
  const surface = createCanvas(host, { maxPixels: 2400000, onResize: () => draw() });
  const ctx = surface.canvas.getContext("2d");
  const palette = watchPalette(host, () => draw());
  const controls = document.createElement("div");
  controls.setAttribute("data-pica", "");
  controls.setAttribute("data-part", "layers");
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-label", "Select geological layer");
  host.append(controls);
  const s = sheet.selector;
  sheet.setRules([
    `${s} [data-part="layers"]{position:absolute;z-index:2;left:12px;right:12px;bottom:12px;display:flex;justify-content:center;flex-wrap:wrap;gap:5px;max-height:38%;overflow:auto}`,
    `${s} [data-part="layer"]{max-width:100%;box-sizing:border-box;margin:0;padding:6px 8px;border:1px solid color-mix(in srgb,${cssVar("fg")} 28%,transparent);border-radius:0;background:${cssVar("bg")};color:${cssVar("fg")};font-family:${GRID_FONT};font-size:11px;line-height:1.3;font-variant-numeric:tabular-nums;cursor:pointer}`,
    `${s} [data-part="layer"][aria-pressed="true"]{border-color:${cssVar("accent")};box-shadow:inset 0 -2px ${cssVar("accent")}}`,
    `${s} [data-part="layer"]:hover{background:color-mix(in srgb,${cssVar("fg")} 9%,${cssVar("bg")})}`,
    `${s} [data-part="layer"]:focus-visible{outline:2px solid ${cssVar("fg")};outline-offset:2px}`,
  ].join("\n"));

  function selected(): string {
    const wanted = props.value ?? current;
    return records.find((record) => record.id === wanted)?.id ?? records[0]?.id ?? "";
  }

  function buttons(): void {
    const focused = (document.activeElement as HTMLElement | null)?.getAttribute("data-layer-id");
    controls.replaceChildren();
    for (const record of records) {
      const button = document.createElement("button");
      button.setAttribute("data-pica", "");
      button.setAttribute("data-part", "layer");
      button.setAttribute("data-layer-id", record.id);
      button.type = "button";
      button.textContent = `${record.label} · ${record.thickness} m`;
      button.setAttribute("aria-label", `${record.label}, thickness ${record.thickness} metres`);
      controls.append(button);
      if (record.id === focused) button.focus({ preventScroll: true });
    }
  }

  function describe(): void {
    const id = selected();
    const record = records.find((entry) => entry.id === id);
    const name = String(props.label ?? "").trim() || "Geological strata";
    attributes.set("role", "group");
    attributes.set("aria-hidden", null);
    attributes.set("aria-label", `${name}. ${records.length} layers, top to bottom.${record ? ` Selected ${record.label}, ${record.thickness} metres thick.` : " No layer records supplied."}`);
    for (const child of Array.from(controls.children)) {
      if (!(child instanceof HTMLButtonElement)) continue;
      const active = child.getAttribute("data-layer-id") === id;
      child.setAttribute("aria-pressed", String(active));
      child.tabIndex = active ? 0 : -1;
    }
  }

  function choose(id: string): void {
    if (!records.some((record) => record.id === id) || id === selected()) return;
    if (props.value === null) current = id;
    describe();
    draw();
    emit("valueChange", id);
  }

  function draw(): void {
    if (!alive || !initialized) return;
    hits = [];
    const width = Math.max(1, surface.cssWidth);
    const height = Math.max(1, surface.cssHeight);
    if (ctx) {
      ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = palette.colors.bg;
      ctx.fillRect(0, 0, width, height);
      if (records.length) {
        const gap = Math.max(0, Math.min(30, strataNumber(props.separation, 8)));
        // Normalize all physical dimensions by one common unit to avoid numeric
        // overflow without changing the supplied thickness or gap proportions.
        let unit = Math.max(1, gap);
        for (const record of records) unit = Math.max(unit, record.thickness);
        const total = records.reduce((sum, record) => sum + record.thickness / unit, 0) + gap / unit * Math.max(0, records.length - 1);
        const blockW = Math.max(1.8, total * 1.22);
        const blockD = blockW * 0.62;
        const view = props.view;
        const azimuth = (view === "front" ? 0 : view === "oblique" ? -18 : -36) * Math.PI / 180;
        const elevation = (view === "front" ? 0 : view === "oblique" ? 19 : 34) * Math.PI / 180;
        const ca = Math.cos(azimuth), sa = Math.sin(azimuth);
        const ce = Math.cos(elevation), se = Math.sin(elevation);
        function project(x: number, y: number, z: number): StrataPoint {
          return [x * ca - y * sa, (x * sa + y * ca) * se - z * ce];
        }
        const bounds: StrataPoint[] = [];
        for (const x of [-blockW / 2, blockW / 2]) {
          for (const y of [-blockD / 2, blockD / 2]) {
            for (const z of [0, total]) bounds.push(project(x, y, z));
          }
        }
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const point of bounds) {
          minX = Math.min(minX, point[0]); maxX = Math.max(maxX, point[0]);
          minY = Math.min(minY, point[1]); maxY = Math.max(maxY, point[1]);
        }
        const sceneHeight = Math.max(1, height - controls.offsetHeight - 34);
        const scale = Math.max(0.1, Math.min((width - 36) / Math.max(0.01, maxX - minX), (sceneHeight - 20) / Math.max(0.01, maxY - minY)));
        const offsetX = width / 2 - (minX + maxX) / 2 * scale;
        const offsetY = sceneHeight / 2 - (minY + maxY) / 2 * scale + 6;
        function screen(x: number, y: number, z: number): StrataPoint {
          const point = project(x, y, z);
          return [offsetX + point[0] * scale, offsetY + point[1] * scale];
        }
        const stack: { record: StrataLayer; top: number; bottom: number }[] = [];
        let cursor = total;
        for (const record of records) {
          const bottom = cursor - record.thickness / unit;
          stack.push({ record, top: cursor, bottom });
          cursor = bottom - gap / unit;
        }
        const path = (face: StrataFace): void => {
          if (!ctx) return;
          ctx.beginPath();
          ctx.moveTo(face[0][0], face[0][1]);
          for (let i = 1; i < face.length; i++) {
            const point = face[i];
            if (point) ctx.lineTo(point[0], point[1]);
          }
          ctx.closePath();
        };
        const selectedId = selected();
        const halfW = blockW / 2, halfD = blockD / 2;
        for (let i = stack.length - 1; i >= 0; i--) {
          const entry = stack[i];
          if (!entry) continue;
          const { record, top, bottom } = entry;
          const active = record.id === selectedId;
          const faces: { polygon: StrataFace; ink: number; section: boolean }[] = [
            { polygon: [screen(-halfW, -halfD, top), screen(halfW, -halfD, top), screen(halfW, halfD, top), screen(-halfW, halfD, top)], ink: 0.10, section: false },
            { polygon: [screen(-halfW, -halfD, top), screen(-halfW, halfD, top), screen(-halfW, halfD, bottom), screen(-halfW, -halfD, bottom)], ink: 0.17, section: false },
            { polygon: [screen(-halfW, halfD, top), screen(halfW, halfD, top), screen(halfW, halfD, bottom), screen(-halfW, halfD, bottom)], ink: 0.26, section: true },
          ];
          for (const face of faces) {
            // Clear prior faces under this surface even on a transparent host;
            // the result is an opaque geometric ordering, not an X-ray stack.
            ctx.save();
            path(face.polygon);
            ctx.globalCompositeOperation = "destination-out";
            ctx.globalAlpha = 1;
            ctx.fill();
            ctx.globalCompositeOperation = "source-over";
            ctx.fillStyle = palette.colors.bg;
            ctx.fill();
            ctx.fillStyle = active ? palette.colors.accent : palette.colors.fg;
            ctx.globalAlpha = active ? face.ink + 0.11 : face.ink;
            ctx.fill();
            ctx.globalAlpha = active ? 1 : 0.62;
            ctx.strokeStyle = active ? palette.colors.accent : palette.colors.fg;
            ctx.lineWidth = active ? 1.6 : 1;
            ctx.stroke();
            if (face.section && record.thickness > 0) {
              ctx.clip();
              const beds = Math.min(20, Math.floor(record.thickness / 5));
              ctx.globalAlpha = active ? 0.62 : 0.22;
              ctx.lineWidth = 0.8;
              for (let bed = 1; bed <= beds; bed++) {
                const z = top - Math.min(record.thickness, bed * 5) / unit;
                const a = screen(-halfW, halfD, z);
                const b = screen(halfW, halfD, z);
                ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
              }
            }
            ctx.restore();
            hits.push({ id: record.id, polygon: face.polygon });
          }
        }
      }
    }
    attributes.set("data-pica-ready", "true");
  }

  controls.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement) || target.parentElement !== controls) return;
    const id = target.getAttribute("data-layer-id");
    if (id !== null) choose(id);
  }, { signal: abort.signal });
  controls.addEventListener("keydown", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const index = records.findIndex((record) => record.id === target.getAttribute("data-layer-id"));
    if (index < 0) return;
    let next: number;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = Math.min(records.length - 1, index + 1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = Math.max(0, index - 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = records.length - 1;
    else return;
    event.preventDefault();
    const record = records[next];
    if (!record) return;
    choose(record.id);
    const button = controls.children.item(next);
    if (button instanceof HTMLButtonElement) button.focus({ preventScroll: true });
  }, { signal: abort.signal });
  surface.canvas.addEventListener("click", (event) => {
    const box = surface.canvas.getBoundingClientRect();
    const point: StrataPoint = [(event.clientX - box.left) / Math.max(1, box.width) * surface.cssWidth,
      (event.clientY - box.top) / Math.max(1, box.height) * surface.cssHeight];
    for (let i = hits.length - 1; i >= 0; i--) {
      const hit = hits[i];
      if (hit && strataInside(point, hit.polygon)) {
        choose(hit.id);
        const recordIndex = records.findIndex((record) => record.id === hit.id);
        const button = controls.children.item(recordIndex);
        if (button instanceof HTMLButtonElement) button.focus({ preventScroll: true });
        return;
      }
    }
  }, { signal: abort.signal });
  // The shared canvas is noninteractive by default; only this owned canvas gets
  // hit testing, and no page-owned node is modified.
  surface.canvas.style.pointerEvents = "auto";
  surface.canvas.style.cursor = "pointer";
  const legendObserver = typeof ResizeObserver === "function" ? new ResizeObserver(() => draw()) : null;
  legendObserver?.observe(controls);
  initialized = true;
  buttons();
  describe();
  draw();

  return {
    update(next) {
      if (!alive) return;
      const before = props;
      const previousSelection = selected();
      props = { ...props, ...next };
      const dataChanged = !sameJson(before.layers, props.layers);
      if (dataChanged) { records = strataRecords(props.layers); buttons(); }
      if (before.value !== props.value && props.value === null) current = previousSelection;
      const selectionChanged = before.value !== props.value || dataChanged;
      const paletteChanged = palette.refresh();
      if (selectionChanged || before.label !== props.label) describe();
      if (selectionChanged || before.separation !== props.separation || before.view !== props.view || paletteChanged) draw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      abort.abort();
      legendObserver?.disconnect();
      controls.remove();
      palette.destroy();
      surface.destroy();
      sheet.destroy();
      attributes.restore();
    },
  };
};
