import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
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
  /** Draws the title in --pica-accent instead of the border's own ink. */
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
  fontFamily: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace',
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

/** The accent ink the title is drawn in, read from the host's own cascade with STYLE.md's amber as the fallback. */
function accentInk(host: HTMLElement): string {
  const custom = getComputedStyle(host).getPropertyValue("--pica-accent").trim();
  return custom || "#e8a020";
}

/** The cell size a grid at this fontSize, fontFamily, and lineHeight lays out, in CSS pixels. Mirrors
 *  lib/glyph-grid.ts's own layout math so the host's padding lines up exactly with the grid's cells. */
function measureCell(fontFamily: string, fontSize: number, lineHeight: number): { w: number; h: number } {
  const probe = document.createElement("canvas").getContext("2d");
  let advance = 0.6;
  if (probe) {
    probe.font = `100px ${fontFamily}`;
    advance = probe.measureText("M").width / 100 || 0.6;
  }
  return { w: fontSize * advance, h: Math.max(1, Math.round(fontSize * lineHeight)) };
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
  const grid = createGrid(host, gridOptions(props), draw);

  function gridOptions(p: AsciiFrameProps): GridOptions {
    return { fontFamily: p.fontFamily, fontSize: p.fontSize, columns: 0, lineHeight: p.lineHeight, renderer: needsCanvas(p) ? "canvas" : "auto", color: "" };
  }

  function applyPadding(): void {
    const cell = measureCell(props.fontFamily, props.fontSize, props.lineHeight);
    const inset = 1 + props.padding;
    // Border-box keeps this padding inside the host's own size instead of growing past it.
    host.style.boxSizing = "border-box";
    host.style.paddingTop = `${inset * cell.h}px`;
    host.style.paddingBottom = `${inset * cell.h}px`;
    host.style.paddingLeft = `${inset * cell.w}px`;
    host.style.paddingRight = `${inset * cell.w}px`;
  }

  function draw(): void {
    grid.clear();
    const { cols, rows } = grid;
    const chars = VARIANTS[props.variant];
    const [left, label, right] = topRule(cols, chars, props.title, props.titleAlign);
    grid.write(0, 0, left);
    grid.write(left.length, 0, label, props.accent ? accentInk(host) : undefined);
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
      unlabelHost(host);
      host.style.removeProperty("padding-top");
      host.style.removeProperty("padding-right");
      host.style.removeProperty("padding-bottom");
      host.style.removeProperty("padding-left");
      host.style.removeProperty("box-sizing");
    },
  };
};
