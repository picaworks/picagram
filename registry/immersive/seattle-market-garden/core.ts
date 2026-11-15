import { createCanvas } from "../../../lib/canvas";
import { hostAttributes } from "../../../lib/host";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { createPixelScene, pixelBox, pixelPrism, pixelRod, type PixelFace, type PixelView } from "../../../lib/pixel-scene";
import type { Mount, MotionProps } from "../../../lib/types";

export interface SeattleMarketGardenProps extends MotionProps {
  /** Relationship between the market, garden and exterior stair. */
  layout: "stair-market" | "garden-court" | "roof-market";
  /** Open produce stalls, from two to four structural bays. */
  stallBays: number;
  /** Broad raised growing beds with continuous working aisles. */
  gardenBeds: number;
}
export const defaults: SeattleMarketGardenProps = {
  layout: "stair-market", stallBays: 3, gardenBeds: 2, paused: false, time: null, seed: 1,
};
const marketGardenView: PixelView = { bounds: [[-6,-5,-0.7],[6,5,5.2]], ground: 0.5, yaw: 45, elevation: 30 };

export const mount: Mount<SeattleMarketGardenProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  attrs.set("role", null);
  attrs.set("aria-label", null);
  attrs.set("aria-hidden", "true");
  attrs.set("data-pica-ready", host.getAttribute("data-pica-ready"));
  let fixed: PixelFace[] = [];
  let awningX = -4.8;
  let awningY = 2;
  let awningWidth = 3.3;
  let destroyed = false;
  const surface = createCanvas(host, { autoSize: false, css: "image-rendering:pixelated", onResize: () => { resize(); loop.redraw(); } });
  const scene = createPixelScene(surface.canvas);
  const palette = watchPalette(host, () => loop.redraw());
  function resize(): void {
    const w = surface.cssWidth, h = surface.cssHeight;
    const scale = Math.max(3, Math.ceil(w/360), Math.ceil(h/300));
    const c = surface.canvas;
    c.width = Math.max(1, Math.floor(w/scale));
    c.height = Math.max(1, Math.floor(h/scale));
    Object.assign(c.style, { width: `${c.width*scale}px`, height: `${c.height*scale}px`, left: `${Math.floor((w-c.width*scale)/2)}px`, top: `${Math.floor((h-c.height*scale)/2)}px`, right: "auto", bottom: "auto" });
  }
  function box(x: number, y: number, z: number, w: number, d: number, h: number, tone = 0.65): void {
    pixelBox(fixed,[x,y,z],[w,d,h],{ tone, edge: true });
  }
  function shed(x: number, y: number, width: number, depth: number, bays: number, turn = false): void {
    const local: PixelFace[] = [];
    const block = (u: number, v: number, z: number, w: number, d: number, h: number, tone: number): void => pixelBox(local,[u,v,z],[w,d,h],{ tone, edge: true });
    block(0,0,0.5,width,0.14,2.35,0.35);
    block(-0.14,-0.12,2.85,width+0.28,depth+0.38,0.15,0.75);
    for (let i = 0; i <= bays; i++) block(i*width/bays-0.08,depth-0.15,0.5,0.16,0.16,2.35,0.7);
    for (let i = 0; i < bays; i++) {
      const u = i*width/bays+0.16;
      const w = width/bays-0.32;
      block(u,depth-0.1,0.5,w,0.65,0.75,0.65);
      block(u-0.03,depth-0.15,1.25,w+0.06,0.75,0.1,0.9);
      for (let j = 0; j < 3; j++) block(u+0.08+j*(w-0.2)/3,depth,1.35,(w-0.3)/3,0.38,0.2+(j%2)*0.1,0.57);
    }
    for (const f of local) fixed.push({ ...f, points: f.points.map(([u,v,z]) => [x+(turn?v:u),y+(turn?u:v),z] as const) });
  }
  function bed(x: number, y: number, z: number, w: number, d: number): void {
    box(x,y,z,w,d,0.3,0.6);
    for (let j = 0; j < 2; j++) pixelBox(fixed,[x+0.16+j*w*0.45,y+0.15,z+0.3],[w*0.32,d-0.3,0.28],{ ink: "accent", tone: 0.76 });
  }
  function rebuild(): void {
    fixed = [];
    const bays = Math.max(2,Math.min(4,Math.round(props.stallBays)));
    const beds = Math.max(1,Math.min(3,Math.round(props.gardenBeds)));
    pixelPrism(fixed,[[-5.5,-4.5],[4.7,-4.5],[5.4,-3.5],[5.4,3.8],[4.3,4.6],[-5.5,4.6]],-0.65,1.15,{ tone: 0.23 });
    const court = props.layout === "garden-court";
    const roof = props.layout === "roof-market";
    const front = court ? -1.5 : 1.1;
    const width = 6.9;
    shed(-5,front-2.2,width,2.2,bays);
    awningX = -4.8;
    awningY = front+0.85;
    awningWidth = width*0.48;
    // Brackets stay fixed at the roller axis above the actual produce counter.
    box(awningX-0.18,awningY-0.12,2.76,0.14,0.24,0.35,0.8);
    box(awningX+awningWidth+0.04,awningY-0.12,2.76,0.14,0.24,0.35,0.8);
    for (const x of [awningX-0.1,awningX+awningWidth+0.1]) pixelRod(fixed,[x,front+0.12,2.9],[x,awningY,2.9],0.06,{ tone: 0.8 },4);
    if (court) {
      shed(-5,-1.5,3.8,1.6,2,true);
      for (let i = 0; i < beds; i++) bed(-1.85+i*2.05,0.25,0.5,1.35,2.85);
      // The open positive x and y edges are the garden's working entrance.
      box(-2.5,3.3,0.51,6.8,0.6,0.06,0.45);
    } else {
      const gardenZ = roof ? 4.25 : 3.1;
      if (roof) {
        box(-5,-2.7,2.85,7,3.8,0.15,0.7);
        box(2,-2.7,2.85,2.7,1.7,0.15,0.65);
        // A supported upper deck leaves the lower market roof and open gallery legible.
        for (const x of [-4.85,1.6]) for (const y of [-2.55,0.7]) box(x,y,3,0.24,0.24,1.05,0.78);
        box(-5,-2.7,4.05,7,3.8,0.2,0.72);
        // The exterior landing meets both the stair head and the garden's broad side aisle.
        for (const x of [2.05,4.36]) for (const y of [-2.1,-1.57]) box(x,y,3,0.22,0.22,1.05,0.76);
        for (const x of [2.05,4.36]) box(x,-2.1,0.5,0.22,0.22,2.35,0.62);
        box(1.8,-2.15,4.05,2.9,0.85,0.2,0.72);
      } else {
        box(-5,-4.4,0.5,9.7,2.95,2.6,0.35);
        box(-5,-1.55,2.95,8.1,0.1,0.15,0.75);
      }
      for (let i = 0; i < beds; i++) bed(-4.5+i*2.15,roof?-2.25:-3.95,gardenZ,1.55,roof?1.75:1.9);
      // Broad unplanted aisles meet this fully exposed stair on the positive x side.
      if (roof) {
        for (let i = 0; i < 12; i++) box(3.15,2.7-i*0.4,0.5,1.55,0.4,(gardenZ-0.5)*(i+1)/12,0.64);
      } else {
        for (let i = 0; i < 8; i++) box(3.15,2.3-i*0.55,0.5,1.55,0.55,(gardenZ-0.5)*(i+1)/8,0.64);
      }
    }
    // Two legible stacked crates sit beside the pedestrian entrance.
    box(2.2,2.5,0.5,0.75,0.7,0.45,0.54);
    box(2.25,2.55,0.95,0.65,0.6,0.4,0.7);
    box(2.28,2.58,1.35,0.58,0.5,0.15,0.48);
  }
  function draw(t: number): void {
    const moving: PixelFace[] = [];
    const gathered = (1+Math.sin(t/1000*0.85+(Math.max(1,Math.min(99,props.seed))-1)*0.19))/2;
    const lower = 2.9-(1.25-gathered*0.95);
    moving.push({ points: [[awningX,awningY,2.9],[awningX+awningWidth,awningY,2.9],[awningX+awningWidth,awningY,lower],[awningX,awningY,lower]], tone: 0.72, edge: true, shadow: true });
    pixelRod(moving,[awningX-0.12,awningY,2.9],[awningX+awningWidth+0.12,awningY,2.9],0.09+gathered*0.18,{ tone: 0.88 },8);
    pixelRod(moving,[awningX,awningY,lower],[awningX+awningWidth,awningY,lower],0.045,{ tone: 0.86 },4);
    scene.draw(fixed,moving,palette.colors,marketGardenView);
    attrs.set("data-pica-ready","true");
  }
  resize();
  rebuild();
  const loop = createLoop({ el: host, fps: 12, paused: props.paused, time: props.time, still: 1200, frame: draw });
  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.layout !== before.layout || props.stallBays !== before.stallBays || props.gardenBeds !== before.gardenBeds) rebuild();
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
