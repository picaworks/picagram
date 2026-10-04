import { animatedText } from "../../../lib/a11y";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, scope } from "../../../lib/host";
import { createLoop } from "../../../lib/loop";
import { cssOn, cssVar } from "../../../lib/palette";
import { createRng } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiCellularTapeProps extends MotionProps {
  /** Elementary cellular automaton rule, from 0 to 255. */
  rule: number;
  /** Number of cells in each generation, from 15 to 121. */
  columns: number;
  /** Number of generations on the tape, including the initial row, from 8 to 80. */
  generations: number;
  /** Centered initial binary pattern; an empty string creates a sparse pattern from seed. */
  initialCells: string;
}

export const defaults: AsciiCellularTapeProps = {
  rule: 110,
  columns: 61,
  generations: 32,
  initialCells: "",
  paused: false,
  time: null,
  seed: 1,
};

/** Finite values only: malformed input falls back to the finished default. */
function cellularTapeInteger(value: number, fallback: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, Math.round(Number.isFinite(value) ? value : fallback)));
}

/** Builds a fixed-boundary elementary automaton, preserving every generation for deterministic playback. */
function cellularTapeRows(props: AsciiCellularTapeProps): Uint8Array[] {
  const columns = cellularTapeInteger(props.columns, defaults.columns, 15, 121);
  const generations = cellularTapeInteger(props.generations, defaults.generations, 8, 80);
  const rule = cellularTapeInteger(props.rule, defaults.rule, 0, 255);
  const first = new Uint8Array(columns);
  const pattern = props.initialCells.replace(/[^01]/g, "").slice(0, columns);
  if (pattern.length) {
    const offset = Math.floor((columns - pattern.length) / 2);
    for (let x = 0; x < pattern.length; x++) first[offset + x] = pattern[x] === "1" ? 1 : 0;
  } else {
    const random = createRng(props.seed);
    first[Math.floor(columns / 2)] = 1;
    for (let x = 0; x < columns; x++) {
      if (random() < 0.065) first[x] = 1;
    }
  }
  const rows = [first];
  for (let y = 1; y < generations; y++) {
    const previous = rows[y - 1]!;
    const next = new Uint8Array(columns);
    for (let x = 0; x < columns; x++) {
      const neighborhood = ((previous[x - 1] ?? 0) << 2) | (previous[x]! << 1) | (previous[x + 1] ?? 0);
      next[x] = (rule >> neighborhood) & 1;
    }
    rows.push(next);
  }
  return rows;
}

export const mount: Mount<AsciiCellularTapeProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let rows = cellularTapeRows(props);
  let destroyed = false;
  let lastShown = -1;
  const attributes = hostAttributes(host);
  attributes.set("data-pica-id", host.getAttribute("data-pica-id"));
  attributes.set("role", null);
  attributes.set("aria-label", null);
  attributes.set("aria-hidden", null);
  const stylesheet = scope(host);
  const drawing = animatedText(host, "", "div");
  const panel = drawing.layer;
  panel.setAttribute("data-tape-panel", "");
  const selector = stylesheet.selector;
  stylesheet.setRules(`
    ${selector} [data-tape-panel] { box-sizing:border-box; width:100%; height:100%; min-height:0; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px; overflow:hidden; font-family:${GRID_FONT}; line-height:1.18; color:${cssVar("fg")}; background:${cssVar("bg")}; }
    ${selector} [data-tape-heading] { width:100%; max-width:100%; white-space:pre; margin:0 0 0.8em; padding:0 0 0.8em; border-bottom:1px solid ${cssVar("muted")}; }
    ${selector} [data-tape-rule] { color:${cssVar("muted")}; }
    ${selector} [data-tape-rows] { width:max-content; max-width:100%; }
    ${selector} [data-tape-row] { display:flex; white-space:pre; }
    ${selector} [data-tape-number] { color:${cssVar("muted")}; }
    ${selector} [data-tape-cells] { white-space:pre; }
    ${selector} [data-tape-current] [data-tape-cells] { background:${cssVar("accent")}; color:${cssOn("accent")}; }
    ${selector} [data-tape-footer] { width:100%; white-space:pre; margin-top:0.8em; padding-top:0.8em; border-top:1px solid ${cssVar("muted")}; color:${cssVar("muted")}; }
  `);

  function node(tag: "div" | "span", name: string): HTMLElement {
    const element = document.createElement(tag);
    element.setAttribute("data-pica", "");
    element.setAttribute(name, "");
    return element;
  }

  const heading = node("div", "data-tape-heading");
  const title = node("div", "data-tape-title");
  const table = node("div", "data-tape-rule");
  heading.append(title, table);
  const tape = node("div", "data-tape-rows");
  const footer = node("div", "data-tape-footer");
  panel.append(heading, tape, footer);
  let rowNodes: { row: HTMLElement; cells: HTMLElement }[] = [];

  function fit(): void {
    const bounds = host.getBoundingClientRect();
    const inherited = Number.parseFloat(getComputedStyle(host).fontSize) || 16;
    const width = Math.max(1, bounds.width - 40);
    const height = Math.max(1, bounds.height - 40);
    const cellCount = Math.max((rows[0]?.length ?? 61) + 7, 40);
    const fontSize = Math.max(2, Math.min(inherited, width / (cellCount * 0.63), height / ((rows.length + 10) * 1.18)));
    panel.style.fontSize = `${fontSize}px`;
    heading.style.width = `${cellCount}ch`;
    footer.style.width = `${cellCount}ch`;
  }

  function rebuild(): void {
    const rule = cellularTapeInteger(props.rule, defaults.rule, 0, 255);
    table.textContent = `111 110 101 100 011 010 001 000\n ${Array.from({ length: 8 }, (_, i) => String((rule >> (7 - i)) & 1)).join("   ")}`;
    tape.replaceChildren();
    rowNodes = rows.map((_, y) => {
      const row = node("div", "data-tape-row");
      const number = node("span", "data-tape-number");
      number.textContent = `${String(y).padStart(2, "0")} │ `;
      const cells = node("span", "data-tape-cells");
      const edge = node("span", "data-tape-number");
      edge.textContent = " │";
      row.append(number, cells, edge);
      tape.append(row);
      return { row, cells };
    });
    const positions: number[] = [];
    rows[0]?.forEach((cell, x) => { if (cell) positions.push(x + 1); });
    drawing.setText(`Elementary cellular automaton, rule ${rule}. ${rows[0]?.length ?? 0} cells across and ${rows.length} generations. Initial occupied cell positions: ${positions.length ? positions.join(", ") : "none"}. A hash marks an occupied cell, a dot an empty cell. Neighbors outside the tape stay empty. ${positions.length ? "Rows show successive applications of the displayed rule." : "The initial pattern contains no occupied cells."}`);
    lastShown = -1;
    fit();
  }

  function frame(t: number, reduced: boolean): void {
    if (destroyed) return;
    const initialRows = Math.min(12, rows.length);
    const duration = (rows.length - initialRows) * 120 + 2600;
    const phase = Math.max(0, Number.isFinite(t) ? t : 0) % duration;
    const shown = reduced ? rows.length : Math.min(rows.length, initialRows + Math.floor(phase / 120));
    if (shown !== lastShown) {
      for (let y = 0; y < rows.length; y++) {
        const entry = rowNodes[y]!;
        entry.cells.textContent = y < shown ? Array.from(rows[y]!, cell => cell ? "#" : ".").join("") : " ".repeat(rows[y]!.length);
        entry.row.toggleAttribute("data-tape-current", y === shown - 1);
      }
      const rule = cellularTapeInteger(props.rule, defaults.rule, 0, 255);
      title.textContent = `RULE ${String(rule).padStart(3, "0")}    GENERATION ${String(shown - 1).padStart(2, "0")} / ${String(rows.length - 1).padStart(2, "0")}`;
      const alive = rows[shown - 1]!.reduce((sum, cell) => sum + cell, 0);
      footer.textContent = `# ON  . OFF  ·  FIXED EDGES\n${String(alive).padStart(2, "0")} ACTIVE CELLS / ${rows[0]!.length} COLUMNS`;
      lastShown = shown;
    }
    host.dataset.picaReady = "true";
  }

  rebuild();
  const loop = createLoop({ el: host, fps: 15, paused: props.paused, time: props.time, still: 3600, frame });
  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(() => { if (!destroyed) fit(); }) : null;
  observer?.observe(host);

  return {
    update(next) {
      if (destroyed) return;
      const before = props;
      props = { ...props, ...next };
      if (props.rule !== before.rule || props.columns !== before.columns || props.generations !== before.generations || props.initialCells !== before.initialCells || props.seed !== before.seed) {
        rows = cellularTapeRows(props);
        rebuild();
      }
      loop.update({ paused: props.paused, time: props.time });
      loop.redraw();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      observer?.disconnect();
      loop.destroy();
      drawing.remove();
      stylesheet.destroy();
      attributes.restore();
      delete host.dataset.picaReady;
    },
  };
};
