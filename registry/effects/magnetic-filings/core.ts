import { createCanvas } from "../../../lib/canvas";
import { GRID_FONT } from "../../../lib/font";
import { measureCell } from "../../../lib/glyph-grid";
import { hostAttributes, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { matchShape, measureRamp, measureShapes } from "../../../lib/ramp";
import { hashSeed } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

export interface MagneticFilingsProps extends MotionProps {
  /** Up to four charges: x and y place each one as a fraction of the host, and charge runs from -1 to 1. Each is marked [+] or [−] in the accent, drifts on its own small figure eight, and moves to the nearest free place when its path would meet the content. */
  sources: { x: number; y: number; charge: number }[];
  /** Glyph columns from one filing to the next, 1 to 3. At 2 each filing sits in a square cell. */
  spacing: number;
  /** Glyph size in CSS pixels, 10 to 20. */
  fontSize: number;
  /** Cells around the content, past the one cell kept clear, that draw only the faintest glyph, 0 to 6. */
  quiet: number;
  /** "center" makes the host a grid that centers its children in a column up to 34em wide, inside two cells of padding. "none" leaves layout to the page. */
  layout: "none" | "center";
  /** Seconds for each charge to close its path, 12 to 60. */
  period: number;
  /** Ink strength of the filings, from zero to one: the strongest draw in fg at this strength, the rest in muted. */
  opacity: number;
  /** Frames per second ceiling, 12 to 24. */
  fps: number;
}

export const defaults: MagneticFilingsProps = {
  sources: [{ x: 0.2, y: 0.25, charge: 1 }, { x: 0.8, y: 0.75, charge: -1 }],
  spacing: 2,
  fontSize: 13,
  quiet: 3,
  layout: "none",
  period: 24,
  opacity: 0.6,
  fps: 15,
  paused: false,
  time: null,
  seed: 1,
};

/** The orientation glyphs, in the order measureShapes keeps them. */
const FILINGS = "-\\|/";

export const mount: Mount<MagneticFilingsProps> = (host, initial = {}) => {
  /** A charge's home in pixels, its strength, the phase and direction of its path, and the phase of its tick. */
  type Charge = { x: number; y: number; q: number; a: number; d: number; p: number };
  let props: MagneticFilingsProps = { ...defaults, ...initial };
  let loop: Loop | null = null;
  let undoLayout = (): void => undefined;
  let destroyed = false, ready = false, full = true, key = "";
  // Host size, glyph cell, lattice (n filings a row, one every s columns), grid origin, and the clock.
  let hw = 0, hh = 0, cw = 1, ch = 1, s = 1, n = 0, rows = 0, cols = 1, ox = 0, oy = 0, period = 24000, tick = 600;
  let zone: [number, number, number, number] | null = null;
  // Per filing, kind is 0 clear, 1 faint, 2 medium or 3 strong. Shown is the code on screen: 0 nothing, 1 the
  // faint glyph, 2 to 5 an orientation in muted, 6 to 9 an orientation in fg.
  let kind = new Uint8Array(0), shown = new Uint8Array(0), ticks = new Float64Array(0), phase = new Float64Array(0);
  let bins: number[] = [], weak = "\u00b7", charges: Charge[] = [], lit: number[] = [];
  const attrs = hostAttributes(host);
  const undoIsolation = styleHost(host, { isolation: "isolate" });
  const range = document.createRange();
  const num = (value: unknown, lo: number, hi: number, fallback: number): number => {
    const v = Number(value);
    return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;
  };
  const size = (): number => num(props.fontSize, 10, 20, 13);
  const fps = (): number => num(props.fps, 12, 24, 15);
  const tickOf = (t: number, p: number): number => Math.floor((t + p) / tick);
  /** How far a cell centered at (x, y) sits outside the content box, on whichever axis it is farther out. */
  const away = (x: number, y: number): number =>
    zone ? Math.max(Math.max(zone[0] - x, x - zone[2], 0) - cw / 2, Math.max(zone[1] - y, y - zone[3], 0) - ch / 2) : Infinity;

  applyLayout();
  const surface = createCanvas(host, { maxDpr: 1.5, maxPixels: 4e6, css: "z-index:-1", onResize: () => relayout(true) });
  const ctx = surface.canvas.getContext("2d")!;
  const palette = watchPalette(host, () => {
    full = true;
    loop?.redraw();
  });
  const sizes = new ResizeObserver(() => relayout(false));
  const watch = (): void => {
    sizes.disconnect();
    sizes.observe(host);
    for (const child of Array.from(host.children)) if (!child.hasAttribute("data-pica")) sizes.observe(child);
  };
  const children = new MutationObserver(() => {
    watch();
    relayout(false);
  });
  const onFonts = (): void => relayout(true);
  watch();
  children.observe(host, { childList: true });
  document.fonts.addEventListener("loadingdone", onFonts);

  function applyLayout(): void {
    undoLayout();
    undoLayout = props.layout === "center"
      ? styleHost(host, {
          display: "grid",
          "place-content": "center",
          "justify-items": "start",
          "grid-template-columns": "minmax(0, 34em)",
          padding: `${2 * measureCell(GRID_FONT, size(), 1.2).h}px`,
          "box-sizing": "border-box",
        })
      : () => undefined;
  }

  /** The union of the boxes of the host's own children, in canvas pixels. It only reads layout. */
  function measure(): [number, number, number, number] | null {
    const o = surface.canvas.getBoundingClientRect();
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    const add = (node: Node): void => {
      const el = node.nodeType === 1 ? (node as Element) : null;
      if (el ? el.hasAttribute("data-pica") : node.nodeType !== 3 || !node.textContent?.trim()) return;
      if (!el) range.selectNodeContents(node);
      const box = (el ?? range).getBoundingClientRect();
      if (box.width || box.height) {
        l = Math.min(l, box.left);
        t = Math.min(t, box.top);
        r = Math.max(r, box.right);
        b = Math.max(b, box.bottom);
      } else el?.childNodes.forEach(add);
    };
    host.childNodes.forEach(add);
    return l > r ? null : [l - o.left, t - o.top, r - o.left, b - o.top];
  }

  /** The cell a charge's sign occupies at time t: a column between filings wherever the spacing leaves one, with room on both sides for its brackets. */
  function cellOf(c: Charge, t: number): number {
    const a = (2 * Math.PI * t) / period + c.a;
    const fx = (c.x + c.d * 4 * ch * Math.sin(a) - ox) / cw - 0.5;
    const fy = (c.y + 3 * ch * Math.sin(2 * a) - oy) / ch - 0.5;
    let col = Math.round(fx);
    if (s > 1 && col % s === 0) col += fx > col ? 1 : -1;
    col = Math.max(1, Math.min(cols - 2, col));
    return Math.max(0, Math.min(rows - 1, Math.round(fy))) * cols + col;
  }

  /** The field at (x, y) from charges listed as x, y, charge triples, in pixel space. */
  function field(x: number, y: number, at: readonly number[]): [number, number] {
    let ex = 0, ey = 0;
    for (let j = 0; j + 2 < at.length; j += 3) {
      const dx = x - at[j]!, dy = y - at[j + 1]!, d2 = dx * dx + dy * dy + ch * ch, f = at[j + 2]! / (d2 * Math.sqrt(d2));
      ex += f * dx;
      ey += f * dy;
    }
    return [ex, ey];
  }

  /** Measures the host and its content, then rebuilds the lattice, the tone bands, and the charges' homes. */
  function relayout(force: boolean): void {
    if (destroyed) return;
    const z = measure();
    const next = [surface.cssWidth, surface.cssHeight, ...(z ?? []).map(Math.round)].join();
    if (!force && next === key) return;
    key = next;
    zone = z;
    hw = surface.cssWidth;
    hh = surface.cssHeight;
    ({ w: cw, h: ch } = measureCell(GRID_FONT, size(), 1.2));
    s = Math.round(num(props.spacing, 1, 3, 2));
    n = Math.max(0, Math.floor((hw / cw - 1) / s) + 1);
    rows = Math.max(0, Math.floor(hh / ch));
    cols = Math.max(1, (n - 1) * s + 1);
    ox = (hw - cols * cw) / 2;
    oy = (hh - rows * ch) / 2;
    period = num(props.period, 12, 60, 24) * 1000;
    tick = period / Math.round(period / 600);
    const band = ch * (1 + Math.round(num(props.quiet, 0, 6, 3)));
    // A home sits where the whole path of the charge's pocket stays outside the quiet band and three cells inside
    // the host's edge, so no token or star is cropped. Where the content leaves no such place, the home's own
    // pocket alone stays outside the band.
    const rx = 4 * ch + 3.5 * cw, ry = 5 * ch;
    const keep = (v: number, pad: number, span: number): number => Math.max(pad + 3 * ch, Math.min(span - pad - 3 * ch, v));
    const free = (x: number, y: number, ex: number, ey: number): boolean =>
      !z || x <= z[0] - band - ex || x >= z[2] + band + ex || y <= z[1] - band - ey || y >= z[3] + band + ey;
    charges = (Array.isArray(props.sources) ? props.sources : []).slice(0, 4).map((src, j) => {
      const h = hashSeed(props.seed, j + 1, 7);
      let x = keep(num(src?.x, 0, 1, 0.5) * hw, rx, hw), y = keep(num(src?.y, 0, 1, 0.5) * hh, ry, hh);
      for (const [ex, ey] of [[rx, ry], [3.5 * cw, 2 * ch]] as [number, number][]) {
        if (!z || free(x, y, ex, ey)) break;
        let best = Infinity, bx = x, by = y;
        for (const [cx, cy] of [[z[0] - band - ex, y], [z[2] + band + ex, y], [x, z[1] - band - ey], [x, z[3] + band + ey]] as [number, number][]) {
          const px = keep(cx, rx, hw), py = keep(cy, ry, hh), d = Math.hypot(px - x, py - y);
          if (free(px, py, ex, ey) && d < best) [best, bx, by] = [d, px, py];
        }
        [x, y] = [bx, by];
        if (best < Infinity) break;
      }
      return { x, y, q: num(src?.charge, -1, 1, 1), a: (h / 4294967296) * 2 * Math.PI, d: h & 1 ? 1 : -1, p: ((h & 65535) / 65536) * tick };
    });
    const count = n * rows, amp = new Float64Array(count), mags: number[] = [], home = charges.flatMap((c) => [c.x, c.y, c.q]);
    kind = new Uint8Array(count);
    shown = new Uint8Array(count);
    ticks = new Float64Array(count);
    phase = new Float64Array(count);
    for (let i = 0; i < count; i++) {
      const col = i % n, r = (i - col) / n, x = ox + (col * s + 0.5) * cw, y = oy + (r + 0.5) * ch, gap = away(x, y);
      // Filings near a home tick with that charge, so its star and its pocket move in the frame the charge moves.
      let near = 64 * ch * ch, p = (hashSeed(props.seed, col, r) / 4294967296) * tick;
      for (const c of charges) {
        const d = (x - c.x) ** 2 + (y - c.y) ** 2;
        if (d < near) [near, p] = [d, c.p];
      }
      phase[i] = p;
      if (gap < ch) continue;
      if (gap < band) {
        kind[i] = 1;
        continue;
      }
      const [ex, ey] = field(x, y, home);
      // 4 marks the two cells past the quiet band, which never draw strong, so the copy fades in three steps.
      kind[i] = gap < band + 2 * ch ? 4 : 2;
      mags.push((amp[i] = Math.hypot(ex, ey)));
    }
    // Tone holds still: each band comes from the field with every charge at home, cut at the 40th and 80th percentiles.
    mags.sort((a, b) => a - b);
    const lo = mags[Math.floor(mags.length * 0.4)] ?? 0, hi = mags[Math.floor(mags.length * 0.8)] ?? 0;
    for (let i = 0; i < count; i++) if (kind[i]! > 1) kind[i] = amp[i]! > hi && kind[i] === 2 ? 3 : amp[i]! > lo ? 2 : 1;
    // Each of 16 orientations becomes a 3 by 3 coverage sample of a line through the cell, matched to the measured ink of the four glyphs.
    const shapes = measureShapes(FILINGS, GRID_FONT, 1.2), reach = Math.hypot(cw, ch) / 64;
    bins = [];
    for (let b = 0; b < 16; b++) {
      const a = (b * Math.PI) / 16, sample = new Array<number>(9).fill(0);
      for (let j = -32; j <= 32; j++) {
        const x = 0.5 + (j * reach * Math.cos(a)) / cw, y = 0.5 + (j * reach * Math.sin(a)) / ch, at = Math.floor(y * 3) * 3 + Math.floor(x * 3);
        if (x >= 0 && x < 1 && y >= 0 && y < 1) sample[at]! += 1;
      }
      const top = Math.max(...sample);
      bins.push(shapes ? Math.max(0, FILINGS.indexOf(matchShape(shapes, sample.map((v) => v / top)))) : Math.round(b / 4) % 4);
    }
    weak = measureRamp("\u00b7:", GRID_FONT, 1.2).glyphs[0] ?? "\u00b7";
    full = true;
    loop?.redraw();
  }

  function draw(t: number): void {
    if (destroyed) return;
    const all = full, dirty = new Uint8Array(rows);
    full = false;
    if (all) dirty.fill(1);
    for (let i = 0; i < kind.length; i++) {
      const k = kind[i]!, step = tickOf(t, phase[i]!);
      let code = Math.min(1, k);
      if (k > 1) {
        // A filing turns only on its own tick, so no cell changes more than twice a second.
        if (!all && step === ticks[i]) continue;
        ticks[i] = step;
        const when = step * tick - phase[i]!, at: number[] = [];
        for (const c of charges) {
          const cell = cellOf(c, when);
          at.push(ox + ((cell % cols) + 0.5) * cw, oy + (Math.floor(cell / cols) + 0.5) * ch, c.q);
        }
        const col = i % n, [ex, ey] = field(ox + (col * s + 0.5) * cw, oy + ((i - col) / n + 0.5) * ch, at);
        code = k * 4 - 6 + bins[(Math.round((Math.atan2(ey, ex) * 16) / Math.PI) + 32) % 16]!;
      }
      if (code !== shown[i]) {
        shown[i] = code;
        dirty[Math.floor(i / n)] = 1;
      }
    }
    // Each charge clears a pocket one row and two columns around its sign, which moves with it on its tick.
    const cells = cols > 2 && rows > 0 ? charges.map((c) => cellOf(c, tickOf(t, c.p) * tick - c.p)) : [];
    if (cells.join() !== lit.join()) for (const cell of [...lit, ...cells]) for (let d = -1; d < 2; d++) dirty[Math.floor(cell / cols) + d] = 1;
    lit = cells;
    const pocket = (r: number, c: number): boolean =>
      cells.some((cell) => Math.abs(Math.floor(cell / cols) - r) < 2 && Math.abs((cell % cols) - c) < 3);
    const { fg, muted, accent } = palette.colors;
    ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
    if (all) ctx.clearRect(0, 0, hw, hh);
    else for (let r = 0; r < rows; r++) if (dirty[r]) ctx.clearRect(0, oy + r * ch, hw, ch);
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.font = `${size()}px ${GRID_FONT}`;
    ctx.globalAlpha = num(props.opacity, 0, 1, 0.6);
    for (const strong of [false, true]) {
      ctx.fillStyle = strong ? fg : muted;
      for (let r = 0; r < rows; r++) {
        if (!dirty[r]) continue;
        for (let col = 0; col < n; col++) {
          const code = shown[r * n + col]!;
          if (!code || code > 5 !== strong || pocket(r, col * s)) continue;
          ctx.fillText(code > 1 ? FILINGS[(code - 2) % 4]! : weak, ox + col * s * cw, oy + (r + 0.5) * ch);
        }
      }
    }
    // The only accent: a bold [+] or [−] token, one glyph per cell, centered on the charge's cell.
    ctx.globalAlpha = 1;
    ctx.fillStyle = accent;
    ctx.font = `700 ${size()}px ${GRID_FONT}`;
    cells.forEach((cell, j) => {
      const r = Math.floor(cell / cols), c = cell % cols, y = oy + (r + 0.5) * ch;
      if (!dirty[r] || [-1, 0, 1].some((k) => away(ox + (c + k + 0.5) * cw, y) < ch)) return;
      ["[", charges[j]!.q < 0 ? "\u2212" : "+", "]"].forEach((g, k) => ctx.fillText(g, ox + (c + k - 1) * cw, y));
    });
    if (!ready) {
      ready = true;
      attrs.set("data-pica-ready", "true");
    }
  }

  relayout(true);
  loop = createLoop({ el: host, fps: fps(), paused: props.paused, time: props.time, still: 1200, frame: draw });
  return {
    update(next) {
      if (destroyed) return;
      props = { ...props, ...next };
      palette.refresh();
      applyLayout();
      relayout(true);
      loop?.update({ paused: props.paused, time: props.time, fps: fps() });
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      sizes.disconnect();
      children.disconnect();
      document.fonts.removeEventListener("loadingdone", onFonts);
      loop?.destroy();
      palette.destroy();
      surface.destroy();
      undoLayout();
      undoIsolation();
      attrs.restore();
    },
  };
};
