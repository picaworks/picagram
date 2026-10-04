import { hostAttributes, nextId } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import { GRID_FONT } from "../../../lib/font";
import type { Mount } from "../../../lib/types";
export interface AsciiTerminalJournalProps {
  /** The journal name. */
  label: string;
  /** The essay title. */
  title: string;
  /** The author and edition line. */
  byline: string;
  /** The authored chapters and margin observations. */
  chapters: readonly { title: string; text: string; note: string }[];
}
export const defaults: AsciiTerminalJournalProps = {
  "label": "Margins / A journal of everyday systems",
  "title": "The small marks that hold a place together",
  "byline": "Leah Orr / Essay 07 / 18 September 2026",
  "chapters": [
    {
      "title": "Begin with a boundary",
      "text": "At the edge of the allotment, a line of stones separates a path from a bed. The stones do more than mark ownership. They hold soil in place, catch a wheel before it crushes a seedling and give a visitor permission to walk closer.",
      "note": "A boundary is useful when it explains what can happen on either side."
    },
    {
      "title": "Make the work legible",
      "text": "A good label tells us what has changed. The gardener dates a transplant, the librarian marks a repaired spine and the surveyor records the water level beside a bridge. Each mark turns a private act into a public memory.",
      "note": "Record the decision at the place where its effects can be seen."
    },
    {
      "title": "Leave room for revision",
      "text": "The most helpful systems admit that their first arrangement will change. A path widens where people meet. A shelf gains a subject nobody anticipated. A notebook reserves a margin for the next reader. Maintenance becomes part of the design rather than evidence that the design failed.",
      "note": "Write the next revision date before declaring the work complete."
    }
  ]
};

function journalNode<T extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: T, text = "", cls = ""): HTMLElementTagNameMap[T] {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  el.className = cls;
  el.textContent = text;
  parent.append(el);
  return el;
}
function journalLink(parent: HTMLElement, text: string, target: string): HTMLAnchorElement {
  const a = journalNode(parent, "a", text);
  a.href = target;
  return a;
}
function journalArt(parent: HTMLElement, wide: string, compact: string, caption: string): void {
  const figure = journalNode(parent, "figure");
  journalNode(figure, "pre", wide, "art wide-art").setAttribute("aria-hidden", "true");
  journalNode(figure, "pre", compact, "art small-art").setAttribute("aria-hidden", "true");
  journalNode(figure, "figcaption", caption, "label muted");
}
function journalDisclosure(parent: HTMLElement, heading: string, body: string): void {
  const d = journalNode(parent, "details");
  journalNode(d, "summary", heading);
  journalNode(d, "p", body);
}
function journalRules(s: string): string {
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
${s} .journalhead{max-width:850px;margin:2rem auto 3rem}${s} .journalhead .art{margin-bottom:1rem}${s} .journalhead h1{max-width:18ch;margin-top:1rem}${s} .reading{display:grid;grid-template-columns:240px minmax(0,65ch);gap:4rem;justify-content:center}${s} .contents{align-self:start;display:flex;flex-direction:column;border-top:1px solid ${fg};padding-top:1rem}${s} .contents a{text-decoration:none}${s} .chapter{margin-bottom:3rem;scroll-margin-top:2rem}${s} .chapter h2{margin-top:.7rem}${s} .chapter>p:not(.label){font-size:1.12rem;line-height:1.9}${s} .observation{margin:1.5rem 0 0;padding-left:1rem;border-left:3px solid ${accent};font-size:.95rem;color:${muted}}@media(max-width:850px){${s} .reading{grid-template-columns:180px 1fr;gap:2rem}}@media(max-width:600px){${s} .reading{grid-template-columns:1fr}${s} .contents{gap:1rem}${s} .journalhead{margin-bottom:2rem}}
`;
}
function journalRender(root: HTMLElement, p: AsciiTerminalJournalProps, id: string): void {
  root.replaceChildren();
const mast=journalNode(root,"header","","mast label");const brand=journalNode(mast,"span");journalNode(brand,"span","","mark").setAttribute("aria-hidden","true");journalNode(brand,"span",p.label);const header=journalNode(root,"div","","journalhead");journalArt(header,"+-- M A R G I N S -------------------------+\n| > read / observe / revise               |\n+----------------------------------------+","+-- M A R G I N S --+\n| read / revise    |\n+------------------+","A journal in three chapters");journalNode(header,"p",p.byline,"label muted");const h=journalNode(header,"h1",p.title);h.id=`${id}-title`;journalNode(header,"p","Field notes on boundaries, labels and the quiet agreements that make shared places usable.","intro");const grid=journalNode(root,"div","","reading");const contents=journalNode(grid,"nav","","contents label");contents.setAttribute("aria-label","Essay contents");journalNode(contents,"span","Contents / choose a chapter","muted");p.chapters.forEach((x,i)=>journalLink(contents,`> ${String(i+1).padStart(2,"0")} ${x.title}`,`#${id}-chapter-${i}`));const essay=journalNode(grid,"div");p.chapters.forEach((x,i)=>{const section=journalNode(essay,"section","","chapter");section.id=`${id}-chapter-${i}`;journalNode(section,"p",`Chapter ${String(i+1).padStart(2,"0")}`,"label muted");journalNode(section,"h2",x.title);journalNode(section,"p",x.text);journalNode(section,"blockquote",x.note,"observation");});journalDisclosure(essay,"A prompt for your own field notes","Choose a place you share with strangers. List three marks that tell you how to use it. Who made them, and who is able to revise them?");const foot=journalNode(root,"footer","","foot label");journalNode(foot,"span","End of essay / Notes may be revised");journalLink(foot,"Back to top",`#${id}-title`);
}
export const mount: Mount<AsciiTerminalJournalProps> = (host, initial = {}) => {
  let props: AsciiTerminalJournalProps = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  const id = nextId("ascii-terminal-journal");
  attrs.set("role", "region");
  attrs.set("aria-label", props.label);
  const style = journalNode(host, "style");
  const root = journalNode(host, "article");
  root.id = id;
  style.textContent = journalRules(`[id="${id}"]`);

  const draw = (): void => journalRender(root, props, id);
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
