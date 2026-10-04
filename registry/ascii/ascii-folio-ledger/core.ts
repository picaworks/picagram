import { hostAttributes, nextId } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import { GRID_FONT } from "../../../lib/font";
import type { Mount } from "../../../lib/types";
export interface AsciiFolioLedgerProps {
  /** The portfolio owner and region label. */
  label: string;
  /** The portfolio headline. */
  title: string;
  /** The opening statement. */
  introduction: string;
  /** The contact address. Empty offers a downloadable commission brief. */
  email: string;
  /** The project register with case notes. */
  projects: readonly { title: string; year: string; discipline: string; note: string; outcome: string }[];
}
export const defaults: AsciiFolioLedgerProps = {
  "label": "Mara Sen / Independent design",
  "title": "Useful things, carefully drawn.",
  "introduction": "I design printed matter and public information systems. This ledger records the decisions behind the work, from a single sign to a whole reading room.",
  "email": "",
  "projects": [
    {
      "title": "A river, indexed",
      "year": "2025",
      "discipline": "Field atlas",
      "note": "A pocket atlas connects twelve river access points with walking distances and tide notes.",
      "outcome": "The binding opens flat. Each spread pairs a route with one observation prompt, so the map remains useful with wet hands."
    },
    {
      "title": "A place to return",
      "year": "2024",
      "discipline": "Library identity",
      "note": "A shared typographic system for borrowing slips, shelf labels and weekly programs.",
      "outcome": "Shelf codes were tested at two viewing distances. Large figures repeat on the borrowing slip so a reader can retrace the route."
    },
    {
      "title": "The repair register",
      "year": "2024",
      "discipline": "Public information",
      "note": "A workshop record makes repair decisions visible before a tool is picked up.",
      "outcome": "The record separates damage, treatment and future care. Owners leave with a dated instruction sheet rather than an unexplained receipt."
    }
  ]
};

function folioNode<T extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: T, text = "", cls = ""): HTMLElementTagNameMap[T] {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  el.className = cls;
  el.textContent = text;
  parent.append(el);
  return el;
}
function folioLink(parent: HTMLElement, text: string, target: string): HTMLAnchorElement {
  const a = folioNode(parent, "a", text);
  a.href = target;
  return a;
}
function folioArt(parent: HTMLElement, wide: string, compact: string, caption: string): void {
  const figure = folioNode(parent, "figure");
  folioNode(figure, "pre", wide, "art wide-art").setAttribute("aria-hidden", "true");
  folioNode(figure, "pre", compact, "art small-art").setAttribute("aria-hidden", "true");
  folioNode(figure, "figcaption", caption, "label muted");
}
function folioDisclosure(parent: HTMLElement, heading: string, body: string): void {
  const d = folioNode(parent, "details");
  folioNode(d, "summary", heading);
  folioNode(d, "p", body);
}
function folioRules(s: string): string {
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
${s} .ledger{display:grid;grid-template-columns:180px 1fr;gap:5rem;margin-top:3rem}${s} .rail{border-right:1px solid ${muted};padding-right:2rem}${s} .railnote{font-size:.9rem;margin:2rem 0}${s} .rail nav{flex-direction:column}${s} .project{display:grid;grid-template-columns:3rem 1fr;gap:1rem;border-top:1px solid ${fg};padding:1.5rem 0}${s} .project p{max-width:60ch;margin-top:.7rem}${s} .project details{margin-top:1rem}@media(max-width:800px){${s} .ledger{gap:2rem;grid-template-columns:140px 1fr}}@media(max-width:600px){${s} .ledger{grid-template-columns:1fr;margin-top:1.5rem}${s} .rail{border-right:0;border-bottom:1px solid ${muted};padding:0 0 1rem;display:flex;flex-wrap:wrap;gap:1rem}${s} .railnote{margin:0;max-width:22ch}${s} .rail nav{flex-direction:row}${s} .project{grid-template-columns:2rem 1fr}}
`;
}
function folioRender(root: HTMLElement, p: AsciiFolioLedgerProps, id: string): void {
  root.replaceChildren();
const mast=folioNode(root,"header","","mast label");const brand=folioNode(mast,"span");folioNode(brand,"span","","mark").setAttribute("aria-hidden","true");folioNode(brand,"span",p.label);const layout=folioNode(root,"div","","ledger");const rail=folioNode(layout,"aside","","rail");folioArt(rail,"┌─────────────┐\n│  ███   ██   │\n│ █   █ █ █   │\n│ █   █   █   │\n│ █   █   █   │\n│  ███  █████ │\n└─────────────┘","┌─────────┐\n│ 01 / MS │\n└─────────┘","Index 01 / Selected practice");folioNode(rail,"p","Available for small, sustained collaborations.","railnote");const nav=folioNode(rail,"nav","","label");folioLink(nav,"Project register",`#${id}-register`);folioLink(nav,"Contact",`#${id}-contact`);const body=folioNode(layout,"div");const h=folioNode(body,"h1",p.title);h.id=`${id}-title`;folioNode(body,"p",p.introduction,"intro");const register=folioNode(body,"section");register.id=`${id}-register`;folioNode(register,"h2","Selected project register");p.projects.forEach((x,i)=>{const row=folioNode(register,"div","","project");folioNode(row,"span",String(i+1).padStart(2,"0"),"label muted");const c=folioNode(row,"div");folioNode(c,"h3",x.title);folioNode(c,"p",`${x.discipline} / ${x.year}`,"label muted");folioNode(c,"p",x.note);folioDisclosure(c,"Read the case note",x.outcome);});const contact=folioNode(body,"section","","rule");contact.id=`${id}-contact`;folioNode(contact,"h2","Start with the question");folioNode(contact,"p","Prepare the audience, intended use and required date before the first conversation. Save the brief below to collect these details in one place.");const contactLink=folioLink(contact,p.email||"Save a commission brief",p.email?`mailto:${p.email}`:"data:text/plain;charset=utf-8,"+encodeURIComponent("Project question:\nAudience:\nIntended use:\nRequired date:\nContact details:\n"));if(!p.email)contactLink.download="commission-brief.txt";const foot=folioNode(root,"footer","","foot label");folioNode(foot,"span","Selected work / Register 01");folioLink(foot,"Back to top",`#${id}-title`);
}
export const mount: Mount<AsciiFolioLedgerProps> = (host, initial = {}) => {
  let props: AsciiFolioLedgerProps = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  const id = nextId("ascii-folio-ledger");
  attrs.set("role", "region");
  attrs.set("aria-label", props.label);
  const style = folioNode(host, "style");
  const root = folioNode(host, "article");
  root.id = id;
  style.textContent = folioRules(`[id="${id}"]`);

  const draw = (): void => folioRender(root, props, id);
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
