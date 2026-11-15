import { createCanvas } from "../../../lib/canvas";
import { hostAttributes } from "../../../lib/host";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { createPixelScene, pixelPrism, pixelRod, type PixelFace, type PixelPoint, type PixelView } from "../../../lib/pixel-scene";
import type { Mount, MotionProps } from "../../../lib/types";

export interface PixelLilyPondProps extends MotionProps {
  /** Arrangement of the pond, island and raised banks. */
  layout: "cove" | "island" | "crescent";
  /** Coverage of the sheltered pads, kept away from the swimming lane. */
  lilyCover: number;
  /** Swimming pace, from a 28 second circuit to a 10 second circuit. */
  swimPace: number;
}
export const defaults: PixelLilyPondProps = { layout: "cove", lilyCover: 0.3, swimPace: 0.5, paused: false, time: null, seed: 1 };
const pondView: PixelView = { bounds: [[-6.3,-5,-1.2],[6.3,5,4.5]], ground: 0.3 };
const pondTau = Math.PI * 2;
function pondOval(x: number, y: number, rx: number, ry: number, n = 12): [number, number][] {
  return Array.from({ length: n }, (_, i) => [x + Math.cos(i * pondTau / n) * rx, y + Math.sin(i * pondTau / n) * ry]);
}

export const mount: Mount<PixelLilyPondProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  attrs.set("role", null);
  attrs.set("aria-label", null);
  attrs.set("aria-hidden", "true");
  const surface = createCanvas(host, { autoSize: false, css: "image-rendering:pixelated", onResize: () => { resize(); loop.redraw(); } });
  const renderer = createPixelScene(surface.canvas);
  const palette = watchPalette(host, () => loop.redraw());
  let staticFaces: PixelFace[] = [];
  let destroyed = false;
  function resize(): void {
    const w = surface.cssWidth, h = surface.cssHeight;
    const scale = Math.max(3, Math.ceil(w / 360), Math.ceil(h / 300));
    surface.canvas.width = Math.max(1, Math.floor(w / scale));
    surface.canvas.height = Math.max(1, Math.floor(h / scale));
    Object.assign(surface.canvas.style, { width: `${surface.canvas.width * scale}px`, height: `${surface.canvas.height * scale}px`, left: `${Math.floor((w-surface.canvas.width*scale)/2)}px`, top: `${Math.floor((h-surface.canvas.height*scale)/2)}px`, right: "auto", bottom: "auto" });
  }
  function rebuild(): void {
    staticFaces = [];
    const outer = pondOval(0,0,6,4.5);
    const shore = pondOval(0,0,5,3.5);
    pixelPrism(staticFaces, outer, -1, 1.1, { tone: 0.28 });
    pixelPrism(staticFaces, shore, 0.1, 0.2, { ink: "accent", tone: 0.72 });
    for (let i=0; i<12; i++) {
      const j=(i+1)%12;
      const a=outer[i]!, b=outer[j]!, c=shore[j]!, d=shore[i]!;
      pixelPrism(staticFaces, [a,b,c,d], 0.1, 0.6, { tone: 0.4 });
    }
    let flowerX=-2.8, flowerY=-1.5;
    if (props.layout === "island") {
      pixelPrism(staticFaces, pondOval(-0.5,-0.25,1.45,1.1,8), 0.3, 0.65, { tone: 0.45 });
      flowerX=-0.9; flowerY=-0.5;
    } else if (props.layout === "crescent") {
      pixelPrism(staticFaces, [[-5,-1.8],[-3.4,-2.2],[-1.8,-1.5],[-0.9,-0.7],[-0.9,0.7],[-1.8,1.5],[-3.4,2.2],[-5,1.8]], 0.3, 0.9, { tone: 0.43 });
      flowerX=-2.6; flowerY=-2.1;
    } else {
      pixelPrism(staticFaces, [[-4.8,-1.6],[-4,-2.6],[-2.7,-2.8],[-1.6,-2],[-2,-1.4],[-3.5,-0.9]], 0.3, 0.4, { tone: 0.4 });
    }
    // Three short stones sit in a sheltered channel, outside every swimming lane.
    const stones = props.layout === "island" ? [[-2.15,-0.9],[-2.15,0],[-2.15,0.9]] : [[-3.7,0.1],[-3.6,1.2],[-3.1,2.2]];
    for (const [x,y] of stones) pixelPrism(staticFaces, pondOval(x!,y!,0.46,0.36,6), 0.3, 0.42, { tone: 0.68 });
    const cover=Math.max(0.15,Math.min(0.45,props.lilyCover));
    const r=0.55+cover*1.1;
    const pads = props.layout === "island" ? [[-1.5,0.6],[0.2,0.7],[0.7,-0.8]] : props.layout === "crescent" ? [[-2.3,-2.2],[-1,-2.5],[-2.2,2.4]] : [[-3,-1.5],[-1.7,-1.5],[-2.5,-0.4]];
    for (const [x,y] of pads) {
      // Fan sectors stop short of closing, leaving the characteristic pad notch.
      const rim=pondOval(x!,y!,r,r*0.8,10);
      for (let i=1;i<9;i++) staticFaces.push({ points: [[x!,y!,0.46],[rim[i]![0],rim[i]![1],0.46],[rim[i+1]![0],rim[i+1]![1],0.46]], tone: 0.64 });
    }
    const padZ=props.layout==="island"?0.99:props.layout==="cove"?0.74:0.46;
    const supportingPad=pondOval(flowerX,flowerY,1.1,0.9,12);
    // One notched supporting pad meets the short stalk at its planted center.
    for(let i=1;i<11;i++)staticFaces.push({points:[[flowerX,flowerY,padZ],[supportingPad[i]![0],supportingPad[i]![1],padZ],[supportingPad[i+1]![0],supportingPad[i+1]![1],padZ]],tone:0.64});
    pixelRod(staticFaces,[flowerX,flowerY,padZ],[flowerX,flowerY,padZ+0.69],0.12,{tone:0.66},6);
    // Six broad outward-opening petals form a low cup, not a tall pointed landmark.
    for(let i=0;i<6;i++) {
      const a=i*pondTau/6,b=a+0.5,c=a-0.5;
      const center:PixelPoint=[flowerX,flowerY,padZ+0.64];
      const left:PixelPoint=[flowerX+Math.cos(c)*0.85,flowerY+Math.sin(c)*0.85,padZ+1.05];
      const tip:PixelPoint=[flowerX+Math.cos(a)*1.25,flowerY+Math.sin(a)*1.25,padZ+1.4];
      const right:PixelPoint=[flowerX+Math.cos(b)*0.85,flowerY+Math.sin(b)*0.85,padZ+1.05];
      staticFaces.push({points:[center,left,tip],tone:0.82},{points:[center,tip,right],tone:0.68});
    }
    pixelPrism(staticFaces,pondOval(flowerX,flowerY,0.28,0.28,6),padZ+0.7,0.34,{tone:0.95});
  }
  function route(a: number): readonly [number,number,number] {
    if (props.layout === "island") return [3.75*Math.cos(a),2.6*Math.sin(a),Math.atan2(2.6*Math.cos(a),-3.75*Math.sin(a))];
    if (props.layout === "crescent") return [1.8+1.85*Math.cos(a),2.3*Math.sin(a),Math.atan2(2.3*Math.cos(a),-1.85*Math.sin(a))];
    return [0.8+2.65*Math.cos(a),0.65+1.55*Math.sin(a),Math.atan2(1.55*Math.cos(a),-2.65*Math.sin(a))];
  }
  function draw(t: number): void {
    const moving: PixelFace[]=[];
    const pace=Math.max(0.2,Math.min(0.8,props.swimPace));
    const a=t*pondTau/((34-30*pace)*1000)+(Math.max(1,Math.min(99,props.seed))-1)*0.17+0.6;
    const [x,y,angle]=route(a);
    const c=Math.cos(angle),s=Math.sin(angle);
    const point=(u:number,v:number,z=0.34):PixelPoint=>[x+c*u-s*v,y+s*u+c*v,z];
    // A flat submerged silhouette is drawn above the opaque water face, never through alpha.
    const nose=point(1.05,0), tail=point(-0.75,0), high=point(0,0,0.58);
    const left=point(0.05,0.43), right=point(0.05,-0.43);
    moving.push({points:[nose,left,high],tone:0.85},{points:[nose,high,right],tone:0.75},{points:[left,tail,high],tone:0.76},{points:[tail,right,high],tone:0.65});
    const stroke=Math.sin(t/1000*4.5)*0.17;
    moving.push({points:[tail,point(-1.35,0.42+stroke),point(-1.17,stroke),point(-1.35,-0.42+stroke)],tone:0.7});
    moving.push({points:[point(-0.05,0.26),point(-0.48,0.75),point(-0.55,0.18)],tone:0.55});
    for (let i=0;i<2;i++) {
      const u=-1.65-i*0.5;
      moving.push({points:[point(u,-0.3-i*0.1),point(u+0.12,-0.3-i*0.1),point(u+0.12,0.3+i*0.1),point(u,0.3+i*0.1)],tone:0.18-i*0.07});
    }
    renderer.draw(staticFaces,moving,palette.colors,pondView);
    attrs.set("data-pica-ready","true");
  }
  resize();
  rebuild();
  const loop=createLoop({el:host,fps:12,paused:props.paused,time:props.time,still:1200,frame:draw});
  return {
    update(next) {
      const before=props;
      props={...props,...next};
      if(props.layout!==before.layout||props.lilyCover!==before.lilyCover) rebuild();
      palette.refresh();
      loop.update({paused:props.paused,time:props.time});
      loop.redraw();
    },
    destroy() {
      if(destroyed) return;
      destroyed=true;
      loop.destroy(); palette.destroy(); surface.destroy(); attrs.restore();
    },
  };
};
