import { createCanvas } from "../../../lib/canvas";
import { hostAttributes } from "../../../lib/host";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { createPixelScene, pixelBox, pixelPrism, pixelRod, type PixelFace, type PixelPoint, type PixelView } from "../../../lib/pixel-scene";
import type { Mount, MotionProps } from "../../../lib/types";
export interface FreightSidingProps extends MotionProps {
  /** Straight spur, broad warehouse bend or connected depot fork. */
  track:"straight"|"elbow"|"fork";
  /** Coupled freight wagons behind the single locomotive. */
  wagons:number;
  /** Seconds for both shunting trips and their full stops. */
  shuntSeconds:number;
}
export const defaults: FreightSidingProps = {track:"straight",wagons:3,shuntSeconds:30,paused:false,time:null,seed:1};
type FreightPose=readonly [number,number,number];
interface FreightTrack { length:number; point:(s:number)=>FreightPose; view:PixelView; }
function freightCount(n:number):number{return Math.max(1,Math.min(3,Math.round(n)));}
function freightTrack(props:FreightSidingProps):FreightTrack {
  const count=freightCount(props.wagons),length=76+count*15;
  if(props.track!=="elbow")return {length,point:(s)=>[s-length/2,0,0],view:{bounds:[[-length/2-12,-36,-3],[length/2+12,34,21]],ground:0}};
  const straight=14+count*8,arc=16*Math.PI;
  return {length:straight*2+arc,point:(s)=>{
    if(s<straight)return [-32-straight+s,-32,0];
    if(s<straight+arc){const a=-Math.PI/2+(s-straight)/32;return [-32+32*Math.cos(a),32*Math.sin(a),a+Math.PI/2];}
    return [0,s-straight-arc,Math.PI/2];
  },view:{bounds:[[-straight-44,-48,-3],[23,straight+13,21]],ground:0}};
}
function freightPlace(faces:readonly PixelFace[],pose:FreightPose):PixelFace[] {
  const [px,py,a]=pose,c=Math.cos(a),s=Math.sin(a);
  return faces.map((face):PixelFace=>({...face,points:face.points.map(([x,y,z]):PixelPoint=>[px+c*x-s*y,py+s*x+c*y,z])}));
}
function freightBox(out:PixelFace[],pose:FreightPose,min:PixelPoint,size:PixelPoint,tone:number):void {
  const local:PixelFace[]=[];pixelBox(local,min,size,{tone});out.push(...freightPlace(local,pose));
}
function freightStatic(props:FreightSidingProps,track:FreightTrack):PixelFace[] {
  const faces:PixelFace[]=[],bounds=track.view.bounds,[lo,hi]=bounds;
  pixelPrism(faces,[[lo[0]+2,lo[1]+8],[lo[0]+9,lo[1]+2],[hi[0]-9,lo[1]+2],[hi[0]-2,lo[1]+9],[hi[0]-2,hi[1]-9],[hi[0]-9,hi[1]-2],[lo[0]+9,hi[1]-2],[lo[0]+2,hi[1]-9]],-3,3,{tone:0.12});
  function railPath(point:(s:number)=>FreightPose,length:number,steps:number):void {
    for(let i=0;i<steps;i++) {
      const a=point(length*i/steps),b=point(length*(i+1)/steps);
      const strip=(offset:number,width:number,z:number,tone:number):void=>{
        const xy=(p:FreightPose,d:number,h:number):PixelPoint=>[p[0]-Math.sin(p[2])*d,p[1]+Math.cos(p[2])*d,h];
        const p=xy(a,offset-width,z),q=xy(b,offset-width,z),r=xy(b,offset+width,z),s=xy(a,offset+width,z);
        faces.push({points:[p,q,r,s],tone});
        if(z>0.8) {
          faces.push({points:[p,q,xy(b,offset-width,0.8),xy(a,offset-width,0.8)],tone});
          faces.push({points:[s,r,xy(b,offset+width,0.8),xy(a,offset+width,0.8)],tone});
        }
      };
      strip(0,6,0.1,0.25);strip(-2.7,0.45,1.4,0.83);strip(2.7,0.45,1.4,0.83);
    }
    for(let s=3;s<length;s+=10)freightBox(faces,point(s),[-0.9,-4.5,0.2],[1.8,9,0.6],0.43);
  }
  railPath(track.point,track.length,24);
  if(props.track==="fork") {
    const branch=(s:number):FreightPose=>[s,0.028*s*s,Math.atan(0.056*s)];
    railPath(branch,25,7);
    freightBox(faces,branch(25),[-1,-5,1.4],[2,10,3],0.7);
  }
  const front=track.point(15),back=track.point(track.length-15);
  freightBox(faces,front,[-10,-6,0.15],[20,12,0.3],0.4);
  // The loading canopy is beside the running rails so the whole train remains visible.
  freightBox(faces,back,[-11,-15,0],[22,9,2],0.35);
  for(const x of [-9,9])freightBox(faces,back,[x,-14,2],[1.5,1.5,12],0.65);
  freightBox(faces,back,[-12,-16,14],[24,11,2],0.65);
  if(props.track==="elbow") {
    pixelBox(faces,[-32-14-freightCount(props.wagons)*8,-44,0],[50,3,4],{tone:0.3});
    pixelBox(faces,[12,-32,0],[3,50,4],{tone:0.3});
    pixelBox(faces,[-31,-13,0],[17,14,9],{tone:0.4});
    pixelBox(faces,[-32,-14,9],[19,16,2],{tone:0.65});
  } else {
    const x=-6+(props.seed%3)*2;
    pixelBox(faces,[-track.length/2+3,-19,0],[track.length-6,3,4],{tone:0.3});
    pixelBox(faces,[x,-32,0],[18,12,9],{tone:0.4});
    pixelBox(faces,[x-1,-33,9],[20,14,2],{tone:0.65});
  }
  return faces;
}
function freightBody(locomotive:boolean):PixelFace[] {
  const faces:PixelFace[]=[];
  pixelBox(faces,[-6,-3.6,3],[12,7.2,1.5],{tone:0.6});
  if(locomotive) {
    pixelBox(faces,[-5.5,-3.3,4.5],[4.5,6.6,7],{ink:"accent",tone:0.9});
    pixelBox(faces,[-1,-2.6,4.5],[6.5,5.2,4],{ink:"accent",tone:0.82});
    pixelBox(faces,[-5.9,-3.7,11.5],[5.3,7.4,1],{tone:0.78});
    pixelBox(faces,[-4.5,-3.4,8.5],[2.5,0.2,2],{tone:0.18});
  } else pixelBox(faces,[-5.5,-3.5,4.5],[11,7,5],{tone:0.5});
  return faces;
}
function freightBehind(track:FreightTrack,s:number,distance:number):number {
  const p=track.point(s);let lo=s-distance*1.4,hi=s;
  for(let i=0;i<18;i++){const mid=(lo+hi)/2,q=track.point(mid);if(Math.hypot(q[0]-p[0],q[1]-p[1])>distance)lo=mid;else hi=mid;}
  return (lo+hi)/2;
}
export const mount: Mount<FreightSidingProps>=(host,initial={})=>{
  let props={...defaults,...initial},track=freightTrack(props),staticFaces=freightStatic(props,track);
  const engine=freightBody(true),wagon=freightBody(false),attrs=hostAttributes(host);
  attrs.set("role",null);attrs.set("aria-label",null);attrs.set("aria-hidden","true");
  let redraw=():void=>{};
  const surface=createCanvas(host,{autoSize:false,css:"image-rendering:pixelated",onResize:()=>{resize();redraw();}});
  const scene=createPixelScene(surface.canvas),palette=watchPalette(host,()=>redraw());
  function resize():void {
    const w=Math.max(1,surface.cssWidth),h=Math.max(1,surface.cssHeight),scale=Math.max(3,Math.ceil(w/360),Math.ceil(h/300)),canvas=surface.canvas;
    canvas.width=Math.max(1,Math.floor(w/scale));canvas.height=Math.max(1,Math.floor(h/scale));
    canvas.style.width=`${canvas.width*scale}px`;canvas.style.height=`${canvas.height*scale}px`;
    canvas.style.left=`${Math.floor((w-canvas.width*scale)/2)}px`;canvas.style.top=`${Math.floor((h-canvas.height*scale)/2)}px`;
  }
  resize();
  function draw(t:number):void {
    const count=freightCount(props.wagons),seconds=Math.max(16,Math.min(36,props.shuntSeconds)),phase=((t/(seconds*1000)+0.16)%1+1)%1,q=phase<0.5?phase*2:(1-phase)*2;
    const u=Math.max(0,Math.min(1,(q-0.012)/0.976)),travel=u*u*(3-2*u),start=(count+1)*12+count*3.5+10;
    let s=start+(track.length-9-start)*travel;
    const moving:PixelFace[]=[];
    for(let i=0;i<=count;i++) {
      const rear=freightBehind(track,s,12),a=track.point(s),b=track.point(rear);
      const pose:FreightPose=[(a[0]+b[0])/2,(a[1]+b[1])/2,Math.atan2(a[1]-b[1],a[0]-b[0])];
      moving.push(...freightPlace(i===0?engine:wagon,pose));
      for(const axle of [s-2,rear+2])freightBox(moving,track.point(axle),[-1,-3.5,1.5],[2,7,1.5],0.8);
      if(i<count) {
        const next=freightBehind(track,rear,3.5),c=track.point(next);
        pixelRod(moving,[b[0],b[1],3.7],[c[0],c[1],3.7],0.5,{tone:0.7},6);
        s=next;
      }
    }
    scene.draw(staticFaces,moving,palette.colors,track.view);attrs.set("data-pica-ready","true");
  }
  const loop=createLoop({el:host,fps:12,paused:props.paused,time:props.time,still:1200,frame:draw});redraw=()=>loop.redraw();
  let destroyed=false;
  return {
    update(next){const before=props;props={...props,...next};if(props.track!==before.track||props.wagons!==before.wagons||props.seed!==before.seed){track=freightTrack(props);staticFaces=freightStatic(props,track);}palette.refresh();loop.update({paused:props.paused,time:props.time});loop.redraw();},
    destroy(){if(destroyed)return;destroyed=true;loop.destroy();palette.destroy();surface.destroy();attrs.restore();},
  };
};
