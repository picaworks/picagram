import { createCanvas } from "../../../lib/canvas";
import { hostAttributes } from "../../../lib/host";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { createPixelScene, pixelPrism, type PixelFace, type PixelPoint, type PixelView } from "../../../lib/pixel-scene";
import type { Mount, MotionProps } from "../../../lib/types";

export interface PixelDuneSlipfaceProps extends MotionProps {
  /** Curved horns, two unequal peaks or a long diagonal knife edge. */
  layout: "crescent" | "saddle" | "ridge";
  /** Crest height relative to the available vertical space. */
  crestHeight: number;
  /** Seconds between coherent small sand releases. */
  releaseSeconds: number;
}
export const defaults: PixelDuneSlipfaceProps = {layout:"crescent",crestHeight:0.65,releaseSeconds:10,paused:false,time:null,seed:1};
const duneView:PixelView={bounds:[[-6.3,-4.8,-1.2],[6.3,4.8,4.3]],ground:0.5};
function duneLerp(a:PixelPoint,b:PixelPoint,t:number,lift=0):PixelPoint{return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t+lift];}


export const mount: Mount<PixelDuneSlipfaceProps>=(host,initial={})=>{
  let props={...defaults,...initial};
  const attrs=hostAttributes(host);attrs.set("role",null);attrs.set("aria-label",null);attrs.set("aria-hidden","true");
  const surface=createCanvas(host,{autoSize:false,css:"image-rendering:pixelated",onResize:()=>{resize();loop.redraw();}});
  const renderer=createPixelScene(surface.canvas);
  const palette=watchPalette(host,()=>loop.redraw());
  let staticFaces:PixelFace[]=[];
  let releaseFoot:PixelPoint=[0,1,0.6];
  let releaseCrests:PixelPoint[]=[],releaseFeet:PixelPoint[]=[],releaseIndex=3;
  function patch(out:PixelFace[],q0:number,q1:number,from:number,to:number,tone:number,lift:number,accent:boolean):void {
    for(let cell=Math.floor(q0);cell<Math.ceil(q1);cell++) {
      const lo=Math.max(q0,cell)-cell,hi=Math.min(q1,cell+1)-cell;
      if(hi<=lo)continue;
      const a=releaseCrests[cell]!,b=releaseCrests[cell+1]!,c=releaseFeet[cell+1]!,d=releaseFeet[cell]!;
      const project=(u:number,t:number):PixelPoint=>{
        const w=t<=u?[1-u,u-t,t,0]:[1-t,0,u,t-u];
        return [a[0]*w[0]!+b[0]*w[1]!+c[0]*w[2]!+d[0]*w[3]!,a[1]*w[0]!+b[1]*w[1]!+c[1]*w[2]!+d[1]*w[3]!,a[2]*w[0]!+b[2]*w[1]!+c[2]*w[2]!+d[2]*w[3]!+lift];
      };
      // Clip at the terrain triangle diagonal before projecting any polygon.
      for(const side of [-1,1]) {
        const input: [number,number][]=[[lo,from],[hi,from],[hi,to],[lo,to]],clipped:[number,number][]=[];
        for(let i=0;i<input.length;i++) {
          const p=input[i]!,q=input[(i+1)%input.length]!,dp=(p[1]-p[0])*side,dq=(q[1]-q[0])*side;
          if(dp>=0)clipped.push(p);
          if((dp<0)!==(dq<0)){const u=dp/(dp-dq);clipped.push([p[0]+(q[0]-p[0])*u,p[1]+(q[1]-p[1])*u]);}
        }
        for(let i=1;i<clipped.length-1;i++)out.push({points:[project(...clipped[0]!),project(...clipped[i]!),project(...clipped[i+1]!)],ink:accent?"accent":"fg",tone});
      }
    }
  }
  function band(out:PixelFace[],from:number,to:number,width:number,tone:number,lift:number):void {
    const half=width/(10/6)/2;
    patch(out,releaseIndex-half,releaseIndex+half,from,to,tone,lift,true);
  }
  let destroyed=false;
  function resize():void {
    const w=surface.cssWidth,h=surface.cssHeight,scale=Math.max(3,Math.ceil(w/360),Math.ceil(h/300));
    surface.canvas.width=Math.max(1,Math.floor(w/scale));surface.canvas.height=Math.max(1,Math.floor(h/scale));
    Object.assign(surface.canvas.style,{width:`${surface.canvas.width*scale}px`,height:`${surface.canvas.height*scale}px`,left:`${Math.floor((w-surface.canvas.width*scale)/2)}px`,top:`${Math.floor((h-surface.canvas.height*scale)/2)}px`,right:"auto",bottom:"auto"});
  }
  function rebuild():void {
    staticFaces=[];
    const h=0.6+Math.max(0.45,Math.min(0.8,props.crestHeight))*3.7;
    pixelPrism(staticFaces,[[-6,-3.5],[-4.8,-4.3],[4.8,-4.3],[6,-2.8],[6,3.5],[4.5,4.3],[-4.5,4.3],[-6,2.6]],-1,1.5,{tone:0.28});
    // A broad exposed layer makes the finite front cutaway explicit.
    staticFaces.push({points:[[-4.5,4.301,-0.55],[4.5,4.301,-0.55],[4.5,4.301,-0.22],[-4.5,4.301,-0.22]],tone:0.48});
    const crests:PixelPoint[]=[],feet:PixelPoint[]=[],backs:PixelPoint[]=[],shoulders:PixelPoint[]=[];
    const saddle=[1.05,h*0.85,h*0.64,h*0.56,h,h*0.69,1.05];
    const ridge=[1.1,h*0.86,h,h*0.94,h*0.82,h*0.65,1.05];
    for(let i=0;i<=6;i++) {
      const x=-5+i*10/6;
      let y:number,z:number,fy:number;
      if(props.layout==="saddle") {y=-1.1+0.06*x;z=saddle[i]!;fy=2.5;}
      else if(props.layout==="ridge") {y=-2+(x+5)*0.19;z=ridge[i]!;fy=y+3.55;}
      else {const u=Math.abs(x)/5;y=-1.2+2.5*u*u;z=1.1+(h-1.1)*Math.pow(1-u,0.65);fy=2.5+0.55*u;}
      crests.push([x,y,z]);feet.push([x*0.9,fy,0.6]);backs.push([x*1.08,-4.1,0.5]);shoulders.push([x*1.04,(-4.1+y)/2,0.5+(z-0.5)*0.55]);
    }
    releaseCrests=crests;releaseFeet=feet;
    for(let i=0;i<6;i++) {
      const a=crests[i]!,b=crests[i+1]!,c=feet[i+1]!,d=feet[i]!,rearA=backs[i]!,rearB=backs[i+1]!;
      const shoulderA=shoulders[i]!,shoulderB=shoulders[i+1]!;
      for(const [p,q,r,t] of [[rearA,rearB,shoulderB,shoulderA],[shoulderA,shoulderB,b,a]] as const) {
        staticFaces.push({points:[p,q,r],tone:0.36},{points:[p,r,t],tone:0.36});
      }
      staticFaces.push({points:[a,b,c],tone:0.56},{points:[a,c,d],tone:0.56});
      // Three wide contour folds describe the clean slope without granular noise.
      for(const t of [0.27,0.55,0.82]) {
        patch(staticFaces,i,i+1,t,t+0.025,0.43,0.012,false);
      }

    }
    for(const i of [0,6]) {
      const edge=[backs[i]!,shoulders[i]!,crests[i]!,feet[i]!];
      for(let j=0;j<edge.length-1;j++) {
        const a=edge[j]!,b=edge[j+1]!,c:PixelPoint=[b[0],b[1],0.5],d:PixelPoint=[a[0],a[1],0.5];
        staticFaces.push({points:[a,b,c],tone:0.4},{points:[a,c,d],tone:0.4});
      }
    }
    const index=props.layout==="crescent"?3:4;
    releaseIndex=index;releaseCrests=crests;releaseFeet=feet;
    releaseFoot=duneLerp(crests[index]!,feet[index]!,1,0.035);
    // Only the small contained receiving apron remains accent between releases.
    const [x,y]=releaseFoot;
    pixelPrism(staticFaces,[[x-0.75,y-0.1],[x+0.75,y-0.1],[x+1.25,y+0.65],[x+0.7,y+1.05],[x-0.8,y+1.05],[x-1.25,y+0.6]],0.6,0.06,{ink:"accent",tone:0.55});
    pixelPrism(staticFaces,[[-4.4,2.2],[-3.4,2],[-2.9,2.7],[-3.4,3.25],[-4.3,3.1]],0.5,0.55,{tone:0.75});
  }
  function draw(t:number):void {
    const moving:PixelFace[]=[];
    const seconds=Math.max(7,Math.min(16,props.releaseSeconds));
    const offset=(Math.max(1,Math.min(99,props.seed))-1)*0.071+0.12;
    const clock=t/1000/seconds+offset;
    for(const phase of [clock,clock+0.5]) {
      const head=(((phase%1)+1)%1)*1.2,tail=Math.max(0,head-0.2),end=Math.min(1,head);
      if(end>tail) {
        band(moving,tail,end,1.25,0.84,0.025);
        band(moving,Math.max(tail,end-0.045),end,1.35,0.94,0.035);
      }
    }
    renderer.draw(staticFaces,moving,palette.colors,duneView);attrs.set("data-pica-ready","true");
  }
  resize();rebuild();
  const loop=createLoop({el:host,fps:12,paused:props.paused,time:props.time,still:1200,frame:draw});
  return {
    update(next){const before=props;props={...props,...next};if(props.layout!==before.layout||props.crestHeight!==before.crestHeight)rebuild();palette.refresh();loop.update({paused:props.paused,time:props.time});loop.redraw();},
    destroy(){if(destroyed)return;destroyed=true;loop.destroy();palette.destroy();surface.destroy();attrs.restore();},
  };
};
