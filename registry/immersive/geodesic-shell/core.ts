import { createCanvas } from "../../../lib/canvas";
import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId, scope } from "../../../lib/host";
import { changed } from "../../../lib/json";
import { cssOn, cssVar, watchPalette } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface GeodesicShellPanel {
  /** Unique panel identifier used for selection. */
  id: string;
  /** Zero-based dome facet index in deterministic base-face and subdivision order. */
  facet: number;
  /** Short name shown on the corresponding selection button. */
  label: string;
  /** Supplied panel information read with its name when selected. */
  description: string;
}

export interface GeodesicShellProps {
  /** Subdivision frequency of each icosahedron face, from 1 to 6; facet indices depend on frequency. */
  frequency: number;
  /** Panel records mapped to actual facet indices; invalid mappings and duplicate IDs or facets are omitted. */
  panels: GeodesicShellPanel[];
  /** Selected panel ID; null enables internal selection, and an empty string selects nothing. */
  value: string | null;
  /** Initial selected panel ID, read once in uncontrolled mode. */
  defaultValue: string;
  /** Camera azimuth and elevation in degrees, plus zoom from 0.5 to 1.5. */
  view: { azimuth: number; elevation: number; zoom: number };
  /** Accessible name for the faceted dome and panel controls; empty hides the component. */
  label: string;
}

export interface GeodesicShellEvents {
  /** Panel ID selected by facet click or keyboard/button input. */
  valueChange: string;
  /** A copy of the supplied record belonging to the selected facet. */
  panelSelect: GeodesicShellPanel;
}

export const defaults: GeodesicShellProps = {
  frequency: 3,
  panels: [
    { id: "panel-a", facet: 4, label: "Crown A", description: "Crown cladding panel" },
    { id: "panel-b", facet: 13, label: "Crown B", description: "Second crown cladding panel" },
    { id: "panel-c", facet: 22, label: "Crown C", description: "Third crown cladding panel" },
    { id: "panel-d", facet: 31, label: "Crown D", description: "Fourth crown cladding panel" },
  ],
  value: null,
  defaultValue: "panel-a",
  view: { azimuth: 25, elevation: 28, zoom: 1 },
  label: "Geodesic dome with selectable cladding panels",
};

type ShellVector = readonly [number, number, number];
type ShellTriangle = readonly [ShellVector, ShellVector, ShellVector];
type ShellFacet = { vertices: ShellVector[]; normal: ShellVector; center: ShellVector };
type ShellScreenFacet = { index: number; points: [number, number][]; depth: number; shade: number };

function shellNumber(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

function shellNormalize(point: ShellVector): ShellVector {
  const length = Math.hypot(...point) || 1;
  return [point[0] / length, point[1] / length, point[2] / length];
}

function shellCross(a: ShellVector, b: ShellVector): ShellVector {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function shellClip(triangle: ShellTriangle): ShellVector[] {
  const result: ShellVector[] = [];
  triangle.forEach((point, index) => {
    const prior = triangle[(index + 2) % 3];
    if (!prior) return;
    if ((prior[1] >= 0) !== (point[1] >= 0)) {
      const t = prior[1] / (prior[1] - point[1]);
      result.push([prior[0] + (point[0] - prior[0]) * t, 0, prior[2] + (point[2] - prior[2]) * t]);
    }
    if (point[1] >= 0) result.push(point);
  });
  return result;
}

function shellMesh(frequency: number): ShellFacet[] {
  const upper: ShellVector[] = [];
  const lower: ShellVector[] = [];
  const ringY = 1 / Math.sqrt(5);
  const radius = 2 / Math.sqrt(5);
  for (let index = 0; index < 5; index++) {
    const angle = index * Math.PI * 2 / 5;
    upper.push([radius * Math.cos(angle), ringY, radius * Math.sin(angle)]);
    lower.push([radius * Math.cos(angle + Math.PI / 5), -ringY, radius * Math.sin(angle + Math.PI / 5)]);
  }
  const faces: ShellTriangle[] = [];
  const north: ShellVector = [0, 1, 0];
  const south: ShellVector = [0, -1, 0];
  for (let index = 0; index < 5; index++) {
    const a = upper[index], b = upper[(index + 1) % 5];
    if (a && b) faces.push([north, a, b]);
  }
  for (let index = 0; index < 5; index++) {
    const a = upper[index], b = upper[(index + 1) % 5], c = lower[index], d = lower[(index + 4) % 5];
    if (a && b && c && d) { faces.push([a, c, b]); faces.push([a, d, c]); }
  }
  for (let index = 0; index < 5; index++) {
    const a = lower[index], b = lower[(index + 1) % 5];
    if (a && b) faces.push([south, b, a]);
  }
  const facets: ShellFacet[] = [];
  for (const face of faces) {
    const sample = (i: number, j: number): ShellVector => {
      const a = 1 - (i + j) / frequency, b = i / frequency, c = j / frequency;
      return shellNormalize([face[0][0] * a + face[1][0] * b + face[2][0] * c, face[0][1] * a + face[1][1] * b + face[2][1] * c, face[0][2] * a + face[1][2] * b + face[2][2] * c]);
    };
    const add = (triangle: ShellTriangle): void => {
      const vertices = shellClip(triangle);
      if (vertices.length < 3) return;
      const [a, b, c] = triangle;
      const rawNormal = shellCross([b[0] - a[0], b[1] - a[1], b[2] - a[2]], [c[0] - a[0], c[1] - a[1], c[2] - a[2]]);
      const center: ShellVector = [vertices.reduce((sum, point) => sum + point[0], 0) / vertices.length, vertices.reduce((sum, point) => sum + point[1], 0) / vertices.length, vertices.reduce((sum, point) => sum + point[2], 0) / vertices.length];
      if (center[1] < 1e-8) return;
      const sign = rawNormal[0] * center[0] + rawNormal[1] * center[1] + rawNormal[2] * center[2] < 0 ? -1 : 1;
      const normal = shellNormalize([rawNormal[0] * sign, rawNormal[1] * sign, rawNormal[2] * sign]);
      facets.push({ vertices, normal, center });
    };
    for (let i = 0; i < frequency; i++) {
      for (let j = 0; j < frequency - i; j++) {
        add([sample(i, j), sample(i + 1, j), sample(i, j + 1)]);
        if (i + j < frequency - 1) add([sample(i + 1, j), sample(i + 1, j + 1), sample(i, j + 1)]);
      }
    }
  }
  return facets;
}

function shellInside(points: readonly [number, number][], x: number, y: number): boolean {
  let inside = false;
  for (let index = 0, prior = points.length - 1; index < points.length; prior = index++) {
    const a = points[index], b = points[prior];
    if (!a || !b) continue;
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

export const mount: Mount<GeodesicShellProps> = (host, initial = {}) => {
  let props: GeodesicShellProps = { ...defaults, ...initial };
  let internalValue = props.defaultValue;
  let alive = true;
  let frequency = Math.round(shellNumber(props.frequency, 3, 1, 6));
  let facets = shellMesh(frequency);
  let records: GeodesicShellPanel[] = [];
  let projected: ShellScreenFacet[] = [];
  const attrs = hostAttributes(host);
  attrs.set("data-pica-id", host.getAttribute("data-pica-id"));
  const sheet = scope(host);
  const selector = sheet.selector;
  const surface = createCanvas(host, { maxPixels: 4_000_000, css: "pointer-events:auto;cursor:crosshair", onResize: () => draw() });
  const ctx = surface.canvas.getContext("2d");
  const palette = watchPalette(host, () => draw());
  const emit = emitter<GeodesicShellEvents>(host);
  const controls = document.createElement("div");
  controls.setAttribute("data-pica", "");
  controls.setAttribute("data-shell-controls", "");
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-label", "Dome panels");
  const status = document.createElement("span");
  status.setAttribute("data-pica", "");
  status.id = nextId("shell-status");
  status.setAttribute("aria-live", "polite");
  status.setAttribute("aria-atomic", "true");
  status.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0";
  host.append(controls, status);
  sheet.setRules(`
    ${selector} [data-shell-controls] { position:absolute; bottom:12px; left:12px; right:12px; display:flex; flex-wrap:wrap; justify-content:center; gap:6px; z-index:1; }
    ${selector} [data-shell-panel] { appearance:none; border:1px solid ${cssVar("muted")}; padding:6px 9px; background:${cssVar("bg")}; color:${cssVar("fg")}; font:11px ${GRID_FONT}; border-radius:0; cursor:pointer; }
    ${selector} [data-shell-panel][aria-pressed="true"] { border-color:${cssVar("accent")}; background:${cssVar("accent")}; color:${cssOn("accent")}; }
    ${selector} [data-shell-panel]:focus-visible { outline:2px solid ${cssVar("fg")}; outline-offset:3px; }
  `);

  function selected(): string { return props.value === null ? internalValue : props.value; }

  function synchronize(): void {
    for (const button of controls.querySelectorAll<HTMLButtonElement>("[data-shell-panel]")) button.setAttribute("aria-pressed", String(button.dataset.shellPanel === selected()));
    const record = records.find((panel) => panel.id === selected());
    status.textContent = record ? `${record.label}, facet ${record.facet}. ${record.description}` : "No panel selected. Choose a panel button or click its facet. Arrow keys move between panels.";
  }

  function accessibility(): void {
    const label = props.label.trim();
    attrs.set("role", label ? "group" : null);
    attrs.set("aria-label", label || null);
    attrs.set("aria-hidden", label ? null : "true");
    attrs.set("aria-describedby", label ? status.id : null);
  }

  function rebuildControls(): void {
    const focused = document.activeElement instanceof HTMLElement && controls.contains(document.activeElement) ? document.activeElement.dataset.shellPanel : undefined;
    controls.replaceChildren();
    records = [];
    const ids = new Set<string>();
    const occupied = new Set<number>();
    for (const raw of Array.isArray(props.panels) ? props.panels : []) {
      if (!raw || typeof raw.id !== "string" || !raw.id || ids.has(raw.id) || !Number.isInteger(raw.facet) || raw.facet < 0 || raw.facet >= facets.length || occupied.has(raw.facet)) continue;
      ids.add(raw.id); occupied.add(raw.facet);
      const record: GeodesicShellPanel = { id: raw.id, facet: raw.facet, label: typeof raw.label === "string" ? raw.label : raw.id, description: typeof raw.description === "string" ? raw.description : "" };
      records.push(record);
      const button = document.createElement("button");
      button.setAttribute("data-pica", "");
      button.setAttribute("data-shell-panel", record.id);
      button.type = "button";
      button.textContent = record.label || record.id;
      button.setAttribute("aria-label", `${record.label || record.id}, facet ${record.facet}. ${record.description}`);
      button.title = `${record.description || record.label} · facet ${record.facet}`;
      controls.append(button);
      if (record.id === focused) button.focus({ preventScroll: true });
    }
    synchronize();
  }

  function rotate(point: ShellVector): ShellVector {
    const azimuth = shellNumber(props.view.azimuth, 25, -360, 360) * Math.PI / 180;
    const elevation = shellNumber(props.view.elevation, 28, 0, 85) * Math.PI / 180;
    const x = point[0] * Math.cos(azimuth) + point[2] * Math.sin(azimuth);
    const z = point[2] * Math.cos(azimuth) - point[0] * Math.sin(azimuth);
    return [x, point[1] * Math.cos(elevation) - z * Math.sin(elevation), point[1] * Math.sin(elevation) + z * Math.cos(elevation)];
  }

  function draw(): void {
    if (!alive) return;
    if (!ctx) { attrs.set("data-pica-ready", "true"); return; }
    const width = surface.cssWidth, height = surface.cssHeight;
    const colors = palette.colors;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, surface.width, surface.height);
    ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);
    const rotated = facets.flatMap((facet) => facet.vertices.map(rotate));
    const minX = Math.min(...rotated.map((point) => point[0])), maxX = Math.max(...rotated.map((point) => point[0]));
    const minY = Math.min(...rotated.map((point) => point[1])), maxY = Math.max(...rotated.map((point) => point[1]));
    const availableHeight = Math.max(1, height - controls.offsetHeight - 42);
    const zoom = shellNumber(props.view.zoom, 1, 0.5, 1.5);
    const scale = Math.max(1, Math.min(width * 0.86 / Math.max(0.01, maxX - minX), availableHeight * 0.88 / Math.max(0.01, maxY - minY))) * zoom;
    const cx = width / 2, cy = availableHeight / 2 + 10;
    const centerY = (minY + maxY) / 2;
    const screen = (point: ShellVector): [number, number] => { const p = rotate(point); return [cx + p[0] * scale, cy - (p[1] - centerY) * scale]; };
    projected = facets.map((facet, index) => ({ index, points: facet.vertices.map(screen), depth: rotate(facet.center)[2], shade: rotate(facet.normal)[2] })).sort((a, b) => a.depth - b.depth);
    const active = records.find((panel) => panel.id === selected());
    const path = (points: readonly [number, number][]): void => {
      ctx.beginPath();
      points.forEach((point, index) => { if (index === 0) ctx.moveTo(point[0], point[1]); else ctx.lineTo(point[0], point[1]); });
      ctx.closePath();
    };
    for (const facet of projected) {
      const selectedFacet = active?.facet === facet.index;
      path(facet.points);
      ctx.fillStyle = selectedFacet ? colors.accent : colors.fg;
      ctx.globalAlpha = selectedFacet ? 0.38 : facet.shade > 0 ? 0.035 + 0.105 * facet.shade : 0.015;
      ctx.fill();
      ctx.strokeStyle = selectedFacet ? colors.accent : facet.shade > 0 ? colors.fg : colors.muted;
      ctx.globalAlpha = selectedFacet ? 1 : facet.shade > 0 ? 0.56 : 0.25;
      ctx.lineWidth = selectedFacet ? 1.8 : 0.75;
      ctx.stroke();
    }
    // The horizontal rim makes the hemisphere's structural opening explicit.
    const rim: [number, number][] = [];
    for (let index = 0; index < 80; index++) { const angle = index * Math.PI * 2 / 80; rim.push(screen([Math.cos(angle), 0, Math.sin(angle)])); }
    path(rim); ctx.globalAlpha = 0.65; ctx.strokeStyle = colors.fg; ctx.lineWidth = 1.2; ctx.stroke();
    if (active) {
      const selectedFacet = projected.find((facet) => facet.index === active.facet);
      if (selectedFacet) { path(selectedFacet.points); ctx.globalAlpha = 1; ctx.strokeStyle = colors.accent; ctx.lineWidth = 2; ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
    synchronize();
    attrs.set("data-pica-ready", "true");
  }

  function select(record: GeodesicShellPanel): void {
    if (props.value === null) internalValue = record.id;
    draw();
    emit("valueChange", record.id);
    emit("panelSelect", { ...record });
  }

  function buttonClick(event: MouseEvent): void {
    const button = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-shell-panel]") : null;
    const record = records.find((panel) => panel.id === button?.dataset.shellPanel);
    if (record) select(record);
  }

  function keyboard(event: KeyboardEvent): void {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target?.hasAttribute("data-shell-panel") || !records.length) return;
    const current = records.findIndex((panel) => panel.id === target.dataset.shellPanel);
    let index: number;
    switch (event.key) {
      case "ArrowRight": case "ArrowDown": index = (current + 1) % records.length; break;
      case "ArrowLeft": case "ArrowUp": index = (current + records.length - 1) % records.length; break;
      case "Home": index = 0; break;
      case "End": index = records.length - 1; break;
      default: return;
    }
    event.preventDefault();
    const record = records[index];
    if (!record) return;
    for (const button of controls.querySelectorAll<HTMLButtonElement>("[data-shell-panel]")) if (button.dataset.shellPanel === record.id) button.focus({ preventScroll: true });
    select(record);
  }

  function facetClick(event: MouseEvent): void {
    const rect = surface.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * surface.cssWidth / Math.max(1, rect.width);
    const y = (event.clientY - rect.top) * surface.cssHeight / Math.max(1, rect.height);
    const hit = [...projected].reverse().find((facet) => shellInside(facet.points, x, y));
    const record = records.find((panel) => panel.facet === hit?.index);
    if (record) select(record);
  }

  controls.addEventListener("click", buttonClick);
  controls.addEventListener("keydown", keyboard);
  surface.canvas.addEventListener("click", facetClick);
  accessibility();
  rebuildControls();
  draw();

  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      const nextFrequency = Math.round(shellNumber(props.frequency, 3, 1, 6));
      const geometryChanged = nextFrequency !== frequency;
      if (geometryChanged) { frequency = nextFrequency; facets = shellMesh(frequency); }
      if (geometryChanged || changed(before, props, ["panels"])) rebuildControls();
      if (before.label !== props.label) accessibility();
      palette.refresh();
      draw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      controls.removeEventListener("click", buttonClick);
      controls.removeEventListener("keydown", keyboard);
      surface.canvas.removeEventListener("click", facetClick);
      palette.destroy();
      surface.destroy();
      controls.remove(); status.remove();
      sheet.destroy();
      attrs.restore();
    },
  };
};
