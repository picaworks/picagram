import { hostAttributes, nextId, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import { GRID_FONT } from "../../../lib/font";
import type { Mount } from "../../../lib/types";
export interface RecipeIngredient {
 /** Ingredient weight or quantity. */
 quantity: string;
 /** Ingredient name. */
 name: string;
 /** Preparation instruction. */
 preparation: string;
}
export interface RecipeMethod {
 /** Step title. */
 title: string;
 /** Step instruction. */
 instruction: string;
 /** Step timing. */
 time: string;
}
export interface CulinaryNotebookProps {
 /** Notebook author. */
 author: string;
 /** Recipe title. */
 title: string;
 /** Recipe number and season. */
 edition: string;
 /** Recipe introduction. */
 introduction: string;
 /** Yield and timing summary. */
 yield: string;
 /** Ingredient ledger. */
 ingredients: readonly RecipeIngredient[];
 /** Cooking method. */
 method: readonly RecipeMethod[];
 /** Serving and substitution note. */
 note: string;
}
export const defaults: CulinaryNotebookProps = {
 author:"The small table / Kitchen notebook",title:"Roasted squash, white beans & sage",edition:"Recipe 014 · Early autumn",yield:"Serves 4 / 20 min preparation / 40 min cooking",
 introduction:"A tray of squash becomes a meal with warm beans and a sharp cider dressing. Keep the roasting juices: they are the beginning of the sauce.",
 ingredients:[
 {quantity:"900 g",name:"Winter squash",preparation:"Seeds removed, cut into 3 cm wedges"},
 {quantity:"500 g",name:"Cooked white beans",preparation:"Drained, cooking liquid reserved"},
 {quantity:"3 tbsp",name:"Olive oil",preparation:"Divided between tray and dressing"},
 {quantity:"12",name:"Sage leaves",preparation:"Whole, stems removed"},
 {quantity:"2 tbsp",name:"Cider vinegar",preparation:"Plus more to taste"},
 {quantity:"1 tsp",name:"Wholegrain mustard",preparation:"For the dressing"},
 {quantity:"40 g",name:"Toasted hazelnuts",preparation:"Roughly crushed"},
 ],
 method:[
 {title:"Give the squash some room",time:"35—40 min",instruction:"Heat the oven to 210°C. Toss the wedges with two tablespoons of oil and a generous pinch of salt. Spread in one layer, cut sides down. Roast until the edges brown and a knife meets no resistance."},
 {title:"Warm, without boiling",time:"8 min",instruction:"Put the beans in a shallow pan with four tablespoons of their cooking liquid. Add the sage and warm gently. Stir once or twice, keeping the beans whole. Add a spoon of water if the pan begins to dry."},
 {title:"Make the tray dressing",time:"3 min",instruction:"Lift the squash onto a warm plate. Pour the vinegar onto the roasting tray and scrape up the browned juices. Whisk in the mustard and remaining oil. Taste before adding salt."},
 {title:"Bring everything to the table",time:"2 min",instruction:"Spoon the beans around the squash and dress while warm. Scatter over the hazelnuts. Serve in the middle of the table with bread to collect the last of the sauce."},
 ],
 note:"Butter beans work equally well. For a nut-free version, use toasted pumpkin seeds. Leftovers keep for two days in a covered container in the refrigerator; warm gently with a splash of water before serving.",
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


function culinaryStillLife(parent: Element): void {
 const s=studioSvg(parent,"0 0 500 340");
 studioMark(s,"ellipse",{cx:"248",cy:"260",rx:"203",ry:"52","stroke-opacity":".4"});studioMark(s,"ellipse",{cx:"248",cy:"256",rx:"168",ry:"35","stroke-opacity":".3"});
 studioMark(s,"path",{d:"M 114 193 C 74 129 105 75 167 71 C 224 67 240 132 210 191 C 190 225 140 231 114 193 Z","stroke-width":"2"});
 for(let i=0;i<7;i++)studioMark(s,"path",{d:`M ${147+i*5} 80 C ${105+i*15} 119 ${111+i*12} 179 ${153+i*5} 213`,"stroke-opacity":".4"});
 studioMark(s,"path",{d:"M 155 72 L 148 47 L 161 40 L 172 68 M 230 226 L 291 124 Q 344 164 353 238 Q 285 254 230 226 Z","stroke-width":"2"});
 studioMark(s,"path",{d:"M 246 222 L 293 145 Q 328 178 338 225 Z","stroke-opacity":".5"});
 for(let i=0;i<12;i++){const x=282+(i%4)*11,y=168+Math.floor(i/4)*16;studioMark(s,"ellipse",{cx:String(x),cy:String(y),rx:"3",ry:"5","stroke-opacity":".6"});}
 for(let i=0;i<15;i++){const x=120+(i*39)%251,y=241+(i*17)%34;studioMark(s,"path",{d:`M ${x} ${y} C ${x-8} ${y-8} ${x+5} ${y-14} ${x+12} ${y-8} C ${x+22} ${y+1} ${x+9} ${y+10} ${x} ${y} Z`,"stroke-opacity":".65"});}
 studioMark(s,"path",{d:"M 350 226 Q 389 165 415 130 M 383 180 Q 351 155 368 136 Q 393 133 390 167 M 397 153 Q 422 139 436 151 Q 433 172 405 170 M 366 207 Q 338 191 344 178 Q 366 170 378 188",stroke:cssVar("accent"),"stroke-width":"2"});
}
export const mount: Mount<CulinaryNotebookProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  const attributes = hostAttributes(host);
  attributes.set("data-pica-id", host.getAttribute("data-pica-id"));
  attributes.set("data-pica-ready", host.getAttribute("data-pica-ready"));
  attributes.set("role", "region");
  attributes.set("aria-label", props.title);
  attributes.set("aria-hidden", null);
  const sheet = scope(host);
  const page = studioNode("div", host, "", "page");
  const ids = [nextId("culinary-notebook-a"), nextId("culinary-notebook-b"), nextId("culinary-notebook-c")];
  sheet.setRules(studioRules(sheet.selector) + `
 ${sheet.selector} [data-role="recipe-opening"]{display:grid;grid-template-columns:1fr 1fr;gap:50px;padding:38px 0 30px;align-items:center}${sheet.selector} [data-role="recipe-title"]{display:flex;flex-direction:column;gap:26px}${sheet.selector} [data-role="recipe-title"] h1{font-family:var(--pica-font-serif,inherit);font-size:clamp(46px,5.5vw,76px);font-weight:400;line-height:1.03;letter-spacing:-.045em}${sheet.selector} [data-role="still-life"]{padding:24px 0;background:color-mix(in srgb,${cssVar("fg")} 3%,transparent)}${sheet.selector} [data-role="still-life"] figcaption{padding:12px 28px;font-size:10px}
 ${sheet.selector} [data-role="recipe-yield"]{max-width:none;padding:18px 0;border-top:1px solid ${cssVar("fg")};border-bottom:1px solid ${cssVar("fg")};font-family:${GRID_FONT};font-size:12px}
 ${sheet.selector} [data-role="recipe-spread"]{display:grid;grid-template-columns:1fr 1.8fr;gap:64px;margin-top:32px}${sheet.selector} [data-role="ingredients"]>p{margin-top:16px;font-size:10px}${sheet.selector} dl{display:grid;grid-template-columns:72px 1fr;margin:24px 0 0;gap:0 12px}${sheet.selector} dt,${sheet.selector} dd{margin:0;padding:17px 0;border-top:1px solid ${cssVar("muted")}}${sheet.selector} dt{font-family:${GRID_FONT};font-size:12px}${sheet.selector} dd p{font-size:15px}${sheet.selector} dd p:last-child{font-size:11px;margin-top:5px}
 ${sheet.selector} [data-role="method"]{border-left:1px solid ${cssVar("fg")};padding-left:36px}${sheet.selector} ol{list-style:none;margin:24px 0 0;padding:0}${sheet.selector} li{padding:0 0 26px;margin-bottom:26px;border-bottom:1px solid ${cssVar("muted")}}${sheet.selector} [data-role="step-head"]{display:grid;grid-template-columns:34px 1fr;gap:12px}${sheet.selector} [data-role="step-number"]{font-family:${GRID_FONT};color:${cssVar("fg")};border-top:2px solid ${cssVar("accent")};padding-top:3px;font-size:18px}${sheet.selector} li>p{margin:14px 0 0 46px;font-size:14px}${sheet.selector} li>p[data-role="label"]{font-size:10px}
 ${sheet.selector} [data-role="kitchen-notes"]{display:grid;grid-template-columns:1fr 1.8fr;gap:64px;margin-top:20px;padding-top:28px;border-top:2px solid ${cssVar("fg")}}${sheet.selector} [data-role="kitchen-notes"] h2{font-family:var(--pica-font-serif,inherit)}
 @media(max-width:700px){${sheet.selector} [data-role="recipe-opening"]{grid-template-columns:1fr;gap:24px}${sheet.selector} [data-role="recipe-title"] h1{font-size:52px}${sheet.selector} [data-role="recipe-spread"]{grid-template-columns:1fr;gap:32px}${sheet.selector} [data-role="method"]{border-left:0;padding-left:0;border-top:1px solid ${cssVar("fg")};padding-top:28px}${sheet.selector} [data-role="kitchen-notes"]{display:block}${sheet.selector} [data-role="kitchen-notes"] h2{margin-bottom:20px}}
`);
  function render(): void {
    page.replaceChildren();
    attributes.set("aria-label", props.title);

 const top=studioNode("header",page,"","top");studioNode("p",top,props.author,"label");const nav=studioNode("nav",top);studioLink(nav,"Ingredients",ids[0]!);studioLink(nav,"Method",ids[1]!);studioLink(nav,"Kitchen notes",ids[2]!);
 const opening=studioNode("div",page,"","recipe-opening");const title=studioNode("div",opening,"","recipe-title");studioNode("p",title,props.edition,"label");studioNode("h1",title,props.title);studioNode("p",title,props.introduction);const illustration=studioNode("figure",opening,"","still-life");culinaryStillLife(illustration);studioNode("figcaption",illustration,"SQUASH / BEANS / SAGE · A study from the kitchen table");
 studioNode("p",page,props.yield,"recipe-yield");
 const spread=studioNode("div",page,"","recipe-spread");const ingredients=studioSection(spread,"For the table",ids[0]!,"ingredients");studioNode("p",ingredients,"Weigh first. Cook with attention.","label");
 const list=studioNode("dl",ingredients);for(const ingredient of props.ingredients){studioNode("dt",list,ingredient.quantity);const dd=studioNode("dd",list);studioNode("p",dd,ingredient.name);studioNode("p",dd,ingredient.preparation,"muted");}
 const method=studioSection(spread,"The method",ids[1]!,"method");const steps=studioNode("ol",method);for(const [i,step] of props.method.entries()){const li=studioNode("li",steps);const heading=studioNode("div",li,"","step-head");studioNode("span",heading,String(i+1).padStart(2,"0"),"step-number");studioNode("h3",heading,step.title);studioNode("p",li,step.time,"label");studioNode("p",li,step.instruction);}
 const notes=studioSection(page,"From the margin",ids[2]!,"kitchen-notes");studioNode("p",notes,props.note);
 const foot=studioNode("footer",page,"","foot");studioNode("p",foot,"One tray / One pan / A shared table");studioLink(foot,"Check the ingredients ↑",ids[0]!);

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
