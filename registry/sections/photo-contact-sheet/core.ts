import { hostAttributes, nextId, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import { GRID_FONT } from "../../../lib/font";
import type { Mount } from "../../../lib/types";
export interface PhotoFrame {
  /** Frame name and subject. */
  title: string;
  /** Location or exposure note. */
  note: string;
  /** Original geometric study to draw. */
  study: "stairs" | "arch" | "window" | "water" | "fold" | "tower";
}
export interface PhotoContactSheetProps {
  /** Photographer name. */
  photographer: string;
  /** Collection title. */
  title: string;
  /** Edition and date. */
  edition: string;
  /** Introduction to the series. */
  introduction: string;
  /** Numbered studies in the contact sheet. */
  frames: readonly PhotoFrame[];
  /** Curatorial note accompanying the selected frame. */
  commentary: string;
}
export const defaults: PhotoContactSheetProps = {
  photographer: "Mara Ellis / Photography", title: "The shape of quiet", edition: "Field studies · Volume 03 · 2026",
  introduction: "Six observations of ordinary structures, made during the hour when the city gives its surfaces back to the light.",
  frames: [
    { title: "Stairwell, 07:12", note: "North elevation / 1⁄125 s", study: "stairs" },
    { title: "A room without a roof", note: "Canal district / 1⁄60 s", study: "arch" },
    { title: "Four panes", note: "Workshop interior / 1⁄250 s", study: "window" },
    { title: "Water against stone", note: "East quay / 1⁄500 s", study: "water" },
    { title: "Folded afternoon", note: "Studio study / 1⁄30 s", study: "fold" },
    { title: "Last wall standing", note: "Railway yard / 1⁄125 s", study: "tower" },
  ],
  commentary: "An edge can describe a whole room. In these studies, the object is less important than the interval around it: a gap, a shadow, a narrow strip of morning. Each frame is drawn here as a tonal plate, preserving the proportions of the observation rather than borrowing a photograph.",
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

function photoPlate(parent: Element, study: PhotoFrame["study"]): void {
  const s = studioSvg(parent, "0 0 300 220");
  studioMark(s, "rect", { x: "1", y: "1", width: "298", height: "218", fill: cssVar("fg"), "fill-opacity": ".06", stroke: "none" });
  if (study === "stairs") {
    for (let i=0;i<9;i++) studioMark(s,"path",{d:`M ${20+i*24} 220 V ${188-i*19} H ${44+i*24} V 220`,fill:cssVar("fg"),"fill-opacity":String(.15+i*.065),stroke:"none"});
    studioMark(s,"path",{d:"M 20 180 L 280 20",stroke:cssVar("fg"),"stroke-width":"2"});
  } else if(study === "arch") {
    studioMark(s,"path",{d:"M 32 220 V 118 C 32 10 268 10 268 118 V 220 H 221 V 120 C 221 53 79 53 79 120 V 220 Z",fill:cssVar("fg"),"fill-opacity":".75",stroke:"none"});
    for(let i=0;i<12;i++) studioMark(s,"path",{d:`M 80 ${125+i*8} H 220`,"stroke-opacity":".25"});
  } else if(study === "window") {
    studioMark(s,"path",{d:"M 40 20 H 260 V 200 H 40 Z M 52 30 V 102 H 146 V 30 Z M 158 30 V 102 H 252 V 30 Z M 52 112 V 184 H 146 V 112 Z M 158 112 V 184 H 252 V 112 Z",fill:cssVar("fg"),"fill-rule":"evenodd","fill-opacity":".8",stroke:"none"});
    for(let i=0;i<15;i++) studioMark(s,"path",{d:`M ${46+i*10} 220 L ${100+i*10} 110`,"stroke-opacity":".3"});
  } else if(study === "water") {
    studioMark(s,"path",{d:"M 0 0 H 92 L 123 85 L 97 150 L 134 220 H 0 Z",fill:cssVar("fg"),"fill-opacity":".8",stroke:"none"});
    for(let i=0;i<22;i++) studioMark(s,"path",{d:`M ${130+(i%3)*9} ${i*10} Q 210 ${i*10-12} 300 ${i*10+3}`,"stroke-opacity":String(.2+(i%4)*.17)});
  } else if(study === "fold") {
    studioMark(s,"path",{d:"M 30 182 L 116 27 L 163 147 L 261 40 L 236 190 Z",fill:cssVar("fg"),"fill-opacity":".25"});
    studioMark(s,"path",{d:"M 116 27 L 163 147 L 30 182 Z",fill:cssVar("fg"),"fill-opacity":".7",stroke:"none"});
    studioMark(s,"path",{d:"M 163 147 L 236 190 L 261 40 Z",fill:cssVar("fg"),"fill-opacity":".45",stroke:"none"});
  } else {
    studioMark(s,"path",{d:"M 102 220 V 34 L 194 14 V 220 Z",fill:cssVar("fg"),"fill-opacity":".65"});
    for(let i=0;i<14;i++) studioMark(s,"path",{d:`M 103 ${47+i*12} L 193 ${27+i*12}`,"stroke-opacity":".4"});
    studioMark(s,"path",{d:"M 194 14 L 233 52 V 220 H 194 Z",fill:cssVar("fg"),"fill-opacity":".2"});
  }
}
export const mount: Mount<PhotoContactSheetProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  const attributes = hostAttributes(host);
  attributes.set("data-pica-id", host.getAttribute("data-pica-id"));
  attributes.set("data-pica-ready", host.getAttribute("data-pica-ready"));
  attributes.set("role", "region");
  attributes.set("aria-label", props.title);
  attributes.set("aria-hidden", null);
  const sheet = scope(host);
  const page = studioNode("div", host, "", "page");
  const ids = [nextId("photo-contact-sheet-a"), nextId("photo-contact-sheet-b"), nextId("photo-contact-sheet-c")];
  sheet.setRules(studioRules(sheet.selector) + `
 ${sheet.selector} [data-role="intro"]{display:grid;grid-template-columns:1.6fr 1fr;gap:20px 64px;padding:36px 0 42px}
 ${sheet.selector} [data-role="intro"] h1{grid-column:1;grid-row:2 / 4} ${sheet.selector} [data-role="intro"]>p:last-child{grid-column:2;grid-row:3;align-self:end}
 ${sheet.selector} [data-role="contact"] h2{font-family:${GRID_FONT};font-size:12px;text-transform:uppercase;margin-bottom:18px}
 ${sheet.selector} [data-role="frames"]{display:grid;grid-template-columns:repeat(3,1fr);gap:24px 20px}
 ${sheet.selector} [data-role="frames"] button{padding:8px;width:100%;border-color:${cssVar("muted")};display:block}
 ${sheet.selector} [data-role="frames"] button[aria-pressed="true"]{border:3px solid ${cssVar("accent")};padding:6px}
 ${sheet.selector} [data-role="frames"] figcaption{display:flex;gap:14px;padding-top:8px}
 ${sheet.selector} [data-role="selected"]{display:grid;grid-template-columns:1.4fr 1fr;gap:28px 48px;border-top:1px solid ${cssVar("fg")};padding-top:28px;margin-top:48px}
 ${sheet.selector} [data-role="selected"] h2{grid-column:1/-1;font-family:${GRID_FONT};font-size:12px;text-transform:uppercase}
 ${sheet.selector} [data-role="large"] svg{width:100%} ${sheet.selector} [data-role="large"] figcaption{margin-top:10px}
 ${sheet.selector} [data-role="caption"]{display:flex;flex-direction:column;gap:20px;justify-content:center}
 @media(max-width:750px){${sheet.selector} [data-role="intro"]{display:block}${sheet.selector} [data-role="intro"]>*{margin-top:20px}${sheet.selector} [data-role="frames"]{grid-template-columns:repeat(2,1fr)}${sheet.selector} [data-role="selected"]{grid-template-columns:1fr}}
`);
  function render(): void {
    page.replaceChildren();
    attributes.set("aria-label", props.title);

    const top=studioNode("header",page,"","top");
    studioNode("p",top,props.photographer,"label");
    const nav=studioNode("nav",top); studioLink(nav,"Contact sheet",ids[0]!); studioLink(nav,"Reading a frame",ids[1]!);
    const intro=studioNode("div",page,"","intro");
    studioNode("p",intro,props.edition,"label"); studioNode("h1",intro,props.title); studioNode("p",intro,props.introduction);
    const gallery=studioSection(page,"01 / Contact sheet",ids[0]!,"contact");
    const grid=studioNode("div",gallery,"","frames");
    const selected=studioSection(page,"02 / Reading a frame",ids[1]!,"selected");
    const image=studioNode("figure",selected,"","large"); const caption=studioNode("div",selected,"","caption");
    let chosen=0;
    function selectFrame(index: number): void {
      chosen=index; const frame=props.frames[index]; image.replaceChildren(); caption.replaceChildren();
      if(!frame){studioNode("p",caption,"Add a frame to begin this collection.");return;}
      photoPlate(image,frame.study); studioNode("figcaption",image,`SELECTED NEGATIVE / ${String(index+1).padStart(2,"0")}`);
      studioNode("p",caption,"A closer observation","label"); studioNode("h3",caption,frame.title);studioNode("p",caption,frame.note,"muted");studioNode("p",caption,props.commentary);
      for(const [i,button] of Array.from(grid.querySelectorAll("button")).entries()) button.setAttribute("aria-pressed",String(i===chosen));
    }
    for(const [i,frame] of props.frames.entries()) {
      const figure=studioNode("figure",grid); const b=studioNode("button",figure);b.type="button";b.setAttribute("aria-label",`View frame ${i+1}: ${frame.title}`);b.setAttribute("aria-pressed",String(i===0));
      photoPlate(b,frame.study); const c=studioNode("figcaption",figure);studioNode("span",c,String(i+1).padStart(2,"0"),"number");studioNode("span",c,frame.title);b.onclick=()=>selectFrame(i);
    }
    selectFrame(0);
    const foot=studioNode("footer",page,"","foot");studioNode("p",foot,"Archive / Six original tonal studies");studioLink(foot,"Return to the contact sheet ↑",ids[0]!);

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
