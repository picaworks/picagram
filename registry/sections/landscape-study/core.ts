import { hostAttributes, nextId, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import { GRID_FONT } from "../../../lib/font";
import type { Mount } from "../../../lib/types";
export interface LandscapeObservation {
 /** Season of the observation. */
 season: string;
 /** Water table measured below ground. */
 waterTable: string;
 /** Dominant vegetation. */
 vegetation: string;
 /** Field observation. */
 note: string;
}
export interface LandscapeStudyProps {
 /** Research practice. */
 practice: string;
 /** Project title. */
 title: string;
 /** Site location and survey reference. */
 site: string;
 /** Project hypothesis. */
 hypothesis: string;
 /** Seasonal field records. */
 observations: readonly LandscapeObservation[];
 /** Land intervention proposal. */
 intervention: string;
}
export const defaults: LandscapeStudyProps = {
 practice:"Groundwork / Landscape studies",title:"A field learns to hold water",site:"Bracken reach · Plot 06 · Survey datum 42.0 m",
 hypothesis:"A former grazing field lies between a dry ridge and a seasonal stream. We are studying how small changes in the ground can slow runoff and make room for a more varied meadow.",
 observations:[
 {season:"Early spring",waterTable:"0.18 m",vegetation:"Rush / wet grass",note:"Standing water persists at the lower gate for eleven days after rain."},
 {season:"High summer",waterTable:"0.72 m",vegetation:"Yarrow / fescue",note:"The ridge dries first. Seed heads remain intact where mowing is delayed."},
 {season:"Late autumn",waterTable:"0.31 m",vegetation:"Sedge / reed",note:"A shallow channel reconnects to the stream after two consecutive wet days."}
 ],
 intervention:"Cut three shallow swales along the contour. Reuse the excavated soil to raise dry walking edges, keep the lower meadow unmown until August, and record infiltration after each significant rainfall. The first year is a reversible trial across one hectare.",
};
function studioNode<K extends keyof HTMLElementTagNameMap>(tag: K, parent: Element, text = "", role = ""): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  if (role) node.setAttribute("data-role", role);
  if (text) node.textContent = text;
  parent.append(node);
  return node;
}
function studioSvg(parent: Element, viewBox: string): SVGSVGElement {
  const node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  node.setAttribute("data-pica", "");
  node.setAttribute("viewBox", viewBox);
  node.setAttribute("aria-hidden", "true");
  node.setAttribute("focusable", "false");
  parent.append(node);
  return node;
}
function studioMark(parent: Element, tag: string, attributes: Record<string, string>): SVGElement {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  node.setAttribute("data-pica", "");
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  parent.append(node);
  return node;
}
function studioLink(parent: Element, label: string, id: string): void {
  const link = studioNode("a", parent, label);
  link.href = `#${id}`;
}
function studioSection(parent: Element, title: string, id: string, role: string): HTMLElement {
  const section = studioNode("section", parent, "", role);
  section.id = id;
  studioNode("h2", section, title);
  return section;
}
function studioRules(s: string): string {
  const fg = cssVar("fg"), bg = cssVar("bg"), muted = cssVar("muted"), accent = cssVar("accent");
  return `
  ${s}{color:${fg};background:${bg};font:inherit;position:relative;box-sizing:border-box}
  ${s} [data-role="page"]{max-width:1440px;margin:auto;padding:clamp(20px,4vw,56px);box-sizing:border-box}
  ${s} [data-role="page"] *{box-sizing:border-box;min-width:0}
  ${s} h1,${s} h2,${s} h3,${s} p,${s} figure{margin:0}
  ${s} h1{font-family:var(--pica-font-wide,inherit);font-weight:500;line-height:.96;letter-spacing:-.055em;font-size:clamp(46px,7vw,104px)}
  ${s} h2{font-weight:500;font-size:clamp(22px,3vw,36px);line-height:1.12;letter-spacing:-.025em}
  ${s} h3{font-size:20px;font-weight:500;line-height:1.2}
  ${s} p{line-height:1.55;max-width:62ch}
  ${s} [data-role="label"],${s} figcaption,${s} th,${s} td,${s} [data-role="number"]{font-family:${GRID_FONT};font-size:11px;line-height:1.5;letter-spacing:.03em}
  ${s} [data-role="label"]{text-transform:uppercase}
  ${s} [data-role="muted"]{color:${muted}}
  ${s} nav{display:flex;gap:20px;flex-wrap:wrap;font-size:12px}
  ${s} a{color:inherit;text-underline-offset:5px;text-decoration-thickness:1px}
  ${s} a:focus-visible,${s} button:focus-visible{outline:2px solid ${accent};outline-offset:5px}
  ${s} button{font:inherit;color:inherit;background:transparent;border:1px solid ${fg};border-radius:0;cursor:pointer}
  ${s} svg{display:block;width:100%;height:auto;color:${fg};fill:none;stroke:currentColor;stroke-width:1;vector-effect:non-scaling-stroke}
  ${s} [data-role="accent"]{color:${accent}}
  ${s} [data-role="top"]>p{color:${muted}}
  ${s} [data-role="top"]{display:flex;justify-content:space-between;gap:24px;align-items:start;padding-bottom:24px;border-bottom:1px solid ${fg}}
  ${s} [data-role="foot"]{display:flex;justify-content:space-between;gap:24px;margin-top:48px;padding-top:18px;border-top:1px solid ${fg};font-size:12px}
  ${s} section{scroll-margin-top:24px}
  @media(max-width:600px){${s} [data-role="top"],${s} [data-role="foot"]{flex-direction:column;gap:14px}${s} h1{font-size:52px}${s} nav{gap:16px}}
  `;
}


function landscapeContours(parent: Element): void {
 const s=studioSvg(parent,"0 0 800 430");
 for(let i=0;i<18;i++) {
  const scale=.28+i*.082;
  const points: string[]=[];
  for(let j=0;j<=96;j++) {
   const angle=j/96*Math.PI*2;
   const radius=1+.13*Math.sin(3*angle)+.08*Math.cos(5*angle);
   const x=315+280*scale*radius*Math.cos(angle);
   const y=192+170*scale*radius*Math.sin(angle);
   points.push(`${j===0?"M":"L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  studioMark(s,"path",{d:points.join(" ")+" Z","stroke-opacity":String(i%4===0?".8":".35"),"stroke-width":i%4===0?"1.5":"1"});
 }
 studioMark(s,"path",{d:"M 30 346 C 180 301 245 410 386 328 S 638 308 780 238",stroke:cssVar("accent"),"stroke-width":"5"});
 studioMark(s,"path",{d:"M 128 32 L 648 390","stroke-dasharray":"6 6","stroke-width":"2"});
 for(const [x,y] of [[245,185],[390,225],[553,285]])studioMark(s,"circle",{cx:String(x),cy:String(y),r:"6",fill:cssVar("fg"),stroke:"none"});
 studioMark(s,"path",{d:"M 730 82 V 24 L 722 39 M 730 24 L 738 39 M 40 397 H 190 M 40 391 V 403 M 115 391 V 403 M 190 391 V 403","stroke-width":"2"});
}
function landscapeTransect(parent: Element): void {
 const s=studioSvg(parent,"0 0 800 200");
 studioMark(s,"path",{d:"M 20 35 L 96 43 L 170 57 L 250 86 L 320 96 L 390 130 L 470 135 L 525 127 L 580 153 L 650 146 L 730 162 L 780 159 V 190 H 20 Z",fill:cssVar("fg"),"fill-opacity":".09"});
 studioMark(s,"path",{d:"M 20 170 Q 170 153 320 162 T 780 178",stroke:cssVar("accent"),"stroke-dasharray":"5 4","stroke-width":"2"});
 for(let i=0;i<28;i++)studioMark(s,"path",{d:`M ${20+i*28} 191 l 24 -14`,"stroke-opacity":".2"});
 for(const x of [20,250,470,780])studioMark(s,"path",{d:`M ${x} 12 V 191`,"stroke-dasharray":"2 5","stroke-opacity":".3"});
}
export const mount: Mount<LandscapeStudyProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  const attributes = hostAttributes(host);
  attributes.set("data-pica-id", host.getAttribute("data-pica-id"));
  attributes.set("data-pica-ready", host.getAttribute("data-pica-ready"));
  attributes.set("role", "region");
  attributes.set("aria-label", props.title);
  attributes.set("aria-hidden", null);
  const sheet = scope(host);
  const page = studioNode("div", host, "", "page");
  const ids = [nextId("landscape-study-a"), nextId("landscape-study-b"), nextId("landscape-study-c")];
  sheet.setRules(studioRules(sheet.selector) + `
 ${sheet.selector} [data-role="land-head"]{display:grid;grid-template-columns:1.4fr 1fr;gap:26px 64px;padding:40px 0}${sheet.selector} [data-role="land-head"] h1{grid-row:2/4;font-size:clamp(48px,6.5vw,90px)}${sheet.selector} [data-role="land-head"]>p:last-child{grid-column:2;grid-row:3}
 ${sheet.selector} [data-role="survey"]{display:grid;grid-template-columns:2.4fr 1fr;gap:24px 36px;border-top:1px solid ${cssVar("fg")};padding-top:22px}${sheet.selector} [data-role="survey"] h2{grid-column:1/-1;font-family:${GRID_FONT};font-size:12px}
 ${sheet.selector} [data-role="map"]{background:color-mix(in srgb,${cssVar("fg")} 4%,transparent);padding:14px}${sheet.selector} figcaption{padding-top:16px;font-size:10px}
 ${sheet.selector} [data-role="map-notes"]{display:flex;flex-direction:column;gap:22px;padding-top:20px}${sheet.selector} [data-role="map-notes"] p{font-size:13px}${sheet.selector} [data-role="transect"]{grid-column:1/-1;border-bottom:1px solid ${cssVar("fg")};padding:20px 0 28px}
 ${sheet.selector} [data-role="records"]{padding-top:34px}${sheet.selector} [data-role="records"] h2{margin-bottom:28px}${sheet.selector} [data-role="record"]{display:grid;grid-template-columns:40px 1.1fr 1fr 1.4fr;gap:28px;padding:26px 0;border-top:1px solid ${cssVar("muted")}}${sheet.selector} [data-role="measure"]{font-family:var(--pica-font-wide,inherit);font-size:38px;line-height:1.1}${sheet.selector} [data-role="record"]>div:last-child p:last-child{margin-top:12px;font-size:14px}
 ${sheet.selector} [data-role="proposal"]{display:grid;grid-template-columns:1fr 1.6fr;gap:26px 50px;margin-top:40px;padding-top:28px;border-top:2px solid ${cssVar("fg")}}${sheet.selector} [data-role="proposal"]>p:last-child{grid-column:2}
 @media(max-width:750px){${sheet.selector} [data-role="land-head"]{display:block}${sheet.selector} [data-role="land-head"]>*{margin-bottom:24px}${sheet.selector} [data-role="survey"]{grid-template-columns:1fr}${sheet.selector} [data-role="map-notes"]{padding-top:0}${sheet.selector} [data-role="record"]{grid-template-columns:24px 1fr;gap:14px}${sheet.selector} [data-role="record"]>div{grid-column:2}${sheet.selector} [data-role="proposal"]{display:block}${sheet.selector} [data-role="proposal"]>*{margin-bottom:20px}}
`);
  function render(): void {
    page.replaceChildren();
    attributes.set("aria-label", props.title);

 const top=studioNode("header",page,"","top");studioNode("p",top,props.practice,"label");const nav=studioNode("nav",top);studioLink(nav,"Survey",ids[0]!);studioLink(nav,"Field records",ids[1]!);studioLink(nav,"Trial proposal",ids[2]!);
 const intro=studioNode("div",page,"","land-head");studioNode("p",intro,props.site,"label");studioNode("h1",intro,props.title);studioNode("p",intro,props.hypothesis);
 const survey=studioSection(page,"01 / Reading the ground",ids[0]!,"survey");const fig=studioNode("figure",survey,"","map");landscapeContours(fig);studioNode("figcaption",fig,"CONCEPT SURVEY / Contours at 0.5 m intervals / A → A′ transect / Scale bar 0—50 m");
 const notes=studioNode("aside",survey,"","map-notes");studioNode("p",notes,"Site keys","label");studioNode("h3",notes,"Three ground conditions");for(const text of ["01 / Ridge · thin soil, rapid drainage","02 / Mid-field · compacted former pasture","03 / Stream edge · seasonal saturation"])studioNode("p",notes,text);
 const transect=studioNode("figure",survey,"","transect");landscapeTransect(transect);studioNode("figcaption",transect,"SECTION A—A′ / Ridge 48.5 m → Stream edge 42.0 m / Dashed line: seasonal water table");
 const records=studioSection(page,"02 / A year in the field",ids[1]!,"records");
 for(const [i,record] of props.observations.entries()){const row=studioNode("article",records,"","record");studioNode("span",row,String(i+1).padStart(2,"0"),"number");studioNode("h3",row,record.season);const measurement=studioNode("div",row);studioNode("p",measurement,record.waterTable,"measure");studioNode("p",measurement,"Below ground / water table","label");const text=studioNode("div",row);studioNode("p",text,record.vegetation,"label");studioNode("p",text,record.note);}
 const proposal=studioSection(page,"03 / Slow the runoff",ids[2]!,"proposal");studioNode("p",proposal,props.intervention);studioNode("p",proposal,"Measure / Infiltration time · Plant diversity · Days of standing water","label");
 const foot=studioNode("footer",page,"","foot");studioNode("p",foot,"Concept field study / Original diagram, not a navigational survey");studioLink(foot,"Return to survey ↑",ids[0]!);

    attributes.set("data-pica-ready", "true");
  }
  render();
  let destroyed = false;
  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (!sameJson(before, props)) render();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      page.remove();
      sheet.destroy();
      attributes.restore();
    },
  };
};
