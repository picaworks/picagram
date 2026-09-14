import { createCanvas } from "../../../lib/canvas";
import { hostAttributes, layer, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssOn, cssVar, watchPalette, type Colors } from "../../../lib/palette";
import { createRng, hashSeed } from "../../../lib/rng";
import type { Mount } from "../../../lib/types";

/** One call to action: a link's visible text and destination. */
export interface BohemianHeroAction {
  /** Text on the link. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface BohemianHeroProps {
  /** The headline inside the arch, set large in the page's own font. Empty hides it. */
  headline: string;
  /** Supporting copy under the headline. Empty hides it. */
  subhead: string;
  /** Calls to action, drawn as links in source order. The first draws solid in the accent, the rest draw hairline. At most three are drawn. */
  actions: readonly BohemianHeroAction[];
  /** Which side of the field the enclosure leans toward: "start" hangs it on the left, "end" mirrors the whole composition. */
  align: "start" | "end";
  /** Draw the woven bands along the top and bottom edges, the fringe, the selvedge, and the crossband tied between it and the arch. */
  bands: boolean;
  /** Draw the arched boundary around the content. */
  arch: boolean;
  /** How strongly the drawn work shows, from 0 to 1. */
  intensity: number;
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
  /** Seed for the woven motif, so the same seed always draws the same tile. */
  seed: number;
}

export const defaults: BohemianHeroProps = {
  headline: "Woven at the edges, open in the middle.",
  subhead: "Counted thread bands frame the field, an arch shelters the copy, and the prose always sits in front of the work.",
  actions: [
    { label: "Browse components", href: "#components" },
    { label: "Read the docs", href: "#docs" },
  ],
  align: "start",
  bands: true,
  arch: true,
  intensity: 0.8,
  minHeight: 62,
  seed: 1,
};

/** Side of the square woven tile, in CSS pixels. A border band is exactly one tile thick. */
const TILE = 30;
/** Thickness of the top and bottom bands, in CSS pixels. */
const BAND = TILE;
/** Width of the narrow selvedge strip on the open edge, in CSS pixels. */
const RUNNER = 28;
/** Gap between a band's weave and the hairlines that bound it, in CSS pixels. */
const BAND_GAP = 4.5;
/** Radius of each scallop under the top band and along the inner arch, in CSS pixels. */
const SCALLOP = 4.2;
/** Distance between scallop centres along a curve, in CSS pixels. */
const SCALLOP_STEP = 10.5;
/** Below this host width the selvedge and the swatch hide and every column goes full width. */
const MIN_WIDE = 760;
/** Inset between the outer arch and the inner one, in CSS pixels. */
const ARCH_INSET = 9;

const TRACKS = "repeat(12, minmax(0, 1fr))";
const GUTTER = "clamp(0.75rem, 2vw, 1.5rem)";
const ROW_GAP = "clamp(1rem, 2.4vh, 1.7rem)";
const PAD_TOP = "clamp(5.5rem, 14vh, 9rem)";
const PAD_BOTTOM = "clamp(5rem, 11vh, 7rem)";
const PAD_SIDE = "clamp(1.25rem, 5vw, 4.5rem)";

/** A measured rectangle in host coordinates, the union the arch is drawn around. */
interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
}

/** Keeps minHeight inside a sane range even if a caller passes something outside 0 to 100. */
function vh(minHeight: number): number {
  return Math.min(100, Math.max(0, minHeight));
}

/** Reads a pixel length from a computed style, falling back to 0. */
function px(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

/** Creates one element the core owns, marked for identification and scoped styling. */
function part<K extends keyof HTMLElementTagNameMap>(tag: K, name: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute(`data-pica-${name}`, "");
  return node;
}

/** A crisp horizontal hairline at a whole pixel. */
function hline(ctx: CanvasRenderingContext2D, x1: number, y: number, x2: number): void {
  ctx.beginPath();
  ctx.moveTo(x1, Math.round(y) + 0.5);
  ctx.lineTo(x2, Math.round(y) + 0.5);
  ctx.stroke();
}

/** A crisp vertical hairline at a whole pixel. */
function vline(ctx: CanvasRenderingContext2D, x: number, y1: number, y2: number): void {
  ctx.beginPath();
  ctx.moveTo(Math.round(x) + 0.5, y1);
  ctx.lineTo(Math.round(x) + 0.5, y2);
  ctx.stroke();
}

/** Layout for the host and the button grammar for its calls to action. The content leans to one side of a
 *  twelve column grid and the woven work drawn under it supplies the counterweight. The minimum height sits
 *  in a :where() rule, which carries no specificity, so a page that gives this host a height still wins. */
function rules(selector: string, p: BohemianHeroProps): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  const col = p.align === "end" ? "6 / 13" : "1 / 8";
  const edge = p.align === "end" ? "flex-end" : "flex-start";
  const textAlign = p.align === "end" ? "end" : "start";
  return [
    `:where(${selector}){min-height:${vh(p.minHeight)}vh}`,
    `${selector}{position:relative;isolation:isolate;box-sizing:border-box;display:grid;grid-template-columns:${TRACKS};column-gap:${GUTTER};row-gap:${ROW_GAP};align-content:center;padding:${PAD_TOP} ${PAD_SIDE} ${PAD_BOTTOM};color:${fg};text-align:${textAlign}}`,
    `${selector} *{box-sizing:border-box}`,
    `${selector} > *{min-width:0}`,
    `${selector} > :not([data-pica]){grid-column:${col};margin:0;min-width:0;max-width:33em;overflow-wrap:break-word}`,
    `${selector} [data-pica-type]{grid-column:${col};grid-row:1;min-width:0;text-align:${textAlign}}`,
    `${selector} [data-pica-headline]{margin:0;font-size:clamp(2.5rem,6vw,4.9rem);line-height:1.03;font-weight:650;letter-spacing:-0.015em;overflow-wrap:break-word}`,
    `${selector} [data-pica-subhead]{margin:1em 0 0;max-width:33em;font-size:clamp(1.02rem,1.45vw,1.24rem);line-height:1.6;color:${muted}}`,
    `${selector} [data-pica-actions]{grid-column:${col};display:flex;flex-wrap:wrap;align-items:center;gap:0.75em;justify-content:${edge}}`,
    `${selector} [data-pica-actions][hidden],${selector} [data-pica-actions]:empty{display:none}`,
    `${selector} [data-pica-actions] a{appearance:none;margin:0;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.6em 1.3em;display:inline-flex;align-items:center;border:1px solid ${muted};border-radius:0;color:${fg};background:transparent;cursor:pointer}`,
    `${selector} [data-pica-actions] a[data-variant="solid"]{background:${accent};border-color:${accent};color:${cssOn("accent")}}`,
    `${selector} [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${accent} 85%, ${fg})}`,
    `${selector} [data-pica-actions] a[data-variant="outline"]:hover{border-color:${fg};background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${selector} [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${selector}[data-pica-fit="min"] > :not([data-pica]),${selector}[data-pica-fit="min"] [data-pica-type],${selector}[data-pica-fit="min"] [data-pica-actions]{grid-column:1 / -1;max-width:none}`,
  ].join("\n");
}

/** Rebuilds the action links from JSON: the first solid in the accent, the rest hairline, in source order. */
function renderActions(container: HTMLElement, actions: readonly BohemianHeroAction[]): void {
  container.replaceChildren();
  for (const [i, action] of actions.slice(0, 3).entries()) {
    const a = document.createElement("a");
    a.setAttribute("data-pica", "");
    a.dataset.variant = i === 0 ? "solid" : "outline";
    a.href = action.href;
    a.textContent = action.label;
    container.append(a);
  }
  container.hidden = actions.length === 0;
}

/** One woven tile, drawn fresh from the seed each time the canvas repaints. Two weft rows of staggered
 *  thread dashes carry a centred diamond whose bead is the one dyed accent, with short warp ticks showing
 *  in the gaps. The band repeats this tile; nothing about it is copied from any pattern source. */
function makeTile(colors: Colors, seed: number, dpr: number, k: number): HTMLCanvasElement {
  const tile = document.createElement("canvas");
  const size = Math.max(1, Math.ceil(TILE * dpr));
  tile.width = size;
  tile.height = size;
  const c = tile.getContext("2d");
  if (!c) return tile;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const rng = createRng(hashSeed(seed, 11));
  c.fillStyle = colors.fg;
  for (const y of [3.5, 24.5]) {
    const dash = 4 + Math.floor(rng() * 3);
    const gap = 2 + Math.floor(rng() * 3);
    const off = Math.floor(rng() * (dash + gap));
    c.globalAlpha = 0.5 * k;
    for (let x = -off; x < TILE; x += dash + gap) c.fillRect(x, y, dash, 3);
  }
  const mid = TILE / 2;
  c.strokeStyle = colors.fg;
  c.globalAlpha = 0.55 * k;
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(mid, 8.5);
  c.lineTo(mid + 6, 14.5);
  c.lineTo(mid, 20.5);
  c.lineTo(mid - 6, 14.5);
  c.closePath();
  c.stroke();
  for (const edgeX of [0, TILE]) {
    c.beginPath();
    c.moveTo(edgeX, 11);
    c.lineTo(edgeX + (edgeX === 0 ? 3 : -3), 14.5);
    c.lineTo(edgeX, 18);
    c.stroke();
  }
  c.fillStyle = colors.accent;
  c.globalAlpha = 0.85 * k;
  c.fillRect(mid - 1.4, 13.1, 2.8, 2.8);
  c.fillStyle = colors.muted;
  c.globalAlpha = 0.5 * k;
  for (let i = 0; i < 3; i++) {
    const x = 2 + Math.floor(rng() * (TILE - 5));
    c.fillRect(x, 7.2, 1.4, 2.4);
    c.fillRect(TILE - 3 - Math.floor(rng() * (TILE - 6)), 20.4, 1.4, 2.4);
  }
  return tile;
}

/** Fills a rectangle with the woven tile, repeating from the canvas origin so every band stays in phase. */
function weave(ctx: CanvasRenderingContext2D, tile: HTMLCanvasElement, x: number, y: number, w: number, h: number): void {
  const pattern = ctx.createPattern(tile, "repeat");
  if (!pattern) return;
  ctx.fillStyle = pattern;
  ctx.fillRect(x, y, w, h);
}

/** The measurements the arch is drawn from, kept as their own step so the crossband can find the
 *  arch's edge without crossing it. */
interface ArchGeom {
  /** Centre x of the dome. */
  cx: number;
  /** Half the arch's width: half the content plus the side margin. */
  half: number;
  /** How far the dome rises above the shoulders. */
  rise: number;
  /** Shoulder height, where the dome meets the straight sides. */
  sY: number;
  /** The base line. */
  b: number;
}

/** Measures the arch around the content box: the content plus a side margin, a dome whose rise is
 *  bounded by the clear field above so it never touches the band, and a base that stops short of the
 *  bottom band. Null when the field is too tight to draw it. */
function archGeometry(box: Box, width: number, topInner: number, bottomTop: number): ArchGeom | null {
  const mX = Math.min(46, Math.max(24, width * 0.04));
  const half = (box.r - box.l) / 2 + mX;
  const rise = Math.min(half * 0.52, box.t - topInner - 16, 210);
  if (rise < 16) return null;
  const sY = box.t - 8;
  const b = Math.min(box.b + 30, bottomTop - 8);
  if (b - sY < 40) return null;
  return { cx: (box.l + box.r) / 2, half, rise, sY, b };
}

/** The arch's horizontal edge at a height, on the side the crossband approaches from. On the dome the
 *  edge follows the ellipse; on the straight sides and beyond them it is the side's x. */
function archEdgeX(g: ArchGeom, y: number, side: 1 | -1): number {
  if (y < g.sY) {
    const t = (g.sY - y) / g.rise;
    if (t < 1) return g.cx + side * g.half * Math.sqrt(1 - t * t);
  }
  return g.cx + side * g.half;
}

export const mount: Mount<BohemianHeroProps> = (host, initial = {}) => {
  let props: BohemianHeroProps = { ...defaults, ...initial };
  let dead = false;

  const sheet = scope(host);
  const attrs = hostAttributes(host);

  const typeEl = part("div", "type");
  const headlineEl = part("h1", "headline");
  const subheadEl = part("p", "subhead");
  typeEl.append(headlineEl, subheadEl);
  const actionsEl = part("div", "actions");
  host.append(typeEl, actionsEl);

  /** The page's own children, which the core never marks and never touches. */
  function pageChildren(): HTMLElement[] {
    const out: HTMLElement[] = [];
    for (const el of Array.from(host.children)) {
      if (el instanceof HTMLElement && !el.hasAttribute("data-pica")) out.push(el);
    }
    return out;
  }

  /** The calls to action sit in the first row after the page's children, whatever their count. */
  function applyRows(): void {
    actionsEl.style.gridRow = `${pageChildren().length + 2}`;
  }

  /** Writes a text part and hides it when it has nothing to say, so an empty prop leaves no empty element. */
  function renderText(): void {
    headlineEl.textContent = props.headline;
    headlineEl.hidden = props.headline.trim() === "";
    subheadEl.textContent = props.subhead;
    subheadEl.hidden = props.subhead.trim() === "";
    typeEl.hidden = headlineEl.hidden && subheadEl.hidden;
  }

  /** The union of everything the arch encloses: the type block, the calls to action, and the page's children. */
  function contentBox(): Box | null {
    let l = Infinity;
    let t = Infinity;
    let r = -Infinity;
    let b = -Infinity;
    for (const el of [typeEl, actionsEl, ...pageChildren()]) {
      if (el.offsetWidth === 0 && el.offsetHeight === 0) continue;
      l = Math.min(l, el.offsetLeft);
      t = Math.min(t, el.offsetTop);
      r = Math.max(r, el.offsetLeft + el.offsetWidth);
      b = Math.max(b, el.offsetTop + el.offsetHeight);
    }
    return r > l && b > t ? { l, t, r, b } : null;
  }

  sheet.setRules(rules(sheet.selector, props));
  renderText();
  renderActions(actionsEl, props.actions);
  applyRows();

  const under = layer(host, "under");
  const surface = createCanvas(under.el, { onResize: () => draw() });
  const ctx = surface.canvas.getContext("2d");
  const paletteWatch = watchPalette(host, () => draw());

  /** The arched boundary: an outer hairline, an inner hairline trimmed with scallops that point into the
   *  enclosure, a closed base with short feet, and one small bead at the apex. */
  function drawArch(g: ArchGeom, colors: Colors, k: number): void {
    if (!ctx) return;
    const { cx, half, rise, sY, b } = g;
    const l = cx - half;
    const r = cx + half;
    const arch = (hw: number, ry: number, ll: number, rr: number, bb: number): void => {
      ctx.beginPath();
      ctx.moveTo(ll, bb);
      ctx.lineTo(ll, sY);
      ctx.ellipse(cx, sY, hw, ry, 0, Math.PI, Math.PI * 2);
      ctx.lineTo(rr, bb);
      ctx.closePath();
    };
    ctx.strokeStyle = colors.muted;
    ctx.globalAlpha = 0.6 * k;
    arch(half, rise, l, r, b);
    ctx.stroke();
    const hw2 = half - ARCH_INSET;
    const ry2 = Math.max(9, rise - ARCH_INSET);
    const l2 = l + ARCH_INSET;
    const r2 = r - ARCH_INSET;
    const b2 = b - ARCH_INSET;
    ctx.strokeStyle = colors.fg;
    ctx.globalAlpha = 0.4 * k;
    arch(hw2, ry2, l2, r2, b2);
    ctx.stroke();
    ctx.strokeStyle = colors.muted;
    ctx.globalAlpha = 0.5 * k;
    const inwardX = cx;
    const inwardY = sY + (b2 - sY) * 0.4;
    const steps = Math.max(12, Math.round((Math.PI * (hw2 + ry2) * 0.5) / SCALLOP_STEP));
    for (let i = 1; i < steps; i++) {
      const th = (Math.PI * i) / steps;
      const px2 = cx + hw2 * Math.cos(th);
      const py2 = sY - ry2 * Math.sin(th);
      const nx = inwardX - px2;
      const ny = inwardY - py2;
      const nl = Math.hypot(nx, ny) || 1;
      const ang = Math.atan2(ny / nl, nx / nl);
      ctx.beginPath();
      ctx.arc(px2, py2, SCALLOP * 0.8, ang - Math.PI / 2, ang + Math.PI / 2);
      ctx.stroke();
    }
    ctx.fillStyle = colors.accent;
    ctx.globalAlpha = 0.85 * k;
    const ay = sY - rise;
    ctx.beginPath();
    ctx.moveTo(cx, ay - 4);
    ctx.lineTo(cx + 3, ay);
    ctx.lineTo(cx, ay + 4);
    ctx.lineTo(cx - 3, ay);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = colors.muted;
    ctx.globalAlpha = 0.6 * k;
    ctx.beginPath();
    ctx.moveTo(l - 9, Math.round(b) + 0.5);
    ctx.lineTo(l, Math.round(b) + 0.5);
    ctx.moveTo(r, Math.round(b) + 0.5);
    ctx.lineTo(r + 9, Math.round(b) + 0.5);
    ctx.stroke();
  }

  /** Repaints the whole drawing: the border bands, the fringe, the selvedge, the crossband tied between
   *  the selvedge and the arch, and the arch measured around the live layout. Every stroke stays inside
   *  the padding or the open field, so the motif never runs behind the prose. */
  function draw(): void {
    if (dead || !ctx) return;
    paletteWatch.refresh();
    const W = surface.cssWidth;
    const H = surface.cssHeight;
    if (W < 2 || H < 2) return;
    const narrow = W < MIN_WIDE;
    attrs.set("data-pica-fit", narrow ? "min" : null);
    const k = 0.35 + 0.65 * Math.min(1, Math.max(0, props.intensity));
    ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    const colors = paletteWatch.colors;
    const style = getComputedStyle(host);
    const padT = px(style.paddingTop);
    const padB = px(style.paddingBottom);
    const padL = px(style.paddingLeft);
    const padR = px(style.paddingRight);
    const topY = Math.max(5, (padT - BAND) / 2);
    const botY = H - padB + Math.max(5, (padB - BAND) / 2);
    const tile = makeTile(colors, props.seed, surface.dpr, k);
    const wide = !narrow;
    const right = props.align !== "end";

    if (props.bands) {
      weave(ctx, tile, 0, topY, W, BAND);
      ctx.strokeStyle = colors.muted;
      ctx.globalAlpha = 0.65 * k;
      hline(ctx, 0, topY - BAND_GAP, W);
      hline(ctx, 0, topY + BAND + BAND_GAP, W);
      ctx.globalAlpha = 0.5 * k;
      for (let x = 6; x + SCALLOP < W - 4; x += SCALLOP_STEP) {
        ctx.beginPath();
        ctx.arc(x, topY + BAND + BAND_GAP + 0.5, SCALLOP, 0, Math.PI);
        ctx.stroke();
      }
      weave(ctx, tile, 0, botY, W, BAND);
      ctx.globalAlpha = 0.65 * k;
      hline(ctx, 0, botY - BAND_GAP, W);
      hline(ctx, 0, botY + BAND + BAND_GAP, W);
      const fringe = createRng(hashSeed(props.seed, 33));
      ctx.globalAlpha = 0.5 * k;
      for (let x = 5; x < W - 3; x += 9) {
        if (fringe() < 0.22) continue;
        const len = 6 + fringe() * 6;
        const slant = (fringe() - 0.5) * 5;
        ctx.beginPath();
        ctx.moveTo(x, botY + BAND + BAND_GAP + 0.5);
        ctx.lineTo(x + slant, Math.min(botY + BAND + BAND_GAP + len, H - 3));
        ctx.stroke();
      }
      if (wide) {
        const xc = right ? W - padR / 2 : padL / 2;
        const y0 = topY + BAND + 7;
        const len = botY - 7 - y0;
        if (len > 60) {
          ctx.save();
          ctx.translate(xc, y0);
          ctx.rotate(Math.PI / 2);
          const pattern = ctx.createPattern(tile, "repeat");
          if (pattern) {
            ctx.fillStyle = pattern;
            ctx.fillRect(0, -RUNNER / 2, len, RUNNER);
          }
          ctx.restore();
          ctx.strokeStyle = colors.muted;
          ctx.globalAlpha = 0.6 * k;
          vline(ctx, xc - RUNNER / 2 - BAND_GAP, y0, y0 + len);
          vline(ctx, xc + RUNNER / 2 + BAND_GAP, y0, y0 + len);
        }
      }
    }

    const box = props.arch ? contentBox() : null;
    const topInner = props.bands ? topY + BAND + BAND_GAP + SCALLOP : 6;
    const bottomTop = props.bands ? botY - BAND_GAP : H;
    const geom = box ? archGeometry(box, W, topInner, bottomTop) : null;
    if (geom) drawArch(geom, colors, k);

    // The crossband: one tile of the same weave carried across the open field at its middle, built like
    // the top band with bounding hairlines and a scalloped lower edge. It joins the selvedge's inner
    // hairline on one end and stops a thread's width short of the arch on the other, where loose warp
    // ends reach toward the curve, so it reads as strung between the two rather than placed between them.
    if (props.bands && wide && geom) {
      const xc = right ? W - padR / 2 : padL / 2;
      const selIn = right ? xc - RUNNER / 2 - BAND_GAP : xc + RUNNER / 2 + BAND_GAP;
      const tapeT = Math.round((topY + BAND + botY - TILE) / 2);
      const edge = archEdgeX(geom, tapeT + TILE / 2, right ? 1 : -1);
      const lo = right ? edge + 11 : selIn;
      const hi = right ? selIn : edge - 11;
      if (hi - lo > 120) {
        weave(ctx, tile, lo, tapeT, hi - lo, TILE);
        ctx.strokeStyle = colors.muted;
        ctx.globalAlpha = 0.65 * k;
        hline(ctx, lo, tapeT - BAND_GAP, hi);
        hline(ctx, lo, tapeT + TILE + BAND_GAP, hi);
        ctx.globalAlpha = 0.5 * k;
        for (let x = lo + 6; x + SCALLOP < hi - 4; x += SCALLOP_STEP) {
          ctx.beginPath();
          ctx.arc(x, tapeT + TILE + BAND_GAP + 0.5, SCALLOP, 0, Math.PI);
          ctx.stroke();
        }
        const fray = createRng(hashSeed(props.seed, 55));
        ctx.strokeStyle = colors.fg;
        ctx.globalAlpha = 0.5 * k;
        const endX = right ? lo : hi;
        const dir = right ? -1 : 1;
        for (let y = tapeT + 4; y < tapeT + TILE - 3; y += 5.5) {
          if (fray() < 0.3) continue;
          const len = 3 + fray() * 7;
          ctx.beginPath();
          ctx.moveTo(endX, Math.round(y) + 0.5);
          ctx.lineTo(endX + dir * len, Math.round(y + (fray() - 0.5) * 3) + 0.5);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  draw();
  host.dataset.picaReady = "true";

  const mutator = typeof MutationObserver === "function" ? new MutationObserver(() => {
    applyRows();
    draw();
  }) : null;
  mutator?.observe(host, { childList: true, subtree: true, characterData: true });
  if (document.fonts?.ready) void document.fonts.ready.then(() => draw());

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (before.headline !== props.headline || before.subhead !== props.subhead) renderText();
      if (!sameJson(before.actions, props.actions)) renderActions(actionsEl, props.actions);
      if (before.align !== props.align || before.minHeight !== props.minHeight) sheet.setRules(rules(sheet.selector, props));
      applyRows();
      draw();
    },
    destroy() {
      dead = true;
      mutator?.disconnect();
      paletteWatch.destroy();
      surface.destroy();
      under.remove();
      typeEl.remove();
      actionsEl.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};
