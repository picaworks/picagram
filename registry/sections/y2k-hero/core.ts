import * as marquee from "../../motion/marquee/core";
import * as scanlines from "../../effects/scanlines/core";
import { createCanvas } from "../../../lib/canvas";
import { parseColor } from "../../../lib/color";
import { bayerMatrix } from "../../../lib/dither";
import { GRID_FONT } from "../../../lib/font";
import { layer, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { createLoop } from "../../../lib/loop";
import { cssOn, cssVar, watchPalette } from "../../../lib/palette";
import { createRng } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

/** One call to action: a link's visible text and destination. */
export interface Y2kAction {
  /** Text on the link. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface Y2kHeroProps extends MotionProps {
  /** The big line drawn above the wrapped content. An empty string hides it. */
  headline: string;
  /** A quieter line under the headline, in the muted ink. An empty string hides it. */
  subhead: string;
  /** Calls to action, drawn as real beveled links. At most three are shown. */
  actions: readonly Y2kAction[];
  /** Text alignment inside the column: centered, the way of the era, or flush to the start edge. */
  align: "center" | "start";
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
  /** Text for the scrolling strip pinned to the top edge. An empty string removes the strip. */
  ticker: string;
  /** A fine line screen over the whole section, mounted from the scanlines core. */
  scanlines: boolean;
  /** The two chrome bars framing the content. */
  rails: boolean;
  /** Starbursts the seed scatters behind the content, from 0 to 4. */
  stars: number;
  /** How strongly the drawn frame inks, from 0 to 1. */
  intensity: number;
  /** The bright band that sweeps along the chrome while the clock runs. */
  sheen: boolean;
  /** Frames drawn per second while animating. */
  fps: number;
}

export const defaults: Y2kHeroProps = {
  headline: "Welcome To The Future",
  subhead: "Everything here is chrome plated, hand assembled, and best viewed at any resolution.",
  actions: [
    { label: "Enter", href: "#enter" },
    { label: "Guestbook", href: "#guestbook" },
  ],
  align: "center",
  minHeight: 78,
  ticker: "EST. 2000",
  scanlines: true,
  rails: true,
  stars: 2,
  intensity: 0.9,
  sheen: true,
  fps: 24,
  paused: false,
  time: null,
  seed: 1,
};

/** Edge of one dither cell in canvas pixels. Every cell shares a single ordered threshold, which is what
 *  makes the chrome read as printed bands rather than as a smooth gradient. */
const DOT = 3;

/** Ink codes in the block grid: which palette color a cell takes once its threshold is met. */
const INK_FG = 1;
const INK_ACCENT = 2;
const INK_BG = 3;

/** A palette color resolved to channel values for the pixel buffer. */
type Rgba = readonly [number, number, number, number];

/** One scattered starburst, all of its randomness drawn from the seed at mount or on update. */
interface Burst {
  /** Center across the host, as a fraction of its width. */
  fx: number;
  /** Center down the host, as a fraction of its height. */
  fy: number;
  /** Radius in dither cells. */
  rb: number;
  /** One cell of flat offset ink behind the burst, the two step bevel read. */
  twin: number;
  /** Resting rotation, in radians. */
  ang: number;
  /** Spin rate, in radians per second, sign included. */
  spin: number;
  /** Phase offset for the breathing pulse. */
  phase: number;
}

/** Keeps minHeight inside a sane range even if a caller passes something outside 0 to 100. */
function clampVh(minHeight: number): number {
  return Math.min(100, Math.max(0, minHeight));
}

/** The chrome ramp as hard tone steps: a bright lip, a fall through the dark horizon, and a bright base.
 *  Every step is a flat tone, so the bar reads as machined metal printed in dither rather than as a blend. */
function chromeStep(v: number): number {
  if (v < 0.12) return 0.97;
  if (v < 0.4) return 0.62;
  if (v < 0.62) return 0.08;
  if (v < 0.8) return 0.45;
  return 0.9;
}

/** Creates one element the core owns, marked with data-pica and a part attribute the scoped rules select by. */
function part<K extends keyof HTMLElementTagNameMap>(tag: K, name: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute(`data-pica-${name}`, "");
  return node;
}

/** Rebuilds the action links from JSON: at most three, the first solid in the accent and the rest outline.
 *  Every one is a real link, so the browser's own keyboard and middle click come with it. */
function fillLinks(container: HTMLElement, actions: readonly Y2kAction[]): void {
  container.replaceChildren();
  for (const [i, action] of actions.slice(0, 3).entries()) {
    const a = document.createElement("a");
    a.setAttribute("data-pica", "");
    a.dataset.variant = i === 0 ? "solid" : "outline";
    a.href = action.href || "#";
    a.textContent = action.label;
    container.append(a);
  }
}

/** Scoped layout for the host and every node the core owns. Bevels are two flat tone steps: the top and
 *  left edges take the full ink, the bottom and right a dimmed step, with square corners and no shadow.
 *  The minimum height sits in a :where() rule, which carries no specificity, so a page that gives this
 *  host a height of its own still wins. */
function sheetCss(s: string, p: Y2kHeroProps): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const muted = cssVar("muted");
  const dim = `color-mix(in srgb, ${fg} 38%, transparent)`;
  const centered = p.align !== "start";
  const edge = centered ? "center" : "flex-start";
  const textAlign = centered ? "center" : "start";
  const padX = "clamp(1rem, 5vw, 4rem)";
  return [
    `:where(${s}){min-height:${clampVh(p.minHeight)}vh}`,
    `${s}{box-sizing:border-box;position:relative;display:flex;flex-direction:column;align-items:${edge};justify-content:center;gap:0.7em;color:${fg};padding:clamp(96px,14vh,136px) ${padX} clamp(76px,10vh,108px)}`,
    `${s} > :not([data-pica]){max-width:42rem;text-align:${textAlign}}`,
    `${s} > [data-pica-headline]{max-width:42rem;margin:0;font-size:clamp(2rem,6vw,3.6rem);font-weight:700;line-height:1.05;text-align:${textAlign}}`,
    `${s} > [data-pica-subhead]{max-width:36rem;margin:0;color:${muted};font-size:clamp(0.95rem,1.5vw,1.1rem);line-height:1.5;text-align:${textAlign}}`,
    `${s} > [data-pica-ticker]{position:absolute;top:0;left:0;right:0;font-family:${GRID_FONT};font-size:0.72em;letter-spacing:0.16em;line-height:1.4;text-transform:uppercase;color:${fg};border-top:2px solid ${fg};border-bottom:2px solid ${dim};padding:0.4em 0.8em}`,
    `${s} > [data-pica-actions]{display:flex;flex-wrap:wrap;align-items:center;gap:0.75em;max-width:42rem;margin-top:0.5em;justify-content:${edge}}`,
    `${s} > [data-pica-actions]:empty{display:none}`,
    `${s} > [data-pica-actions] a{appearance:none;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.6em 1.3em;display:inline-flex;align-items:center;border:2px solid ${fg};border-color:${fg} ${dim} ${dim} ${fg};border-radius:0;cursor:pointer}`,
    `${s} > [data-pica-actions] a[data-variant="solid"]{background:${accent};color:${cssOn("accent")}}`,
    `${s} > [data-pica-actions] a[data-variant="outline"]{background:transparent;color:${fg}}`,
    `${s} > [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${accent} 85%, ${fg})}`,
    `${s} > [data-pica-actions] a[data-variant="outline"]:hover{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${s} > [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${s} > [data-pica-scan]{position:absolute;inset:0;z-index:1;pointer-events:none}`,
  ].join("\n");
}

export const mount: Mount<Y2kHeroProps> = (host, initial = {}) => {
  let props: Y2kHeroProps = { ...defaults, ...initial };
  const sheet = scope(host);

  // The chrome scene draws into a canvas on a layer under the wrapped content, one ordered dither cell
  // at a time, upscaled with no smoothing so every cell stays a printed dot.
  const under = layer(host, "under");
  const surface = createCanvas(under.el, {
    maxDpr: 1,
    onResize: () => {
      sizeScene();
      loop.redraw();
    },
  });
  const view = surface.canvas.getContext("2d");
  const plate = document.createElement("canvas");
  const plateCtx = plate.getContext("2d");
  const bayer = bayerMatrix(8);

  const headlineEl = part("h1", "headline");
  const subheadEl = part("p", "subhead");
  const actions = part("div", "actions");
  const tickerHost = part("div", "ticker");
  tickerHost.setAttribute("aria-hidden", "true");
  const scanHost = part("div", "scan");
  scanHost.setAttribute("aria-hidden", "true");

  let bw = 0;
  let bh = 0;
  let img: ImageData | null = null;
  let tone = new Float32Array(0);
  let ink = new Uint8Array(0);
  let bursts: Burst[] = [];
  let marks: readonly (readonly [number, number])[] = [];
  let fgInk: Rgba = [0, 0, 0, 0];
  let accentInk: Rgba = [0, 0, 0, 0];
  let bgInk: Rgba = [0, 0, 0, 0];

  /** Reallocates the block grid and its plate to match the canvas backing store. */
  function sizeScene(): void {
    bw = Math.max(1, Math.ceil(surface.width / DOT));
    bh = Math.max(1, Math.ceil(surface.height / DOT));
    tone = new Float32Array(bw * bh);
    ink = new Uint8Array(bw * bh);
    plate.width = bw;
    plate.height = bh;
    img = plateCtx ? plateCtx.createImageData(bw, bh) : null;
  }

  function readInks(): void {
    fgInk = parseColor(pal.colors.fg);
    accentInk = parseColor(pal.colors.accent);
    bgInk = parseColor(pal.colors.bg);
  }

  const pal = watchPalette(host, () => {
    readInks();
    loop.redraw();
  });

  /** Scatters the starbursts and the small registration marks from the seed: alternating sides, clear of
   *  the rails, spinning slowly. */
  function seedBursts(): void {
    const rng = createRng(props.seed);
    const count = Math.max(0, Math.min(4, Math.round(props.stars)));
    const next: Burst[] = [];
    for (let i = 0; i < count; i++) {
      next.push({
        fx: i % 2 === 0 ? 0.1 + 0.16 * rng() : 0.74 + 0.16 * rng(),
        fy: 0.3 + 0.4 * rng(),
        rb: 11 + 10 * rng(),
        twin: 1 + Math.floor(rng() * 2),
        ang: rng() * Math.PI,
        spin: (rng() < 0.5 ? -1 : 1) * (0.08 + 0.1 * rng()),
        phase: rng() * Math.PI * 2,
      });
    }
    bursts = next;
    const pluses: [number, number][] = [];
    for (let i = 0; i < 7; i++) pluses.push([0.04 + 0.92 * rng(), 0.16 + 0.68 * rng()]);
    marks = pluses;
  }

  function plotBlock(bx: number, by: number, code: number, level: number): void {
    if (bx < 0 || by < 0 || bx >= bw || by >= bh) return;
    const i = by * bw + bx;
    ink[i] = code;
    tone[i] = level;
  }

  /** One chrome bar: the banded ramp with machined ends and a brighter band sweeping along it while the
   *  clock runs, trailed by a dark one. Every mark it makes is a flat tone step. */
  function paintRail(x0: number, y0: number, x1: number, y1: number, t: number, phase0: number, gain: number): void {
    const h = Math.max(1, y1 - y0);
    const mid = (y0 + y1) / 2;
    const sheenW = Math.max(5, Math.round((x1 - x0) * 0.13));
    const sx = x0 - sheenW + ((t / 6400 + phase0) % 1) * (x1 - x0 + sheenW * 2);
    for (let by = y0; by < y1; by++) {
      const base = chromeStep((by - y0) / h);
      const slant = (by - mid) * 0.55;
      for (let bx = x0; bx < x1; bx++) {
        let level = base;
        if (props.sheen) {
          const d = bx - sx - slant;
          if (Math.abs(d) <= sheenW * 0.5) level = 0.98;
          else if (d < -sheenW * 0.5 && d >= -sheenW * 1.5) level = 0.06;
        }
        if (bx < x0 + 3 || bx >= x1 - 3) level = Math.min(level, base * 0.45);
        plotBlock(bx, by, INK_FG, level * gain);
      }
    }
  }

  /** A rotated astroid: the four pointed sparkle of the era, one flat tone where it lands. */
  function paintAstroid(cx: number, cy: number, r: number, cos: number, sin: number, code: number, level: number): void {
    const e = 0.62;
    const rp = Math.pow(r, e);
    const x0 = Math.max(0, Math.floor(cx - r));
    const x1 = Math.min(bw - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r));
    const y1 = Math.min(bh - 1, Math.ceil(cy + r));
    for (let by = y0; by <= y1; by++) {
      for (let bx = x0; bx <= x1; bx++) {
        const dx = bx - cx;
        const dy = by - cy;
        const u = dx * cos + dy * sin;
        const v = -dx * sin + dy * cos;
        if (Math.pow(Math.abs(u), e) + Math.pow(Math.abs(v), e) <= rp) plotBlock(bx, by, code, level);
      }
    }
  }

  /** One starburst as flat steps: a ground knockout, a flat offset twin, the sparkle, and a brighter core,
   *  so the chrome bands never show through it. */
  function paintBurst(burst: Burst, t: number, gain: number): void {
    const cx = burst.fx * bw;
    const cy = burst.fy * bh;
    const r = burst.rb * (1 + 0.05 * Math.sin(t * 0.0011 + burst.phase));
    const a = burst.ang + (burst.spin * t) / 1000;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    paintAstroid(cx, cy, r * 1.24, cos, sin, INK_BG, 1);
    paintAstroid(cx + burst.twin, cy + burst.twin, r, cos, sin, INK_FG, 0.45 * gain);
    paintAstroid(cx, cy, r, cos, sin, INK_ACCENT, 0.6 * gain);
    paintAstroid(cx, cy, r * 0.5, cos, sin, INK_ACCENT, 0.82 * gain);
  }

  /** One small registration mark: a plus of five cells at a flat tone. */
  function paintMark(fx: number, fy: number, gain: number): void {
    const bx = Math.round(fx * bw);
    const by = Math.round(fy * bh);
    const level = 0.5 * gain;
    plotBlock(bx, by, INK_FG, level);
    plotBlock(bx - 1, by, INK_FG, level);
    plotBlock(bx + 1, by, INK_FG, level);
    plotBlock(bx, by - 1, INK_FG, level);
    plotBlock(bx, by + 1, INK_FG, level);
  }

  function draw(t: number): void {
    if (!view || !plateCtx || !img) return;
    const W = surface.width;
    const H = surface.height;
    if (W === 0 || H === 0) return;
    tone.fill(0);
    ink.fill(0);
    const gain = Math.min(1, Math.max(0, props.intensity));

    if (props.rails) {
      const railH = Math.max(9, Math.min(16, Math.round(bh * 0.055)));
      const x0 = Math.round(bw * 0.05);
      const tickH = props.ticker.trim() === "" ? 0 : Math.ceil(tickerHost.clientHeight / DOT);
      paintRail(x0, tickH + 5, bw - x0, tickH + 5 + railH, t, 0.3, gain);
      paintRail(x0, bh - 6 - railH, bw - x0, bh - 6, t, 0.8, gain);
    }
    for (const [fx, fy] of marks) paintMark(fx, fy, gain);
    for (const burst of bursts) paintBurst(burst, t, gain);

    const data = img.data;
    data.fill(0);
    let i = 0;
    for (let by = 0; by < bh; by++) {
      const row = by * bw;
      const cut = (by & 7) * 8;
      for (let bx = 0; bx < bw; bx++) {
        const code = ink[row + bx] ?? 0;
        if (code !== 0 && (tone[row + bx] ?? 0) > (bayer[cut + (bx & 7)] ?? 1)) {
          const col = code === INK_ACCENT ? accentInk : code === INK_BG ? bgInk : fgInk;
          data[i] = col[0];
          data[i + 1] = col[1];
          data[i + 2] = col[2];
          data[i + 3] = col[3];
        }
        i += 4;
      }
    }
    plateCtx.putImageData(img, 0, 0);
    view.imageSmoothingEnabled = false;
    view.clearRect(0, 0, W, H);
    view.drawImage(plate, 0, 0, bw * DOT, bh * DOT);
    host.dataset.picaReady = "true";
  }

  const loop = createLoop({
    el: host,
    fps: props.fps,
    paused: props.paused,
    time: props.time,
    still: 1200,
    frame: draw,
  });

  let tickerInstance: ReturnType<typeof marquee.mount> | null = null;
  let scanInstance: ReturnType<typeof scanlines.mount> | null = null;

  function tickerProps(): Partial<typeof marquee.defaults> {
    return { speed: 30, direction: "left", gap: 3, pauseOnHover: true, paused: props.paused, time: props.time, fps: props.fps };
  }

  /** Rebuilds the scrolling strip: fresh text inside the same sub-host, remounted so the cycle is measured
   *  against the new line rather than the old one's width. */
  function renderTicker(): void {
    tickerInstance?.destroy();
    tickerInstance = null;
    tickerHost.replaceChildren();
    const text = props.ticker.trim();
    tickerHost.style.display = text ? "" : "none";
    if (!text) return;
    const item = document.createElement("span");
    item.textContent = `${text} ✶`;
    tickerHost.append(item);
    tickerInstance = marquee.mount(tickerHost, tickerProps());
  }

  function scanProps(): Partial<typeof scanlines.defaults> {
    return { spacing: 3, thickness: 1, opacity: 0.12, roll: true, rollSpeed: 18, paused: props.paused, time: props.time, fps: props.fps };
  }

  function renderScan(): void {
    if (props.scanlines && !scanInstance) scanInstance = scanlines.mount(scanHost, scanProps());
    else if (!props.scanlines && scanInstance) {
      scanInstance.destroy();
      scanInstance = null;
    } else scanInstance?.update(scanProps());
  }

  /** Keeps the text parts before the wrapped children, dropping empty ones entirely. */
  function syncTop(): void {
    headlineEl.textContent = props.headline;
    subheadEl.textContent = props.subhead;
    const top: HTMLElement[] = [];
    if (props.headline.trim()) top.push(headlineEl);
    else headlineEl.remove();
    if (props.subhead.trim()) top.push(subheadEl);
    else subheadEl.remove();
    host.prepend(...top);
  }

  readInks();
  sizeScene();
  seedBursts();
  sheet.setRules(sheetCss(sheet.selector, props));
  syncTop();
  fillLinks(actions, props.actions);
  host.append(actions, tickerHost, scanHost);
  renderTicker();
  renderScan();
  draw(props.time ?? 1200);

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };

      if (props.paused !== before.paused || props.time !== before.time || props.fps !== before.fps) {
        loop.update({ paused: props.paused, time: props.time, fps: props.fps });
        tickerInstance?.update(tickerProps());
        scanInstance?.update(scanProps());
      }
      if (props.ticker !== before.ticker) renderTicker();
      if (props.scanlines !== before.scanlines) renderScan();
      if (props.align !== before.align || props.minHeight !== before.minHeight) sheet.setRules(sheetCss(sheet.selector, props));
      if (props.headline !== before.headline || props.subhead !== before.subhead) syncTop();
      if (!sameJson(before.actions, props.actions)) fillLinks(actions, props.actions);
      if (props.seed !== before.seed || props.stars !== before.stars) seedBursts();
      if (
        props.seed !== before.seed ||
        props.stars !== before.stars ||
        props.rails !== before.rails ||
        props.sheen !== before.sheen ||
        props.intensity !== before.intensity
      ) {
        loop.redraw();
      }
      if (pal.refresh()) loop.redraw();
    },
    destroy() {
      tickerInstance?.destroy();
      scanInstance?.destroy();
      loop.destroy();
      pal.destroy();
      surface.destroy();
      under.remove();
      for (const node of [headlineEl, subheadEl, actions, tickerHost, scanHost]) node.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};
