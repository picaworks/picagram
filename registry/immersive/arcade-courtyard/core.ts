import { createCanvas } from "../../../lib/canvas";
import { hostAttributes } from "../../../lib/host";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { createPixelScene, pixelBox, pixelPrism, pixelRod, type PixelFace, type PixelPoint, type PixelView } from "../../../lib/pixel-scene";
import type { Mount, MotionProps } from "../../../lib/types";

export interface ArcadeCourtyardProps extends MotionProps {
  /** Relationship between open court, arcade wings and exterior stair. */
  layout: "u-court" | "split-court" | "tower-court";
  /** Open arch bays along the main wing, from two to four. */
  archBays: number;
  /** Planted edge area, preserving the broad central court. */
  gardenCover: number;
}
export const defaults: ArcadeCourtyardProps = {
  layout: "u-court", archBays: 4, gardenCover: 0.25, paused: false, time: null, seed: 1,
};
const arcadeCourtView: PixelView = { bounds: [[-6.2,-5.4,-0.7],[6.3,6,6]], yaw: 45, elevation: 30 };

export const mount: Mount<ArcadeCourtyardProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  attrs.set("role",null);
  attrs.set("aria-label",null);
  attrs.set("aria-hidden","true");
  attrs.set("data-pica-ready",host.getAttribute("data-pica-ready"));
  let fixed: PixelFace[] = [];
  let fountainX = 0.3;
  let fountainY = 1.4;
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
  function box(x: number,y: number,z: number,w: number,d: number,h: number,tone = 0.6): void {
    pixelBox(fixed,[x,y,z],[w,d,h],{ tone, edge: true });
  }
  function arcade(x: number,y: number,z: number,length: number,bays: number,turn = false): void {
    const local: PixelFace[] = [];
    const bay = length/bays;
    for (let i = 0; i <= bays; i++) pixelBox(local,[i*bay-0.14,0,z],[0.28,1.1,2.35],{ tone: 0.62 });
    pixelBox(local,[-0.14,0,z+2.35],[length+0.28,1.1,0.58],{ tone: 0.5 });
    pixelBox(local,[-0.25,-0.12,z+2.93],[length+0.5,1.34,0.16],{ tone: 0.8, edge: true });
    for (let i = 0; i < bays; i++) for (const side of [-1,1]) {
      const edge = side < 0 ? i*bay+0.14 : (i+1)*bay-0.14;
      const widths = [bay*0.16,bay*0.11,bay*0.08];
      let offset = 0;
      for (let j = 0; j < 3; j++) {
        const width = widths[j] ?? 0;
        const lo = side < 0 ? edge+offset : edge-offset-width;
        const hi = lo+width;
        const bottom = z+1.5+j*0.27;
        const top = z+2.35;
        const inner = side < 0 ? hi : lo;
        // Only masonry surrounds the opening. No face spans the passage behind it.
        local.push(
          { points: [[lo,0,bottom],[hi,0,bottom],[hi,0,top],[lo,0,top]], tone: 0.63 },
          { points: [[lo,1.1,bottom],[hi,1.1,bottom],[hi,1.1,top],[lo,1.1,top]], tone: 0.63 },
          { points: [[lo,0,bottom],[hi,0,bottom],[hi,1.1,bottom],[lo,1.1,bottom]], tone: 0.4 },
          { points: [[inner,0,bottom],[inner,1.1,bottom],[inner,1.1,top],[inner,0,top]], tone: 0.47 },
        );
        offset += width;
      }
    }
    for (const f of local) fixed.push({ ...f, points: f.points.map(([u,v,h]) => [x+(turn?v:u),y+(turn?u:v),h] as const) });
  }
  function bowl(radius: number,inner: number,bottom: number,height: number): void {
    for (let i = 0; i < 6; i++) {
      const a = i*Math.PI/3, b = (i+1)*Math.PI/3;
      const at = (r: number,t: number): readonly [number,number] => [fountainX+r*Math.cos(t),fountainY+r*Math.sin(t)];
      pixelPrism(fixed,[at(radius,a),at(radius,b),at(inner,b),at(inner,a)],bottom,height,{ tone: 0.72, edge: true });
    }
  }
  function rebuild(): void {
    fixed = [];
    const bays = Math.max(2,Math.min(4,Math.round(props.archBays)));
    const split = props.layout === "split-court";
    const tower = props.layout === "tower-court";
    pixelPrism(fixed,[[-5.7,-4.9],[4.8,-4.9],[5.8,-3.9],[5.8,4.9],[4.7,5.5],[-5.7,5.5]],-0.65,1.15,{ tone: 0.24 });
    fountainX = split ? 1.9 : tower ? 0.9 : 0.3;
    fountainY = split ? 2.9 : 1.4;
    if (split) {
      box(-5.3,-4.6,0.5,10.3,3.2,1.2,0.34);
      arcade(-5,-4.5,1.7,9.5,bays);
      arcade(-5,-3.4,1.7,2,1,true);
      for (let i = 0; i < 7; i++) box(-1.8,0.7-i*0.35,0.5,2.4,0.35,1.2*(i+1)/7,0.66);
    } else {
      arcade(-5,-4.5,0.5,tower?6.4:9.5,bays);
      arcade(-5,-3.4,0.5,4.4,1,true);
      if (tower) {
        box(-5.25,-4.75,0.5,2.35,2.35,4.8,0.5);
        box(-5.4,-4.9,5.3,2.65,2.65,0.2,0.8);
        fixed.push({ points: [[-4.8,-2.39,3.6],[-3.4,-2.39,3.6],[-3.4,-2.39,4.3],[-4.8,-2.39,4.3]], tone: 0.22 });
      } else arcade(3.55,-3.4,0.5,4.4,1,true);
      const sx = tower ? -3.25 : 4.85;
      for (let i = 0; i < 8; i++) box(sx,2.2-i*0.45,0.5,1.1,0.45,2.93*(i+1)/8,0.64);
      box(sx-0.25,-1.4,3.25,1.35,0.5,0.18,0.7);
    }
    const cover = Math.max(0,Math.min(1,props.gardenCover));
    if (cover > 0) {
      const gardenX = tower ? -5.2 : -3.7;
      box(gardenX,2.1,0.5,1.35,cover*2.5,0.25,0.5);
      box(gardenX+0.13,2.2,0.75,1.09,Math.max(0.08,cover*2.3),0.4,0.68);
    }
    bowl(1.9,1.6,0.5,0.55);
    pixelPrism(fixed,Array.from({length:6},(_,i) => [fountainX+1.59*Math.cos(i*Math.PI/3),fountainY+1.59*Math.sin(i*Math.PI/3)] as const),0.85,0.1,{ ink: "accent", tone: 0.74 });
    box(fountainX-0.23,fountainY-0.23,0.95,0.46,0.46,1.17,0.65);
    bowl(1.12,0.87,2.12,0.28);
    fixed.push({ points: Array.from({length:6},(_,i) => [fountainX+0.89*Math.cos(i*Math.PI/3),fountainY+0.89*Math.sin(i*Math.PI/3),2.41] as const), ink: "accent", tone: 0.82 });
  }
  function streamPoint(u: number,side: number): PixelPoint {
    const r = 1+0.57*u;
    return [fountainX+r*(side===0?1:0.5),fountainY+r*(side===0?0:Math.sqrt(3)/2),2.42+0.15*u-1.62*u*u];
  }
  function draw(t: number): void {
    const moving: PixelFace[] = [];
    const phase = t/1000*2.2+(Math.max(1,Math.min(99,props.seed))-1)*0.17;
    for (let side = 0; side < 2; side++) for (let i = 0; i < 8; i++) {
      const pulse = ((i-phase-side*0.5)%3+3)%3;
      const radius = pulse < 1 ? 0.13 : 0.09;
      pixelRod(moving,streamPoint(i/8,side),streamPoint((i+1)/8,side),radius,{ ink: "accent", tone: pulse<1?0.95:0.72 },4);
    }
    scene.draw(fixed,moving,palette.colors,arcadeCourtView);
    attrs.set("data-pica-ready","true");
  }
  resize();
  rebuild();
  const loop = createLoop({ el: host, fps: 12, paused: props.paused, time: props.time, still: 1200, frame: draw });
  return {
    update(next) {
      const before = props;
      props = { ...props,...next };
      if (props.layout!==before.layout || props.archBays!==before.archBays || props.gardenCover!==before.gardenCover) rebuild();
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
