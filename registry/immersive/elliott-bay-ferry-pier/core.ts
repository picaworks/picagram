import { createCanvas } from "../../../lib/canvas";
import { hostAttributes } from "../../../lib/host";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { createPixelScene, pixelBox, pixelPrism, type PixelFace, type PixelView } from "../../../lib/pixel-scene";
import type { Mount, MotionProps } from "../../../lib/types";

export interface ElliottBayFerryPierProps extends MotionProps {
  /** Pier and shoreline arrangement around the clear ferry corridor. */
  layout: "finger" | "seawall" | "fork";
  /** Structural bays supporting the landing, from three to five. */
  berthLength: number;
  /** Water height, changing exposed piles and the landing ramp slope. */
  waterLevel: number;
}
export const defaults: ElliottBayFerryPierProps = {
  layout: "finger", berthLength: 5, waterLevel: 0.45, paused: false, time: null, seed: 1,
};
const ferryView: PixelView = { bounds: [[-7.1, -5.7, -0.7], [7.2, 6, 5.3]], yaw: 45, elevation: 30 };

export const mount: Mount<ElliottBayFerryPierProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  attrs.set("role", null);
  attrs.set("aria-label", null);
  attrs.set("aria-hidden", "true");
  attrs.set("data-pica-ready", host.getAttribute("data-pica-ready"));
  let fixed: PixelFace[] = [];
  let water = 0;
  let destroyed = false;
  const surface = createCanvas(host, { autoSize: false, css: "image-rendering:pixelated", onResize: () => { resize(); loop.redraw(); } });
  const scene = createPixelScene(surface.canvas);
  const palette = watchPalette(host, () => loop.redraw());
  function resize(): void {
    const w = surface.cssWidth, h = surface.cssHeight;
    const scale = Math.max(3, Math.ceil(w / 360), Math.ceil(h / 300));
    const c = surface.canvas;
    c.width = Math.max(1, Math.floor(w / scale));
    c.height = Math.max(1, Math.floor(h / scale));
    Object.assign(c.style, { width: `${c.width * scale}px`, height: `${c.height * scale}px`, left: `${Math.floor((w - c.width * scale) / 2)}px`, top: `${Math.floor((h - c.height * scale) / 2)}px`, right: "auto", bottom: "auto" });
  }
  function rebuild(): void {
    fixed = [];
    const bays = Math.max(3, Math.min(5, Math.round(props.berthLength)));
    water = 0.05 + Math.max(0, Math.min(1, props.waterLevel)) * 0.8;
    const deck = 1.65;
    const box = (x: number, y: number, z: number, w: number, d: number, h: number, tone = 0.65): void => pixelBox(fixed, [x,y,z], [w,d,h], { tone, edge: true });
    const pile = (x: number, y: number): void => {
      box(x - 0.13, y - 0.13, -0.4, 0.26, 0.26, deck + 0.28, 0.52);
      box(x - 0.25, y - 0.22, deck + 0.05, 0.5, 0.44, 0.2, 0.85);
    };
    pixelPrism(fixed, [[-6.7,-3.8],[-5.3,-5.2],[5.7,-5.2],[6.8,-3.8],[6.8,3.8],[4.8,5.5],[-5.8,5.5],[-6.7,3.2]], -0.65, water + 0.65, { ink: "accent", tone: 0.45 });
    let shedX = -2.8, shedY = 2.1;
    let rampX = -2.3;
    if (props.layout === "seawall") {
      box(-6.1, -3.9, -0.5, 1.3, 8.8, 2.15, 0.4);
      box(-4.8, 3.7, -0.5, 6.8, 1.5, 2.15, 0.4);
      box(-4.8, 0.25, deck - 0.2, 2.5 + bays * 0.8, 1.25, 0.25, 0.7);
      for (let i = 0; i <= bays; i++) pile(-4.55 + i * 1.12, 0.65);
      box(-4.6, 1.2, deck - 0.2, 1.2, 3, 0.25);
      box(-3.4, 3.2, deck - 0.2, 3, 2, 0.25);
      shedX = -3.1; shedY = 3.55;
      rampX = -1.7;
    } else if (props.layout === "fork") {
      box(-3.1, 3.7, -0.5, 5.6, 1.5, 2.15, 0.4);
      box(-1.45, 0.8, deck - 0.2, 2.9, 3.5, 0.25);
      const reach = 1.5 + bays * 0.55;
      pixelPrism(fixed, [[-0.75,1.4],[-reach,0.35],[-reach,-0.45],[0.1,0.6]], deck - 0.2, 0.25, { tone: 0.7, edge: true });
      pixelPrism(fixed, [[-0.1,0.6],[reach,-0.45],[reach,0.35],[0.75,1.4]], deck - 0.2, 0.25, { tone: 0.7, edge: true });
      for (let i = 0; i < bays; i++) {
        const x = 1.15 + i * 0.65;
        pile(-x, 0.45); pile(x, 0.45);
      }
      shedX = -1.2; shedY = 1.9;
      rampX = -2.6;
    } else {
      box(-5.5, 3.6, -0.5, 6.4, 1.6, 2.15, 0.4);
      box(-4.4, 0.15, deck - 0.2, bays * 1.35, 1.2, 0.25, 0.7);
      box(-4.4, 1.2, deck - 0.2, 4.4, 3.1, 0.25);
      pile(-2.8, 2.4); pile(-0.3, 3.3);
      for (let i = 0; i <= bays; i++) { pile(-4.15 + i * 1.25, 0.35); pile(-4.15 + i * 1.25, 1.1); }
    }
    // A broad landing ramp changes slope with the water, stopping before the clear corridor.
    fixed.push({ points: [[rampX,-0.75,water + 0.48],[rampX+1.7,-0.75,water+0.48],[rampX+1.7,0.3,deck+0.08],[rampX,0.3,deck+0.08]], tone: 0.85, edge: true });
    // Open sides and a deep roof make a passenger waiting shelter, not a cargo box.
    for (const x of [shedX, shedX + 2.2]) for (const y of [shedY, shedY + 1.25]) box(x, y, deck, 0.17, 0.17, 1.35, 0.72);
    box(shedX, shedY + 1.25, deck, 2.37, 0.12, 0.7, 0.4);
    box(shedX + 0.3, shedY + 0.95, deck + 0.35, 1.7, 0.27, 0.18, 0.7);
    fixed.push(
      { points: [[shedX-0.2,shedY-0.2,deck+1.35],[shedX+2.55,shedY-0.2,deck+1.35],[shedX+2.55,shedY+0.7,deck+1.85],[shedX-0.2,shedY+0.7,deck+1.85]], tone: 0.82, edge: true },
      { points: [[shedX-0.2,shedY+0.7,deck+1.85],[shedX+2.55,shedY+0.7,deck+1.85],[shedX+2.55,shedY+1.65,deck+1.35],[shedX-0.2,shedY+1.65,deck+1.35]], tone: 0.55, edge: true },
    );
    for (let i = 0; i < 4; i++) box(0.8 + i * 0.35, 3.75, water + 0.06, 0.35, 1, (deck - water - 0.06) * (1 - i * 0.22), 0.6);
  }
  function draw(t: number): void {
    const moving: PixelFace[] = [];
    const phase = ((t / 1000 + 1.4 + (Math.max(1, Math.min(99, props.seed)) - 1) * 0.13) % 8 + 8) % 8;
    const travel = phase < 3.6 ? phase / 3.6 : phase < 4 ? 1 : phase < 7.6 ? 1 - (phase - 4) / 3.6 : 0;
    const x = 3.5 - travel * 4.7;
    const y = -2.7;
    pixelPrism(moving, [[x-2.3,y-0.5],[x-1.9,y-0.85],[x+1.9,y-0.85],[x+2.3,y-0.5],[x+2.3,y+0.5],[x+1.9,y+0.85],[x-1.9,y+0.85],[x-2.3,y+0.5]], water - 0.18, 0.58, { tone: 0.64, edge: true });
    pixelBox(moving, [x-1.85,y-0.73,water+0.4], [3.7,1.46,0.13], { tone: 0.9, edge: true });
    pixelBox(moving, [x-1.25,y-0.48,water+0.53], [2.5,0.96,0.65], { tone: 0.7 });
    pixelBox(moving, [x-1.42,y-0.59,water+1.18], [2.84,1.18,0.13], { tone: 0.9 });
    pixelBox(moving, [x-0.53,y-0.4,water+1.31], [1.06,0.8,0.43], { tone: 0.78 });
    pixelBox(moving, [x-0.68,y-0.51,water+1.74], [1.36,1.02,0.12], { tone: 0.92 });
    for (const side of [-1,1]) {
      const sy = y + side * 0.49;
      moving.push({ points: [[x-1.1,sy,water+0.83],[x+1.1,sy,water+0.83],[x+1.1,sy,water+1.04],[x-1.1,sy,water+1.04]], tone: 0.15 });
      const end = x + side * 2.55;
      const inner = x + side * 1.8;
      moving.push({ points: [[inner,y-0.64,water+0.54],[end,y-0.64,water+0.48],[end,y+0.64,water+0.48],[inner,y+0.64,water+0.54]], tone: 0.87, edge: true });
    }
    scene.draw(fixed, moving, palette.colors, ferryView);
    attrs.set("data-pica-ready", "true");
  }
  resize();
  rebuild();
  const loop = createLoop({ el: host, fps: 12, paused: props.paused, time: props.time, still: 1200, frame: draw });
  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.layout !== before.layout || props.berthLength !== before.berthLength || props.waterLevel !== before.waterLevel) rebuild();
      palette.refresh();
      loop.update({ paused: props.paused, time: props.time });
      loop.redraw();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      loop.destroy();
      palette.destroy();
      surface.destroy();
      attrs.restore();
    },
  };
};
