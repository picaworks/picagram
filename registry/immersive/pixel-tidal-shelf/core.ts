import { createCanvas } from "../../../lib/canvas";
import { hostAttributes } from "../../../lib/host";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { createPixelScene, pixelBox, pixelPrism, type PixelFace, type PixelPoint, type PixelView } from "../../../lib/pixel-scene";
import type { Mount, MotionProps } from "../../../lib/types";

export interface PixelTidalShelfProps extends MotionProps {
  /** Connected coastal cuts, separate basins or a bridged inlet. */
  layout: "channels" | "basins" | "arch";
  /** Vertical tidal range relative to the rock step height. */
  tideRange: number;
  /** Seconds for one complete rise and drainage. */
  cycleSeconds: number;
}
export const defaults: PixelTidalShelfProps = { layout: "channels", tideRange: 0.4, cycleSeconds: 18, paused: false, time: null, seed: 1 };
const shelfView:PixelView={bounds:[[-6.5,-4.6,-1.2],[6.5,4.6,3.5]],ground:0};
type ShelfTriangle=readonly[PixelPoint,PixelPoint,PixelPoint];

export const mount: Mount<PixelTidalShelfProps>=(host,initial={})=>{
  let props={...defaults,...initial};
  const attrs=hostAttributes(host);
  attrs.set("role",null);attrs.set("aria-label",null);attrs.set("aria-hidden","true");
  const surface=createCanvas(host,{autoSize:false,css:"image-rendering:pixelated",onResize:()=>{resize();loop.redraw();}});
  const renderer=createPixelScene(surface.canvas);
  const palette=watchPalette(host,()=>loop.redraw());
  let staticFaces:PixelFace[]=[];
  let floor: ShelfTriangle[]=[];
  let destroyed=false;
  function resize():void {
    const w=surface.cssWidth,h=surface.cssHeight;
    const scale=Math.max(3,Math.ceil(w/360),Math.ceil(h/300));
    surface.canvas.width=Math.max(1,Math.floor(w/scale));surface.canvas.height=Math.max(1,Math.floor(h/scale));
    Object.assign(surface.canvas.style,{width:`${surface.canvas.width*scale}px`,height:`${surface.canvas.height*scale}px`,left:`${Math.floor((w-surface.canvas.width*scale)/2)}px`,top:`${Math.floor((h-surface.canvas.height*scale)/2)}px`,right:"auto",bottom:"auto"});
  }
  function elevation(x:number,y:number):number {
    const channel=(cx:number,end:number,width:number):number=>Math.hypot(x-cx,Math.max(0,end-y))-width;
    let d:number;
    if(props.layout==="basins") {
      d=Math.min(Math.hypot(x+2.1,y+1.2)-1.65,Math.hypot(x-2.1,y+1.2)-1.65,channel(-2.1,-0.8,0.75),channel(2.1,-0.8,0.75));
    } else if(props.layout==="arch") {
      d=Math.min(Math.hypot(x,y+1.7)-2.25,channel(0,-1.3,1.35));
    } else {
      const junction=Math.hypot(Math.max(0,Math.abs(x)-2.1),y-0.3)-0.65;
      d=Math.min(channel(-2.1,-2,0.85),channel(2.1,-2,0.85),junction);
    }
    // A low connected gutter precedes sloping pool margins and broad dry terraces.
    let z=d<-0.35?0.14+Math.max(0,2-y)*0.025:d<0.5?0.26+(d+0.35)*1.25:1.5;
    if(y<-3&&Math.abs(x)>2.4) z=2.15;
    return Math.min(2.15,z);
  }
  function rebuild():void {
    staticFaces=[];floor=[];
    pixelBox(staticFaces,[-6,-4,-1],[12,8,1],{tone:0.27});
    const grid:PixelPoint[][]=[];
    for(let j=0;j<=8;j++) {
      const row:PixelPoint[]=[];
      for(let i=0;i<=10;i++) {const x=-6+i*1.2,y=-4+j;row.push([x,y,elevation(x,y)]);}
      grid.push(row);
    }
    for(let j=0;j<8;j++) for(let i=0;i<10;i++) {
      const a=grid[j]![i]!,b=grid[j]![i+1]!,c=grid[j+1]![i+1]!,d=grid[j+1]![i]!;
      const triangles:ShelfTriangle[]=[[a,b,c],[a,c,d]];
      for(const points of triangles) {
        staticFaces.push({points,tone:Math.max(...points.map(p=>p[2]))>1.5?0.59:0.43});
        if(Math.min(...points.map(p=>p[2]))<1.15) floor.push(points);
      }
      const edge=(u:PixelPoint,v:PixelPoint):void=>{staticFaces.push({points:[u,v,[v[0],v[1],0],[u[0],u[1],0]],tone:0.36});};
      if(j===0)edge(a,b);if(j===7)edge(d,c);if(i===0)edge(a,d);if(i===9)edge(b,c);
    }
    if(props.layout==="arch") {
      // Dry piers stand outside the gutter; the lintel leaves a true opening below it.
      pixelBox(staticFaces,[-3.2,0.9,1.1],[1.1,1.1,1.05],{tone:0.58});
      pixelBox(staticFaces,[2.1,0.9,1.1],[1.1,1.1,1.05],{tone:0.58});
      pixelBox(staticFaces,[-3.2,0.9,2.15],[6.4,1.1,0.65],{tone:0.7});
    }
    // One large limp frond rests on the dry left ledge in a few broad lobes.
    staticFaces.push({points:[[-5.5,2.9,1.55],[-5.15,0.8,1.55],[-4.6,-0.2,1.55],[-4.7,1.5,1.55],[-4.3,2.3,1.55],[-4.9,2.1,1.55]],tone:0.73});
    staticFaces.push({points:[[-5.15,0.8,1.56],[-5.7,0.1,1.56],[-5.5,-0.8,1.56],[-4.95,0.3,1.56]],tone:0.64});
    // Oversized faceted shells establish scale without a field of small debris.
    for(const [x,y] of [[4.7,2.8],[-4.8,-2.3],[4.8,-1.5]] as const) {
      const z=elevation(x,y)+0.04;
      const rim:PixelPoint[]=[[x-0.55,y+0.3,z],[x-0.6,y-0.2,z],[x,y-0.5,z],[x+0.6,y-0.2,z],[x+0.55,y+0.3,z]];
      const tip:PixelPoint=[x,y+0.25,z+0.5];
      for(let i=0;i<4;i++)staticFaces.push({points:[rim[i]!,rim[i+1]!,tip],tone:0.65+i*0.06});
    }
    pixelPrism(staticFaces,[[-6,-3.8],[-3.2,-3.8],[-3.2,-3.25],[-5.5,-3.25]],1.5,0.35,{tone:0.53});
  }
  function draw(t:number):void {
    const moving:PixelFace[]=[];
    const cycle=Math.max(12,Math.min(30,props.cycleSeconds));
    const phase=t/1000*Math.PI*2/cycle+(Math.max(1,Math.min(99,props.seed))-1)*0.17;
    const water=0.3+Math.max(0.15,Math.min(0.55,props.tideRange))*1.5*(0.5+Math.sin(phase)*0.5);
    for(const triangle of floor) {
      const wet:PixelPoint[]=[];
      const crossings:PixelPoint[]=[];
      for(let i=0;i<3;i++) {
        const a=triangle[i]!,b=triangle[(i+1)%3]!;
        if(a[2]<=water)wet.push([a[0],a[1],water]);
        if((a[2]<water)!==(b[2]<water)) {
          const u=(water-a[2])/(b[2]-a[2]);
          const point:PixelPoint=[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,water];
          wet.push(point);crossings.push(point);
        }
      }
      if(wet.length>=3)moving.push({points:wet,ink:"accent",tone:0.66});
      if(crossings.length===2) {
        const a=crossings[0]!,b=crossings[1]!;
        const dx=b[0]-a[0],dy=b[1]-a[1],n=Math.max(0.001,Math.hypot(dx,dy));
        const ox=-dy/n*0.045,oy=dx/n*0.045;
        moving.push({points:[[a[0]-ox,a[1]-oy,water+0.015],[b[0]-ox,b[1]-oy,water+0.015],[b[0]+ox,b[1]+oy,water+0.015],[a[0]+ox,a[1]+oy,water+0.015]],ink:"accent",tone:0.98});
      }
    }
    renderer.draw(staticFaces,moving,palette.colors,shelfView);
    attrs.set("data-pica-ready","true");
  }
  resize();rebuild();
  const loop=createLoop({el:host,fps:12,paused:props.paused,time:props.time,still:1200,frame:draw});
  return {
    update(next) {
      const before=props;props={...props,...next};
      if(props.layout!==before.layout)rebuild();
      palette.refresh();loop.update({paused:props.paused,time:props.time});loop.redraw();
    },
    destroy() {
      if(destroyed)return;destroyed=true;
      loop.destroy();palette.destroy();surface.destroy();attrs.restore();
    },
  };
};
