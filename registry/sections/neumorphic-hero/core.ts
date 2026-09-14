import { parseColor, relativeLuminance } from "../../../lib/color";
import { blueNoiseMatrix, maskAt } from "../../../lib/dither-mask";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, layer, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar, watchPalette } from "../../../lib/palette";
import { hashSeed } from "../../../lib/rng";
import type { Mount } from "../../../lib/types";

/** One call to action: a link's visible text and destination. */
export interface NeumorphicHeroAction {
  /** Text on the link. */
  label: string;
  /** Where the link points. */
  href: string;
}

/** One fact on a satellite tile: a caption and the figure it captions. */
export interface NeumorphicHeroFact {
  /** What the figure measures, drawn small in mono capitals. */
  label: string;
  /** The figure itself, drawn large in mono. */
  value: string;
}

export interface NeumorphicHeroProps {
  /** The headline, set large on the raised slab. Empty hides it. */
  headline: string;
  /** Supporting copy under the headline, in the muted token. Empty hides it. */
  subhead: string;
  /** Calls to action, drawn as links in source order. The first presses into the slab, the rest rise from it. At most three show. */
  actions: readonly NeumorphicHeroAction[];
  /** Facts for the stat tiles standing beside the slab, each a mono label and a figure in source order. At most three show; empty draws no rail. */
  facts: readonly NeumorphicHeroFact[];
  /** Horizontal alignment of the content column within the host. */
  align: "start" | "center";
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
  /** How much ink the screened tone steps lay down, from 0 (a bare hairline) to 1. */
  depth: number;
  /** Shifts the dither screen's placement, so two instances need not share a grain. */
  seed: number;
}

export const defaults: NeumorphicHeroProps = {
  headline: "Raised out of the same ground.",
  subhead:
    "A soft UI hero whose relief is screened, not blurred: each edge is two dithered tone steps, and every face keeps the ground color.",
  actions: [
    { label: "Browse components", href: "#components" },
    { label: "Read the docs", href: "#docs" },
  ],
  facts: [
    { label: "Tone steps", value: "2" },
    { label: "Screen", value: "32 × 32" },
    { label: "Blur", value: "0 px" },
  ],
  align: "start",
  minHeight: 60,
  depth: 0.8,
  seed: 1,
};

/** One ink as RGBA bytes, taken from the palette or from the extreme away from it. */
type BevelInk = readonly [number, number, number, number];

/** A rectangle in canvas pixels, edges included on the left and top and excluded on the right and bottom. */
interface SlabBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Cell count of the dispersed screen, from lib/dither-mask.ts. */
const SCREEN = 32;
/** Width of the stronger tone step next to the edge line, in pixels. */
const BEVEL_NEAR = 4;
/** Width of the fainter step beyond it, in pixels. */
const BEVEL_FAR = 6;
/** Reach of the whole bevel past an element's edge: the one pixel line plus both tone steps. */
const BEVEL_REACH = 1 + BEVEL_NEAR + BEVEL_FAR;
/** Ink coverage of the two steps before depth scales them. */
const NEAR_INK = 0.62;
const FAR_INK = 0.3;
/** The most calls to action the row will draw. */
const MAX_ACTIONS = 3;
/** The most stat tiles the rail will draw. */
const MAX_FACTS = 3;
/** The least interior padding the slab keeps between its edge and the copy, in pixels. */
const MIN_PAD = 8;
/** Clear ground between neighbouring reliefs, in pixels. Closer than this and two bevels merge into one edge. */
const CLEAR = 14;
/** Below this host width, in pixels, the rail stacks under the copy as a row of stat chips. */
const COLLAPSE = 720;

/** Keeps minHeight inside a sane range even if a caller passes something outside 0 to 100. */
function vh(minHeight: number): number {
  return Math.min(100, Math.max(0, minHeight));
}

/** The least ground the frame keeps around the slab, in pixels. It never falls below the bevel's reach
 *  plus a clear strip, so no tone step crowds the canvas edge and the relief reads on every side. */
function frameMargin(w: number): number {
  return Math.round(Math.min(56, Math.max(BEVEL_REACH + 11, w * 0.045)));
}

/** Interior padding between the copy and the slab's edge, in pixels. It gives way before the frame
 *  margin does, so the bevel always has ground to read against. */
function slabPad(w: number): number {
  return Math.round(Math.min(40, Math.max(20, w * 0.03)));
}

/** Layout for the host and the links and stat tiles it draws around. The host is a grid: the page's
 *  children and the core's parts share the first column, and the rail of tiles takes a second column
 *  sized to them, so the slab can hug the copy while the rail stands on the bare ground beside it. On
 *  a narrow host the rail folds back into the first column as a row of chips. The canvas under it all
 *  draws the slab and every bevel around whatever the grid measures. The minimum height sits in a
 *  :where() rule, which carries no specificity, so a page that gives this host a height still wins.
 *  The links and tiles keep transparent faces and no border, because the bevel is the affordance and a
 *  painted face would stop being the ground. Mono belongs to the tiles' labels and figures; the prose
 *  keeps the page's own face. */
function rules(selector: string, p: NeumorphicHeroProps): string {
  const s = selector;
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  const edge = p.align === "center" ? "center" : "start";
  const flexEdge = p.align === "center" ? "center" : "flex-start";
  const textAlign = p.align === "center" ? "center" : "start";
  return [
    `:where(${s}){min-height:${vh(p.minHeight)}vh}`,
    `${s}{position:relative;box-sizing:border-box;display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:clamp(3rem,4vw,3.5rem);row-gap:clamp(0.8rem,2vh,1.3rem);align-content:safe center;justify-items:${edge};padding:clamp(2.5rem,8vh,5.5rem) clamp(2.25rem,7vw,6rem);color:${fg};text-align:${textAlign}}`,
    `${s}[data-pica-fit="min"]{grid-template-columns:minmax(0,1fr)}`,
    `${s} > :not([data-pica]){grid-column:1;min-width:0;max-width:min(44rem,100%);margin:0;text-align:${textAlign};overflow-wrap:break-word}`,
    `${s} > [data-pica-headline]{grid-column:1;min-width:0;max-width:min(44rem,100%);margin:0;font-size:clamp(2.3rem,6vw,4.75rem);line-height:1.04;font-weight:650;letter-spacing:-0.01em;text-align:${textAlign};overflow-wrap:break-word}`,
    `${s} > [data-pica-subhead]{grid-column:1;min-width:0;max-width:min(38rem,100%);margin:0;font-size:clamp(1rem,1.4vw,1.2rem);line-height:1.55;color:${muted};text-align:${textAlign};overflow-wrap:break-word}`,
    `${s} > [data-pica-actions]{grid-column:1;min-width:0;display:flex;flex-wrap:wrap;align-items:center;gap:2em;max-width:min(44rem,100%);margin-top:clamp(0.4rem,2vh,1.2rem);justify-content:${flexEdge}}`,
    `${s} > [data-pica-actions]:empty{display:none}`,
    `${s} > [data-pica-actions] a{appearance:none;margin:0;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.7em 1.4em;display:inline-flex;align-items:center;border:0;border-radius:0;color:${fg};background:transparent;cursor:pointer}`,
    `${s} > [data-pica-actions] a:hover{text-decoration:underline;text-underline-offset:0.2em}`,
    `${s} > [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${s} > [data-pica-rail]{grid-column:2;align-self:stretch;display:flex;flex-direction:column;justify-content:center;gap:clamp(1.75rem,3.5vh,2.5rem);margin:0}`,
    `${s}[data-pica-fit="min"] > [data-pica-rail]{grid-column:1;flex-direction:row;flex-wrap:wrap;justify-content:${flexEdge};gap:2em;margin-top:1.4em;padding:0 0.5em}`,
    `${s} [data-pica-tile]{box-sizing:border-box;min-width:0;width:clamp(8.5rem,13vw,11rem);margin:0;padding:0.95em 1.05em;display:flex;flex-direction:column;gap:0.5em}`,
    `${s}[data-pica-fit="min"] [data-pica-tile]{width:auto}`,
    `${s} [data-pica-flabel]{font-family:${GRID_FONT};font-size:0.68em;letter-spacing:0.05em;text-transform:uppercase;color:${muted}}`,
    `${s} [data-pica-fvalue]{min-width:0;font-family:${GRID_FONT};font-size:clamp(1.15rem,1.8vw,1.5rem);font-variant-numeric:tabular-nums;color:${fg};overflow-wrap:break-word}`,
  ].join("\n");
}

export const mount: Mount<NeumorphicHeroProps> = (host, initial = {}) => {
  let props: NeumorphicHeroProps = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  // The canvas is the layer's own element, so it inherits the under layer's stacking: below the content,
  // above the page's ground, never answering the pointer. Its backing store stays at one device pixel per
  // CSS pixel so the dithered dots land exactly one screen pixel apart.
  const under = layer(host, "under", "canvas");
  const canvas = under.el as HTMLCanvasElement;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  const ctx = canvas.getContext("2d");
  let image: ImageData | null = null;

  /** Creates one element the core owns, marked for identification and restyling. */
  function part<K extends keyof HTMLElementTagNameMap>(tag: K, name: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    node.setAttribute(`data-pica-${name}`, "");
    return node;
  }

  const headlineEl = part("h1", "headline");
  const subheadEl = part("p", "subhead");
  const actionsEl = part("div", "actions");
  const railEl = part("div", "rail");
  // The parts sit ahead of the page's children, so the composition reads first and wrapped content flows
  // below it inside the same slab. The rail comes last: beside the copy on a wide frame, under it on a
  // narrow one.
  under.el.after(headlineEl, subheadEl, actionsEl);
  host.append(railEl);
  const parts: readonly HTMLElement[] = [headlineEl, subheadEl, actionsEl];

  /** Writes a text part and hides it when it has nothing to say, so an empty prop leaves no empty heading. */
  function renderText(el: HTMLElement, text: string): void {
    el.textContent = text;
    el.hidden = text.trim() === "";
  }

  /** Rebuilds the action links from JSON, at most three, in source order. */
  function renderActions(): void {
    actionsEl.replaceChildren();
    const list = Array.isArray(props.actions) ? props.actions : [];
    for (const action of list.slice(0, MAX_ACTIONS)) {
      const a = document.createElement("a");
      a.setAttribute("data-pica", "");
      a.href = typeof action?.href === "string" ? action.href : "#";
      a.textContent = typeof action?.label === "string" ? action.label : "";
      actionsEl.append(a);
    }
  }

  /** Rebuilds the rail's stat tiles from JSON, at most three, in source order. A fact with nothing to
   *  show draws no tile: an empty bevel is a hollow frame, not a stat. */
  function renderTiles(): void {
    railEl.replaceChildren();
    const list = Array.isArray(props.facts) ? props.facts : [];
    for (const fact of list.slice(0, MAX_FACTS)) {
      const label = typeof fact?.label === "string" ? fact.label.trim() : "";
      const value = typeof fact?.value === "string" ? fact.value.trim() : "";
      if (label === "" && value === "") continue;
      const tile = part("div", "tile");
      if (label !== "") {
        const flabel = part("div", "flabel");
        flabel.textContent = label;
        tile.append(flabel);
      }
      if (value !== "") {
        const fvalue = part("div", "fvalue");
        fvalue.textContent = value;
        tile.append(fvalue);
      }
      railEl.append(tile);
    }
    railEl.style.display = railEl.childElementCount > 0 ? "" : "none";
  }

  /** The rail's tiles, for measuring and observing. */
  function tileEls(): Element[] {
    return Array.from(railEl.children);
  }

  /** True when the rail folds back into the first column, where the slab wraps it as the panel's own
   *  stat strip. Set by applyLayout, read by contentRect. */
  let stacked = false;

  /** Recomputes which layout the frame takes and how many rows the rail spans. The rail stacks under the
   *  copy on a narrow host and stands beside it on a wide one, where it spans every row the first column
   *  holds so its tiles centre on the copy rather than on the frame. */
  function applyLayout(): void {
    stacked = host.clientWidth < COLLAPSE;
    const min = stacked;
    attrs.set("data-pica-fit", min ? "min" : null);
    let rows = 0;
    for (const el of Array.from(host.children)) {
      if (el.hasAttribute("data-pica")) {
        if (parts.includes(el as HTMLElement) && !(el as HTMLElement).hidden) rows++;
      } else rows++;
    }
    railEl.style.gridRow = min ? "" : `1 / span ${Math.max(1, rows)}`;
  }

  /** Sizes the backing store to the host at one pixel per CSS pixel. */
  function syncSize(): void {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  /** The slab's rect: the union of everything the first column holds — the page's children and the core's
   *  parts, and the rail too when it folds back under the copy — plus the slab's own padding, in canvas
   *  pixels relative to the host. The padding gives way before the frame's outer margin does, and the
   *  right edge gives way to a rail standing beside the copy, which needs clear ground between the two
   *  reliefs. Null when the column is empty. */
  function contentRect(): SlabBox | null {
    const box = host.getBoundingClientRect();
    let x0 = Number.POSITIVE_INFINITY;
    let y0 = Number.POSITIVE_INFINITY;
    let x1 = Number.NEGATIVE_INFINITY;
    let y1 = Number.NEGATIVE_INFINITY;
    const take = (el: Element): void => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      x0 = Math.min(x0, r.left);
      y0 = Math.min(y0, r.top);
      x1 = Math.max(x1, r.right);
      y1 = Math.max(y1, r.bottom);
    };
    for (const el of Array.from(host.children)) if (!el.hasAttribute("data-pica")) take(el);
    for (const el of parts) take(el);
    if (stacked) take(railEl);
    if (x1 <= x0 || y1 <= y0) return null;
    const cx0 = x0 - box.left;
    const cy0 = y0 - box.top;
    const cx1 = x1 - box.left;
    const cy1 = y1 - box.top;
    const margin = frameMargin(box.width);
    const pad = slabPad(box.width);
    let right = box.width - margin;
    if (!stacked) {
      for (const tile of tileEls()) {
        const r = tile.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        if (r.top - box.top < cy1 && r.bottom - box.top > cy0) {
          right = Math.min(right, r.left - box.left - 2 * BEVEL_REACH - CLEAR);
        }
      }
    }
    return {
      x0: Math.max(0, Math.min(Math.max(margin, cx0 - pad), cx0 - MIN_PAD)),
      y0: Math.max(0, Math.min(Math.max(margin, cy0 - pad), cy0 - MIN_PAD)),
      x1: Math.min(box.width, Math.max(Math.min(right, cx1 + pad), cx1 + MIN_PAD)),
      y1: Math.min(box.height, Math.max(Math.min(box.height - margin, cy1 + pad), cy1 + MIN_PAD)),
    };
  }

  function draw(): void {
    syncSize();
    const w = canvas.width;
    const h = canvas.height;
    if (!ctx || w < 1 || h < 1) return;
    if (!image || image.width !== w || image.height !== h) image = ctx.createImageData(w, h);
    else image.data.fill(0);
    const data = image.data;
    const fg = parseColor(palette.colors.fg);
    const bg = parseColor(palette.colors.bg);
    // The lit edges take ink toward the page's foreground and the shaded edges take the extreme away from
    // it: black under a dark ground, white under a light one. A pressed element swaps the two. The tone is
    // read here rather than through hostTone, which walks the tree with a probe this MutationObserver would
    // hear.
    const fgLum = relativeLuminance(palette.colors.fg);
    let bgLum = 1;
    for (let el: HTMLElement | null = host; el; el = el.parentElement) {
      const background = getComputedStyle(el).backgroundColor;
      if (parseColor(background)[3] > 0) {
        bgLum = relativeLuminance(background);
        break;
      }
    }
    const dark = fgLum > bgLum;
    const lit: BevelInk = dark ? fg : [255, 255, 255, 255];
    const shade: BevelInk = dark ? [0, 0, 0, 255] : fg;
    const mask = blueNoiseMatrix(SCREEN);
    const ox = hashSeed(props.seed, 3) % SCREEN;
    const oy = hashSeed(props.seed, 5) % SCREEN;
    const depth = Math.min(1, Math.max(0, props.depth));
    const near = NEAR_INK * depth;
    const far = FAR_INK * depth;

    /** Fills one band of the ring around an element: the row next to the face solid, the next few pixels
     *  at the stronger coverage, the rest at the weaker. `dist` gives a pixel's distance out from the
     *  face's edge, so the tone steps fall away with it rather than sitting flat. */
    function ring(xa: number, ya: number, xb: number, yb: number, ink: BevelInk, dist: (x: number, y: number) => number): void {
      const xA = Math.max(0, Math.round(xa));
      const yA = Math.max(0, Math.round(ya));
      const xB = Math.min(w, Math.round(xb));
      const yB = Math.min(h, Math.round(yb));
      const [r, g, b, a] = ink;
      for (let y = yA; y < yB; y++) {
        for (let x = xA; x < xB; x++) {
          const d = dist(x, y);
          const cover = d <= 1 ? 1 : d <= 1 + BEVEL_NEAR ? near : far;
          if (cover < 1 && maskAt(mask, SCREEN, x + ox, y + oy) >= cover) continue;
          const i = (y * w + x) * 4;
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = a;
        }
      }
    }

    /** Fills an element's face with the ground color. An unset bg token leaves the face transparent, which
     *  is the same thing: the page's own ground shows through either way. */
    function face(x0: number, y0: number, x1: number, y1: number): void {
      const [r, g, b, a] = bg;
      if (a === 0) return;
      const xA = Math.max(0, Math.round(x0));
      const yA = Math.max(0, Math.round(y0));
      const xB = Math.min(w, Math.round(x1));
      const yB = Math.min(h, Math.round(y1));
      for (let y = yA; y < yB; y++) {
        for (let x = xA; x < xB; x++) {
          const i = (y * w + x) * 4;
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = a;
        }
      }
    }

    /** Draws the screened bevel around a rect: the solid edge line and two tone steps along the top and left
     *  in `tl`, mirrored along the bottom and right in `br`. The top and bottom bands take their corner
     *  squares, so light wraps the whole top of a raised element. Raised draws the ring on the ground just
     *  outside the face; pressed draws the same ring inverted on the face itself, which is what reads as
     *  pushed in rather than lifted. */
    function bevel(x0: number, y0: number, x1: number, y1: number, tl: BevelInk, br: BevelInk, inset: boolean): void {
      if (inset) {
        ring(x0, y0, x1, y0 + BEVEL_REACH, tl, (_x, y) => y - y0 + 1);
        ring(x0, y1 - BEVEL_REACH, x1, y1, br, (_x, y) => y1 - y);
        ring(x0, y0 + BEVEL_REACH, x0 + BEVEL_REACH, y1 - BEVEL_REACH, tl, (x) => x - x0 + 1);
        ring(x1 - BEVEL_REACH, y0 + BEVEL_REACH, x1, y1 - BEVEL_REACH, br, (x) => x1 - x);
        return;
      }
      ring(x0 - BEVEL_REACH, y0 - BEVEL_REACH, x1 + BEVEL_REACH, y0, tl, (_x, y) => y0 - y);
      ring(x0 - BEVEL_REACH, y1, x1 + BEVEL_REACH, y1 + BEVEL_REACH, br, (_x, y) => y - y1 + 1);
      ring(x0 - BEVEL_REACH, y0, x0, y1, tl, (x) => x0 - x);
      ring(x1, y0, x1 + BEVEL_REACH, y1, br, (x) => x - x1 + 1);
    }

    /** One extruded rect measured from a live element: the face fills with the ground, then the raised
     *  ring goes around it. */
    const raised = (el: Element): void => {
      const box = host.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      const x0 = Math.round(r.left - box.left);
      const y0 = Math.round(r.top - box.top);
      const x1 = Math.round(r.right - box.left);
      const y1 = Math.round(r.bottom - box.top);
      face(x0, y0, x1, y1);
      bevel(x0, y0, x1, y1, lit, shade, false);
    };

    const slab = contentRect();
    if (slab) {
      face(slab.x0, slab.y0, slab.x1, slab.y1);
      bevel(slab.x0, slab.y0, slab.x1, slab.y1, lit, shade, false);
    }
    for (const tile of tileEls()) raised(tile);
    const box = host.getBoundingClientRect();
    for (const [index, a] of actionsEl.querySelectorAll("a").entries()) {
      const r = a.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      const x0 = Math.round(r.left - box.left);
      const y0 = Math.round(r.top - box.top);
      const x1 = Math.round(r.right - box.left);
      const y1 = Math.round(r.bottom - box.top);
      face(x0, y0, x1, y1);
      if (index === 0) bevel(x0, y0, x1, y1, shade, lit, true);
      else bevel(x0, y0, x1, y1, lit, shade, false);
    }
    ctx.putImageData(image, 0, 0);
  }

  const palette = watchPalette(host, draw);

  // Reflow lands here from three directions: the host itself, any content element's own box, and children
  // the page swaps out entirely. Each one ends at a redraw; only a swapped child needs the watch set rebuilt.
  const resize = new ResizeObserver(() => {
    applyLayout();
    draw();
  });
  function observe(): void {
    resize.disconnect();
    resize.observe(host);
    for (const el of Array.from(host.children)) if (!el.hasAttribute("data-pica")) resize.observe(el);
    for (const el of parts) resize.observe(el);
    for (const tile of tileEls()) resize.observe(tile);
    for (const a of actionsEl.querySelectorAll("a")) resize.observe(a);
  }
  // Only a child the page added or removed counts. The core's own nodes are marked, and skipping them is
  // what keeps an observer that redraws on mutation from answering its own work forever.
  const mutations = new MutationObserver((list) => {
    for (const record of list) {
      const nodes = [...record.addedNodes, ...record.removedNodes];
      if (nodes.some((node) => !(node instanceof Element) || !node.hasAttribute("data-pica"))) {
        observe();
        applyLayout();
        draw();
        return;
      }
    }
  });

  sheet.setRules(rules(sheet.selector, props));
  renderText(headlineEl, props.headline);
  renderText(subheadEl, props.subhead);
  renderActions();
  renderTiles();
  applyLayout();
  draw();
  observe();
  mutations.observe(host, { childList: true });
  host.dataset.picaReady = "true";

  let dead = false;
  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      palette.refresh();
      if (before.align !== props.align || before.minHeight !== props.minHeight) {
        sheet.setRules(rules(sheet.selector, props));
      }
      if (before.headline !== props.headline) renderText(headlineEl, props.headline);
      if (before.subhead !== props.subhead) renderText(subheadEl, props.subhead);
      if (!sameJson(before.actions, props.actions)) renderActions();
      if (!sameJson(before.facts, props.facts)) renderTiles();
      observe();
      applyLayout();
      draw();
    },
    destroy() {
      if (dead) return;
      dead = true;
      mutations.disconnect();
      resize.disconnect();
      palette.destroy();
      headlineEl.remove();
      subheadEl.remove();
      actionsEl.remove();
      railEl.remove();
      under.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};
