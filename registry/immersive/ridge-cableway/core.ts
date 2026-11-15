import { createCanvas } from "../../../lib/canvas";
import { hostAttributes } from "../../../lib/host";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { createPixelScene, pixelBox, pixelPrism, pixelRod, type PixelFace, type PixelPoint, type PixelView } from "../../../lib/pixel-scene";
import type { Mount, MotionProps } from "../../../lib/types";
export interface RidgeCablewayProps extends MotionProps {
  /** Ridge span, supported gully crossing or terraced bank link. */
  route:"ridge"|"gully"|"terrace";
  /** Elevation gained by the upper terminal while the lower remains fixed. */
  rise:number;
  /** Seconds for both journeys and the brief terminal dwells. */
  tripSeconds:number;
}
export const defaults: RidgeCablewayProps = {route:"ridge",rise:30,tripSeconds:26,paused:false,time:null,seed:1};
const cableView:PixelView={bounds:[[-48,-25,-3],[48,25,52]],ground:0,yaw:45,elevation:30};
function cableRise(n:number):number{return Math.max(14,Math.min(30,n));}
function cableStatic(props:RidgeCablewayProps):PixelFace[]{
  const faces:PixelFace[]=[],rise=cableRise(props.rise);
  const box=(x:number,y:number,z:number,w:number,d:number,h:number,tone:number):void=>pixelBox(faces,[x,y,z],[w,d,h],{tone});
  pixelPrism(faces,[[-45,-16],[-37,-23],[37,-23],[45,-16],[45,16],[37,23],[-37,23],[-45,16]],-3,3,{tone:0.14});
  if(props.route==="ridge"){
    faces.push({points:[[-22,2,0],[30,2,rise],[30,22,rise],[-22,22,0]],tone:0.2});
    faces.push({points:[[-22,2,0],[30,2,0],[30,2,rise]],tone:0.32});
    faces.push({points:[[30,2,0],[30,22,0],[30,22,rise],[30,2,rise]],tone:0.38});
    box(30,2,0,14,20,rise,0.25);
  }else if(props.route==="gully"){
    box(-44,-21,0,22,42,3,0.25);
    box(23,2,0,21,20,rise,0.27);
    box(23,-21,0,21,10,rise,0.31);
    box(-20,-20,0,40,40,0.3,0.1);
  }else{
    box(-44,2,0,34,20,6,0.25);
    box(-8,2,0,26,20,rise*0.5,0.3);
    box(20,2,0,24,20,rise,0.35);
    for(const x of [-10,18])box(x,2,0,2,21,rise*(x<0?0.5:1),0.45);
  }
  for(const [x,z] of [[-31,0],[31,rise]] as const){
    // Boarding happens at the side of a clear suspended cabin opening.
    box(x-9,0.8,z,18,12,4,0.38);
    for(const y of [-13,7])box(x-7,y,0,3,3,z+19,0.48);
    box(x-8,-13,z+19,18,3,2,0.65);
    box(x-8,7,z+19,18,3,2,0.65);
    box(x-8,3,z+4,18,7,13,0.4);
    box(x-9,3,z+17,20,8,2,0.65);
    box(x-3,3.02,z+7,6,0.2,7,0.16+(props.seed%3)*0.025);
    pixelRod(faces,[x,0,z+13],[x,0,z+18],0.65,{tone:0.7},6);
  }
  // Working and return strands meet the actual horizontal terminal wheel rims.
  for(const y of [-4,4])pixelRod(faces,[-31,y,16],[31,y,16+rise],0.25,{tone:0.8},6);
  if(props.route==="gully"){
    const x=12,z=16+rise*(x+31)/62;
    box(x-2,8,0,4,4,z+3,0.5);
    box(x-2,-5,z+2,4,17,2,0.65);
    pixelRod(faces,[x,-4,z+0.3],[x,-4,z+2],0.65,{tone:0.7},6);
  }
  return faces;
}
function cableCabin():PixelFace[]{
  const faces:PixelFace[]=[];
  pixelBox(faces,[-6,-4,-12],[12,8,7.5],{ink:"accent",tone:0.85});
  pixelBox(faces,[-6.5,-4.5,-4.5],[13,9,1.5],{tone:0.85});
  pixelBox(faces,[-4.8,-4.1,-8],[9.6,0.2,2.5],{tone:0.23});
  pixelBox(faces,[-4.8,3.9,-8],[9.6,0.2,2.5],{tone:0.23});
  pixelBox(faces,[5.95,-2.7,-8],[0.2,5.4,2.5],{tone:0.23});
  pixelRod(faces,[0,0,-3],[0,0,0],0.5,{tone:0.8},6);
  return faces;
}
function cableWheels(rise:number,travel:number):PixelFace[]{
  const faces:PixelFace[]=[];
  for(const [x,z] of [[-31,16],[31,16+rise]] as const){
    const points:[number,number][]=[];
    for(let i=0;i<12;i++){const a=i*Math.PI/6;points.push([x+Math.cos(a)*4,Math.sin(a)*4]);}
    pixelPrism(faces,points,z-0.4,0.8,{tone:0.58});
    const a=travel*62/4,c=Math.cos(a),s=Math.sin(a);
    pixelRod(faces,[x-c*3.6,-s*3.6,z+0.5],[x+c*3.6,s*3.6,z+0.5],0.35,{tone:0.88},4);
    pixelRod(faces,[x+s*3.6,-c*3.6,z+0.5],[x-s*3.6,c*3.6,z+0.5],0.35,{tone:0.88},4);
  }
  return faces;
}
export const mount: Mount<RidgeCablewayProps>=(host,initial={})=>{
  let props={...defaults,...initial},staticFaces=cableStatic(props);
  const cabin=cableCabin(),attrs=hostAttributes(host);attrs.set("role",null);attrs.set("aria-label",null);attrs.set("aria-hidden","true");
  let redraw=():void=>{};
  const surface=createCanvas(host,{autoSize:false,css:"image-rendering:pixelated",onResize:()=>{resize();redraw();}});
  const scene=createPixelScene(surface.canvas),palette=watchPalette(host,()=>redraw());
  function resize():void{
    const w=Math.max(1,surface.cssWidth),h=Math.max(1,surface.cssHeight),scale=Math.max(3,Math.ceil(w/360),Math.ceil(h/300)),canvas=surface.canvas;
    canvas.width=Math.max(1,Math.floor(w/scale));canvas.height=Math.max(1,Math.floor(h/scale));
    canvas.style.width=`${canvas.width*scale}px`;canvas.style.height=`${canvas.height*scale}px`;
    canvas.style.left=`${Math.floor((w-canvas.width*scale)/2)}px`;canvas.style.top=`${Math.floor((h-canvas.height*scale)/2)}px`;
  }
  resize();
  function draw(t:number):void{
    const rise=cableRise(props.rise),seconds=Math.max(12,Math.min(28,props.tripSeconds)),phase=((t/(seconds*1000)+0.14)%1+1)%1,q=phase<0.5?phase*2:(1-phase)*2;
    const u=Math.max(0,Math.min(1,(q-0.015)/0.97)),travel=u*u*(3-2*u),x=-31+travel*62,z=16+travel*rise;
    const local=cabin.map((face):PixelFace=>({...face,points:face.points.map(([a,b,c]):PixelPoint=>[x+a,-4+b,z+c])}));
    local.push(...cableWheels(rise,travel));
    scene.draw(staticFaces,local,palette.colors,cableView);attrs.set("data-pica-ready","true");
  }
  const loop=createLoop({el:host,fps:12,paused:props.paused,time:props.time,still:1200,frame:draw});redraw=()=>loop.redraw();
  let destroyed=false;
  return{
    update(next){const before=props;props={...props,...next};if(props.route!==before.route||props.rise!==before.rise||props.seed!==before.seed)staticFaces=cableStatic(props);palette.refresh();loop.update({paused:props.paused,time:props.time});loop.redraw();},
    destroy(){if(destroyed)return;destroyed=true;loop.destroy();palette.destroy();surface.destroy();attrs.restore();},
  };
};
