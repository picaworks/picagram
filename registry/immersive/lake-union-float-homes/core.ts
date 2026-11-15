import { createCanvas } from "../../../lib/canvas";
import { hostAttributes } from "../../../lib/host";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { createPixelScene, pixelBox, pixelPrism, pixelRod, type PixelFace, type PixelPoint, type PixelView } from "../../../lib/pixel-scene";
import type { Mount, MotionProps } from "../../../lib/types";

export interface LakeUnionFloatHomesProps extends MotionProps {
  /** Arrangement of connected decks around the open inlet. */
  layout: "comb" | "inlet" | "islands";
  /** Floating homes, from three to five. */
  homes: number;
  /** Fraction of each garden bed occupied by planting. */
  gardenCover: number;
}
export const defaults: LakeUnionFloatHomesProps = {
  layout: "comb", homes: 3, gardenCover: 0.35, paused: false, time: null, seed: 1,
};
const floatHomeView: PixelView = { bounds: [[-7,-5,-0.7],[6.5,6,4.2]], yaw: 45, elevation: 30 };

export const mount: Mount<LakeUnionFloatHomesProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  attrs.set("role", null);
  attrs.set("aria-label", null);
  attrs.set("aria-hidden", "true");
  attrs.set("data-pica-ready", host.getAttribute("data-pica-ready"));
  let fixed: PixelFace[] = [];
  let floating: PixelFace[] = [];
  let hingeY = -0.75;
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
    Object.assign(c.style, { width: `${c.width * scale}px`, height: `${c.height * scale}px`, left: `${Math.floor((w-c.width*scale)/2)}px`, top: `${Math.floor((h-c.height*scale)/2)}px`, right: "auto", bottom: "auto" });
  }
  function home(x: number, y: number, style: number, facing = 0): void {
    const local: PixelFace[] = [];
    pixelBox(local, [0,0,0.85], [1.55,1.5,1.15], { tone: 0.67, edge: true });
    const left = style % 3 === 1 ? 2.4 : style % 3 === 2 ? 2.4 : 2;
    const middle = style % 3 === 2 ? 2.07 : 2.55;
    const right = style % 3 === 1 ? 2.04 : style % 3 === 2 ? 2.4 : 2;
    if (style % 3 === 1) {
      local.push({ points: [[-0.12,-0.1,left],[1.67,-0.1,right],[1.67,1.6,right],[-0.12,1.6,left]], tone: 0.85, edge: true });
    } else {
      local.push(
        { points: [[-0.12,-0.1,left],[0.775,-0.1,middle],[0.775,1.6,middle],[-0.12,1.6,left]], tone: 0.88, edge: true },
        { points: [[0.775,-0.1,middle],[1.67,-0.1,right],[1.67,1.6,right],[0.775,1.6,middle]], tone: 0.54, edge: true },
      );
    }
    // Split the end walls into convex faces, including the butterfly profile.
    for (const v of [-0.1,1.6]) {
      const ridge = style % 3 === 1 ? (left + right) / 2 : middle;
      local.push(
        { points: [[-0.12,v,2],[0.775,v,2],[0.775,v,ridge],[-0.12,v,left]], tone: 0.62 },
        { points: [[0.775,v,2],[1.67,v,2],[1.67,v,right],[0.775,v,ridge]], tone: 0.62 },
      );
    }
    local.push(
      { points: [[0.63,-0.012,0.85],[1.03,-0.012,0.85],[1.03,-0.012,1.7],[0.63,-0.012,1.7]], tone: 0.18 },
      { points: [[0.13,-0.014,1.35],[0.45,-0.014,1.35],[0.45,-0.014,1.7],[0.13,-0.014,1.7]], tone: 0.24 },
    );
    // Broad opposite and side panels stay beyond the actual wall planes after every facing transform.
    local.push(
      { points: [[0.17,1.525,1.16],[1.38,1.525,1.16],[1.38,1.525,1.82],[0.17,1.525,1.82]], tone: 0.22 },
      { points: [[1.575,0.16,1.16],[1.575,1.34,1.16],[1.575,1.34,1.82],[1.575,0.16,1.82]], tone: 0.24 },
    );
    if (facing === -1) local.push(
      { points: [[1.12,-0.026,1.15],[1.47,-0.026,1.15],[1.47,-0.026,1.82],[1.12,-0.026,1.82]], tone: 0.22 },
    );
    const cover = Math.sqrt(Math.max(0, Math.min(1, props.gardenCover)));
    if (cover > 0) {
      // Each planted mass occupies a visible existing deck edge and leaves the landward door clear.
      if (facing === -1) pixelBox(local, [1.13,-0.55,0.85], [0.35*cover,0.43*cover,0.42], { tone: 0.78 });
      else if (facing === 1) pixelBox(local, [0.12,1.56,0.85], [1.3*cover,0.17*cover,0.42], { tone: 0.78 });
      else pixelBox(local, [0.17,1.6,0.85], [1.2*cover,0.27*cover,0.42], { tone: 0.78 });
    }
    for (const f of local) floating.push({ ...f, points: f.points.map(([u,v,z]) => [x + (facing === 0 ? u : facing * v), y + (facing === 0 ? v : u), z] as const) });
  }
  function rebuild(): void {
    fixed = [];
    floating = [];
    const count = Math.max(3, Math.min(5, Math.round(props.homes)));
    const deck = (x: number, y: number, w: number, d: number): void => pixelBox(floating, [x,y,0.48], [w,d,0.37], { tone: 0.48, edge: true });
    pixelPrism(fixed, [[-6.7,-3.5],[-5.5,-4.5],[4.8,-4.5],[6,-3.3],[6,4.8],[4.9,5.5],[-5.7,5.5],[-6.7,4.3]], -0.65, 0.87, { ink: "accent", tone: 0.46 });
    hingeY = props.layout === "inlet" ? -2 : -0.75;
    pixelBox(fixed, [-6.6,hingeY-0.8,-0.65], [1.6,2.2,2.05], { tone: 0.43, edge: true });
    if (props.layout === "inlet") {
      deck(-4.8,-2.5,10,1);
      deck(-5.4,-1.5,2.6,6.6);
      deck(2.8,-1.5,2.6,6.6);
      for (let i = 0; i < count; i++) {
        const side = i % 2;
        home(side ? 3.65 : -3.65, -0.8 + Math.floor(i / 2) * 2.05, i, side ? 1 : -1);
      }
    } else if (props.layout === "islands") {
      deck(-4.8,-1.2,4.1,4.5);
      deck(1,-0.2,4.4,5.2);
      deck(-0.7,-0.2,1.7,0.8);
      home(-4.4,0.4,0);
      home(-2.35,1,1);
      for (let i = 2; i < count; i++) home(i === 4 ? 2.4 : 1.25 + (i-2)*2.2, i === 4 ? 3 : 0.7, i);
    } else {
      deck(-4.8,-1.2,10,1);
      for (let i = 0; i < count; i++) {
        const x = -4.6 + i * 8 / (count-1);
        const y = 0.65 + (i%2)*0.5;
        deck(x-0.15,-0.2,1.85,y+1.95);
        home(x,y,i);
      }
    }
    for (const x of [-5.1,5.6]) pixelBox(fixed, [x-0.12,hingeY-0.12,-0.45], [0.24,0.24,2.05], { tone: 0.75, edge: true });
  }
  function draw(t: number): void {
    const swell = Math.sin(t / 1000 * 1.45 + (Math.max(1,Math.min(99,props.seed))-1)*0.19) * 0.18;
    const z = 0.85 + swell;
    const moving: PixelFace[] = floating.map(f => ({ ...f, points: f.points.map(([x,y,h]) => [x,y,h+swell] as const) }));
    // The shore hinge is fixed. The opposite edge follows the deck exactly.
    moving.push({ points: [[-5,hingeY-0.4,1.4],[-4.25,hingeY-0.4,z],[-4.25,hingeY+0.4,z],[-5,hingeY+0.4,1.4]], tone: 0.83, edge: true });
    const rightY = props.layout === "islands" ? 0.1 : hingeY;
    for (const [a,b] of [
      [[-5.1,hingeY,1.48],[-4.65,hingeY,z+0.08]],
      [[5.6,hingeY,1.48],[5.05,rightY,z+0.08]],
    ] as const) pixelRod(moving, a as PixelPoint, b as PixelPoint, 0.045, { tone: 0.7 }, 4);
    scene.draw(fixed,moving,palette.colors,floatHomeView);
    attrs.set("data-pica-ready","true");
  }
  resize();
  rebuild();
  const loop = createLoop({ el: host, fps: 12, paused: props.paused, time: props.time, still: 1200, frame: draw });
  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.layout !== before.layout || props.homes !== before.homes || props.gardenCover !== before.gardenCover) rebuild();
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
