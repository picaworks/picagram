import { createCanvas } from "../../../lib/canvas";
import { hostAttributes } from "../../../lib/host";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { createPixelScene, pixelBox, pixelPrism, pixelRod, type PixelFace, type PixelPoint, type PixelView } from "../../../lib/pixel-scene";
import type { Mount, MotionProps } from "../../../lib/types";

export interface ShopLaneProps extends MotionProps {
  /** Arrangement of deep shops around a continuous walking lane. */
  layout: "dogleg" | "gate-court" | "bridge-lane";
  /** Distinct shop fronts, from two to four. */
  frontages: number;
  /** Zero to two overhead beam bays projecting from the shop eaves. */
  canopyDepth: number;
}
export const defaults: ShopLaneProps = {
  layout: "dogleg", frontages: 3, canopyDepth: 1, paused: false, time: null, seed: 1,
};
const shopLaneView: PixelView = { bounds: [[-5.9,-5.1,-0.8],[6.3,5,5.9]], yaw: 45, elevation: 30 };

export const mount: Mount<ShopLaneProps> = (host, initial = {}) => {
  let props = { ...defaults,...initial };
  const attrs = hostAttributes(host);
  attrs.set("role",null);
  attrs.set("aria-label",null);
  attrs.set("aria-hidden","true");
  attrs.set("data-pica-ready",host.getAttribute("data-pica-ready"));
  let fixed: PixelFace[] = [];
  let screen: PixelFace[] = [];
  let destroyed = false;
  const surface = createCanvas(host,{ autoSize: false, css: "image-rendering:pixelated", onResize: () => { resize(); loop.redraw(); } });
  const scene = createPixelScene(surface.canvas);
  const palette = watchPalette(host,() => loop.redraw());
  function resize(): void {
    const w = surface.cssWidth,h = surface.cssHeight;
    const scale = Math.max(3,Math.ceil(w/360),Math.ceil(h/300));
    const c = surface.canvas;
    c.width = Math.max(1,Math.floor(w/scale));
    c.height = Math.max(1,Math.floor(h/scale));
    Object.assign(c.style,{ width: `${c.width*scale}px`, height: `${c.height*scale}px`, left: `${Math.floor((w-c.width*scale)/2)}px`, top: `${Math.floor((h-c.height*scale)/2)}px`, right: "auto", bottom: "auto" });
  }
  function box(x: number,y: number,z: number,w: number,d: number,h: number,tone = 0.6): void {
    pixelBox(fixed,[x,y,z],[w,d,h],{ tone, edge: true });
  }
  function shop(x: number,y: number,w: number,d: number,h: number,clerestory = false): void {
    box(x,y,0.5,w,d,h,0.58);
    const z = h+0.5;
    if (clerestory) {
      box(x-0.12,y-0.12,z,w+0.24,d+0.24,0.15,0.85);
      box(x+0.3,y+0.3,z+0.15,w-0.6,d-0.6,0.45,0.5);
      box(x+0.17,y+0.2,z+0.6,w-0.34,d-0.4,0.13,0.85);
    } else fixed.push(
      { points: [[x-0.12,y-0.12,z],[x+w/2,y-0.12,z+0.8],[x+w/2,y+d+0.12,z+0.8],[x-0.12,y+d+0.12,z]], tone: 0.85, edge: true },
      { points: [[x+w/2,y-0.12,z+0.8],[x+w+0.12,y-0.12,z],[x+w+0.12,y+d+0.12,z],[x+w/2,y+d+0.12,z+0.8]], tone: 0.52, edge: true },
      { points: [[x-0.12,y+d+0.12,z],[x+w+0.12,y+d+0.12,z],[x+w/2,y+d+0.12,z+0.8]], tone: 0.68 },
      { points: [[x-0.12,y-0.12,z],[x+w+0.12,y-0.12,z],[x+w/2,y-0.12,z+0.8]], tone: 0.68 },
    );
    fixed.push(
      { points: [[x+0.3,y+d+0.015,0.5],[x+0.95,y+d+0.015,0.5],[x+0.95,y+d+0.015,1.9],[x+0.3,y+d+0.015,1.9]], tone: 0.18 },
      { points: [[x+1.15,y+d+0.015,1],[x+w-0.2,y+d+0.015,1],[x+w-0.2,y+d+0.015,2.1],[x+1.15,y+d+0.015,2.1]], tone: 0.25 },
      { points: [[x+w+0.015,y+0.4,1.4],[x+w+0.015,y+d-0.35,1.4],[x+w+0.015,y+d-0.35,2.2],[x+w+0.015,y+0.4,2.2]], tone: 0.22 },
    );
  }
  function bicycle(): void {
    for (const cx of [3.15,4.25]) for (let i = 0; i < 8; i++) {
      const a = i*Math.PI/4,b = (i+1)*Math.PI/4;
      const p = (r: number,t: number): PixelPoint => [cx+r*Math.cos(t),3.9,0.86+r*Math.sin(t)];
      fixed.push({ points: [p(0.36,a),p(0.36,b),p(0.29,b),p(0.29,a)], tone: 0.8 });
    }
    const rod = (a: PixelPoint,b: PixelPoint): void => pixelRod(fixed,a,b,0.045,{ tone: 0.75 },4);
    rod([3.15,3.9,0.86],[3.55,3.9,1.32]);
    rod([3.55,3.9,1.32],[3.75,3.9,0.86]);
    rod([3.75,3.9,0.86],[3.15,3.9,0.86]);
    rod([3.55,3.9,1.32],[4.1,3.9,1.35]);
    rod([4.1,3.9,1.35],[4.25,3.9,0.86]);
    rod([3.43,3.9,1.4],[3.74,3.9,1.4]);
    rod([4.06,3.9,1.35],[4.02,3.9,1.6]);
  }
  function rebuild(): void {
    fixed = [];
    screen = [];
    const count = Math.max(2,Math.min(4,Math.round(props.frontages)));
    const depth = Math.max(0,Math.min(2,Math.round(props.canopyDepth)));
    const bridge = props.layout==="bridge-lane";
    const gate = props.layout==="gate-court";
    pixelPrism(fixed,[[-5.5,-4.7],[5.6,-4.7],[6,-3.7],[6,4.3],[4.8,4.7],[-5.5,4.7]],-0.65,1.15,{ tone: 0.23 });
    // The lane turns around the foreground shop, then continues between unequal rear masses.
    box(-5.2,2.32,0.51,8.1,1.3,0.025,0.4);
    box(1.5,-4.5,0.51,1.8,6.82,0.025,0.4);
    // The larger near shop has an actual open counter recess rather than a face decal.
    box(-5,-0.3,0.5,6.4,0.18,2.15,0.3);
    box(-5,-0.3,0.5,0.22,2.3,2.15,0.65);
    box(1.18,-0.3,0.5,0.22,2.3,2.15,0.65);
    box(-5,-0.3,0.5,6.4,2.3,0.08,0.35);
    box(-5.15,-0.45,2.65,6.7,2.65,0.17,0.8);
    box(-4.65,1.37,0.58,2.55,0.45,0.67,0.64);
    box(-4.72,1.32,1.25,2.69,0.58,0.12,0.92);
    box(-4.45,0.05,0.58,0.45,0.35,1.4,0.48);
    box(-3.55,0.05,0.58,0.9,0.35,1.15,0.54);
    // A front cover and end wall form a storage pocket immediately beside the opening.
    box(-1.68,2.2,0.58,3.08,0.16,1.94,0.56);
    box(1.25,1.96,0.58,0.15,0.4,1.94,0.7);
    box(-1.8,2.17,0.55,0.12,0.23,2.02,0.84);
    box(-4.85,2.04,0.54,6.25,0.15,0.1,0.85);
    box(-4.85,2.04,2.48,6.25,0.15,0.1,0.85);
    for (let i = 0; i < 3; i++) box(-1.45+i*0.9,2.365,0.78,0.035,0.015,1.55,0.36);
    shop(-5,-4.5,3.2,3.2,bridge?2.6:3.0,false);
    if (count>2) shop(3.35,bridge?-4.55:-3.5,2.25,bridge?1.25:gate?4.8:4.1,3.15,true);
    if (count>3) shop(-0.35,-4.6,1.85,bridge?1.45:1.6,2.8,false);
    if (bridge) {
      box(3.35,-3.1,0.5,2.15,1.8,2.6,0.5);
      box(-1.8,-2.9,3.1,5.3,1.2,1.03,0.57);
      box(-1.95,-3.02,4.13,5.6,1.44,0.18,0.82);
      fixed.push({ points: [[-1.25,-1.685,3.4],[2.8,-1.685,3.4],[2.8,-1.685,3.82],[-1.25,-1.685,3.82]], tone: 0.22 });
      for (let i = 0; i < 8; i++) box(4.25,2.2-i*0.5,0.5,1.1,0.5,2.6*(i+1)/8,0.63);
    } else {
      for (let i = 0; i < 8; i++) box(-1.7,-0.8-i*0.5,0.5,1.1,0.5,2.1*(i+1)/8,0.63);
      box(-1.95,-4.6,2.45,1.35,0.3,0.15,0.7);
      fixed.push({ points: [[-1.785,-4.35,2.6],[-1.785,-3.95,2.6],[-1.785,-3.95,3.45],[-1.785,-4.35,3.45]], tone: 0.2 });
    }
    if (gate) {
      box(-3.8,4,0.5,0.22,0.22,2.35,0.7);
      box(4.7,4,0.5,0.22,0.22,2.35,0.7);
      box(-3.95,3.92,2.85,8.95,0.38,0.25,0.8);
    }
    for (let i = 0; i < depth; i++) {
      const y = 2.45+i*0.4;
      box(-4.9,y,2.56,6.35,0.12,0.12,0.75);
      for (const x of [-4.85,1.35]) box(x,1.95,2.56,0.12,y-1.8,0.12,0.72);
    }
    box(-5.1,3.0,0.5,1.1,0.65,0.3,0.55);
    box(-4.98,3.12,0.8,0.86,0.4,0.4,0.72);
    bicycle();
    pixelBox(screen,[-4.65,2.08,0.64],[2.85,0.08,1.79],{ ink: "accent", tone: 0.78, edge: true });
    for (let i = 0; i < 4; i++) pixelBox(screen,[-4.45+i*0.72,2.17,0.64],[0.07,0.035,1.79],{ tone: 0.65 });
    for (const z of [0.64,2.34]) pixelBox(screen,[-4.65,2.17,z],[2.85,0.035,0.09],{ tone: 0.8 });
    pixelBox(screen,[-2.03,2.21,1.25],[0.08,0.06,0.36],{ tone: 0.9 });
  }
  function draw(t: number): void {
    const phase = ((t/1000+1.3+(Math.max(1,Math.min(99,props.seed))-1)*0.16)%10+10)%10;
    const travel = phase<4.6 ? phase/4.6 : phase<5 ? 1 : phase<9.6 ? 1-(phase-5)/4.6 : 0;
    const offset = travel*2.98;
    const moving: PixelFace[] = screen.map(f => ({ ...f, points: f.points.map(([x,y,z]) => [x+offset,y,z] as const) }));
    scene.draw(fixed,moving,palette.colors,shopLaneView);
    attrs.set("data-pica-ready","true");
  }
  resize();
  rebuild();
  const loop = createLoop({ el: host, fps: 12, paused: props.paused, time: props.time, still: 1200, frame: draw });
  return {
    update(next) {
      const before = props;
      props = { ...props,...next };
      if (props.layout!==before.layout || props.frontages!==before.frontages || props.canopyDepth!==before.canopyDepth) rebuild();
      palette.refresh();
      loop.update({ paused: props.paused,time: props.time });
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
