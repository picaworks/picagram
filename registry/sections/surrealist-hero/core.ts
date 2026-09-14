import * as ditherWaves from "../../dither/dither-waves/core";
import { createCanvas } from "../../../lib/canvas";
import { layer, scope } from "../../../lib/host";
import { changed, sameJson } from "../../../lib/json";
import { createLoop } from "../../../lib/loop";
import { cssOn, cssVar, watchPalette } from "../../../lib/palette";
import { createRng } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

export interface SurrealistHeroAction {
  /** Text on the link. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface SurrealistHeroProps extends MotionProps {
  /** The large line at the top of the section. Empty leaves it out. */
  headline: string;
  /** The smaller line under the headline. Empty leaves it out. */
  subhead: string;
  /** Calls to action, drawn as links. The first draws solid in the accent, the rest draw outline. */
  actions: readonly SurrealistHeroAction[];
  /** Horizontal alignment of the content column within the host. */
  align: "start" | "center";
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
  /** How strongly the dithered sea shows, from 0 to 1. */
  intensity: number;
  /** Height of the lower waterline, in percent of the host's height. */
  horizon: number;
  /** Height of the wall of water, in percent of the host's height. The upper waterline sits this far above the lower. */
  step: number;
  /** Where the wall of water stands, in percent of the host's width. */
  seam: number;
  /** CSS pixels each dithered cell covers, passed to the sea. */
  scale: number;
  /** How fast the sea drifts, passed through to its own speed. 0 holds it still. */
  speed: number;
}

export const defaults: SurrealistHeroProps = {
  headline: "The sea stands at two heights.",
  subhead: "The same water meets the sky at two levels, and the sun reflects in the wrong shape.",
  actions: [
    { label: "See the components", href: "#components" },
    { label: "How it is built", href: "#docs" },
  ],
  align: "start",
  minHeight: 78,
  intensity: 0.45,
  horizon: 66,
  step: 22,
  seam: 58,
  scale: 4,
  speed: 0.45,
  paused: false,
  time: null,
  seed: 1,
};

/** The frame shown under reduced motion, in milliseconds of animation time. */
const SURREAL_STILL = 1200;
/** Seconds for one of the sun's slow drifts. The x and y periods differ, so the path never quite repeats. */
const SUN_PERIOD_X = 97;
const SUN_PERIOD_Y = 71;
/** How far the sun wanders, as a share of the host on each axis. Slow and low, so the drift is noticed rather than announced. */
const SUN_DRIFT_X = 0.016;
const SUN_DRIFT_Y = 0.02;

/** A fraction clamped inside the host, for the waterline and wall positions. */
function share(value: number, lo: number, hi: number): number {
  const v = value / 100;
  return v < lo ? lo : v > hi ? hi : v;
}

/** The three heights the scene is built from: the lower waterline, the upper waterline, and the wall's x. */
interface SurrealGeo {
  seamX: number;
  upperY: number;
  lowerY: number;
}

function geometry(p: SurrealistHeroProps): SurrealGeo {
  const lowerY = share(p.horizon, 0.3, 0.9);
  const upperY = Math.max(0.06, lowerY - share(p.step, 0.05, 0.6));
  return { seamX: share(p.seam, 0.25, 0.8), upperY, lowerY };
}

/** The L-shaped region the one sea fills: below the lower waterline on the left of the wall, below the
 *  upper waterline on the right. One continuous field, so the water reads as the same water on both sides
 *  of a step it cannot take. */
function seaClip(geo: SurrealGeo): string {
  const seam = geo.seamX * 100;
  const upper = geo.upperY * 100;
  const lower = geo.lowerY * 100;
  return `polygon(0% ${lower}%, ${seam}% ${lower}%, ${seam}% ${upper}%, 100% ${upper}%, 100% 100%, 0% 100%)`;
}

/** Props for the composed sea: near-horizontal wave trains screened into a few flat tones, so the water
 *  reads as banded dither rather than static. */
function seaProps(p: SurrealistHeroProps): Partial<typeof ditherWaves.defaults> {
  return {
    paused: p.paused,
    time: p.time,
    seed: p.seed,
    trains: 3,
    period: 60,
    spread: 7,
    angle: 90,
    levels: 3,
    mask: "cluster",
    pixel: p.scale,
    speed: p.speed,
    fps: 15,
  };
}

/** The sea's share of the intensity. The field has no strength prop of its own, so its whole layer is
 *  dimmed instead, which fades every band evenly toward the ground. Kept well under the type: the water
 *  is the ground the contradiction stands on, and a background at full intensity is a bug, so at its
 *  loudest it still reads as tone rather than as a lit slab. */
function seaOpacity(intensity: number): string {
  return (0.05 + Math.min(1, Math.max(0, intensity)) * 0.25).toFixed(3);
}

/** Where the sun hangs and where its reflection falls, from animation time and the seed. The sun sits low
 *  over the lower sea, in the open sky under the content, and the reflection mirrors it across the lower
 *  waterline exactly; only its shape is impossible. */
function sunAt(t: number, phase: number, geo: SurrealGeo): { x: number; y: number } {
  const cx = geo.seamX * 0.5;
  const cy = Math.max(0.08, geo.lowerY - 0.11);
  const angle = t * 0.001;
  return {
    x: cx + SUN_DRIFT_X * Math.sin((angle / SUN_PERIOD_X) * Math.PI * 2 + phase * 5.1),
    y: cy + SUN_DRIFT_Y * Math.sin((angle / SUN_PERIOD_Y) * Math.PI * 2 + phase * 9.7),
  };
}

/** Layout for the host and the button grammar for its calls to action, from STYLE.md: the first action
 *  solid in the accent, the rest outline, square corners, and a hairline focus ring. The minimum height
 *  goes in a :where() rule, which carries no specificity, so a page that gives this host a height of its
 *  own wins without having to fight an inline style. */
function surrealRules(selector: string, p: SurrealistHeroProps): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  const edge = p.align === "center" ? "center" : "flex-start";
  const textAlign = p.align === "center" ? "center" : "start";
  const vh = Math.min(100, Math.max(30, p.minHeight));
  return [
    `:where(${selector}){min-height:${vh}vh}`,
    `${selector}{position:relative;box-sizing:border-box;display:flex;flex-direction:column;justify-content:flex-start;align-items:${edge};padding:clamp(1.5rem,5vw,4rem);padding-top:clamp(2.5rem,8vh,5rem)}`,
    `${selector} > :not([data-pica]){max-width:38rem;text-align:${textAlign}}`,
    `${selector} > [data-pica-lede]{display:flex;flex-direction:column;gap:0.55em;max-width:38rem;text-align:${textAlign};align-items:${edge};margin-bottom:0.8em}`,
    `${selector} > [data-pica-lede] [data-pica-headline]{margin:0;font-size:clamp(2rem,5.2vw,3.6rem);line-height:1.05;font-weight:600;letter-spacing:-0.015em;max-width:15em}`,
    `${selector} > [data-pica-lede] [data-pica-headline]:empty{display:none}`,
    `${selector} > [data-pica-lede] [data-pica-subhead]{margin:0;font-size:clamp(0.95rem,1.3vw,1.1rem);line-height:1.5;color:${muted};max-width:32em}`,
    `${selector} > [data-pica-lede] [data-pica-subhead]:empty{display:none}`,
    `${selector} > [data-pica-actions]{display:flex;flex-wrap:wrap;align-items:center;gap:0.75em;max-width:38rem;margin-top:1em;justify-content:${edge}}`,
    `${selector} > [data-pica-actions]:empty{display:none}`,
    `${selector} > [data-pica-actions] a{appearance:none;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.6em 1.25em;display:inline-flex;align-items:center;border:1px solid transparent;border-radius:0;cursor:pointer}`,
    `${selector} > [data-pica-actions] a[data-variant="solid"]{background:${accent};color:${cssOn("accent")}}`,
    `${selector} > [data-pica-actions] a[data-variant="outline"]{background:transparent;color:${fg};border-color:${fg}}`,
    `${selector} > [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${accent} 85%, ${fg})}`,
    `${selector} > [data-pica-actions] a[data-variant="outline"]:hover{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${selector} > [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
  ].join("\n");
}

/** Rebuilds the action links from JSON: the first solid, the rest outline, in source order. */
function renderSurrealActions(container: HTMLElement, actions: readonly SurrealistHeroAction[]): void {
  container.replaceChildren();
  for (const [i, action] of actions.entries()) {
    const a = document.createElement("a");
    a.setAttribute("data-pica", "");
    a.dataset.variant = i === 0 ? "solid" : "outline";
    a.href = action.href;
    a.textContent = action.label;
    container.append(a);
  }
}

export const mount: Mount<SurrealistHeroProps> = (host, initial = {}) => {
  let props: SurrealistHeroProps = { ...defaults, ...initial };
  const sheet = scope(host);

  // Each under-layer prepends, so the sea's host lands first in the DOM and paints at the bottom, the
  // drawing layer over it, then the page's own children and the calls to action.
  const drawLayer = layer(host, "under");
  const seaLayer = layer(host, "under");
  seaLayer.el.style.clipPath = seaClip(geometry(props));
  seaLayer.el.style.opacity = seaOpacity(props.intensity);
  const sea = ditherWaves.mount(seaLayer.el, seaProps(props));

  const lede = document.createElement("div");
  lede.setAttribute("data-pica", "");
  lede.setAttribute("data-pica-lede", "");
  const headlineEl = document.createElement("p");
  headlineEl.setAttribute("data-pica", "");
  headlineEl.setAttribute("data-pica-headline", "");
  const subheadEl = document.createElement("p");
  subheadEl.setAttribute("data-pica", "");
  subheadEl.setAttribute("data-pica-subhead", "");
  lede.append(headlineEl, subheadEl);
  host.prepend(lede);

  const actions = document.createElement("div");
  actions.setAttribute("data-pica", "");
  actions.setAttribute("data-pica-actions", "");
  host.append(actions);

  let phase = 0;
  let phaseSeed = Number.NaN;
  function sunPhase(): number {
    if (phaseSeed !== props.seed) {
      phaseSeed = props.seed;
      phase = createRng(props.seed)() * Math.PI * 2;
    }
    return phase;
  }

  function drawSurrealFrame(t: number): void {
    const context = ctx;
    if (!context) {
      host.dataset.picaReady = "true";
      return;
    }
    const w = surface.cssWidth;
    const h = surface.cssHeight;
    const dpr = surface.dpr;
    const geo = geometry(props);
    const seamX = geo.seamX * w;
    const upperY = geo.upperY * h;
    const lowerY = geo.lowerY * h;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, w, h);

    // The horizon that does not meet itself: one stepped hairline, waterline, wall, waterline.
    context.fillStyle = palette.colors.fg;
    const line = Math.max(1, Math.round(dpr)) / dpr;
    context.fillRect(0, Math.round(lowerY * dpr) / dpr, seamX, line);
    context.fillRect(Math.round(seamX * dpr) / dpr, Math.round(upperY * dpr) / dpr, line, lowerY - upperY);
    context.fillRect(seamX, Math.round(upperY * dpr) / dpr, w - seamX, line);

    // The sun, a solid accent disc drifting slowly, and its reflection below the lower waterline, which
    // takes the wrong silhouette: a square in muted on the same axis a true reflection would sit.
    const sun = sunAt(t, sunPhase(), geo);
    const r = Math.min(34, Math.max(14, Math.min(w, h) * 0.042));
    const sunX = sun.x * w;
    const sunY = sun.y * h;
    context.fillStyle = palette.colors.accent;
    context.beginPath();
    context.arc(sunX, sunY, r, 0, Math.PI * 2);
    context.fill();

    const side = r * 1.5;
    const sqTop = Math.round((2 * lowerY - sunY - side / 2) * dpr) / dpr;
    const sqLeft = Math.round((sunX - side / 2) * dpr) / dpr;
    context.fillStyle = palette.colors.muted;
    context.fillRect(Math.round(sunX * dpr) / dpr, sunY + r, line, Math.max(0, sqTop - (sunY + r)));
    context.fillRect(sqLeft, sqTop, side, side);
    context.fillStyle = palette.colors.fg;
    context.fillRect(sqLeft, sqTop, side, line);
    context.fillRect(sqLeft, sqTop + side - line, side, line);
    context.fillRect(sqLeft, sqTop, line, side);
    context.fillRect(sqLeft + side - line, sqTop, line, side);
    host.dataset.picaReady = "true";
  }

  const surface = createCanvas(drawLayer.el, {
    onResize: () => loop.redraw(),
  });
  const ctx = surface.canvas.getContext("2d");

  const palette = watchPalette(host, () => loop.redraw());

  sheet.setRules(surrealRules(sheet.selector, props));
  headlineEl.textContent = props.headline;
  subheadEl.textContent = props.subhead;
  renderSurrealActions(actions, props.actions);
  const loop = createLoop({ el: host, fps: 15, paused: props.paused, time: props.time, still: SURREAL_STILL, frame: drawSurrealFrame });
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };

      if (changed(before, props, ["paused", "time", "seed", "scale", "speed"])) {
        sea.update(seaProps(props));
      }
      if (props.intensity !== before.intensity) {
        seaLayer.el.style.opacity = seaOpacity(props.intensity);
      }
      if (changed(before, props, ["horizon", "step", "seam", "seed"])) {
        seaLayer.el.style.clipPath = seaClip(geometry(props));
        loop.redraw();
      }
      if (props.paused !== before.paused || props.time !== before.time) {
        loop.update({ paused: props.paused, time: props.time });
      }
      if (props.align !== before.align || props.minHeight !== before.minHeight) {
        sheet.setRules(surrealRules(sheet.selector, props));
      }
      if (props.headline !== before.headline) headlineEl.textContent = props.headline;
      if (props.subhead !== before.subhead) subheadEl.textContent = props.subhead;
      if (!sameJson(before.actions, props.actions)) renderSurrealActions(actions, props.actions);
      palette.refresh();
    },
    destroy() {
      loop.destroy();
      sea.destroy();
      surface.destroy();
      palette.destroy();
      seaLayer.remove();
      drawLayer.remove();
      lede.remove();
      actions.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};
