import { hostAttributes, nextId } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import { GRID_FONT } from "../../../lib/font";
import type { Mount } from "../../../lib/types";
import { emitter } from "../../../lib/events";
export interface AsciiExhibitionMapProps {
  /** The exhibition name. */
  label: string;
  /** The exhibition headline. */
  title: string;
  /** Numbered rooms and their program details. */
  rooms: readonly { name: string; subject: string; note: string; access: string }[];
}
export interface AsciiExhibitionMapEvents {
  /** The selected record index after a visitor chooses a record. */
  selectionChange: number;
}
export const defaults: AsciiExhibitionMapProps = {
  "label": "The Holding Room / Exhibition guide",
  "title": "Objects that remember work",
  "rooms": [
    {
      "name": "01 / Measure",
      "subject": "Tools for agreeing on a length",
      "note": "A folded ruler, a marked string and a workshop gauge show three ways of making a measurement repeatable. Read the wear marks beside the numbered divisions.",
      "access": "Level access / Seating by the east wall"
    },
    {
      "name": "02 / Mend",
      "subject": "Repair as a visible record",
      "note": "Patched cloth and a joined ceramic bowl preserve the decision to keep an object in use. A handling sample lets visitors feel the seam without touching the exhibited pieces.",
      "access": "Level access / Handling sample at seated height"
    },
    {
      "name": "03 / Carry",
      "subject": "The shape of a daily journey",
      "note": "A market basket, a tool roll and a parcel wrapper are arranged around the routes they served. Each label traces a repeated trip from the maker to the place of use.",
      "access": "Level access / Large print labels at the entry"
    }
  ]
};

function exhibitionNode<T extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: T, text = "", cls = ""): HTMLElementTagNameMap[T] {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  el.className = cls;
  el.textContent = text;
  parent.append(el);
  return el;
}
function exhibitionLink(parent: HTMLElement, text: string, target: string): HTMLAnchorElement {
  const a = exhibitionNode(parent, "a", text);
  a.href = target;
  return a;
}
function exhibitionArt(parent: HTMLElement, wide: string, compact: string, caption: string): void {
  const figure = exhibitionNode(parent, "figure");
  exhibitionNode(figure, "pre", wide, "art wide-art").setAttribute("aria-hidden", "true");
  exhibitionNode(figure, "pre", compact, "art small-art").setAttribute("aria-hidden", "true");
  exhibitionNode(figure, "figcaption", caption, "label muted");
}
function exhibitionDisclosure(parent: HTMLElement, heading: string, body: string): void {
  const d = exhibitionNode(parent, "details");
  exhibitionNode(d, "summary", heading);
  exhibitionNode(d, "p", body);
}
function exhibitionRules(s: string): string {
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
${s} .exhibitionhead{margin:2rem 0}${s} .exhibitionhead h1{max-width:19ch;margin-top:1rem}${s} .mapgrid{display:grid;grid-template-columns:1fr 1.1fr;gap:4rem;border-top:1px solid ${fg};padding-top:2rem}${s} .mapgrid figure{margin-bottom:2rem}${s} .mapgrid figcaption{margin-top:1rem;max-width:38ch}${s} .mapgrid .choices{flex-direction:column}${s} .mapgrid .choices button{width:100%}${s} .access{margin-top:1.5rem;padding-left:1rem;border-left:3px solid ${accent}}${s} .programline{white-space:pre-line}${s} .roomdetail{min-height:260px}@media(max-width:800px){${s} .mapgrid{gap:2rem}}@media(max-width:600px){${s} .mapgrid{grid-template-columns:1fr}${s} .roomdetail{min-height:0}}
`;
}
function exhibitionRender(root: HTMLElement, p: AsciiExhibitionMapProps, id: string, choose: (index: number) => void, selected: number): void {
  root.replaceChildren();
const mast=exhibitionNode(root,"header","","mast label");const brand=exhibitionNode(mast,"span");exhibitionNode(brand,"span","","mark").setAttribute("aria-hidden","true");exhibitionNode(brand,"span",p.label);const intro=exhibitionNode(root,"header","","exhibitionhead");exhibitionNode(intro,"p","Open Thursday to Sunday / 10:00–17:00","label muted");const h=exhibitionNode(intro,"h1",p.title);h.id=`${id}-title`;exhibitionNode(intro,"p","An exhibition about measuring, repairing and carrying. Follow the numbered route or choose a room below.","intro");const grid=exhibitionNode(root,"div","","mapgrid");const map=exhibitionNode(grid,"section");exhibitionArt(map,"+-------------+-------------+\n| 01 MEASURE  | 02 MEND     |\n|  [] []      |  ~~~  ()    |\n|             :             |\n+------:------+------:------+\n| ENTRY       | 03 CARRY    |\n|  >  DESK    :  /_\\  [ ]   |\n+-------------+-------------+","+----------+----------+\n|01 MEASURE:02 MEND   |\n+----:-----+----:-----+\n|ENTRY  >  :03 CARRY  |\n+----------+----------+","Floor plan / Colons mark openings / All rooms on one level");exhibitionNode(map,"h2","Visit in your own order");exhibitionNode(map,"p","The entrance desk supplies a printed guide and a large print room list. Bags may remain with you. Quiet seats are available in each room.");const program=exhibitionNode(map,"section","","rule");exhibitionNode(program,"h2","Public program");exhibitionNode(program,"p","11:30 / Reading an object\nA twenty minute guided conversation at the entrance desk.","programline");exhibitionNode(program,"p","14:00 / The visible mend\nA repair demonstration in room 02. Drop in; no booking needed.","programline");const rooms=exhibitionNode(grid,"section");exhibitionNode(rooms,"h2","Room index");const choices=exhibitionNode(rooms,"div","","choices");p.rooms.forEach((x,i)=>{const b=exhibitionNode(choices,"button",x.name);b.type="button";b.setAttribute("aria-pressed",String(i===selected));b.onclick=()=>choose(i);});const detail=exhibitionNode(rooms,"section","","roomdetail rule");detail.setAttribute("aria-live","polite");const x=p.rooms[selected]??p.rooms[0];if(x){exhibitionNode(detail,"p",x.name,"label muted");exhibitionNode(detail,"h2",x.subject);exhibitionNode(detail,"p",x.note);exhibitionNode(detail,"p",x.access,"access label");}const route=exhibitionNode(rooms,"section","","rule");exhibitionNode(route,"h2","A linear route");const list=exhibitionNode(route,"ol");p.rooms.forEach(x=>exhibitionNode(list,"li",`${x.name}: ${x.subject}. ${x.access}.`));exhibitionDisclosure(route,"Plan your visit","Entry is free. Allow forty minutes for the three rooms. The accessible entrance is beside the street desk, and the entire exhibition is on one level. Ask the desk for the tactile handling guide.");const foot=exhibitionNode(root,"footer","","foot label");exhibitionNode(foot,"span","Exhibition study / Three rooms, one route");exhibitionLink(foot,"Back to top",`#${id}-title`);
}
export const mount: Mount<AsciiExhibitionMapProps> = (host, initial = {}) => {
  let props: AsciiExhibitionMapProps = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  const id = nextId("ascii-exhibition-map");
  attrs.set("role", "region");
  attrs.set("aria-label", props.label);
  const style = exhibitionNode(host, "style");
  const root = exhibitionNode(host, "article");
  root.id = id;
  style.textContent = exhibitionRules(`[id="${id}"]`);
  let selected = 0;
  const emit = emitter<AsciiExhibitionMapEvents>(host);
  const choose = (index: number): void => {
    selected = index;
    draw();
    root.querySelectorAll<HTMLButtonElement>("button")[index]?.focus();
    emit("selectionChange", index);
  };
  const draw = (): void => exhibitionRender(root, props, id, choose, selected);
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
