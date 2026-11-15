import { createCanvas } from "../../../lib/canvas";
import { hostAttributes } from "../../../lib/host";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { createPixelScene, pixelPrism, pixelRod, type PixelFace, type PixelPoint, type PixelView } from "../../../lib/pixel-scene";
import type { Mount, MotionProps } from "../../../lib/types";

export interface PixelWindGroveProps extends MotionProps {
  /** Arrangement of the old tree, its roots and its smaller companion. */
  layout: "splitCedar" | "leaningPine" | "rootArch";
  /** Crown width as a fraction of the finite root plate. */
  crownSpan: number;
  /** Restrained displacement of the upper boughs in the shared wind. */
  wind: number;
}
export const defaults: PixelWindGroveProps = {
  layout: "splitCedar", crownSpan: 0.75, wind: 0.45,
  paused: false, time: null, seed: 1,
};
type GroveBough = { x: number; y: number; z: number; width: number; depth: number; height: number; delay: number };
const groveView: PixelView = { bounds: [[-7, -5, -1], [7, 5, 12]], ground: 0.74 };

/** Uneven clipped boughs overlap into a continuous hanging foliage silhouette. */
function groveCrown(out: PixelFace[], x: number, y: number, z: number, w: number, d: number, h: number): void {
  const mass = (cx: number, cy: number, bottom: number, width: number, depth: number, height: number, tone: number): void => {
    pixelPrism(out, [
      [cx - width * 0.5, cy - depth * 0.15],
      [cx - width * 0.25, cy - depth * 0.5],
      [cx + width * 0.3, cy - depth * 0.45],
      [cx + width * 0.5, cy + depth * 0.1],
      [cx + width * 0.25, cy + depth * 0.5],
      [cx - width * 0.4, cy + depth * 0.4],
    ], bottom, height, { ink: "accent", tone, shadow: true });
  };
  mass(x, y, z, w, d, h * 0.65, 0.72);
  mass(x - w * 0.24, y + d * 0.12, z - h * 0.36, w * 0.53, d * 0.72, h * 0.78, 0.64);
  mass(x + w * 0.16, y - d * 0.08, z + h * 0.43, w * 0.64, d * 0.78, h * 0.7, 0.86);
}

export const mount: Mount<PixelWindGroveProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  attrs.set("role", null);
  attrs.set("aria-label", null);
  attrs.set("aria-hidden", "true");
  const surface = createCanvas(host, { autoSize: false, css: "image-rendering:pixelated", onResize: () => { resize(); loop.redraw(); } });
  const scene = createPixelScene(surface.canvas);
  const palette = watchPalette(host, () => loop.redraw());
  let staticFaces: PixelFace[] = [];
  let boughs: GroveBough[] = [];
  let destroyed = false;
  function resize(): void {
    const w = surface.cssWidth, h = surface.cssHeight;
    const scale = Math.max(3, Math.ceil(w / 360), Math.ceil(h / 300));
    surface.canvas.width = Math.max(1, Math.floor(w / scale));
    surface.canvas.height = Math.max(1, Math.floor(h / scale));
    Object.assign(surface.canvas.style, { width: `${surface.canvas.width * scale}px`, height: `${surface.canvas.height * scale}px`, left: `${Math.floor((w - surface.canvas.width * scale) / 2)}px`, top: `${Math.floor((h - surface.canvas.height * scale) / 2)}px`, right: "auto", bottom: "auto" });
  }
  function rebuild(): void {
    staticFaces = [];
    boughs = [];
    const s = Math.max(0.55, Math.min(0.85, props.crownSpan)) / 0.75;
    const rod = (a: PixelPoint, b: PixelPoint, r: number): void => pixelRod(staticFaces, a, b, r, { tone: 0.7, shadow: true }, 6);
    pixelPrism(staticFaces, [[-6,-3],[-4,-4],[4,-4],[6,-2],[6,2],[4,4],[-4,4],[-6,2]], -0.7, 1.3, { tone: 0.25 });
    pixelPrism(staticFaces, [[-5.8,-2.8],[-3.8,-3.8],[3.8,-3.8],[5.8,-1.8],[5.8,1.8],[3.8,3.8],[-3.8,3.8],[-5.8,1.8]], 0.6, 0.14, { tone: 0.23 });
    // The low moss shelf stays quiet beneath the foliage.
    pixelPrism(staticFaces, [[-4,-1],[-2,-2.4],[1,-2.4],[2,-0.8],[0.5,0.3],[-3,0.7]], 0.75, 0.12, { tone: 0.31 });
    pixelPrism(staticFaces, [[1.8,-2.3],[3.5,-2.5],[4.2,-1.4],[3.7,-0.5],[2.1,-0.7]], 0.75, 0.65, { tone: 0.48 });
    // The stump has a real open center rather than a translucent cap.
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, b = (i + 1) * Math.PI / 4;
      pixelPrism(staticFaces, [[-0.1+0.8*Math.cos(a),2.1+0.8*Math.sin(a)],[-0.1+0.8*Math.cos(b),2.1+0.8*Math.sin(b)],[-0.1+0.43*Math.cos(b),2.1+0.43*Math.sin(b)],[-0.1+0.43*Math.cos(a),2.1+0.43*Math.sin(a)]], 0.75, 0.9 + (i % 3) * 0.1, { tone: 0.6 });
    }
    const add = (x: number, y: number, z: number, width: number, depth: number, height: number, delay = 0): void => { boughs.push({ x, y, z, width: width*s, depth, height, delay }); };
    if (props.layout === "leaningPine") {
      rod([-2.7,-1.7,0.75],[-1.5,-1.7,5],0.48);
      rod([-1.5,-1.7,5],[0,-1.7,9],0.28);
      add(-1.4,-1.7,5.1,7.1,2.8,1.1);
      add(-0.7,-1.7,7.2,6.4,2.5,1);
      add(0.2,-1.7,9.1,4.6,2.2,1.1);
      rod([3,2,0.75],[3,2,3.1],0.28);
      add(3,2,3.2,2.6,2.1,1.3,0.28);
    } else if (props.layout === "rootArch") {
      rod([-3,0,0.75],[-2.3,0,2.9],0.62);
      rod([1.5,0,0.75],[0.8,0,2.9],0.62);
      rod([-2.3,0,2.9],[-0.7,0,4.2],0.65);
      rod([0.8,0,2.9],[-0.7,0,4.2],0.65);
      rod([-0.7,0,4.2],[-2.1,0,5.4],0.5);
      rod([-0.7,0,4.2],[1.3,-0.5,6.5],0.36);
      add(-2.1,0,5.4,6,3.2,1.3);
      add(1.3,-0.5,6.5,4.1,2.7,1.2,0.1);
      rod([3.6,2,0.75],[3.6,2,2.6],0.26);
      add(3.6,2,2.8,2.6,2,1.2,0.28);
    } else {
      rod([-1,0,0.75],[-1.3,0,4.8],0.68);
      rod([-1.3,0,4.8],[-3,0,7.1],0.42);
      rod([-1.3,0,4.8],[0.8,-0.5,8.8],0.34);
      add(-3,0,7,5.1,3.2,1.5);
      add(0.9,-0.5,9.1,4.2,2.9,1.4,0.1);
      rod([3.1,2,0.75],[3.1,2,3.9],0.3);
      add(3.1,2,4,2.9,2.4,1.4,0.28);
    }
    // Roots keep the entire lower mass visibly locked into the plate.
    const rootX = props.layout === "leaningPine" ? -2.7 : -1;
    for (const [x,y] of [[-4,1],[-2,-2],[1,1.8]] as const) rod([rootX,0,1.5],[x,y,0.78],0.25);
  }
  function draw(t: number): void {
    const moving: PixelFace[] = [];
    const phase = t / 1000 * 1.9 + (Math.max(1, Math.min(99, props.seed)) - 1) * 0.19;
    const wind = Math.max(0.15, Math.min(0.8, props.wind));
    for (const b of boughs) {
      const sway = Math.sin(phase - b.delay) * wind * 0.8;
      pixelRod(moving, [b.x,b.y,b.z-0.5], [b.x+sway,b.y+sway*0.16,b.z+0.3], 0.19, { tone: 0.67 }, 6);
      groveCrown(moving, b.x+sway, b.y+sway*0.16, b.z, b.width, b.depth, b.height);
    }
    scene.draw(staticFaces, moving, palette.colors, groveView);
    attrs.set("data-pica-ready", "true");
  }
  resize();
  rebuild();
  const loop = createLoop({ el: host, fps: 12, paused: props.paused, time: props.time, still: 700, frame: draw });
  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.layout !== before.layout || props.crownSpan !== before.crownSpan) rebuild();
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
