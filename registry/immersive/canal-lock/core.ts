import { createCanvas } from "../../../lib/canvas";
import { hostAttributes } from "../../../lib/host";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { createPixelScene, pixelBox, pixelPrism, type PixelFace, type PixelPoint, type PixelView } from "../../../lib/pixel-scene";
import type { Mount, MotionProps } from "../../../lib/types";
export interface CanalLockProps extends MotionProps {
  /** Embankment, deep stone cutting or a connected side basin. */
  setting:"embankment"|"stone-cut"|"side-basin";
  /** Difference between the fixed upper and lower water levels. */
  lift:number;
  /** Seconds for filling, draining and both brief level dwells. */
  cycleSeconds:number;
}
export const defaults: CanalLockProps = {setting:"embankment",lift:6,cycleSeconds:26,paused:false,time:null,seed:1};
const lockView:PixelView={bounds:[[-53,-34,-3],[53,34,35]],ground:0,elevation:58};
function lockLift(n:number):number{return Math.max(6,Math.min(14,n));}
function lockBoat():PixelFace[]{
  const faces:PixelFace[]=[];
  pixelPrism(faces,[[-13,-3],[-9,-5],[10,-5],[13,-2],[13,2],[10,5],[-9,5],[-13,3]],-0.9,3.1,{tone:0.75});
  pixelBox(faces,[-9,-4,2.2],[18,8,0.8],{tone:0.55});
  pixelBox(faces,[-7,-3.5,3],[9,7,4.5],{tone:0.62});
  pixelBox(faces,[-7.6,-4,7.5],[10.2,8,1],{tone:0.85});
  pixelBox(faces,[-5.8,-3.65,5],[5.5,0.3,1.6],{tone:0.17});
  pixelBox(faces,[5,-3.5,3],[3,7,1.2],{tone:0.42});
  return faces;
}
function lockStatic(props:CanalLockProps):PixelFace[]{
  const faces:PixelFace[]=[],high=2+lockLift(props.lift),wall=high+3,cut=props.setting==="stone-cut",side=props.setting==="side-basin";
  const box=(x:number,y:number,z:number,w:number,d:number,h:number,tone:number):void=>pixelBox(faces,[x,y,z],[w,d,h],{tone});
  const water=(x:number,y:number,w:number,d:number,level:number):void=>pixelBox(faces,[x,y,0],[w,d,level],{ink:"accent",tone:0.4});
  pixelPrism(faces,[[-51,-24],[-43,-32],[43,-32],[51,-24],[51,24],[43,32],[-43,32],[-51,24]],-3,3,{tone:0.12});
  const bank=cut?wall:Math.max(3,high-2);
  box(-49,-31,0,98,12,bank,cut?0.3:0.16);
  if(side){
    box(-24,19,0,73,12,bank,0.16);
    box(-50,29,0,25,3,wall,0.38);
    box(-51,-19,0,3,48,wall,0.38);
    box(-27,19,0,3,13,wall,0.3);
    water(-48,15,21,14,high);
    box(-23,22,bank+0.05,70,4,0.25,0.37);
    box(-27,19,wall,4,12,0.25,0.37);
  }else{
    box(-49,19,0,98,12,bank,cut?0.3:0.16);
    box(-47,21,bank+0.05,94,4,0.25,0.37);
  }
  water(-48,-15,22,30,high);
  water(26,-15,22,30,2);
  // Solid retaining walls stop each water region at its actual boundary.
  box(-49,-19,0,98,4,wall,0.45);
  if(side)box(-24,15,0,73,4,wall,0.45);
  else box(-49,15,0,98,4,wall,0.45);
  for(const y of [-19,15])box(-24,y,wall,48,4,0.8,0.65);
  // Both paired gates remain closed, with no water polygon passing through their faces.
  for(const x of [-26,24]){
    box(x,-15,0,2,15,wall,0.65);
    box(x,0,0,2,15,wall,0.56);
    for(const y of [-15,13])box(x-0.5,y,0,3,2,wall+1.5,0.8);
    box(x-0.2,-14,wall-1.5,2.4,28,1,0.82);
  }
  for(const x of [-8,8])box(x,-18.5,wall+0.8,3,3,4,0.73);
  // Quiet fixed bands communicate water rather than a second animated system.
  pixelBox(faces,[-43,-9,high+0.03],[12,1.2,0.08],{ink:"accent",tone:0.55});
  pixelBox(faces,[31,8,2.03],[12,1.2,0.08],{ink:"accent",tone:0.55});
  const hx=cut?-45:side?8:30,hy=cut?20:22;
  box(hx,hy,bank+0.3,13,8,8,0.4);
  box(hx-0.8,hy-0.7,bank+8.3,14.6,9.4,2,0.67);
  box(hx+3,hy-0.15,bank+0.3,4,0.3,5.5,0.16+(props.seed%3)*0.03);
  return faces;
}
export const mount: Mount<CanalLockProps>=(host,initial={})=>{
  let props={...defaults,...initial},staticFaces=lockStatic(props);
  const boat=lockBoat(),attrs=hostAttributes(host);
  attrs.set("role",null);attrs.set("aria-label",null);attrs.set("aria-hidden","true");
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
    const seconds=Math.max(18,Math.min(40,props.cycleSeconds)),phase=((t/(seconds*1000)+0.13)%1+1)%1,q=phase<0.5?phase*2:(1-phase)*2;
    const u=Math.max(0,Math.min(1,(q-0.01)/0.98)),level=2+lockLift(props.lift)*u*u*(3-2*u);
    const moving:PixelFace[]=[];
    pixelBox(moving,[-24,-15,0],[48,30,level],{ink:"accent",tone:0.4});
    for(const [x,y] of [[-18,-10],[5,10]])pixelBox(moving,[x??0,y??0,level+0.03],[12,1.2,0.08],{ink:"accent",tone:0.55});
    moving.push(...boat.map((face):PixelFace=>({...face,points:face.points.map(([x,y,z]):PixelPoint=>[x,y,z+level])})));
    scene.draw(staticFaces,moving,palette.colors,lockView);attrs.set("data-pica-ready","true");
  }
  const loop=createLoop({el:host,fps:12,paused:props.paused,time:props.time,still:1200,frame:draw});redraw=()=>loop.redraw();
  let destroyed=false;
  return{
    update(next){const before=props;props={...props,...next};if(props.setting!==before.setting||props.lift!==before.lift||props.seed!==before.seed)staticFaces=lockStatic(props);palette.refresh();loop.update({paused:props.paused,time:props.time});loop.redraw();},
    destroy(){if(destroyed)return;destroyed=true;loop.destroy();palette.destroy();surface.destroy();attrs.restore();},
  };
};
