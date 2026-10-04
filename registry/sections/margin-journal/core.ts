import { hostAttributes, nextId } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import { GRID_FONT } from "../../../lib/font";
import type { Mount } from "../../../lib/types";
export interface MarginJournalProps {
  /** The name of the journal. */
  publication: string;
  /** The issue label and season. */
  issue: string;
  /** The essay headline. */
  title: string;
  /** The introduction beneath the headline. */
  deck: string;
  /** The essay author. */
  author: string;
  /** The essay paragraphs, rendered as plain text. */
  paragraphs: readonly string[];
  /** The marginal notes and linked endnotes. */
  notes: readonly string[];
}

export const defaults: MarginJournalProps = {
  "publication": "Margin Journal",
  "issue": "Volume 03 / Autumn 2026",
  "title": "The useful\nart of noticing",
  "deck": "On keeping a record of ordinary places before they become extraordinary memories.",
  "author": "Elena March",
  "paragraphs": [
    "A city gives itself away in the small things. The worn edge of a public bench. A window left open above a bakery. The route a person chooses when there is no reason to hurry. These are not landmarks, yet they hold a place together.",
    "I began keeping a notebook because photographs were too certain. They showed me what had been there, but rarely what I had failed to see. A sentence leaves room for a question. A drawing admits that a wall might have leaned another way.",
    "At the corner shop, the owner puts a chair outside each morning. Nobody remembers when this began. The chair is an invitation, an improvised information desk, and a measure of the weather. To describe it accurately requires returning.",
    "Attention is a practice of revision. The second visit complicates the first; the third offers a different kind of evidence. What seemed empty becomes a waiting place. What seemed quiet becomes a conversation held at a lower volume.",
    "The notebook is not an archive of everything. It is a record of what mattered enough to slow down for. Its value lies in the gaps, where another observer might begin."
  ],
  "notes": [
    "A field note begins with a time and a location. Interpretation comes afterwards.",
    "Return to the same place at a different hour. Compare the details, not your conclusions.",
    "Leave space for the person who knows the place better than you do."
  ]
};

function marginJournalNode<T extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: T, text = "", className = ""): HTMLElementTagNameMap[T] {
  const element = document.createElement(tag);
  element.setAttribute("data-pica", "");
  element.className = className;
  if (text) element.textContent = text;
  parent.append(element);
  return element;
}
function marginJournalLink(parent: HTMLElement, text: string, id: string): HTMLAnchorElement {
  const a = marginJournalNode(parent, "a", text);
  a.href = `#${id}`;
  return a;
}

function marginJournalRules(s: string): string {
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
${s} .titleblock{padding:3rem 0 2rem;display:grid;grid-template-columns:1fr 17rem;gap:3rem;align-items:end}
${s} h1{font-family:var(--pica-font-serif,Georgia,serif);font-size:clamp(3.6rem,7vw,7rem);white-space:pre-line;max-width:11ch}
${s} .deck{font-size:1.15rem;border-left:1px solid ${muted};padding-left:1.5rem}
${s} .essaygrid{display:grid;grid-template-columns:11rem minmax(0,42rem) 1fr;gap:3rem;border-top:1px solid ${fg};padding-top:2rem}
${s} .margin{display:flex;flex-direction:column;gap:3rem;color:${muted};font-size:.82rem}
${s} .margin a{display:block;margin-bottom:.5rem;color:${fg};font-family:${GRID_FONT};font-size:.7rem}
${s} .essay{font-family:var(--pica-font-serif,Georgia,serif);font-size:1.15rem;line-height:1.85}
${s} .essay p{margin-bottom:1.4rem}
${s} .essay p:first-of-type:first-letter{float:left;font-size:5.8rem;line-height:.82;padding:.15rem .6rem 0 0;color:color-mix(in srgb, ${fg} 40%, ${accent})}
${s} .essay sup{font-family:${GRID_FONT};font-size:.62rem;margin-left:.25rem}
${s} .folio{writing-mode:vertical-rl;justify-self:end;color:${muted}}
${s} .endnotes{margin:2.5rem 0 0 14rem;border-top:1px solid ${fg};padding-top:1.5rem;max-width:42rem}
${s} .endnotes ol{padding-left:1.3rem;font-size:.9rem}${s} .endnotes li{padding:.5rem 0}
@media(max-width:850px){${s} .titleblock{grid-template-columns:1fr;gap:1.5rem}${s} .deck{max-width:50ch}${s} .essaygrid{grid-template-columns:8rem 1fr;gap:2rem}${s} .folio{display:none}${s} .endnotes{margin-left:10rem}}
@media(max-width:600px){${s} .titleblock{padding:2rem 0}${s} .essaygrid{grid-template-columns:1fr;gap:1.5rem}${s} .margin{flex-direction:row;gap:1rem;flex-wrap:wrap;border-bottom:1px solid ${muted};padding-bottom:1rem}${s} .margin>div{flex:1 1 120px}${s} .endnotes{margin-left:0}${s} .essay{font-size:1.05rem}}
`;
}

function marginJournalRender(root: HTMLElement, p: MarginJournalProps, id: string): void {
  root.replaceChildren();
const mast = marginJournalNode(root, "header", "", "mast"); marginJournalNode(mast,"span",p.publication,"label"); marginJournalNode(mast,"span",p.issue,"label muted");
const titleblock=marginJournalNode(root,"div","","titleblock"); const title=marginJournalNode(titleblock,"h1",p.title);title.id=`${id}-title`;marginJournalNode(titleblock,"p",p.deck,"deck");
const grid=marginJournalNode(root,"div","","essaygrid"); const aside=marginJournalNode(grid,"aside","","margin");aside.setAttribute("aria-label","Marginal notes");
p.notes.forEach((note,i)=>{const n=marginJournalNode(aside,"div");marginJournalLink(n,`NOTE ${String(i+1).padStart(2,"0")}`,`${id}-note-${i}`);marginJournalNode(n,"p",note);});
const essay=marginJournalNode(grid,"div","","essay");essay.id=`${id}-essay`;marginJournalNode(essay,"div",`By ${p.author} / 7 minute read`,"label muted");
p.paragraphs.forEach((text,i)=>{const para=marginJournalNode(essay,"p",text);if(i<p.notes.length){const sup=marginJournalNode(para,"sup");marginJournalLink(sup,String(i+1),`${id}-note-${i}`).setAttribute("aria-label",`Read endnote ${i+1}`);para.id=`${id}-ref-${i}`;}});
marginJournalNode(grid,"span","OBSERVATIONS / ESSAY 017","folio label");
const endnotes=marginJournalNode(root,"section","","endnotes");endnotes.id=`${id}-notes`;marginJournalNode(endnotes,"h2","Notes from the margin");const list=marginJournalNode(endnotes,"ol");p.notes.forEach((note,i)=>{const li=marginJournalNode(list,"li",note);li.id=`${id}-note-${i}`;marginJournalLink(li," ↩ Return to passage",i < p.paragraphs.length ? `${id}-ref-${i}` : `${id}-title`);});
const details=marginJournalNode(endnotes,"details");marginJournalNode(details,"summary","A prompt for your next walk");marginJournalNode(details,"p","Choose one familiar corner. Write five observations without using an adjective. Return tomorrow and record what changed.");
const footer=marginJournalNode(root,"footer","","colophon");marginJournalNode(footer,"span",p.publication,"label");marginJournalLink(footer,"Back to the beginning",`${id}-title`).className="label";
}

export const mount: Mount<MarginJournalProps> = (host, initial = {}) => {
  let props: MarginJournalProps = { ...defaults, ...initial };
  const attributes = hostAttributes(host);
  const id = nextId("margin-journal");
  attributes.set("role", "region");
  attributes.set("aria-label", props.publication);
  const style = marginJournalNode(host, "style");
  const root = marginJournalNode(host, "article");
  root.id = id;
  style.textContent = marginJournalRules(`[id="${id}"]`);
  marginJournalRender(root, props, id);
  attributes.set("data-pica-ready", "true");
  return {
    update(next) {
      const merged = { ...props, ...next };
      if (sameJson(props, merged)) return;
      props = merged;
      attributes.set("aria-label", props.publication);
      marginJournalRender(root, props, id);
    },
    destroy() {
      root.remove();
      style.remove();
      attributes.restore();
    },
  };
};
