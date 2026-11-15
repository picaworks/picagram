import { createCanvas } from "../../../lib/canvas";
import { hostAttributes } from "../../../lib/host";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { createPixelScene, pixelBox, pixelPrism, pixelRod, type PixelFace, type PixelPoint, type PixelView } from "../../../lib/pixel-scene";
import type { Mount, MotionProps } from "../../../lib/types";
export interface WindStationProps extends MotionProps {
  /** Raised ridge, concrete coastal peninsula or flat utility yard. */
  site:"ridge"|"coastal"|"service-yard";
  /** Radius of the rigid three blade rotor in scene units. */
  bladeRadius:number;
  /** Seconds for one constant speed rotor revolution. */
  turnSeconds:number;
}
export const defaults: WindStationProps = {site:"ridge",bladeRadius:28,turnSeconds:20,paused:false,time:null,seed:1};
const windDiagonal=Math.SQRT1_2;
interface WindGeometry{r:number;x:number;y:number;base:number;hub:number;}
function windGeometry(props:WindStationProps):WindGeometry{
  const r=Math.max(18,Math.min(28,props.bladeRadius)),yard=props.site==="service-yard",coast=props.site==="coastal",base=yard?0:coast?2:8;
  return {r,x:yard?-18:coast?-16:-10,y:yard?-8:coast?0:2,base,hub:base+r+16};
}
function windPoint(g:WindGeometry,u:number,v:number,n:number):PixelPoint{return[g.x+windDiagonal*(u+n),g.y+windDiagonal*(-u+n),g.hub+v];}
function windStatic(props:WindStationProps,g:WindGeometry):PixelFace[]{
  const faces:PixelFace[]=[],yard=props.site==="service-yard",coast=props.site==="coastal";
  const box=(x:number,y:number,z:number,w:number,d:number,h:number,tone:number):void=>pixelBox(faces,[x,y,z],[w,d,h],{tone});
  if(yard){
    pixelPrism(faces,[[-38,-24],[-30,-31],[28,-31],[38,-21],[38,24],[27,32],[-30,32],[-38,23]],-3,3,{tone:0.22});
    box(-25,9,0,48,4,0.2,0.38);box(-7,9,0,4,18,0.2,0.38);
  }else if(coast){
    pixelPrism(faces,[[-36,-23],[22,-28],[38,-14],[38,20],[20,28],[-34,21]],-4,6,{tone:0.24});
    box(-36,17,2,70,3,4,0.48);
    box(-21,-17,2,45,5,0.2,0.4);
  }else{
    pixelPrism(faces,[[-37,-16],[-23,-27],[29,-25],[41,-10],[41,17],[20,27],[-29,23]],-3,3,{tone:0.14});
    pixelPrism(faces,[[-31,-11],[-19,-20],[0,-12],[5,6],[-10,17],[-28,12]],0,8,{tone:0.25});
    box(-9,7,0,38,3,0.3,0.36);
  }
  box(g.x-5,g.y-5,g.base,10,10,2,0.48);
  // The tapered mast is separate from the rotor plane by a physical nacelle offset.
  const bottom:PixelPoint[]=[],top:PixelPoint[]=[];
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4;
    bottom.push([g.x+Math.cos(a)*2.9,g.y+Math.sin(a)*2.9,g.base+2]);
    top.push([g.x+Math.cos(a)*1.3,g.y+Math.sin(a)*1.3,g.hub]);
  }
  for(let i=0;i<8;i++)faces.push({points:[bottom[i]!,bottom[(i+1)%8]!,top[(i+1)%8]!,top[i]!],tone:0.65});
  const nacelle:PixelFace[]=[];
  pixelBox(nacelle,[-3,-5,-2],[6,10,4],{tone:0.62});
  // Local nacelle y is its horizontal shaft direction.
  faces.push(...nacelle.map((face):PixelFace=>({...face,points:face.points.map(([u,n,z]):PixelPoint=>windPoint(g,u,z,n))})));
  pixelRod(faces,windPoint(g,0,0,3),windPoint(g,0,0,8),2.4,{tone:0.82},8);
  const px=yard?5:coast?8:16,py=yard?-4:coast?2:-15,pz=coast?2:0;
  box(px,py,pz,23,21,1.5,0.35);
  if(yard)box(19,-16,0,12,12,1.5,0.35);
  box(px+4,py+4,pz+1.5,10,12,8,0.48);
  box(px+15,py+5,pz+1.5,5,10,6,0.56);
  box(px+3.5,py+3.5,pz+9.5,11,13,1,0.67);
  const fence:readonly (readonly [number,number])[]=yard?[[5,-4],[19,-4],[19,-16],[31,-16],[31,17],[5,17]]:[[px,py],[px+23,py],[px+23,py+21],[px,py+21]];
  for(let i=0;i<fence.length;i++){
    const a=fence[i]!,b=fence[(i+1)%fence.length]!;
    box(a[0]-0.6,a[1]-0.6,pz+1.5,1.2,1.2,4,0.62);
    if(i!==fence.length-1)pixelRod(faces,[a[0],a[1],pz+4.8],[b[0],b[1],pz+4.8],0.45,{tone:0.55},4);
  }
  const hx=yard?-12:coast?9:7,hy=yard?17:coast?-21:10,hz=coast?2:0;
  box(hx,hy,hz,18,12,9,0.38);
  box(hx-0.7,hy-0.7,hz+9,19.4,13.4,2,0.62);
  box(hx+6,hy-0.1,hz,5,0.2,6,0.17+(props.seed%3)*0.03);
  const conduit:PixelPoint[]=yard?[[g.x,g.y,1],[0,-8,1],[0,4,1],[px+7,py+8,pz+2]]:coast?[[g.x,g.y,3],[0,0,3],[0,10,3],[px+7,py+8,pz+2]]:[[g.x,g.y,9],[4,2,9],[4,2,1],[23,2,1],[px+7,py+8,2]];
  for(let i=1;i<conduit.length;i++)pixelRod(faces,conduit[i-1]!,conduit[i]!,0.8,{tone:0.72},6);
  return faces;
}
function windBlades(g:WindGeometry):PixelFace[]{
  const faces:PixelFace[]=[],r=g.r;
  const profile:readonly (readonly [number,number])[]=[[1,-0.8],[r*0.25,-r*0.16],[r*0.65,-r*0.12],[r,0],[r*0.62,r*0.055],[2,1.2]];
  for(let blade=0;blade<3;blade++){
    const a=blade*Math.PI*2/3,c=Math.cos(a),s=Math.sin(a);
    const front=profile.map(([u,v]):PixelPoint=>[c*u-s*v,s*u+c*v,6.4]);
    const back=profile.map(([u,v]):PixelPoint=>[c*u-s*v,s*u+c*v,5.6]);
    faces.push({points:front,ink:"accent",tone:0.8},{points:back,ink:"accent",tone:0.65});
    for(let i=0;i<profile.length;i++)faces.push({points:[front[i]!,front[(i+1)%profile.length]!,back[(i+1)%profile.length]!,back[i]!],ink:"accent",tone:0.72});
  }
  return faces;
}
export const mount: Mount<WindStationProps>=(host,initial={})=>{
  let props={...defaults,...initial},g=windGeometry(props),staticFaces=windStatic(props,g),blades=windBlades(g);
  let view:PixelView={bounds:[[-42,-37,-4],[43,37,g.hub+g.r+5]],ground:0};
  const attrs=hostAttributes(host);attrs.set("role",null);attrs.set("aria-label",null);attrs.set("aria-hidden","true");
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
    const a=(t/(Math.max(10,Math.min(24,props.turnSeconds))*1000)+0.08)*Math.PI*2,c=Math.cos(a),s=Math.sin(a);
    const moving=blades.map((face):PixelFace=>({...face,points:face.points.map(([u,v,n]):PixelPoint=>windPoint(g,c*u-s*v,s*u+c*v,n))}));
    scene.draw(staticFaces,moving,palette.colors,view);attrs.set("data-pica-ready","true");
  }
  const loop=createLoop({el:host,fps:12,paused:props.paused,time:props.time,still:1200,frame:draw});redraw=()=>loop.redraw();
  let destroyed=false;
  return{
    update(next){const before=props;props={...props,...next};if(props.site!==before.site||props.bladeRadius!==before.bladeRadius||props.seed!==before.seed){g=windGeometry(props);staticFaces=windStatic(props,g);blades=windBlades(g);view={bounds:[[-42,-37,-4],[43,37,g.hub+g.r+5]],ground:0};}palette.refresh();loop.update({paused:props.paused,time:props.time});loop.redraw();},
    destroy(){if(destroyed)return;destroyed=true;loop.destroy();palette.destroy();surface.destroy();attrs.restore();},
  };
};
