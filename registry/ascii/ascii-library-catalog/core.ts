import { hostAttributes, nextId } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import { GRID_FONT } from "../../../lib/font";
import type { Mount } from "../../../lib/types";
import { emitter } from "../../../lib/events";
export interface AsciiLibraryCatalogProps {
  /** The collection name. */
  label: string;
  /** The reading collection headline. */
  title: string;
  /** The catalogue records and their reading route annotations. */
  books: readonly { title: string; author: string; code: string; note: string; route: string }[];
}
export interface AsciiLibraryCatalogEvents {
  /** The selected record index after a visitor chooses a record. */
  selectionChange: number;
}
export const defaults: AsciiLibraryCatalogProps = {
  "label": "Shelf 04 / A small reading collection",
  "title": "Read a place through its objects",
  "books": [
    {
      "title": "The Street Notebook",
      "author": "Collection essay / 2024",
      "code": "S04.01",
      "note": "A set of original observations about signs, crossings and public benches. Begin with the annotated walk and record one mark you would otherwise overlook.",
      "route": "First: look closely at a familiar route."
    },
    {
      "title": "A Manual of Keeping",
      "author": "Workshop notes / 2025",
      "code": "S04.02",
      "note": "A practical collection of repair records for wood, cloth and paper. Each note separates diagnosis from treatment and describes how to check whether the repair has held.",
      "route": "Next: choose one object and describe how it is maintained."
    },
    {
      "title": "The Shared Table",
      "author": "Reading group papers / 2026",
      "code": "S04.03",
      "note": "Short essays about the agreements that let people work beside one another. The final pages contain prompts for a reading group to adapt to its own room.",
      "route": "Then: discuss what makes that care a shared responsibility."
    }
  ]
};

function libraryNode<T extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: T, text = "", cls = ""): HTMLElementTagNameMap[T] {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  el.className = cls;
  el.textContent = text;
  parent.append(el);
  return el;
}
function libraryLink(parent: HTMLElement, text: string, target: string): HTMLAnchorElement {
  const a = libraryNode(parent, "a", text);
  a.href = target;
  return a;
}
function libraryArt(parent: HTMLElement, wide: string, compact: string, caption: string): void {
  const figure = libraryNode(parent, "figure");
  libraryNode(figure, "pre", wide, "art wide-art").setAttribute("aria-hidden", "true");
  libraryNode(figure, "pre", compact, "art small-art").setAttribute("aria-hidden", "true");
  libraryNode(figure, "figcaption", caption, "label muted");
}
function libraryDisclosure(parent: HTMLElement, heading: string, body: string): void {
  const d = libraryNode(parent, "details");
  libraryNode(d, "summary", heading);
  libraryNode(d, "p", body);
}
function libraryRules(s: string): string {
  const fg = cssVar("fg"), bg = cssVar("bg"), muted = cssVar("muted"), accent = cssVar("accent");
  return `
${s}{box-sizing:border-box;max-width:1400px;margin:auto;padding:clamp(20px,4vw,52px);color:${fg};background:${bg};line-height:1.6;overflow-wrap:anywhere}
${s} *{box-sizing:border-box;min-width:0}
${s} h1,${s} h2,${s} h3,${s} p,${s} pre,${s} figure{margin:0}
${s} h1{font-size:clamp(2.5rem,5.4vw,5rem);font-weight:500;line-height:1.04;letter-spacing:-.045em;max-width:15ch}
${s} h2{font-weight:500;font-size:1.6rem;line-height:1.25;margin-bottom:1rem}
${s} h3{font-size:1.15rem;font-weight:600;line-height:1.35}
${s} p+p{margin-top:1rem}
${s} .label{font-family:${GRID_FONT};font-size:.72rem;letter-spacing:.05em;text-transform:uppercase}
${s} .muted{color:${muted}}
${s} .mast{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;border-bottom:1px solid ${fg};padding-bottom:1rem}
${s} .mark{display:inline-block;width:10px;height:10px;background:${accent};margin-right:10px}
${s} a{color:inherit;text-underline-offset:.3em}
${s} nav{display:flex;gap:1.4rem;flex-wrap:wrap}
${s} a:focus-visible,${s} summary:focus-visible,${s} button:focus-visible{outline:2px solid ${accent};outline-offset:4px}
${s} button{font:inherit;font-family:${GRID_FONT};font-size:.8rem;padding:.8rem 1rem;color:inherit;background:transparent;border:1px solid ${muted};cursor:pointer;text-align:left}
${s} button[aria-pressed=true]{border-color:${fg};border-left:5px solid ${accent};padding-left:calc(1rem - 4px)}
${s} .art{font-family:${GRID_FONT};font-size:clamp(11px,1.2vw,15px);line-height:1.35;white-space:pre;overflow-wrap:normal}
${s} .small-art{display:none}
${s} .intro{font-size:1.2rem;max-width:46ch;margin:1.5rem 0 2rem}
${s} .rule{border-top:1px solid ${muted};padding-top:1.5rem;margin-top:2rem}
${s} details{border-top:1px solid ${muted};padding:1rem 0}
${s} summary{cursor:pointer;font-family:${GRID_FONT};font-size:.8rem}
${s} details p{padding-top:1rem;max-width:62ch}
${s} .foot{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-top:3rem;border-top:1px solid ${fg};padding-top:1rem}
${s} .row{border-top:1px solid ${muted};padding:1.3rem 0;display:grid;grid-template-columns:4rem 1fr 7rem;gap:1.2rem}
${s} .row p{max-width:58ch;margin-top:.5rem}
${s} .columns{display:grid;grid-template-columns:1.4fr 1fr;gap:3rem;margin-top:2rem}
${s} .choices{display:flex;flex-wrap:wrap;gap:.7rem;margin:1.5rem 0}
${s} .facts{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin:2rem 0;padding:1rem 0;border-block:1px solid ${muted}}
${s} .facts strong{display:block;font-family:${GRID_FONT};font-size:1.4rem;font-weight:400}
${s} ul,${s} ol{padding-left:1.4rem;margin:1rem 0}
${s} li+li{margin-top:.7rem}
@media(max-width:600px){${s}{padding:20px}${s} h1{font-size:2.7rem}${s} .columns{grid-template-columns:1fr;gap:2rem}${s} .art{font-size:11px}${s} .wide-art{display:none}${s} .small-art{display:block}${s} .row{grid-template-columns:2rem 1fr;gap:.6rem}${s} .row>.label:last-child{grid-column:2}${s} nav{gap:.7rem}${s} .facts{gap:.7rem}${s} .intro{font-size:1.1rem}}
${s} .cataloghead{display:grid;grid-template-columns:1.5fr 1fr;gap:4rem;align-items:center;margin-top:3rem}${s} .cataloghead h1{margin-top:1rem}${s} .cataloghead figure figcaption{margin-top:1rem;max-width:30ch}${s} .bookrows{display:flex;flex-direction:column}${s} .bookrows button{display:grid;grid-template-columns:6rem 1fr 14rem;gap:2rem;border:0;border-top:1px solid ${muted};padding:1.5rem 1rem}${s} .bookrows button[aria-pressed=true]{border-left:5px solid ${accent}}${s} .booktitle{font-size:1.2rem}${s} .readingnote{min-height:310px}${s} .readingnote h2{margin-top:.7rem}${s} .readingnote details{margin-top:1.5rem}${s} .columns ol{margin-top:0}${s} .columns li{padding:.4rem 0}@media(max-width:850px){${s} .cataloghead{gap:2rem}${s} .bookrows button{grid-template-columns:5rem 1fr 10rem;gap:1rem}}@media(max-width:600px){${s} .cataloghead{grid-template-columns:1fr;margin-top:2rem}${s} .bookrows button{grid-template-columns:4.5rem 1fr;gap:.6rem}${s} .bookrows button span:last-child{grid-column:2}${s} .readingnote{min-height:0}}
`;
}
function libraryRender(root: HTMLElement, p: AsciiLibraryCatalogProps, id: string, choose: (index: number) => void, selected: number): void {
  root.replaceChildren();
const mast=libraryNode(root,"header","","mast label");const brand=libraryNode(mast,"span");libraryNode(brand,"span","","mark").setAttribute("aria-hidden","true");libraryNode(brand,"span",p.label);const header=libraryNode(root,"div","","cataloghead");const opening=libraryNode(header,"div");libraryNode(opening,"p","Three titles / One reading route","label muted");const h=libraryNode(opening,"h1",p.title);h.id=`${id}-title`;libraryNode(opening,"p","A collection of authored sample texts about everyday places, repair and shared use. Browse the register, then follow the route below.","intro");libraryArt(header,"    __________________________\n   | |||||  ||||   ||||||     |\n   | |||||  ||||   ||||||     |\n   |==========================|\n   |  / /  ||||||  |||  ||||  |\n   | / /   ||||||  |||  ||||  |\n   |__________________________|\n     |                      |"," _____________________\n| |||| |||||  ||||    |\n|=====================|\n| / / |||  ||||||     |\n|_____________________|","Shelf 04 / Essays, manuals and reading papers");const catalog=libraryNode(root,"section","","catalog rule");libraryNode(catalog,"h2","Collection register");const choices=libraryNode(catalog,"div","","bookrows");p.books.forEach((x,i)=>{const b=libraryNode(choices,"button");b.type="button";b.setAttribute("aria-pressed",String(i===selected));b.onclick=()=>choose(i);libraryNode(b,"span",x.code,"label muted");libraryNode(b,"span",x.title,"booktitle");libraryNode(b,"span",x.author,"label muted");});const columns=libraryNode(root,"div","","columns");const detail=libraryNode(columns,"section","","readingnote rule");detail.setAttribute("aria-live","polite");const x=p.books[selected]??p.books[0];if(x){libraryNode(detail,"p",`${x.code} / Selected record`,"label muted");libraryNode(detail,"h2",x.title);libraryNode(detail,"p",x.note);libraryDisclosure(detail,"Using this catalogue","These are authored demonstration records. Replace the JSON books prop with your own collection. Keep call numbers stable so readers can return to the same text as the collection grows.");}const route=libraryNode(columns,"section","","rule");libraryNode(route,"h2","A route through the shelf");const list=libraryNode(route,"ol");p.books.forEach(x=>{const li=libraryNode(list,"li");libraryNode(li,"h3",x.title);libraryNode(li,"p",x.route);});libraryNode(route,"p","Read alone or take one title to a shared table. The route is a suggestion; the shelf accepts another order.","muted");const foot=libraryNode(root,"footer","","foot label");libraryNode(foot,"span","Collection register / Revised October 2026");libraryLink(foot,"Back to top",`#${id}-title`);
}
export const mount: Mount<AsciiLibraryCatalogProps> = (host, initial = {}) => {
  let props: AsciiLibraryCatalogProps = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  const id = nextId("ascii-library-catalog");
  attrs.set("role", "region");
  attrs.set("aria-label", props.label);
  const style = libraryNode(host, "style");
  const root = libraryNode(host, "article");
  root.id = id;
  style.textContent = libraryRules(`[id="${id}"]`);
  let selected = 0;
  const emit = emitter<AsciiLibraryCatalogEvents>(host);
  const choose = (index: number): void => {
    selected = index;
    draw();
    root.querySelectorAll<HTMLButtonElement>("button")[index]?.focus();
    emit("selectionChange", index);
  };
  const draw = (): void => libraryRender(root, props, id, choose, selected);
  draw();
  attrs.set("data-pica-ready", "true");
  return {
    update(next) {
      const merged = { ...props, ...next };
      if (sameJson(merged, props)) return;
      props = merged;
      attrs.set("aria-label", props.label);
      draw();
    },
    destroy() {
      root.remove();
      style.remove();
      attrs.restore();
    },
  };
};
