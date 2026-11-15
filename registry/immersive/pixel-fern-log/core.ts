import { createCanvas } from "../../../lib/canvas";
import { hostAttributes } from "../../../lib/host";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { createPixelScene, pixelBox, pixelPrism, pixelRod, type PixelFace, type PixelPoint, type PixelView } from "../../../lib/pixel-scene";
import type { Mount, MotionProps } from "../../../lib/types";

export interface PixelFernLogProps extends MotionProps {
  /** Hollow trunk, suspended bridge or two connected broken lengths. */
  layout: "hollow" | "bridge" | "split";
  /** Width of the attached fern fans relative to the soil tile. */
  fernSpan: number;
  /** Seconds for the complete visible and occluded snail trail. */
  crawlSeconds: number;
}
export const defaults: PixelFernLogProps = {layout:"hollow",fernSpan:0.5,crawlSeconds:32,paused:false,time:null,seed:1};
const fernView:PixelView={bounds:[[-6.5,-4.5,-1],[6.5,4.5,7.3]],ground:0.6};
type FernTrail={a:PixelPoint;b:PixelPoint;start:number;length:number};

export const mount: Mount<PixelFernLogProps>=(host,initial={})=>{
  let props={...defaults,...initial};
  const attrs=hostAttributes(host);
  attrs.set("role",null);attrs.set("aria-label",null);attrs.set("aria-hidden","true");
  const surface=createCanvas(host,{autoSize:false,css:"image-rendering:pixelated",onResize:()=>{resize();loop.redraw();}});
  const renderer=createPixelScene(surface.canvas);
  const palette=watchPalette(host,()=>loop.redraw());
  let staticFaces:PixelFace[]=[];
  let trail:FernTrail[]=[];
  let trailLength=0;
  let destroyed=false;
  function resize():void {
    const w=surface.cssWidth,h=surface.cssHeight;
    const scale=Math.max(3,Math.ceil(w/360),Math.ceil(h/300));
    surface.canvas.width=Math.max(1,Math.floor(w/scale));surface.canvas.height=Math.max(1,Math.floor(h/scale));
    Object.assign(surface.canvas.style,{width:`${surface.canvas.width*scale}px`,height:`${surface.canvas.height*scale}px`,left:`${Math.floor((w-surface.canvas.width*scale)/2)}px`,top:`${Math.floor((h-surface.canvas.height*scale)/2)}px`,right:"auto",bottom:"auto"});
  }
  function centerY(x:number):number{return props.layout==="split"?0.35-Math.abs(x)*0.24:0;}
  function rebuild():void {
    staticFaces=[];trail=[];trailLength=0;
    const z=props.layout==="bridge"?2.7:2.05;
    pixelPrism(staticFaces,[[-6,-3],[-4.5,-4],[4.5,-4],[6,-2.5],[6,3],[4.5,4],[-4.5,4],[-6,2.5]],-0.8,1.4,{tone:0.24});
    if(props.layout==="bridge") {
      pixelBox(staticFaces,[-6,-3.5,0.6],[3,7,1.05],{tone:0.4});
      pixelBox(staticFaces,[3,-3.5,0.6],[3,7,1.05],{tone:0.4});
      pixelBox(staticFaces,[-2.7,-3.2,0.6],[5.4,6.4,0.15],{tone:0.15});
    }
    const ringPoint=(x:number,r:number,a:number):PixelPoint=>[x,centerY(x)+Math.cos(a)*r,z+Math.sin(a)*r];
    const sections=props.layout==="split"?[-4,0,4]:[-4,-1.2,1.4,4];
    for(let s=1;s<sections.length;s++) {
      const x0=sections[s-1]!,x1=sections[s]!;
      for(let i=0;i<10;i++) {
        const a=i*Math.PI/5,b=(i+1)*Math.PI/5;
        const stripped=s===2&&(i===1||i===2);
        const r=stripped?1.2:1.32;
        staticFaces.push({points:[ringPoint(x0,r,a),ringPoint(x1,r,a),ringPoint(x1,r,b),ringPoint(x0,r,b)],tone:stripped?0.48:0.36+(i%3)*0.05});
        staticFaces.push({points:[ringPoint(x0,0.78,a),ringPoint(x0,0.78,b),ringPoint(x1,0.78,b),ringPoint(x1,0.78,a)],tone:0.2});
      }
    }
    // Broad irregular cut faces preserve the real through opening without concentric piping.
    for(const x of [-4,4]) for(let i=0;i<10;i++) {
      const a=i*Math.PI/5,b=(i+1)*Math.PI/5;
      const outerA=1.27+(i%3)*0.045,outerB=1.27+((i+1)%3)*0.045;
      const cut=(r:number,angle:number,j:number):PixelPoint=>{
        const p=ringPoint(x,r,angle);
        return [p[0]+Math.sign(x)*(j%3===0?0.19:j%3===1?-0.1:0.05),p[1],p[2]];
      };
      staticFaces.push({points:[cut(0.78,a,i),cut(outerA,a,i),cut(outerB,b,i+1),cut(0.78,b,i+1)],tone:0.42+(i%3)*0.055});
    }
    // A few wide broken bark ridges follow the trunk away from the intact snail trail.
    for(const a of [0.12,2.95,3.85,5.65]) {
      const lengths=[-3.85,-1.7,0.8,3.75];
      for(let j=0;j<3;j++) {
        const x0=lengths[j]!,x1=lengths[j+1]!,r0=1.37+(j%2)*0.1,r1=1.43-(j%2)*0.08;
        const p=ringPoint(x0,r0,a-0.15),q=ringPoint(x1,r1,a-0.15),r=ringPoint(x1,r1,a+0.15),t=ringPoint(x0,r0,a+0.15);
        staticFaces.push({points:[p,q,r,t],tone:0.44+j*0.035});
        staticFaces.push({points:[ringPoint(x0,1.31,a-0.15),ringPoint(x1,1.31,a-0.15),q,p],tone:0.29});
        staticFaces.push({points:[t,r,ringPoint(x1,1.31,a+0.15),ringPoint(x0,1.31,a+0.15)],tone:0.32});
      }
    }
    pixelRod(staticFaces,[0.7,centerY(0.7)+0.5,z+0.8],[1.2,centerY(1.2)+1,z+1.25],0.25,{tone:0.55},6);
    if(props.layout==="split") for(const x of [-0.3,0.2,0.55])pixelRod(staticFaces,[x,0.6,z+0.7],[x+0.15,1,z+1.5],0.12,{tone:0.72},4);
    function fern(x:number,y:number,base:number,size:number,count:number):void {
      const span=Math.max(0.35,Math.min(0.7,props.fernSpan))/0.5;
      const scale=size/0.8;
      const reach=2*scale*span;
      const height=3.45*Math.sqrt(scale);
      // Broad leaf planes span world x and a tilted y/z axis facing the near camera.
      const leafPoint=(p:PixelPoint,side:number,across:number,along:number):PixelPoint=>[p[0]+side*across,p[1]-along*0.7,p[2]+along*0.714];
      for(let f=0;f<count;f++) {
        const lean=count===3?f-1:(f===0?-0.85:0.85);
        const stem=(u:number):PixelPoint=>[
          x+lean*reach*(0.3*u+0.7*u*u),
          y+0.45*u*u,
          base+height*(1-Math.abs(lean)*0.27)*Math.sin(u*2.05),
        ];
        for(let k=0;k<5;k++) pixelRod(staticFaces,stem(k/5),stem((k+1)/5),0.105*Math.sqrt(scale),{ink:"accent",tone:0.82},4);
        for(let k=0;k<4;k++) {
          const u=0.22+k*0.16,p=stem(u);
          const length=Math.max(0.8,Math.min(1.2,(1.08-u*0.25)*Math.sqrt(span)*(0.9+size*0.125)));
          const width=Math.max(0.7,Math.min(1.08,0.95*span))*Math.max(0.87,Math.sqrt(scale));
          for(const side of [-1,1]) staticFaces.push({points:[
            leafPoint(p,side,0,-0.08),
            leafPoint(p,side,length*0.43,width/2),
            leafPoint(p,side,length,0.05),
            leafPoint(p,side,length*0.43,-width/2),
          ],ink:"accent",tone:0.7+k*0.045});
        }
      }
    }
    fern(props.layout==="split"?0:-2.1,props.layout==="split"?-0.8:-2.3,props.layout==="split"?2.5:props.layout==="bridge"?0.75:0.6,0.8,3);
    fern(3.2,2.6,props.layout==="bridge"?1.65:0.6,0.48,2);
    // A closed arc-length trail wraps the end grain before returning behind the opaque trunk.
    const points:PixelPoint[]=[[-3.3,centerY(-3.3)+0.12,z+1.31],[-1.2,centerY(-1.2)+0.3,z+1.31],[0.3,centerY(0.3)-0.12,z+1.31],[2,centerY(2)+0.15,z+1.31],[3.3,centerY(3.3)+0.1,z+1.31],[3.5,centerY(3.5)-0.85,z+0.85],[3.1,centerY(3.1)-1.25,z-0.6],[-3.1,centerY(-3.1)-1.25,z-0.6],[-3.5,centerY(-3.5)-0.85,z+0.85]];
    for(let i=0;i<points.length;i++) {
      const a=points[i]!,b=points[(i+1)%points.length]!;
      const length=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
      trail.push({a,b,start:trailLength,length});trailLength+=length;
    }
  }
  function draw(t:number):void {
    const moving:PixelFace[]=[];
    const cycle=Math.max(24,Math.min(50,props.crawlSeconds));
    const distance=((t/1000/cycle+(Math.max(1,Math.min(99,props.seed))-1)*0.071+0.13)%1)*trailLength;
    const part=trail.find(s=>distance>=s.start&&distance<s.start+s.length)??trail[0]!;
    const u=(distance-part.start)/part.length;
    const x=part.a[0]+(part.b[0]-part.a[0])*u,y=part.a[1]+(part.b[1]-part.a[1])*u,z=part.a[2]+(part.b[2]-part.a[2])*u;
    const angle=Math.atan2(part.b[1]-part.a[1],part.b[0]-part.a[0]),c=Math.cos(angle),s=Math.sin(angle);
    const point=(a:number,b:number,h:number):PixelPoint=>[x+c*a-s*b,y+s*a+c*b,z+h];
    const stretch=1+Math.sin(t/1000*2.2)*0.08;
    const outline=[[-0.9,0],[-0.6,-0.32],[0.6,-0.3],[1,0],[0.6,0.3],[-0.6,0.32]] as const;
    moving.push({points:outline.map(([a,b])=>point(a*stretch,b,0.08)),tone:0.88});
    // A faceted vertical shell and a raised spiral keep shell and body distinct on a phone.
    const shellFront:PixelPoint[]=[],shellBack:PixelPoint[]=[];
    for(let i=0;i<10;i++) {
      const a=i*Math.PI/5;
      shellFront.push(point(-0.1+Math.cos(a)*0.63,0.3,0.72+Math.sin(a)*0.63));
      shellBack.push(point(-0.1+Math.cos(a)*0.63,-0.3,0.72+Math.sin(a)*0.63));
    }
    moving.push({points:shellFront,tone:0.78},{points:shellBack,tone:0.6});
    for(let i=0;i<10;i++)moving.push({points:[shellFront[i]!,shellFront[(i+1)%10]!,shellBack[(i+1)%10]!,shellBack[i]!],tone:0.7});
    let last:PixelPoint=point(0.4,0.33,0.72);
    for(let i=1;i<=9;i++) {
      const a=i*Math.PI*0.32,r=0.5*(1-i/11);
      const next=point(-0.1+Math.cos(a)*r,0.33,0.72+Math.sin(a)*r);
      pixelRod(moving,last,next,0.045,{tone:0.3},4);last=next;
    }
    for(const side of [-1,1])pixelRod(moving,point(0.7,side*0.17,0.1),point(1.05,side*0.25,0.45),0.045,{tone:0.9},4);
    renderer.draw(staticFaces,moving,palette.colors,fernView);attrs.set("data-pica-ready","true");
  }
  resize();rebuild();
  const loop=createLoop({el:host,fps:12,paused:props.paused,time:props.time,still:1200,frame:draw});
  return {
    update(next) {const before=props;props={...props,...next};if(props.layout!==before.layout||props.fernSpan!==before.fernSpan)rebuild();palette.refresh();loop.update({paused:props.paused,time:props.time});loop.redraw();},
    destroy() {if(destroyed)return;destroyed=true;loop.destroy();palette.destroy();surface.destroy();attrs.restore();},
  };
};
