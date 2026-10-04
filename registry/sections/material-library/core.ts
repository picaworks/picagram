import { hostAttributes, nextId, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import { GRID_FONT } from "../../../lib/font";
import type { Mount } from "../../../lib/types";
export interface MaterialSample {
  /** Sample name. */
  name: string;
  /** Material group. */
  family: string;
  /** Surface pattern. */
  pattern: "grain" | "aggregate" | "weave" | "rib";
  /** Specification thickness. */
  thickness: string;
  /** Primary use. */
  use: string;
  /** Care and handling note. */
  care: string;
}
export interface MaterialLibraryProps {
  /** Practice name. */
  practice: string;
  /** Index title. */
  title: string;
  /** Edition metadata. */
  edition: string;
  /** Library description. */
  description: string;
  /** Material samples and specifications. */
  samples: readonly MaterialSample[];
  /** Selection criteria and research note. */
  selection: string;
}
export const defaults: MaterialLibraryProps = {
 practice:"FORM / Architectural research",title:"Material register",edition:"Reference library / Issue 02 / 2026",
 description:"A working index of surfaces selected for repairability, honest ageing, and the way they meet the hand.",
 samples:[
 {name:"Quarter-sawn ash",family:"Timber / AS-01",pattern:"grain",thickness:"22 mm",use:"Joinery fronts",care:"Oil annually. Retain spare lengths for local repair."},
 {name:"Recast terrazzo",family:"Mineral / TZ-04",pattern:"aggregate",thickness:"30 mm",use:"Work surfaces",care:"Seal after installation. Avoid acidic cleaners."},
 {name:"Wool felt",family:"Textile / WF-02",pattern:"weave",thickness:"8 mm",use:"Acoustic lining",care:"Dry brush. Mechanically fix for replacement."},
 {name:"Ribbed clay",family:"Ceramic / CL-03",pattern:"rib",thickness:"18 mm",use:"Wall cladding",care:"Wash with neutral soap. Keep the joints accessible."}
 ],selection:"Compare assemblies as well as surfaces. A durable sample can still become waste when it is bonded into an irreversible detail. Our preferred specification uses exposed fixings, standard dimensions, and replaceable edges.",
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

function materialPattern(parent: Element, pattern: MaterialSample["pattern"]): void {
 const s=studioSvg(parent,"0 0 240 180");
 studioMark(s,"rect",{x:"0",y:"0",width:"240",height:"180",fill:cssVar("fg"),"fill-opacity":".05",stroke:"none"});
 if(pattern==="grain")for(let i=0;i<23;i++)studioMark(s,"path",{d:`M ${i*11-12} 0 Q ${i*11+24} 50 ${i*11-3} 92 T ${i*11+4} 180`,"stroke-opacity":String(.3+(i%3)*.2)});
 else if(pattern==="aggregate")for(let i=0;i<68;i++){const x=(i*43)%240,y=(i*67)%180;studioMark(s,"path",{d:`M ${x} ${y} l ${5+i%8} -3 l 4 ${6+i%5} l -8 4 Z`,fill:cssVar("fg"),"fill-opacity":String(.12+(i%4)*.15),"stroke-opacity":".3"});}
 else if(pattern==="weave")for(let i=0;i<32;i++){studioMark(s,"path",{d:`M ${i*8} 0 V 180 M 0 ${i*7} H 240`,"stroke-opacity":String(i%2?".2":".55")});}
 else for(let i=0;i<20;i++){studioMark(s,"rect",{x:String(i*13),y:"0",width:"7",height:"180",fill:cssVar("fg"),"fill-opacity":".4",stroke:"none"});studioMark(s,"path",{d:`M ${i*13+9} 0 V 180`,"stroke-opacity":".6"});}
}
export const mount: Mount<MaterialLibraryProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  const attributes = hostAttributes(host);
  attributes.set("data-pica-id", host.getAttribute("data-pica-id"));
  attributes.set("data-pica-ready", host.getAttribute("data-pica-ready"));
  attributes.set("role", "region");
  attributes.set("aria-label", props.title);
  attributes.set("aria-hidden", null);
  const sheet = scope(host);
  const page = studioNode("div", host, "", "page");
  const ids = [nextId("material-library-a"), nextId("material-library-b"), nextId("material-library-c")];
  sheet.setRules(studioRules(sheet.selector) + `
 ${sheet.selector} [data-role="register-head"]{display:grid;grid-template-columns:1.8fr 1fr;gap:20px 60px;padding:38px 0 44px}${sheet.selector} [data-role="register-head"] h1{grid-row:2/4}${sheet.selector} [data-role="register-head"]>p:last-child{grid-column:2;grid-row:3}
 ${sheet.selector} [data-role="register-body"]{display:grid;grid-template-columns:1.8fr 1fr;gap:48px}${sheet.selector} [data-role="sample-index"] h2,${sheet.selector} [data-role="ledger"] h2{font-family:${GRID_FONT};font-size:12px;text-transform:uppercase;margin-bottom:24px}
 ${sheet.selector} [data-role="sample"]{display:grid;grid-template-columns:26px 180px 1fr;gap:18px;padding:20px 0;border-top:1px solid ${cssVar("fg")}}
 ${sheet.selector} [data-role="sample-number"]{color:${cssVar("fg")};border-top:2px solid ${cssVar("accent")};padding-top:3px;font-family:${GRID_FONT};font-size:13px}${sheet.selector} [data-role="sample"] figcaption{margin-top:8px}${sheet.selector} [data-role="sample"] h3{margin-bottom:10px}${sheet.selector} [data-role="sample"] p{font-size:13px;margin-top:10px}
 ${sheet.selector} [data-role="ledger"]{border-left:1px solid ${cssVar("fg")};padding-left:28px}${sheet.selector} table{border-collapse:collapse;width:100%;margin-top:20px}${sheet.selector} th,${sheet.selector} td{text-align:start;vertical-align:top;padding:14px 8px 14px 0;border-bottom:1px solid ${cssVar("muted")}}${sheet.selector} th{font-weight:500}
 ${sheet.selector} [data-role="comparison"]{margin-top:36px;padding:20px;background:color-mix(in srgb,${cssVar("fg")} 5%,transparent)}${sheet.selector} [data-role="comparison"] p{font-size:12px;margin-bottom:12px}
 ${sheet.selector} [data-role="selection"]{display:grid;grid-template-columns:1fr 1.4fr;gap:60px;border-top:1px solid ${cssVar("fg")};padding-top:30px;margin-top:30px}
 @media(max-width:950px){${sheet.selector} [data-role="register-body"]{grid-template-columns:1fr 1fr}${sheet.selector} [data-role="sample"]{grid-template-columns:22px 1fr}${sheet.selector} [data-role="sample"]>div{grid-column:2}}
 @media(max-width:650px){${sheet.selector} [data-role="register-head"]{display:block}${sheet.selector} [data-role="register-head"]>*{margin-bottom:24px}${sheet.selector} [data-role="register-body"]{display:block}${sheet.selector} [data-role="sample"]{grid-template-columns:22px 100px 1fr;gap:12px}${sheet.selector} [data-role="sample"]>div{grid-column:3}${sheet.selector} [data-role="ledger"]{border-left:0;padding-left:0;margin-top:36px}${sheet.selector} [data-role="selection"]{display:block}${sheet.selector} [data-role="selection"] h2{margin-bottom:22px}}
`);
  function render(): void {
    page.replaceChildren();
    attributes.set("aria-label", props.title);

 const top=studioNode("header",page,"","top");studioNode("p",top,props.practice,"label");const nav=studioNode("nav",top);studioLink(nav,"Samples",ids[0]!);studioLink(nav,"Specification ledger",ids[1]!);studioLink(nav,"Selection criteria",ids[2]!);
 const intro=studioNode("div",page,"","register-head");studioNode("p",intro,props.edition,"label");studioNode("h1",intro,props.title);studioNode("p",intro,props.description);
 const body=studioNode("div",page,"","register-body");const index=studioSection(body,"01 / Surface index",ids[0]!,"sample-index");
 for(const [i,sample] of props.samples.entries()) {
   const row=studioNode("article",index,"","sample");studioNode("span",row,String(i+1).padStart(2,"0"),"sample-number");const fig=studioNode("figure",row);materialPattern(fig,sample.pattern);studioNode("figcaption",fig,sample.family);const note=studioNode("div",row);studioNode("h3",note,sample.name);studioNode("p",note,sample.use);studioNode("p",note,sample.care,"muted");
 }
 const ledger=studioSection(body,"02 / Specification ledger",ids[1]!,"ledger");studioNode("p",ledger,"Nominal dimensions / Verify before ordering","label");
 const table=studioNode("table",ledger);const head=studioNode("thead",table);const hr=studioNode("tr",head);for(const label of ["Material","Depth","Application"]){const th=studioNode("th",hr,label);th.scope="col";}
 const tbody=studioNode("tbody",table);for(const sample of props.samples){const tr=studioNode("tr",tbody);const th=studioNode("th",tr,sample.name);th.scope="row";studioNode("td",tr,sample.thickness);studioNode("td",tr,sample.use);}
 const comparison=studioNode("div",ledger,"","comparison");studioNode("p",comparison,"ASSEMBLY CHECK","label");for(const item of ["01  Accessible fixings","02  Replaceable contact surfaces","03  Offcuts returned to stock"]){studioNode("p",comparison,item);}
 const selection=studioSection(page,"Specify for the second life",ids[2]!,"selection");studioNode("p",selection,props.selection);
 const foot=studioNode("footer",page,"","foot");studioNode("p",foot,"Research samples / Dimensions are indicative");studioLink(foot,"Return to surface index ↑",ids[0]!);

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
