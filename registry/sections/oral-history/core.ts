import { hostAttributes, nextId } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import { GRID_FONT } from "../../../lib/font";
import type { Mount } from "../../../lib/types";
export interface OralHistoryProps {
  /** The oral history series name. */
  publication: string;
  /** The interview headline. */
  title: string;
  /** The interview subject and role. */
  subject: string;
  /** The introduction to the conversation. */
  introduction: string;
  /** The highlighted excerpt. */
  quote: string;
  /** The chapter index and interview exchanges. */
  chapters: readonly { title: string; time: string; question: string; answer: string }[];
}

export const defaults: OralHistoryProps = {
  "publication": "Oral History / Working Lives",
  "title": "“You learn a place\nby caring for it.”",
  "subject": "Mara Ellis / Community gardener",
  "introduction": "An afternoon conversation about borrowed ground, patient work and the knowledge passed from one pair of hands to another. Recorded in the garden shed, with the door open.",
  "quote": "The garden was never empty. We just had to learn how to see what was already growing.",
  "chapters": [
    {
      "title": "The first season",
      "time": "00:00",
      "question": "Do you remember the first day you came here?",
      "answer": "I remember the gate. It would not open all the way because the grass had grown through the hinge. Someone had left a kettle inside the shed, and that made the place feel less abandoned. We made tea before we made a plan."
    },
    {
      "title": "Learning the ground",
      "time": "08:24",
      "question": "How did you decide what to grow?",
      "answer": "We asked what people missed. Not what would look impressive, but what they wanted to cook. Beans came first. Then herbs, because you can give someone a handful on their way home. The soil told us the rest over several seasons."
    },
    {
      "title": "Passing it on",
      "time": "19:10",
      "question": "What do you hope the next group will keep?",
      "answer": "The habit of asking. Nobody owns all the knowledge here. One person knows the compost, another knows when the frost comes, another knows which neighbour needs a chair. The work stays possible because it is shared."
    }
  ]
};

function oralHistoryNode<T extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: T, text = "", className = ""): HTMLElementTagNameMap[T] {
  const element = document.createElement(tag);
  element.setAttribute("data-pica", "");
  element.className = className;
  if (text) element.textContent = text;
  parent.append(element);
  return element;
}
function oralHistoryLink(parent: HTMLElement, text: string, id: string): HTMLAnchorElement {
  const a = oralHistoryNode(parent, "a", text);
  a.href = `#${id}`;
  return a;
}

function oralHistoryRules(s: string): string {
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
${s} .interviewhead{display:grid;grid-template-columns:10rem 1fr;gap:3rem;padding:2.5rem 0;border-bottom:1px solid ${fg}}${s} .record{font-family:${GRID_FONT};font-size:.75rem;color:${muted};border-left:3px solid ${accent};padding-left:1rem}${s} .record span{display:block;margin-bottom:.8rem}${s} h1{font-family:var(--pica-font-serif,Georgia,serif);font-size:clamp(3.6rem,6.5vw,6.8rem);white-space:pre-line;max-width:20ch}${s} .subject{font-size:1.1rem;margin-top:1.5rem}${s} .intro{max-width:58ch;margin-top:1rem;color:${muted}}
${s} .transcriptgrid{display:grid;grid-template-columns:10rem 1fr;gap:3rem;padding-top:2rem}${s} .chapterindex{border-right:1px solid ${muted};padding-right:1rem}${s} .chapterindex a{display:block;text-decoration:none;padding:1rem 0;border-bottom:1px solid ${muted};font-size:.9rem;line-height:1.4}${s} .chapterindex span{display:block;margin-bottom:.3rem}${s} .chapter{padding-bottom:2rem;margin-bottom:2rem;border-bottom:1px solid ${muted}}${s} .chapter h2{margin-bottom:1.5rem;font-size:1.5rem}${s} .exchange{display:grid;grid-template-columns:4rem 1fr;gap:1.5rem;margin-top:1.5rem}${s} .exchange p{max-width:64ch;line-height:1.85}${s} .exchange.question p{font-weight:600}${s} .speaker{font-family:${GRID_FONT};font-size:.7rem;padding-top:.25rem;color:${muted}}
${s} .pullquote{font-family:var(--pica-font-serif,Georgia,serif);font-size:clamp(2rem,4vw,3.8rem);line-height:1.2;letter-spacing:-.025em;padding:2rem 0;margin:1rem 0 3rem;border-top:1px solid ${fg};border-bottom:1px solid ${fg};max-width:24ch}
@media(max-width:850px){${s} .interviewhead,${s} .transcriptgrid{grid-template-columns:8rem 1fr;gap:1.5rem}}
@media(max-width:600px){${s} .interviewhead,${s} .transcriptgrid{grid-template-columns:1fr;gap:1.5rem}${s} .record{display:flex;gap:1rem;flex-wrap:wrap}${s} .record span{margin:0}${s} .chapterindex{border-right:0;display:flex;gap:1rem;flex-wrap:wrap}${s} .chapterindex a{flex:1 1 80px;font-size:.8rem}${s} .exchange{grid-template-columns:2.5rem 1fr;gap:1rem}${s} .exchange p{font-size:.95rem}${s} h1{font-size:3.6rem}}
`;
}

function oralHistoryRender(root: HTMLElement, p: OralHistoryProps, id: string): void {
  root.replaceChildren();
const mast=oralHistoryNode(root,"header","","mast");oralHistoryNode(mast,"span",p.publication,"label");oralHistoryNode(mast,"span","Conversation 018 / October 2026","label muted");
const head=oralHistoryNode(root,"div","","interviewhead");const record=oralHistoryNode(head,"div","","record");oralHistoryNode(record,"span","REC / 32:18");oralHistoryNode(record,"span","The garden shed");oralHistoryNode(record,"span","Transcript / Edited for clarity");const words=oralHistoryNode(head,"div");const title=oralHistoryNode(words,"h1",p.title);title.id=`${id}-title`;oralHistoryNode(words,"p",p.subject,"subject");oralHistoryNode(words,"p",p.introduction,"intro");
const grid=oralHistoryNode(root,"div","","transcriptgrid");const index=oralHistoryNode(grid,"nav","","chapterindex");index.setAttribute("aria-label","Interview chapters");p.chapters.forEach((chapter,i)=>{const a=oralHistoryLink(index,"",`${id}-chapter-${i}`);oralHistoryNode(a,"span",chapter.time,"label muted");oralHistoryNode(a,"span",chapter.title);});const transcript=oralHistoryNode(grid,"div");p.chapters.forEach((chapter,i)=>{const article=oralHistoryNode(transcript,"section","","chapter");article.id=`${id}-chapter-${i}`;oralHistoryNode(article,"h2",`${String(i+1).padStart(2,"0")} / ${chapter.title}`);const question=oralHistoryNode(article,"div","","exchange question");oralHistoryNode(question,"span","INT.","speaker").setAttribute("aria-label","Interviewer");oralHistoryNode(question,"p",chapter.question);const answer=oralHistoryNode(article,"div","","exchange");oralHistoryNode(answer,"span","M.E.","speaker").setAttribute("aria-label","Mara Ellis");oralHistoryNode(answer,"p",chapter.answer);if(i===0)oralHistoryNode(transcript,"blockquote",`“${p.quote}”`,"pullquote");});const details=oralHistoryNode(transcript,"details");oralHistoryNode(details,"summary","Recording and editorial note");oralHistoryNode(details,"p","This is an original fictional interview written for this layout. The transcript format preserves the rhythm of a conversation while allowing readers to move between chapters.");
const footer=oralHistoryNode(root,"footer","","colophon");oralHistoryNode(footer,"span",p.publication,"label");oralHistoryLink(footer,"Back to the beginning",`${id}-title`).className="label";
}

export const mount: Mount<OralHistoryProps> = (host, initial = {}) => {
  let props: OralHistoryProps = { ...defaults, ...initial };
  const attributes = hostAttributes(host);
  const id = nextId("oral-history");
  attributes.set("role", "region");
  attributes.set("aria-label", props.publication);
  const style = oralHistoryNode(host, "style");
  const root = oralHistoryNode(host, "article");
  root.id = id;
  style.textContent = oralHistoryRules(`[id="${id}"]`);
  oralHistoryRender(root, props, id);
  attributes.set("data-pica-ready", "true");
  return {
    update(next) {
      const merged = { ...props, ...next };
      if (sameJson(props, merged)) return;
      props = merged;
      attributes.set("aria-label", props.publication);
      oralHistoryRender(root, props, id);
    },
    destroy() {
      root.remove();
      style.remove();
      attributes.restore();
    },
  };
};
