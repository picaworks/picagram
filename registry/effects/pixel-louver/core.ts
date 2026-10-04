import { leftEighth, lowerEighth } from "../../../lib/blocks";
import { createCanvas } from "../../../lib/canvas";
import { GRID_FONT } from "../../../lib/font";
import { measureCell } from "../../../lib/glyph-grid";
import { hostAttributes, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { hashSeed } from "../../../lib/rng";
import type { MotionProps, Mount } from "../../../lib/types";

export interface PixelLouverProps extends MotionProps {
  /** "margins" sets a bank of blades beside the content on each side, or above and below it where a side has too little room; "full" fills every cell except the content and its quiet cells, which the rail frames, and turns in a broader wave. A full field draws its blades at 0.35 of the opacity and never closes them past five eighths, so the screen stays behind the type. */
  area: "margins" | "full";
  /** Blades across each bank beside the content, or rows of blades in a bank above or below it, from 2 to 16. Unused when area is "full". */
  columns: number;
  /** "x" turns upright blades, filled from the left, across a bank beside the content, and level slats, filled from the bottom, along a bank above or below it; "y" does the reverse. */
  axis: "x" | "y";
  /** The fewest empty cells between the content and the nearest blade or rail, from 0 to 6. */
  quiet: number;
  /** "center" sets the children in one centered column, flush left, with two cells of padding; "none" leaves their layout to the page. */
  layout: "none" | "center";
  /** Motion rate multiplier, clamped from 0.2 to 2. At 1 every blade turns through one cycle in 24 s. */
  speed: number;
  /** Opacity of the blades, clamped from 0.1 to 0.65, and 0.35 of it in a full field. The rail draws at twice this, up to 1. */
  opacity: number;
  /** Glyph size as a multiple of the host's font size, clamped from 0.6 to 1.8. */
  scale: number;
}

export const defaults: PixelLouverProps = {
  area: "margins",
  columns: 6,
  axis: "x",
  quiet: 2,
  layout: "none",
  speed: 1,
  opacity: 0.34,
  scale: 1,
  paused: false,
  time: null,
  seed: 1,
};

/** One blade cycle at speed 1, in milliseconds. The frame at this time is the frame at 0, so the loop has no seam. */
const LOUVER_PERIOD = 24000;

/** The rail's runs and corners. In the glyph atlas they are tiles 16 to 21, after the eight upright blade
 *  levels and the eight slat levels. */
const LOUVER_RAIL = "│─┌┐└┘";

function louverClamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Eighth-block louver blades turn in whole cells beside the content, or in every cell around it, and never
 *  draw under it. The canvas sits behind the children, which keep their own layout, type, and events. */
export const mount: Mount<PixelLouverProps> = (host, initial = {}) => {
  let props: PixelLouverProps = { ...defaults, ...initial };
  let destroyed = false;
  let ready = false;
  let dirty = true;
  let shown = "";
  let padding = "";
  let undoLayout = (): void => undefined;
  let loop: Loop | null = null;
  // Cells are in device pixels. Each blade keeps x, y, and its first atlas tile, with a phase; each rail cell
  // keeps x, y, and its tile.
  let cw = 1;
  let ch = 1;
  let cells = new Int32Array(0);
  let phases = new Float64Array(0);
  let levels = new Uint8Array(0);
  let rails: number[] = [];
  const attrs = hostAttributes(host);
  const restoreHost = styleHost(host, { isolation: "isolate" });
  const surface = createCanvas(host, { maxDpr: 2, maxPixels: 4200000, css: "z-index:-1", onResize: () => relayout(true) });
  const ctx = surface.canvas.getContext("2d");
  // Every glyph is drawn once into a cell-sized tile, then copied whole, so no glyph spills into a neighbor.
  const atlas = document.createElement("canvas");
  atlas.setAttribute("data-pica", "");
  const tiles = atlas.getContext("2d");
  const palette = watchPalette(host, () => relayout(true));
  const range = document.createRange();

  /** "center" sets the children in one centered column, flush left, with two cells of padding, all restored on destroy. */
  function applyLayout(): void {
    const s = louverClamp(props.scale, 0.6, 1.8);
    const next = props.layout === "center" ? `${(2.4 * s).toFixed(2)}em ${(1.2 * s).toFixed(2)}em` : "";
    if (next === padding) return;
    undoLayout();
    padding = next;
    undoLayout = next
      ? styleHost(host, { display: "grid", "place-content": "center", "justify-items": "start", "box-sizing": "border-box", padding: next })
      : () => undefined;
  }

  /** Measures the cell and the content, then decides which cells hold blades, which way each blade turns, and
   *  which cells hold the rail. */
  function relayout(force: boolean): void {
    if (destroyed || !ctx || !tiles) return;
    const dpr = surface.dpr;
    const px = louverClamp((parseFloat(getComputedStyle(host).fontSize) || 16) * louverClamp(props.scale, 0.6, 1.8), 8, 48) * dpr;
    const font = `${px}px ${GRID_FONT}`;
    tiles.font = font;
    const block = tiles.measureText("█");
    const rail = tiles.measureText("│");
    const tall = (m: TextMetrics): number => m.actualBoundingBoxAscent + m.actualBoundingBoxDescent || px * 1.2;
    // A row is as tall as the measured ink of a full block and of the rail, within 1 to 1.2 em, so the rail
    // runs unbroken from row to row.
    cw = Math.max(1, Math.floor(measureCell(GRID_FONT, px, 1.2).w));
    ch = Math.max(1, Math.floor(louverClamp(Math.min(tall(block), tall(rail)), px, px * 1.2)));
    const W = surface.width;
    const H = surface.height;
    const cols = Math.floor(W / cw);
    const rows = Math.floor(H / ch);
    const ox = (W - cols * cw) >> 1;
    const oy = (H - rows * ch) >> 1;

    // The content is the union of the boxes of every child the core did not create, text runs included.
    const box = host.getBoundingClientRect();
    const k = box.width / (host.offsetWidth || 1) || 1;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const node of host.childNodes) {
      let r: DOMRect | null = null;
      if (node instanceof Element) {
        if (!node.hasAttribute("data-pica")) r = node.getBoundingClientRect();
      } else if (node.nodeType === 3 && node.textContent?.trim()) {
        range.selectNodeContents(node);
        r = range.getBoundingClientRect();
      }
      if (r && r.width > 0 && r.height > 0) {
        x0 = Math.min(x0, r.left);
        y0 = Math.min(y0, r.top);
        x1 = Math.max(x1, r.right);
        y1 = Math.max(y1, r.bottom);
      }
    }
    const found = x1 > x0;
    const gx = (v: number): number => (((v - box.left) / k - host.clientLeft) * dpr - ox) / cw;
    const gy = (v: number): number => (((v - box.top) / k - host.clientTop) * dpr - oy) / ch;
    const c0 = found ? louverClamp(Math.floor(gx(x0)), 0, cols) : cols >> 1;
    const c1 = found ? louverClamp(Math.ceil(gx(x1)), c0, cols) : c0;
    const r0 = found ? louverClamp(Math.floor(gy(y0)), 0, rows) : rows >> 1;
    const r1 = found ? louverClamp(Math.ceil(gy(y1)), r0, rows) : r0;

    // q is the open rectangle in cells, [left, top, right, bottom). The rail runs round its outside edge.
    const full = props.area === "full";
    const quiet = Math.round(louverClamp(props.quiet, 0, 6));
    let q: [number, number, number, number] = [-9, -9, -9, -9];
    if (full) {
      if (found) q = [Math.max(0, c0 - quiet), Math.max(0, r0 - quiet), Math.min(cols, c1 + quiet), Math.min(rows, r1 + quiet)];
    } else {
      // A bank is its blades plus the rail on its inner edge, kept `quiet` cells from the content. A side with
      // room for fewer than two blades sends its bank above and below the content instead.
      const columns = Math.round(louverClamp(props.columns, 2, 16));
      const depth = (free: number): number => {
        const n = Math.min(columns, free - quiet - 1);
        return n < 2 ? 0 : n + 1;
      };
      const left = depth(c0);
      const right = depth(cols - c1);
      const sides = left > 0 && right > 0;
      q = [left, sides ? 0 : depth(r0), cols - right, rows - (sides ? 0 : depth(rows - r1))];
    }
    const [a, b, e, f] = q;
    // Blades follow their bank: a bank above or below the content turns the other way from one beside it.
    const swap = !full && (b > 0 || f < rows);
    const key = `${font}|${W}|${H}|${cw}|${ch}|${props.axis}|${props.area}|${q}|${swap}`;
    if (!force && key === shown) return;
    shown = key;

    // Tiles 0 to 7 are upright blades and 8 to 15 are slats. Each blade keeps about an eighth of a cell clear
    // below it, and beside it when it stands upright, so every cell reads as its own blade, even closed. A
    // full field draws them lighter. The rail fills its whole cell and runs unbroken.
    const alpha = louverClamp(props.opacity, 0.1, 0.65);
    const gapX = Math.max(1, Math.round(cw / 9));
    const gapY = Math.max(1, Math.round(ch / 8));
    atlas.width = 22 * cw;
    atlas.height = ch;
    tiles.font = font;
    for (let i = 0; i < 22; i++) {
      const blade = i < 16;
      const slat = blade && i >= 8;
      const m = blade ? block : rail;
      tiles.save();
      tiles.beginPath();
      if (!blade) tiles.rect(i * cw, 0, cw, ch);
      else if (slat) tiles.rect(i * cw, gapY, cw, ch - gapY);
      else tiles.rect(i * cw, gapY >> 1, cw - gapX, ch - gapY);
      tiles.clip();
      tiles.globalAlpha = blade ? alpha * (full ? 0.35 : 1) : Math.min(1, alpha * 2);
      tiles.fillStyle = blade ? palette.colors.fg : palette.colors.muted;
      // Upright blades and the rail center their ink in the cell; slats stand on the cell's floor.
      tiles.fillText(
        !blade ? LOUVER_RAIL.charAt(i - 16) : slat ? lowerEighth(i - 7) : leftEighth(i + 1),
        i * cw,
        slat ? ch - m.actualBoundingBoxDescent : (ch - tall(m)) / 2 + m.actualBoundingBoxAscent,
      );
      tiles.restore();
    }

    // The phase steps half a radian from blade to blade, and slowly along each blade. A full field takes a
    // broader wave, so the whole host turns in a few wide bands rather than many narrow ones.
    const wide = full ? 0.4 : 1;
    const xy: number[] = [];
    const ph: number[] = [];
    rails = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = ox + c * cw;
        const y = oy + r * ch;
        if (c >= a && c < e && r >= b && r < f) continue;
        if (c >= a - 1 && c <= e && r >= b - 1 && r <= f) {
          const v = r < b || r >= f;
          const h = c < a || c >= e;
          rails.push(x, y, v && h ? 18 + (r < b ? 0 : 2) + (c < a ? 0 : 1) : v ? 17 : 16);
          continue;
        }
        const slat = (props.axis === "y") !== (swap && (r < b || r >= f));
        const kx = (slat ? 0.11 : 0.5) * wide;
        const ky = (slat ? 0.5 : 0.22) * wide;
        xy.push(x, y, slat ? 8 : 0);
        ph.push(kx * c + ky * r);
      }
    }
    cells = Int32Array.from(xy);
    phases = Float64Array.from(ph);
    levels = new Uint8Array(ph.length);
    dirty = true;
    loop?.redraw();
  }

  /** Each blade shows n = round(8 (0.5 + 0.5 sin θ)) eighths, kept from 1 to 8, so it turns but never vanishes.
   *  A full field maps the same sine to 1 to 5 eighths, so none of its blades ever closes. Only the cells whose
   *  level changed are copied again. */
  function frame(t: number): void {
    if (destroyed) return;
    if (ctx) {
      if (dirty) {
        dirty = false;
        levels.fill(0);
        ctx.clearRect(0, 0, surface.width, surface.height);
        for (let i = 0; i < rails.length; i += 3) ctx.drawImage(atlas, rails[i + 2]! * cw, 0, cw, ch, rails[i]!, rails[i + 1]!, cw, ch);
      }
      const full = props.area === "full";
      const turn = (2 * Math.PI * louverClamp(props.speed, 0.2, 2) * t) / LOUVER_PERIOD + (hashSeed(props.seed, 41) / 4294967296) * 2 * Math.PI;
      for (let i = 0; i < levels.length; i++) {
        const s = Math.sin(turn + phases[i]!);
        const n = full ? Math.round(3 + 2 * s) : Math.max(1, Math.round(4 + 4 * s));
        if (n === levels[i]) continue;
        levels[i] = n;
        const x = cells[3 * i]!;
        const y = cells[3 * i + 1]!;
        ctx.clearRect(x, y, cw, ch);
        ctx.drawImage(atlas, (cells[3 * i + 2]! + n - 1) * cw, 0, cw, ch, x, y, cw, ch);
      }
    }
    if (!ready) {
      ready = true;
      attrs.set("data-pica-ready", "true");
    }
  }

  // The clear zone follows the children: their sizes, their arrival and removal, their text, and font loads.
  // Both observers only read.
  const watch = typeof ResizeObserver === "function" ? new ResizeObserver(() => relayout(false)) : null;
  function follow(): void {
    watch?.disconnect();
    watch?.observe(host);
    for (const child of host.children) if (!child.hasAttribute("data-pica")) watch?.observe(child);
  }
  const mutations = typeof MutationObserver === "function"
    ? new MutationObserver(() => {
        follow();
        relayout(false);
      })
    : null;
  const onFonts = (): void => relayout(true);

  applyLayout();
  relayout(true);
  loop = createLoop({ el: host, paused: props.paused, time: props.time, fps: 12, still: 1200, frame });
  follow();
  mutations?.observe(host, { childList: true, subtree: true, characterData: true });
  document.fonts.addEventListener("loadingdone", onFonts);

  return {
    update(next) {
      props = { ...props, ...next };
      applyLayout();
      palette.refresh();
      relayout(true);
      loop?.update({ paused: props.paused, time: props.time });
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      loop?.destroy();
      watch?.disconnect();
      mutations?.disconnect();
      document.fonts.removeEventListener("loadingdone", onFonts);
      palette.destroy();
      surface.destroy();
      undoLayout();
      restoreHost();
      attrs.restore();
    },
  };
};
