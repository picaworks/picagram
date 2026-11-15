import { createCanvas } from "../../../lib/canvas";
import { hostAttributes } from "../../../lib/host";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { createPixelScene, pixelPrism, type PixelFace, type PixelPoint, type PixelView } from "../../../lib/pixel-scene";
import type { Mount, MotionProps } from "../../../lib/types";

export interface PixelBasaltCraterProps extends MotionProps {
  /** Broken cone, unequal enclosing shoulders or a long narrow vent. */
  layout: "openCone" | "twinRim" | "fissure";
  /** Width of the contained lava well relative to the basalt tile. */
  wellSpan: number;
  /** Seconds for the three crust rafts to complete one circuit. */
  convectionSeconds: number;
}
export const defaults: PixelBasaltCraterProps = {layout:"openCone",wellSpan:0.4,convectionSeconds:26,paused:false,time:null,seed:1};
const craterView:PixelView={bounds:[[-6.5,-5.5,-1.3],[6.5,5.5,6.5]],ground:0.5};
const craterTau=Math.PI*2;
function craterMix(a:PixelPoint,b:PixelPoint,t:number,lift=0):PixelPoint{return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t+lift];}

export const mount: Mount<PixelBasaltCraterProps>=(host,initial={})=>{
  let props={...defaults,...initial};
  const attrs=hostAttributes(host);attrs.set("role",null);attrs.set("aria-label",null);attrs.set("aria-hidden","true");
  const surface=createCanvas(host,{autoSize:false,css:"image-rendering:pixelated",onResize:()=>{resize();loop.redraw();}});
  const renderer=createPixelScene(surface.canvas);
  const palette=watchPalette(host,()=>loop.redraw());
  let staticFaces:PixelFace[]=[];
  let wellX=2.4,wellY=2.4;
  let destroyed=false;
  function resize():void {
    const w=surface.cssWidth,h=surface.cssHeight,scale=Math.max(3,Math.ceil(w/360),Math.ceil(h/300));
    surface.canvas.width=Math.max(1,Math.floor(w/scale));surface.canvas.height=Math.max(1,Math.floor(h/scale));
    Object.assign(surface.canvas.style,{width:`${surface.canvas.width*scale}px`,height:`${surface.canvas.height*scale}px`,left:`${Math.floor((w-surface.canvas.width*scale)/2)}px`,top:`${Math.floor((h-surface.canvas.height*scale)/2)}px`,right:"auto",bottom:"auto"});
  }
  function rebuild():void {
    staticFaces=[];
    const radius=Math.max(0.25,Math.min(0.5,props.wellSpan))*6;
    wellX=radius*(props.layout==="fissure"?0.52:props.layout==="twinRim"?1.2:1);
    wellY=radius*(props.layout==="fissure"?1.3:props.layout==="twinRim"?0.8:1);
    const outerX=5.7,outerY=4.8;
    const rimX=wellX+(props.layout==="fissure"?1.45:1.05),rimY=wellY+(props.layout==="fissure"?0.48:1.05);
    pixelPrism(staticFaces,[[-6,-3.8],[-4.8,-4.9],[4.2,-4.9],[6,-2.9],[6,3.4],[4.3,4.9],[-4.7,4.9],[-6,2.8]],-1,1.5,{tone:0.25});
    const lava=Array.from({length:16},(_,i):readonly[number,number]=>[Math.cos(i*craterTau/16)*wellX,Math.sin(i*craterTau/16)*wellY]);
    pixelPrism(staticFaces,lava,0.6,0.4,{ink:"accent",tone:0.85});
    const base:PixelPoint[]=[],rimOuter:PixelPoint[]=[],rimInner:PixelPoint[]=[],bottom:PixelPoint[]=[];
    for(let i=0;i<16;i++) {
      const a=i*craterTau/16,c=Math.cos(a),s=Math.sin(a);
      const opening=i>=0&&i<=4;
      let height:number;
      if(props.layout==="twinRim")height=s<0?4.7+(i%3)*0.25:2.45+(i%3)*0.18;
      else if(props.layout==="fissure")height=1.5+Math.abs(c)*3.7+(i%3)*0.16;
      else height=4.15+(i%4)*0.27;
      if(opening)height=props.layout==="fissure"?1.15:1.25;
      base.push([c*outerX,s*outerY,0.5]);
      rimOuter.push([c*rimX,s*rimY,height]);
      rimInner.push([c*(rimX-0.26),s*(rimY-0.26),height-0.12]);
      bottom.push([c*wellX,s*wellY,1.01]);
    }
    for(let i=0;i<16;i++) {
      const j=(i+1)%16,a=base[i]!,b=base[j]!,c=rimOuter[j]!,d=rimOuter[i]!;
      staticFaces.push({points:[a,b,c,d],tone:0.44+(i%3)*0.04});
      staticFaces.push({points:[d,c,rimInner[j]!,rimInner[i]!],tone:0.74});
      staticFaces.push({points:[rimInner[i]!,rimInner[j]!,bottom[j]!,bottom[i]!],tone:0.33});
      // Dry radial fractures are broad geometric cuts on the outer slope.
      if([2,6,9,12,14].includes(i)) {
        const u=0.48;
        const edgeA=craterMix(a,b,u),edgeB=craterMix(a,b,u+0.035);
        const highA=craterMix(d,c,u),highB=craterMix(d,c,u+0.035);
        staticFaces.push({points:[craterMix(edgeA,highA,0.12,0.025),craterMix(edgeB,highB,0.12,0.025),craterMix(edgeB,highB,0.89,0.025),craterMix(edgeA,highA,0.89,0.025)],tone:0.17});
      }
    }
    // A few coherent broken blocks continue the dry fractured rim at its opening.
    pixelPrism(staticFaces,[[3.6,2.7],[4.6,2.8],[4.8,3.6],[3.8,3.8],[3.3,3.2]],0.5,0.65,{tone:0.56});
    pixelPrism(staticFaces,[[-4.7,1.5],[-3.8,1.2],[-3.3,1.9],[-3.9,2.5],[-4.8,2.3]],0.5,0.85,{tone:0.49});
  }
  function draw(t:number):void {
    const moving:PixelFace[]=[];
    const seconds=Math.max(18,Math.min(40,props.convectionSeconds));
    const phase=t/1000*craterTau/seconds+(Math.max(1,Math.min(99,props.seed))-1)*0.17+0.2;
    const outline=[[-0.32,-0.12],[-0.18,-0.28],[0.14,-0.27],[0.34,-0.06],[0.2,0.24],[-0.2,0.25]] as const;
    for(let i=0;i<3;i++) {
      const a=phase+i*craterTau/3,c=Math.cos(a),s=Math.sin(a);
      // Affine coordinates preserve the same clear spacing in round and narrow wells.
      const raft=outline.map(([u,v]):readonly[number,number]=>[(0.43*c-u*s+v*c)*wellX,(0.43*s+u*c+v*s)*wellY]);
      pixelPrism(moving,raft,1.025,0.17,{tone:0.75});
      const p=raft[0]!,q=raft[3]!;
      moving.push({points:[[p[0],p[1],1.2],[q[0],q[1],1.2],[q[0]+c*wellX*0.04,q[1]+s*wellY*0.04,1.2],[p[0]+c*wellX*0.04,p[1]+s*wellY*0.04,1.2]],tone:0.49});
    }
    renderer.draw(staticFaces,moving,palette.colors,craterView);attrs.set("data-pica-ready","true");
  }
  resize();rebuild();
  const loop=createLoop({el:host,fps:12,paused:props.paused,time:props.time,still:1200,frame:draw});
  return {
    update(next){const before=props;props={...props,...next};if(props.layout!==before.layout||props.wellSpan!==before.wellSpan)rebuild();palette.refresh();loop.update({paused:props.paused,time:props.time});loop.redraw();},
    destroy(){if(destroyed)return;destroyed=true;loop.destroy();palette.destroy();surface.destroy();attrs.restore();},
  };
};
