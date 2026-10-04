import { hostAttributes, nextId } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import { GRID_FONT } from "../../../lib/font";
import type { Mount } from "../../../lib/types";
export interface SpecimenReviewProps {
  /** The review masthead. */
  publication: string;
  /** The review headline. */
  title: string;
  /** The question framing the review. */
  subtitle: string;
  /** The specimen label. */
  specimen: string;
  /** The numbered observational annotations. */
  observations: readonly { label: string; text: string }[];
  /** The illustrative measurements and material response rows. */
  comparisons: readonly { material: string; mass: number; span: number; response: string }[];
}

export const defaults: SpecimenReviewProps = {
  "publication": "Specimen / Quarterly Review 06",
  "title": "An object,\nclosely read.",
  "subtitle": "What a seed pod can teach us about designing for a second life.",
  "specimen": "Plate 014 / Dry seed capsule",
  "observations": [
    {
      "label": "Structure",
      "text": "A light shell is reinforced only where force gathers. The ribs do not repeat for decoration; they follow the work."
    },
    {
      "label": "Opening",
      "text": "The seam acts as a release. A change in moisture turns a closed container into a distribution system."
    },
    {
      "label": "Afterlife",
      "text": "Once emptied, the object remains legible. Its wear is evidence of a task completed rather than a surface spoiled."
    }
  ],
  "comparisons": [
    {
      "material": "Seed capsule",
      "mass": 0.8,
      "span": 34,
      "response": "Opens along a prepared seam"
    },
    {
      "material": "Folded paper",
      "mass": 1.2,
      "span": 30,
      "response": "Bends with the fold"
    },
    {
      "material": "Fired clay",
      "mass": 16.4,
      "span": 30,
      "response": "Keeps its shape under load"
    }
  ]
};

function specimenReviewNode<T extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: T, text = "", className = ""): HTMLElementTagNameMap[T] {
  const element = document.createElement(tag);
  element.setAttribute("data-pica", "");
  element.className = className;
  if (text) element.textContent = text;
  parent.append(element);
  return element;
}
function specimenReviewLink(parent: HTMLElement, text: string, id: string): HTMLAnchorElement {
  const a = specimenReviewNode(parent, "a", text);
  a.href = `#${id}`;
  return a;
}
function specimenReviewMark(parent: Element, tag: string, attributes: Readonly<Record<string, string>>): SVGElement {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  node.setAttribute("data-pica", "");
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  parent.append(node);
  return node;
}

function specimenReviewRules(s: string): string {
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
${s} .reviewhead{display:grid;grid-template-columns:1fr 22rem;gap:3rem;padding:2rem 0;border-bottom:1px solid ${fg};align-items:end}${s} h1{font-family:var(--pica-font-serif,Georgia,serif);font-size:clamp(3.8rem,7vw,6.8rem);white-space:pre-line}${s} .subtitle{font-size:1.2rem;max-width:30ch}
${s} .plategrid{display:grid;grid-template-columns:1.2fr 1fr;gap:3rem;padding:2rem 0}${s} .plate{border:1px solid ${fg};padding:1.2rem}${s} .plate svg{height:360px}${s} .plate path{stroke:currentColor;fill:none;stroke-width:1.5}${s} .plate .seam{stroke:${accent};stroke-width:2}${s} .plate text{fill:currentColor;font-family:${GRID_FONT};font-size:11px}${s} .plate figcaption{border-top:1px solid ${muted};padding-top:1rem;display:flex;justify-content:space-between;gap:1rem}
${s} .observation{display:grid;grid-template-columns:2.5rem 1fr;gap:1rem;padding:1.2rem 0;border-bottom:1px solid ${muted}}${s} .observation:first-child{padding-top:0}${s} .observation .number{font-family:${GRID_FONT};font-size:1.6rem;line-height:1.2;color:${muted}}${s} .observation p{margin-top:.7rem;max-width:45ch}
${s} .comparison{display:grid;grid-template-columns:15rem 1fr;gap:3rem;padding:2rem 0;border-top:1px solid ${fg}}${s} table{width:100%;border-collapse:collapse;font-size:.9rem;text-align:left}${s} th{font-family:${GRID_FONT};font-size:.7rem;text-transform:uppercase;font-weight:400}${s} td,${s} th{border-bottom:1px solid ${muted};padding:.8rem .7rem .8rem 0;vertical-align:top}
${s} .verdict{border-top:1px solid ${fg};padding-top:2rem;display:grid;grid-template-columns:15rem 1fr;gap:3rem}${s} .verdict p{font-family:var(--pica-font-serif,Georgia,serif);font-size:1.5rem;max-width:48ch}
@media(max-width:850px){${s} .reviewhead{grid-template-columns:1fr;gap:1rem}${s} .plategrid{gap:1.5rem}${s} .comparison,${s} .verdict{grid-template-columns:1fr;gap:1rem}}
@media(max-width:600px){${s} .plategrid{grid-template-columns:1fr}${s} .plate svg{height:280px}${s} td,${s} th{font-size:.75rem}${s} .verdict p{font-size:1.25rem}}
`;
}

function specimenReviewRender(root: HTMLElement, p: SpecimenReviewProps, id: string): void {
  root.replaceChildren();
const mast=specimenReviewNode(root,"header","","mast");specimenReviewNode(mast,"span",p.publication,"label");const nav=specimenReviewNode(mast,"nav","","nav label");nav.setAttribute("aria-label","Review sections");specimenReviewLink(nav,"The specimen",`${id}-plate`);specimenReviewLink(nav,"Comparison",`${id}-comparison`);
const head=specimenReviewNode(root,"div","","reviewhead");const title=specimenReviewNode(head,"h1",p.title);title.id=`${id}-title`;specimenReviewNode(head,"p",p.subtitle,"subtitle");
const grid=specimenReviewNode(root,"div","","plategrid");const figure=specimenReviewNode(grid,"figure","","plate");figure.id=`${id}-plate`;const svg=specimenReviewMark(figure,"svg",{viewBox:"0 0 450 360",role:"img","aria-label":"Original line study of a ribbed seed capsule with three observational callouts"});
specimenReviewMark(svg,"path",{d:"M224 44 C130 79 109 178 164 264 C190 303 225 319 225 319 C225 319 264 301 287 263 C343 176 318 80 224 44 Z"});
for(let offset=-3;offset<=3;offset++){specimenReviewMark(svg,"path",{d:`M224 44 C${224+offset*36} 105 ${225+offset*36} 247 225 319`});}
specimenReviewMark(svg,"path",{d:"M224 44 C214 119 230 237 225 319",class:"seam"});
[[170,130,60,90],[241,203,367,182],[251,286,360,312]].forEach(([x,y,x2,y2],i)=>{specimenReviewMark(svg,"path",{d:`M${x} ${y} L${x2} ${y2}`,"stroke-dasharray":"3 4"});const text=specimenReviewMark(svg,"text",{x:String(x2),y:String((y2??0)-8)});text.textContent=String(i+1).padStart(2,"0");});
specimenReviewMark(svg,"path",{d:"M32 319 h65 M32 314 v10 M97 314 v10"});const scale=specimenReviewMark(svg,"text",{x:"32",y:"343"});scale.textContent="10 mm / illustrative";
const caption=specimenReviewNode(figure,"figcaption");specimenReviewNode(caption,"span",p.specimen,"label");specimenReviewNode(caption,"span","Study in section","label muted");
const observations=specimenReviewNode(grid,"section");p.observations.forEach((item,i)=>{const row=specimenReviewNode(observations,"div","","observation");specimenReviewNode(row,"span",String(i+1).padStart(2,"0"),"number");const copy=specimenReviewNode(row,"div");specimenReviewNode(copy,"h2",item.label);specimenReviewNode(copy,"p",item.text);});
const comparison=specimenReviewNode(root,"section","","comparison");comparison.id=`${id}-comparison`;const label=specimenReviewNode(comparison,"div");specimenReviewNode(label,"h2","Three ways to hold a shape");specimenReviewNode(label,"p","Illustrative bench study / Equal initial span","label muted");const table=specimenReviewNode(comparison,"table");table.setAttribute("aria-label","Comparison of material structures");const thead=specimenReviewNode(table,"thead");const tr=specimenReviewNode(thead,"tr");["Material","Mass / g","Span / mm","Response"].forEach(t=>{const th=specimenReviewNode(tr,"th",t);th.scope="col";});const tbody=specimenReviewNode(table,"tbody");p.comparisons.forEach(row=>{const tr=specimenReviewNode(tbody,"tr");const th=specimenReviewNode(tr,"th",row.material);th.scope="row";specimenReviewNode(tr,"td",String(row.mass));specimenReviewNode(tr,"td",String(row.span));specimenReviewNode(tr,"td",row.response);});
const verdict=specimenReviewNode(root,"section","","verdict");specimenReviewNode(verdict,"h2","The review");const copy=specimenReviewNode(verdict,"div");specimenReviewNode(copy,"p","The most interesting feature is not the shell. It is the permission to come apart when the work is done.");const details=specimenReviewNode(copy,"details");specimenReviewNode(details,"summary","On the limits of this analogy");specimenReviewNode(details,"p","This original visual essay uses an illustrative capsule, not a botanical identification. The table contains illustrative measurements for a hypothetical comparison, not experimental findings. Natural structures offer questions for design; they do not by themselves establish an engineering specification.");
const footer=specimenReviewNode(root,"footer","","colophon");specimenReviewNode(footer,"span",p.publication,"label");specimenReviewLink(footer,"Back to the beginning",`${id}-title`).className="label";
}

export const mount: Mount<SpecimenReviewProps> = (host, initial = {}) => {
  let props: SpecimenReviewProps = { ...defaults, ...initial };
  const attributes = hostAttributes(host);
  const id = nextId("specimen-review");
  attributes.set("role", "region");
  attributes.set("aria-label", props.publication);
  const style = specimenReviewNode(host, "style");
  const root = specimenReviewNode(host, "article");
  root.id = id;
  style.textContent = specimenReviewRules(`[id="${id}"]`);
  specimenReviewRender(root, props, id);
  attributes.set("data-pica-ready", "true");
  return {
    update(next) {
      const merged = { ...props, ...next };
      if (sameJson(props, merged)) return;
      props = merged;
      attributes.set("aria-label", props.publication);
      specimenReviewRender(root, props, id);
    },
    destroy() {
      root.remove();
      style.remove();
      attributes.restore();
    },
  };
};
