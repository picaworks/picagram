import { createCanvas } from "../../../lib/canvas";
import { hostAttributes } from "../../../lib/host";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { createPixelScene, pixelBox, pixelPrism, type PixelFace, type PixelPoint, type PixelView } from "../../../lib/pixel-scene";
import type { Mount, MotionProps } from "../../../lib/types";
export interface RotaryAssemblyProps extends MotionProps {
  /** Workshop walls, service furniture and press station arrangement. */
  floorplan:"corner"|"horseshoe"|"island";
  /** Radius of the indexing table in scene units. */
  tableRadius:number;
  /** Seconds for one quarter turn and one complete press stroke. */
  cycleSeconds:number;
}
export const defaults: RotaryAssemblyProps = {floorplan:"corner",tableRadius:18,cycleSeconds:10,paused:false,time:null,seed:1};
function rotaryRadius(n:number):number{return Math.max(18,Math.min(28,n));}
function rotaryStation(layout:RotaryAssemblyProps["floorplan"]):number{return layout==="corner"?-Math.PI/2:layout==="horseshoe"?Math.PI:0;}
function rotaryTurn(faces:readonly PixelFace[],a:number):PixelFace[]{
  const c=Math.cos(a),s=Math.sin(a);
  return faces.map((face):PixelFace=>({...face,points:face.points.map(([x,y,z]):PixelPoint=>[c*x-s*y,s*x+c*y,z])}));
}
function rotaryDisk(faces:PixelFace[],r:number,z:number,h:number,tone:number):void{
  const points: [number,number][]=[];
  for(let i=0;i<16;i++){const a=i*Math.PI/8;points.push([Math.cos(a)*r,Math.sin(a)*r]);}
  pixelPrism(faces,points,z,h,{tone});
}
function rotaryTable(r:number):PixelFace[]{
  const faces:PixelFace[]=[];
  rotaryDisk(faces,r,6,3,0.52);
  for(let i=0;i<4;i++){
    const local:PixelFace[]=[],x=r*0.6;
    pixelBox(local,[x-6,-5,9],[12,10,1.5],{tone:0.76});
    pixelBox(local,[x-4.5,-4,10.5],[9,8,4],{ink:"accent",tone:0.85});
    pixelBox(local,[x-2.5,-2.5,14.5],[5,5,2.5],{ink:"accent",tone:0.95});
    faces.push(...rotaryTurn(local,i*Math.PI/2));
  }
  return faces;
}
function rotaryStatic(props:RotaryAssemblyProps):PixelFace[]{
  const faces:PixelFace[]=[],r=rotaryRadius(props.tableRadius),e=r+20;
  pixelPrism(faces,[[-e,-e+9],[-e+9,-e],[e-9,-e],[e,-e+9],[e,e-9],[e-9,e],[-e+9,e],[-e,e-9]],-3,3,{tone:0.13});
  rotaryDisk(faces,r*0.48,0,6,0.36);
  if(props.floorplan==="corner"){
    pixelBox(faces,[-e+2,-e+9,0],[3,e+6,13],{tone:0.28});
    pixelBox(faces,[-e+9,-e+2,0],[e+14,3,13],{tone:0.28});
  }else if(props.floorplan==="horseshoe"){
    pixelBox(faces,[-e+2,-e+9,0],[3,e*2-18,7],{tone:0.26});
    pixelBox(faces,[-e+9,-e+2,0],[e*2-18,3,7],{tone:0.26});
    pixelBox(faces,[e-5,-e+9,0],[3,e+10,7],{tone:0.26});
  }
  // Two columns sit beyond the entire rotating table and carry a cantilevered press bridge.
  const press:PixelFace[]=[],station=rotaryStation(props.floorplan);
  for(const y of [-9,6]){
    pixelBox(press,[r+1,y,0],[9,3,3],{tone:0.55});
    pixelBox(press,[r+3,y,3],[4,3,27],{tone:0.68});
  }
  pixelBox(press,[r*0.6-7,-9,30],[r*0.4+17,18,4],{tone:0.72});
  pixelBox(press,[r+1,-8,34],[9,16,4],{tone:0.45});
  faces.push(...rotaryTurn(press,station));
  function bench(x:number,y:number,w:number,d:number):void{
    for(const dx of [0,w-2])pixelBox(faces,[x+dx,y,0],[2,d,7],{tone:0.35});
    pixelBox(faces,[x-0.5,y-0.5,7],[w+1,d+1,2],{tone:0.58});
  }
  if(props.floorplan==="corner"){
    bench(-r-14,-11,8,23);
    bench(r+7,7,9,20);
    pixelBox(faces,[r+8,8,9],[7,7,5],{tone:0.4});
    pixelBox(faces,[r+8,18,9],[7,7,5],{tone:0.4});
  }else if(props.floorplan==="horseshoe"){
    bench(3,-r-14,23,8);
    bench(r+7,3,9,23);
    pixelBox(faces,[r+8,4,9],[7,21,2],{tone:0.4});
    pixelBox(faces,[r+8,4,14],[7,21,2],{tone:0.42});
    for(const y of [4,23])pixelBox(faces,[r+8,y,9],[7,2,7],{tone:0.4});
  }else{
    bench(-r-15,-11,9,23);
    bench(-10,r+7,23,9);
    pixelBox(faces,[-9,r+8,9],[9,7,4],{tone:0.4});
    pixelBox(faces,[3,r+8,9],[8,7,4],{tone:0.4});
  }
  const cabinetX=props.floorplan==="horseshoe"?-8:props.floorplan==="corner"?-5:r+5;
  const cabinetY=props.floorplan==="island"?-r-12:r+7;
  pixelBox(faces,[cabinetX,cabinetY,0],[10,7,13],{tone:0.45});
  pixelBox(faces,[cabinetX+1,cabinetY+7.05,7],[8,0.25,4],{tone:0.2+(props.seed%3)*0.04});
  return faces;
}
export const mount: Mount<RotaryAssemblyProps>=(host,initial={})=>{
  let props={...defaults,...initial},r=rotaryRadius(props.tableRadius),staticFaces=rotaryStatic(props),table=rotaryTable(r);
  let view:PixelView={bounds:[[-r-21,-r-21,-3],[r+21,r+21,41]],ground:0};
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
    const seconds=Math.max(6,Math.min(14,props.cycleSeconds)),clock=t/(seconds*1000)+0.08,cycle=Math.floor(clock),p=clock-cycle;
    const u=Math.min(1,p/0.52),angle=(cycle+u*u*(3-2*u))*Math.PI/2;
    const moving=rotaryTurn(table,angle+rotaryStation(props.floorplan));
    let down=0;
    if(p>=0.54&&p<0.74)down=(p-0.54)/0.2;
    else if(p>=0.74&&p<0.77)down=1;
    else if(p>=0.77&&p<0.97)down=1-(p-0.77)/0.2;
    const z=24-down*7,tool:PixelFace[]=[];
    pixelBox(tool,[r*0.6-5,-5,z],[10,10,3],{tone:0.8});
    pixelBox(tool,[r*0.6-1.5,-1.5,z+3],[3,3,30-z-3],{tone:0.7});
    moving.push(...rotaryTurn(tool,rotaryStation(props.floorplan)));
    scene.draw(staticFaces,moving,palette.colors,view);attrs.set("data-pica-ready","true");
  }
  const loop=createLoop({el:host,fps:12,paused:props.paused,time:props.time,still:1200,frame:draw});redraw=()=>loop.redraw();
  let destroyed=false;
  return{
    update(next){const before=props;props={...props,...next};if(props.floorplan!==before.floorplan||props.tableRadius!==before.tableRadius||props.seed!==before.seed){r=rotaryRadius(props.tableRadius);staticFaces=rotaryStatic(props);table=rotaryTable(r);view={bounds:[[-r-21,-r-21,-3],[r+21,r+21,41]],ground:0};}palette.refresh();loop.update({paused:props.paused,time:props.time});loop.redraw();},
    destroy(){if(destroyed)return;destroyed=true;loop.destroy();palette.destroy();surface.destroy();attrs.restore();},
  };
};
