import { createCanvas } from "../../../lib/canvas";
import { parseColor } from "../../../lib/color";
import { bayerMatrix } from "../../../lib/dither";
import { blueNoiseMatrix } from "../../../lib/dither-mask";
import { layer, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { createLoop } from "../../../lib/loop";
import { createNoise } from "../../../lib/noise";
import { cssOn, cssVar, watchPalette } from "../../../lib/palette";
import { createRng } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

/** One call to action: a link's visible text and destination. */
export interface GlassHeroAction {
  /** Text on the link. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface GlassHeroProps extends MotionProps {
  /** The heading drawn after anything the page wraps. Empty draws none. */
  headline: string;
  /** One line of support under the headline, drawn in the muted color. Empty draws none. */
  subhead: string;
  /** Calls to action, drawn as links. At most three: the first draws solid in the accent, the rest outline. */
  actions: readonly GlassHeroAction[];
  /** Horizontal alignment of the content block within the host. */
  align: "start" | "center";
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
  /** How strongly the drifting field shows, from 0 to 1. */
  intensity: number;
  /** How strongly the pane screens the field down, from 0 (the field passes through) to 1 (almost none gets through). */
  frost: number;
  /** CSS pixels each screened dot covers before the canvas is scaled up. */
  scale: number;
  /** How fast the field drifts. 0 holds it still. */
  speed: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: GlassHeroProps = {
  headline: "Glass, without the blur.",
  subhead: "A frosted pane screened in dots, over a field that drifts.",
  actions: [
    { label: "Browse components", href: "#components" },
    { label: "Read the docs", href: "#docs" },
  ],
  align: "center",
  minHeight: 68,
  intensity: 0.7,
  frost: 0.75,
  scale: 3,
  speed: 0.6,
  fps: 24,
  paused: false,
  time: null,
  seed: 1,
};

/** Animation time shown under reduced motion, and what captures use, in milliseconds. */
const STILL_TIME = 1200;
/** Cells on a side of the ordered screen the pane's flat tones are drawn through. */
const BAYER_SIZE = 8;
/** Cells on a side of the blue noise mask the field is screened with. */
const GRAIN_SIZE = 32;
/** Noise wave cycles across the host's longer side. Low, so the field reads as a few broad drifts. */
const NOISE_FEATURES = 1.15;
/** Field units per second the drift carries the noise, at speed 1. Each axis moves at its own rate so the
 *  walk never closes a loop. */
const DRIFT_X = 0.05;
const DRIFT_Y = 0.032;
const DRIFT_Z = 0.055;
/** The window of noise that becomes an island of ink. Below it the ground stays bare; across it the tone
 *  eases in, so an island's edge dissolves rather than cuts. */
const MASK_LO = 0.58;
const MASK_HI = 0.9;
/** The densest the field ever inks, at intensity 1. Most of the frame stays nearer the ground. */
const PEAK_TONE = 0.45;
/** The flat tone step inside the pane: a sparse screen of fg dots that lifts it off the ground the way a
 *  frosted sheet lifts off what it covers. */
const STEP_TONE = 0.05;
/** The bg screen inside the pane, which tints it when the page sets the token. */
const GLAZE_TONE = 0.3;
/** CSS pixels of air the pane leaves around the content it wraps. */
const PANEL_PAD = 26;
/** Cells of bare ground the pane always keeps between its hairline and the host's edge, so the rim never
 *  reads as clipped. */
const EDGE_PAD = 2;
/** Cells of bare ground the screen leaves around every child box on top of what the box already holds,
 *  so no dot lands where the type reads, focus ring included. */
const CLEAR_BLEED = 2;
/** The most cells a frame screens, so a very large host stays inside the frame budget. */
const MAX_CELLS = 140000;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Keeps minHeight inside a sane range even if a caller passes something outside it. */
function vh(minHeight: number): number {
  return Math.min(100, Math.max(0, minHeight));
}

interface SeedState {
  noise: ReturnType<typeof createNoise>;
  z0: number;
}

/** Everything derived from the seed: the noise field and where along it the drift starts, so the same seed
 *  always draws the same motion. */
function deriveSeed(seed: number): SeedState {
  const rng = createRng(seed);
  return { noise: createNoise(seed), z0: rng() * 40 };
}

/** Layout for the host, the content column the pane hugs, and the button grammar for its calls to action:
 *  the first solid in the accent, the rest outline, square corners, and a hairline focus ring. Prose keeps
 *  the page's font: only size, weight, and tracking set the headline apart. The minimum height goes in a
 *  :where() rule, which carries no specificity at all, so a page that gives this host a height of its own
 *  wins without having to fight an inline style. */
function rules(selector: string, p: GlassHeroProps): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  const center = p.align === "center";
  const edge = center ? "center" : "flex-start";
  const textAlign = center ? "center" : "start";
  return [
    `:where(${selector}){min-height:${vh(p.minHeight)}vh}`,
    `${selector}{box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:${edge};gap:0.9em;padding:clamp(1.5rem,5vw,4rem);color:${fg};text-align:${textAlign}}`,
    `${selector} > :not([data-pica]){margin-block:0;max-width:42rem;text-align:${textAlign}}`,
    `${selector} > :is(h1,h2,h3){margin-block:0;max-width:16em;font-size:clamp(2.1rem,5vw,3.8rem);line-height:1.06;font-weight:600;letter-spacing:-0.02em;overflow-wrap:break-word;text-wrap:balance}`,
    `${selector} > :is(h1,h2,h3):empty{display:none}`,
    `${selector} > p:not([data-pica]),${selector} > [data-part="subhead"]{margin-block:0;max-width:56ch;line-height:1.55;color:${muted};overflow-wrap:break-word}`,
    `${selector} > [data-part="subhead"]:empty{display:none}`,
    `${selector} > [data-part="actions"]{display:flex;flex-wrap:wrap;align-items:center;gap:0.75em;margin-top:0.5em;justify-content:${edge}}`,
    `${selector} > [data-part="actions"]:empty{display:none}`,
    `${selector} > [data-part="actions"] a{appearance:none;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.65em 1.3em;display:inline-flex;align-items:center;border:1px solid transparent;border-radius:0;cursor:pointer}`,
    `${selector} > [data-part="actions"] a[data-variant="solid"]{background:${accent};color:${cssOn("accent")}}`,
    `${selector} > [data-part="actions"] a[data-variant="outline"]{background:transparent;color:${fg};border-color:${fg}}`,
    `${selector} > [data-part="actions"] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${accent} 85%, ${fg})}`,
    `${selector} > [data-part="actions"] a[data-variant="outline"]:hover{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${selector} > [data-part="actions"] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
  ].join("\n");
}

/** The pane's rectangle in cell coordinates: the box the content actually takes, padded and snapped to the
 *  dot grid. Null when the host wraps nothing and every part is empty. */
interface Pane {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Shared empty list for a frame with no content boxes to keep clear. */
const NO_CLEARS: Pane[] = [];

export const mount: Mount<GlassHeroProps> = (host, initial = {}) => {
  let props: GlassHeroProps = { ...defaults, ...initial };
  let cols = 1;
  let rows = 1;
  let pixel = Math.max(1, Math.round(props.scale));
  let imageData: ImageData | null = null;
  let fgR = 0;
  let fgG = 0;
  let fgB = 0;
  let fgA = 0;
  let mutedR = 0;
  let mutedG = 0;
  let mutedB = 0;
  let mutedA = 0;
  let bgR = 0;
  let bgG = 0;
  let bgB = 0;
  let bgA = 0;
  let cachedSeed = props.seed;
  let seedState = deriveSeed(props.seed);

  const sheet = scope(host);
  // The field and the pane draw on one canvas in an under layer, below the wrapped content and above the
  // page's ground. The canvas is the only place the field exists, which is what lets the pane pass the same
  // dots through at a lower density instead of faking a blur.
  const under = layer(host, "under");
  const surface = createCanvas(under.el, {
    autoSize: false,
    css: "image-rendering:pixelated",
    onResize: () => {
      layout();
      loop.redraw();
    },
  });
  const canvas = surface.canvas;
  const ctx = canvas.getContext("2d");

  // Everything the core adds lands after the children the page wrapped, so a page can put its own heading
  // first, or let the headline prop do it, or both.
  const headline = document.createElement("h1");
  headline.setAttribute("data-pica", "");
  headline.setAttribute("data-part", "headline");
  const subhead = document.createElement("p");
  subhead.setAttribute("data-pica", "");
  subhead.setAttribute("data-part", "subhead");
  const actions = document.createElement("div");
  actions.setAttribute("data-pica", "");
  actions.setAttribute("data-part", "actions");
  host.append(headline, subhead, actions);

  function syncInk(): void {
    [fgR, fgG, fgB, fgA] = parseColor(palette.colors.fg);
    [mutedR, mutedG, mutedB, mutedA] = parseColor(palette.colors.muted);
    [bgR, bgG, bgB, bgA] = parseColor(palette.colors.bg);
  }

  const palette = watchPalette(host, () => {
    syncInk();
    loop.redraw();
  });
  syncInk();

  /** Recomputes the low-resolution grid from the host and `scale`, capped so a huge host cannot outgrow the
   *  frame budget. Returns true when the size actually changed. */
  function layout(): boolean {
    const w = surface.cssWidth;
    const h = surface.cssHeight;
    const px = Math.max(1, Math.round(props.scale), Math.ceil(Math.sqrt((w * h) / MAX_CELLS)));
    const c = Math.max(1, Math.round(w / px));
    const r = Math.max(1, Math.round(h / px));
    if (c === cols && r === rows && imageData) return false;
    cols = c;
    rows = r;
    pixel = px;
    canvas.width = cols;
    canvas.height = rows;
    imageData = ctx ? ctx.createImageData(cols, rows) : null;
    return true;
  }

  /** The pane hugs the content block: the union of everything the host holds, the wrapped children and the
   *  core's own parts alike, minus the layer the canvas lives in. Each child's own box comes back as a
   *  clear rect, the ground the screen leaves bare so the type keeps full contrast: the canvas sits under
   *  the content, but a dot under a glyph still reads through it, so the screen decorates the space
   *  around the content and never the content itself. Read every frame, so the pane follows the content
   *  however it reflows. */
  function measurePane(): { pane: Pane; clears: Pane[] } | null {
    const origin = under.el.getBoundingClientRect();
    let x0 = Number.POSITIVE_INFINITY;
    let y0 = Number.POSITIVE_INFINITY;
    let x1 = Number.NEGATIVE_INFINITY;
    let y1 = Number.NEGATIVE_INFINITY;
    const clears: Pane[] = [];
    for (const el of Array.from(host.children)) {
      if (el === under.el) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      if (r.left < x0) x0 = r.left;
      if (r.top < y0) y0 = r.top;
      if (r.right > x1) x1 = r.right;
      if (r.bottom > y1) y1 = r.bottom;
      clears.push({
        x0: Math.max(0, Math.floor((r.left - origin.left) / pixel) - CLEAR_BLEED),
        y0: Math.max(0, Math.floor((r.top - origin.top) / pixel) - CLEAR_BLEED),
        x1: Math.min(cols, Math.ceil((r.right - origin.left) / pixel) + CLEAR_BLEED),
        y1: Math.min(rows, Math.ceil((r.bottom - origin.top) / pixel) + CLEAR_BLEED),
      });
    }
    if (x1 <= x0 || y1 <= y0) return null;
    const edge = Math.min(EDGE_PAD, Math.max(0, Math.floor(cols / 2) - 1));
    const edgeY = Math.min(EDGE_PAD, Math.max(0, Math.floor(rows / 2) - 1));
    const pane = {
      x0: Math.max(edge, Math.floor((x0 - origin.left - PANEL_PAD) / pixel)),
      y0: Math.max(edgeY, Math.floor((y0 - origin.top - PANEL_PAD) / pixel)),
      x1: Math.min(cols - edge, Math.ceil((x1 - origin.left + PANEL_PAD) / pixel)),
      y1: Math.min(rows - edgeY, Math.ceil((y1 - origin.top + PANEL_PAD) / pixel)),
    };
    return pane.x1 - pane.x0 >= 3 && pane.y1 - pane.y0 >= 3 ? { pane, clears } : null;
  }

  function renderText(): void {
    headline.textContent = props.headline;
    subhead.textContent = props.subhead;
  }

  /** Rebuilds the action links from JSON: the first solid, the rest outline, in source order. */
  function renderActions(): void {
    actions.replaceChildren();
    for (const [i, action] of props.actions.slice(0, 3).entries()) {
      const a = document.createElement("a");
      a.setAttribute("data-pica", "");
      a.dataset.variant = i === 0 ? "solid" : "outline";
      a.href = action.href;
      a.textContent = action.label;
      actions.append(a);
    }
  }

  function draw(t: number): void {
    const context = ctx;
    const data = imageData;
    if (!context || !data) {
      host.dataset.picaReady = "true";
      return;
    }
    if (props.seed !== cachedSeed) {
      cachedSeed = props.seed;
      seedState = deriveSeed(cachedSeed);
    }
    const measured = measurePane();
    const pane = measured?.pane ?? null;
    const clears = measured?.clears ?? NO_CLEARS;
    const buf = data.data;
    const norm = Math.max(cols, rows);
    const freq = NOISE_FEATURES / norm;
    const timeS = t * 0.001 * props.speed;
    const ox = timeS * DRIFT_X;
    const oy = timeS * DRIFT_Y;
    const oz = seedState.z0 + timeS * DRIFT_Z;
    const peak = PEAK_TONE * clamp01(props.intensity);
    const keep = 1 - clamp01(props.frost);
    const noise = seedState.noise;
    const bayer = bayerMatrix(BAYER_SIZE);
    const grain = blueNoiseMatrix(GRAIN_SIZE);
    const px0 = pane?.x0 ?? 1;
    const py0 = pane?.y0 ?? 1;
    const px1 = pane?.x1 ?? 0;
    const py1 = pane?.y1 ?? 0;
    const glaze = bgA > 0;

    function put(o: number, r: number, g: number, b: number, a: number): void {
      buf[o] = r;
      buf[o + 1] = g;
      buf[o + 2] = b;
      buf[o + 3] = a;
    }

    let i = 0;
    for (let y = 0; y < rows; y++) {
      const ny = (y + 0.5) * freq + oy;
      const grainRow = (y % GRAIN_SIZE) * GRAIN_SIZE;
      const bayerRow = (y % BAYER_SIZE) * BAYER_SIZE;
      for (let x = 0; x < cols; x++) {
        const o = i * 4;
        i++;
        // A child's own box stays bare ground: the screen is painted behind the type, so a dot would
        // still read through translucent strokes and crowd opaque ones. Content keeps full contrast.
        let clear = false;
        for (const c of clears) {
          if (x >= c.x0 && x < c.x1 && y >= c.y0 && y < c.y1) {
            clear = true;
            break;
          }
        }
        if (clear) {
          put(o, 0, 0, 0, 0);
          continue;
        }
        const inside = x >= px0 && x < px1 && y >= py0 && y < py1;
        if (inside && (x === px0 || x === px1 - 1 || y === py0 || y === py1 - 1)) {
          // The pane's edge is one hairline, brighter along the top and the left, so it reads as a rim the
          // light catches rather than as a shadow it casts.
          if (x === px0 || y === py0) put(o, fgR, fgG, fgB, fgA);
          else put(o, mutedR, mutedG, mutedB, mutedA);
          continue;
        }
        const n = noise.noise3((x + 0.5) * freq + ox, ny, oz) * 0.5 + 0.5;
        let v = (n - MASK_LO) / (MASK_HI - MASK_LO);
        v = v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v);
        v *= peak;
        if (inside) {
          // Frost as a screened translucency: the same field, the same mask, a smaller share of its dots,
          // so what the pane covers still draws through it, sparser. Under them sits a flat step of fg and,
          // when the page sets it, a glaze in bg, which is what makes the pane a surface and not a hole.
          const g = grain[grainRow + (x % GRAIN_SIZE)] ?? 0.5;
          const b = bayer[bayerRow + (x % BAYER_SIZE)] ?? 0.5;
          if (v * keep >= g) put(o, mutedR, mutedG, mutedB, mutedA);
          else if (b <= STEP_TONE) put(o, fgR, fgG, fgB, fgA);
          else if (glaze && b <= GLAZE_TONE) put(o, bgR, bgG, bgB, bgA);
          else put(o, 0, 0, 0, 0);
        } else {
          const g = grain[grainRow + (x % GRAIN_SIZE)] ?? 0.5;
          if (v >= g) put(o, mutedR, mutedG, mutedB, mutedA);
          else put(o, 0, 0, 0, 0);
        }
      }
    }
    context.putImageData(data, 0, 0);
    host.dataset.picaReady = "true";
  }

  sheet.setRules(rules(sheet.selector, props));
  renderText();
  renderActions();
  layout();
  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: STILL_TIME, frame: (t) => draw(t) });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.headline !== before.headline || props.subhead !== before.subhead) renderText();
      if (!sameJson(before.actions, props.actions)) renderActions();
      if (props.align !== before.align || props.minHeight !== before.minHeight) sheet.setRules(rules(sheet.selector, props));
      if (props.scale !== before.scale) layout();
      if (palette.refresh()) syncInk();
      loop.update({ paused: props.paused, time: props.time, fps: props.fps });
    },
    destroy() {
      loop.destroy();
      palette.destroy();
      surface.destroy();
      under.remove();
      headline.remove();
      subhead.remove();
      actions.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};
