import { animatedText } from "../../../lib/a11y";
import { formatNumber } from "../../../lib/chart";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, scope, styleHost } from "../../../lib/host";
import { changed } from "../../../lib/json";
import { createLoop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";
import * as asciiSparkline from "../../text-mode/ascii-sparkline/core";

export interface StatItem {
  /** Name shown under the value. */
  label: string;
  /** The number the stat counts up to. */
  value: number;
  /** Text shown right after the formatted value, such as "%" or "KB". Empty shows none. */
  unit: string;
  /** Percent change from the previous period, drawn with an up or down glyph. Null hides the delta. */
  delta: number | null;
  /** Recent values for the inline sparkline, oldest first. Empty hides the sparkline. */
  trend: number[];
}

export interface StatsKpiProps extends MotionProps {
  /** Stats to show, in order. */
  items: StatItem[];
  /** Columns at the widest size, from 1 to 6. A narrower host wraps to fewer. */
  columns: number;
  /** Index into items whose delta draws in the accent color. -1 highlights none. */
  highlight: number;
  /** Counts each value up from zero once, over duration, when true. False shows final values at once. */
  countUp: boolean;
  /** Milliseconds the count-up takes. */
  duration: number;
}

export const defaults: StatsKpiProps = {
  items: [
    { label: "Components", value: 29, unit: "", delta: null, trend: [14, 16, 18, 19, 21, 23, 26, 29] },
    { label: "Weekly installs", value: 1840, unit: "", delta: 12, trend: [900, 1020, 1150, 1300, 1420, 1560, 1700, 1840] },
    { label: "Median size", value: 3.9, unit: "KB", delta: null, trend: [4.6, 4.4, 4.3, 4.1, 4, 4, 3.95, 3.9] },
    { label: "Median verify", value: 41, unit: "s", delta: -8, trend: [58, 55, 52, 49, 47, 45, 43, 41] },
  ],
  columns: 4,
  highlight: 1,
  countUp: true,
  duration: 900,
  paused: false,
  time: null,
  seed: 1,
};

/** Eased progress from 0 to 1 for a count that starts at animation time 0 and finishes at `duration`. A pure
 *  function of its inputs, so the same time and duration always give the same progress. */
function countProgress(t: number, duration: number): number {
  if (duration <= 0) return 1;
  const linear = Math.min(1, Math.max(0, t / duration));
  return 1 - (1 - linear) ** 3;
}

/** The number to show for `item` at animation time `t`. A pure function of time: a fixed time always gives
 *  the same number, which is what makes captures and the parity check reproducible. */
function displayValue(item: StatItem, countUp: boolean, t: number, duration: number): number {
  return countUp ? item.value * countProgress(t, duration) : item.value;
}

/** A figure with at most one decimal place, dropped when the value is whole. */
function formatFigure(value: number): string {
  return formatNumber(value, { decimals: 1 });
}

/** The settled text assistive technology reads for one stat's value: the figure, and its unit when it has one. */
function finalText(item: StatItem): string {
  const figure = formatFigure(item.value);
  return item.unit ? `${figure} ${item.unit}` : figure;
}

/** The delta row: an up or down glyph, hidden from assistive technology, followed by its signed percent as
 *  plain readable text, which already reads clearly on its own. */
function buildDelta(delta: number): HTMLElement {
  const el = document.createElement("div");
  el.setAttribute("data-pica", "");
  el.className = "pica-kpi-delta";
  const glyph = document.createElement("span");
  glyph.setAttribute("data-pica", "");
  glyph.setAttribute("aria-hidden", "true");
  glyph.textContent = delta < 0 ? "▼ " : "▲ ";
  el.append(glyph, `${delta < 0 ? "-" : "+"}${formatFigure(Math.abs(delta))}%`);
  return el;
}

/** One stat's DOM, and the pieces later frames and prop changes need again. */
interface KpiCell {
  root: HTMLElement;
  text: ReturnType<typeof animatedText>;
  deltaEl: HTMLElement | null;
  sparkline: ReturnType<typeof asciiSparkline.mount> | null;
}

/** Builds one stat cell: a value that can count up, a label in the page's font, an optional delta, and, when
 *  the stat has a trend, a composed sparkline labeled with its own stat's name. */
function buildCell(item: StatItem): KpiCell {
  const root = document.createElement("div");
  root.setAttribute("data-pica", "");
  root.className = "pica-kpi-cell";

  const valueRow = document.createElement("div");
  valueRow.setAttribute("data-pica", "");
  valueRow.className = "pica-kpi-value";
  const text = animatedText(valueRow, finalText(item));
  if (item.unit) {
    const unitEl = document.createElement("span");
    unitEl.setAttribute("data-pica", "");
    unitEl.setAttribute("aria-hidden", "true");
    unitEl.className = "pica-kpi-unit";
    unitEl.textContent = item.unit;
    valueRow.appendChild(unitEl);
  }
  root.appendChild(valueRow);

  const label = document.createElement("div");
  label.setAttribute("data-pica", "");
  label.className = "pica-kpi-label";
  label.textContent = item.label;
  root.appendChild(label);

  const deltaEl = item.delta === null ? null : buildDelta(item.delta);
  if (deltaEl) root.appendChild(deltaEl);

  let sparkline: KpiCell["sparkline"] = null;
  if (item.trend.length > 0) {
    const sub = document.createElement("div");
    sub.setAttribute("data-pica", "");
    sub.className = "pica-kpi-trend";
    root.appendChild(sub);
    sparkline = asciiSparkline.mount(sub, { values: item.trend, label: `${item.label} trend` });
  }

  return { root, text, deltaEl, sparkline };
}

/** The scoped rules: typography and the grid, which shows `columns` at the widest and fewer as a plain
 *  attribute records the host narrowing. Mirrors bento-grid's own measured-breakpoint technique, so every
 *  section in this wave collapses the same way. */
function gridRules(selector: string, columns: number): string {
  const cols = Math.min(6, Math.max(1, Math.round(columns)));
  const mid = Math.min(2, cols);
  return [
    `${selector}{color:${cssVar("fg")}}`,
    `${selector} .pica-kpi-grid{display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));column-gap:2em;row-gap:1.75em}`,
    `${selector}[data-pica-fit="mid"] .pica-kpi-grid{grid-template-columns:repeat(${mid},minmax(0,1fr))}`,
    `${selector}[data-pica-fit="min"] .pica-kpi-grid{grid-template-columns:1fr}`,
    `${selector} .pica-kpi-cell{display:flex;flex-direction:column;gap:0.4em;min-width:0}`,
    `${selector} .pica-kpi-value{display:inline-flex;align-items:baseline;gap:0.3em;font-family:${GRID_FONT};font-variant-numeric:tabular-nums;font-size:2.15em;font-weight:600;letter-spacing:-0.01em;line-height:1.05}`,
    `${selector} .pica-kpi-unit{font-size:0.5em}`,
    `${selector} .pica-kpi-label{font-size:0.95em}`,
    `${selector} .pica-kpi-delta{font-family:${GRID_FONT};font-size:0.85em;font-variant-numeric:tabular-nums}`,
    `${selector} .pica-kpi-trend{font-size:0.85em;opacity:0.75}`,
  ].join("\n");
}

export const mount: Mount<StatsKpiProps> = (host, initial = {}) => {
  let props: StatsKpiProps = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  // A row of stats has its own height; it never stretches to fill a page section that gives the host 100%.
  const restoreHeight = styleHost(host, { height: "auto" });
  const grid = document.createElement("div");
  grid.setAttribute("data-pica", "");
  grid.className = "pica-kpi-grid";
  host.appendChild(grid);
  let cells: KpiCell[] = [];

  function destroyCells(): void {
    for (const cell of cells) {
      cell.sparkline?.destroy();
      cell.text.remove();
      cell.root.remove();
    }
    cells = [];
  }

  function buildCells(): void {
    destroyCells();
    cells = props.items.map(buildCell);
    grid.append(...cells.map((cell) => cell.root));
  }

  function applyHighlight(): void {
    cells.forEach((cell, i) => {
      if (cell.deltaEl) cell.deltaEl.style.color = i === props.highlight ? cssVar("accent") : "";
    });
  }

  /** Below 640px the grid drops to at most two columns; below 420px, to one. */
  function measure(): void {
    const width = host.clientWidth;
    attrs.set("data-pica-fit", width < 420 ? "min" : width < 640 ? "mid" : null);
  }

  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;

  function draw(t: number): void {
    props.items.forEach((item, i) => {
      const cell = cells[i];
      if (cell) cell.text.layer.textContent = formatFigure(displayValue(item, props.countUp, t, props.duration));
    });
    host.dataset.picaReady = "true";
  }

  buildCells();
  sheet.setRules(gridRules(sheet.selector, props.columns));
  applyHighlight();
  measure();
  observer?.observe(host);

  const loop = createLoop({
    el: host,
    fps: 30,
    paused: props.paused,
    time: props.time,
    still: props.duration,
    frame: draw,
  });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (changed(before, props, ["items"])) {
        buildCells();
        applyHighlight();
      } else if (changed(before, props, ["highlight"])) {
        applyHighlight();
      }
      if (changed(before, props, ["columns"])) sheet.setRules(gridRules(sheet.selector, props.columns));
      loop.update({ paused: props.paused, time: props.time, still: props.duration });
      loop.redraw();
    },
    destroy() {
      loop.destroy();
      observer?.disconnect();
      destroyCells();
      grid.remove();
      sheet.destroy();
      attrs.restore();
      restoreHeight();
      delete host.dataset.picaReady;
    },
  };
};
