import { hostAttributes, nextId } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import { GRID_FONT } from "../../../lib/font";
import type { Mount } from "../../../lib/types";
export interface CityAtlasProps {
  /** The atlas masthead. */
  publication: string;
  /** The district name. */
  district: string;
  /** The district introduction. */
  introduction: string;
  /** The address index and accompanying narratives. */
  addresses: readonly { name: string; address: string; note: string }[];
}

export const defaults: CityAtlasProps = {
  "publication": "City Atlas / Local Studies",
  "district": "The East\nQuarter",
  "introduction": "A district measured in doorways, shared tables and the distance between a home and its favourite corner. An atlas of everyday public life.",
  "addresses": [
    {
      "name": "The market hall",
      "address": "01 / 18 Market Street",
      "note": "At nine, the shutters rise in sequence. By noon, the central aisle becomes a meeting place. Stay near the north entrance to see the building change from market to neighbourhood room."
    },
    {
      "name": "The pocket garden",
      "address": "02 / 7 Foundry Lane",
      "note": "A narrow gap between workshops became a garden through a decade of small decisions. Nothing here matches, but every seat has been placed with a reason."
    },
    {
      "name": "The evening library",
      "address": "03 / 42 Canal Walk",
      "note": "The reading room stays open after the offices close. From its windows, the canal looks like a slow second street. A noticeboard carries more local news than any single publication."
    },
    {
      "name": "The repair counter",
      "address": "04 / 3 Bridge Passage",
      "note": "People bring lamps, coats and questions. The counter is less a shop than a practical conversation about what can be kept in use."
    }
  ]
};

function cityAtlasNode<T extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: T, text = "", className = ""): HTMLElementTagNameMap[T] {
  const element = document.createElement(tag);
  element.setAttribute("data-pica", "");
  element.className = className;
  if (text) element.textContent = text;
  parent.append(element);
  return element;
}
function cityAtlasLink(parent: HTMLElement, text: string, id: string): HTMLAnchorElement {
  const a = cityAtlasNode(parent, "a", text);
  a.href = `#${id}`;
  return a;
}
function cityAtlasMark(parent: Element, tag: string, attributes: Readonly<Record<string, string>>): SVGElement {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  node.setAttribute("data-pica", "");
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  parent.append(node);
  return node;
}

function cityAtlasRules(s: string): string {
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
${s} .atlasgrid{display:grid;grid-template-columns:20rem 1fr;gap:3rem;padding-top:2rem}${s} h1{font-family:var(--pica-font-wide,sans-serif);font-size:clamp(3.8rem,6vw,6rem);white-space:pre-line}${s} .intro{margin-top:1.5rem;font-size:1.1rem}${s} .index{margin-top:2.5rem;border-top:1px solid ${fg};padding-top:1rem}${s} .addresslink{display:block;padding:.85rem 0;border-bottom:1px solid ${muted};text-decoration:none}${s} .addresslink span{display:block}${s} .addresslink strong{font-weight:500;font-size:1rem}
${s} .map{padding:1.2rem;border:1px solid ${fg}}${s} .map svg{height:420px}${s} .map rect{fill:none;stroke:currentColor;stroke-width:1}${s} .map path{fill:none;stroke:currentColor;stroke-width:1}${s} .map text{font-family:${GRID_FONT};font-size:12px;fill:currentColor}${s} .map .districtmark{fill:${accent};stroke:${accent}}${s} .map figcaption{display:flex;justify-content:space-between;gap:1rem;border-top:1px solid ${muted};padding-top:1rem}
${s} .narratives{display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-top:2rem}${s} .districtstory{padding-top:1.2rem;border-top:1px solid ${fg}}${s} .districtstory h2{font-size:1.5rem;margin:.5rem 0 .8rem}${s} .districtstory p{font-size:.95rem}${s} .legend{display:flex;gap:1.5rem;flex-wrap:wrap;margin:1rem 0}${s} .legend span:first-child{color:color-mix(in srgb, ${fg} 40%, ${accent})}
@media(max-width:900px){${s} .atlasgrid{grid-template-columns:15rem 1fr;gap:1.5rem}${s} .narratives{grid-template-columns:1fr}${s} .map svg{height:350px}}
@media(max-width:600px){${s} .atlasgrid{grid-template-columns:1fr}${s} .index{margin-top:1.5rem}${s} .map svg{height:320px}${s} .narratives{gap:1.5rem}}
`;
}

function cityAtlasRender(root: HTMLElement, p: CityAtlasProps, id: string): void {
  root.replaceChildren();
const mast=cityAtlasNode(root,"header","","mast");cityAtlasNode(mast,"span",p.publication,"label");cityAtlasNode(mast,"span","District 04 / Walking edition","label muted");
const grid=cityAtlasNode(root,"div","","atlasgrid");const intro=cityAtlasNode(grid,"div");const title=cityAtlasNode(intro,"h1",p.district);title.id=`${id}-title`;cityAtlasNode(intro,"p",p.introduction,"intro");const index=cityAtlasNode(intro,"nav","","index");index.setAttribute("aria-label","Address index");cityAtlasNode(index,"h2","Address index");p.addresses.forEach((place,i)=>{const a=cityAtlasLink(index,"",`${id}-address-${i}`);a.className="addresslink";cityAtlasNode(a,"span",place.address,"label muted");cityAtlasNode(a,"strong",place.name);});
const content=cityAtlasNode(grid,"div");const figure=cityAtlasNode(content,"figure","","map");const svg=cityAtlasMark(figure,"svg",{viewBox:"0 0 540 420",role:"img","aria-label":"Original schematic block map of the fictional East Quarter"});
for(let row=0;row<4;row++)for(let col=0;col<5;col++){if(col===3&&row>1)continue;cityAtlasMark(svg,"rect",{x:String(35+col*100),y:String(25+row*88),width:"76",height:"60"});}
cityAtlasMark(svg,"path",{d:"M0 356 H540 M0 366 H540 M0 376 H540"});cityAtlasMark(svg,"path",{d:"M388 0 V345","stroke-dasharray":"4 4"});
[[165,57],[265,145],[461,290],[65,235]].forEach(([x,y],i)=>{cityAtlasMark(svg,"rect",{x:String((x??0)-8),y:String((y??0)-8),width:"16",height:"16",class:"districtmark"});const t=cityAtlasMark(svg,"text",{x:String((x??0)+15),y:String((y??0)+4)});t.textContent=String(i+1).padStart(2,"0");});
const canal=cityAtlasMark(svg,"text",{x:"24",y:"403"});canal.textContent="CANAL WALK →";const north=cityAtlasMark(svg,"text",{x:"490",y:"17"});north.textContent="N ↑";
const caption=cityAtlasNode(figure,"figcaption");cityAtlasNode(caption,"span","East Quarter / Block study","label");cityAtlasNode(caption,"span","1 square ≈ 1 minute on foot","label muted");const legend=cityAtlasNode(content,"div","","legend label");cityAtlasNode(legend,"span","■ Places in this issue");cityAtlasNode(legend,"span","□ Neighbourhood blocks","muted");
const narratives=cityAtlasNode(content,"section","","narratives");p.addresses.forEach((place,i)=>{const article=cityAtlasNode(narratives,"article","","districtstory");article.id=`${id}-address-${i}`;cityAtlasNode(article,"span",place.address,"label muted");cityAtlasNode(article,"h2",place.name);cityAtlasNode(article,"p",place.note);});const details=cityAtlasNode(content,"details");cityAtlasNode(details,"summary","How to read this atlas");cityAtlasNode(details,"p","The East Quarter is a fictional district assembled to explore everyday urban life. The diagram shows relationships between places, rather than surveyed distances or public access routes.");
const footer=cityAtlasNode(root,"footer","","colophon");cityAtlasNode(footer,"span",p.publication,"label");cityAtlasLink(footer,"Back to the beginning",`${id}-title`).className="label";
}

export const mount: Mount<CityAtlasProps> = (host, initial = {}) => {
  let props: CityAtlasProps = { ...defaults, ...initial };
  const attributes = hostAttributes(host);
  const id = nextId("city-atlas");
  attributes.set("role", "region");
  attributes.set("aria-label", props.publication);
  const style = cityAtlasNode(host, "style");
  const root = cityAtlasNode(host, "article");
  root.id = id;
  style.textContent = cityAtlasRules(`[id="${id}"]`);
  cityAtlasRender(root, props, id);
  attributes.set("data-pica-ready", "true");
  return {
    update(next) {
      const merged = { ...props, ...next };
      if (sameJson(props, merged)) return;
      props = merged;
      attributes.set("aria-label", props.publication);
      cityAtlasRender(root, props, id);
    },
    destroy() {
      root.remove();
      style.remove();
      attributes.restore();
    },
  };
};
