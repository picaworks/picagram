import { hiddenText } from "../../../lib/a11y";
import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, measureCell } from "../../../lib/glyph-grid";
import { hostAttributes, scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface AsciiLoomDraftProps {
  /** Names the draft for assistive technology. Empty leaves the group unnamed. */
  label: string;
  /** The shaft each warp thread passes through, left to right, and the treadle each weft pick presses, top to bottom. Both count from 1 and run to 16 long. */
  draft: { threading: number[]; treadling: number[] };
  /** The tie-up: one string per shaft, starting at shaft 1, with a 1 wherever a treadle lifts that shaft. Up to 8 by 8. Null leaves it uncontrolled, so it keeps its own edits. */
  value: string[] | null;
  /** The tie-up at mount, read once, while value is null. */
  defaultValue: string[];
}

export interface AsciiLoomDraftEvents {
  /** The whole tie-up after a cell is toggled, from its button. */
  valueChange: string[];
}

export const defaults: AsciiLoomDraftProps = {
  label: "Weaving draft",
  draft: { threading: [1, 2, 3, 4, 4, 3, 2, 1], treadling: [1, 2, 3, 4, 4, 3, 2, 1] },
  value: null,
  defaultValue: ["1001", "1100", "0110", "0011"],
};

/** Most shafts, treadles, threads, and picks drawn. */
const LOOM_TIES = 8;
const LOOM_REPEAT = 16;
/** One draft cell is two glyphs wide and one row tall, which makes it square at this line height. */
const LOOM_LINE = 1.2;
/** How far past the host's own font size the drawing may grow when the host has room. */
const LOOM_GROW = 1.75;

/** What the drawing needs, made safe to draw: the tie-up padded square, every thread and pick pointing at a
 *  shaft or treadle that exists, and the weave, true where a warp thread lies over a weft pick. `wide` and
 *  `tall` are the glyph columns and rows it takes, with a margin of one on every side. */
function loomModel(props: AsciiLoomDraftProps, tied: readonly string[]) {
  const given = tied.slice(0, LOOM_TIES).map(String);
  const source = given.length ? given : defaults.defaultValue;
  const treadles = Math.min(LOOM_TIES, Math.max(1, ...source.map((row) => row.length)));
  const tie = source.map((row) => row.replace(/[^1]/g, "0").padEnd(treadles, "0").slice(0, treadles));
  const on = (shaft: number, treadle: number): boolean => tie[shaft - 1]?.charAt(treadle - 1) === "1";
  const pick = (list: unknown, count: number): number[] =>
    (Array.isArray(list) ? list : []).slice(0, LOOM_REPEAT).map((n) => Math.min(count, Math.max(1, Math.round(Number(n)) || 1)));
  const threading = pick(props.draft?.threading ?? defaults.draft.threading, tie.length);
  const treadling = pick(props.draft?.treadling ?? defaults.draft.treadling, treadles);
  const weave = treadling.map((t) => threading.map((s) => on(s, t)));
  return { tie, on, threading, treadling, weave, shafts: tie.length, treadles, wide: 2 * (threading.length + treadles) + 5, tall: tie.length + treadling.length + 3 };
}

export const mount: Mount<AsciiLoomDraftProps> = (host, initial = {}) => {
  let props: AsciiLoomDraftProps = { ...defaults, ...initial };
  let internal = props.defaultValue;
  let buttons: HTMLButtonElement[] = [];
  let shape = "";
  let ruled = "";
  let heard = "";
  const emit = emitter<AsciiLoomDraftEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const s = sheet.selector;
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const cells = document.createElement("div");
  const status = hiddenText("");
  cells.setAttribute("data-pica", "");
  cells.setAttribute("data-part", "cells");
  status.setAttribute("data-pica", "");
  status.setAttribute("aria-live", "polite");

  const model = () => loomModel(props, props.value ?? internal);

  /** The scoped rules. A host with no height of its own takes the drawing's proportions. */
  function rules(wide: number, tall: number): void {
    const css = [
      `:where(${s}){aspect-ratio:${(wide * 0.6).toFixed(1)}/${(tall * LOOM_LINE).toFixed(1)}}`,
      `${s} [data-part=cells]{position:absolute;inset:0;z-index:1;pointer-events:none}`,
      `${s} [data-cell]{position:absolute;box-sizing:border-box;margin:0;padding:0;border:0;border-radius:0;background:none;pointer-events:auto;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}`,
      `${s} [data-cell]:hover{background:color-mix(in srgb,${fg} 10%,transparent)}`,
      `${s} [data-cell]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    ].join("\n");
    if (css === ruled) return;
    ruled = css;
    sheet.setRules(css);
  }

  /** The glyph size that fits the whole drawing in the host, and never exceeds LOOM_GROW times the host's own. */
  function fitSize(): number {
    const { wide, tall } = model();
    const base = parseFloat(getComputedStyle(host).fontSize) || 16;
    const advance = measureCell(GRID_FONT, 100, LOOM_LINE).w / 100;
    return Math.max(6, Math.min(base * LOOM_GROW, host.clientWidth / (wide * advance), Math.floor(host.clientHeight / tall) / LOOM_LINE));
  }

  rules(model().wide, model().tall);
  let size = fitSize();
  const plane = (color: string) =>
    createGrid(host, { fontFamily: GRID_FONT, fontSize: size, columns: 0, lineHeight: LOOM_LINE, renderer: "dom", color }, relayout);
  // Three planes share one cell grid, each in one palette color: ink for the thread marks and the weave, muted
  // for the empty cells and the numbers, and the accent for the tie-up cells that are on.
  const ink = plane("");
  const dim = plane(cssVar("muted"));
  const mark = plane(accent);
  const planes = [ink, dim, mark];
  host.append(cells, status);

  function relayout(): void {
    const next = fitSize();
    if (next === size) return draw();
    size = next;
    for (const grid of planes) grid.update({ fontSize: size });
  }

  function toggle(shaft: number, treadle: number): void {
    const next = model().tie.map((row, i) =>
      i === shaft - 1 ? `${row.slice(0, treadle - 1)}${row.charAt(treadle - 1) === "1" ? "0" : "1"}${row.slice(treadle)}` : row,
    );
    if (props.value === null) {
      internal = next;
      draw();
    }
    emit("valueChange", next);
  }

  /** Tab stops once on the tie-up, and the arrow keys move between its cells. */
  function rove(index: number): void {
    buttons.forEach((button, i) => {
      button.tabIndex = i === index ? 0 : -1;
    });
  }

  /** A button for every tie-up cell, the highest shaft first, laid over the glyphs that draw it. */
  function build(shafts: number, treadles: number): void {
    buttons = Array.from({ length: shafts * treadles }, (_, i) => {
      const shaft = shafts - Math.floor(i / treadles);
      const treadle = (i % treadles) + 1;
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("data-pica", "");
      button.setAttribute("data-cell", `${shaft},${treadle}`);
      button.setAttribute("aria-label", `Shaft ${shaft}, treadle ${treadle}`);
      button.addEventListener("click", () => toggle(shaft, treadle));
      button.addEventListener("focus", () => rove(i));
      button.addEventListener("keydown", (event) => {
        const dx = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
        const dy = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
        if (!dx && !dy) return;
        event.preventDefault();
        const x = (i % treadles) + dx;
        const y = Math.floor(i / treadles) + dy;
        if (x >= 0 && x < treadles && y >= 0 && y < shafts) buttons[y * treadles + x]?.focus();
      });
      return button;
    });
    cells.replaceChildren(...buttons);
    rove(0);
  }

  function draw(): void {
    const m = model();
    const { shafts, treadles, threading, treadling } = m;
    const x0 = Math.max(0, (ink.cols - m.wide) >> 1) + 1;
    const y0 = Math.max(0, (ink.rows - m.tall) >> 1) + 1;
    // Threading and the weave share their columns, the tie-up and the treadling share theirs, and the tie-up
    // and the threading share their rows, so the four blocks read as one draft.
    const x1 = x0 + 2 * threading.length + 3;
    const y1 = y0 + shafts + 1;
    for (const grid of planes) grid.clear();
    const cell = (x: number, y: number, set: boolean, onto = ink): void => (set ? onto : dim).write(x, y, set ? "██" : "··");
    for (let shaft = 1; shaft <= shafts; shaft++) {
      const y = y0 + shafts - shaft;
      threading.forEach((through, i) => cell(x0 + 2 * i, y, through === shaft));
      for (let t = 1; t <= treadles; t++) cell(x1 + 2 * (t - 1), y, m.on(shaft, t), mark);
      dim.write(x0 + 2 * threading.length + 1, y, String(shaft));
    }
    for (let t = 1; t <= treadles; t++) dim.write(x1 + 2 * (t - 1), y0 + shafts, String(t));
    treadling.forEach((t, p) => {
      for (let i = 1; i <= treadles; i++) cell(x1 + 2 * (i - 1), y1 + p, i === t);
      m.weave[p]?.forEach((over, i) => ink.write(x0 + 2 * i, y1 + p, over ? "██" : "░░"));
    });
    for (const grid of planes) grid.flush();

    rules(m.wide, m.tall);
    if (`${shafts}x${treadles}` !== shape) {
      shape = `${shafts}x${treadles}`;
      build(shafts, treadles);
    }
    const w = ink.cellWidth;
    const h = ink.cellHeight;
    buttons.forEach((button, i) => {
      const shaft = shafts - Math.floor(i / treadles);
      const treadle = (i % treadles) + 1;
      button.style.cssText = `left:${(x1 + 2 * (treadle - 1)) * w}px;top:${(y0 + shafts - shaft) * h}px;width:${2 * w}px;height:${h}px`;
      button.setAttribute("aria-pressed", String(m.on(shaft, treadle)));
    });
    cells.setAttribute("data-weave", m.weave.map((row) => row.map((over) => (over ? "1" : "0")).join("")).join("/"));
    const text = `Warp over weft at ${m.weave.flat().filter(Boolean).length} of ${threading.length * treadling.length} crossings`;
    if (text !== heard) {
      heard = text;
      status.textContent = text;
    }
    attrs.set("data-pica-ready", "true");
  }

  function name(): void {
    attrs.set("role", props.label ? "group" : null);
    attrs.set("aria-label", props.label || null);
  }

  name();
  draw();

  return {
    update(next) {
      props = { ...props, ...next };
      name();
      relayout();
    },
    destroy() {
      cells.remove();
      status.remove();
      sheet.destroy();
      // Each plane put its styles on the host over the last one's, so they come off in the reverse order.
      for (const grid of [...planes].reverse()) grid.destroy();
      attrs.restore();
    },
  };
};
