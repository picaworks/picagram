import { createCanvas } from "../../../lib/canvas";
import { hostAttributes } from "../../../lib/host";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { createPixelScene, pixelPrism, type PixelFace, type PixelPoint, type PixelView } from "../../../lib/pixel-scene";
import type { Mount, MotionProps } from "../../../lib/types";

export interface PixelTerracedGardenProps extends MotionProps {
  /** Curved fan, alternating straight rills or nested horseshoe beds. */
  layout: "fan" | "switchback" | "bowl";
  /** Broad planted portions of the soil strips, preserving spill gaps. */
  planting: number;
  /** Thickness and pace of the connected irrigation marks. */
  flow: number;
}
export const defaults: PixelTerracedGardenProps = {layout:"fan",planting:0.5,flow:0.5,paused:false,time:null,seed:1};
const gardenView:PixelView={bounds:[[-6.6,-5,-1],[6.6,5,6.2]],ground:0.5};
type GardenSegment={a:PixelPoint;b:PixelPoint;side:PixelPoint;start:number;length:number};
type GardenRill={segments:GardenSegment[];length:number};
function gardenStrip(out:PixelFace[],a:PixelPoint,b:PixelPoint,side:PixelPoint,width:number,tone:number):void {
  const p=(v:PixelPoint,s:number):PixelPoint=>[v[0]+side[0]*s*width/2,v[1]+side[1]*s*width/2,v[2]];
  out.push({points:[p(a,-1),p(a,1),p(b,1),p(b,-1)],ink:"accent",tone});
}

export const mount: Mount<PixelTerracedGardenProps>=(host,initial={})=>{
  let props={...defaults,...initial};
  const attrs=hostAttributes(host);attrs.set("role",null);attrs.set("aria-label",null);attrs.set("aria-hidden","true");
  const surface=createCanvas(host,{autoSize:false,css:"image-rendering:pixelated",onResize:()=>{resize();loop.redraw();}});
  const renderer=createPixelScene(surface.canvas);
  const palette=watchPalette(host,()=>loop.redraw());
  let staticFaces:PixelFace[]=[];
  let rills:GardenRill[]=[];
  let destroyed=false;
  function resize():void {
    const w=surface.cssWidth,h=surface.cssHeight,scale=Math.max(3,Math.ceil(w/360),Math.ceil(h/300));
    surface.canvas.width=Math.max(1,Math.floor(w/scale));surface.canvas.height=Math.max(1,Math.floor(h/scale));
    Object.assign(surface.canvas.style,{width:`${surface.canvas.width*scale}px`,height:`${surface.canvas.height*scale}px`,left:`${Math.floor((w-surface.canvas.width*scale)/2)}px`,top:`${Math.floor((h-surface.canvas.height*scale)/2)}px`,right:"auto",bottom:"auto"});
  }
  function rebuild():void {
    staticFaces=[];rills=[];
    const planting=Math.max(0.3,Math.min(0.7,props.planting));
    const width=0.24+Math.max(0.2,Math.min(0.8,props.flow))*0.34;
    const ellipse=(x:number,y:number,rx:number,ry:number):readonly(readonly[number,number])[]=>Array.from({length:8},(_,i)=>[x+Math.cos(i*Math.PI/4)*rx,y+Math.sin(i*Math.PI/4)*ry] as const);
    const bed=(points:readonly(readonly[number,number])[],z:number):void=>{
      pixelPrism(staticFaces,points,0.5,z-0.5,{tone:0.46});
      staticFaces.push({points:points.map(([x,y]):PixelPoint=>[x,y,z+0.055]),tone:0.24});
    };
    const crop=(x:number,y:number,z:number,w:number):void=>{
      pixelPrism(staticFaces,[[x-0.065,y-0.04],[x+0.065,y-0.04],[x,y+0.07]],z+0.06,0.22,{tone:0.52});
      // Three broad overlapping lobes fold upward from the same planted stem.
      for(let i=0;i<3;i++) {
        const a=-Math.PI/2+i*Math.PI*2/3,c=Math.cos(a),s=Math.sin(a);
        const leaf=(along:number,across:number,h:number):PixelPoint=>[
          x+w*0.49*(c*along-s*across),
          y+0.36*(s*along+c*across),
          z+h,
        ];
        const root=leaf(0,0,0.17),tip=leaf(1,0,0.23);
        const left=leaf(0.52,-0.55,0.15),right=leaf(0.52,0.55,0.15);
        const fold=leaf(0.5,0,0.57);
        // Two shaded leaf halves share a raised ridge, with no box or stone-like cap.
        staticFaces.push(
          {points:[root,left,fold],tone:0.69},
          {points:[left,tip,fold],tone:0.69},
          {points:[root,fold,right],tone:0.4},
          {points:[fold,tip,right],tone:0.4},
        );
      }
    };
    const rill=(points:readonly PixelPoint[]):void=>{
      let length=0;
      const segments:GardenSegment[]=[];
      for(let i=1;i<points.length;i++) {
        const a=points[i-1]!,b=points[i]!,dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],flat=Math.hypot(dx,dy);
        const side:PixelPoint=Math.abs(dz)>flat?[1,0,0]:[-dy/Math.max(0.001,flat),dx/Math.max(0.001,flat),0];
        const size=Math.hypot(dx,dy,dz);
        gardenStrip(staticFaces,a,b,side,width,0.62);
        if(Math.abs(dz)<0.1) for(const sign of [-1,1]) {
          const edge=(p:PixelPoint,extra:number):PixelPoint=>[p[0]+side[0]*sign*(width/2+extra),p[1]+side[1]*sign*(width/2+extra),p[2]+0.035];
          staticFaces.push({points:[edge(a,0),edge(b,0),edge(b,0.09),edge(a,0.09)],tone:0.48});
        }
        segments.push({a,b,side,start:length,length:size});length+=size;
      }
      rills.push({segments,length});
    };
    const reservoir=(x:number,y:number,z:number):void=>{
      pixelPrism(staticFaces,ellipse(x,y,0.9,0.62),z-0.15,0.21,{tone:0.59});
      pixelPrism(staticFaces,ellipse(x,y,0.7,0.43),z+0.065,0.025,{ink:"accent",tone:0.78});
    };
    const catchBasin=(x:number,y:number):void=>{
      pixelPrism(staticFaces,ellipse(x,y,1.05,0.65),0.5,0.14,{tone:0.52});
      pixelPrism(staticFaces,ellipse(x,y,0.86,0.48),0.65,0.025,{ink:"accent",tone:0.72});
    };
    pixelPrism(staticFaces,[[-6,-3.5],[-4.8,-4.4],[4.8,-4.4],[6,-3],[6,3.5],[4.8,4.5],[-4.8,4.5],[-6,3]],-0.8,1.3,{tone:0.24});
    if(props.layout==="bowl") {
      for(let tier=0;tier<3;tier++) {
        const r=5-tier,z=4.5-tier*1.5;
        for(let i=0;i<6;i++) {
          const a=i*Math.PI/6,b=(i+1)*Math.PI/6;
          const p=(radius:number,angle:number):readonly[number,number]=>[Math.cos(angle)*radius,1-Math.sin(angle)*radius];
          bed([p(r,a),p(r,b),p(r-1,b),p(r-1,a)],z);
        }
        const channel:PixelPoint[]=[];
        for(let i=0;i<=8;i++) {const a=Math.PI-i*Math.PI/8;channel.push([Math.cos(a)*(r-0.22),1-Math.sin(a)*(r-0.22),z+0.09]);}
        rill(channel);
        for(const a of [0.58,1.57,2.56])crop(Math.cos(a)*(r-0.65),1-Math.sin(a)*(r-0.65),z,planting*1.65);
      }
      reservoir(-4.8,1,4.5);
      rill([[-4.8,1,4.59],[-4,1,4.59],[-3.98,1,3.09],[-3,1,3.09],[-2.98,1,1.59],[-2,1,1.59],[-1.98,1,0.68],[0,1,0.68]]);
      catchBasin(0,1);
    } else if(props.layout==="switchback") {
      for(let tier=0;tier<3;tier++) {
        const y=-3.25+tier*2.2,z=4.5-tier*1.5,shift=(tier-1)*0.35;
        bed([[shift-4.3,y],[shift+4.3,y],[shift+4.3,y+2.05],[shift-4.3,y+2.05]],z);
        for(const x of [-1.8,1.8])crop(x,y+0.8,z,planting*3.5);
      }
      reservoir(-3.3,-1.65,4.5);
      rill([[-3.3,-1.65,4.59],[3.3,-1.15,4.59],[3.3,-1.04,3.09],[3.3,1.05,3.09],[-3.3,1.05,3.09],[-3.3,1.16,1.59],[-3.3,3.25,1.59],[3.3,3.25,1.59],[3.3,3.36,0.68],[3.3,3.8,0.68]]);
      catchBasin(3.3,3.8);
    } else {
      for(let tier=0;tier<3;tier++) {
        const y=-3.35+tier*2.2,z=4.5-tier*1.5,w=3+tier;
        bed([[-w+0.8,y],[w-0.8,y],[w,y+1.5],[w-0.6,y+2.1],[-w+0.6,y+2.1],[-w,y+1.5]],z);
        for(const side of [-1,1]) {
          crop(side*w*0.56,y+0.65,z,planting*w*0.7);
          rill([[0,y+1.35,z+0.09],[side*w*0.72,y+1.55,z+0.09]]);
        }
      }
      reservoir(0,-2.95,4.5);
      rill([[0,-2.95,4.59],[0,-1.2,4.59],[0,-1.12,3.09],[0,1,3.09],[0,1.08,1.59],[0,3.2,1.59],[0,3.28,0.68],[0,3.8,0.68]]);
      catchBasin(0,3.8);
    }
  }
  function draw(t:number):void {
    const moving:PixelFace[]=[];
    const flow=Math.max(0.2,Math.min(0.8,props.flow));
    const phase=t/1000*(0.75+flow*1.2)+(Math.max(1,Math.min(99,props.seed))-1)*0.13;
    for(const rill of rills) {
      const count=Math.max(2,Math.ceil(rill.length/1.8));
      for(let i=0;i<count;i++) {
        const distance=(phase+i*rill.length/count)%rill.length;
        const segment=rill.segments.find(s=>distance>=s.start&&distance<s.start+s.length);
        if(!segment)continue;
        const u=(distance-segment.start)/segment.length,v=Math.min(1,u+0.45/segment.length);
        const at=(f:number):PixelPoint=>[segment.a[0]+(segment.b[0]-segment.a[0])*f,segment.a[1]+(segment.b[1]-segment.a[1])*f+0.012,segment.a[2]+(segment.b[2]-segment.a[2])*f+0.018];
        gardenStrip(moving,at(u),at(v),segment.side,0.18+flow*0.25,0.98);
      }
    }
    renderer.draw(staticFaces,moving,palette.colors,gardenView);attrs.set("data-pica-ready","true");
  }
  resize();rebuild();
  const loop=createLoop({el:host,fps:12,paused:props.paused,time:props.time,still:1200,frame:draw});
  return {
    update(next){const before=props;props={...props,...next};if(props.layout!==before.layout||props.planting!==before.planting||props.flow!==before.flow)rebuild();palette.refresh();loop.update({paused:props.paused,time:props.time});loop.redraw();},
    destroy(){if(destroyed)return;destroyed=true;loop.destroy();palette.destroy();surface.destroy();attrs.restore();},
  };
};
