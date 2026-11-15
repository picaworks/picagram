import { createCanvas } from "../../../lib/canvas";
import { hostAttributes } from "../../../lib/host";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { createPixelScene, pixelBox, pixelPrism, pixelRod, type PixelFace, type PixelPoint, type PixelView } from "../../../lib/pixel-scene";
import type { Mount, MotionProps } from "../../../lib/types";
export interface TerraceWaterworksProps extends MotionProps {
  /** Stepped works, divided canal bank or compact utility platform. */
  arrangement:"terraced"|"split-bank"|"compact";
  /** Radius of the round settling tank in scene units. */
  tankRadius:number;
  /** Seconds for one full attached rake revolution. */
  turnSeconds:number;
}
export const defaults: TerraceWaterworksProps = {arrangement:"terraced",tankRadius:26,turnSeconds:40,paused:false,time:null,seed:1};
function worksRadius(n:number):number{return Math.max(20,Math.min(30,n));}
function worksView(props:TerraceWaterworksProps):PixelView{
  const r=worksRadius(props.tankRadius),compact=props.arrangement==="compact";
  return {bounds:[[props.arrangement==="split-bank"?-r-40:-r-32,compact?-r-30:-r-9,-3],[compact?r+9:r+37,r+18,29]],ground:0,elevation:36};
}
function worksCircle(r:number,z:number):PixelPoint[]{
  return Array.from({length:20},(_,i):PixelPoint=>[Math.cos(i*Math.PI/10)*r,Math.sin(i*Math.PI/10)*r,z]);
}
function worksStatic(props:TerraceWaterworksProps):PixelFace[]{
  const faces:PixelFace[]=[],r=worksRadius(props.tankRadius),compact=props.arrangement==="compact",split=props.arrangement==="split-bank",view=worksView(props),[lo,hi]=view.bounds;
  const box=(x:number,y:number,z:number,w:number,d:number,h:number,tone:number):void=>pixelBox(faces,[x,y,z],[w,d,h],{tone});
  pixelPrism(faces,[[lo[0]+2,lo[1]+8],[lo[0]+9,lo[1]+2],[hi[0]-9,lo[1]+2],[hi[0]-2,lo[1]+9],[hi[0]-2,hi[1]-9],[hi[0]-9,hi[1]-2],[lo[0]+9,hi[1]-2],[lo[0]+2,hi[1]-9]],-3,3,{tone:0.13});
  box(-r-3,-r-3,0,r*2+6,r*2+6,4,0.25);
  const px=split?-r-32:-r-26,py=compact?-r-21:-13,pz=compact?6:9;
  box(px-2,py-2,0,22,28,pz,0.29);
  box(px,py,pz,18,22,11,0.4);
  box(px-0.8,py-0.8,pz+11,19.6,23.6,2,0.67);
  box(px+5,py+22.04,pz,6,0.2,7,0.18+(props.seed%3)*0.03);
  const bx=compact?-10:r+12,by=compact?-r-25:-10,bz=compact?6:0,bw=compact?20:21,bd=compact?18:20;
  box(bx-2,by-2,0,bw+4,bd+4,bz+1,0.25);
  box(bx,by,bz,bw,2,6,0.5);box(bx,by+bd-2,bz,bw,2,6,0.5);
  box(bx,by,bz,2,bd,6,0.5);box(bx+bw-2,by,bz,2,bd,6,0.5);
  pixelBox(faces,[bx+2,by+2,bz+1],[bw-4,bd-4,3],{ink:"accent",tone:0.45});
  const outer=worksCircle(r,14),inner=worksCircle(r-2,14),bottom=worksCircle(r,4),inside=worksCircle(r-2,4);
  for(let i=0;i<20;i++){
    const j=(i+1)%20;
    faces.push({points:[outer[i]!,outer[j]!,inner[j]!,inner[i]!],tone:0.65});
    faces.push({points:[bottom[i]!,bottom[j]!,outer[j]!,outer[i]!],tone:0.4});
    faces.push({points:[inside[i]!,inner[i]!,inner[j]!,inside[j]!],tone:0.46});
  }
  faces.push({points:worksCircle(r-2,12),ink:"accent",tone:0.45});
  // A fixed diameter bridge stays four units above the treatment surface.
  box(-2,-r-2,16,4,2*r+4,2,0.75);
  for(const y of [-r,r-2])box(-2,y,4,4,3,12,0.5);
  box(-0.9,-0.9,4,1.8,1.8,14,0.7);
  box(-3,-3,18,6,6,3,0.6);
  for(let i=0;i<6;i++)box(-3,r+2+(5-i)*2,4,6,2,(i+1)*2,0.47);
  function pipe(points:readonly PixelPoint[]):void{
    for(let i=1;i<points.length;i++)pixelRod(faces,points[i-1]!,points[i]!,1.25,{tone:0.72},6);
  }
  // Every pipe terminates inside a building, tank or contained basin water.
  if(compact){
    pipe([[px+17,py+11,pz+6],[-r-5,py+11,pz+6],[-r-5,0,pz+6],[-r+3,0,pz+6],[-r+3,0,11.7]]);
    pipe([[0,-r+1,11],[0,-r-5,11],[0,-r-5,10],[0,by+8,10],[0,by+8,bz+3.7]]);
  }else{
    pipe([[px+17,0,pz+6],[-r-5,0,pz+6],[-r-5,0,14],[-r+3,0,14],[-r+3,0,11.7]]);
    pipe([[r-3,0,11],[r+6,0,11],[r+6,0,5],[bx+5,0,5],[bx+5,0,3.7]]);
  }
  if(split){
    box(-r-12,-r-5,0,2,2*r+10,4,0.4);box(-r-5,-r-5,0,2,2*r+10,4,0.4);
    pixelBox(faces,[-r-10,-r-5,0],[5,2*r+10,2],{ink:"accent",tone:0.45});
    box(-r-13,-3,4,2,6,9,0.48);box(-r-3,-3,4,2,6,9,0.48);
  }
  return faces;
}
function worksRake(r:number):PixelFace[]{
  const faces:PixelFace[]=[];
  pixelBox(faces,[0,-1.5,10.6],[r-4,3,0.9],{tone:0.58});
  pixelBox(faces,[r-7,-5,10.5],[2,10,1],{tone:0.58});
  // This solid waterline footprint represents the submerged arm without transparent geometry.
  faces.push({points:[[0,-1.5,12.04],[r-4,-1.5,12.04],[r-4,1.5,12.04],[0,1.5,12.04]],tone:0.58});
  faces.push({points:[[r-7,-5,12.04],[r-5,-5,12.04],[r-5,5,12.04],[r-7,5,12.04]],tone:0.58});
  return faces;
}
export const mount: Mount<TerraceWaterworksProps>=(host,initial={})=>{
  let props={...defaults,...initial},r=worksRadius(props.tankRadius),staticFaces=worksStatic(props),rake=worksRake(r),view=worksView(props);
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
    const a=(t/(Math.max(20,Math.min(50,props.turnSeconds))*1000)+0.13)*Math.PI*2,c=Math.cos(a),s=Math.sin(a);
    const moving=rake.map((face):PixelFace=>({...face,points:face.points.map(([x,y,z]):PixelPoint=>[c*x-s*y,s*x+c*y,z])}));
    scene.draw(staticFaces,moving,palette.colors,view);attrs.set("data-pica-ready","true");
  }
  const loop=createLoop({el:host,fps:12,paused:props.paused,time:props.time,still:1200,frame:draw});redraw=()=>loop.redraw();
  let destroyed=false;
  return{
    update(next){const before=props;props={...props,...next};if(props.arrangement!==before.arrangement||props.tankRadius!==before.tankRadius||props.seed!==before.seed){r=worksRadius(props.tankRadius);staticFaces=worksStatic(props);rake=worksRake(r);view=worksView(props);}palette.refresh();loop.update({paused:props.paused,time:props.time});loop.redraw();},
    destroy(){if(destroyed)return;destroyed=true;loop.destroy();palette.destroy();surface.destroy();attrs.restore();},
  };
};
