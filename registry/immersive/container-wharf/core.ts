import { createCanvas } from "../../../lib/canvas";
import { hostAttributes } from "../../../lib/host";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { createPixelScene, pixelBox, pixelPrism, pixelRod, type PixelFace, type PixelPoint, type PixelView } from "../../../lib/pixel-scene";
import type { Mount, MotionProps } from "../../../lib/types";

export interface ContainerWharfProps extends MotionProps {
  /** Shoreline, vessel orientation and crane foundation arrangement. */
  berth: "straight" | "finger" | "corner";
  /** Number of containers in each background stack. */
  stackHeight: number;
  /** Seconds for the complete outward and return handling cycle. */
  cycleSeconds: number;
}
export const defaults: ContainerWharfProps = { berth: "straight", stackHeight: 1, cycleSeconds: 24, paused: false, time: null, seed: 1 };
const wharfView: PixelView = { bounds: [[-46,-46,-3],[46,46,63]], ground: 0 };
function wharfOrient(faces: PixelFace[], berth: ContainerWharfProps["berth"]): PixelFace[] {
  if (berth === "straight") return faces;
  return faces.map((face): PixelFace => ({...face,points:face.points.map(([x,y,z]):PixelPoint=>berth==="finger"?[-y,x,z]:[-x,-y,z])}));
}
function wharfHeight(value:number):number { return Math.max(1,Math.min(3,Math.round(value))); }
function wharfStatic(props:ContainerWharfProps):PixelFace[] {
  const faces:PixelFace[]=[];
  const box=(x:number,y:number,z:number,w:number,d:number,h:number,tone:number):void=>pixelBox(faces,[x,y,z],[w,d,h],{tone});
  pixelPrism(faces,[[-43,-34],[-34,-43],[35,-43],[43,-35],[43,35],[35,43],[-35,43],[-43,34]],-3,3,{tone:0.08});
  if(props.berth==="finger") {
    box(0,-29,0,18,49,4,0.28);
    box(0,20,0,42,23,4,0.28);
  } else {
    box(0,-42,0,42,84,4,0.28);
    if(props.berth==="corner") box(-41,25,0,41,17,4,0.28);
  }
  // A low hull with a genuinely open cargo lane between its side rails.
  pixelPrism(faces,[[-27,-20],[-24,-25],[-13,-25],[-10,-20],[-10,20],[-13,25],[-24,25],[-27,20]],0.3,3.2,{tone:0.48});
  box(-27,-19,3.5,1.5,38,2.8,0.7);
  box(-11.5,-19,3.5,1.5,38,2.8,0.7);
  box(-25.5,-22,3.5,14,3,2.8,0.6);
  box(-25.5,19,3.5,14,3,2.8,0.6);
  box(-24,-10,3.5,12,20,1,0.24);
  box(3,-10,4,14,20,1.5,0.58);
  // Both portal feet stand on shore, outside the full load envelope.
  for(const y of [-17,14]) {
    box(5,y,4,13,3,2,0.62);
    box(9,y,6,4,3,49,0.66);
    box(-29,y,55,60,3,3,0.75);
    pixelRod(faces,[11,y+1.5,39],[-9,y+1.5,55],0.65,{tone:0.55},6);
  }
  box(-29,-17,55,3,34,3,0.75);
  box(28,-17,55,3,34,3,0.75);
  const h=wharfHeight(props.stackHeight);
  const stacks:readonly (readonly [number,number])[]=props.berth==="finger"?[[2,22],[2,33]]:props.berth==="corner"?[[-37,28],[-17,28]]:[[20,-36],[20,-23]];
  for(const [x,y] of stacks) for(let level=0;level<h;level++) {
    box(x,y,4+level*7,16,9,6.6,0.42+level*0.1);
  }
  const shed=props.berth==="finger"?[22,23,17,18]:props.berth==="corner"?[17,-37,21,17]:[14,23,24,17];
  const [sx=0,sy=0,sw=0,sd=0]=shed;
  box(sx,sy,4,sw,sd,9,0.37);
  box(sx-0.7,sy-0.7,13,sw+1.4,sd+1.4,2.5,0.65);
  box(sx+3,sy+sd+0.02,4,sw-6,0.2,6,0.11);
  const moorY=-21+(props.seed%3);
  for(const x of [-13,2]) box(x,moorY,4,2,2,2.5,0.76);
  pixelRod(faces,[-12,moorY+1,6],[3,moorY+1,6],0.55,{tone:0.7},6);
  return wharfOrient(faces,props.berth);
}
function wharfMoving(props:ContainerWharfProps,t:number):PixelFace[] {
  const cycle=Math.max(16,Math.min(36,props.cycleSeconds));
  const phase=((t/(cycle*1000)+0.08)%1+1)%1;
  // Mirroring one half cycle returns the same physical load along the same route.
  const q=phase<0.5?phase*2:(1-phase)*2;
  const high=19+wharfHeight(props.stackHeight)*7;
  let x=-18;
  let z:number;
  if(q<0.26) z=4.5+(high-4.5)*q/0.26;
  else if(q<0.72) {x=-18+28*(q-0.26)/0.46;z=high;}
  else {x=10;z=high+(5.5-high)*Math.min(1,(q-0.72)/0.27);}
  const faces:PixelFace[]=[];
  pixelBox(faces,[x-6,-8,z],[12,16,8],{ink:"accent",tone:0.9});
  // Broad ribs identify the single container without adding surface noise.
  for(const y of [-5,0,5]) pixelBox(faces,[x-6.15,y-0.45,z+0.8],[0.3,0.9,6.4],{ink:"accent",tone:0.65});
  pixelBox(faces,[x-6.5,-8.5,z+8],[13,17,1],{tone:0.72});
  pixelBox(faces,[x-3,-17.5,53],[6,35,2],{tone:0.8});
  for(const y of [-6,6]) pixelRod(faces,[x,y,z+9],[x,y,53],0.55,{tone:0.83},6);
  return wharfOrient(faces,props.berth);
}
export const mount: Mount<ContainerWharfProps>=(host,initial={})=>{
  let props={...defaults,...initial};
  const attrs=hostAttributes(host);
  attrs.set("role",null);attrs.set("aria-label",null);attrs.set("aria-hidden","true");
  let staticFaces=wharfStatic(props);
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
  function draw(t:number):void {scene.draw(staticFaces,wharfMoving(props,t),palette.colors,wharfView);attrs.set("data-pica-ready","true");}
  const loop=createLoop({el:host,fps:12,paused:props.paused,time:props.time,still:1200,frame:draw});
  redraw=()=>loop.redraw();
  let destroyed=false;
  return {
    update(next) {
      const before=props;props={...props,...next};
      if(props.berth!==before.berth||props.stackHeight!==before.stackHeight||props.seed!==before.seed)staticFaces=wharfStatic(props);
      palette.refresh();loop.update({paused:props.paused,time:props.time});loop.redraw();
    },
    destroy() {if(destroyed)return;destroyed=true;loop.destroy();palette.destroy();surface.destroy();attrs.restore();},
  };
};
