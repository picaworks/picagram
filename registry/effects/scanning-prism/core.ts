import { createCanvas } from "../../../lib/canvas";
import { hostAttributes, nextId, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar, watchPalette } from "../../../lib/palette";
import { hashSeed } from "../../../lib/rng";
import type { MotionProps, Mount } from "../../../lib/types";

export interface ScanningPrismProps extends MotionProps {
  /** Motion rate multiplier, clamped from 0.2 to 2. */
  speed: number;
  /** Printed mark opacity, clamped from 0.1 to 0.65. */
  opacity: number;
  /** Mechanical detail scale, clamped from 0.6 to 1.8. */
  scale: number;
}

export const defaults: ScanningPrismProps = { speed: 1, opacity: 0.34, scale: 1, paused: false, time: null, seed: 1 };

/** An offset triangular prism translates diagonal hatch into quiet parallel optical strands. */
export const mount: Mount<ScanningPrismProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let localPaused = props.paused;
  const motion: { loop?: Loop } = {};
  let destroyed = false;
  const attrs = hostAttributes(host);
  const restore = styleHost(host, { isolation: "isolate" });
  const id = nextId("material");
  attrs.set("data-pica-material", id);
  const sheet = document.createElement("style");
  sheet.setAttribute("data-pica", "");
  host.append(sheet);
  const rules = {
    selector: `[data-pica-material="${id}"]`,
    setRules(css: string): void { sheet.textContent = css; },
    destroy(): void { sheet.remove(); },
  };
  rules.setRules(`
    ${rules.selector} > [data-pica-pause] { position:absolute;right:16px;bottom:16px;min-height:44px;padding:8px 12px;border:1px solid ${cssVar("fg")};background:${cssVar("bg")};color:${cssVar("fg")};font:inherit;cursor:pointer;z-index:2; }
    ${rules.selector} > [data-pica-pause]:focus-visible { outline:2px solid ${cssVar("fg")};outline-offset:3px; }
    ${rules.selector} > [data-demo-copy] { position:absolute;left:50%;top:48%;transform:translate(-50%,-50%);width:min(540px,60%); }
    ${rules.selector} > [data-demo-copy] h2 { font-size:clamp(26px,4vw,52px);line-height:1.08;font-weight:500;margin:14px 0 20px; }
    ${rules.selector} > [data-demo-copy] p { line-height:1.6;max-width:42ch; }
    ${rules.selector} > [data-demo-copy] a { color:inherit;text-underline-offset:5px; }
  `);
  const surface = createCanvas(host, { maxDpr: 1.5, maxPixels: 1100000, css: "z-index:-1", onResize: () => motion.loop?.redraw() });
  const ctx = surface.canvas.getContext("2d");
  const palette = watchPalette(host, () => motion.loop?.redraw());
  const pause = document.createElement("button");
  pause.type = "button";
  pause.setAttribute("data-pica", "");
  pause.setAttribute("data-pica-pause", "");
  host.append(pause);
  function syncButton(): void {
    pause.textContent = localPaused ? "Resume motion" : "Pause motion";
    pause.setAttribute("aria-label", `${localPaused ? "Resume" : "Pause"} scanning prism motion`);
    pause.setAttribute("aria-pressed", String(localPaused));
  }
  const toggle = (): void => { localPaused = !localPaused; syncButton(); motion.loop?.update({ paused: localPaused }); };
  pause.addEventListener("click", toggle);
  syncButton();

  function draw(ms: number): void {
    if (!ctx || destroyed) return;
    const w = surface.cssWidth, h = surface.cssHeight;
    ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const scale = Math.max(.6, Math.min(1.8, props.scale));
    const opacity = Math.max(.1, Math.min(.65, props.opacity));
    const m = Math.min(248, Math.max(28, w < 600 ? w * .115 : w * .2));
    const phase = hashSeed(props.seed, 17) / 4294967295 * Math.PI * 2;
    for (let side = 0; side < 2; side++) {
      ctx.save();
      ctx.translate(side ? w : 0, 0); ctx.scale(side ? -1 : 1, 1);
      ctx.beginPath(); ctx.rect(0, 0, m, h); ctx.clip();
      ctx.lineWidth = 1;
      const t = ms * .00035 * Math.max(.2, Math.min(2, props.speed)) + phase + side * .9;
      function line(x: number, y: number, x2: number, y2: number): void { ctx!.beginPath(); ctx!.moveTo(x, y); ctx!.lineTo(x2, y2); ctx!.stroke(); }
      function polygon(points: number[][]): void { ctx!.beginPath(); for (let j = 0; j < points.length; j++) { const point = points[j]!; if (j === 0) ctx!.moveTo(point[0]!, point[1]!); else ctx!.lineTo(point[0]!, point[1]!); } ctx!.closePath(); }
    const cy = h * (.45 + .09 * Math.sin(t * .5)), extent = Math.min(m * .75, 135 * scale);
    const left = m * .12, right = left + extent;
    ctx.strokeStyle = palette.colors.fg; ctx.globalAlpha = opacity * .55;
    for (let j = -6; j < 7; j++) {
      const y = cy + j * 14 * scale;
      line(0, y - left * .45, left, y);
      line(right, y + (right - left) * .08, m, y + (right - left) * .08);
    }
    ctx.globalAlpha = opacity * .22; ctx.fillStyle = palette.colors.fg;
    polygon([[left, cy - extent * .7], [right, cy], [left, cy + extent * .7]]); ctx.fill();
    ctx.globalAlpha = opacity; ctx.stroke();
    ctx.save(); polygon([[left, cy - extent * .7], [right, cy], [left, cy + extent * .7]]); ctx.clip();
    ctx.globalAlpha = opacity * .65;
    for (let j = -9; j < 10; j++) line(left, cy + j * 10 * scale, right, cy + j * 10 * scale + extent * .08);
    ctx.restore();
      ctx.restore();
    }
    attrs.set("data-pica-ready", "true");
  }
  motion.loop = createLoop({ el: host, paused: localPaused, time: props.time, fps: 18, still: 1200, frame: draw });
  return {
    update(next) {
      props = { ...props, ...next };
      if (next.paused !== undefined) localPaused = next.paused;
      syncButton(); palette.refresh();
      motion.loop?.update({ paused: localPaused, time: props.time, fps: 18 }); motion.loop?.redraw();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true; motion.loop?.destroy();
      pause.removeEventListener("click", toggle); pause.remove();
      palette.destroy(); surface.destroy(); rules.destroy(); attrs.restore(); restore();
    },
  };
};
