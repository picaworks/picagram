import { createCanvas } from "../../../lib/canvas";
import { hostAttributes } from "../../../lib/host";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { createPixelScene, pixelBox, pixelPrism, type PixelFace, type PixelPoint, type PixelView } from "../../../lib/pixel-scene";
import type { Mount, MotionProps } from "../../../lib/types";

export interface PixelHangingWaterfallProps extends MotionProps {
  /** Rock and channel arrangement for the connected cascade. */
  layout: "overhang" | "split" | "stairs";
  /** Drop as a fraction of the available vertical scene. */
  dropHeight: number;
  /** Width and speed of the water, preserving a continuous stream. */
  flow: number;
}
export const defaults: PixelHangingWaterfallProps = { layout: "overhang", dropHeight: 0.75, flow: 0.75, paused: false, time: null, seed: 1 };
const fallView: PixelView = { bounds: [[-5,-4,-1],[5,5,10.5]], ground: 0.4 };
type FallSegment = { a: PixelPoint; b: PixelPoint; width: number; length: number; start: number; side: PixelPoint };
type FallPath = { segments: FallSegment[]; length: number };

/** A ribbon is a surface, with a stable transverse direction on every drop. */
function fallBand(out: PixelFace[], a: PixelPoint, b: PixelPoint, side: PixelPoint, width: number, tone: number): void {
  const offset = (p: PixelPoint, sign: number): PixelPoint => [p[0]+side[0]*width*sign/2,p[1]+side[1]*width*sign/2,p[2]+side[2]*width*sign/2];
  out.push({ points:[offset(a,-1),offset(a,1),offset(b,1),offset(b,-1)], ink:"accent", tone });
}

export const mount: Mount<PixelHangingWaterfallProps> = (host, initial = {}) => {
  let props={...defaults,...initial};
  const attrs=hostAttributes(host);
  attrs.set("role",null); attrs.set("aria-label",null); attrs.set("aria-hidden","true");
  const surface=createCanvas(host,{autoSize:false,css:"image-rendering:pixelated",onResize:()=>{resize();loop.redraw();}});
  const renderer=createPixelScene(surface.canvas);
  const palette=watchPalette(host,()=>loop.redraw());
  let staticFaces:PixelFace[]=[];
  let paths:FallPath[]=[];
  let destroyed=false;
  function resize():void {
    const w=surface.cssWidth,h=surface.cssHeight;
    const scale=Math.max(3,Math.ceil(w/360),Math.ceil(h/300));
    surface.canvas.width=Math.max(1,Math.floor(w/scale));
    surface.canvas.height=Math.max(1,Math.floor(h/scale));
    Object.assign(surface.canvas.style,{width:`${surface.canvas.width*scale}px`,height:`${surface.canvas.height*scale}px`,left:`${Math.floor((w-surface.canvas.width*scale)/2)}px`,top:`${Math.floor((h-surface.canvas.height*scale)/2)}px`,right:"auto",bottom:"auto"});
  }
  function rebuild():void {
    staticFaces=[]; paths=[];
    const h=Math.max(0.45,Math.min(0.85,props.dropHeight))*10;
    const fill=0.7+Math.max(0.25,Math.min(1,props.flow))*0.55;
    const rock=(x:number,y:number,z:number,w:number,d:number,height:number,tone:number):void=>pixelBox(staticFaces,[x,y,z],[w,d,height],{tone});
    const pool=(x:number,y:number,rx:number,ry:number,z:number):void=>{
      const ring=Array.from({length:8},(_,i):readonly[number,number]=>[x+Math.cos(i*Math.PI/4)*rx,y+Math.sin(i*Math.PI/4)*ry]);
      pixelPrism(staticFaces,ring,z,0.08,{ink:"accent",tone:0.65});
    };
    const path=(points:readonly PixelPoint[],width:number):void=>{
      let length=0;
      const segments:FallSegment[]=[];
      for(let i=1;i<points.length;i++) {
        const a=points[i-1]!,b=points[i]!;
        const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2];
        const size=Math.hypot(dx,dy,dz);
        const flat=Math.hypot(dx,dy);
        const side:PixelPoint=Math.abs(dz)>flat?[1,0,0]:[-dy/Math.max(0.001,flat),dx/Math.max(0.001,flat),0];
        segments.push({a,b,width:width*fill,length:size,start:length,side});
        fallBand(staticFaces,a,b,side,width*fill,0.7);
        length+=size;
      }
      paths.push({segments,length});
    };
    pixelPrism(staticFaces,[[-4.8,-2.8],[-3.3,-3.6],[2.8,-3.6],[4.7,-1.6],[4.7,3.3],[2.9,4.4],[-3.3,4.4],[-4.8,2.7]],-0.8,1.2,{tone:0.25});
    // The finite lower basin has raised banks and an explicit open outlet.
    rock(-3.5,1.5,0.4,0.65,2.5,0.35,0.42);
    rock(3,1.8,0.4,0.65,2.2,0.35,0.42);
    pool(0.2,2.3,2.8,1.55,0.42);
    path([[0.2,2.7,0.52],[0.2,4.32,0.52]],1.1);
    if(props.layout==="stairs") {
      // Each shelf ends before the next drop; no water travels through a solid.
      rock(-3,-3,0.4,6,2.2,h-0.4,0.46);
      rock(-3,-0.65,0.4,6,1.55,h*0.66-0.4,0.55);
      rock(-3,1,0.4,6,1.5,h*0.33-0.4,0.64);
      rock(-3.1,-2.8,h*0.55,0.3,1.8,0.22,0.68);
      pool(1.8,-0.35,0.65,0.35,h*0.66+0.02);
      pool(-1.8,1.35,0.65,0.35,h*0.33+0.02);
      path([[-1.8,-2.7,h+0.08],[1.8,-0.72,h+0.08],[1.8,-0.62,h*0.66+0.12],[-1.8,0.94,h*0.66+0.12],[-1.8,1.02,h*0.33+0.12],[1.8,2.55,h*0.33+0.12],[1.8,2.65,0.55],[0.2,3.2,0.55]],1.05);
    } else {
      // Two large strata and a true open recess support the hanging lip.
      rock(-3,-2.7,0.4,1.6,3.35,h*0.52,0.43);
      rock(-2.8,-2.6,h*0.52+0.4,1.4,2.9,h*0.48-0.8,0.56);
      rock(1.4,-2.7,0.4,1.2,3.2,h-0.8,0.46);
      rock(-3,-2.7,h-0.8,5.7,3.7,0.8,0.68);
      // Raised side cheeks frame the source channel, leaving its center visible.
      rock(-2.8,-2.6,h,0.6,2.6,0.4,0.62);
      rock(2,-2.6,h,0.5,2.6,0.5,0.57);
      if(props.layout==="split") {
        rock(-0.4,-0.15,h,0.8,1.2,0.85,0.74);
        path([[0,-2.5,h+0.08],[0,-0.6,h+0.08],[-1.4,0.5,h+0.08],[-1.4,1.1,h+0.08],[-1.4,1.25,0.55],[-0.2,2.5,0.55]],0.9);
        path([[0,-0.6,h+0.09],[1.4,0.5,h+0.09],[1.4,1.1,h+0.09],[1.4,1.25,0.56],[0.2,2.7,0.56]],0.9);
        pool(-1.4,1.6,0.85,0.65,0.43);
        pool(1.4,1.6,0.85,0.65,0.43);
      } else {
        path([[-0.2,-2.5,h+0.08],[-0.2,1.1,h+0.08],[-0.2,1.3,0.55],[0.2,2.7,0.55]],1.65);
        pool(-0.2,1.6,1.25,0.8,0.43);
      }
    }
  }
  function draw(t:number):void {
    const moving:PixelFace[]=[];
    const speed=1.1+Math.max(0.25,Math.min(1,props.flow))*2.4;
    const phase=t/1000*speed+(Math.max(1,Math.min(99,props.seed))-1)*0.23;
    for(const path of paths) {
      const count=Math.max(2,Math.ceil(path.length/2.3));
      for(let i=0;i<count;i++) {
        const distance=((phase+i*path.length/count)%path.length+path.length)%path.length;
        const segment=path.segments.find(s=>distance>=s.start&&distance<s.start+s.length);
        if(!segment) continue;
        const fraction=(distance-segment.start)/segment.length;
        const end=Math.min(1,fraction+0.4/segment.length);
        const at=(u:number):PixelPoint=>[segment.a[0]+(segment.b[0]-segment.a[0])*u,segment.a[1]+(segment.b[1]-segment.a[1])*u+0.015,segment.a[2]+(segment.b[2]-segment.a[2])*u+0.018];
        fallBand(moving,at(fraction),at(end),segment.side,segment.width*0.68,0.97);
      }
    }
    renderer.draw(staticFaces,moving,palette.colors,fallView);
    attrs.set("data-pica-ready","true");
  }
  resize(); rebuild();
  const loop=createLoop({el:host,fps:12,paused:props.paused,time:props.time,still:1200,frame:draw});
  return {
    update(next) {
      const before=props;
      props={...props,...next};
      if(props.layout!==before.layout||props.dropHeight!==before.dropHeight||props.flow!==before.flow) rebuild();
      palette.refresh(); loop.update({paused:props.paused,time:props.time}); loop.redraw();
    },
    destroy() {
      if(destroyed) return;
      destroyed=true;
      loop.destroy(); palette.destroy(); surface.destroy(); attrs.restore();
    },
  };
};
