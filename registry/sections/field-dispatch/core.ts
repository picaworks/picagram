import { hostAttributes, nextId } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import { GRID_FONT } from "../../../lib/font";
import type { Mount } from "../../../lib/types";
export interface FieldDispatchProps {
  /** The dispatch masthead. */
  publication: string;
  /** The route story headline. */
  title: string;
  /** The journey location. */
  location: string;
  /** The opening report. */
  introduction: string;
  /** The dated journey stops. */
  stops: readonly { place: string; date: string; report: string }[];
  /** The practical field kit notes. */
  packing: readonly string[];
}

export const defaults: FieldDispatchProps = {
  "publication": "Field Dispatch / No. 024",
  "title": "A road follows\nthe water",
  "location": "North Coast / 54° N",
  "introduction": "Four days along a coastal road, collecting the things that a timetable cannot tell you. Filed from the last working harbour before the headland.",
  "stops": [
    {
      "place": "Old ferry landing",
      "date": "08 Oct / 06:40",
      "report": "The ferry leaves before the town wakes. On the quay, crates are arranged by destination rather than weight. We follow the coast east, keeping the water on our left."
    },
    {
      "place": "Salt meadow",
      "date": "09 Oct / 12:15",
      "report": "The road narrows to a track beside the reeds. A retired surveyor shows us where the winter sea reaches. Every fence post carries a different high-water mark."
    },
    {
      "place": "Keeper’s house",
      "date": "10 Oct / 17:20",
      "report": "At the headland, the light comes on while there is still daylight. The keeper describes fog by its sound: first the bell, then the engine, then nothing at all."
    }
  ],
  "packing": [
    "A paper map with the ferry times written in the margin.",
    "Waterproof notebook, pencil, and a spare pair of dry socks.",
    "Ask at the harbour office before entering a working quay."
  ]
};

function fieldDispatchNode<T extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: T, text = "", className = ""): HTMLElementTagNameMap[T] {
  const element = document.createElement(tag);
  element.setAttribute("data-pica", "");
  element.className = className;
  if (text) element.textContent = text;
  parent.append(element);
  return element;
}
function fieldDispatchLink(parent: HTMLElement, text: string, id: string): HTMLAnchorElement {
  const a = fieldDispatchNode(parent, "a", text);
  a.href = `#${id}`;
  return a;
}
function fieldDispatchMark(parent: Element, tag: string, attributes: Readonly<Record<string, string>>): SVGElement {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  node.setAttribute("data-pica", "");
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  parent.append(node);
  return node;
}

function fieldDispatchRules(s: string): string {
  const fg = cssVar("fg");
  const bg = cssVar("bg");
  const accent = cssVar("accent");
  const muted = cssVar("muted");
  return `
${s}{box-sizing:border-box;background:${bg};color:${fg};padding:clamp(1.2rem,4vw,3.6rem);max-width:1440px;margin:auto;line-height:1.65;overflow-wrap:anywhere}
${s} *{box-sizing:border-box;min-width:0}
${s} h1,${s} h2,${s} h3,${s} p,${s} figure,${s} blockquote{margin:0}
${s} h1{font-weight:500;line-height:1.02;letter-spacing:-.045em}
${s} h2{font-weight:500;line-height:1.18;letter-spacing:-.025em;font-size:clamp(1.5rem,2.5vw,2.2rem)}
${s} h3{font-size:1.1rem;font-weight:600;line-height:1.4}
${s} .label{font-family:${GRID_FONT};font-size:.7rem;line-height:1.6;letter-spacing:.08em;text-transform:uppercase}
${s} .muted{color:${muted}}
${s} a{color:inherit;text-decoration:underline;text-underline-offset:.25em}
${s} a:focus-visible,${s} summary:focus-visible{outline:2px solid ${accent};outline-offset:4px}
${s} .mast{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;border-bottom:1px solid ${fg};padding-bottom:1rem}
${s} .nav{display:flex;gap:1.4rem;flex-wrap:wrap}
${s} .nav a{text-decoration:none}
${s} .rule{border-top:1px solid ${muted}}
${s} .colophon{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-top:3rem;padding-top:1rem;border-top:1px solid ${fg}}
${s} details{padding:1rem 0;border-top:1px solid ${muted}}
${s} summary{cursor:pointer;font-family:${GRID_FONT};font-size:.75rem;line-height:1.5}
${s} details p{padding-top:1rem;max-width:65ch}
${s} svg{display:block;width:100%;height:auto;color:${fg}}
${s} .accent{color:color-mix(in srgb, ${fg} 40%, ${accent})}
@media(max-width:600px){${s}{padding:1.2rem}${s} .nav{gap:.8rem}${s} .colophon{margin-top:2rem}}
${s} .dispatchhead{display:grid;grid-template-columns:1.2fr 1fr;gap:3rem;padding:2.5rem 0}
${s} h1{font-family:var(--pica-font-wide,sans-serif);font-size:clamp(3.5rem,7.5vw,7.2rem);white-space:pre-line;max-width:10ch}
${s} .route{border:1px solid ${fg};padding:1.2rem;align-self:start}${s} .route figcaption{display:flex;justify-content:space-between;border-top:1px solid ${muted};padding-top:1rem}
${s} .route svg{height:250px}${s} .route text{font-family:${GRID_FONT};font-size:12px;fill:currentColor}
${s} .intro{max-width:42rem;font-size:1.18rem;margin:1.5rem 0 2rem}
${s} .dispatchbody{display:grid;grid-template-columns:1fr 18rem;gap:4rem;border-top:1px solid ${fg};padding-top:2rem}
${s} .telegram{display:grid;grid-template-columns:7rem 1fr;gap:1.5rem;padding:1.5rem 0;border-bottom:1px solid ${muted}}
${s} .telegram:first-child{padding-top:0}${s} .telegram p{margin-top:.8rem;max-width:55ch}${s} .telegram .stamp{border:1px solid ${muted};padding:.6rem;align-self:start}
${s} .kit{border-left:1px solid ${fg};padding-left:1.5rem}${s} .kit ol{padding-left:1.2rem}${s} .kit li{padding:.6rem 0;font-size:.9rem}
${s} .route path{stroke:currentColor;fill:none;stroke-width:1.5}${s} .route circle{stroke:currentColor;fill:${bg};stroke-width:2}${s} .route .journey{stroke:${accent};stroke-width:3}
@media(max-width:850px){${s} .dispatchhead{grid-template-columns:1fr 1fr;gap:1.5rem}${s} .dispatchbody{grid-template-columns:1fr;gap:2rem}${s} .kit{border-left:0;padding-left:0}}
@media(max-width:600px){${s} .dispatchhead{grid-template-columns:1fr;padding:2rem 0}${s} .route svg{height:200px}${s} .telegram{grid-template-columns:1fr;gap:.8rem}${s} .stamp{justify-self:start}}
`;
}

function fieldDispatchRender(root: HTMLElement, p: FieldDispatchProps, id: string): void {
  root.replaceChildren();
const mast=fieldDispatchNode(root,"header","","mast");fieldDispatchNode(mast,"span",p.publication,"label");fieldDispatchNode(mast,"span","Correspondence from the road","label muted");
const head=fieldDispatchNode(root,"div","","dispatchhead");const words=fieldDispatchNode(head,"div");fieldDispatchNode(words,"p",p.location,"label accent");const title=fieldDispatchNode(words,"h1",p.title);title.id=`${id}-title`;fieldDispatchNode(words,"p",p.introduction,"intro");
const nav=fieldDispatchNode(words,"nav","","nav label");nav.setAttribute("aria-label","Journey stops");p.stops.forEach((stop,i)=>fieldDispatchLink(nav,`${i+1} / ${stop.place}`,`${id}-stop-${i}`));
const figure=fieldDispatchNode(head,"figure","","route");const svg=fieldDispatchMark(figure,"svg",{viewBox:"0 0 420 250",role:"img","aria-label":"An original schematic coast route from the ferry to the headland"});
fieldDispatchMark(svg,"path",{d:"M0 180 Q75 140 140 163 T250 130 T420 50"});fieldDispatchMark(svg,"path",{d:"M0 192 Q75 152 140 175 T250 142 T420 62","stroke-dasharray":"2 5"});fieldDispatchMark(svg,"path",{d:"M50 155 L146 110 L247 111 L350 62",class:"journey"});
[[50,155],[146,110],[350,62]].forEach(([x,y],i)=>{fieldDispatchMark(svg,"circle",{cx:String(x),cy:String(y),r:"6"});const t=fieldDispatchMark(svg,"text",{x:String((x??0)+10),y:String((y??0)-12)});t.textContent=String(i+1).padStart(2,"0");});
const sea=fieldDispatchMark(svg,"text",{x:"280",y:"208"});sea.textContent="NORTH SEA";const caption=fieldDispatchNode(figure,"figcaption");fieldDispatchNode(caption,"span","Route / 86 km","label");fieldDispatchNode(caption,"span","Schematic, not navigation","label muted");
const body=fieldDispatchNode(root,"div","","dispatchbody");const reports=fieldDispatchNode(body,"section");fieldDispatchNode(reports,"h2","Filed along the way");p.stops.forEach((stop,i)=>{const row=fieldDispatchNode(reports,"article","","telegram");row.id=`${id}-stop-${i}`;fieldDispatchNode(row,"div",stop.date,"label stamp");const copy=fieldDispatchNode(row,"div");fieldDispatchNode(copy,"h3",`${String(i+1).padStart(2,"0")} / ${stop.place}`);fieldDispatchNode(copy,"p",stop.report);});
const kit=fieldDispatchNode(body,"aside","","kit");fieldDispatchNode(kit,"h2","Field notebook");fieldDispatchNode(kit,"p","Notes for following the route","label muted");const list=fieldDispatchNode(kit,"ol");p.packing.forEach(text=>fieldDispatchNode(list,"li",text));const details=fieldDispatchNode(kit,"details");fieldDispatchNode(details,"summary","Weather and access");fieldDispatchNode(details,"p","This is a fictional field dispatch. For a real coastal walk, check the local tide table, ferry schedule and public access notices before setting out.");
const footer=fieldDispatchNode(root,"footer","","colophon");fieldDispatchNode(footer,"span",p.publication,"label");fieldDispatchLink(footer,"Back to the beginning",`${id}-title`).className="label";
}

export const mount: Mount<FieldDispatchProps> = (host, initial = {}) => {
  let props: FieldDispatchProps = { ...defaults, ...initial };
  const attributes = hostAttributes(host);
  const id = nextId("field-dispatch");
  attributes.set("role", "region");
  attributes.set("aria-label", props.publication);
  const style = fieldDispatchNode(host, "style");
  const root = fieldDispatchNode(host, "article");
  root.id = id;
  style.textContent = fieldDispatchRules(`[id="${id}"]`);
  fieldDispatchRender(root, props, id);
  attributes.set("data-pica-ready", "true");
  return {
    update(next) {
      const merged = { ...props, ...next };
      if (sameJson(props, merged)) return;
      props = merged;
      attributes.set("aria-label", props.publication);
      fieldDispatchRender(root, props, id);
    },
    destroy() {
      root.remove();
      style.remove();
      attributes.restore();
    },
  };
};
