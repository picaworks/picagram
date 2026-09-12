import { labelHost, unlabelHost } from "../../../lib/a11y";
import { dataTable, extent, linearScale, svg } from "../../../lib/chart";
import { chartCells } from "../../../lib/chart-plot";
import { formatTime, parseTime, timeTicks } from "../../../lib/chart-time";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, measureCell, type Grid, type GridOptions } from "../../../lib/glyph-grid";
import { sameJson } from "../../../lib/json";
import { cssVar, readPalette } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface TimelineRow {
  /** Label for the row. */
  label: string;
  /** Start time as an ISO 8601 string or milliseconds. */
  start: string | number;
  /** End time as an ISO 8601 string or milliseconds, optional. Omit for a point event. */
  end?: string | number;
  /** Point events within this row, each with a time and optional label. */
  events?: { time: string | number; label?: string }[];
}

export interface TimelineChartProps {
  /** Rows of spans and events over time. Empty draws the axes and a muted "no data" note. */
  data: TimelineRow[];
  /** Name for the chart, read by assistive technology and used as the hidden data table's caption. */
  label: string;
  /** Index of the span or event highlighted in the accent. -1 highlights nothing. */
  highlight: number;
  /** "svg" draws hairline axes and rectangles. "glyph" draws in a monospace grid. */
  look: "svg" | "glyph";
  /** About this many rounded ticks on the time axis. */
  ticks: number;
  /** Height of each row in CSS pixels. */
  rowHeight: number;
  /** CSS font-family stack for every label. Must be monospace. */
  fontFamily: string;
}

export const defaults: TimelineChartProps = {
  data: [
    {
      label: "Research",
      start: "2025-09-01",
      end: "2025-10-15",
    },
    {
      label: "Runtime",
      start: "2025-10-01",
      end: "2025-12-31",
      events: [{ time: "2025-11-15", label: "v1" }],
    },
    {
      label: "Wave 4",
      start: "2025-10-15",
      end: "2026-03-31",
      events: [{ time: "2025-12-15", label: "build" }],
    },
    {
      label: "Review",
      start: "2026-03-15",
      end: "2026-06-30",
    },
    {
      label: "Launch",
      start: "2026-06-01",
      events: [{ time: "2026-09-15", label: "ship" }],
    },
  ],
  label: "Project timeline",
  highlight: -1,
  look: "svg",
  ticks: 6,
  rowHeight: 24,
  fontFamily: GRID_FONT,
};

export const mount: Mount<TimelineChartProps> = (host, initial = {}) => {
  let props: TimelineChartProps = { ...defaults, ...initial };
  let root: SVGSVGElement | null = null;
  let grid: Grid | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let table: HTMLTableElement | null = null;

  /** Parse times from all rows and events, returning [min, max] or NaN if empty. */
  function timeRange(data: TimelineRow[]): [number, number] {
    const times: number[] = [];
    data.forEach((row) => {
      const start = parseTime(row.start);
      if (Number.isFinite(start)) times.push(start);
      if (row.end) {
        const end = parseTime(row.end);
        if (Number.isFinite(end)) times.push(end);
      }
      row.events?.forEach((event) => {
        const t = parseTime(event.time);
        if (Number.isFinite(t)) times.push(t);
      });
    });
    if (times.length === 0) return [Number.NaN, Number.NaN];
    const [lo, hi] = extent(times);
    if (lo === hi) {
      return [lo - 86_400_000, lo + 86_400_000];
    }
    const padding = (hi - lo) * 0.05;
    return [lo - padding, hi + padding];
  }

  function gridOptions(p: TimelineChartProps): GridOptions {
    const cols = Math.max(20, Math.floor(host.clientWidth / 6));
    return { fontFamily: p.fontFamily, fontSize: 12, columns: cols, lineHeight: 1, renderer: "canvas", color: "" };
  }

  function renderTable(): void {
    table?.remove();
    const rows: (string | number)[][] = [];
    props.data.forEach((row) => {
      const start = formatTime(parseTime(row.start), "day");
      const end = row.end ? formatTime(parseTime(row.end), "day") : "";
      rows.push([row.label, start, end]);
    });
    table = dataTable(props.label || "Timeline", ["Row", "Start", "End"], rows);
    host.appendChild(table);
  }

  function drawSvg(): void {
    const view = root;
    if (!view) return;
    while (view.firstChild) view.firstChild.remove();
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    const fontSize = 11;
    view.setAttribute("viewBox", `0 0 ${w} ${h}`);
    view.setAttribute("font-family", props.fontFamily);
    view.setAttribute("font-size", String(fontSize));

    const data = props.data;
    const empty = data.length === 0;
    const [timeMin, timeMax] = empty ? [0, 86_400_000] : timeRange(data);
    const { times } = empty ? { times: [] } : timeTicks(timeMin, timeMax, props.ticks);
    const first = times[0] ?? timeMin;
    const last = times[times.length - 1] ?? timeMax;
    const cell = measureCell(props.fontFamily, fontSize, 1);
    const maxLabelChars = Math.max(1, ...data.map((d) => d.label.length), 10);

    const left = 12 + maxLabelChars * cell.w;
    const right = 8;
    const top = 8;
    const bottom = fontSize + 14;
    const chartLeft = left;
    const chartRight = Math.max(chartLeft + 1, w - right);
    const chartTop = top;
    const chartBottom = Math.max(chartTop + 1, h - bottom);

    const x = linearScale([first, last], [chartLeft, chartRight]);
    const rowHeight = Math.max(8, (chartBottom - chartTop) / Math.max(1, data.length));

    for (const t of times) {
      const tx = x(t);
      view.appendChild(
        svg("line", { x1: tx, y1: chartTop, x2: tx, y2: chartBottom, stroke: cssVar("muted"), "stroke-width": 1 })
      );
      const tickLabel = svg("text", {
        x: tx,
        y: chartBottom + fontSize + 4,
        "text-anchor": "middle",
        fill: cssVar("muted"),
      });
      tickLabel.textContent = formatTime(t, "month");
      view.appendChild(tickLabel);
    }
    view.appendChild(
      svg("line", { x1: chartLeft, y1: chartTop, x2: chartLeft, y2: chartBottom, stroke: cssVar("muted"), "stroke-width": 1 })
    );

    if (empty) {
      const note = svg("text", {
        x: (chartLeft + chartRight) / 2,
        y: (chartTop + chartBottom) / 2,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        fill: cssVar("muted"),
      });
      note.textContent = "no data";
      view.appendChild(note);
    } else {
      let itemIndex = 0;
      data.forEach((row, rowIdx) => {
        const rowY = chartTop + rowIdx * rowHeight + rowHeight / 2;
        const rowCenterY = rowY;
        const startTime = parseTime(row.start);
        const endTime = row.end ? parseTime(row.end) : startTime;

        if (Number.isFinite(startTime)) {
          const x1 = x(startTime);
          const x2 = x(Math.max(startTime, endTime));
          const barWidth = Math.max(2, x2 - x1);

          const highlightIdx = props.highlight === -1 ? 0 : props.highlight;
          const isHighlighted = itemIndex === highlightIdx;
          const barColor = isHighlighted ? cssVar("accent") : cssVar("fg");
          const barHeight = Math.max(3, rowHeight * 0.4);

          view.appendChild(
            svg("rect", {
              x: x1,
              y: rowCenterY - barHeight / 2,
              width: barWidth,
              height: barHeight,
              fill: barColor,
            })
          );

          const label = svg("text", {
            x: chartLeft - 6,
            y: rowCenterY,
            "text-anchor": "end",
            "dominant-baseline": "middle",
            fill: cssVar("muted"),
          });
          label.textContent = row.label;
          view.appendChild(label);
        }

        itemIndex++;

        if (row.events) {
          row.events.forEach((event) => {
            const eventTime = parseTime(event.time);
            if (Number.isFinite(eventTime)) {
              const ex = x(eventTime);
              const highlightIdx = props.highlight === -1 ? 0 : props.highlight;
              const isHighlighted = itemIndex === highlightIdx;
              const eventColor = isHighlighted ? cssVar("accent") : cssVar("fg");

              view.appendChild(svg("circle", { cx: ex, cy: rowCenterY, r: 2, fill: eventColor }));

              if (event.label) {
                const eventLabel = svg("text", {
                  x: ex,
                  y: rowCenterY - 8,
                  "text-anchor": "middle",
                  fill: cssVar("muted"),
                });
                eventLabel.textContent = event.label;
                view.appendChild(eventLabel);
              }

              itemIndex++;
            }
          });
        }
      });
    }

    host.dataset.picaReady = "true";
  }

  function drawGlyph(): void {
    const g = grid;
    if (!g) return;
    g.clear();
    const { cols, rows } = g;
    const data = props.data;
    const colors = readPalette(host);

    if (data.length === 0) {
      const note = "no data";
      const x = Math.max(0, Math.floor((cols - note.length) / 2));
      const y = Math.floor(rows / 2);
      g.write(x, y, note, colors.muted);
      g.flush();
      host.dataset.picaReady = "true";
      return;
    }

    const [timeMin, timeMax] = timeRange(data);
    const timeSpan = timeMax - timeMin || 1;
    const { times } = timeTicks(timeMin, timeMax, props.ticks);
    const maxLabelChars = Math.max(1, ...data.map((d) => d.label.length));
    const labelCols = Math.max(4, Math.min(maxLabelChars, Math.floor(cols * 0.35)));
    // One row for the time axis labels at the bottom, a label gutter on the left, and a blank row on
    // top so the first row's bar does not sit flush against the frame.
    const area = chartCells({ cols, rows }, { left: labelCols + 1, top: 1, bottom: 1 });
    const axisRow = rows - 1;

    const x = (time: number) => area.colAt((time - timeMin) / timeSpan);

    // Each row gets two cells of height with a blank cell between rows, when the area has room, so a
    // span reads as a bar rather than a single line. Falls back to one cell when the area is short.
    const perRow = area.rows >= data.length * 3 - 1 ? 2 : 1;
    const rowGap = area.rows >= data.length * (perRow + 1) - 1 ? 1 : 0;
    const stride = perRow + rowGap;
    const bodyBottom = Math.min(area.row + area.rows - 1, area.row + data.length * stride - rowGap - 1);

    // Tracks the last written label's end column, so a tick too close to the one before it draws its
    // gridline but skips its label rather than overlapping the previous one.
    let labelEnd = -1;
    times.forEach((t) => {
      const gx = x(t);
      for (let r = area.row; r <= bodyBottom; r++) g.set(gx, r, "│", colors.muted);
      const spacing = times.length > 1 ? Math.floor(area.cols / times.length) : area.cols;
      const monthLabel = formatTime(t, "month").slice(0, Math.max(3, spacing - 1));
      const labelStart = Math.max(area.col, Math.min(area.col + area.cols - monthLabel.length, gx));
      if (labelStart >= labelEnd + 1) {
        g.write(labelStart, axisRow, monthLabel, colors.muted);
        labelEnd = labelStart + monthLabel.length;
      }
    });

    data.forEach((row, rowIdx) => {
      const topRow = area.row + rowIdx * stride;
      if (topRow > bodyBottom) return;
      const bottomRow = Math.min(bodyBottom, topRow + perRow - 1);

      const label = row.label.slice(0, labelCols).padEnd(labelCols, " ");
      g.write(0, topRow, label, colors.muted);

      const startTime = parseTime(row.start);
      if (Number.isFinite(startTime)) {
        const endTime = row.end ? parseTime(row.end) : startTime;
        const x1 = x(startTime);
        const x2 = Math.max(x1 + 1, x(endTime));

        const highlightIdx = props.highlight === -1 ? 0 : props.highlight;
        const barColor = rowIdx === highlightIdx ? colors.accent : colors.fg;
        for (let r = topRow; r <= bottomRow; r++) {
          for (let col = x1; col < x2 && col < area.col + area.cols; col++) {
            g.set(col, r, "█", barColor);
          }
        }
      }

      let eventIdx = 0;
      row.events?.forEach((event) => {
        const eventTime = parseTime(event.time);
        if (Number.isFinite(eventTime)) {
          const ex = x(eventTime);
          const itemIdx = rowIdx + eventIdx + 1;
          const highlightIdx = props.highlight === -1 ? 0 : props.highlight;
          const markColor = itemIdx === highlightIdx ? colors.accent : colors.fg;
          const markRow = topRow + Math.floor(perRow / 2);
          g.set(ex, markRow, "◆", markColor);
          eventIdx++;
        }
      });
    });

    g.flush();
    host.dataset.picaReady = "true";
  }

  function draw(): void {
    if (grid) drawGlyph();
    else drawSvg();
  }

  function mountView(): void {
    if (props.look === "glyph") {
      grid = createGrid(host, gridOptions(props), drawGlyph);
    } else {
      root = svg("svg", { "data-pica": "", "aria-hidden": "true" });
      root.style.cssText = "display:block;width:100%;height:100%";
      host.appendChild(root);
      resizeObserver = new ResizeObserver(drawSvg);
      resizeObserver.observe(host);
    }
  }

  function unmountView(): void {
    resizeObserver?.disconnect();
    resizeObserver = null;
    root?.remove();
    root = null;
    grid?.destroy();
    grid = null;
  }

  labelHost(host, props.label, "figure");
  renderTable();
  mountView();
  draw();

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.label !== before.label) labelHost(host, props.label, "figure");
      if (props.label !== before.label || !sameJson(props.data, before.data)) renderTable();
      if (props.look !== before.look) {
        unmountView();
        mountView();
      } else if (grid && props.fontFamily !== before.fontFamily) {
        grid.update(gridOptions(props));
      }
      draw();
    },
    destroy() {
      unmountView();
      table?.remove();
      table = null;
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};
