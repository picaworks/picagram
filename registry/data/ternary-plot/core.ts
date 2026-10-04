import { dataTable, svg } from "../../../lib/chart";
import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type Grid } from "../../../lib/glyph-grid";
import { hostAttributes, nextId, styleHost } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar, watchPalette } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface TernaryPlotProps {
  /** Samples with unique IDs and three nonnegative weights; positive totals are normalized to 100%. Invalid samples are omitted. */
  points: { id: string; label: string; a: number; b: number; c: number }[];
  /** Names of the top, bottom-left, and bottom-right components, in that order. */
  labels: [string, string, string];
  /** Accessible name for the chart and its data table. */
  label: string;
  /** Selected sample ID. Null uses internal selection; an empty string selects nothing. */
  value: string | null;
  /** Initial selected sample ID, read once when mounted in uncontrolled mode. */
  defaultValue: string;
  /** Glyph draws cell-aligned marks and guides; SVG draws exact barycentric positions. */
  look: "glyph" | "svg";
}

export interface TernaryPlotEvents {
  /** Selected sample ID, emitted only after pointer or keyboard input. */
  valueChange: string;
}

export const defaults: TernaryPlotProps = {
  points: [
    { id: "clay", label: "Clay", a: 72, b: 18, c: 10 },
    { id: "silt", label: "Silt", a: 14, b: 76, c: 10 },
    { id: "sand", label: "Sand", a: 10, b: 12, c: 78 },
    { id: "loam", label: "Loam", a: 32, b: 36, c: 32 },
    { id: "sandy-loam", label: "Sandy loam", a: 22, b: 22, c: 56 },
  ],
  labels: ["CLAY", "SILT", "SAND"],
  label: "Soil composition: clay, silt, and sand",
  value: null,
  defaultValue: "loam",
  look: "glyph",
};

type TernarySample = { id: string; label: string; a: number; b: number; c: number; fractions: [number, number, number] };
type TernaryPosition = { x: number; y: number };

function ternarySamples(points: TernaryPlotProps["points"]): TernarySample[] {
  const seen = new Set<string>();
  const result: TernarySample[] = [];
  for (const p of points) {
    if (!p.id || seen.has(p.id) || ![p.a, p.b, p.c].every((v) => Number.isFinite(v) && v >= 0)) continue;
    const largest = Math.max(p.a, p.b, p.c);
    if (largest === 0) continue;
    const scaled: [number, number, number] = [p.a / largest, p.b / largest, p.c / largest];
    const total = scaled[0] + scaled[1] + scaled[2];
    seen.add(p.id);
    result.push({ ...p, fractions: [scaled[0] / total, scaled[1] / total, scaled[2] / total] });
  }
  return result;
}

function ternaryPosition(f: readonly [number, number, number], top: TernaryPosition, left: TernaryPosition, right: TernaryPosition): TernaryPosition {
  return { x: f[0] * top.x + f[1] * left.x + f[2] * right.x, y: f[0] * top.y + f[1] * left.y + f[2] * right.y };
}

function ternaryPercent(n: number): string {
  return `${(n * 100).toFixed(1).replace(/\.0$/, "")}%`;
}

export const mount: Mount<TernaryPlotProps> = (host, initial = {}) => {
  let props: TernaryPlotProps = { ...defaults, ...initial };
  let internalValue = props.defaultValue;
  let samples = ternarySamples(props.points);
  let alive = true;
  let grid: Grid | null = null;
  let graphic: SVGSVGElement | null = null;
  let table: HTMLTableElement | null = null;
  let positions: { id: string; x: number; y: number }[] = [];
  const attrs = hostAttributes(host);
  const restoreStyle = styleHost(host, getComputedStyle(host).position === "static" ? { position: "relative" } : {});
  const emit = emitter<TernaryPlotEvents>(host);
  const frame = document.createElement("div");
  frame.setAttribute("data-pica", "");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = `position:absolute;inset:0;overflow:hidden;background:${cssVar("bg")};cursor:crosshair`;
  host.appendChild(frame);
  const help = document.createElement("span");
  help.setAttribute("data-pica", "");
  help.id = nextId("ternary-help");
  help.textContent = "Use arrow keys to select samples, Home for the first, End for the last, or click a mark. Values are normalized to 100 percent.";
  const status = document.createElement("span");
  status.setAttribute("data-pica", "");
  status.id = nextId("ternary-status");
  status.setAttribute("aria-live", "polite");
  status.setAttribute("aria-atomic", "true");
  for (const node of [help, status]) {
    node.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0";
    host.appendChild(node);
  }
  const palette = watchPalette(host, () => { if (alive) draw(); });

  function selected(): string { return props.value === null ? internalValue : props.value; }

  function detail(): string {
    const point = samples.find((p) => p.id === selected());
    return point ? `${point.label || point.id} · ${props.labels.map((label, i) => `${label} ${ternaryPercent(point.fractions[i] ?? 0)}`).join(" / ")}` : samples.length ? "Select a sample · arrow keys or click" : "No valid composition data";
  }

  function accessibility(): void {
    attrs.set("role", "group");
    attrs.set("aria-label", props.label || "Ternary composition plot");
    attrs.set("tabindex", "0");
    attrs.set("aria-describedby", `${help.id} ${status.id}`);
    status.textContent = detail();
  }

  function updateTable(): void {
    table?.remove();
    table = dataTable(props.label || "Ternary composition plot", ["Sample", ...props.labels.map((label) => `${label} weight`), ...props.labels.map((label) => `${label} proportion`)], samples.map((p) => [p.label || p.id, p.a, p.b, p.c, ...p.fractions.map(ternaryPercent)]));
    host.appendChild(table);
  }

  function drawSvg(): void {
    graphic?.remove();
    const width = Math.max(1, frame.clientWidth);
    const height = Math.max(1, frame.clientHeight);
    const root = svg("svg", { "data-pica": "", "aria-hidden": "true", viewBox: `0 0 ${width} ${height}`, "font-family": GRID_FONT, "font-size": 11 });
    root.style.cssText = "display:block;width:100%;height:100%;pointer-events:none";
    frame.appendChild(root);
    graphic = root;
    const triangleHeight = Math.max(1, Math.min(height - 112, (width - 84) * Math.sqrt(3) / 2));
    const half = triangleHeight / Math.sqrt(3);
    const cy = Math.max(50, (height - triangleHeight) / 2 - 5);
    const top = { x: width / 2, y: cy };
    const left = { x: width / 2 - half, y: cy + triangleHeight };
    const right = { x: width / 2 + half, y: cy + triangleHeight };
    function line(a: TernaryPosition, b: TernaryPosition, edge = false): void {
      root.appendChild(svg("line", { "data-pica": "", x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: cssVar(edge ? "fg" : "muted"), "stroke-width": edge ? 1.2 : 0.6, "stroke-dasharray": edge ? "none" : "2 5" }));
    }
    function text(x: number, y: number, value: string, anchor = "middle", muted = false): void {
      const node = svg("text", { "data-pica": "", x, y, "text-anchor": anchor, fill: cssVar(muted ? "muted" : "fg") });
      node.textContent = value;
      root.appendChild(node);
    }
    text(16, 22, "COMPOSITION / 100%", "start", true);
    for (let step = 1; step < 5; step++) {
      const t = step / 5;
      for (const pair of [
        [[t, 1 - t, 0], [t, 0, 1 - t]],
        [[1 - t, t, 0], [0, t, 1 - t]],
        [[1 - t, 0, t], [0, 1 - t, t]],
      ] as const) line(ternaryPosition(pair[0], top, left, right), ternaryPosition(pair[1], top, left, right));
      const tick = ternaryPosition([t, 1 - t, 0], top, left, right);
      text(tick.x - 8, tick.y + 4, String(step * 20), "end", true);
    }
    line(top, left, true); line(left, right, true); line(right, top, true);
    text(top.x, top.y - 16, `${props.labels[0]} 100%`);
    text(left.x, left.y + 21, `${props.labels[1]} 100%`, "start");
    text(right.x, right.y + 21, `${props.labels[2]} 100%`, "end");
    positions = samples.map((point) => {
      const position = ternaryPosition(point.fractions, top, left, right);
      const active = point.id === selected();
      if (active) root.appendChild(svg("circle", { "data-pica": "", cx: position.x, cy: position.y, r: 9, fill: "none", stroke: cssVar("accent"), "stroke-width": 2 }));
      root.appendChild(svg("circle", { "data-pica": "", cx: position.x, cy: position.y, r: 3, fill: cssVar("fg") }));
      const label = point.label || point.id;
      const onRight = position.x + 12 + label.length * 6.8 > width - 8;
      text(position.x + (onRight ? -12 : 12), position.y + 4, label, onRight ? "end" : "start");
      return { id: point.id, ...position };
    });
    if (!samples.length) text(width / 2, top.y + triangleHeight * 0.65, "NO VALID DATA", "middle", true);
    text(16, height - 19, detail(), "start");
    const omitted = props.points.length - samples.length;
    if (omitted > 0) text(width - 14, 22, `${omitted} INVALID OMITTED`, "end", true);
  }

  function drawGlyph(): void {
    if (!grid) return;
    const g = grid;
    const colors = palette.colors;
    g.clear();
    const center = Math.floor(g.cols / 2);
    const span = Math.max(2, Math.min(g.cols - 12, Math.floor(Math.max(2, g.rows - 10) * 2 / (Math.sqrt(3) * g.aspect))));
    const triangleRows = Math.max(1, Math.floor(span * g.aspect * Math.sqrt(3) / 2));
    const start = Math.max(4, Math.floor((g.rows - triangleRows) / 2) - 1);
    const top = { x: center, y: start };
    const left = { x: center - Math.floor(span / 2), y: start + triangleRows };
    const right = { x: center + Math.floor(span / 2), y: start + triangleRows };
    function segment(a: TernaryPosition, b: TernaryPosition, glyph: string, color: string): void {
      const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y), 1);
      for (let i = 0; i <= steps; i++) g.set(Math.round(a.x + (b.x - a.x) * i / steps), Math.round(a.y + (b.y - a.y) * i / steps), glyph, color);
    }
    function writeCentered(x: number, y: number, label: string, color: string): void {
      const text = label.slice(0, g.cols);
      g.write(Math.max(0, Math.min(g.cols - text.length, Math.round(x - text.length / 2))), Math.round(y), text, color);
    }
    g.write(2, 1, "COMPOSITION / 100%", colors.muted);
    for (let step = 1; step < 5; step++) {
      const t = step / 5;
      for (const pair of [
        [[t, 1 - t, 0], [t, 0, 1 - t]],
        [[1 - t, t, 0], [0, t, 1 - t]],
        [[1 - t, 0, t], [0, 1 - t, t]],
      ] as const) segment(ternaryPosition(pair[0], top, left, right), ternaryPosition(pair[1], top, left, right), "·", colors.muted);
      const tick = ternaryPosition([t, 1 - t, 0], top, left, right);
      g.write(Math.max(0, Math.round(tick.x) - 3), Math.round(tick.y), String(step * 20), colors.muted);
    }
    segment(top, left, "╱", colors.fg); segment(left, right, "─", colors.fg); segment(right, top, "╲", colors.fg);
    writeCentered(top.x, top.y - 2, `${props.labels[0]} 100%`, colors.fg);
    g.write(Math.max(0, left.x), left.y + 2, `${props.labels[1]} 100%`, colors.fg);
    const rightLabel = `${props.labels[2]} 100%`;
    g.write(Math.max(0, right.x - rightLabel.length + 1), right.y + 2, rightLabel, colors.fg);
    positions = samples.map((point) => {
      const p = ternaryPosition(point.fractions, top, left, right);
      const col = Math.round(p.x), row = Math.round(p.y);
      const active = point.id === selected();
      g.set(col, row, active ? "◆" : "○", active ? colors.accent : colors.fg);
      const label = (point.label || point.id).slice(0, Math.max(1, g.cols - 4));
      const labelCol = col + label.length + 2 < g.cols ? col + 2 : Math.max(0, col - label.length - 1);
      g.write(labelCol, row, label, colors.fg);
      return { id: point.id, x: (col + 0.5) * g.cellWidth, y: (row + 0.5) * g.cellHeight };
    });
    if (!samples.length) writeCentered(center, start + Math.round(triangleRows * 0.65), "NO VALID DATA", colors.muted);
    g.write(2, g.rows - 2, detail().slice(0, Math.max(0, g.cols - 4)), colors.fg);
    g.flush();
  }

  function draw(): void {
    if (!alive) return;
    if (grid) drawGlyph(); else drawSvg();
    status.textContent = detail();
    attrs.set("data-pica-ready", "true");
  }

  function mountView(): void {
    if (props.look === "glyph") grid = createGrid(frame, { fontFamily: GRID_FONT, fontSize: 12, columns: 0, lineHeight: 1.2, renderer: "canvas", color: "" }, draw);
    draw();
  }

  function select(id: string): void {
    if (id === selected()) return;
    if (props.value === null) { internalValue = id; draw(); }
    emit("valueChange", id);
  }

  const onKey = (event: KeyboardEvent): void => {
    if (event.target !== host || !samples.length) return;
    const index = samples.findIndex((p) => p.id === selected());
    let next: number;
    switch (event.key) {
      case "ArrowRight": case "ArrowDown": next = (index + 1) % samples.length; break;
      case "ArrowLeft": case "ArrowUp": next = (index < 0 ? samples.length : index + samples.length - 1) % samples.length; break;
      case "Home": next = 0; break;
      case "End": next = samples.length - 1; break;
      default: return;
    }
    event.preventDefault();
    const sample = samples[next];
    if (sample) select(sample.id);
  };
  const onClick = (event: MouseEvent): void => {
    if (event.target !== frame && !(event.target instanceof Node && frame.contains(event.target))) return;
    host.focus({ preventScroll: true });
    const rect = frame.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    let nearest: typeof positions[number] | undefined;
    let distance = 28;
    for (const p of positions) {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < distance) { nearest = p; distance = d; }
    }
    if (nearest) select(nearest.id);
  };
  host.addEventListener("keydown", onKey);
  frame.addEventListener("click", onClick);
  const resize = new ResizeObserver(() => { if (alive && !grid) draw(); });
  resize.observe(frame);
  accessibility();
  updateTable();
  mountView();

  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      const dataChanged = !sameJson(before.points, props.points);
      if (dataChanged) samples = ternarySamples(props.points);
      if (dataChanged || before.label !== props.label || !sameJson(before.labels, props.labels)) updateTable();
      accessibility();
      palette.refresh();
      if (before.look !== props.look) {
        grid?.destroy(); grid = null;
        graphic?.remove(); graphic = null;
        mountView();
      } else draw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      resize.disconnect();
      host.removeEventListener("keydown", onKey);
      frame.removeEventListener("click", onClick);
      grid?.destroy();
      palette.destroy();
      frame.remove();
      table?.remove();
      help.remove();
      status.remove();
      attrs.restore();
      restoreStyle();
    },
  };
};
