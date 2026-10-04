import { createBraillePlot } from "../../../lib/braille-plot";
import { arcPath, dataTable, formatNumber, svg } from "../../../lib/chart";
import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type Grid } from "../../../lib/glyph-grid";
import { hostAttributes, nextId, styleHost } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar, watchPalette } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface ChordDiagramProps {
  /** Directed square matrix: row sends to column. Up to 24 groups; missing, negative or nonfinite weights become zero. */
  matrix: number[][];
  /** Direct endpoint names in matrix order; missing names use the one-based group number. */
  labels: string[];
  /** Accessible name for the diagram and the numeric matrix table. */
  label: string;
  /** Selected zero-based group index. Null uses internal selection; -1 selects nothing. */
  value: number | null;
  /** Initial group selection, read once on mount when value is null. */
  defaultValue: number;
  /** Glyph renders the same ribbons as cell-aligned braille; SVG renders continuous ribbon boundaries. */
  look: "glyph" | "svg";
}

export interface ChordDiagramEvents {
  /** Selected zero-based endpoint index, emitted only after user input. */
  valueChange: number;
}

export const defaults: ChordDiagramProps = {
  matrix: [
    [0, 24, 15, 7, 0],
    [10, 0, 36, 18, 4],
    [5, 12, 0, 44, 14],
    [3, 8, 20, 0, 32],
    [16, 0, 12, 9, 0],
  ],
  labels: ["RESEARCH", "DESIGN", "PRODUCT", "BUILD", "SUPPORT"],
  label: "Relationships between research, design, product, build, and support",
  value: null,
  defaultValue: 2,
  look: "glyph",
};

type ChordPoint = { x: number; y: number };
type ChordGroup = { index: number; start: number; end: number; outgoing: number; incoming: number };
type ChordRibbon = { from: number; to: number; weight: number; s0: number; s1: number; t0: number; t1: number };
type ChordModel = { matrix: number[][]; names: string[]; groups: ChordGroup[]; ribbons: ChordRibbon[] };

function chordModel(matrix: number[][], labels: string[]): ChordModel {
  const count = Math.min(24, Array.isArray(matrix) ? matrix.length : 0);
  const values = Array.from({ length: count }, (_, row) => Array.from({ length: count }, (_, col) => {
    const value = matrix[row]?.[col];
    return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
  }));
  const names = Array.from({ length: count }, (_, i) => String(labels?.[i] || `Group ${i + 1}`));
  let largest = 0;
  for (const row of values) for (const weight of row) largest = Math.max(largest, weight);
  const scaled = values.map((row) => row.map((weight) => largest ? weight / largest : 0));
  const outgoing = scaled.map((row) => row.reduce((sum, weight) => sum + weight, 0));
  const incoming = scaled.map((_, col) => scaled.reduce((sum, row) => sum + (row[col] ?? 0), 0));
  const incident = outgoing.map((weight, i) => weight + (incoming[i] ?? 0));
  const total = incident.reduce((sum, weight) => sum + weight, 0);
  const gap = Math.min(0.065, Math.PI * 2 / Math.max(1, count * 8));
  const zeroArc = 0.025;
  const available = Math.PI * 2 - gap * count - incident.filter((weight) => weight === 0).length * zeroArc;
  let angle = gap / 2;
  const groups = incident.map((weight, index) => {
    const span = total ? weight ? weight / total * available : zeroArc : (Math.PI * 2 - gap * count) / Math.max(1, count);
    const group = { index, start: angle, end: angle + span, outgoing: outgoing[index] ? (outgoing[index] ?? 0) * largest : 0, incoming: incoming[index] ? (incoming[index] ?? 0) * largest : 0 };
    angle += span + gap;
    return group;
  });
  const cursors = groups.map((group) => group.start);
  const ribbons: ChordRibbon[] = [];
  for (let from = 0; from < count; from++) {
    for (let to = 0; to < count; to++) {
      const weight = values[from]?.[to] ?? 0;
      if (!weight) continue;
      const span = total ? (scaled[from]?.[to] ?? 0) / total * available : 0;
      const s0 = cursors[from] ?? 0;
      cursors[from] = s0 + span;
      const t0 = cursors[to] ?? 0;
      cursors[to] = t0 + span;
      ribbons.push({ from, to, weight, s0, s1: s0 + span, t0, t1: t0 + span });
    }
  }
  return { matrix: values, names, groups, ribbons };
}

function chordAt(cx: number, cy: number, radius: number, angle: number): ChordPoint {
  return { x: cx + radius * Math.sin(angle), y: cy - radius * Math.cos(angle) };
}

function chordPolygon(ribbon: ChordRibbon, cx: number, cy: number, radius: number): ChordPoint[] {
  const points: ChordPoint[] = [];
  function arc(start: number, end: number): void {
    const steps = Math.max(2, Math.ceil((end - start) * radius / 3));
    for (let i = 0; i <= steps; i++) points.push(chordAt(cx, cy, radius, start + (end - start) * i / steps));
  }
  function curve(from: ChordPoint, to: ChordPoint): void {
    for (let i = 1; i <= 28; i++) {
      const t = i / 28, a = 1 - t;
      points.push({ x: a * a * from.x + 2 * a * t * cx + t * t * to.x, y: a * a * from.y + 2 * a * t * cy + t * t * to.y });
    }
  }
  arc(ribbon.s0, ribbon.s1);
  curve(chordAt(cx, cy, radius, ribbon.s1), chordAt(cx, cy, radius, ribbon.t0));
  arc(ribbon.t0, ribbon.t1);
  curve(chordAt(cx, cy, radius, ribbon.t1), chordAt(cx, cy, radius, ribbon.s0));
  return points;
}

function chordPath(ribbon: ChordRibbon, cx: number, cy: number, radius: number): string {
  const at = (angle: number): string => {
    const point = chordAt(cx, cy, radius, angle);
    return `${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  };
  return `M${at(ribbon.s0)}A${radius} ${radius} 0 ${ribbon.s1 - ribbon.s0 > Math.PI ? 1 : 0} 1 ${at(ribbon.s1)}Q${cx} ${cy} ${at(ribbon.t0)}A${radius} ${radius} 0 ${ribbon.t1 - ribbon.t0 > Math.PI ? 1 : 0} 1 ${at(ribbon.t1)}Q${cx} ${cy} ${at(ribbon.s0)}Z`;
}

export const mount: Mount<ChordDiagramProps> = (host, initial = {}) => {
  let props: ChordDiagramProps = { ...defaults, ...initial };
  let model = chordModel(props.matrix, props.labels);
  let internalValue = props.defaultValue;
  let alive = true;
  let grid: Grid | null = null;
  let graphic: SVGSVGElement | null = null;
  let table: HTMLTableElement | null = null;
  let targets: { index: number; x: number; y: number }[] = [];
  const attrs = hostAttributes(host);
  const restore = styleHost(host, getComputedStyle(host).position === "static" ? { position: "relative" } : {});
  const emit = emitter<ChordDiagramEvents>(host);
  const frame = document.createElement("div");
  frame.setAttribute("data-pica", "");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = `position:absolute;inset:0;overflow:hidden;background:${cssVar("bg")};cursor:pointer`;
  host.appendChild(frame);
  const help = document.createElement("span");
  help.setAttribute("data-pica", "");
  help.id = nextId("chord-help");
  help.textContent = "Rows send to columns. Each ribbon has a width proportional to its relationship weight at both ends. Click an endpoint or use arrow keys to select a group; Home and End select the first and last, Escape clears selection.";
  const status = document.createElement("span");
  status.setAttribute("data-pica", "");
  status.id = nextId("chord-status");
  status.setAttribute("aria-live", "polite");
  status.setAttribute("aria-atomic", "true");
  for (const node of [help, status]) {
    node.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0";
    host.appendChild(node);
  }
  const palette = watchPalette(host, () => { if (alive) draw(); });

  function selected(): number {
    const value = props.value === null ? internalValue : props.value;
    return Number.isInteger(value) && value >= 0 && value < model.groups.length ? value : -1;
  }

  function number(value: number): string {
    return formatNumber(value, { decimals: 1, locale: "en-US" });
  }

  function details(): [string, string] {
    const index = selected();
    const group = model.groups[index];
    if (!group) return model.groups.length ? ["SELECT AN ENDPOINT", "Rows send → columns · width = weight"] : ["NO RELATIONSHIP DATA", "Supply a nonnegative square matrix"];
    const related = model.ribbons.filter((r) => r.from === index || r.to === index).sort((a, b) => b.weight - a.weight);
    const strongest = related[0];
    return [
      `${model.names[index]} · OUT ${number(group.outgoing)} / IN ${number(group.incoming)}`,
      strongest ? `${model.names[strongest.from]} → ${model.names[strongest.to]} ${number(strongest.weight)}` : "No positive relationships",
    ];
  }

  function accessibility(): void {
    attrs.set("role", "group");
    attrs.set("aria-label", props.label || "Weighted relationship chord diagram");
    attrs.set("aria-describedby", `${help.id} ${status.id}`);
    attrs.set("tabindex", "0");
    status.textContent = details().join(". ");
  }

  function updateTable(): void {
    table?.remove();
    table = dataTable(`${props.label || "Weighted relationship chord diagram"}. Rows send to columns.`, ["From / To", ...model.names], model.matrix.map((row, i) => [model.names[i] ?? String(i + 1), ...row]));
    host.appendChild(table);
  }

  function geometry(width: number, height: number): { cx: number; cy: number; radius: number } {
    return { cx: width / 2, cy: Math.max(30, (height - 48) / 2), radius: Math.max(8, Math.min((width - 162) / 2, (height - 112) / 2)) };
  }

  function drawSvg(): void {
    graphic?.remove();
    const width = Math.max(1, frame.clientWidth), height = Math.max(1, frame.clientHeight);
    const { cx, cy, radius } = geometry(width, height);
    const root = svg("svg", { "data-pica": "", "aria-hidden": "true", viewBox: `0 0 ${width} ${height}`, "font-family": GRID_FONT, "font-size": 11 });
    root.style.cssText = "width:100%;height:100%;display:block";
    graphic = root;
    frame.appendChild(root);
    const active = selected();
    const ordered = [...model.ribbons].sort((a, b) => Number(a.from === active || a.to === active) - Number(b.from === active || b.to === active));
    for (const ribbon of ordered) {
      const highlight = active >= 0 && (ribbon.from === active || ribbon.to === active);
      const path = svg("path", { "data-pica": "", "data-chord-index": ribbon.from, d: chordPath(ribbon, cx, cy, radius - 3), fill: cssVar(highlight ? "accent" : "muted"), "fill-opacity": highlight ? 0.6 : active < 0 ? 0.34 : 0.16, stroke: cssVar(highlight ? "accent" : "muted"), "stroke-opacity": highlight ? 0.85 : 0.35, "stroke-width": 0.5 });
      const title = svg("title", { "data-pica": "" });
      title.textContent = `${model.names[ribbon.from]} → ${model.names[ribbon.to]}: ${ribbon.weight}`;
      path.appendChild(title);
      root.appendChild(path);
    }
    targets = [];
    for (const group of model.groups) {
      const highlight = group.index === active;
      root.appendChild(svg("path", { "data-pica": "", "data-chord-index": group.index, d: arcPath(cx, cy, radius, radius + 6, group.start, group.end), fill: cssVar(highlight ? "accent" : "fg") }));
      const angle = (group.start + group.end) / 2;
      const point = chordAt(cx, cy, radius + 16, angle);
      const right = Math.sin(angle) >= 0;
      const name = (model.names[group.index] ?? "").slice(0, Math.max(4, Math.floor((width / 2 - radius - 22) / 6.6)));
      const text = svg("text", { "data-pica": "", "data-chord-index": group.index, x: point.x, y: point.y + 4, "text-anchor": right ? "start" : "end", fill: cssVar("fg") });
      text.textContent = name;
      root.appendChild(text);
      targets.push({ index: group.index, x: point.x, y: point.y });
    }
    details().forEach((text, i) => {
      const node = svg("text", { "data-pica": "", x: 12, y: height - 30 + i * 16, fill: cssVar(i ? "muted" : "fg") });
      node.textContent = text.slice(0, Math.max(1, Math.floor((width - 24) / 6.6)));
      root.appendChild(node);
    });
  }

  function drawGlyph(): void {
    if (!grid) return;
    const g = grid;
    const width = g.cols * g.cellWidth, height = g.rows * g.cellHeight;
    const { cx, cy, radius } = geometry(width, height);
    const dx = g.cellWidth / 2, dy = g.cellHeight / 4;
    const active = selected();
    const normal = createBraillePlot(g.cols, g.rows);
    const highlighted = createBraillePlot(g.cols, g.rows);
    const ring = createBraillePlot(g.cols, g.rows);
    g.clear();
    for (const ribbon of model.ribbons) {
      const highlight = active >= 0 && (ribbon.from === active || ribbon.to === active);
      const plot = highlight ? highlighted : normal;
      const polygon = chordPolygon(ribbon, cx, cy, radius - 3).map((p) => ({ x: p.x / dx, y: p.y / dy }));
      const minY = Math.max(0, Math.floor(Math.min(...polygon.map((p) => p.y))));
      const maxY = Math.min(plot.height - 1, Math.ceil(Math.max(...polygon.map((p) => p.y))));
      for (let y = minY; y <= maxY; y++) {
        const intersections: number[] = [];
        for (let k = 0; k < polygon.length; k++) {
          const a = polygon[k], b = polygon[(k + 1) % polygon.length];
          if (!a || !b || (a.y > y) === (b.y > y)) continue;
          intersections.push(a.x + (y - a.y) / (b.y - a.y) * (b.x - a.x));
        }
        intersections.sort((a, b) => a - b);
        for (let k = 0; k + 1 < intersections.length; k += 2) {
          const left = Math.max(0, Math.ceil(intersections[k] ?? 0));
          const right = Math.min(plot.width - 1, Math.floor(intersections[k + 1] ?? 0));
          for (let x = left; x <= right; x++) if (highlight || (x + y) % 3 === 0) plot.dot(x, y);
        }
      }
    }
    function paint(plot: ReturnType<typeof createBraillePlot>, color: string): void {
      plot.paint({ set: (x, y, glyph) => { if (glyph !== "⠀") g.set(x, y, glyph, color); } }, 0, 0);
    }
    paint(normal, palette.colors.muted);
    paint(highlighted, palette.colors.accent);
    targets = [];
    for (const group of model.groups) {
      const steps = Math.max(2, Math.ceil((group.end - group.start) * radius / Math.min(dx, dy)));
      for (let i = 0; i <= steps; i++) {
        const angle = group.start + (group.end - group.start) * i / steps;
        for (const r of [radius, radius + 4]) {
          const p = chordAt(cx, cy, r, angle);
          ring.dot(p.x / dx, p.y / dy);
        }
      }
    }
    paint(ring, palette.colors.fg);
    for (const group of model.groups) {
      const angle = (group.start + group.end) / 2;
      const point = chordAt(cx, cy, radius + 15, angle);
      const right = Math.sin(angle) >= 0;
      const available = Math.max(3, Math.floor((width / 2 - radius - 17) / g.cellWidth));
      const text = (model.names[group.index] ?? "").slice(0, available);
      const col = Math.max(0, Math.min(g.cols - text.length, Math.round(point.x / g.cellWidth) - (right ? 0 : text.length)));
      const row = Math.max(0, Math.min(g.rows - 5, Math.round(point.y / g.cellHeight)));
      g.write(col, row, text, palette.colors.fg);
      if (group.index === active) {
        const marker = chordAt(cx, cy, radius + 5, angle);
        g.set(Math.round(marker.x / g.cellWidth), Math.round(marker.y / g.cellHeight), "◆", palette.colors.accent);
      }
      targets.push({ index: group.index, x: point.x, y: point.y });
    }
    details().forEach((text, i) => g.write(1, Math.max(0, g.rows - 3 + i), text.slice(0, Math.max(0, g.cols - 2)), i ? palette.colors.muted : palette.colors.fg));
    g.flush();
  }

  function draw(): void {
    if (!alive) return;
    if (grid) drawGlyph(); else drawSvg();
    status.textContent = details().join(". ");
    attrs.set("data-pica-ready", "true");
  }

  function mountView(): void {
    if (props.look === "glyph") grid = createGrid(frame, { fontFamily: GRID_FONT, fontSize: 12, columns: 0, lineHeight: 1.2, renderer: "canvas", color: "" }, draw);
    draw();
  }

  function select(index: number): void {
    if (index === selected()) return;
    if (props.value === null) { internalValue = index; draw(); }
    emit("valueChange", index);
  }

  const onKey = (event: KeyboardEvent): void => {
    if (event.target !== host || !model.groups.length) return;
    const index = selected(), count = model.groups.length;
    let next: number;
    switch (event.key) {
      case "ArrowRight": case "ArrowDown": next = (index + 1) % count; break;
      case "ArrowLeft": case "ArrowUp": next = index < 0 ? count - 1 : (index + count - 1) % count; break;
      case "Home": next = 0; break;
      case "End": next = count - 1; break;
      case "Escape": next = -1; break;
      default: return;
    }
    event.preventDefault();
    select(next);
  };
  const onClick = (event: MouseEvent): void => {
    if (event.target !== host && !(event.target instanceof Node && frame.contains(event.target))) return;
    host.focus({ preventScroll: true });
    if (event.target instanceof Element) {
      const direct = event.target.closest("[data-chord-index]");
      if (direct && frame.contains(direct)) { select(Number(direct.getAttribute("data-chord-index"))); return; }
    }
    const rect = frame.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    let nearest: typeof targets[number] | undefined;
    let distance = 40;
    for (const target of targets) {
      const d = Math.hypot(target.x - x, target.y - y);
      if (d < distance) { nearest = target; distance = d; }
    }
    if (nearest) select(nearest.index);
  };
  host.addEventListener("keydown", onKey);
  host.addEventListener("click", onClick);
  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(() => { if (alive && !grid) draw(); }) : null;
  observer?.observe(frame);
  accessibility();
  updateTable();
  mountView();

  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      const changed = !sameJson(before.matrix, props.matrix) || !sameJson(before.labels, props.labels);
      if (changed) model = chordModel(props.matrix, props.labels);
      if (changed || before.label !== props.label) updateTable();
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
      observer?.disconnect();
      host.removeEventListener("keydown", onKey);
      host.removeEventListener("click", onClick);
      grid?.destroy();
      palette.destroy();
      frame.remove();
      table?.remove();
      help.remove();
      status.remove();
      attrs.restore();
      restore();
    },
  };
};
