import { hostAttributes, nextId } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import { GRID_FONT } from "../../../lib/font";
import type { Mount } from "../../../lib/types";
import { emitter } from "../../../lib/events";
export interface AsciiObservatoryConsoleProps {
  /** The observatory name. */
  label: string;
  /** The project headline. */
  title: string;
  /** Recorded observation sessions and instrument notes. */
  sessions: readonly { date: string; target: string; conditions: string; note: string; duration: string }[];
}
export interface AsciiObservatoryConsoleEvents {
  /** The selected record index after a visitor chooses a record. */
  selectionChange: number;
}
export const defaults: AsciiObservatoryConsoleProps = {
  "label": "North Ridge / Community observatory",
  "title": "A notebook for the night sky",
  "sessions": [
    {
      "date": "21 September",
      "target": "Lunar terminator",
      "conditions": "Clear / steady air",
      "note": "Sketch the shadows along the boundary between lunar day and night. Compare the ridge outlines after twenty minutes; record the change rather than relying on memory.",
      "duration": "42 min"
    },
    {
      "date": "23 September",
      "target": "Double star field",
      "conditions": "Thin haze / gentle wind",
      "note": "Begin at low magnification, center the pair and allow the image to settle. Record whether the gap remains visible as the air shifts. The log preserves uncertainty rather than forcing a measurement.",
      "duration": "35 min"
    },
    {
      "date": "27 September",
      "target": "Eastern star trail",
      "conditions": "Clear / cool",
      "note": "Mark the same bright star at ten minute intervals against the fixed horizon. The four marks document the movement visible from the north platform.",
      "duration": "40 min"
    }
  ]
};

function observatoryNode<T extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: T, text = "", cls = ""): HTMLElementTagNameMap[T] {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  el.className = cls;
  el.textContent = text;
  parent.append(el);
  return el;
}
function observatoryLink(parent: HTMLElement, text: string, target: string): HTMLAnchorElement {
  const a = observatoryNode(parent, "a", text);
  a.href = target;
  return a;
}
function observatoryArt(parent: HTMLElement, wide: string, compact: string, caption: string): void {
  const figure = observatoryNode(parent, "figure");
  observatoryNode(figure, "pre", wide, "art wide-art").setAttribute("aria-hidden", "true");
  observatoryNode(figure, "pre", compact, "art small-art").setAttribute("aria-hidden", "true");
  observatoryNode(figure, "figcaption", caption, "label muted");
}
function observatoryDisclosure(parent: HTMLElement, heading: string, body: string): void {
  const d = observatoryNode(parent, "details");
  observatoryNode(d, "summary", heading);
  observatoryNode(d, "p", body);
}
function observatoryRules(s: string): string {
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
${s} .console{display:grid;grid-template-columns:1fr 1.2fr;gap:4rem;margin-top:3rem}${s} .console figure{margin:2rem 0}${s} .console figure .art{font-size:clamp(11px,1.15vw,15px)}${s} .console figure figcaption{max-width:35ch;margin-top:1rem}${s} .console h1{max-width:12ch}${s} .logrow{display:grid;grid-template-columns:2rem 1fr 5rem;gap:1rem;border-top:1px solid ${muted};padding:.8rem 0}${s} .session{min-height:260px}@media(max-width:850px){${s} .console{gap:2rem}}@media(max-width:600px){${s} .console{display:flex;flex-direction:column-reverse}${s} .session{min-height:0}}
`;
}
function observatoryRender(root: HTMLElement, p: AsciiObservatoryConsoleProps, id: string, choose: (index: number) => void, selected: number): void {
  root.replaceChildren();
const mast=observatoryNode(root,"header","","mast label");const brand=observatoryNode(mast,"span");observatoryNode(brand,"span","","mark").setAttribute("aria-hidden","true");observatoryNode(brand,"span",p.label);const grid=observatoryNode(root,"div","","console");const sky=observatoryNode(grid,"section");observatoryNode(sky,"p","Instrument 02 / North platform","label muted");observatoryArt(sky,"                 N\n          .------|------.\n       .-'   +   |  .    '-.\n     .'   .      |    *     '.\n W --+-----------+-----------+-- E\n     '.    *     |  .       .'\n       '-.   .   |    +  .-'\n          '------|------'\n                 S\n       + reference  * target","          N\n      .---|---.\n W ---+---+---+--- E\n      '---|---'\n          S\n   + reference * target","Orientation sketch / Horizon ring viewed from the north platform");observatoryNode(sky,"h2","Before observing");observatoryNode(sky,"p","Allow the instrument to reach outdoor temperature. Check the finder against a distant fixed object before darkness. Use a dim lamp for notes and keep the access path clear.");observatoryDisclosure(sky,"Instrument and recording method","A 150 mm reflector on a manual mount is used for these sample sessions. The sketch is a diagram of orientation, not a coordinate accurate star catalogue. Log the target, duration and seeing conditions before interpreting a drawing.");const record=observatoryNode(grid,"section");const h=observatoryNode(record,"h1",p.title);h.id=`${id}-title`;observatoryNode(record,"p","Three recorded sessions, one instrument. Choose an entry to inspect the observation method.","intro");const choices=observatoryNode(record,"div","","choices");p.sessions.forEach((x,i)=>{const b=observatoryNode(choices,"button",x.date);b.type="button";b.setAttribute("aria-pressed",String(selected===i));b.onclick=()=>choose(i);});const x=p.sessions[selected]??p.sessions[0];const detail=observatoryNode(record,"div","","session rule");detail.setAttribute("aria-live","polite");if(x){observatoryNode(detail,"p",`Record ${String(selected+1).padStart(2,"0")} / ${x.date}`,"label muted");observatoryNode(detail,"h2",x.target);const facts=observatoryNode(detail,"div","","facts");observatoryNode(facts,"p",x.duration,"label");observatoryNode(facts,"p",x.conditions,"label");observatoryNode(facts,"p","Manual log","label");observatoryNode(detail,"p",x.note);}const ledger=observatoryNode(record,"section","","rule");observatoryNode(ledger,"h2","Session ledger");p.sessions.forEach((x,i)=>{const row=observatoryNode(ledger,"div","","logrow");observatoryNode(row,"span",String(i+1).padStart(2,"0"),"label muted");observatoryNode(row,"span",x.target);observatoryNode(row,"span",x.duration,"label muted");});const foot=observatoryNode(root,"footer","","foot label");observatoryNode(foot,"span","Sample observations / No live telemetry");observatoryLink(foot,"Back to top",`#${id}-title`);
}
export const mount: Mount<AsciiObservatoryConsoleProps> = (host, initial = {}) => {
  let props: AsciiObservatoryConsoleProps = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  const id = nextId("ascii-observatory-console");
  attrs.set("role", "region");
  attrs.set("aria-label", props.label);
  const style = observatoryNode(host, "style");
  const root = observatoryNode(host, "article");
  root.id = id;
  style.textContent = observatoryRules(`[id="${id}"]`);
  let selected = 0;
  const emit = emitter<AsciiObservatoryConsoleEvents>(host);
  const choose = (index: number): void => {
    selected = index;
    draw();
    root.querySelectorAll<HTMLButtonElement>("button")[index]?.focus();
    emit("selectionChange", index);
  };
  const draw = (): void => observatoryRender(root, props, id, choose, selected);
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
