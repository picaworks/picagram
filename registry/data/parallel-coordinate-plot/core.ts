import { dataTable, svg } from "../../../lib/chart";
import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type Grid } from "../../../lib/glyph-grid";
import { hostAttributes, nextId, styleHost } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar, watchPalette } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface ParallelCoordinateAxis {
  /** Key used to read this dimension from each record's values. */
  key: string;
  /** Direct axis label. */
  label: string;
  /** Lower domain bound; null derives it from finite supplied values. */
  min: number | null;
  /** Upper domain bound; null derives it from finite supplied values. */
  max: number | null;
  /** Optional unit suffix shown with numeric values. */
  unit: string;
  /** Put the minimum at the top instead of the bottom. */
  invert: boolean;
}

export interface ParallelCoordinateRecord {
  /** Unique record identifier used for selection. */
  id: string;
  /** Direct label at the record's final available dimension. */
  label: string;
  /** Numeric values by axis key; missing or null values break the line. */
  values: Record<string, number | null>;
}

export interface ParallelCoordinatePlotProps {
  /** Ordered numeric dimensions with independent domains; at least two axes reveal comparisons. */
  axes: ParallelCoordinateAxis[];
  /** Supplied records; duplicate IDs and records with no finite axis values are omitted. */
  records: ParallelCoordinateRecord[];
  /** Selected record ID; null uses internal selection, and an empty string selects nothing. */
  value: string | null;
  /** Initial selected ID, read once at mount in uncontrolled mode. */
  defaultValue: string;
  /** Glyph draws cell-aligned paths; SVG draws exact normalized positions. */
  look: "glyph" | "svg";
  /** Accessible name for the comparison chart and numeric table; empty hides the component. */
  label: string;
}

export interface ParallelCoordinatePlotEvents {
  /** Selected record ID, emitted only after pointer or keyboard input. */
  valueChange: string;
}

export const defaults: ParallelCoordinatePlotProps = {
  axes: [
    { key: "output", label: "OUTPUT", min: 0, max: 100, unit: "", invert: false },
    { key: "efficiency", label: "EFFICIENCY", min: 0, max: 100, unit: "%", invert: false },
    { key: "mass", label: "MASS", min: 0, max: 5, unit: " kg", invert: true },
    { key: "cost", label: "COST", min: 0, max: 1000, unit: "", invert: true },
  ],
  records: [
    { id: "aster", label: "Aster", values: { output: 88, efficiency: 64, mass: 4.1, cost: 760 } },
    { id: "birch", label: "Birch", values: { output: 54, efficiency: 91, mass: 1.2, cost: 410 } },
    { id: "cedar", label: "Cedar", values: { output: 72, efficiency: 82, mass: 2.3, cost: 570 } },
    { id: "delta", label: "Delta", values: { output: 96, efficiency: 52, mass: 3.6, cost: 920 } },
    { id: "elm", label: "Elm", values: { output: 42, efficiency: 76, mass: 0.8, cost: 230 } },
  ],
  value: null,
  defaultValue: "cedar",
  look: "glyph",
  label: "Parallel coordinate comparison of output, efficiency, mass, and cost",
};

type ParallelResolvedAxis = ParallelCoordinateAxis & { lower: number; upper: number };
type ParallelResolvedRecord = { id: string; label: string; values: (number | null)[]; fractions: (number | null)[] };
type ParallelPoint = { x: number; y: number };
type ParallelHit = { id: string; a: ParallelPoint; b: ParallelPoint };

function parallelNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function parallelPrepare(axes: ParallelCoordinateAxis[], records: ParallelCoordinateRecord[]): { axes: ParallelResolvedAxis[]; records: ParallelResolvedRecord[] } {
  const keys = new Set<string>();
  const resolvedAxes: ParallelResolvedAxis[] = [];
  for (const axis of axes) {
    if (!axis.key || keys.has(axis.key)) continue;
    keys.add(axis.key);
    const values = records.map((record) => record.values[axis.key]).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    let lower = typeof axis.min === "number" && Number.isFinite(axis.min) ? axis.min : values.length ? values.reduce((a, b) => Math.min(a, b)) : 0;
    let upper = typeof axis.max === "number" && Number.isFinite(axis.max) ? axis.max : values.length ? values.reduce((a, b) => Math.max(a, b)) : 1;
    if (upper <= lower) {
      const center = values[0] ?? lower;
      const padding = Math.max(0.5, Math.abs(center) * 0.05);
      lower = center - padding;
      upper = center + padding;
    }
    resolvedAxes.push({ ...axis, lower, upper });
  }
  const ids = new Set<string>();
  const resolvedRecords: ParallelResolvedRecord[] = [];
  for (const record of records) {
    if (!record.id || ids.has(record.id)) continue;
    const values = resolvedAxes.map((axis) => {
      const value = record.values[axis.key];
      return typeof value === "number" && Number.isFinite(value) ? value : null;
    });
    if (!values.some((v) => v !== null)) continue;
    ids.add(record.id);
    const fractions = values.map((value, i) => {
      const axis = resolvedAxes[i];
      if (value === null || !axis) return null;
      const fraction = Math.max(0, Math.min(1, (value - axis.lower) / (axis.upper - axis.lower)));
      return axis.invert ? fraction : 1 - fraction;
    });
    resolvedRecords.push({ id: record.id, label: record.label || record.id, values, fractions });
  }
  return { axes: resolvedAxes, records: resolvedRecords };
}

function parallelDistance(point: ParallelPoint, a: ParallelPoint, b: ParallelPoint): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const squared = dx * dx + dy * dy;
  const t = squared ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / squared)) : 0;
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
}

export const mount: Mount<ParallelCoordinatePlotProps> = (host, initial = {}) => {
  let props: ParallelCoordinatePlotProps = { ...defaults, ...initial };
  let internalValue = props.defaultValue;
  let data = parallelPrepare(props.axes, props.records);
  let alive = true;
  let grid: Grid | null = null;
  let graphic: SVGSVGElement | null = null;
  let table: HTMLTableElement | null = null;
  let hits: ParallelHit[] = [];
  const attrs = hostAttributes(host);
  const restoreStyle = styleHost(host, getComputedStyle(host).position === "static" ? { position: "relative" } : {});
  const emit = emitter<ParallelCoordinatePlotEvents>(host);
  const frame = document.createElement("div");
  frame.setAttribute("data-pica", "");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = `position:absolute;inset:0;overflow:hidden;background:${cssVar("bg")};cursor:crosshair`;
  host.appendChild(frame);
  const help = document.createElement("span");
  help.setAttribute("data-pica", "");
  help.id = nextId("parallel-help");
  help.textContent = "Click a record line or use arrow keys to select a record. Home and End select the first and last records; Escape clears selection. Each axis has its own numeric scale. Values outside a domain are clipped; missing values are gaps.";
  const status = document.createElement("span");
  status.setAttribute("data-pica", "");
  status.id = nextId("parallel-status");
  status.setAttribute("aria-live", "polite");
  status.setAttribute("aria-atomic", "true");
  for (const node of [help, status]) {
    node.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0";
    host.appendChild(node);
  }
  const palette = watchPalette(host, () => { if (alive) draw(); });

  function selected(): string { return props.value === null ? internalValue : props.value; }

  function detail(): string {
    const record = data.records.find((item) => item.id === selected());
    if (!record) return data.records.length ? "Select a record · arrow keys or click a line" : "No numeric records";
    return `${record.label} · ${data.axes.map((axis, i) => `${axis.label || axis.key} ${record.values[i] === null ? "missing" : parallelNumber(record.values[i] as number) + (axis.unit || "")}`).join(" / ")}`;
  }

  function accessibility(): void {
    const label = props.label.trim();
    attrs.set("role", label ? "group" : null);
    attrs.set("aria-label", label || null);
    attrs.set("aria-hidden", label ? null : "true");
    attrs.set("tabindex", label ? "0" : null);
    attrs.set("aria-describedby", label ? `${help.id} ${status.id}` : null);
    status.textContent = detail();
  }

  function updateTable(): void {
    table?.remove();
    table = dataTable(props.label || "Parallel coordinate data", ["Record", ...data.axes.map((axis) => `${axis.label || axis.key}${axis.unit ? ` (${axis.unit.trim()})` : ""}`)], data.records.map((record) => [record.label, ...record.values.map((value) => value === null ? "Missing" : value)]));
    host.appendChild(table);
  }

  function orderedRecords(): ParallelResolvedRecord[] {
    return [...data.records.filter((record) => record.id !== selected()), ...data.records.filter((record) => record.id === selected())];
  }

  function labelRows(labels: { id: string; y: number }[], top: number, bottom: number, spacing: number): { id: string; y: number }[] {
    const sorted = [...labels].sort((a, b) => a.y - b.y);
    const gap = Math.min(spacing, (bottom - top) / Math.max(1, sorted.length - 1));
    let last = top - gap;
    for (const item of sorted) { item.y = Math.max(item.y, last + gap); last = item.y; }
    const tail = sorted.at(-1);
    if (tail && tail.y > bottom) {
      tail.y = bottom;
      for (let i = sorted.length - 2; i >= 0; i--) {
        const item = sorted[i], following = sorted[i + 1];
        if (item && following) item.y = Math.min(item.y, following.y - gap);
      }
    }
    return sorted;
  }

  function drawSvg(): void {
    graphic?.remove();
    const width = Math.max(1, frame.clientWidth);
    const height = Math.max(1, frame.clientHeight);
    const root = svg("svg", { "data-pica": "", "aria-hidden": "true", viewBox: `0 0 ${width} ${height}`, "font-family": GRID_FONT, "font-size": 11 });
    root.style.cssText = "display:block;width:100%;height:100%;pointer-events:none";
    frame.appendChild(root);
    graphic = root;
    const left = Math.min(42, width * 0.12);
    const gutter = Math.min(120, Math.max(62, width * 0.2));
    const right = Math.max(left + 1, width - gutter);
    const top = Math.min(58, height * 0.25);
    const bottom = Math.max(top + 1, height - 58);
    const axisX = (i: number): number => data.axes.length < 2 ? (left + right) / 2 : left + i / (data.axes.length - 1) * (right - left);
    function text(x: number, y: number, value: string, anchor = "middle", muted = false): void {
      const node = svg("text", { "data-pica": "", x, y, "text-anchor": anchor, fill: cssVar(muted ? "muted" : "fg") });
      node.textContent = value;
      root.appendChild(node);
    }
    function segment(a: ParallelPoint, b: ParallelPoint, color: "fg" | "muted" | "accent", strokeWidth = 1): void {
      root.appendChild(svg("line", { "data-pica": "", x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: cssVar(color), "stroke-width": strokeWidth, "stroke-linecap": "round" }));
    }
    data.axes.forEach((axis, i) => {
      const x = axisX(i);
      segment({ x, y: top }, { x, y: bottom }, "muted");
      const label = `${axis.label || axis.key}${axis.invert ? " ↓" : ""}`;
      const available = data.axes.length > 1 ? (right - left) / (data.axes.length - 1) : right - left;
      text(x, top - 32, label.slice(0, Math.max(3, Math.floor(available / 6.6))));
      text(x, top - 12, parallelNumber(axis.invert ? axis.lower : axis.upper) + (axis.unit || ""), "middle", true);
      text(x, bottom + 18, parallelNumber(axis.invert ? axis.upper : axis.lower) + (axis.unit || ""), "middle", true);
      for (let tick = 0; tick <= 4; tick++) {
        const y = top + tick / 4 * (bottom - top);
        segment({ x: x - 3, y }, { x: x + 3, y }, "muted");
      }
    });
    hits = [];
    const endpoints = new Map<string, ParallelPoint>();
    for (const record of orderedRecords()) {
      const active = record.id === selected();
      let preceding: ParallelPoint | null = null;
      record.fractions.forEach((fraction, i) => {
        if (fraction === null) { preceding = null; return; }
        const point = { x: axisX(i), y: top + fraction * (bottom - top) };
        if (preceding) {
          segment(preceding, point, active ? "accent" : "muted", active ? 2.4 : 1.1);
          hits.push({ id: record.id, a: preceding, b: point });
        }
        root.appendChild(svg("circle", { "data-pica": "", cx: point.x, cy: point.y, r: active ? 3.4 : 2, fill: cssVar(active ? "accent" : "fg") }));
        hits.push({ id: record.id, a: point, b: point });
        preceding = point;
        endpoints.set(record.id, point);
      });
    }
    const labels = labelRows([...endpoints].map(([id, p]) => ({ id, y: p.y })), top, bottom, 15);
    for (const item of labels) {
      const record = data.records.find((r) => r.id === item.id);
      const point = endpoints.get(item.id);
      if (!record || !point) continue;
      const anchor = { x: right + 10, y: item.y };
      segment(point, anchor, "muted", 0.6);
      const active = item.id === selected();
      text(anchor.x + 4, item.y + 4, `${active ? "› " : ""}${record.label}`.slice(0, Math.max(1, Math.floor((width - anchor.x - 8) / 6.6))), "start");
      hits.push({ id: item.id, a: anchor, b: { x: width - 4, y: item.y } });
    }
    if (!data.axes.length || !data.records.length) text(width / 2, (top + bottom) / 2, !data.axes.length ? "NO NUMERIC AXES" : "NO NUMERIC RECORDS", "middle", true);
    text(12, height - 14, detail().slice(0, Math.max(1, Math.floor((width - 24) / 6.6))), "start");
  }

  function drawGlyph(): void {
    if (!grid) return;
    const g = grid;
    const colors = palette.colors;
    g.clear();
    const left = Math.min(4, Math.floor(g.cols / 8));
    const right = Math.max(left + 1, g.cols - Math.min(17, Math.max(10, Math.floor(g.cols / 5))));
    const top = Math.min(4, Math.floor(g.rows / 4));
    const bottom = Math.max(top + 1, g.rows - 5);
    const axisX = (i: number): number => Math.round(data.axes.length < 2 ? (left + right) / 2 : left + i / (data.axes.length - 1) * (right - left));
    function segment(a: ParallelPoint, b: ParallelPoint, color: string, active = false): void {
      const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y), 1);
      const mark = active ? "•" : Math.abs(b.y - a.y) < 0.5 ? "─" : b.y > a.y ? "╲" : "╱";
      for (let i = 0; i <= steps; i++) g.set(Math.round(a.x + (b.x - a.x) * i / steps), Math.round(a.y + (b.y - a.y) * i / steps), mark, color);
    }
    function centered(x: number, y: number, label: string, color: string, maxLength: number): void {
      const text = label.slice(0, Math.max(1, maxLength));
      g.write(Math.max(0, Math.min(g.cols - text.length, x - Math.floor(text.length / 2))), y, text, color);
    }
    data.axes.forEach((axis, i) => {
      const x = axisX(i);
      for (let y = top; y <= bottom; y++) g.set(x, y, "│", colors.muted);
      const space = data.axes.length > 1 ? Math.floor((right - left) / (data.axes.length - 1)) : right - left;
      centered(x, top - 3, `${axis.label || axis.key}${axis.invert ? "↓" : ""}`, colors.fg, space);
      centered(x, top - 1, parallelNumber(axis.invert ? axis.lower : axis.upper) + (axis.unit || ""), colors.muted, space);
      centered(x, bottom + 1, parallelNumber(axis.invert ? axis.upper : axis.lower) + (axis.unit || ""), colors.muted, space);
      for (let tick = 0; tick <= 4; tick++) g.set(x, Math.round(top + tick / 4 * (bottom - top)), "┼", colors.muted);
    });
    hits = [];
    const endpoints = new Map<string, ParallelPoint>();
    const pixel = (p: ParallelPoint): ParallelPoint => ({ x: (p.x + 0.5) * g.cellWidth, y: (p.y + 0.5) * g.cellHeight });
    for (const record of orderedRecords()) {
      const active = record.id === selected();
      let preceding: ParallelPoint | null = null;
      record.fractions.forEach((fraction, i) => {
        if (fraction === null) { preceding = null; return; }
        const point = { x: axisX(i), y: Math.round(top + fraction * (bottom - top)) };
        if (preceding) {
          segment(preceding, point, active ? colors.accent : colors.muted, active);
          hits.push({ id: record.id, a: pixel(preceding), b: pixel(point) });
        }
        g.set(point.x, point.y, active ? "◆" : "○", active ? colors.accent : colors.fg);
        hits.push({ id: record.id, a: pixel(point), b: pixel(point) });
        preceding = point;
        endpoints.set(record.id, point);
      });
    }
    for (const item of labelRows([...endpoints].map(([id, p]) => ({ id, y: p.y })), top, bottom, 1)) {
      const record = data.records.find((r) => r.id === item.id);
      const point = endpoints.get(item.id);
      if (!record || !point) continue;
      const anchor = { x: right + 2, y: Math.round(item.y) };
      segment(point, anchor, colors.muted);
      const label = `${item.id === selected() ? "›" : " "}${record.label}`.slice(0, Math.max(1, g.cols - anchor.x - 1));
      g.write(anchor.x, anchor.y, label, colors.fg);
      hits.push({ id: item.id, a: pixel(anchor), b: pixel({ x: anchor.x + label.length, y: anchor.y }) });
    }
    if (!data.axes.length || !data.records.length) g.write(2, Math.floor((top + bottom) / 2), (!data.axes.length ? "NO NUMERIC AXES" : "NO NUMERIC RECORDS").slice(0, Math.max(0, g.cols - 4)), colors.muted);
    g.write(1, g.rows - 2, detail().slice(0, Math.max(0, g.cols - 2)), colors.fg);
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
    if (event.target !== host) return;
    if (event.key === "Escape") { event.preventDefault(); select(""); return; }
    if (!data.records.length) return;
    const index = data.records.findIndex((record) => record.id === selected());
    let nextIndex: number;
    switch (event.key) {
      case "ArrowRight": case "ArrowDown": nextIndex = (index + 1) % data.records.length; break;
      case "ArrowLeft": case "ArrowUp": nextIndex = (index < 0 ? data.records.length - 1 : index + data.records.length - 1) % data.records.length; break;
      case "Home": nextIndex = 0; break;
      case "End": nextIndex = data.records.length - 1; break;
      default: return;
    }
    event.preventDefault();
    const record = data.records[nextIndex];
    if (record) select(record.id);
  };
  const onClick = (event: MouseEvent): void => {
    host.focus({ preventScroll: true });
    const rect = frame.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    let distance = 16;
    let id: string | null = null;
    for (const hit of hits) {
      const candidate = parallelDistance(point, hit.a, hit.b);
      if (candidate <= distance) { distance = candidate; id = hit.id; }
    }
    if (id !== null) select(id);
  };
  host.addEventListener("keydown", onKey);
  frame.addEventListener("click", onClick);
  const resize = new ResizeObserver(() => { if (alive && !grid) draw(); });
  resize.observe(frame);
  accessibility();
  updateTable();
  mountView();

  return {
    update(partial) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...partial };
      const dataChanged = !sameJson(before.axes, props.axes) || !sameJson(before.records, props.records);
      if (dataChanged) data = parallelPrepare(props.axes, props.records);
      if (dataChanged || before.label !== props.label) updateTable();
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
