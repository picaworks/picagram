import { hostAttributes, nextId } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import { GRID_FONT } from "../../../lib/font";
import type { Mount } from "../../../lib/types";
export interface AsciiWorkshopIndexProps {
  /** The workshop name. */
  label: string;
  /** The workshop headline. */
  title: string;
  /** The contact address. Empty offers a downloadable commission brief. */
  email: string;
  /** The working material inventory. */
  materials: readonly { name: string; use: string; stock: string }[];
}
export const defaults: AsciiWorkshopIndexProps = {
  "label": "Open Bench / Wood & useful objects",
  "title": "Made slowly. Used every day.",
  "email": "",
  "materials": [
    {
      "name": "Ash",
      "use": "Handles, stools and light frames",
      "stock": "Seasoned boards / 18 mm"
    },
    {
      "name": "Oak",
      "use": "Tops, rails and exposed joints",
      "stock": "Reclaimed stock / Variable widths"
    },
    {
      "name": "Birch ply",
      "use": "Templates and workshop storage",
      "stock": "Sheet offcuts / 12 mm"
    }
  ]
};

function workshopNode<T extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: T, text = "", cls = ""): HTMLElementTagNameMap[T] {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  el.className = cls;
  el.textContent = text;
  parent.append(el);
  return el;
}
function workshopLink(parent: HTMLElement, text: string, target: string): HTMLAnchorElement {
  const a = workshopNode(parent, "a", text);
  a.href = target;
  return a;
}
function workshopArt(parent: HTMLElement, wide: string, compact: string, caption: string): void {
  const figure = workshopNode(parent, "figure");
  workshopNode(figure, "pre", wide, "art wide-art").setAttribute("aria-hidden", "true");
  workshopNode(figure, "pre", compact, "art small-art").setAttribute("aria-hidden", "true");
  workshopNode(figure, "figcaption", caption, "label muted");
}
function workshopDisclosure(parent: HTMLElement, heading: string, body: string): void {
  const d = workshopNode(parent, "details");
  workshopNode(d, "summary", heading);
  workshopNode(d, "p", body);
}
function workshopRules(s: string): string {
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
${s} .bench{display:grid;grid-template-columns:1fr 1.2fr;gap:5rem;margin:3rem 0}${s} .bench figure{margin-bottom:1.5rem}${s} .bench figcaption{margin-top:1rem}${s} .toolnote{max-width:32ch;font-size:.9rem}${s} .inventory{border-top:1px solid ${fg};padding-top:2rem}${s} .inventory .row{grid-template-columns:4rem 1fr 14rem}${s} .columns a{display:inline-block;margin:1rem 0}@media(max-width:850px){${s} .bench{gap:2rem}${s} .inventory .row{grid-template-columns:3rem 1fr 10rem}}@media(max-width:600px){${s} .bench{display:flex;flex-direction:column-reverse;margin-top:2rem}${s} .inventory .row{grid-template-columns:2rem 1fr}}
`;
}
function workshopRender(root: HTMLElement, p: AsciiWorkshopIndexProps, id: string): void {
  root.replaceChildren();
const mast=workshopNode(root,"header","","mast label");const brand=workshopNode(mast,"span");workshopNode(brand,"span","","mark").setAttribute("aria-hidden","true");workshopNode(brand,"span",p.label);const nav=workshopNode(mast,"nav");workshopLink(nav,"Materials",`#${id}-materials`);workshopLink(nav,"Commission",`#${id}-commission`);const bench=workshopNode(root,"section","","bench");const tools=workshopNode(bench,"div");workshopArt(tools,"          _______\n  _______/_______\\_____\n |_____________________|\n       | |      | |\n       | |      | |\n       |_|      |_|\n\n   ____            /|\n  /____\\=====     / |\n                  |_|\n   smoothing plane / square","   _______________\n  |_______________|\n     | |     | |\n     |_|     |_|\n   ____       /|\n  /____\\==   |_|","Bench studies / Plane and try square");workshopNode(tools,"p","Tools sharpened. Surfaces kept clear. Enough room for the next pair of hands.","toolnote muted");const opening=workshopNode(bench,"div");const h=workshopNode(opening,"h1",p.title);h.id=`${id}-title`;workshopNode(opening,"p","A small workshop making stools, shelving and household tools. Each object begins with its intended use, a measured drawing and wood chosen for the job.","intro");workshopDisclosure(opening,"On the bench this month","A narrow hallway shelf in reclaimed oak. The current study tests three fixing positions and a shallow lip that keeps keys within reach without increasing the depth.");const materials=workshopNode(root,"section","","inventory");materials.id=`${id}-materials`;workshopNode(materials,"h2","Material inventory");p.materials.forEach((x,i)=>{const row=workshopNode(materials,"div","","row");workshopNode(row,"span",String(i+1).padStart(2,"0"),"label muted");const c=workshopNode(row,"div");workshopNode(c,"h3",x.name);workshopNode(c,"p",x.use);workshopNode(row,"span",x.stock,"label muted");});const columns=workshopNode(root,"div","","columns rule");const process=workshopNode(columns,"section");workshopNode(process,"h2","From question to object");const list=workshopNode(process,"ol");workshopNode(list,"li","Measure the place and the task. Record the load, reach and daily wear.");workshopNode(list,"li","Draw the joints at full size. Make a scrap model before choosing the final stock.");workshopNode(list,"li","Build, fit and finish. Leave the care instructions with the object.");const commission=workshopNode(columns,"section");commission.id=`${id}-commission`;workshopNode(commission,"h2","Commission a piece");workshopNode(commission,"p","Collect the dimensions of the place, what the object needs to hold and a photograph. Save the brief below before discussing a drawing schedule, material options and an estimate.");const contactLink=workshopLink(commission,p.email||"Save a commission brief",p.email?`mailto:${p.email}`:"data:text/plain;charset=utf-8,"+encodeURIComponent("Intended use:\nSite dimensions:\nRequired load:\nMaterial preference:\nContact details:\n"));if(!p.email)contactLink.download="commission-brief.txt";workshopDisclosure(commission,"Care after delivery","Wipe with a barely damp cloth and dry promptly. Renew the oil finish when the surface becomes dry to the touch. Keep solid wood away from direct heat and allow a small seasonal movement at the joints.");const foot=workshopNode(root,"footer","","foot label");workshopNode(foot,"span","Small batches / Repair welcomed");workshopLink(foot,"Back to top",`#${id}-title`);
}
export const mount: Mount<AsciiWorkshopIndexProps> = (host, initial = {}) => {
  let props: AsciiWorkshopIndexProps = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  const id = nextId("ascii-workshop-index");
  attrs.set("role", "region");
  attrs.set("aria-label", props.label);
  const style = workshopNode(host, "style");
  const root = workshopNode(host, "article");
  root.id = id;
  style.textContent = workshopRules(`[id="${id}"]`);

  const draw = (): void => workshopRender(root, props, id);
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
