import { hostAttributes, nextId, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import { GRID_FONT } from "../../../lib/font";
import type { Mount } from "../../../lib/types";
export interface FashionLook {
  /** Garment name. */
  name: string;
  /** Textile and cut description. */
  description: string;
  /** Pattern and material details. */
  details: string;
  /** Original garment silhouette. */
  silhouette: "coat" | "dress" | "trouser";
}
export interface FashionLookbookProps {
  /** Label name. */
  label: string;
  /** Collection name. */
  title: string;
  /** Collection season. */
  season: string;
  /** Short collection statement. */
  statement: string;
  /** Garments presented as folio spreads. */
  looks: readonly FashionLook[];
  /** Construction notes. */
  construction: string;
}
export const defaults: FashionLookbookProps = {
  label: "STILL FORM / Atelier 04", title: "Between seasons", season: "Collection 08 · Autumn / Winter 2026",
  statement: "Clothes for the space between arrival and departure. Quiet volume, useful pockets, and cloth that remembers a gesture.",
  looks: [
    {name:"The travelling coat",description:"A full-length layer with a generous shoulder and a removable collar.",details:"Look 01 / Undyed wool twill / 620 g/m² / Hand-finished seams",silhouette:"coat"},
    {name:"An afternoon dress",description:"A single panel folds into a low waist. The side opening follows the fall of the fabric.",details:"Look 02 / Washed linen / 240 g/m² / French seams",silhouette:"dress"},
    {name:"Room to move",description:"Wide trousers shaped by two deep pleats, cut to sit on the natural waist.",details:"Look 03 / Cotton canvas / 310 g/m² / Bound pocket bags",silhouette:"trouser"},
  ],construction:"Every piece begins with a full-scale paper pattern. We test the balance in unbleached calico, adjust the ease on a moving body, then cut in cloth. The collection uses three fabrics and one consistent set of finishing methods.",
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

function fashionDrawing(parent: Element, kind: FashionLook["silhouette"], technical = false): void {
  const s=studioSvg(parent,"0 0 300 440");
  const shapes={coat:"M 118 65 L 75 85 L 35 209 L 69 225 L 96 151 L 82 391 L 218 391 L 204 151 L 231 225 L 265 209 L 225 85 L 182 65 L 166 86 H 134 Z",dress:"M 119 56 L 93 71 L 104 159 L 67 392 Q 150 418 233 392 L 196 159 L 207 71 L 181 56 L 170 91 H 130 Z",trouser:"M 90 65 H 210 L 226 391 H 166 L 150 192 L 134 391 H 74 Z"};
  studioMark(s,"path",{d:shapes[kind],fill:cssVar("fg"),"fill-opacity":technical?".03":".12","stroke-width":technical?"1":"2"});
  if(kind==="coat") {
    studioMark(s,"path",{d:"M 118 65 L 145 117 L 124 154 L 151 173 L 151 391 M 182 65 L 155 117 L 176 154 M 101 244 H 139 V 291 H 99 M 165 244 H 203 V 291 H 166"});
    for(let i=0;i<5;i++)studioMark(s,"circle",{cx:"158",cy:String(196+i*31),r:"2"});
  }else if(kind==="dress")studioMark(s,"path",{d:"M 104 159 Q 150 183 196 159 M 137 175 L 122 392 M 168 175 L 192 397 M 201 272 L 212 369"});
  else studioMark(s,"path",{d:"M 90 88 H 210 M 115 88 L 105 190 M 185 88 L 195 190 M 150 88 V 167 M 90 107 L 114 134 M 210 107 L 186 134"});
  if(technical) {
    studioMark(s,"path",{d:"M 20 64 V 392 M 14 64 H 26 M 14 392 H 26 M 72 426 H 228 M 72 420 V 432 M 228 420 V 432","stroke-dasharray":"3 4","stroke-opacity":".5"});
  } else {
    for(let i=0;i<22;i++) studioMark(s,"path",{d:`M ${106+i*4} 184 L ${90+i*5} 380`,"stroke-opacity":".15"});
  }
}
export const mount: Mount<FashionLookbookProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  const attributes = hostAttributes(host);
  attributes.set("data-pica-id", host.getAttribute("data-pica-id"));
  attributes.set("data-pica-ready", host.getAttribute("data-pica-ready"));
  attributes.set("role", "region");
  attributes.set("aria-label", props.title);
  attributes.set("aria-hidden", null);
  const sheet = scope(host);
  const page = studioNode("div", host, "", "page");
  const ids = [nextId("fashion-lookbook-a"), nextId("fashion-lookbook-b"), nextId("fashion-lookbook-c")];
  sheet.setRules(studioRules(sheet.selector) + `
 ${sheet.selector} [data-role="collection-head"]{position:relative;display:grid;grid-template-columns:2fr 1fr;gap:24px;padding:38px 0 64px}
 ${sheet.selector} [data-role="collection-head"] h1{grid-column:1/-1;font-family:var(--pica-font-serif,inherit);font-size:clamp(60px,9vw,124px);font-weight:400}
 ${sheet.selector} [data-role="collection-head"]>p:last-child{grid-column:2;max-width:36ch}
 ${sheet.selector} [data-role="folio"]>h2{font-family:${GRID_FONT};font-size:11px;text-transform:uppercase;border-top:1px solid ${cssVar("fg")};padding:18px 0}
 ${sheet.selector} [data-role="look"]{display:grid;grid-template-columns:.2fr 1.6fr 1fr;gap:32px;padding:36px 0 52px;border-bottom:1px solid ${cssVar("fg")}}
 ${sheet.selector} [data-role="look-number"]{font-family:var(--pica-font-serif,inherit);font-size:clamp(44px,7vw,88px);line-height:1;color:${cssVar("fg")};border-top:3px solid ${cssVar("accent")};padding-top:8px}
 ${sheet.selector} [data-role="silhouette"]{padding:20px 10%;background:color-mix(in srgb,${cssVar("fg")} 4%,transparent)}
 ${sheet.selector} [data-role="silhouette"] svg{max-height:580px} ${sheet.selector} [data-role="silhouette"] figcaption{margin-top:16px}
 ${sheet.selector} [data-role="look-notes"]{display:flex;flex-direction:column;gap:20px;padding-top:64px}
 ${sheet.selector} [data-role="technical"]{margin-top:24px;width:50%;align-self:flex-end} ${sheet.selector} [data-role="technical"] figcaption{font-size:9px;margin-top:12px}
 ${sheet.selector} [data-role="look"]:nth-of-type(2){grid-template-columns:.2fr 1fr 1.6fr}${sheet.selector} [data-role="look"]:nth-of-type(2) [data-role="silhouette"]{grid-column:3;grid-row:1}${sheet.selector} [data-role="look"]:nth-of-type(2) [data-role="look-notes"]{grid-column:2;grid-row:1}
 ${sheet.selector} [data-role="construction"]{display:grid;grid-template-columns:1fr 1fr;gap:20px 60px;padding-top:40px}${sheet.selector} [data-role="construction"] h2{grid-row:1/3}${sheet.selector} [data-role="construction"]>p:last-child{grid-column:2}
 @media(max-width:700px){${sheet.selector} [data-role="collection-head"]{display:block;padding-bottom:36px}${sheet.selector} [data-role="collection-head"]>*{margin-top:24px}${sheet.selector} [data-role="collection-head"] h1{font-size:60px}${sheet.selector} [data-role="look"],${sheet.selector} [data-role="look"]:nth-of-type(2){grid-template-columns:42px 1fr;gap:16px}${sheet.selector} [data-role="look"]:nth-of-type(2) [data-role="silhouette"]{grid-column:2}${sheet.selector} [data-role="look-notes"],${sheet.selector} [data-role="look"]:nth-of-type(2) [data-role="look-notes"]{grid-column:2;grid-row:2;padding-top:8px}${sheet.selector} [data-role="technical"]{width:40%;max-width:180px}${sheet.selector} [data-role="construction"]{display:block}${sheet.selector} [data-role="construction"]>*{margin-bottom:20px}}
`);
  function render(): void {
    page.replaceChildren();
    attributes.set("aria-label", props.title);

    const top=studioNode("header",page,"","top");studioNode("p",top,props.label,"label");const nav=studioNode("nav",top);studioLink(nav,"The collection",ids[0]!);studioLink(nav,"Construction",ids[1]!);
    const heading=studioNode("div",page,"","collection-head");studioNode("p",heading,props.season,"label");studioNode("h1",heading,props.title);studioNode("p",heading,props.statement);
    const collection=studioSection(page,"Collection folio",ids[0]!,"folio");
    for(const [i,look] of props.looks.entries()) {
      const article=studioNode("article",collection,"","look");studioNode("div",article,String(i+1).padStart(2,"0"),"look-number");const main=studioNode("figure",article,"","silhouette");fashionDrawing(main,look.silhouette);studioNode("figcaption",main,look.name);
      const notes=studioNode("div",article,"","look-notes");studioNode("p",notes,look.details,"label");studioNode("h3",notes,look.name);studioNode("p",notes,look.description);const small=studioNode("figure",notes,"","technical");fashionDrawing(small,look.silhouette,true);studioNode("figcaption",small,"FLAT PATTERN / FRONT ELEVATION");
    }
    const construction=studioSection(page,"A vocabulary of making",ids[1]!,"construction");studioNode("p",construction,"Pattern → Toile → Cloth","label");studioNode("p",construction,props.construction);
    const foot=studioNode("footer",page,"","foot");studioNode("p",foot,"Made in small runs / Patterns retained for repair");studioLink(foot,"Revisit the collection ↑",ids[0]!);

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
