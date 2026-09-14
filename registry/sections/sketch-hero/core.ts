import * as ditherCrosshatchImage from "../../dither/dither-crosshatch-image/core";
import { createCanvas } from "../../../lib/canvas";
import { GRID_FONT } from "../../../lib/font";
import { layer, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { createLoop } from "../../../lib/loop";
import { cssOn, cssVar, watchPalette } from "../../../lib/palette";
import { createRng, hashSeed } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

/** One call to action: a link's visible text and destination. */
export interface SketchHeroAction {
  /** Text on the link. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface SketchHeroProps extends MotionProps {
  /** The headline, set large in the page's own font. Empty hides it. */
  headline: string;
  /** Supporting copy under the headline, in the muted color. Empty hides it. */
  subhead: string;
  /** Calls to action, drawn as links in source order. At most three: the first draws solid, the rest outline. */
  actions: readonly SketchHeroAction[];
  /** Horizontal alignment of the content column within the host. */
  align: "start" | "center";
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
  /** Image URL or data URI for the figure, hatched by a composed crosshatch image. Empty draws a built-in sphere study. */
  src: string;
  /** Text alternative for the figure image. Empty marks it decorative. */
  alt: string;
  /** How the figure image fits its square: "cover" fills and crops, "contain" fits whole. */
  fit: "cover" | "contain";
  /** How densely the hatching is worked, from 0 open to 1 tight. */
  density: number;
}

export const defaults: SketchHeroProps = {
  headline: "Still being drawn.",
  subhead: "Hatched fills, overshot construction lines, and notes in a working hand, behind the page's own content.",
  actions: [
    { label: "See the method", href: "#method" },
    { label: "All components", href: "#components" },
  ],
  align: "start",
  minHeight: 72,
  src: "",
  alt: "",
  fit: "cover",
  density: 0.5,
  paused: false,
  time: null,
  seed: 1,
};

/** Animation time shown under reduced motion, in milliseconds. */
const STILL_TIME = 1200;
/** Milliseconds one drawing of the sketch holds before the lines jump to a fresh jitter, the boil that keeps
 *  them feeling drawn rather than plotted. */
const BOIL_MS = 140;
/** The deepest a jittered vertex strays from where a straightedge would put it, in CSS pixels. */
const JITTER = 1.1;
/** Frames per second the boil runs at: one fresh drawing a step, slow enough to read as a hand at work. */
const BOIL_FPS = 7;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** A seeded jitter stream for one sketch element at one boil frame, so the same seed and animation time
 *  always draw the same sketch. */
function elementRng(seed: number, boil: number, index: number): () => number {
  return createRng(hashSeed(seed, boil, index));
}

/** One working stroke between two points: subdivided, with every vertex nudged a pixel or so off its true
 *  position, so the line reads as drawn by a hand rather than plotted. */
function stroke(
  c: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rng: () => number,
  amp = JITTER,
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const steps = Math.max(2, Math.round(len / 18));
  c.beginPath();
  for (let i = 0; i <= steps; i++) {
    const p = i / steps;
    const off = (rng() * 2 - 1) * amp;
    const along = (rng() * 2 - 1) * amp * 0.7;
    const x = x1 + dx * p + nx * off + (dx / len) * along;
    const y = y1 + dy * p + ny * off + (dy / len) * along;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.stroke();
}

/** An ellipse traced as a jittered polyline, in full or in part for a restated arc. */
function trace(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rng: () => number,
  amp: number,
  a0 = 0,
  a1 = Math.PI * 2,
): void {
  const span = a1 - a0;
  const steps = Math.max(16, Math.round((Math.max(rx, ry) * Math.abs(span)) / 9));
  c.beginPath();
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (span * i) / steps;
    const x = cx + Math.cos(a) * rx + (rng() * 2 - 1) * amp;
    const y = cy + Math.sin(a) * ry + (rng() * 2 - 1) * amp;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.stroke();
}

interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Hatching by the same method as dither-crosshatch-image: strokes march across the region at one angle,
 *  each on a wobble of its own, and the pen lifts wherever the tone under it falls short of the layer's
 *  threshold, so density carries tone. */
function hatch(
  c: CanvasRenderingContext2D,
  angleDeg: number,
  spacing: number,
  bounds: Bounds,
  on: (x: number, y: number) => boolean,
  rng: () => number,
  amp: number,
): void {
  const angle = (angleDeg * Math.PI) / 180;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  let uMin = Infinity;
  let uMax = -Infinity;
  let vMin = Infinity;
  let vMax = -Infinity;
  const corners: readonly (readonly [number, number])[] = [
    [bounds.x0, bounds.y0],
    [bounds.x1, bounds.y0],
    [bounds.x0, bounds.y1],
    [bounds.x1, bounds.y1],
  ];
  for (const [px, py] of corners) {
    const u = px * ca + py * sa;
    const v = -px * sa + py * ca;
    if (u < uMin) uMin = u;
    if (u > uMax) uMax = u;
    if (v < vMin) vMin = v;
    if (v > vMax) vMax = v;
  }
  const step = Math.max(1.5, spacing / 3);
  c.beginPath();
  for (let k = Math.floor(vMin / spacing) - 1; k <= Math.ceil(vMax / spacing) + 1; k++) {
    const freq = 0.006 + rng() * 0.014;
    const phase = rng() * Math.PI * 2;
    const wob = amp * spacing * 0.22;
    let drawing = false;
    for (let u = uMin; u <= uMax + step; u += step) {
      const v = k * spacing + Math.sin(u * freq + phase) * wob;
      const x = u * ca - v * sa + (rng() * 2 - 1) * amp * 0.5;
      const y = u * sa + v * ca + (rng() * 2 - 1) * amp * 0.5;
      if (x >= bounds.x0 && x <= bounds.x1 && y >= bounds.y0 && y <= bounds.y1 && on(x, y)) {
        if (drawing) c.lineTo(x, y);
        else {
          c.moveTo(x, y);
          drawing = true;
        }
      } else {
        drawing = false;
      }
    }
  }
  c.stroke();
}

/** One small annotation in the working hand, jittered like everything else. */
function text(c: CanvasRenderingContext2D, s: string, x: number, y: number, rng: () => number): void {
  c.fillText(s, x + (rng() - 0.5) * 0.9, y + (rng() - 0.5) * 0.9);
}

/** A note and its leader rule to the thing it names, ended in a small open mark. */
function note(
  c: CanvasRenderingContext2D,
  s: string,
  lx: number,
  ly: number,
  tx: number,
  ty: number,
  rng: () => number,
): void {
  c.globalAlpha = 0.7;
  stroke(c, lx - 5, ly - 3, tx, ty, rng, 0.5);
  trace(c, tx, ty, 1.8, 1.8, rng, 0.25);
  c.globalAlpha = 1;
  text(c, s, lx, ly, rng);
}

/** Keeps minHeight inside a sane range even if a caller passes something outside 0 to 100. */
function vh(minHeight: number): number {
  return Math.min(100, Math.max(0, minHeight));
}

/** Layout for the host and the grammar for its calls to action. Prose keeps the page's font; mono stays on
 *  the canvas with the annotations. The solid link paints its background from currentColor, so the fg
 *  fallback resolves to the link's own color, and its label span inverts it back to a readable ink. The
 *  minimum height goes in a :where() rule, which carries no specificity at all, so a page that gives this
 *  host a height of its own wins. */
function rules(s: string, p: SketchHeroProps): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  const onFg = cssOn("fg");
  const center = p.align === "center";
  const edge = center ? "center" : "flex-start";
  const textAlign = center ? "center" : "start";
  const tint = `color-mix(in srgb, ${fg} 10%, transparent)`;
  return [
    `:where(${s}){min-height:${vh(p.minHeight)}vh}`,
    `${s}{box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:${edge};gap:0.9em;padding:clamp(1.5rem,6vw,5rem);color:${fg};text-align:${textAlign}}`,
    `${s} > :not([data-pica]){margin-block:0;text-align:${textAlign}}`,
    `${s} > :not([data-pica]):not(:is(h1,h2,h3)){max-width:44rem}`,
    `${s} > p:not([data-pica]){color:${muted}}`,
    `${s} > :is(h1,h2,h3){margin-block:0;max-width:14em;font-size:clamp(2.4rem,6vw,4.6rem);line-height:1.05;font-weight:600;letter-spacing:-0.02em;color:${fg};text-wrap:balance;overflow-wrap:break-word}`,
    `${s} > :is(h1,h2,h3):empty{display:none}`,
    `${s} > [data-pica-subhead]{margin-block:0;max-width:52ch;font-size:clamp(1rem,1.4vw,1.15rem);line-height:1.55;color:${muted};overflow-wrap:break-word}`,
    `${s} > [data-pica-subhead]:empty{display:none}`,
    `${s} > [data-pica-actions]{display:flex;flex-wrap:wrap;align-items:center;gap:0.75em;margin-top:0.8em;justify-content:${edge}}`,
    `${s} > [data-pica-actions]:empty{display:none}`,
    `${s} > [data-pica-actions] a{appearance:none;margin:0;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.65em 1.3em;display:inline-flex;align-items:center;border:1px solid ${muted};border-radius:0;color:${fg};background:transparent;cursor:pointer}`,
    `${s} > [data-pica-actions] a[data-variant="solid"]{background:currentColor;color:${fg};border-color:transparent}`,
    `${s} > [data-pica-actions] a[data-variant="solid"] > [data-pica-label]{color:${onFg}}`,
    `${s} > [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${fg} 86%, transparent)}`,
    `${s} > [data-pica-actions] a[data-variant="outline"]:hover{background:${tint};border-color:${fg}}`,
    `${s} > [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
  ].join("\n");
}

export const mount: Mount<SketchHeroProps> = (host, initial = {}) => {
  let props: SketchHeroProps = { ...defaults, ...initial };
  const sheet = scope(host);
  const under = layer(host, "under");

  // The bounded host the composed figure mounts into when src is set. The sketch canvas covers the whole
  // under layer on top of it, so the construction lines and notes draw over the image the way they would
  // over any figure on the page.
  const figure = document.createElement("div");
  figure.setAttribute("data-pica", "");
  figure.style.cssText = "position:absolute;display:none";
  under.el.append(figure);

  let w = 1;
  let h = 1;
  let m = 24;
  let cx = 0;
  let cy = 0;
  let radius = 60;

  function layout(): void {
    w = Math.max(1, surface.cssWidth);
    h = Math.max(1, surface.cssHeight);
    m = clamp(Math.min(w, h) * 0.05, 18, 44);
    const wide = w >= 700;
    // On a phone the content column fills the width, so the study shrinks and drops into the lower corner,
    // clear of the calls to action. On a wide page it holds the right hand side at full size.
    radius = clamp(Math.min(w, h) * (wide ? 0.16 : 0.13), 34, 150);
    cx = wide ? w * 0.7 : w * 0.68;
    cy = wide ? h * 0.52 : h * 0.76;
    cx = clamp(cx, m + radius + 6, w - m - radius - 6);
    cy = clamp(cy, m + radius + 6, h - m - radius * 1.5);
    figure.style.left = `${cx - radius}px`;
    figure.style.top = `${cy - radius}px`;
    figure.style.width = `${radius * 2}px`;
    figure.style.height = `${radius * 2}px`;
  }

  const surface = createCanvas(under.el, {
    onResize: () => {
      layout();
      loop.redraw();
    },
  });
  const ctx = surface.canvas.getContext("2d");
  const palette = watchPalette(host, () => loop.redraw());

  const headlineEl = document.createElement("h1");
  headlineEl.setAttribute("data-pica", "");
  const subheadEl = document.createElement("p");
  subheadEl.setAttribute("data-pica", "");
  subheadEl.setAttribute("data-pica-subhead", "");
  const actionsEl = document.createElement("div");
  actionsEl.setAttribute("data-pica", "");
  actionsEl.setAttribute("data-pica-actions", "");
  host.append(headlineEl, subheadEl, actionsEl);

  let child: ReturnType<typeof ditherCrosshatchImage.mount> | null = null;

  /** Props forwarded to the composed figure: its own seed, its own jitter, and a stroke spacing that follows
   *  this section's density so the two hatches agree. */
  function figureProps(): Partial<typeof ditherCrosshatchImage.defaults> {
    return {
      src: props.src,
      alt: props.alt,
      fit: props.fit,
      seed: props.seed,
      spacing: 10.5 - clamp(props.density, 0, 1) * 5,
      jitter: 0.45,
      layers: 3,
      contrast: 1.05,
    };
  }

  /** Mounts, updates, or removes the figure as src comes and goes. */
  function renderFigure(): void {
    if (props.src.trim() !== "") {
      figure.style.display = "";
      if (child) child.update(figureProps());
      else child = ditherCrosshatchImage.mount(figure, figureProps());
    } else {
      if (child) {
        child.destroy();
        child = null;
      }
      figure.style.display = "none";
    }
  }

  /** Rebuilds the action links from JSON: the first solid in the page's ink, the rest outline. */
  function renderActions(): void {
    actionsEl.replaceChildren();
    for (const [i, action] of props.actions.slice(0, 3).entries()) {
      const a = document.createElement("a");
      a.setAttribute("data-pica", "");
      a.href = action.href;
      if (i === 0) {
        a.dataset.variant = "solid";
        const label = document.createElement("span");
        label.setAttribute("data-pica", "");
        label.setAttribute("data-pica-label", "");
        label.textContent = action.label;
        a.append(label);
      } else {
        a.dataset.variant = "outline";
        a.textContent = action.label;
      }
      actionsEl.append(a);
    }
  }

  function draw(t: number): void {
    const c = ctx;
    if (!c || w < 8 || h < 8) {
      host.dataset.picaReady = "true";
      return;
    }
    const boil = Math.floor(Math.max(0, t) / BOIL_MS);
    const rng = (i: number): (() => number) => elementRng(props.seed, boil, i);
    const colors = palette.colors;
    const image = child !== null;
    const spacing = 9.5 - clamp(props.density, 0, 1) * 5;
    const skew = (rng(0)() - 0.5) * 6;
    let el = 1;
    const box: Bounds = { x0: cx - radius, y0: cy - radius, x1: cx + radius, y1: cy + radius };

    c.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    c.lineWidth = 1;
    c.lineCap = "round";
    c.lineJoin = "round";

    // The page frame, each edge carried past the corners it defines, with the top and left edges restated
    // once at a lower strength, the way a hand goes back over a line.
    const over = clamp(m * 0.7, 10, 26);
    c.strokeStyle = colors.muted;
    c.globalAlpha = 0.85;
    stroke(c, m - over, m, w - m + over, m, rng(el++));
    stroke(c, w - m, m - over, w - m, h - m + over, rng(el++));
    stroke(c, w - m + over, h - m, m - over, h - m, rng(el++));
    stroke(c, m, h - m + over, m, m - over, rng(el++));
    c.globalAlpha = 0.3;
    stroke(c, m - over * 0.6, m + 2.5, w - m + over * 0.6, m + 2.5, rng(el++));
    stroke(c, m + 2.5, h - m + over * 0.6, m + 2.5, m - over * 0.6, rng(el++));

    // The figure's construction: a bounding square overshot at its corners, the two centerlines, and one
    // diagonal sight line, all left visible.
    const ob = Math.min(18, radius * 0.18);
    c.globalAlpha = 0.55;
    stroke(c, box.x0 - ob, box.y0, box.x1 + ob, box.y0, rng(el++));
    stroke(c, box.x1, box.y0 - ob, box.x1, box.y1 + ob, rng(el++));
    stroke(c, box.x1 + ob, box.y1, box.x0 - ob, box.y1, rng(el++));
    stroke(c, box.x0, box.y1 + ob, box.x0, box.y0 - ob, rng(el++));
    c.globalAlpha = 0.4;
    stroke(c, cx, box.y0 - radius * 0.5, cx, box.y1 + radius * 0.5, rng(el++));
    stroke(c, box.x0 - radius * 0.5, cy, box.x1 + radius * 0.5, cy, rng(el++));
    stroke(c, box.x0 - radius * 0.25, box.y1 + radius * 0.25, box.x1 + radius * 0.25, box.y0 - radius * 0.25, rng(el++));

    if (!image) {
      // The study itself: a sphere lit from the upper left over a cast shadow, worked in two hatch angles
      // whose density carries the tone.
      const sx = cx + radius * 0.42;
      const sy = cy + radius * 1.18;
      const srx = radius * 1.02;
      const sry = radius * 0.26;
      const inSphere = (x: number, y: number): boolean => {
        const nx = (x - cx) / radius;
        const ny = (y - cy) / radius;
        return nx * nx + ny * ny <= 1;
      };
      const tone = (x: number, y: number): number => {
        const nx = (x - cx) / radius;
        const ny = (y - cy) / radius;
        return clamp(0.58 + nx * 0.46 + ny * 0.5, 0, 1);
      };
      const shadowBounds: Bounds = { x0: box.x0 - radius * 0.2, y0: box.y0, x1: box.x1 + radius * 0.5, y1: box.y1 + radius * 0.55 };
      c.strokeStyle = colors.fg;
      c.globalAlpha = 0.5;
      hatch(c, -38 + skew, spacing * 1.2, shadowBounds, (x, y) => {
        const ex = (x - sx) / srx;
        const ey = (y - sy) / sry;
        const e = ex * ex + ey * ey;
        return e <= 1 && 0.78 - e * 0.55 >= 0.4;
      }, rng(el++), 0.8);
      c.globalAlpha = 0.78;
      hatch(c, -38 + skew, spacing, box, (x, y) => inSphere(x, y) && tone(x, y) >= 0.4, rng(el++), 1);
      c.globalAlpha = 0.85;
      hatch(c, 52 + skew, spacing, box, (x, y) => inSphere(x, y) && tone(x, y) >= 0.66, rng(el++), 1);
      c.strokeStyle = colors.muted;
      c.globalAlpha = 0.55;
      trace(c, sx, sy, srx, sry, rng(el++), 0.8);
    }

    // The figure's outline, restated once partway around. It stays when an image mounts, as the
    // construction the image is being drawn into.
    c.strokeStyle = colors.fg;
    c.globalAlpha = 0.9;
    trace(c, cx, cy, radius * 0.98, radius * 0.98, rng(el++), 0.9);
    c.globalAlpha = 0.35;
    trace(c, cx, cy, radius * 1.015, radius * 1.015, rng(el++), 0.9, -0.5, Math.PI * 1.15);

    // The light's direction is the one accent, named in the working hand.
    const ax = cx - radius * 1.55;
    const ay = cy - radius * 1.38;
    const ax2 = cx - radius * 1.08;
    const ay2 = cy - radius * 0.9;
    c.strokeStyle = colors.accent;
    c.globalAlpha = 1;
    stroke(c, ax, ay, ax2, ay2, rng(el++), 0.8);
    const head = Math.atan2(ay2 - ay, ax2 - ax);
    const hl = Math.min(15, radius * 0.18);
    stroke(c, ax2, ay2, ax2 - Math.cos(head - 0.5) * hl, ay2 - Math.sin(head - 0.5) * hl, rng(el++), 0.4);
    stroke(c, ax2, ay2, ax2 - Math.cos(head + 0.5) * hl, ay2 - Math.sin(head + 0.5) * hl, rng(el++), 0.4);
    c.font = `10px ${GRID_FONT}`;
    c.fillStyle = colors.accent;
    text(c, "light", ax - 4, ay - 9, rng(el++));

    // The working notes, each in small mono with a leader rule to the thing it names.
    c.fillStyle = colors.muted;
    c.strokeStyle = colors.muted;
    const notes: readonly (readonly [string, number, number, number, number])[] = [
      ["fig.01", cx - radius * 0.35, box.y1 + radius * 0.66 + 12, cx - radius * 0.1, box.y1],
      ["tone", box.x1 + radius * 0.3, cy + radius * 0.75, cx + radius * 0.62, cy + radius * 0.62],
      ["edge", w - m - 40, m + 18, w - m - 2, m + 3],
    ];
    for (const [s, lx0, ly0, tx, ty] of notes) {
      const lx = clamp(lx0, m + 8, w - m - 8 - s.length * 6.5);
      const ly = clamp(ly0, m + 16, h - m - 6);
      note(c, s, lx, ly, tx, ty, rng(el++));
    }

    c.globalAlpha = 1;
    host.dataset.picaReady = "true";
  }

  layout();
  renderFigure();
  sheet.setRules(rules(sheet.selector, props));
  headlineEl.textContent = props.headline;
  subheadEl.textContent = props.subhead;
  renderActions();
  const loop = createLoop({ el: host, fps: BOIL_FPS, paused: props.paused, time: props.time, still: STILL_TIME, frame: draw });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.align !== before.align || props.minHeight !== before.minHeight) {
        sheet.setRules(rules(sheet.selector, props));
      }
      if (props.headline !== before.headline) headlineEl.textContent = props.headline;
      if (props.subhead !== before.subhead) subheadEl.textContent = props.subhead;
      if (!sameJson(before.actions, props.actions)) renderActions();
      palette.refresh();
      if (
        props.src !== before.src ||
        props.alt !== before.alt ||
        props.fit !== before.fit ||
        props.density !== before.density ||
        props.seed !== before.seed
      ) {
        renderFigure();
      }
      loop.update({ paused: props.paused, time: props.time });
      if (props.seed !== before.seed || props.density !== before.density || props.src !== before.src) loop.redraw();
    },
    destroy() {
      child?.destroy();
      child = null;
      loop.destroy();
      surface.destroy();
      palette.destroy();
      under.remove();
      headlineEl.remove();
      subheadEl.remove();
      actionsEl.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};
