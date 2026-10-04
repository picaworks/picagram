import { createCanvas } from "../../../lib/canvas";
import { hostAttributes, nextId, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar, watchPalette } from "../../../lib/palette";
import { hashSeed } from "../../../lib/rng";
import type { MotionProps, Mount } from "../../../lib/types";

export interface InkErosionProps extends MotionProps {
  /** Motion rate multiplier, clamped from 0.2 to 2. */
  speed: number;
  /** Printed mark opacity, clamped from 0.1 to 0.65. */
  opacity: number;
  /** Mechanical detail scale, clamped from 0.6 to 1.8. */
  scale: number;
}

export const defaults: InkErosionProps = { speed: 1, opacity: 0.34, scale: 1, paused: false, time: null, seed: 1 };

/** Geometric printed bands lose and regain small edge cells through a slow structured erosion front. */
export const mount: Mount<InkErosionProps> = (host, initial = {}) => {
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
    pause.setAttribute("aria-label", `${localPaused ? "Resume" : "Pause"} ink erosion motion`);
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
    const band = 84 * scale;
    ctx.fillStyle = palette.colors.fg;
    for (let j = 0; j < Math.min(22, Math.ceil(h / band)); j++) {
      const y = j * band + 12, left = 8 + (j % 3) * m * .09, right = m - 10;
      ctx.globalAlpha = opacity * .45; ctx.fillRect(left + 10, y + 8, Math.max(1, right - left - 20), band * .45 - 16);
      for (let k = 0; k < Math.min(70, Math.ceil((right - left) / 4)); k++) {
        const x = left + k * 4;
        const grain = hashSeed(props.seed, j * 100 + k, side) / 4294967295;
        const front = .5 + .32 * Math.sin(t * .6 + x / 40 + j * .7);
        for (let edge = 0; edge < 4; edge++) {
          ctx.globalAlpha = opacity * .65 * Math.max(0, Math.min(1, (grain + edge * .13 - front) * 5 + .3));
          ctx.fillRect(x, y + edge * 3, 3, 2);
          ctx.globalAlpha = opacity * .65 * Math.max(0, Math.min(1, (grain + edge * .13 - (1 - front)) * 5 + .3));
          ctx.fillRect(x, y + band * .45 - edge * 3, 3, 2);
        }
      }
    }
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
