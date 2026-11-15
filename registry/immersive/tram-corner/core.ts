import { createCanvas } from "../../../lib/canvas";
import { hostAttributes } from "../../../lib/host";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { createPixelScene, pixelBox, pixelPrism, pixelRod, type PixelFace, type PixelPoint, type PixelView } from "../../../lib/pixel-scene";
import type { Mount, MotionProps } from "../../../lib/types";

export interface TramCornerProps extends MotionProps {
  /** Arrangement of rail bend, corner block and passenger stop. */
  layout: "corner-bend" | "square-loop-edge" | "raised-crossing";
  /** One or two physically coupled tram bodies. */
  carriages: number;
  /** Masonry block storeys, from one to three. */
  blockHeight: number;
}
export const defaults: TramCornerProps = {
  layout: "corner-bend", carriages: 1, blockHeight: 3, paused: false, time: null, seed: 1,
};
const tramCornerView: PixelView = { bounds: [[-6.8,-6,-0.8],[6.6,6.6,6.4]], yaw: 45, elevation: 30 };
type TramPose = { x: number; y: number; a: number };

export const mount: Mount<TramCornerProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  attrs.set("role",null);
  attrs.set("aria-label",null);
  attrs.set("aria-hidden","true");
  attrs.set("data-pica-ready",host.getAttribute("data-pica-ready"));
  let fixed: PixelFace[] = [];
  let count = 1;
  let radius = 6;
  let center = -2;
  let start = -0.15;
  let finish = 1.72;
  let railZ = 0.64;
  let destroyed = false;
  const surface = createCanvas(host,{ autoSize: false, css: "image-rendering:pixelated", onResize: () => { resize(); loop.redraw(); } });
  const scene = createPixelScene(surface.canvas);
  const palette = watchPalette(host,() => loop.redraw());
  function resize(): void {
    const w = surface.cssWidth, h = surface.cssHeight;
    const scale = Math.max(3,Math.ceil(w/360),Math.ceil(h/300));
    const c = surface.canvas;
    c.width = Math.max(1,Math.floor(w/scale));
    c.height = Math.max(1,Math.floor(h/scale));
    Object.assign(c.style,{ width: `${c.width*scale}px`, height: `${c.height*scale}px`, left: `${Math.floor((w-c.width*scale)/2)}px`, top: `${Math.floor((h-c.height*scale)/2)}px`, right: "auto", bottom: "auto" });
  }
  function point(a: number, r: number, z: number): PixelPoint { return [center+r*Math.cos(a),center+r*Math.sin(a),z]; }
  function block(x: number, y: number, w: number, d: number, floors: number, arcade = false): void {
    const h = 1.1+floors*0.85;
    const base = arcade ? 1.6 : 0.5;
    pixelBox(fixed,[x,y,base],[w,d,h+0.5-base],{ tone: 0.48, edge: true });
    if (arcade) for (const u of [x+0.1,x+w-0.35]) for (const v of [y+0.1,y+d-0.35]) pixelBox(fixed,[u,v,0.5],[0.25,0.25,1.1],{ tone: 0.66 });
    pixelBox(fixed,[x-0.12,y-0.12,h+0.5],[w+0.24,d+0.24,0.22],{ tone: 0.78, edge: true });
    if (!arcade) fixed.push(
      { points: [[x+0.25,y+d+0.01,0.7],[x+w-0.25,y+d+0.01,0.7],[x+w-0.25,y+d+0.01,1.5],[x+0.25,y+d+0.01,1.5]], tone: 0.18 },
      { points: [[x+w+0.01,y+d-0.9,0.5],[x+w+0.01,y+d-0.25,0.5],[x+w+0.01,y+d-0.25,1.65],[x+w+0.01,y+d-0.9,1.65]], tone: 0.2 },
    );
    for (let i = 0; i < floors; i++) for (let j = 0; j < 2; j++) {
      const u = x+0.3+j*w*0.48, z = 1.85+i*0.8;
      fixed.push({ points: [[u,y+d+0.012,z],[u+w*0.25,y+d+0.012,z],[u+w*0.25,y+d+0.012,z+0.38],[u,y+d+0.012,z+0.38]], tone: 0.22 });
    }
  }
  function rebuild(): void {
    fixed = [];
    count = Math.max(1,Math.min(2,Math.round(props.carriages)));
    const floors = Math.max(1,Math.min(3,Math.round(props.blockHeight)));
    const raised = props.layout === "raised-crossing";
    const square = props.layout === "square-loop-edge";
    radius = square ? 8 : raised ? 5.5 : 6;
    center = square ? -3.8 : -2;
    start = square ? 0.08 : -0.15;
    finish = square ? 1.49 : 1.72;
    railZ = raised ? 2.15 : 0.64;
    pixelPrism(fixed,[[-6.1,-5.5],[4.9,-5.5],[6,-4.3],[6,4.8],[4.8,6],[-5.5,6],[-6.1,4.8]],-0.65,1.15,{ tone: 0.22 });
    const strip = (a: number, b: number, r: number, width: number, z: number, tone: number): void => {
      fixed.push({ points: [point(a,r-width/2,z),point(b,r-width/2,z),point(b,r+width/2,z),point(a,r+width/2,z)], tone });
    };
    for (let i = 0; i < 20; i++) {
      const a = start+(finish-start)*i/20, b = start+(finish-start)*(i+1)/20;
      strip(a,b,radius,1.9,railZ-0.08,0.35);
      for (const r of [radius-0.42,radius+0.42]) strip(a,b,r,0.08,railZ,0.93);
      if (raised) for (const r of [radius-0.95,radius+0.95]) fixed.push({ points: [point(a,r,1.82),point(b,r,1.82),point(b,r,railZ-0.08),point(a,r,railZ-0.08)], tone: 0.65 });
      strip(a,b,radius,0.035,railZ+3,0.5);
    }
    if (square) {
      pixelPrism(fixed,[[-3.8,-2.8],[1.2,-1.5],[-1.5,1.2]],0.51,0.18,{ tone: 0.44, edge: true });
      block(-5.5,-3.8,1.5,4.3,floors);
      block(-3.8,-5,4,1.6,Math.max(1,floors-1));
    } else {
      block(-5,-3.9,4.8,1.8,floors,raised);
      block(-5,-2.1,1.8,3.8,raised ? 1 : Math.max(1,floors-1));
    }
    if (raised) {
      for (const a of [0.05,0.72,1.4]) {
        const [x,y] = point(a,radius,0);
        pixelBox(fixed,[x-0.35,y-0.35,0.5],[0.7,0.7,1.32],{ tone: 0.5, edge: true });
      }
      pixelBox(fixed,[-2.5,-0.7,0.51],[4.4,0.9,0.06],{ tone: 0.4 });
      for (let i = 0; i < 6; i++) pixelBox(fixed,[-2.4,-0.5+i*0.45,0.5],[1.3,0.45,(railZ-0.25-0.5)*(i+1)/6],{ tone: 0.65, edge: true });
    }
    const stopZ = railZ-0.12;
    pixelBox(fixed,[-2.4,2.2,stopZ-0.18],[3.3,0.85,0.2],{ tone: 0.72, edge: true });
    for (const x of [-2.2,0.5]) pixelBox(fixed,[x,2.3,stopZ],[0.12,0.12,1.35],{ tone: 0.68 });
    pixelBox(fixed,[-2.4,2.1,stopZ+1.35],[3.1,1.05,0.12],{ tone: 0.78, edge: true });
    for (const a of [0.12,0.8,1.48]) {
      pixelRod(fixed,point(a,radius-1.55,0.5),point(a,radius-1.55,railZ+3.15),0.055,{ tone: 0.6 },4);
      pixelRod(fixed,point(a,radius-1.55,railZ+3.1),point(a,radius+0.15,railZ+3.1),0.045,{ tone: 0.6 },4);
    }
  }
  function pose(a: number): TramPose {
    const half = 0.72/radius;
    const r = radius*Math.cos(half);
    return { x: center+r*Math.cos(a), y: center+r*Math.sin(a), a: a+Math.PI/2 };
  }
  function body(out: PixelFace[], a: number): void {
    const p = pose(a);
    const local: PixelFace[] = [];
    pixelBox(local,[-1.16,-0.58,railZ+0.22],[2.32,1.16,1.05],{ ink: "accent", tone: 0.8, edge: true });
    pixelBox(local,[-1.24,-0.64,railZ+1.27],[2.48,1.28,0.16],{ tone: 0.9, edge: true });
    pixelBox(local,[-0.96,-0.45,railZ+0.12],[1.92,0.9,0.15],{ tone: 0.55 });
    for (const side of [-1,1]) {
      local.push(
        { points: [[-0.93,side*0.59,railZ+0.73],[0.93,side*0.59,railZ+0.73],[0.93,side*0.59,railZ+1.1],[-0.93,side*0.59,railZ+1.1]], tone: 0.18 },
        { points: [[side*1.17,-0.4,railZ+0.7],[side*1.17,0.4,railZ+0.7],[side*1.17,0.4,railZ+1.1],[side*1.17,-0.4,railZ+1.1]], tone: 0.2 },
        { points: [[0.35,side*0.6,railZ+0.24],[0.66,side*0.6,railZ+0.24],[0.66,side*0.6,railZ+1.13],[0.35,side*0.6,railZ+1.13]], tone: 0.38 },
      );
    }
    const c = Math.cos(p.a), s = Math.sin(p.a);
    for (const f of local) out.push({ ...f, points: f.points.map(([x,y,z]) => [p.x+x*c-y*s,p.y+x*s+y*c,z] as const) });
    // Each wheelset is centered on the rail curve, beneath its rigid body's chord.
    for (const q of [a-0.72/radius,a+0.72/radius]) {
      const bogie: PixelFace[] = [];
      pixelBox(bogie,[-0.18,-0.5,railZ+0.01],[0.36,1,0.2],{ tone: 0.7 });
      const pc = point(q,radius,railZ), angle = q+Math.PI/2;
      for (const f of bogie) out.push({ ...f, points: f.points.map(([x,y,z]) => [pc[0]+x*Math.cos(angle)-y*Math.sin(angle),pc[1]+x*Math.sin(angle)+y*Math.cos(angle),z] as const) });
    }
  }
  function draw(t: number): void {
    const moving: PixelFace[] = [];
    const phase = ((t/1000+1.2+(Math.max(1,Math.min(99,props.seed))-1)*0.17)%12+12)%12;
    const progress = phase < 5.6 ? phase/5.6 : phase < 6 ? 1 : phase < 11.6 ? 1-(phase-6)/5.6 : 0;
    const margin = (count===2 ? 2.65 : 1.4)/radius;
    const a = start+margin+(finish-start-margin*2)*progress;
    const angles = count===1 ? [a] : [a-1.3/radius,a+1.3/radius];
    for (const angle of angles) body(moving,angle);
    if (count===2) {
      const left = pose(angles[0] ?? a), right = pose(angles[1] ?? a);
      pixelRod(moving,[left.x+1.16*Math.cos(left.a),left.y+1.16*Math.sin(left.a),railZ+0.55],[right.x-1.16*Math.cos(right.a),right.y-1.16*Math.sin(right.a),railZ+0.55],0.09,{ tone: 0.65 },4);
    }
    scene.draw(fixed,moving,palette.colors,tramCornerView);
    attrs.set("data-pica-ready","true");
  }
  resize();
  rebuild();
  const loop = createLoop({ el: host, fps: 12, paused: props.paused, time: props.time, still: 1200, frame: draw });
  return {
    update(next) {
      const before = props;
      props = { ...props,...next };
      if (props.layout!==before.layout || props.carriages!==before.carriages || props.blockHeight!==before.blockHeight) rebuild();
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
