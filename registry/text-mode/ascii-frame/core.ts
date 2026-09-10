import { labelHost, unlabelHost } from "../../../lib/a11y";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, measureCell, type GridOptions } from "../../../lib/glyph-grid";
import { styleHost } from "../../../lib/host";
import { watchPalette } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface AsciiFrameProps {
  /** Border style: a box-drawing weight, or plain ASCII characters. */
  variant: "light" | "heavy" | "double" | "dashed" | "ascii";
  /** Text set into the top rule. Empty draws a plain border with no title. */
  title: string;
  /** Where the title sits along the top rule. */
  titleAlign: "left" | "center" | "right";
  /** Cells of inward spacing between the border and the host's content, in addition to the one cell the border always reserves. */
  padding: number;
  /** Draws the title in the palette's accent instead of the border's own ink. */
  accent: boolean;
  /** Glyph size in CSS pixels. */
  fontSize: number;
  /** CSS font-family stack for the glyphs. Must be monospace. */
  fontFamily: string;
  /** Line height as a multiple of the glyph size. */
  lineHeight: number;
}

export const defaults: AsciiFrameProps = {
  variant: "light",
  title: "",
  titleAlign: "left",
  padding: 1,
  accent: false,
  fontSize: 14,
  fontFamily: GRID_FONT,
  lineHeight: 1.2,
};

interface FrameChars {
  tl: string;
  tr: string;
  bl: string;
  br: string;
  h: string;
  v: string;
}

const VARIANTS: Record<AsciiFrameProps["variant"], FrameChars> = {
  light: { tl: "┌", tr: "┐", bl: "└", br: "┘", h: "─", v: "│" },
  heavy: { tl: "┏", tr: "┓", bl: "┗", br: "┛", h: "━", v: "┃" },
  double: { tl: "╔", tr: "╗", bl: "╚", br: "╝", h: "═", v: "║" },
  dashed: { tl: "┌", tr: "┐", bl: "└", br: "┘", h: "┄", v: "┆" },
  ascii: { tl: "+", tr: "+", bl: "+", br: "+", h: "-", v: "|" },
};

/** True when the title has to be drawn in its own color, which only the canvas renderer can do per cell. */
function needsCanvas(p: AsciiFrameProps): boolean {
  return p.accent && p.title.length > 0;
}

/** Splits the top rule into a left run, an optional title label, and a right run, so the label can be
 *  drawn in its own color. Falls back to a plain run when there is no room for a title. */
function topRule(cols: number, chars: FrameChars, title: string, align: AsciiFrameProps["titleAlign"]): [string, string, string] {
  const inner = Math.max(0, cols - 2);
  if (!title || inner < 3) return [chars.tl + chars.h.repeat(inner), "", chars.tr];
  const wanted = ` ${title} `;
  const maxLabel = Math.max(0, inner - 2);
  const label = wanted.length > maxLabel ? wanted.slice(0, maxLabel) : wanted;
  const fill = inner - label.length;
  const left = align === "left" ? Math.min(1, fill) : align === "right" ? Math.max(0, fill - 1) : Math.floor(fill / 2);
  const right = fill - left;
  return [chars.tl + chars.h.repeat(left), label, chars.h.repeat(right) + chars.tr];
}

export const mount: Mount<AsciiFrameProps> = (host, initial = {}) => {
  let props: AsciiFrameProps = { ...defaults, ...initial };
  let restorePadding = (): void => undefined;
  const grid = createGrid(host, gridOptions(props), draw);
  // The title's accent is baked into canvas cells when drawn, so a palette change draws again.
  const palette = watchPalette(host, () => draw());

  function gridOptions(p: AsciiFrameProps): GridOptions {
    return { fontFamily: p.fontFamily, fontSize: p.fontSize, columns: 0, lineHeight: p.lineHeight, renderer: needsCanvas(p) ? "canvas" : "auto", color: "" };
  }

  /** Insets the host's content by the border plus the padding, in whole cells, so content never sits
   *  under the border. Border-box keeps the padding inside the host's own size. */
  function applyPadding(): void {
    const cell = measureCell(props.fontFamily, props.fontSize, props.lineHeight);
    const inset = 1 + props.padding;
    restorePadding();
    restorePadding = styleHost(host, {
      "box-sizing": "border-box",
      "padding-top": `${inset * cell.h}px`,
      "padding-bottom": `${inset * cell.h}px`,
      "padding-left": `${inset * cell.w}px`,
      "padding-right": `${inset * cell.w}px`,
    });
  }

  function draw(): void {
    grid.clear();
    const { cols, rows } = grid;
    const chars = VARIANTS[props.variant];
    const [left, label, right] = topRule(cols, chars, props.title, props.titleAlign);
    grid.write(0, 0, left);
    grid.write(left.length, 0, label, props.accent ? palette.colors.accent : undefined);
    grid.write(left.length + label.length, 0, right);
    if (rows > 1) grid.write(0, rows - 1, chars.bl + chars.h.repeat(Math.max(0, cols - 2)) + chars.br);
    for (let y = 1; y < rows - 1; y++) {
      grid.set(0, y, chars.v);
      grid.set(cols - 1, y, chars.v);
    }
    grid.flush();
    host.dataset.picaReady = "true";
  }

  labelHost(host, props.title || "Frame", "group");
  applyPadding();
  draw();

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      palette.refresh();
      labelHost(host, props.title || "Frame", "group");
      const metricsChanged =
        props.fontSize !== before.fontSize || props.fontFamily !== before.fontFamily || props.lineHeight !== before.lineHeight;
      const rebuildGrid = metricsChanged || needsCanvas(props) !== needsCanvas(before);
      if (rebuildGrid) grid.update(gridOptions(props));
      else draw();
      if (metricsChanged || props.padding !== before.padding) applyPadding();
    },
    destroy() {
      grid.destroy();
      palette.destroy();
      restorePadding();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};
