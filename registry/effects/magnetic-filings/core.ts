import { createCanvas } from "../../../lib/canvas";
import { hostAttributes, nextId, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar, watchPalette } from "../../../lib/palette";
import { createRng } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

export interface MagneticFilingsProps extends MotionProps {
  /** Distance between dipole filings in CSS pixels. */
  pitch: number;
  /** Seconds for one slow traversal of the field. */
  period: number;
  /** Ink strength of the decorative geometry, from zero to one. */
  opacity: number;
  /** Show a native keyboard accessible pause toggle below the field. */
  showPause: boolean;
  /** Frames per second ceiling, bounded between twelve and twenty four. */
  fps: number;
}

export const defaults: MagneticFilingsProps = {
  pitch: 26, period: 24, opacity: .38, fps: 18, showPause: true, paused: false, time: null, seed: 1,
};

export const mount: Mount<MagneticFilingsProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let loop: Loop | null = null;
  let destroyed = false;
  const attrs = hostAttributes(host);
  const fieldId = nextId("pica-field");
  attrs.set("data-pica-field", fieldId);
  const undo = styleHost(host, { isolation: "isolate" });
  const sheet = document.createElement("style");
  sheet.setAttribute("data-pica", "");
  host.append(sheet);
  const sel = `[data-pica-field="${fieldId}"]`;
  // These rules style only the authored demo class; wrapped consumer content remains page-owned.
  sheet.textContent = `
    ${sel} > .field-note{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(540px,calc(100% - 112px));line-height:1.6}
    ${sel} .field-note h2{font:inherit;font-weight:500;font-size:clamp(30px,4vw,48px);line-height:1.1;margin:16px 0 22px;letter-spacing:-.035em}
    ${sel} .field-note .field-index{font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase}
    ${sel} .field-note p{margin:16px 0;max-width:48ch}
    ${sel} .field-note details{font-size:13px;margin-top:24px}
    ${sel} .field-note summary{cursor:pointer;list-style-position:inside}
    ${sel} > [data-pica-pause]{position:absolute;left:24px;bottom:24px;z-index:2;font:inherit;font-size:12px;background:transparent;color:${cssVar("fg")};border:1px solid ${cssVar("fg")};padding:8px 12px;cursor:pointer}
    ${sel} > [data-pica-pause]:focus-visible{outline:2px solid ${cssVar("accent")};outline-offset:4px}
    ${sel} .field-note summary:focus-visible{outline:2px solid ${cssVar("accent")};outline-offset:5px}
  `;
  const redraw = () => loop?.redraw();
  const surface = createCanvas(host, { maxDpr: 1.5, maxPixels: 1600000, css: "z-index:-1", onResize: redraw });
  const ctx = surface.canvas.getContext("2d")!;
  const palette = watchPalette(host, redraw);

  const pause = document.createElement("button");
  pause.setAttribute("data-pica", "");
  pause.setAttribute("data-pica-pause", "");
  pause.type = "button";
  pause.textContent = "Pause animation";
  const syncPause = () => {
    pause.hidden = !props.showPause;
    pause.setAttribute("aria-pressed", String(props.paused));
  };
  const togglePause = () => {
    props = { ...props, paused: !props.paused };
    syncPause();
    loop?.update({ paused: props.paused });
  };
  pause.addEventListener("click", togglePause);
  host.append(pause);
  syncPause();

  function draw(t: number): void {
    const w = surface.cssWidth, h = surface.cssHeight;
    ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
    ctx.clearRect(0,0,w,h);
    ctx.save();
    // A geometric exclusion remains empty on every frame, so copy has a stable reading ground.
    ctx.beginPath(); ctx.rect(0,0,w,h); ctx.rect(w*.14,h*.2,w*.72,h*.6); ctx.clip("evenodd");
    const colors = palette.colors;
    const opacity = Math.max(0,Math.min(1,props.opacity));
    ctx.globalAlpha = opacity; ctx.strokeStyle = colors.fg; ctx.fillStyle = colors.fg; ctx.lineWidth = 1;
    const phase = createRng(props.seed)() * Math.PI * 2;
    const s = ((t / (Math.max(12,props.period) * 1000)) % 1 + 1) % 1;
    

    const pitch = Math.max(20, Math.min(48, props.pitch), w / 60, h / 60);
    const poles = [[w * (.16 + .035 * Math.sin(s * 6.283 + phase)), h * .24], [w * (.83 + .035 * Math.cos(s * 6.283 + phase)), h * .76]];
    for (let y = pitch / 2; y < h; y += pitch) for (let x = pitch / 2; x < w; x += pitch) {
      let vx = 0, vy = 0;
      poles.forEach((p, i) => {
        const dx = x - p[0]!, dy = y - p[1]!, d = Math.pow(dx * dx + dy * dy + 160, 1.5);
        vx += (i ? -1 : 1) * dx / d; vy += (i ? -1 : 1) * dy / d;
      });
      const a = Math.atan2(vy, vx), dx = Math.cos(a) * 7, dy = Math.sin(a) * 7;
      ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); ctx.stroke();
    }
    ctx.strokeStyle = colors.accent; ctx.lineWidth = 2;
    poles.forEach(p => { ctx.beginPath(); ctx.arc(p[0]!, p[1]!, 10, 0, Math.PI * 2); ctx.stroke(); });

    ctx.restore();
    attrs.set("data-pica-ready", "true");
  }
  loop = createLoop({ el: host, fps: Math.max(12,Math.min(24,props.fps)), paused: props.paused, time: props.time, still: 1200, frame: draw });
  return {
    update(next) {
      if (destroyed) return;
      props = { ...props, ...next }; palette.refresh(); syncPause();
      loop?.update({ paused: props.paused, time: props.time, fps: Math.max(12,Math.min(24,props.fps)) }); loop?.redraw();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true; pause.removeEventListener("click", togglePause); pause.remove(); loop?.destroy(); palette.destroy(); surface.destroy(); sheet.remove(); undo(); attrs.restore();
    },
  };
};
