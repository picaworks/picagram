import { hostAttributes, nextId, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import { GRID_FONT } from "../../../lib/font";
import type { Mount } from "../../../lib/types";
export interface MovementPhrase {
 /** Phrase title. */
 title: string;
 /** Start time in the piece. */
 time: string;
 /** Length of the phrase. */
 duration: string;
 /** Movement instruction. */
 instruction: string;
 /** Drawing notation for the phrase. */
 notation: "orbit" | "cross" | "fold" | "pause";
}
export interface DanceCredit {
 /** Program role. */
 role: string;
 /** Credited name. */
 name: string;
}
export interface ChoreographicScoreProps {
 /** Company name. */
 company: string;
 /** Performance title. */
 title: string;
 /** Performance information. */
 performance: string;
 /** Artistic program note. */
 note: string;
 /** Movement phrases of the score. */
 phrases: readonly MovementPhrase[];
 /** Cast and production credits. */
 credits: readonly DanceCredit[];
 /** Audience information. */
 audience: string;
}
export const defaults: ChoreographicScoreProps = {
 company:"Common Weight / Contemporary dance",title:"The distance between",performance:"Studio theatre · 18—20 November 2026 · 42 minutes",
 note:"Four bodies negotiate one shared space. A gesture travels from dancer to dancer until its origin is lost. This score preserves the rules of the exchange, leaving its texture to the performers.",
 phrases:[
 {title:"Find the orbit",time:"00:00",duration:"08 min",instruction:"Walk around a point that no one occupies. Keep one person in your peripheral vision. Let the circle change size without agreeing on a leader.",notation:"orbit"},
 {title:"Crossing paths",time:"08:00",duration:"12 min",instruction:"Cross the room on a diagonal. At each encounter, exchange one movement and carry it to the next person. No gesture returns unchanged.",notation:"cross"},
 {title:"Fold and return",time:"20:00",duration:"14 min",instruction:"Lower the centre of weight in four counts. Let the floor receive one point of contact at a time. Rise by reversing the order, not the speed.",notation:"fold"},
 {title:"Hold the interval",time:"34:00",duration:"08 min",instruction:"Leave the last movement unfinished. Stay with the space between two bodies until breathing becomes the only visible rhythm.",notation:"pause"},
 ],
 credits:[{role:"Choreography",name:"Nina Vale"},{role:"Performers",name:"Ari Chen / Sol Lane / Noor Reed / Tess Gray"},{role:"Sound",name:"Milo Hart"},{role:"Lighting",name:"Eden Moss"}],
 audience:"The performance begins in low light and includes periods of silence. Seating is unreserved. The studio opens twenty minutes before the start; a printed score is available at the entrance.",
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


function danceNotation(parent: Element, notation: MovementPhrase["notation"]): void {
 const s=studioSvg(parent,"0 0 260 160");
 studioMark(s,"path",{d:"M 12 80 H 248 M 130 12 V 148","stroke-opacity":".15","stroke-dasharray":"2 5"});
 if(notation==="orbit"){
  for(let i=0;i<3;i++)studioMark(s,"ellipse",{cx:"130",cy:"80",rx:String(43+i*27),ry:String(26+i*16),"stroke-opacity":String(.3+i*.3)});
  for(const [x,y] of [[33,80],[130,22],[227,80],[130,138]])studioMark(s,"circle",{cx:String(x),cy:String(y),r:"5",fill:cssVar("fg")});
  studioMark(s,"path",{d:"M 214 49 l 9 18 l 7 -17",stroke:cssVar("accent"),"stroke-width":"3"});
 }else if(notation==="cross"){
  studioMark(s,"path",{d:"M 24 24 L 236 136 M 24 136 L 236 24","stroke-width":"2"});
  for(let i=0;i<5;i++)studioMark(s,"circle",{cx:String(36+i*46),cy:String(30+i*25),r:"5",fill:cssVar("fg")});
  studioMark(s,"circle",{cx:"130",cy:"80",r:"18",stroke:cssVar("accent"),"stroke-width":"3"});
 }else if(notation==="fold"){
  studioMark(s,"path",{d:"M 22 31 L 73 125 L 124 31 L 175 125 L 226 31","stroke-width":"2"});
  for(const [x,y] of [[22,31],[73,125],[124,31],[175,125],[226,31]])studioMark(s,"circle",{cx:String(x),cy:String(y),r:"5",fill:cssVar("fg")});
  studioMark(s,"path",{d:"M 60 141 H 88",stroke:cssVar("accent"),"stroke-width":"3"});
 }else {
  studioMark(s,"path",{d:"M 85 28 V 132 M 175 28 V 132","stroke-width":"3"});
  for(let i=0;i<7;i++)studioMark(s,"circle",{cx:String(100+i*10),cy:"80",r:"1.5",fill:cssVar("accent"),stroke:"none"});
  studioMark(s,"circle",{cx:"85",cy:"80",r:"8",fill:cssVar("fg")});studioMark(s,"circle",{cx:"175",cy:"80",r:"8",fill:cssVar("fg")});
 }
}
export const mount: Mount<ChoreographicScoreProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  const attributes = hostAttributes(host);
  attributes.set("data-pica-id", host.getAttribute("data-pica-id"));
  attributes.set("data-pica-ready", host.getAttribute("data-pica-ready"));
  attributes.set("role", "region");
  attributes.set("aria-label", props.title);
  attributes.set("aria-hidden", null);
  const sheet = scope(host);
  const page = studioNode("div", host, "", "page");
  const ids = [nextId("choreographic-score-a"), nextId("choreographic-score-b"), nextId("choreographic-score-c")];
  sheet.setRules(studioRules(sheet.selector) + `
 ${sheet.selector} [data-role="dance-head"]{border-top:3px solid ${cssVar("accent")};display:grid;grid-template-columns:2fr 1fr;gap:26px 60px;padding:38px 0 56px}${sheet.selector} [data-role="dance-head"] h1{font-size:clamp(64px,10vw,142px);grid-column:1/-1;max-width:10ch}${sheet.selector} [data-role="subtitle"]{font-family:var(--pica-font-serif,inherit);font-size:28px;max-width:24ch}${sheet.selector} [data-role="dance-head"]>p:last-child{font-size:14px}
 ${sheet.selector} [data-role="score"]>h2{font-family:${GRID_FONT};font-size:12px;text-transform:uppercase;border-top:1px solid ${cssVar("fg")};padding-top:22px}${sheet.selector} [data-role="score-key"]{display:flex;justify-content:space-between;gap:20px;padding:24px 0}${sheet.selector} [data-role="score-key"] p{font-size:11px}
 ${sheet.selector} [data-role="phrase"]{display:grid;grid-template-columns:140px 1fr 1.4fr;gap:36px;padding:26px 0;border-top:1px solid ${cssVar("muted")}}${sheet.selector} [data-role="timestamp"]{font-family:${GRID_FONT};font-size:30px;letter-spacing:-.06em}${sheet.selector} [data-role="time"]{border-right:1px solid ${cssVar("fg")}}${sheet.selector} [data-role="time"] p:last-child{margin-top:12px}${sheet.selector} [data-role="phrase"] svg{max-width:280px}${sheet.selector} [data-role="phrase"] figcaption{margin-top:12px}${sheet.selector} [data-role="instruction"] p{font-size:14px;margin-top:14px}
 ${sheet.selector} [data-role="program"]{display:grid;grid-template-columns:1fr 1.6fr;gap:40px;padding-top:36px;margin-top:28px;border-top:2px solid ${cssVar("fg")}}${sheet.selector} dl{display:grid;grid-template-columns:1fr 2fr;gap:18px;margin:0}${sheet.selector} dt{font-family:${GRID_FONT};font-size:11px;text-transform:uppercase}${sheet.selector} dd{margin:0;font-size:15px}
 ${sheet.selector} [data-role="audience"]{display:grid;grid-template-columns:1fr 1.6fr;gap:40px;margin-top:42px;padding-top:26px;border-top:1px solid ${cssVar("fg")}}
 @media(max-width:700px){${sheet.selector} [data-role="dance-head"]{display:block}${sheet.selector} [data-role="dance-head"]>*{margin-bottom:24px}${sheet.selector} [data-role="dance-head"] h1{font-size:72px}${sheet.selector} [data-role="score-key"]{display:block}${sheet.selector} [data-role="score-key"] p{margin-bottom:14px}${sheet.selector} [data-role="phrase"]{grid-template-columns:80px 1fr;gap:18px}${sheet.selector} [data-role="timestamp"]{font-size:22px}${sheet.selector} [data-role="instruction"]{grid-column:2}${sheet.selector} [data-role="program"],${sheet.selector} [data-role="audience"]{display:block}${sheet.selector} [data-role="program"] h2,${sheet.selector} [data-role="audience"] h2{margin-bottom:24px}${sheet.selector} dl{grid-template-columns:1fr 1.8fr}}
`);
  function render(): void {
    page.replaceChildren();
    attributes.set("aria-label", props.title);

 const top=studioNode("header",page,"","top");studioNode("p",top,props.company,"label");const nav=studioNode("nav",top);studioLink(nav,"Movement score",ids[0]!);studioLink(nav,"Program",ids[1]!);studioLink(nav,"Before you arrive",ids[2]!);
 const intro=studioNode("div",page,"","dance-head");studioNode("p",intro,props.performance,"label");studioNode("h1",intro,props.title);studioNode("p",intro,"A piece for four bodies and the space they share","subtitle");studioNode("p",intro,props.note);
 const score=studioSection(page,"The movement score",ids[0]!,"score");const legend=studioNode("div",score,"","score-key");studioNode("p",legend,"● Body / ─ Path / · Interval / ↗ Transfer","label");studioNode("p",legend,"Read as an instruction, not a fixed sequence.","muted");
 for(const [i,phrase] of props.phrases.entries()) {
 const row=studioNode("article",score,"","phrase");const time=studioNode("div",row,"","time");studioNode("p",time,phrase.time,"timestamp");studioNode("p",time,phrase.duration,"label");const diagram=studioNode("figure",row);danceNotation(diagram,phrase.notation);studioNode("figcaption",diagram,`PHRASE ${String(i+1).padStart(2,"0")}`);const text=studioNode("div",row,"","instruction");studioNode("h3",text,phrase.title);studioNode("p",text,phrase.instruction);
 }
 const program=studioSection(page,"People carrying the piece",ids[1]!,"program");const list=studioNode("dl",program);for(const credit of props.credits){studioNode("dt",list,credit.role);studioNode("dd",list,credit.name);}
 const audience=studioSection(page,"Before you arrive",ids[2]!,"audience");studioNode("p",audience,props.audience);
 const foot=studioNode("footer",page,"","foot");studioNode("p",foot,"Performance program / The score remains open");studioLink(foot,"Read the score again ↑",ids[0]!);

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
