import { hiddenText } from "../../../lib/a11y";
import { quadrant } from "../../../lib/blocks";
import { createCanvas } from "../../../lib/canvas";
import { GRID_FONT } from "../../../lib/font";
import { createGrid } from "../../../lib/glyph-grid";
import { layer, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { createLoop } from "../../../lib/loop";
import { cssOn, cssVar, watchPalette } from "../../../lib/palette";
import { hashSeed } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

/** One call to action: a link's visible text and destination. */
export interface PixelArtHeroAction {
  /** Text on the link, drawn in mono capitals inside a pixel frame. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface PixelArtHeroProps extends MotionProps {
  /** The headline, drawn in a five row pixel font on the lattice. Letters are uppercased, and any character the font has no shape for draws blank. Empty hides it. */
  headline: string;
  /** Supporting copy under the headline, in the page's own typeface on lattice snapped lines. Empty hides it. */
  subhead: string;
  /** A short mono label above the headline. Empty hides it. */
  kicker: string;
  /** Calls to action, drawn as links inside pixel frames. At most three show, and the first fills with the accent. */
  actions: readonly PixelArtHeroAction[];
  /** Horizontal alignment of the composition: "start" hangs it on the content's edge, "center" centers each part. */
  align: "start" | "center";
  /** Lattice columns across the host. One lattice pixel is one column wide and half a glyph row tall. */
  columns: number;
  /** How much of the field shimmers behind the type, from 0 (empty) to 1. */
  intensity: number;
  /** Wavefront steps per second. Each step moves the shimmer exactly one lattice pixel, never part of one. */
  speed: number;
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
}

export const defaults: PixelArtHeroProps = {
  headline: "PIXEL ART",
  subhead: "Type, rules, and field all snapped to one coarse lattice, with a seeded shimmer crossing it a cell at a time.",
  kicker: "LOW RES // HIGH SIGNAL",
  actions: [
    { label: "Browse components", href: "#components" },
    { label: "Read the docs", href: "#docs" },
  ],
  align: "start",
  columns: 64,
  intensity: 0.7,
  speed: 9,
  minHeight: 72,
  paused: false,
  time: null,
  seed: 1,
};

/** Rows in the pixel font. Every glyph below has exactly this many strings. */
const FONT_ROWS = 5;
/** Blank font pixels left between characters. */
const CHAR_GAP = 1;
/** The largest a font pixel may be, in lattice pixels. */
const SCALE_CAP = 3;

/** An original five row pixel font: "#" is ink, "." is blank. Every character's rows share one width. */
const FONT: Readonly<Record<string, readonly string[]>> = {
  " ": ["...", "...", "...", "...", "..."],
  "!": ["##", "##", "##", "..", "##"],
  "'": ["#.", "#.", "..", "..", ".."],
  ",": ["..", "..", "..", "##", ".#"],
  "-": ["...", "...", "###", "...", "..."],
  ".": ["..", "..", "..", "..", "##"],
  "/": ["...#", "..#.", "..#.", ".#..", "#..."],
  ":": ["..", "##", "..", "##", ".."],
  "?": ["###.", "...#", ".##.", "....", ".#.."],
  "0": [".##.", "#.##", "##.#", "#..#", ".##."],
  "1": [".#.", "##.", ".#.", ".#.", "###"],
  "2": ["###.", "...#", ".##.", "#...", "####"],
  "3": ["###.", "...#", ".##.", "...#", "###."],
  "4": ["#..#", "#..#", "####", "...#", "...#"],
  "5": ["####", "#...", "###.", "...#", "###."],
  "6": [".##.", "#...", "###.", "#..#", ".##."],
  "7": ["####", "...#", "..#.", ".#..", ".#.."],
  "8": [".##.", "#..#", ".##.", "#..#", ".##."],
  "9": [".##.", "#..#", ".###", "...#", ".##."],
  A: [".##.", "#..#", "####", "#..#", "#..#"],
  B: ["###.", "#..#", "###.", "#..#", "###."],
  C: [".###", "#...", "#...", "#...", ".###"],
  D: ["###.", "#..#", "#..#", "#..#", "###."],
  E: ["####", "#...", "###.", "#...", "####"],
  F: ["####", "#...", "###.", "#...", "#..."],
  G: [".###", "#...", "#.##", "#..#", ".###"],
  H: ["#..#", "#..#", "####", "#..#", "#..#"],
  I: ["###", ".#.", ".#.", ".#.", "###"],
  J: ["..##", "...#", "...#", "#..#", ".##."],
  K: ["#..#", "#.#.", "##..", "#.#.", "#..#"],
  L: ["#...", "#...", "#...", "#...", "####"],
  M: ["#...#", "##.##", "#.#.#", "#...#", "#...#"],
  N: ["#..#", "##.#", "#.##", "#..#", "#..#"],
  O: [".##.", "#..#", "#..#", "#..#", ".##."],
  P: ["###.", "#..#", "###.", "#...", "#..."],
  Q: [".##.", "#..#", "#..#", "#.#.", ".###"],
  R: ["###.", "#..#", "###.", "#.#.", "#..#"],
  S: [".###", "#...", ".##.", "...#", "###."],
  T: ["####", ".#..", ".#..", ".#..", ".#.."],
  U: ["#..#", "#..#", "#..#", "#..#", ".##."],
  V: ["#..#", "#..#", "#..#", ".##.", ".##."],
  W: ["#...#", "#...#", "#.#.#", "##.##", "#...#"],
  X: ["#..#", ".##.", ".##.", ".##.", "#..#"],
  Y: ["#..#", "#..#", ".#..", ".#..", ".#.."],
  Z: ["####", "...#", ".##.", "#...", "####"],
};

/** One character's bitmap, falling back to the blank space glyph for anything the font has no shape for. */
function glyphOf(ch: string): readonly string[] {
  return FONT[ch] ?? FONT[" "] ?? [];
}

/** Width of a string in font pixels: glyph widths plus the one pixel gap between characters. */
function fontCols(text: string): number {
  let width = 0;
  for (const ch of text) width += (glyphOf(ch)[0]?.length ?? 0) + CHAR_GAP;
  return Math.max(0, width - CHAR_GAP);
}

/** Wraps a headline into lines of at most `maxCols` font pixels, breaking at spaces and splitting a word
 *  that cannot fit whole. Cap on lines keeps a very long title from filling the screen. */
function wrapHeadline(text: string, maxCols: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const trial = cur ? `${cur} ${word}` : word;
    if (fontCols(trial) <= maxCols) {
      cur = trial;
      continue;
    }
    if (cur) lines.push(cur);
    if (fontCols(word) <= maxCols) {
      cur = word;
      continue;
    }
    let piece = "";
    for (const ch of word) {
      if (fontCols(piece + ch) <= maxCols) piece += ch;
      else {
        if (piece) lines.push(piece);
        piece = fontCols(ch) <= maxCols ? ch : "";
      }
    }
    cur = piece;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 4);
}

/** One wrapped line, resolved to its five font rows joined into strings. */
interface LineBits {
  rows: string[];
  /** Width of the line in font pixels. */
  cols: number;
}

/** The headline laid out: wrapped lines, the font pixel size in lattice pixels, and its lattice height. */
interface HeadlinePlan {
  lines: LineBits[];
  /** Lattice pixels per font pixel. */
  scale: number;
  /** Total height in lattice pixels, line gaps included. */
  heightL: number;
}

/** Joins one wrapped line into five font rows. */
function lineBits(line: string): LineBits {
  const gap = " ".repeat(CHAR_GAP);
  const glyphs = [...line].map(glyphOf);
  const rows: string[] = [];
  for (let r = 0; r < FONT_ROWS; r++) rows.push(glyphs.map((g) => g[r] ?? "").join(gap));
  return { rows, cols: rows[0]?.length ?? 0 };
}

/** Chooses the largest font pixel that still fits the content column, then wraps to it. A taller block
 *  than `rowCap` lattice pixels sends the choice down a size, so a long title stays a hero, not a wall. */
function planHeadline(text: string, availL: number): HeadlinePlan {
  const upper = text.toUpperCase();
  const words = upper.split(/\s+/).filter(Boolean);
  const longest = Math.max(0, ...words.map(fontCols));
  const rowCap = 16;
  let scale = 1;
  for (let s = Math.min(SCALE_CAP, availL); s >= 2; s--) {
    const maxCols = Math.floor(availL / s);
    if (maxCols < 8 || longest > maxCols) continue;
    const lines = wrapHeadline(upper, maxCols);
    if (lines.length * (FONT_ROWS + 1) * s <= rowCap) {
      scale = s;
      break;
    }
  }
  const lines = wrapHeadline(upper, Math.max(8, Math.floor(availL / scale))).map(lineBits);
  const heightL = lines.length === 0 ? 0 : lines.length * FONT_ROWS * scale + (lines.length - 1) * scale;
  return { lines, scale, heightL };
}

/** Keeps a number inside a closed range. */
function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

/** Keeps minHeight inside a sane range even if a caller passes something outside 0 to 100. */
function vh(minHeight: number): number {
  return clamp(minHeight, 0, 100);
}

/** The lattice geometry everything shares. A lattice pixel is one glyph column wide and half a glyph row
 *  tall, so the canvas, the type grid, and every snapped box agree on where the lines are. */
interface Lattice {
  /** Lattice pixel width in CSS px. */
  pw: number;
  /** Lattice pixel height in CSS px. */
  ph: number;
  /** Lattice columns across the host. */
  cols: number;
  /** Lattice rows down the host. */
  rows: number;
}

/** A box on the lattice, in lattice pixels. */
interface LatticeBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Creates one element the core owns, marked for identification and restyling. */
function part<K extends keyof HTMLElementTagNameMap>(tag: K, name: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute(`data-pica-${name}`, "");
  return node;
}

export const mount: Mount<PixelArtHeroProps> = (host, initial = {}) => {
  let props: PixelArtHeroProps = { ...defaults, ...initial };
  const sheet = scope(host);

  // The drawn layers sit under the wrapped content: the field canvas first, the type grid above it, so the
  // shimmer shows through the headline's empty cells. Both live in one under layer, which keeps every real
  // child of the host above them and hit testable.
  const under = layer(host, "under");
  const fieldHost = part("div", "field");
  fieldHost.style.cssText = "position:absolute;inset:0";
  const typeHost = part("div", "type");
  typeHost.style.cssText = "position:absolute;inset:0";
  under.el.append(fieldHost, typeHost);

  // The composition leads the section, so its parts go in before the page's own children. The children are
  // never moved or touched; they simply flow after the actions.
  const kickerEl = part("p", "kicker");
  const label = hiddenText(props.headline);
  label.setAttribute("data-pica", "");
  const spacerEl = part("div", "hlspace");
  spacerEl.setAttribute("aria-hidden", "true");
  const subEl = part("p", "sub");
  const actionsEl = part("div", "actions");
  host.prepend(kickerEl, label, spacerEl, subEl, actionsEl);

  let geo: Lattice = { pw: 8, ph: 8, cols: 1, rows: 1 };
  let plan: HeadlinePlan = { lines: [], scale: 1, heightL: 0 };
  let frames: LatticeBox[] = [];
  let ruleRow = -1;
  let cursor: LatticeBox | null = null;
  let now = 0;
  let lastCss = "";

  const surface = createCanvas(fieldHost, { onResize: () => relayout() });
  const ctx = surface.canvas.getContext("2d");
  const grid = createGrid(typeHost, gridOptions(), onGridLayout);
  const pal = watchPalette(host, () => drawCanvas(now));

  function gridOptions() {
    return { fontFamily: GRID_FONT, fontSize: 12, columns: Math.max(1, Math.round(props.columns)), lineHeight: 1, renderer: "auto" as const, color: "" };
  }

  /** Reads the grid the lattice hangs on: one lattice pixel per column, two per row. */
  function readGeo(): Lattice {
    return {
      pw: grid.cellWidth,
      ph: grid.cellHeight / 2,
      cols: grid.cols,
      rows: grid.rows * 2,
    };
  }

  /** The scoped rules for the host, the composition parts, and the action links. Every measure that places
   *  or spaces a box is a whole number of lattice pixels, computed fresh whenever the lattice changes, so
   *  the type, the rules, and the calls to action all land on the same grid. The minimum height goes in a
   *  :where() rule, which carries no specificity, so a page that gives this host a height still wins. */
  function rulesText(): string {
    const fg = cssVar("fg");
    const accent = cssVar("accent");
    const center = props.align === "center";
    const padCols = 4;
    // The content column width keeps the host's parity, so a centered column still lands on lattice lines.
    let capCols = Math.min(46, Math.max(8, geo.cols - padCols * 2));
    if ((capCols + geo.cols) % 2 !== 0) capCols -= 1;
    const capW = Math.round(capCols * geo.pw);
    const padT = Math.round(6 * geo.ph);
    const padX = Math.round(padCols * geo.pw);
    const lhKick = Math.ceil(20 / geo.ph) * geo.ph;
    const lhSub = Math.ceil(25 / geo.ph) * geo.ph;
    const btnH = Math.ceil(42 / geo.ph) * geo.ph;
    const btnPadX = Math.round(2 * geo.pw);
    const rowGap = Math.round(geo.ph);
    const colGap = Math.round(2 * geo.pw);
    const s = sheet.selector;
    const inline = center ? "auto" : "0";
    const textAlign = center ? "center" : "start";
    return [
      `:where(${s}){min-height:${vh(props.minHeight)}vh}`,
      `${s}{position:relative;isolation:isolate;box-sizing:border-box;padding:${padT}px ${padX}px;color:${fg};text-align:${textAlign};overflow-wrap:break-word}`,
      `${s} *{box-sizing:border-box}`,
      `${s} > :not([data-pica]){margin:${Math.round(4 * geo.ph)}px ${inline} 0;max-width:${capW}px}`,
      `${s} > [data-pica-kicker]{margin:0;font-family:${GRID_FONT};font-size:0.72em;letter-spacing:0.14em;text-transform:uppercase;line-height:${lhKick}px;opacity:0.6;white-space:pre-line}`,
      `${s} > [data-pica-hlspace]{display:block;margin:${Math.round(2 * geo.ph)}px 0 0}`,
      `${s} > [data-pica-sub]{margin:${Math.round(3 * geo.ph)}px ${inline} 0;max-width:${capW}px;line-height:${lhSub}px}`,
      `${s} > [data-pica-actions]{display:flex;flex-wrap:wrap;align-items:flex-start;gap:${rowGap}px ${colGap}px;margin:${Math.round(4 * geo.ph)}px ${inline} 0;max-width:${capW}px;justify-content:${center ? "center" : "flex-start"}}`,
      `${s} > [data-pica-actions]:empty{display:none}`,
      `${s} > [data-pica-actions] a{appearance:none;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;height:${btnH}px;margin:0;padding:0 ${btnPadX}px;font-family:${GRID_FONT};font-size:0.75em;letter-spacing:0.1em;text-transform:uppercase;line-height:1;text-decoration:none;color:${fg};background:transparent;border:0;border-radius:0;cursor:pointer;white-space:nowrap}`,
      `${s} > [data-pica-actions] a[data-variant="solid"]{background:${accent};color:${cssOn("accent")}}`,
      `${s} > [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${accent} 82%, ${fg})}`,
      `${s} > [data-pica-actions] a[data-variant="outline"]:hover{background:color-mix(in srgb, ${fg} 12%, transparent)}`,
      `${s} > [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    ].join("\n");
  }

  /** Writes a text part and hides it when it has nothing to say, so an empty prop leaves no empty element. */
  function renderText(el: HTMLElement, text: string): void {
    el.textContent = text;
    el.hidden = text.trim() === "";
  }

  /** Rebuilds the action links from JSON: at most three, the first solid in the accent, the rest outline. */
  function renderActions(): void {
    actionsEl.replaceChildren();
    for (const [i, action] of props.actions.slice(0, 3).entries()) {
      const a = document.createElement("a");
      a.setAttribute("data-pica", "");
      a.dataset.variant = i === 0 ? "solid" : "outline";
      a.href = action.href || "#";
      a.textContent = action.label;
      actionsEl.append(a);
    }
  }

  /** Snaps every action's box onto the lattice: widths to whole lattice columns, left edges to a column
   *  line, then records each snapped box as the pixel frame the canvas draws. Widths are snapped in DOM
   *  order, and since a snapped width plus a snapped gap leaves the next link on a line, one pass does it. */
  function snapActions(): void {
    const links = Array.from(actionsEl.querySelectorAll("a"));
    frames = [];
    for (const a of links) {
      a.style.width = "";
      a.style.marginLeft = "";
    }
    for (const a of links) {
      const snappedW = Math.ceil(a.offsetWidth / geo.pw) * geo.pw;
      a.style.width = `${snappedW}px`;
      const left = a.offsetLeft;
      a.style.marginLeft = `${Math.round(left / geo.pw) * geo.pw - left}px`;
    }
    for (const a of links) {
      frames.push({
        x0: Math.round(a.offsetLeft / geo.pw),
        y0: Math.round(a.offsetTop / geo.ph),
        x1: Math.round((a.offsetLeft + a.offsetWidth) / geo.pw),
        y1: Math.round((a.offsetTop + a.offsetHeight) / geo.ph),
      });
    }
  }

  /** The whole layout pass: lattice, rules, part sizes, snapped boxes, then a repaint of both layers. */
  function relayout(): void {
    geo = readGeo();
    const css = rulesText();
    if (css !== lastCss) {
      lastCss = css;
      sheet.setRules(css);
    }
    renderText(kickerEl, props.kicker);
    renderText(subEl, props.subhead);
    const padCols = 4;
    const availL = Math.max(8, geo.cols - padCols * 2);
    plan = planHeadline(props.headline, availL);
    spacerEl.style.height = `${Math.round(plan.heightL * geo.ph)}px`;
    spacerEl.style.display = plan.heightL > 0 ? "block" : "none";
    snapActions();
    // The headline's lattice origin is the spacer's snapped offset; the dim rule and the blinking cursor
    // hang off the same anchor. Everything is a whole number of lattice pixels from the padding box origin.
    const topL = Math.round(spacerEl.offsetTop / geo.ph);
    ruleRow = plan.heightL > 0 ? topL + plan.heightL + 1 : -1;
    cursor = null;
    if (plan.lines.length > 0) {
      const last = plan.lines.length - 1;
      const lineCols = plan.lines[last]?.cols ?? 0;
      const origin = lineOrigin(last);
      cursor = { x0: origin + lineCols * plan.scale + plan.scale, y0: topL + last * (FONT_ROWS + 1) * plan.scale, x1: 0, y1: 0 };
      cursor.x1 = Math.min(cursor.x0 + plan.scale, geo.cols);
      cursor.y1 = Math.min(cursor.y0 + FONT_ROWS * plan.scale, geo.rows);
      if (cursor.x0 >= geo.cols || cursor.y0 >= geo.rows) cursor = null;
    }
    drawType(topL);
    drawCanvas(now);
  }

  /** The lattice column a wrapped headline line starts on: the content edge for "start", centered in the
   *  content column for "center". */
  function lineOrigin(index: number): number {
    const padCols = 4;
    const availL = Math.max(8, geo.cols - padCols * 2);
    const widthL = (plan.lines[index]?.cols ?? 0) * plan.scale;
    if (props.align === "center") return padCols + Math.max(0, Math.floor((availL - widthL) / 2));
    return padCols;
  }

  /** Paints the headline into the type grid, packing every two by two block of lattice pixels into one
   *  quadrant glyph, the same trick block-banner uses for its five row font. */
  function drawType(topL: number): void {
    grid.clear();
    for (const [i, line] of plan.lines.entries()) {
      const scale = plan.scale;
      const lx0 = lineOrigin(i);
      const ly0 = topL + i * (FONT_ROWS + 1) * scale;
      const on = (lx: number, ly: number): boolean => {
        const fx = Math.floor((lx - lx0) / scale);
        const fy = Math.floor((ly - ly0) / scale);
        return fx >= 0 && fx < line.cols && fy >= 0 && fy < FONT_ROWS && line.rows[fy]?.charAt(fx) === "#";
      };
      for (let cy = Math.floor(ly0 / 2); cy <= Math.floor((ly0 + FONT_ROWS * scale - 1) / 2); cy++) {
        for (let cx = Math.floor(lx0 / 2); cx <= Math.floor((lx0 + line.cols * scale - 1) / 2); cx++) {
          const glyph = quadrant(on(cx * 2, cy * 2), on(cx * 2 + 1, cy * 2), on(cx * 2, cy * 2 + 1), on(cx * 2 + 1, cy * 2 + 1));
          if (glyph !== " ") grid.set(cx, cy, glyph);
        }
      }
    }
    grid.flush();
  }

  /** Paints the canvas layer: the ground, the field, then the still marks (edge frame, rule, link frames,
   *  cursor) above it. Every rect is a whole lattice pixel, snapped to device pixels so no edge blurs. */
  function drawCanvas(t: number): void {
    now = t;
    if (!ctx) return;
    const { width, height, dpr } = surface;
    const colors = pal.colors;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);
    const pwD = geo.pw * dpr;
    const phD = geo.ph * dpr;
    const cell = (x: number, y: number, alpha: number, color: string): void => {
      const x0 = Math.round(x * pwD);
      const x1 = Math.round((x + 1) * pwD);
      const y0 = Math.round(y * phD);
      const y1 = Math.round((y + 1) * phD);
      if (x1 <= x0 || y1 <= y0) return;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    };
    const box = (b: LatticeBox, alpha: number, color: string): void => {
      for (let x = b.x0; x < b.x1; x++) {
        cell(x, b.y0, alpha, color);
        cell(x, b.y1 - 1, alpha, color);
      }
      for (let y = b.y0; y < b.y1; y++) {
        cell(b.x0, y, alpha, color);
        cell(b.x1 - 1, y, alpha, color);
      }
    };
    const solid = (b: LatticeBox, alpha: number, color: string): void => {
      for (let y = b.y0; y < b.y1; y++) for (let x = b.x0; x < b.x1; x++) cell(x, y, alpha, color);
    };

    const field = clamp(props.intensity, 0, 1);
    const stepMs = 1000 / clamp(props.speed, 0.5, 60);
    const step = Math.floor(t / stepMs);
    const sweep = geo.cols + geo.rows + 16;
    const toneA: [number, number, number, number] = [0, 0.14, 0.38, 0.85];
    if (field > 0) {
      for (let py = 0; py < geo.rows; py++) {
        for (let px = 0; px < geo.cols; px++) {
          let tone = 0;
          // The shimmer is a seeded diagonal front that advances one lattice pixel per step, with a short
          // wake behind it, plus a sparse scatter of cells that each blink on their own seeded clock.
          const behind = (((step - (px + py)) % sweep) + sweep) % sweep;
          if (behind < Math.max(1, Math.round(2 * field))) tone = 3;
          else if (behind < Math.round(6 * field)) tone = 2;
          else if (behind < Math.round(12 * field)) tone = 1;
          const h = hashSeed(props.seed, px, py) / 4294967296;
          if (h < 0.05 * field) tone = Math.max(tone, 1);
          else if (h < 0.14 * field) {
            const cycle = 1800 + (h * 4096) % 2600;
            if ((t + h * 7919) % cycle < 420) tone = Math.max(tone, 2);
          }
          if (tone > 0) cell(px, py, toneA[tone] ?? 0, colors.fg);
        }
      }
    }

    // The screen's own edge, the rule under the headline, and the frames around the calls to action all
    // draw as lattice pixels, so every straight edge in the hero shares the one grid.
    const dim = toneA[1];
    for (let x = 0; x < geo.cols; x++) {
      cell(x, 0, dim, colors.fg);
      cell(x, geo.rows - 1, dim, colors.fg);
    }
    for (let y = 0; y < geo.rows; y++) {
      cell(0, y, dim, colors.fg);
      cell(geo.cols - 1, y, dim, colors.fg);
    }
    if (ruleRow >= 0 && ruleRow < geo.rows) {
      for (let x = 4; x < geo.cols - 4; x++) cell(x, ruleRow, dim, colors.fg);
    }
    for (const f of frames) box(f, toneA[3] ?? 1, colors.fg);
    if (cursor && Math.floor(t / 530) % 2 === 0) solid(cursor, toneA[3] ?? 1, colors.fg);
    ctx.globalAlpha = 1;
  }

  function onGridLayout(): void {
    relayout();
  }

  function frame(t: number): void {
    drawCanvas(t);
  }

  const onFonts = (): void => relayout();
  document.fonts.addEventListener("loadingdone", onFonts);

  renderActions();
  relayout();
  const loop = createLoop({
    el: host,
    fps: Math.round(clamp(props.speed + 3, 8, 30)),
    still: 5000,
    paused: props.paused,
    time: props.time,
    frame,
  });
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (pal.refresh()) drawCanvas(now);
      if (props.columns !== before.columns) grid.update(gridOptions());
      if (
        props.headline !== before.headline ||
        props.subhead !== before.subhead ||
        props.kicker !== before.kicker ||
        props.align !== before.align ||
        props.minHeight !== before.minHeight ||
        props.columns !== before.columns
      ) {
        relayout();
      }
      if (!sameJson(before.actions, props.actions)) {
        renderActions();
        snapActions();
      }
      label.textContent = props.headline;
      if (props.speed !== before.speed) loop.update({ fps: Math.round(clamp(props.speed + 3, 8, 30)) });
      if (props.paused !== before.paused || props.time !== before.time) loop.update({ paused: props.paused, time: props.time });
      if (props.intensity !== before.intensity || props.seed !== before.seed || !sameJson(before.actions, props.actions)) drawCanvas(now);
    },
    destroy() {
      document.fonts.removeEventListener("loadingdone", onFonts);
      loop.destroy();
      grid.destroy();
      surface.destroy();
      pal.destroy();
      under.remove();
      kickerEl.remove();
      label.remove();
      spacerEl.remove();
      subEl.remove();
      actionsEl.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};
