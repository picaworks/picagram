import { createCanvas } from "../../../lib/canvas";
import { hostAttributes } from "../../../lib/host";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { createPixelScene, pixelBox, pixelPrism, pixelRod, type PixelFace, type PixelView } from "../../../lib/pixel-scene";
import type { Mount, MotionProps } from "../../../lib/types";

export interface CanalRowProps extends MotionProps {
  /** Shape of the banks, basin and unequal townhouse rows. */
  layout: "parallel" | "corner" | "court";
  /** Deep townhouses, from three to five. */
  houses: number;
  /** Maximum bridge lift as a fraction of a right angle. */
  opening: number;
}
export const defaults: CanalRowProps = {
  layout: "parallel", houses: 3, opening: 0.5, paused: false, time: null, seed: 1,
};
const canalRowView: PixelView = { bounds: [[-6.2,-5.3,-0.8],[6.2,5.7,6.1]], yaw: 45, elevation: 30 };

export const mount: Mount<CanalRowProps> = (host, initial = {}) => {
  let props = { ...defaults,...initial };
  const attrs = hostAttributes(host);
  attrs.set("role",null);
  attrs.set("aria-label",null);
  attrs.set("aria-hidden","true");
  attrs.set("data-pica-ready",host.getAttribute("data-pica-ready"));
  let fixed: PixelFace[] = [];
  let leaf: PixelFace[] = [];
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
  function home(x: number,y: number,index: number): void {
    const w = 1.8,d = 1.9,h = 2.05+(index%2)*0.3;
    box(x,y,0.95,w,d,h,0.64);
    const z = 0.95+h;
    if (index%3===1) {
      box(x-0.12,y-0.12,z,w+0.24,d+0.24,0.18,0.88);
      box(x+0.25,y+0.25,z+0.18,w-0.5,d-0.5,0.3,0.57);
    } else {
      const peak = z+(index%3===2?1:0.65);
      fixed.push(
        { points: [[x-0.12,y-0.12,z],[x+w/2,y-0.12,peak],[x+w/2,y+d+0.12,peak],[x-0.12,y+d+0.12,z]], tone: 0.87, edge: true },
        { points: [[x+w/2,y-0.12,peak],[x+w+0.12,y-0.12,z],[x+w+0.12,y+d+0.12,z],[x+w/2,y+d+0.12,peak]], tone: 0.55, edge: true },
        { points: [[x-0.12,y+d+0.12,z],[x+w+0.12,y+d+0.12,z],[x+w/2,y+d+0.12,peak]], tone: 0.7 },
        { points: [[x-0.12,y-0.12,z],[x+w+0.12,y-0.12,z],[x+w/2,y-0.12,peak]], tone: 0.7 },
      );
    }
    // Both camera-facing walls carry substantial openings, rather than far-wall details.
    fixed.push(
      { points: [[x+0.66,y+d+0.015,0.95],[x+1.14,y+d+0.015,0.95],[x+1.14,y+d+0.015,1.92],[x+0.66,y+d+0.015,1.92]], tone: 0.16 },
      { points: [[x+w+0.015,y+0.3,2.03],[x+w+0.015,y+d-0.3,2.03],[x+w+0.015,y+d-0.3,2.55],[x+w+0.015,y+0.3,2.55]], tone: 0.16 },
    );
    for (const u of [0.22,1.03]) fixed.push({ points: [[x+u,y+d+0.018,2.12],[x+u+0.52,y+d+0.018,2.12],[x+u+0.52,y+d+0.018,2.66],[x+u,y+d+0.018,2.66]], tone: 0.18 });
    box(x+0.48,y+d,0.75,0.84,0.35,0.2,0.8);
  }
  function rebuild(): void {
    fixed = [];
    leaf = [];
    const count = Math.max(3,Math.min(5,Math.round(props.houses)));
    pixelPrism(fixed,[[-5.7,-4.9],[5.3,-4.9],[5.8,-4.1],[5.8,4.8],[4.9,5.3],[-5.7,5.3]],-0.65,0.9,{ ink: "accent", tone: 0.45 });
    const bank = (x: number,y: number,w: number,d: number): void => box(x,y,-0.65,w,d,1.6,0.4);
    if (props.layout==="corner") {
      bank(-5.5,-4.7,3.8,9.6);
      bank(-1.7,-4.7,7.2,2.3);
      bank(1.7,-2.4,3.8,1.6);
      pixelPrism(fixed,[[1.7,2.1],[4.6,1.75],[5.5,2.3],[5.5,4.9],[1.7,4.9]],-0.65,1.6,{ tone: 0.4, edge: true });
      const left = Math.ceil(count/2);
      for (let i = 0; i < left; i++) home(-4.9,-4.25+i*2.7,i);
      for (let i = left; i < count; i++) home(-0.1+(i-left)*2.65,-4.45,i);
    } else if (props.layout==="court") {
      bank(-5.5,-4.7,11,1.9);
      bank(-5.5,-2.8,3,4.9);
      bank(2.5,-2.8,3,4.9);
      bank(-5.5,2.1,3.8,2.8);
      bank(1.7,2.1,3.8,2.8);
      for (let i = 0; i < 3; i++) home(-4.9+i*3.7,-4.65,i);
      if (count>3) home(-5.1,-0.6,3);
      if (count>4) home(3.25,-0.2,4);
    } else {
      bank(-5.5,-4.7,3.8,9.6);
      bank(1.7,-4.7,3.8,9.6);
      const left = Math.ceil(count/2);
      for (let i = 0; i < left; i++) home(-4.85,-4.3+i*2.7,i);
      for (let i = left; i < count; i++) home(2.85,-3.4+(i-left)*2.9,i);
    }
    // Abutment tops exactly carry the closed leaf's underside at z0.94.
    box(-2.35,2.85,-0.65,0.65,1.85,1.59,0.72);
    box(1.7,2.85,-0.65,0.75,1.85,1.59,0.72);
    pixelRod(fixed,[-1.85,2.93,1.1],[-1.85,4.57,1.1],0.14,{ tone: 0.87 },8);
    // The waiting boat occupies y[-2.25,0.15], entirely outside the leaf's y sweep.
    pixelPrism(fixed,[[-0.5,-1.95],[-0.32,-2.25],[0.32,-2.25],[0.5,-1.95],[0.5,-0.15],[0,0.15],[-0.5,-0.15]],0.21,0.32,{ tone: 0.73, edge: true });
    box(-0.35,-1.8,0.53,0.7,1.3,0.12,0.88);
    box(-0.27,-1.45,0.65,0.54,0.65,0.42,0.55);
    box(-4.5,4.25,0.95,0.24,0.24,1.1,0.65);
    pixelPrism(fixed,[[-5.1,4.05],[-4.8,3.75],[-3.95,3.8],[-3.65,4.2],[-3.85,4.8],[-4.85,4.85],[-5.15,4.5]],1.75,0.8,{ tone: 0.64 });
    pixelBox(leaf,[0,-0.67,-0.16],[3.7,1.34,0.16],{ tone: 0.82, edge: true });
    for (let i = 1; i < 8; i++) leaf.push({ points: [[i*3.7/8,-0.67,0.006],[i*3.7/8+0.035,-0.67,0.006],[i*3.7/8+0.035,0.67,0.006],[i*3.7/8,0.67,0.006]], tone: 0.4 });
    for (const side of [-0.65,0.65]) {
      for (const x of [0.12,1.85,3.58]) pixelBox(leaf,[x-0.04,side-0.04,0],[0.08,0.08,0.7],{ tone: 0.8 });
      pixelRod(leaf,[0.08,side,0.7],[3.62,side,0.7],0.05,{ tone: 0.8 },4);
      pixelRod(leaf,[0.12,side,-0.14],[3.58,side,0.62],0.045,{ tone: 0.65 },4);
    }
  }
  function draw(t: number): void {
    const phase = ((t/1000+1.1+(Math.max(1,Math.min(99,props.seed))-1)*0.16)%10+10)%10;
    const progress = phase<4.6 ? phase/4.6 : phase<5 ? 1 : phase<9.6 ? 1-(phase-5)/4.6 : 0;
    const eased = progress*progress*(3-2*progress);
    const angle = eased*Math.max(0.35,Math.min(0.8,props.opening))*Math.PI/2;
    const c = Math.cos(angle),s = Math.sin(angle);
    const moving: PixelFace[] = leaf.map(f => ({ ...f, points: f.points.map(([x,y,z]) => [-1.85+x*c-z*s,3.75+y,1.1+x*s+z*c] as const) }));
    scene.draw(fixed,moving,palette.colors,canalRowView);
    attrs.set("data-pica-ready","true");
  }
  resize();
  rebuild();
  const loop = createLoop({ el: host, fps: 12, paused: props.paused, time: props.time, still: 1200, frame: draw });
  return {
    update(next) {
      const before = props;
      props = { ...props,...next };
      if (props.layout!==before.layout || props.houses!==before.houses) rebuild();
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
