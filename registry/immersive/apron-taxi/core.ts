import { createCanvas } from "../../../lib/canvas";
import { hostAttributes } from "../../../lib/host";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { createPixelScene, pixelBox, pixelPrism, pixelRod, type PixelFace, type PixelPoint, type PixelView } from "../../../lib/pixel-scene";
import type { Mount, MotionProps } from "../../../lib/types";

export interface ApronTaxiProps extends MotionProps {
  /** Shape of the circuit and arrangement of the airfield. */
  layout: "oval" | "triangle" | "kidney";
  /** Short club airplane or a longer twin engine commuter. */
  aircraft: "prop" | "commuter";
  /** Seconds per circuit, including the brief runway hold. */
  lapSeconds: number;
}
export const defaults: ApronTaxiProps = { layout: "oval", aircraft: "prop", lapSeconds: 28, paused: false, time: null, seed: 1 };
const apronView: PixelView = { bounds: [[-59,-57,-3],[59,57,16]], ground: 0, yaw: 45, elevation: 36 };
type ApronXY = readonly [number, number];
function apronRoute(layout: ApronTaxiProps["layout"], u: number): ApronXY {
  const a = u * Math.PI * 2;
  if (layout === "triangle") return [29*Math.cos(a)+5*Math.cos(2*a),29*Math.sin(a)-5*Math.sin(2*a)];
  if (layout === "kidney") return [30*Math.cos(a)+9*Math.cos(2*a),25*Math.sin(a)+4*Math.sin(2*a)];
  return [33*Math.cos(a),25*Math.sin(a)];
}
function apronNormal(layout: ApronTaxiProps["layout"], u: number): ApronXY {
  const a = apronRoute(layout,u-0.0001), b = apronRoute(layout,u+0.0001);
  const dx=b[0]-a[0], dy=b[1]-a[1], length=Math.hypot(dx,dy);
  return [dy/length,-dx/length];
}
function apronGround(layout: ApronTaxiProps["layout"], seed: number): PixelFace[] {
  const faces: PixelFace[] = [];
  pixelPrism(faces,[[-58,-44],[-45,-55],[43,-55],[57,-41],[57,43],[44,55],[-43,55],[-58,40]],-3,3,{tone:0.13});
  for (let i=0;i<48;i++) {
    const u=i/48,v=(i+1)/48,a=apronRoute(layout,u),b=apronRoute(layout,v),n=apronNormal(layout,u),m=apronNormal(layout,v);
    const strip=(width:number,z:number,tone:number):void=>{
      faces.push({points:[[a[0]+n[0]*width,a[1]+n[1]*width,z],[b[0]+m[0]*width,b[1]+m[1]*width,z],[b[0]-m[0]*width,b[1]-m[1]*width,z],[a[0]-n[0]*width,a[1]-n[1]*width,z]],tone});
    };
    strip(11,0.1,0.29);
    strip(0.55,0.16,0.65);
    faces.push({points:[[0,0,0.2],[a[0]*0.47,a[1]*0.47,0.2],[b[0]*0.47,b[1]*0.47,0.2]],tone:0.09});
  }
  const kidney=layout==="kidney",triangle=layout==="triangle";
  const hx=kidney?-51:triangle?-20:-17,hy=kidney?-8:-52,hw=kidney?12:triangle?33:28,hd=kidney?16:11;
  // Three walls and a roof leave the near mouth physically open.
  pixelBox(faces,[hx,hy,0.2],[2,hd,8],{tone:0.53});
  pixelBox(faces,[hx+hw-2,hy,0.2],[2,hd,8],{tone:0.53});
  pixelBox(faces,[hx,hy,0.2],[hw,2,8],{tone:0.4});
  pixelBox(faces,[hx-1,hy-1,8.2],[hw+2,hd+2,2],{tone:0.68});
  pixelBox(faces,[hx+2,hy+2,0.22],[hw-4,hd-2,0.1],{tone:0.06});
  if(kidney) pixelBox(faces,[-45,12,0.12],[18,11,0.1],{tone:0.29});
  else pixelBox(faces,[triangle?-26:-10,30,0.12],[20,20,0.1],{tone:0.29});
  const holdX=kidney?51:46;
  pixelBox(faces,[holdX,-13,0.12],[5,26,0.1],{tone:0.34});
  for(const y of [-5,-2]) pixelBox(faces,[holdX,y,0.3],[5,1,0.12],{tone:0.86});
  const mastX=triangle?25:8;
  pixelRod(faces,[mastX,-46,0],[mastX,-46,13],0.55,{tone:0.7},6);
  pixelPrism(faces,[[mastX,-47.3],[mastX+7,-46.8],[mastX+7,-45.3],[mastX,-44.7]],11.5+(seed%3)*0.15,1.8,{tone:0.75});
  return faces;
}
function apronAircraft(commuter:boolean):PixelFace[] {
  const faces:PixelFace[]=[],length=commuter?17:13;
  pixelPrism(faces,[[-length/2,-1.2],[length/2-2,-1.7],[length/2,0],[length/2-2,1.7],[-length/2,1.2]],1.6,2.8,{ink:"accent",tone:0.95});
  pixelPrism(faces,[[-2,-9],[1,-9],[3,-2],[3,2],[1,9],[-2,9]],2.4,0.85,{ink:"accent",tone:0.9});
  pixelPrism(faces,[[-length/2,-4.5],[-length/2+2,-4.5],[-length/2+3,0],[-length/2+2,4.5],[-length/2,4.5]],2.7,0.7,{ink:"accent",tone:0.8});
  pixelBox(faces,[-length/2,-0.45,3.4],[2.8,0.9,3],{ink:"accent",tone:0.9});
  pixelBox(faces,[length/2-4,-1.35,4.42],[2,2.7,0.25],{tone:0.2});
  if(commuter) { for(const y of [-5,5]) pixelBox(faces,[0,y-0.8,2.7],[4,1.6,1.8],{ink:"accent",tone:0.8}); }
  else pixelBox(faces,[length/2-0.2,-2.7,2.6],[0.65,5.4,0.65],{tone:0.72});
  for(const y of [-1.5,1.5]) pixelBox(faces,[-2,y-0.45,0.4],[2,0.9,1.2],{tone:0.68});
  return faces;
}
export const mount: Mount<ApronTaxiProps>=(host,initial={})=>{
  let props={...defaults,...initial};
  const attrs=hostAttributes(host);
  attrs.set("role",null);
  attrs.set("aria-label",null);
  attrs.set("aria-hidden","true");
  let staticFaces=apronGround(props.layout,props.seed),plane=apronAircraft(props.aircraft==="commuter");
  let redraw=():void=>{};
  const surface=createCanvas(host,{autoSize:false,css:"image-rendering:pixelated",onResize:()=>{resize();redraw();}});
  const scene=createPixelScene(surface.canvas);
  const palette=watchPalette(host,()=>redraw());
  function resize():void {
    const w=Math.max(1,surface.cssWidth),h=Math.max(1,surface.cssHeight),scale=Math.max(3,Math.ceil(w/360),Math.ceil(h/300)),canvas=surface.canvas;
    canvas.width=Math.max(1,Math.floor(w/scale));canvas.height=Math.max(1,Math.floor(h/scale));
    canvas.style.width=`${canvas.width*scale}px`;canvas.style.height=`${canvas.height*scale}px`;
    canvas.style.left=`${Math.floor((w-canvas.width*scale)/2)}px`;canvas.style.top=`${Math.floor((h-canvas.height*scale)/2)}px`;
  }
  resize();
  function draw(t:number):void {
    const lap=Math.max(16,Math.min(40,props.lapSeconds)),phase=((t/(lap*1000)+0.16+(Math.max(1,Math.min(99,props.seed))-1)*0.071)%1+1)%1,hold=0.012,u=phase<hold?0:(phase-hold)/(1-hold);
    const p=apronRoute(props.layout,u),n=apronNormal(props.layout,u),forward:ApronXY=[-n[1],n[0]];
    const moving=plane.map((face):PixelFace=>({...face,points:face.points.map(([x,y,z]):PixelPoint=>[p[0]+forward[0]*x+n[0]*y,p[1]+forward[1]*x+n[1]*y,z])}));
    scene.draw(staticFaces,moving,palette.colors,apronView);
    attrs.set("data-pica-ready","true");
  }
  const loop=createLoop({el:host,fps:12,paused:props.paused,time:props.time,still:1200,frame:draw});
  redraw=()=>loop.redraw();
  let destroyed=false;
  return {
    update(next) {
      const before=props;props={...props,...next};
      if(props.layout!==before.layout||props.seed!==before.seed) staticFaces=apronGround(props.layout,props.seed);
      if(props.aircraft!==before.aircraft) plane=apronAircraft(props.aircraft==="commuter");
      palette.refresh();loop.update({paused:props.paused,time:props.time});loop.redraw();
    },
    destroy() {
      if(destroyed)return;destroyed=true;
      loop.destroy();palette.destroy();surface.destroy();attrs.restore();
    },
  };
};
