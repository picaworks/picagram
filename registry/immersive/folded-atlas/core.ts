import { createCanvas } from "../../../lib/canvas";
import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId, styleHost } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar, watchPalette } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface FoldedAtlasPanel {
  /** Stable, unique panel ID used by selection. */
  id: string;
  /** Panel name, visible on its selection button. */
  label: string;
  /** Plain-text content shown independently of the folded drawing when selected. */
  description: string;
  /** Filled polygons in panel-local coordinates from 0 to 1, each with at least three finite points. */
  shapes: [number, number][][];
}

export interface FoldedAtlasProps {
  /** Up to twelve connected panels with normalized polygon shapes; duplicate or empty IDs are omitted. */
  panels: FoldedAtlasPanel[];
  /** Accordion fold from 0 (flat) to 1 (72-degree alternating hinges). */
  fold: number;
  /** Selected panel ID. Null uses internal selection; an empty string selects none. */
  value: string | null;
  /** Initial selected panel ID, read once when mounted in uncontrolled mode. */
  defaultValue: string;
  /** Accessible name for the atlas and its independent panel controls. */
  label: string;
}

export interface FoldedAtlasEvents {
  /** Selected panel ID, emitted only after pointer or keyboard input. */
  valueChange: string;
}

export const defaults: FoldedAtlasProps = {
  panels: [
    { id: "coast", label: "Coast", description: "A broken coastline surrounds sheltered bays and offshore islands.", shapes: [[[0, 0.14], [0.37, 0.12], [0.52, 0.27], [0.33, 0.39], [0.51, 0.54], [0.37, 0.69], [0.57, 0.8], [0.38, 0.9], [0, 0.91]], [[0.73, 0.29], [0.89, 0.36], [0.81, 0.47], [0.67, 0.4]], [[0.69, 0.63], [0.83, 0.7], [0.74, 0.79], [0.63, 0.72]]] },
    { id: "estuary", label: "Estuary", description: "Tidal channels divide the estuary into long, low islands.", shapes: [[[0, 0.14], [0.63, 0.1], [1, 0.22], [1, 0.43], [0.72, 0.33], [0.43, 0.4], [0.15, 0.3], [0, 0.36]], [[0, 0.5], [0.23, 0.42], [0.59, 0.53], [1, 0.46], [1, 0.74], [0.67, 0.65], [0.38, 0.7], [0.13, 0.63], [0, 0.76]], [[0.08, 0.82], [0.46, 0.77], [0.81, 0.86], [0.53, 0.94], [0.16, 0.91]]] },
    { id: "highlands", label: "Highlands", description: "Three ridges rise inland, separated by narrow valleys.", shapes: [[[0, 0.22], [0.26, 0.13], [0.37, 0.28], [0.2, 0.41], [0.35, 0.57], [0.18, 0.74], [0, 0.74]], [[0.36, 0.17], [0.63, 0.1], [0.7, 0.32], [0.54, 0.46], [0.72, 0.67], [0.48, 0.81], [0.35, 0.61], [0.45, 0.4]], [[0.76, 0.17], [1, 0.23], [1, 0.87], [0.79, 0.93], [0.85, 0.73], [0.71, 0.51], [0.86, 0.36]]] },
    { id: "interior", label: "Interior", description: "A broad interior basin holds an enclosed lake and a winding southern outlet.", shapes: [[[0, 0.23], [0.38, 0.11], [0.8, 0.19], [0.96, 0.43], [0.86, 0.71], [0.63, 0.77], [0.7, 0.49], [0.49, 0.36], [0.3, 0.49], [0.42, 0.68], [0.31, 0.9], [0, 0.87]], [[0.49, 0.47], [0.63, 0.51], [0.58, 0.61], [0.46, 0.58]]] },
  ],
  fold: 0.46,
  value: null,
  defaultValue: "estuary",
  label: "Folded landscape atlas",
};

type AtlasPoint = { x: number; y: number; z: number };
type AtlasFace = { id: string; index: number; polygon: AtlasPoint[]; depth: number };

function atlasPanels(input: FoldedAtlasPanel[]): FoldedAtlasPanel[] {
  const panels: FoldedAtlasPanel[] = [];
  const seen = new Set<string>();
  for (const panel of Array.isArray(input) ? input : []) {
    if (!panel || !panel.id || seen.has(panel.id) || panels.length >= 12) continue;
    const shapes: [number, number][][] = [];
    for (const shape of Array.isArray(panel.shapes) ? panel.shapes : []) {
      if (!Array.isArray(shape)) continue;
      const points: [number, number][] = [];
      for (const point of shape) {
        if (!Array.isArray(point)) continue;
        const x = point[0], y = point[1];
        if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) continue;
        points.push([Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))]);
      }
      if (points.length >= 3) shapes.push(points);
    }
    seen.add(panel.id);
    panels.push({ id: panel.id, label: String(panel.label || panel.id), description: String(panel.description || ""), shapes });
  }
  return panels;
}

export const mount: Mount<FoldedAtlasProps> = (host, initial = {}) => {
  let props: FoldedAtlasProps = { ...defaults, ...initial };
  let panels = atlasPanels(props.panels);
  let internalValue = props.defaultValue;
  let alive = true;
  let started = false;
  let faces: AtlasFace[] = [];
  const buttons = new Map<string, HTMLButtonElement>();
  const attrs = hostAttributes(host);
  const restore = styleHost(host, getComputedStyle(host).position === "static" ? { position: "relative" } : {});
  const emit = emitter<FoldedAtlasEvents>(host);
  const frame = document.createElement("div");
  frame.setAttribute("data-pica", "");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:absolute;inset:0 0 96px;overflow:hidden;cursor:pointer";
  host.appendChild(frame);
  const footer = document.createElement("div");
  footer.setAttribute("data-pica", "");
  footer.style.cssText = "position:absolute;left:16px;right:16px;bottom:12px;display:grid;gap:8px";
  const controls = document.createElement("div");
  controls.setAttribute("data-pica", "");
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-label", "Atlas panels");
  controls.style.cssText = "display:flex;flex-wrap:wrap;gap:6px";
  const content = document.createElement("section");
  content.setAttribute("data-pica", "");
  content.id = nextId("atlas-content");
  content.style.cssText = `color:${cssVar("fg")};font:inherit;line-height:1.45;min-height:1.45em`;
  footer.append(controls, content);
  host.appendChild(footer);
  const surface = createCanvas(frame, { maxPixels: 4000000, onResize: () => { if (started) draw(); } });
  const ctx = surface.canvas.getContext("2d");
  const palette = watchPalette(host, () => { if (started) draw(); });

  function selected(): string { return props.value === null ? internalValue : props.value; }

  function accessibility(): void {
    attrs.set("role", "group");
    attrs.set("aria-label", props.label || "Folded atlas");
    attrs.set("tabindex", "0");
  }

  function buildControls(): void {
    const focused = document.activeElement instanceof HTMLButtonElement && controls.contains(document.activeElement) ? document.activeElement.getAttribute("data-atlas-panel") : null;
    for (const button of buttons.values()) button.remove();
    buttons.clear();
    for (const panel of panels) {
      const button = document.createElement("button");
      button.setAttribute("data-pica", "");
      button.setAttribute("data-atlas-panel", panel.id);
      button.id = nextId("atlas-panel");
      button.type = "button";
      button.setAttribute("aria-controls", content.id);
      button.textContent = panel.label;
      button.style.cssText = `font:inherit;line-height:1.3;color:${cssVar("fg")};background:${cssVar("bg")};border:1px solid ${cssVar("muted")};border-radius:0;padding:5px 9px;cursor:pointer`;
      buttons.set(panel.id, button);
      controls.appendChild(button);
    }
    if (focused) buttons.get(focused)?.focus({ preventScroll: true });
  }

  function selection(): void {
    const value = selected();
    for (const [id, button] of buttons) {
      const active = id === value;
      button.setAttribute("aria-pressed", String(active));
      button.style.borderColor = cssVar(active ? "accent" : "muted");
      button.style.borderWidth = active ? "2px" : "1px";
      button.style.padding = active ? "4px 8px" : "5px 9px";
    }
    const panel = panels.find((p) => p.id === value);
    const button = panel ? buttons.get(panel.id) : undefined;
    if (button) content.setAttribute("aria-labelledby", button.id);
    else content.removeAttribute("aria-labelledby");
    content.textContent = panel ? panel.description : panels.length ? "Select a panel to read its content." : "No atlas panels.";
  }

  function project(index: number, u: number, v: number): AtlasPoint {
    const fold = Math.max(0, Math.min(1, Number.isFinite(props.fold) ? props.fold : defaults.fold));
    const angle = fold * Math.PI * 0.4;
    const along = Math.cos(angle), rise = Math.sin(angle);
    const x = (index + u - panels.length / 2) * along;
    const y = (v - 0.5) * 1.45;
    const z = ((index % 2 === 0 ? u : 1 - u) - 0.5) * rise;
    const yaw = -0.22, pitch = 0.14;
    const rx = x * Math.cos(yaw) + z * Math.sin(yaw);
    const rz = -x * Math.sin(yaw) + z * Math.cos(yaw);
    const ry = y * Math.cos(pitch) - rz * Math.sin(pitch);
    const depth = y * Math.sin(pitch) + rz * Math.cos(pitch);
    const distance = Math.max(5, panels.length * 0.9);
    const perspective = distance / (distance + depth);
    return { x: rx * perspective, y: ry * perspective, z: depth };
  }

  function draw(): void {
    if (!alive) return;
    const width = Math.max(1, surface.cssWidth), height = Math.max(1, surface.cssHeight);
    const rawFaces: AtlasFace[] = panels.map((panel, index) => {
      const polygon = [project(index, 0, 0), project(index, 1, 0), project(index, 1, 1), project(index, 0, 1)];
      return { id: panel.id, index, polygon, depth: polygon.reduce((sum, p) => sum + p.z, 0) / 4 };
    });
    const all = rawFaces.flatMap((face) => face.polygon);
    let minX = 0, maxX = 1, minY = 0, maxY = 1;
    if (all.length) {
      minX = Math.min(...all.map((p) => p.x)); maxX = Math.max(...all.map((p) => p.x));
      minY = Math.min(...all.map((p) => p.y)); maxY = Math.max(...all.map((p) => p.y));
    }
    const scale = Math.max(1, Math.min(Math.max(1, width - 34) / Math.max(0.1, maxX - minX), Math.max(1, height - 34) / Math.max(0.1, maxY - minY)));
    const x0 = width / 2 - (minX + maxX) / 2 * scale;
    const y0 = height / 2 - (minY + maxY) / 2 * scale;
    const screen = (point: AtlasPoint): AtlasPoint => ({ x: x0 + point.x * scale, y: y0 + point.y * scale, z: point.z });
    const at = (index: number, u: number, v: number): AtlasPoint => screen(project(index, u, v));
    faces = rawFaces.map((face) => ({ ...face, polygon: face.polygon.map(screen) })).sort((a, b) => b.depth - a.depth);
    if (ctx) {
      ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = palette.colors.bg;
      ctx.fillRect(0, 0, width, height);
      const path = (points: AtlasPoint[]): void => {
        ctx.beginPath();
        points.forEach((p, i) => { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
        ctx.closePath();
      };
      for (const face of faces) {
        const panel = panels[face.index];
        if (!panel) continue;
        path(face.polygon);
        ctx.fillStyle = palette.colors.bg;
        ctx.globalAlpha = 1;
        ctx.fill();
        ctx.fillStyle = palette.colors.fg;
        ctx.globalAlpha = face.index % 2 ? 0.09 : 0.035;
        ctx.fill();
        ctx.save();
        path(face.polygon);
        ctx.clip();
        ctx.strokeStyle = palette.colors.muted;
        ctx.lineWidth = 0.6;
        ctx.globalAlpha = 0.55;
        for (const t of [0.25, 0.5, 0.75]) {
          for (const pair of [[at(face.index, t, 0), at(face.index, t, 1)], [at(face.index, 0, t), at(face.index, 1, t)]]) {
            const a = pair[0], b = pair[1];
            if (!a || !b) continue;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        for (const shape of panel.shapes) {
          const polygon = shape.map(([u, v]) => at(face.index, u, v));
          path(polygon);
          ctx.fillStyle = palette.colors.fg;
          ctx.globalAlpha = 0.18;
          ctx.fill();
          ctx.strokeStyle = palette.colors.fg;
          ctx.globalAlpha = 0.75;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.restore();
        const active = panel.id === selected();
        path(face.polygon);
        ctx.strokeStyle = active ? palette.colors.accent : palette.colors.fg;
        ctx.globalAlpha = active ? 1 : 0.7;
        ctx.lineWidth = active ? 2 : 1;
        ctx.stroke();
        const lower = at(face.index, 0.5, 0.96);
        const left = at(face.index, 0, 0.96), right = at(face.index, 1, 0.96);
        ctx.font = `10px ${GRID_FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillStyle = palette.colors.fg;
        ctx.globalAlpha = 1;
        const name = panel.label.toUpperCase();
        ctx.fillText(Math.abs(right.x - left.x) >= ctx.measureText(name).width + 8 ? name : String(face.index + 1), lower.x, lower.y - 4);
      }
      ctx.globalAlpha = 1;
    }
    attrs.set("data-pica-ready", "true");
  }

  function fitContent(): void {
    if (!alive) return;
    frame.style.bottom = `${Math.max(28, footer.offsetHeight + 24)}px`;
    if (started) draw();
  }

  function select(id: string): void {
    if (id === selected() || !panels.some((p) => p.id === id)) return;
    if (props.value === null) { internalValue = id; selection(); fitContent(); }
    emit("valueChange", id);
  }

  const onButton = (event: MouseEvent): void => {
    const button = event.target instanceof Element ? event.target.closest("button[data-atlas-panel]") : null;
    if (!button || !controls.contains(button)) return;
    const id = button.getAttribute("data-atlas-panel");
    if (id) select(id);
  };
  const onKey = (event: KeyboardEvent): void => {
    const button = event.target instanceof Element ? event.target.closest("button[data-atlas-panel]") : null;
    if (event.target !== host && (!button || !controls.contains(button))) return;
    if (!panels.length) return;
    const id = button?.getAttribute("data-atlas-panel") || selected();
    const index = panels.findIndex((panel) => panel.id === id);
    let next: number;
    switch (event.key) {
      case "ArrowRight": case "ArrowDown": next = (index + 1) % panels.length; break;
      case "ArrowLeft": case "ArrowUp": next = index < 0 ? panels.length - 1 : (index + panels.length - 1) % panels.length; break;
      case "Home": next = 0; break;
      case "End": next = panels.length - 1; break;
      default: return;
    }
    const panel = panels[next];
    if (!panel) return;
    event.preventDefault();
    buttons.get(panel.id)?.focus({ preventScroll: true });
    select(panel.id);
  };
  const onCanvas = (event: MouseEvent): void => {
    host.focus({ preventScroll: true });
    const rect = frame.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    // Near faces are visited first, matching the canvas painter's order.
    for (const face of [...faces].reverse()) {
      let inside = false;
      for (let i = 0; i < face.polygon.length; i++) {
        const a = face.polygon[i], b = face.polygon[(i + 1) % face.polygon.length];
        if (!a || !b || (a.y > y) === (b.y > y)) continue;
        if (x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
      }
      if (inside) { select(face.id); return; }
    }
  };
  controls.addEventListener("click", onButton);
  host.addEventListener("keydown", onKey);
  frame.addEventListener("click", onCanvas);
  const contentResize = typeof ResizeObserver === "function" ? new ResizeObserver(fitContent) : null;
  contentResize?.observe(footer);
  accessibility();
  buildControls();
  selection();
  fitContent();
  started = true;
  draw();

  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      if (!sameJson(before.panels, props.panels)) {
        panels = atlasPanels(props.panels);
        buildControls();
      }
      accessibility();
      selection();
      palette.refresh();
      fitContent();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      contentResize?.disconnect();
      controls.removeEventListener("click", onButton);
      host.removeEventListener("keydown", onKey);
      frame.removeEventListener("click", onCanvas);
      palette.destroy();
      surface.destroy();
      frame.remove();
      footer.remove();
      buttons.clear();
      attrs.restore();
      restore();
    },
  };
};
