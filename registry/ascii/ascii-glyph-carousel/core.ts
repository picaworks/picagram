import { animatedText } from "../../../lib/a11y";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiGlyphCarouselProps extends MotionProps {
  /** Space separated short words. Up to twelve glyphs per word are displayed. */
  text: string;
  /** Number of upright panels around the carousel, from 3 to 8. */
  panels: number;
  /** Horizontal orbit radius relative to available space, from 0.4 to 1. */
  spread: number;
  /** Rate of the horizontal carousel rotation, from 0 to 2. */
  speed: number;
  /** Fixed monospace glyph size in CSS pixels, from 14 to 24. */
  fontSize: number;
}

export const defaults: AsciiGlyphCarouselProps = {
  text: "FORM TYPE GRID MOVE",
  panels: 4,
  spread: 0.95,
  speed: 0.7,
  fontSize: 20,
  paused: false,
  time: null,
  seed: 1,
};

function carouselBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<AsciiGlyphCarouselProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let alive = true;
  let loop: Loop | null = null;
  const attributes = hostAttributes(host);
  attributes.set("role", null);
  attributes.set("aria-label", null);
  attributes.set("aria-hidden", null);
  const styles: Record<string, string> = { "background-color": cssVar("bg") };
  if (getComputedStyle(host).position === "static") styles.position = "relative";
  const restore = styleHost(host, styles);
  const accessible = animatedText(host, props.text, "div");
  accessible.layer.style.cssText = "position:absolute;inset:0;pointer-events:none";
  const rear = layer(accessible.layer, "over");
  const near = layer(accessible.layer, "over");
  rear.el.style.opacity = "0.65";
  const options = (): GridOptions => ({
    fontFamily: GRID_FONT,
    fontSize: carouselBound(props.fontSize, 20, 14, 24),
    lineHeight: 1.2,
    columns: 0,
    renderer: "dom",
    color: "",
  });
  const rearGrid = createGrid(rear.el, options(), () => loop?.redraw());
  const grid = createGrid(near.el, options(), () => loop?.redraw());

  function frame(milliseconds: number): void {
    if (!alive) return;
    const { cols, rows } = grid;
    const words = props.text.trim().split(/\s+/u).filter(Boolean).map((word) => Array.from(word).slice(0, 12).join(""));
    const count = Math.round(carouselBound(props.panels, 4, 3, 8));
    const widest = Math.max(1, ...words.map((word) => Array.from(word).length));
    const panelWidth = Math.min(Math.max(5, cols - 4), widest + 6);
    const orbit = Math.max(0, (cols - panelWidth - 4) / 2) * carouselBound(props.spread, 0.95, 0.4, 1);
    const rise = Math.max(1, Math.min(rows * 0.2, (rows - 10) / 2));
    const seed = Number.isFinite(props.seed) ? props.seed : 1;
    const phase = seed * 0.147 + milliseconds * 0.00022 * carouselBound(props.speed, 0.7, 0, 2);
    const turn = Math.PI * 2;
    const panels = Array.from({ length: words.length ? count : 0 }, (_, i) => {
      const angle = phase + i / count * turn;
      const depth = Math.cos(angle);
      const passage = Math.floor((angle + Math.PI) / turn);
      const index = words.length ? ((i + passage * count) % words.length + words.length) % words.length : 0;
      return { depth, x: Math.sin(angle) * orbit, word: words[index] ?? "" };
    }).sort((a, b) => a.depth - b.depth);
    const cells = new Array<string>(cols * rows).fill(" ");
    const depths = new Uint8Array(cols * rows);
    const put = (x: number, y: number, glyph: string, front: number): void => {
      if (x < 0 || y < 0 || x >= cols || y >= rows) return;
      cells[y * cols + x] = glyph;
      depths[y * cols + x] = front;
    };
    for (const panel of panels) {
      const front = panel.depth >= 0 ? 1 : 0;
      const width = Math.max(widest + 2, Math.round(panelWidth * (0.8 + (panel.depth + 1) * 0.1)));
      const height = Math.round(4 + (panel.depth + 1) * 1.5);
      const left = Math.round((cols - width) / 2 + panel.x);
      const top = Math.round((rows - height) / 2 + panel.depth * rise);
      // A nearer panel replaces the entire rectangle, including its clear interior.
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const edge = y === 0 || y === height - 1;
          let glyph = edge ? "─" : x === 0 || x === width - 1 ? "│" : " ";
          if (edge && x === 0) glyph = y === 0 ? "┌" : "└";
          if (edge && x === width - 1) glyph = y === 0 ? "┐" : "┘";
          put(left + x, top + y, glyph, front);
        }
      }
      const letters = Array.from(panel.word).slice(0, Math.max(0, width - 2));
      const wordLeft = left + Math.floor((width - letters.length) / 2);
      letters.forEach((letter, i) => put(wordLeft + i, top + Math.floor(height / 2), letter, front));
    }
    rearGrid.clear();
    grid.clear();
    for (let i = 0; i < cells.length; i++) {
      const glyph = cells[i] ?? " ";
      if (glyph !== " ") (depths[i] ? grid : rearGrid).set(i % cols, Math.floor(i / cols), glyph);
    }
    rearGrid.flush();
    grid.flush();
    attributes.set("data-pica-ready", "true");
  }

  loop = createLoop({ el: host, fps: 24, paused: props.paused, time: props.time, still: 1200, frame });
  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      if (before.text !== props.text) accessible.setText(props.text);
      if (before.fontSize !== props.fontSize) {
        rearGrid.update(options());
        grid.update(options());
      }
      loop?.update({ paused: props.paused, time: props.time });
      loop?.redraw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      loop?.destroy();
      grid.destroy();
      rearGrid.destroy();
      near.remove();
      rear.remove();
      accessible.remove();
      restore();
      attributes.restore();
    },
  };
};
