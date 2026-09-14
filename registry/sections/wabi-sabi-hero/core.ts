import { hostAttributes, layer, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { createNoise } from "../../../lib/noise";
import { cssOn, cssVar, watchPalette } from "../../../lib/palette";
import { parseColor } from "../../../lib/color";
import { createRng, hashSeed } from "../../../lib/rng";
import type { Mount } from "../../../lib/types";

/** One call to action: a link's visible text and destination. */
export interface WabiSabiHeroAction {
  /** Text on the link. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface WabiSabiHeroProps {
  /** The headline, set large in the page's own font. Empty hides it. */
  headline: string;
  /** Supporting copy under the headline, drawn in the muted color. Empty hides it. */
  subhead: string;
  /** Calls to action, drawn as links in source order. The first draws solid in the foreground color, the rest draw hairline. At most three are drawn. */
  actions: readonly WabiSabiHeroAction[];
  /** Which side the content leans toward: "start" opens the void on the right, "end" mirrors the whole composition. */
  align: "start" | "end";
  /** Draw the enclosing frame, one side of it missing and every drawn side stopping short of its corner. */
  frame: boolean;
  /** How much speckle and staining the ground carries, from none at 0 to full wear at 1. */
  wear: number;
  /** How strongly the drawn work shows, from 0 to 1. */
  intensity: number;
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
  /** Seed for every irregularity, so the same seed always finds the same imperfections. */
  seed: number;
}

export const defaults: WabiSabiHeroProps = {
  headline: "Left unfinished on purpose.",
  subhead:
    "An off centre hero whose boundary never closes, whose rules stop short, and whose wear gathers where hands would go.",
  actions: [
    { label: "Browse components", href: "#components" },
    { label: "Read the docs", href: "#docs" },
  ],
  align: "start",
  frame: true,
  wear: 0.8,
  intensity: 0.8,
  minHeight: 72,
  seed: 1,
};

/** Below this host width every column goes full width and the lone fragment hides. */
const MIN_WIDE = 760;
const TRACKS = "repeat(12, minmax(0, 1fr))";
const GUTTER = "clamp(0.75rem, 2vw, 1.5rem)";
const ROW_GAP = "clamp(1rem, 2.6vh, 1.8rem)";
const PAD_TOP = "clamp(4.5rem, 13vh, 8.5rem)";
const PAD_BOTTOM = "clamp(3rem, 9vh, 6rem)";
const PAD_SIDE = "clamp(1.25rem, 5vw, 4.5rem)";
/** Grain buffer resolution as a fraction of CSS size, so each speckle lands as a two pixel fleck. */
const GRAIN_SCALE = 0.5;
/** The most pixels the grain buffer may hold before its scale drops below GRAIN_SCALE. */
const GRAIN_MAX = 240000;
/** Coarse lattice the large scale drift is sampled from, in grain buffer cells. Speckle is per pixel but
 *  drift only needs to be lumpy, so a five pixel grid keeps a full repaint cheap. */
const DRIFT_CELL = 5;
/** How far wear reaches inward from a drawn line, in CSS pixels. Narrow, so a rule keeps its shoulders
 *  dusty instead of smearing into a band. */
const LINE_REACH = 14;
/** The largest canvas backing store, in pixels. */
const MAX_BACKING = 4200000;

interface Seg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** A drawn piece of line with its own strength, so worn spots can fade instead of vanishing. */
interface Stroke {
  seg: Seg;
  alpha: number;
}

/** A measured rectangle in host coordinates. */
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

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** A seeded value in [0, 1) for one buffer cell, independent of traversal order. */
function hash01(seed: number, a: number, b: number): number {
  return hashSeed(seed, a, b) / 4294967296;
}

/** Creates one element the core owns, marked for identification and scoped styling. */
function part<K extends keyof HTMLElementTagNameMap>(tag: K, name: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute(`data-pica-${name}`, "");
  return node;
}

/** Distance from a point to a segment, used to weight wear so it hugs the drawn lines. */
function segDist(px: number, py: number, s: Seg): number {
  const dx = s.x2 - s.x1;
  const dy = s.y2 - s.y1;
  const l2 = dx * dx + dy * dy;
  let t = l2 > 0 ? ((px - s.x1) * dx + (py - s.y1) * dy) / l2 : 0;
  t = clamp01(t);
  return Math.hypot(s.x1 + dx * t - px, s.y1 + dy * t - py);
}

/** 1 at the edge, falling to 0 at `reach` pixels inward. */
function edge(d: number, reach: number): number {
  return clamp01(1 - d / reach);
}

/** Layout for the host and the button grammar for its calls to action. The copy leans to one side of a
 *  twelve column grid and sits low, so the empty field stays the largest element. The minimum height
 *  sits in a :where() rule, which carries no specificity, so a page that gives this host a height of its
 *  own wins without fighting an inline style. */
function rules(selector: string, p: WabiSabiHeroProps): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const col = p.align === "end" ? "7 / 13" : "1 / 7";
  const edge2 = p.align === "end" ? "flex-end" : "flex-start";
  const textAlign = p.align === "end" ? "end" : "start";
  return [
    `:where(${selector}){min-height:${vh(p.minHeight)}vh}`,
    `${selector}{position:relative;isolation:isolate;box-sizing:border-box;display:grid;grid-template-columns:${TRACKS};column-gap:${GUTTER};row-gap:${ROW_GAP};align-content:end;padding:${PAD_TOP} ${PAD_SIDE} ${PAD_BOTTOM};color:${fg};text-align:${textAlign}}`,
    `${selector} *{box-sizing:border-box}`,
    `${selector} > *{min-width:0}`,
    `${selector} > :not([data-pica]){grid-column:${col};margin:0;min-width:0;max-width:30em;overflow-wrap:break-word}`,
    `${selector} [data-pica-type]{grid-column:${col};grid-row:1;min-width:0;text-align:${textAlign}}`,
    `${selector} [data-pica-headline]{margin:0;max-width:9.5em;font-size:clamp(2.3rem,5.6vw,4.4rem);line-height:1.05;font-weight:640;letter-spacing:-0.015em;overflow-wrap:break-word}`,
    `${selector} [data-pica-subhead]{margin:1.1em 0 0;max-width:28em;font-size:clamp(1rem,1.4vw,1.18rem);line-height:1.62;color:${muted}}`,
    `${selector} [data-pica-actions]{grid-column:${col};display:flex;flex-wrap:wrap;align-items:center;gap:0.75em;justify-content:${edge2}}`,
    `${selector} [data-pica-actions][hidden],${selector} [data-pica-actions]:empty{display:none}`,
    `${selector} [data-pica-actions] a{appearance:none;margin:0;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.6em 1.3em;display:inline-flex;align-items:center;border:1px solid ${muted};border-radius:0;color:${fg};background:transparent;cursor:pointer}`,
    // The solid variant fills with the foreground color and lets a span carry the contrasting ink. The
    // color cannot sit on the link itself: an unset fg token resolves to currentColor, which is the link's
    // own color, so the fill would turn into whatever the text became.
    `${selector} [data-pica-actions] a[data-variant="solid"]{background:${fg};border-color:${fg}}`,
    `${selector} [data-pica-actions] a[data-variant="solid"] > span{color:${cssOn("fg")}}`,
    `${selector} [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${fg} 80%, transparent)}`,
    `${selector} [data-pica-actions] a[data-variant="outline"]:hover{border-color:${fg};background:color-mix(in srgb, ${fg} 9%, transparent)}`,
    `${selector} [data-pica-actions] a:focus-visible{outline:2px solid ${fg};outline-offset:2px}`,
    `${selector}[data-pica-fit="min"] > :not([data-pica]),${selector}[data-pica-fit="min"] [data-pica-type],${selector}[data-pica-fit="min"] [data-pica-actions]{grid-column:1 / -1;max-width:none}`,
  ].join("\n");
}

/** Rebuilds the action links from JSON: the first solid in the foreground, the rest hairline, in source order. */
function renderActions(container: HTMLElement, actions: readonly WabiSabiHeroAction[]): void {
  container.replaceChildren();
  for (const [i, action] of actions.slice(0, 3).entries()) {
    const a = document.createElement("a");
    a.setAttribute("data-pica", "");
    a.dataset.variant = i === 0 ? "solid" : "outline";
    a.href = action.href;
    const label = document.createElement("span");
    label.setAttribute("data-pica", "");
    label.textContent = action.label;
    a.append(label);
    container.append(a);
  }
  container.hidden = actions.length === 0;
}

/** One side of the frame as drawn pieces. It begins and ends short of its corners, skips a few places
 *  where the line wore through, and thins where the surface was rubbed. Every measurement comes from the
 *  seed, so the wear is found, not applied: nothing is spaced evenly and no two sides wear alike. */
function sideStrokes(a: readonly [number, number], b: readonly [number, number], rng: () => number): Stroke[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len < 12) return [];
  const ux = dx / len;
  const uy = dy / len;
  const s0 = len * (0.012 + rng() * 0.05);
  const s1 = len * (0.012 + rng() * 0.05);
  const cuts: [number, number][] = [];
  const nCuts = rng() < 0.72 ? 1 + Math.floor(rng() * 2.2) : 0;
  for (let i = 0; i < nCuts; i++) {
    const p = len * (0.14 + rng() * 0.72);
    const w = 1.4 + rng() * 3.4;
    cuts.push([p - w / 2, p + w / 2]);
  }
  const thins: [number, number][] = [];
  const nThins = rng() < 0.6 ? 1 + Math.floor(rng() * 1.6) : 0;
  for (let i = 0; i < nThins; i++) {
    const p = len * (0.08 + rng() * 0.84);
    const w = 10 + rng() * 34;
    thins.push([p - w / 2, p + w / 2]);
  }
  const marks = [...cuts.flat(), ...thins.flat()].filter((t) => t > s0 + 0.5 && t < len - s1 - 0.5).sort((m, n) => m - n);
  const inside = (ranges: [number, number][], t: number): boolean => ranges.some(([x, y]) => t >= x && t <= y);
  const out: Stroke[] = [];
  const base = 0.58 + rng() * 0.22;
  let prev = s0;
  for (const t of [...marks, len - s1]) {
    const mid = (prev + t) / 2;
    if (!inside(cuts, mid) && t - prev > 0.5) {
      const thin = inside(thins, mid);
      out.push({
        seg: { x1: a[0] + ux * prev, y1: a[1] + uy * prev, x2: a[0] + ux * t, y2: a[1] + uy * t },
        alpha: thin ? base * 0.4 : base * (0.85 + rng() * 0.3),
      });
    }
    prev = t;
  }
  return out;
}

/** The remnant a missing side leaves behind: one short piece anchored where a corner would have been. */
function stubStrokes(a: readonly [number, number], b: readonly [number, number], rng: () => number): Stroke[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len < 12) return [];
  const ux = dx / len;
  const uy = dy / len;
  const sl = len * (0.07 + rng() * 0.11);
  const t0 = rng() < 0.5 ? 0 : len - sl;
  return [{ seg: { x1: a[0] + ux * t0, y1: a[1] + uy * t0, x2: a[0] + ux * (t0 + sl), y2: a[1] + uy * (t0 + sl) }, alpha: 0.55 + rng() * 0.2 }];
}

export const mount: Mount<WabiSabiHeroProps> = (host, initial = {}) => {
  let props: WabiSabiHeroProps = { ...defaults, ...initial };
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

  /** The union of everything the column rule floats above: the type block, the calls to action, and the
   *  page's children. */
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

  // The drawn work sits in a layer under the content, hidden from assistive technology, so the page's
  // copy stays readable and hit testable above it.
  const under = layer(host, "under");
  const canvas = part("canvas", "surface");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none";
  under.el.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const paletteWatch = watchPalette(host, () => draw());

  /** Repaints the whole drawing: the incomplete frame, the lone fragments, and the seeded wear field.
   *  Speckle gathers where a surface would be handled, along the bottom and the drawn lines, and thins
   *  toward the open field, so the empty space stays empty. */
  function draw(): void {
    if (dead || !ctx) return;
    paletteWatch.refresh();
    const W = host.clientWidth;
    const H = host.clientHeight;
    if (W < 2 || H < 2) return;
    attrs.set("data-pica-fit", W < MIN_WIDE ? "min" : null);
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2, Math.sqrt(MAX_BACKING / Math.max(1, W * H)));
    const bw = Math.max(1, Math.round(W * dpr));
    const bh = Math.max(1, Math.round(H * dpr));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    const colors = paletteWatch.colors;
    const k = 0.3 + 0.7 * clamp01(props.intensity);
    const rng = createRng(hashSeed(props.seed, 7));
    const noise = createNoise(hashSeed(props.seed, 13));
    const m = Math.min(W, H);
    const strokes: Stroke[] = [];

    if (props.frame) {
      // Each side gets its own inset, so the frame leans a little rather than sitting square.
      const ins = [m * (0.036 + rng() * 0.02), m * (0.036 + rng() * 0.02), m * (0.036 + rng() * 0.02), m * (0.036 + rng() * 0.02)];
      const f: Box = { l: ins[3] ?? 0, t: ins[0] ?? 0, r: W - (ins[1] ?? 0), b: H - (ins[2] ?? 0) };
      const corners: [readonly [number, number], readonly [number, number]][] = [
        [[f.l, f.t], [f.r, f.t]],
        [[f.r, f.t], [f.r, f.b]],
        [[f.l, f.b], [f.r, f.b]],
        [[f.l, f.t], [f.l, f.b]],
      ];
      const missing = Math.floor(rng() * 4);
      for (const [i, pair] of corners.entries()) {
        const [a, b] = pair;
        strokes.push(...(i === missing ? stubStrokes(a, b, rng) : sideStrokes(a, b, rng)));
      }
    }

    // A rule above the copy that ends well before the column does.
    const box = contentBox();
    if (box) {
      const y = box.t - Math.min(30, Math.max(14, H * 0.028));
      if (y > 8) strokes.push({ seg: { x1: box.l, y1: y, x2: box.l + (box.r - box.l) * (0.4 + rng() * 0.26), y2: y }, alpha: 0.5 + rng() * 0.18 });
    }

    // One lone fragment in the void, a rule that never met anything.
    if (W >= MIN_WIDE) {
      const vx = props.align === "end" ? W * (0.3 - rng() * 0.16) : W * (0.7 + rng() * 0.16);
      const vy = H * (0.15 + rng() * 0.3);
      strokes.push({ seg: { x1: vx, y1: vy, x2: vx + 26 + rng() * 72, y2: vy }, alpha: 0.42 + rng() * 0.2 });
    }

    // Stains are seeded blotches that raise the local wear, so age arrives in patches.
    const stains: { x: number; y: number; rx: number; ry: number }[] = [];
    const nStains = 1 + Math.floor(rng() * 2);
    for (let i = 0; i < nStains; i++) {
      stains.push({ x: W * (0.12 + rng() * 0.76), y: H * (0.42 + rng() * 0.5), rx: m * (0.1 + rng() * 0.2), ry: m * (0.07 + rng() * 0.14) });
    }

    const amount = clamp01(props.wear);
    if (amount > 0) {
      const scale = Math.min(GRAIN_SCALE, Math.sqrt(GRAIN_MAX / (W * H)));
      const gw = Math.max(1, Math.round(W * scale));
      const gh = Math.max(1, Math.round(H * scale));
      const buf = document.createElement("canvas");
      buf.width = gw;
      buf.height = gh;
      const bctx = buf.getContext("2d");
      if (bctx) {
        const [fr, fg2, fb] = parseColor(colors.fg);
        // The drift lattice: large scale patchiness, so speckle clumps and drifts instead of falling evenly.
        const cw = Math.floor(gw / DRIFT_CELL) + 1;
        const ch = Math.floor(gh / DRIFT_CELL) + 1;
        const drift = new Float32Array(cw * ch);
        for (let gy = 0; gy < ch; gy++) {
          for (let gx = 0; gx < cw; gx++) {
            const n = noise.noise2((gx * DRIFT_CELL * 2.6) / gw, (gy * DRIFT_CELL * 2.6) / gw);
            drift[gy * cw + gx] = clamp01(((n + 1) * 0.5 - 0.42) / 0.5);
          }
        }
        // The actions are the one place a hand would actually go, so the ground wears a little there.
        const ab: Box | null = actionsEl.offsetWidth > 0
          ? { l: actionsEl.offsetLeft - 24, t: actionsEl.offsetTop - 24, r: actionsEl.offsetLeft + actionsEl.offsetWidth + 24, b: actionsEl.offsetTop + actionsEl.offsetHeight + 24 }
          : null;
        const img = bctx.createImageData(gw, gh);
        const data = img.data;
        for (let y = 0; y < gh; y++) {
          const cy = (y + 0.5) / scale;
          const dRow = Math.min(ch - 1, Math.floor(y / DRIFT_CELL)) * cw;
          for (let x = 0; x < gw; x++) {
            const cx = (x + 0.5) / scale;
            // Handled edges: the bottom rim wears deepest, the sides less, the top barely.
            const rim = Math.max(
              edge(cx, m * 0.045) * 0.45,
              edge(W - cx, m * 0.045) * 0.45,
              edge(cy, m * 0.035) * 0.28,
              edge(H - cy, m * 0.085) * 0.75,
            );
            let near = 0;
            for (const { seg } of strokes) {
              const v = edge(segDist(cx, cy, seg), LINE_REACH);
              if (v > near) near = v;
            }
            let held = 0;
            if (ab) {
              const ddx = Math.max(ab.l - cx, 0, cx - ab.r);
              const ddy = Math.max(ab.t - cy, 0, cy - ab.b);
              held = edge(Math.hypot(ddx, ddy), 40) * 0.45;
            }
            const dr = drift[dRow + Math.min(cw - 1, Math.floor(x / DRIFT_CELL))] ?? 0;
            let stain = 0;
            for (const s of stains) {
              const sx = (cx - s.x) / s.rx;
              const sy = (cy - s.y) / s.ry;
              const r = sx * sx + sy * sy;
              if (r < 1) {
                const v = (1 - r) * (0.35 + dr * 0.65);
                if (v > stain) stain = v;
              }
            }
            // Wear gathers where a hand would reach and where the drift lumps it, and the drift also
            // damps what it does not claim, so the open field keeps only rare stray flecks.
            const density = clamp01(rim * 0.8 + near * 0.6 + held + stain * 0.7 + dr * 0.16) * (0.3 + 0.7 * dr) * amount;
            if (hash01(props.seed, x, y) < density * density * 0.5) {
              const a = Math.round(255 * (0.1 + 0.4 * hash01(props.seed, y, x)) * k);
              const idx = (y * gw + x) * 4;
              data[idx] = fr;
              data[idx + 1] = fg2;
              data[idx + 2] = fb;
              data[idx + 3] = a;
            }
          }
        }
        bctx.putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(buf, 0, 0, gw, gh, 0, 0, W, H);
      }
    }

    ctx.strokeStyle = colors.muted;
    for (const { seg, alpha } of strokes) {
      ctx.globalAlpha = clamp01(alpha * k);
      ctx.beginPath();
      if (Math.abs(seg.y2 - seg.y1) < 1) {
        const y = Math.round(seg.y1) + 0.5;
        ctx.moveTo(seg.x1, y);
        ctx.lineTo(seg.x2, y);
      } else {
        const x = Math.round(seg.x1) + 0.5;
        ctx.moveTo(x, seg.y1);
        ctx.lineTo(x, seg.y2);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  draw();
  host.dataset.picaReady = "true";

  const resizer = typeof ResizeObserver === "function" ? new ResizeObserver(() => draw()) : null;
  resizer?.observe(host);
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
      resizer?.disconnect();
      mutator?.disconnect();
      paletteWatch.destroy();
      canvas.remove();
      under.remove();
      typeEl.remove();
      actionsEl.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};
