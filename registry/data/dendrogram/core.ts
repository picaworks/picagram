import { dataTable, svg } from "../../../lib/chart";
import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { measureCell } from "../../../lib/glyph-grid";
import { hostAttributes, nextId, styleHost } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface DendrogramNode {
  /** Unique, nonempty identifier used by selection. */
  id: string;
  /** Human-readable node label. */
  label: string;
  /** Absolute nonnegative merge distance; leaves must be zero and parents cannot be below children. */
  distance: number;
  /** Ordered child nodes; missing or empty means a leaf. */
  children?: DendrogramNode[];
}

export interface DendrogramProps {
  /** Hierarchical merge distances, with unique IDs; null or invalid data shows an empty state. */
  tree: DendrogramNode | null;
  /** Horizontal places leaves on the right; vertical places leaves below the root. */
  orientation: "horizontal" | "vertical";
  /** Selected node ID; null uses internal selection, and an empty string selects nothing. */
  value: string | null;
  /** Initial selected node ID, read once at mount. */
  defaultValue: string;
  /** SVG uses exact distances; glyph quantizes the same geometry onto monospace cells. */
  look: "glyph" | "svg";
  /** Accessible chart name; an empty name hides the chart from assistive technology. */
  label: string;
}

export interface DendrogramEvents {
  /** Selected node ID, emitted only in response to pointer or keyboard input. */
  valueChange: string;
}

export const defaults: DendrogramProps = {
  tree: {
    id: "all", label: "All samples", distance: 12, children: [
      { id: "warm", label: "Warm tones", distance: 5, children: [
        { id: "amber", label: "Amber", distance: 0 },
        { id: "ochre", label: "Ochre", distance: 0 },
        { id: "ivory", label: "Ivory", distance: 0 },
      ] },
      { id: "cool", label: "Cool tones", distance: 8, children: [
        { id: "indigo", label: "Indigo", distance: 0 },
        { id: "teal", label: "Green pair", distance: 2, children: [
          { id: "cyan", label: "Cyan", distance: 0 },
          { id: "jade", label: "Jade", distance: 0 },
        ] },
      ] },
    ],
  },
  orientation: "horizontal",
  value: null,
  defaultValue: "warm",
  look: "glyph",
  label: "Hierarchical sample distances",
};

type DendrogramEntry = { id: string; label: string; distance: number; parent: DendrogramEntry | null; children: DendrogramEntry[]; first: number; last: number };
type DendrogramModel = { nodes: DendrogramEntry[]; leaves: DendrogramEntry[]; root: DendrogramEntry | null; error: string };
type DendrogramPoint = { node: DendrogramEntry; x: number; y: number };

function dendrogramModel(tree: DendrogramNode | null): DendrogramModel {
  const nodes: DendrogramEntry[] = [], leaves: DendrogramEntry[] = [];
  const seen = new Set<string>();
  function visit(node: DendrogramNode, parent: DendrogramEntry | null, depth: number): DendrogramEntry {
    if (!node || typeof node.id !== "string" || !node.id || seen.has(node.id) || !Number.isFinite(node.distance) || node.distance < 0 || depth > 48 || nodes.length >= 512) throw new Error("Invalid tree");
    if (parent && node.distance > parent.distance) throw new Error("Distances must increase toward the root");
    seen.add(node.id);
    const result: DendrogramEntry = { id: node.id, label: node.label || node.id, distance: node.distance, parent, children: [], first: leaves.length, last: leaves.length };
    nodes.push(result);
    if (node.children?.length) result.children = node.children.map((child) => visit(child, result, depth + 1));
    else {
      if (node.distance !== 0) throw new Error("Leaf distance must be zero");
      leaves.push(result);
    }
    result.last = leaves.length - 1;
    return result;
  }
  if (!tree) return { nodes, leaves, root: null, error: "No hierarchy supplied" };
  try { return { nodes, leaves, root: visit(tree, null, 0), error: "" }; }
  catch { return { nodes: [], leaves: [], root: null, error: "Invalid hierarchy: use unique IDs, zero-distance leaves, and increasing parent distances" }; }
}

function dendrogramNumber(value: number): string {
  return String(Number(value.toPrecision(4)));
}

function dendrogramLabelLines(label: string): string[] {
  const lines: string[] = [];
  let rest = label;
  while (rest.length && lines.length < 4) {
    if (rest.length <= 13) { lines.push(rest); break; }
    const space = rest.lastIndexOf(" ", 13);
    const end = space > 0 ? space : 13;
    lines.push(rest.slice(0, end));
    rest = rest.slice(end).trimStart();
    if (lines.length === 4 && rest) lines[3] = `${(lines[3] ?? "").slice(0, 10)}...`;
  }
  return lines;
}

function dendrogramElement<K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  return node;
}

export const mount: Mount<DendrogramProps> = (host, initial = {}) => {
  let props: DendrogramProps = { ...defaults, ...initial };
  let internal = props.defaultValue;
  let model = dendrogramModel(props.tree);
  let alive = true;
  let table: HTMLTableElement | null = null;
  let positions: DendrogramPoint[] = [];
  const attrs = hostAttributes(host);
  const emit = emitter<DendrogramEvents>(host);
  const restore = styleHost(host, {
    position: getComputedStyle(host).position === "static" ? "relative" : getComputedStyle(host).position,
    display: "flex", "flex-direction": "column", "box-sizing": "border-box",
    padding: "12px", gap: "8px", "background-color": cssVar("bg"),
  });
  const viewport = dendrogramElement("div");
  viewport.setAttribute("aria-hidden", "true");
  viewport.style.cssText = "flex:1;min-height:0;min-width:0;overflow:auto;cursor:pointer";
  const drawing = dendrogramElement("div");
  viewport.append(drawing);
  const status = dendrogramElement("div");
  status.id = nextId("dendrogram-status");
  status.setAttribute("aria-live", "polite");
  status.setAttribute("aria-atomic", "true");
  status.style.cssText = `font-family:${GRID_FONT};font-size:12px;line-height:1.5;color:${cssVar("fg")};overflow-wrap:anywhere`;
  const help = dendrogramElement("span");
  help.id = nextId("dendrogram-help");
  help.textContent = "Click a merge or leaf. Arrow keys move through nodes; Home selects the root, End the last leaf, Escape clears selection. Branch lengths show parent minus child merge distance.";
  help.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap";
  host.append(viewport, status, help);

  function selected(): string { return props.value === null ? internal : props.value; }

  function detail(): string {
    const node = model.nodes.find((entry) => entry.id === selected());
    return model.error || (node ? `${node.label} / distance ${dendrogramNumber(node.distance)} / ${node.last - node.first + 1} leaves` : "Select a merge or leaf / arrow keys or click");
  }

  function accessibility(): void {
    attrs.set("role", "group");
    attrs.set("aria-label", props.label.trim() || null);
    attrs.set("aria-hidden", props.label.trim() ? null : "true");
    attrs.set("tabindex", "0");
    attrs.set("aria-describedby", `${help.id} ${status.id}`);
  }

  function updateTable(): void {
    table?.remove();
    table = dataTable(props.label || "Dendrogram", ["Node", "ID", "Parent", "Merge distance", "Branch length", "Leaf count"], model.nodes.map((node) => [node.label, node.id, node.parent?.label ?? "Root", node.distance, node.parent ? node.parent.distance - node.distance : 0, node.last - node.first + 1]));
    host.append(table);
  }

  function draw(): void {
    if (!alive) return;
    drawing.replaceChildren();
    status.textContent = detail();
    positions = [];
    if (!model.root) {
      const empty = dendrogramElement("p");
      empty.textContent = model.error;
      empty.style.cssText = `font-family:${GRID_FONT};font-size:12px;color:${cssVar("muted")};padding:1em`;
      drawing.append(empty);
      attrs.set("data-pica-ready", "true");
      return;
    }
    const horizontal = props.orientation !== "vertical";
    const cell = measureCell(GRID_FONT, 12, 1.4);
    const labelWidth = Math.min(64, Math.max(8, ...model.leaves.map((node) => node.label.length))) * cell.w;
    const width = Math.ceil(Math.max(viewport.clientWidth, horizontal ? 180 + labelWidth : 80 + model.leaves.length * 108) / cell.w) * cell.w;
    const height = Math.ceil(Math.max(viewport.clientHeight, horizontal ? 72 + model.leaves.length * cell.h * 2 : 320) / cell.h) * cell.h;
    drawing.style.width = `${width}px`;
    drawing.style.height = `${height}px`;
    const start = horizontal ? cell.w * 3 : cell.h * 3;
    const end = horizontal ? width - labelWidth - cell.w * 3 : height - cell.h * 6;
    const span = Math.max(horizontal ? cell.w * 12 : cell.h * 5, end - start);
    const max = model.root.distance;
    const crossStart = horizontal ? cell.h * 4 : cell.w * 7;
    const crossEnd = horizontal ? height - cell.h * 2 : width - cell.w * 7;
    const leafStep = model.leaves.length > 1 ? (crossEnd - crossStart) / (model.leaves.length - 1) : 0;
    const chosen = model.nodes.find((node) => node.id === selected());
    const active = (node: DendrogramEntry): boolean => Boolean(chosen && node.first >= chosen.first && node.last <= chosen.last && node.distance <= chosen.distance);
    const points = new Map<string, DendrogramPoint>();
    for (const node of model.nodes) {
      const along = start + (1 - node.distance / (max || 1)) * span;
      const across = model.leaves.length === 1 ? (crossStart + crossEnd) / 2 : crossStart + (node.first + node.last) / 2 * leafStep;
      points.set(node.id, { node, x: horizontal ? along : across, y: horizontal ? across : along });
    }
    const labels: { x: number; y: number; text: string; muted: boolean }[] = [];
    const segments: { x1: number; y1: number; x2: number; y2: number; active: boolean; guide: boolean }[] = [];
    for (let tick = 0; tick <= 4; tick++) {
      const along = start + span * tick / 4;
      const value = dendrogramNumber(max * (1 - tick / 4));
      if (horizontal) {
        labels.push({ x: along, y: cell.h, text: value, muted: true });
        segments.push({ x1: along, y1: cell.h * 2, x2: along, y2: height - cell.h, active: false, guide: true });
      } else {
        labels.push({ x: 0, y: along, text: value, muted: true });
        segments.push({ x1: cell.w * 5, y1: along, x2: width - cell.w, y2: along, active: false, guide: true });
      }
    }
    for (const node of model.nodes) {
      const point = points.get(node.id)!;
      for (const child of node.children) {
        const next = points.get(child.id)!;
        const highlighted = active(child);
        const elbow = horizontal ? { x: point.x, y: next.y } : { x: next.x, y: point.y };
        segments.push({ x1: point.x, y1: point.y, x2: elbow.x, y2: elbow.y, active: highlighted, guide: false });
        segments.push({ x1: elbow.x, y1: elbow.y, x2: next.x, y2: next.y, active: highlighted, guide: false });
      }
      if (!node.children.length) {
        const lines = horizontal ? [node.label.length > 64 ? `${node.label.slice(0, 61)}...` : node.label] : dendrogramLabelLines(node.label);
        lines.forEach((text, index) => labels.push({ x: horizontal ? point.x + cell.w * 2 : point.x - cell.w * 6, y: horizontal ? point.y : point.y + cell.h * (index + 2), text, muted: false }));
      }
    }

    if (props.look === "svg") {
      const root = svg("svg", { "data-pica": "", "aria-hidden": "true", viewBox: `0 0 ${width} ${height}`, width, height, "font-family": GRID_FONT, "font-size": 12 });
      root.style.display = "block";
      for (const line of segments) root.append(svg("line", { "data-pica": "", x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2, stroke: cssVar(line.guide ? "muted" : line.active ? "accent" : "fg"), "stroke-width": line.guide ? 0.6 : 1.5, "stroke-dasharray": line.guide ? "1 7" : "none" }));
      for (const point of points.values()) {
        const marker = svg("circle", { "data-pica": "", cx: point.x, cy: point.y, r: point.node.id === selected() ? 5 : 3, fill: cssVar(active(point.node) ? "accent" : "fg") });
        const title = svg("title", { "data-pica": "" });
        title.textContent = `${point.node.label}: distance ${dendrogramNumber(point.node.distance)}`;
        marker.append(title);
        root.append(marker);
      }
      for (const label of labels) {
        const text = svg("text", { "data-pica": "", x: label.x, y: label.y + 4, fill: cssVar(label.muted ? "muted" : "fg") });
        text.textContent = label.text;
        root.append(text);
      }
      drawing.append(root);
      positions = [...points.values()];
    } else {
      const cols = Math.ceil(width / cell.w), rows = Math.ceil(height / cell.h);
      const glyphs = new Array<string>(cols * rows).fill(" ");
      const tokens = new Array<"fg" | "muted" | "accent">(cols * rows).fill("fg");
      const bits = new Uint8Array(cols * rows);
      const index = (x: number, y: number): number => Math.max(0, Math.min(rows - 1, y)) * cols + Math.max(0, Math.min(cols - 1, x));
      for (const line of segments) {
        const x1 = Math.round(line.x1 / cell.w), y1 = Math.round(line.y1 / cell.h);
        const x2 = Math.round(line.x2 / cell.w), y2 = Math.round(line.y2 / cell.h);
        const length = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
        for (let step = 0; step <= length; step++) {
          const x = Math.round(x1 + (x2 - x1) * step / Math.max(1, length));
          const y = Math.round(y1 + (y2 - y1) * step / Math.max(1, length));
          const i = index(x, y);
          if (line.guide) { if (glyphs[i] === " " && step % 2 === 0) { glyphs[i] = "·"; tokens[i] = "muted"; } continue; }
          const before = step > 0, after = step < length;
          if (x1 === x2) bits[i] = (bits[i] ?? 0) | (before ? y2 >= y1 ? 1 : 4 : 0) | (after ? y2 >= y1 ? 4 : 1 : 0);
          else bits[i] = (bits[i] ?? 0) | (before ? x2 >= x1 ? 8 : 2 : 0) | (after ? x2 >= x1 ? 2 : 8 : 0);
          glyphs[i] = ["·", "│", "─", "└", "│", "│", "┌", "├", "─", "┘", "─", "┴", "┐", "┤", "┬", "┼"][bits[i] ?? 0] ?? "┼";
          tokens[i] = line.active || tokens[i] === "accent" ? "accent" : "fg";
        }
      }
      for (const point of points.values()) {
        const x = Math.round(point.x / cell.w), y = Math.round(point.y / cell.h);
        glyphs[index(x, y)] = point.node.id === selected() ? "◆" : point.node.children.length ? "┼" : "○";
        tokens[index(x, y)] = active(point.node) ? "accent" : "fg";
      }
      for (const label of labels) {
        const x = Math.max(0, Math.round(label.x / cell.w)), y = Math.round(label.y / cell.h);
        [...label.text].forEach((glyph, offset) => { if (x + offset < cols) { const i = index(x + offset, y); glyphs[i] = glyph; tokens[i] = label.muted ? "muted" : "fg"; } });
      }
      const pre = dendrogramElement("pre");
      pre.style.cssText = `margin:0;font-family:${GRID_FONT};font-size:12px;line-height:${cell.h}px;letter-spacing:0;font-kerning:none;font-variant-ligatures:none`;
      for (let row = 0; row < rows; row++) {
        let col = 0;
        while (col < cols) {
          const token = tokens[row * cols + col] ?? "fg";
          let end = col + 1;
          while (end < cols && tokens[row * cols + end] === token) end++;
          const span = dendrogramElement("span");
          span.style.color = cssVar(token);
          span.textContent = glyphs.slice(row * cols + col, row * cols + end).join("");
          pre.append(span);
          col = end;
        }
        pre.append(document.createTextNode("\n"));
      }
      drawing.append(pre);
      positions = [...points.values()].map((point) => ({ ...point, x: (Math.round(point.x / cell.w) + 0.5) * cell.w, y: (Math.round(point.y / cell.h) + 0.5) * cell.h }));
    }
    attrs.set("data-pica-ready", "true");
  }

  function select(id: string): void {
    if (id === selected()) return;
    if (props.value === null) { internal = id; draw(); }
    emit("valueChange", id);
  }

  const onKey = (event: KeyboardEvent): void => {
    if (event.target !== host || !model.nodes.length) return;
    const current = model.nodes.findIndex((node) => node.id === selected());
    let next: number;
    switch (event.key) {
      case "Home": next = 0; break;
      case "End": next = model.nodes.length - 1; break;
      case "ArrowRight": case "ArrowDown": next = (current + 1) % model.nodes.length; break;
      case "ArrowLeft": case "ArrowUp": next = (current - 1 + model.nodes.length) % model.nodes.length; break;
      case "Escape": event.preventDefault(); select(""); return;
      default: return;
    }
    event.preventDefault();
    const node = model.nodes[next];
    if (node) select(node.id);
  };
  const onClick = (event: MouseEvent): void => {
    host.focus({ preventScroll: true });
    if (!(event.target instanceof Node) || !drawing.contains(event.target)) return;
    const rect = drawing.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    let closest: DendrogramPoint | null = null;
    let distance = 26;
    for (const point of positions) {
      const d = Math.hypot(point.x - x, point.y - y);
      if (d < distance) { closest = point; distance = d; }
    }
    if (closest) select(closest.node.id);
  };
  host.addEventListener("keydown", onKey);
  host.addEventListener("click", onClick);
  const resize = new ResizeObserver(draw);
  resize.observe(viewport);
  accessibility();
  updateTable();
  draw();

  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      const changed = !sameJson(before.tree, props.tree);
      if (changed) model = dendrogramModel(props.tree);
      if (changed || before.label !== props.label) updateTable();
      accessibility();
      draw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      resize.disconnect();
      host.removeEventListener("keydown", onKey);
      host.removeEventListener("click", onClick);
      viewport.remove();
      status.remove();
      help.remove();
      table?.remove();
      attrs.restore();
      restore();
    },
  };
};
