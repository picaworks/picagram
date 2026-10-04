import { hostAttributes, nextId } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import { GRID_FONT } from "../../../lib/font";
import type { Mount } from "../../../lib/types";
export interface ReadingRoomProps {
  /** The reading room name. */
  publication: string;
  /** The featured essay title. */
  title: string;
  /** The essay introduction. */
  introduction: string;
  /** The essay paragraphs. */
  paragraphs: readonly string[];
  /** The shelf index and annotated bibliography. */
  books: readonly { title: string; author: string; year: string; note: string }[];
}

export const defaults: ReadingRoomProps = {
  "publication": "The Reading Room",
  "title": "A room made\nby its readers",
  "introduction": "A short essay on the spaces we create when we read together, and a shelf of books to continue the conversation.",
  "paragraphs": [
    "The first thing you notice is the silence. Not an absence of sound, but an agreement about which sounds belong: a page turning, a chair moving, the soft arrival of someone who has been here before.",
    "A reading room is a peculiar kind of public space. Its occupants are together without having to perform being together. Each person follows a private line of thought, held within a shared frame of time and light.",
    "The shelves make that frame visible. A book is placed beside another book, and an accidental conversation begins. A history of a river meets a manual for repairing a chair. A poem interrupts a catalogue. The room gains a geography that no floor plan can show.",
    "Good libraries make room for unfinished questions. They offer a desk, a margin, a date stamped on a slip. They trust that a reader may leave with something that cannot yet be named."
  ],
  "books": [
    {
      "title": "A Pattern Language",
      "author": "Christopher Alexander et al.",
      "year": "1977",
      "note": "A vocabulary for considering the relationship between rooms, streets and daily life."
    },
    {
      "title": "The Poetics of Space",
      "author": "Gaston Bachelard",
      "year": "1958",
      "note": "An inquiry into the rooms we carry in memory and imagination."
    },
    {
      "title": "A Room of One’s Own",
      "author": "Virginia Woolf",
      "year": "1929",
      "note": "An argument for the material conditions that allow thought and writing to flourish."
    }
  ]
};

function readingRoomNode<T extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: T, text = "", className = ""): HTMLElementTagNameMap[T] {
  const element = document.createElement(tag);
  element.setAttribute("data-pica", "");
  element.className = className;
  if (text) element.textContent = text;
  parent.append(element);
  return element;
}
function readingRoomLink(parent: HTMLElement, text: string, id: string): HTMLAnchorElement {
  const a = readingRoomNode(parent, "a", text);
  a.href = `#${id}`;
  return a;
}

function readingRoomRules(s: string): string {
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
${s} .roomgrid{display:grid;grid-template-columns:15rem minmax(0,1fr);gap:4rem;padding-top:2rem}${s} .shelf{border-right:1px solid ${muted};padding-right:2rem}${s} .shelf h2{font-family:var(--pica-font-serif,Georgia,serif);font-size:1.5rem}${s} .shelf a{display:block;padding:1.3rem 0;border-bottom:1px solid ${muted};text-decoration:none}${s} .shelf a span{display:block}${s} .bookname{font-family:var(--pica-font-serif,Georgia,serif);font-size:1.1rem;line-height:1.35;margin:.3rem 0}${s} .shelf .shelfnote{font-size:.85rem;margin-top:2rem;color:${muted}}
${s} .reading{max-width:48rem;margin:0 auto}${s} .reading h1{font-family:var(--pica-font-serif,Georgia,serif);font-size:clamp(3.8rem,6.5vw,6.5rem);white-space:pre-line;text-align:center;margin:1rem 0 2rem}${s} .reading .eyebrow{text-align:center;color:color-mix(in srgb, ${fg} 40%, ${accent})}${s} .reading .intro{font-family:var(--pica-font-serif,Georgia,serif);font-size:1.4rem;text-align:center;max-width:34ch;margin:0 auto 2.5rem}${s} .essay{font-family:var(--pica-font-serif,Georgia,serif);font-size:1.15rem;line-height:1.9;max-width:58ch;margin:auto}${s} .essay p{margin-bottom:1.5rem}${s} .ornament{text-align:center;letter-spacing:.5em;margin:2rem 0;color:${muted};font-family:${GRID_FONT}}
${s} .bibliography{margin-top:3rem;border-top:1px solid ${fg};padding-top:1.5rem}${s} .citation{display:grid;grid-template-columns:3rem 1fr;gap:1rem;padding:1.5rem 0;border-bottom:1px solid ${muted}}${s} .citation h3{font-family:var(--pica-font-serif,Georgia,serif);font-size:1.25rem}${s} .citation p{margin-top:.5rem;font-size:.95rem}
@media(max-width:900px){${s} .roomgrid{grid-template-columns:11rem 1fr;gap:2rem}${s} .shelf{padding-right:1rem}}
@media(max-width:600px){${s} .roomgrid{display:flex;flex-direction:column-reverse;gap:2rem}${s} .shelf{border-right:0;border-top:1px solid ${fg};padding:1.5rem 0 0}${s} .reading h1{font-size:3.8rem}${s} .reading .intro{font-size:1.2rem}${s} .essay{font-size:1.05rem}}
`;
}

function readingRoomRender(root: HTMLElement, p: ReadingRoomProps, id: string): void {
  root.replaceChildren();
const mast=readingRoomNode(root,"header","","mast");readingRoomNode(mast,"span",p.publication,"label");const nav=readingRoomNode(mast,"nav","","nav label");nav.setAttribute("aria-label","Reading room sections");readingRoomLink(nav,"The essay",`${id}-essay`);readingRoomLink(nav,"The shelf",`${id}-shelf`);
const grid=readingRoomNode(root,"div","","roomgrid");const shelf=readingRoomNode(grid,"aside","","shelf");shelf.id=`${id}-shelf`;readingRoomNode(shelf,"h2","On the shelf");readingRoomNode(shelf,"p","Three books / One conversation","label muted");p.books.forEach((book,i)=>{const a=readingRoomLink(shelf,"",`${id}-book-${i}`);readingRoomNode(a,"span",`${String(i+1).padStart(2,"0")} / ${book.year}`,"label muted");readingRoomNode(a,"span",book.title,"bookname");readingRoomNode(a,"span",book.author,"label muted");});readingRoomNode(shelf,"p","Start anywhere. A shelf is an invitation to make your own order.","shelfnote");
const reading=readingRoomNode(grid,"article","","reading");reading.id=`${id}-essay`;readingRoomNode(reading,"p","Essay 012 / Spaces for thought","label eyebrow");const title=readingRoomNode(reading,"h1",p.title);title.id=`${id}-title`;readingRoomNode(reading,"p",p.introduction,"intro");const essay=readingRoomNode(reading,"div","","essay");p.paragraphs.forEach(text=>readingRoomNode(essay,"p",text));readingRoomNode(reading,"div","· · ·","ornament").setAttribute("aria-hidden","true");
const bibliography=readingRoomNode(reading,"section","","bibliography");readingRoomNode(bibliography,"h2","Continue reading");p.books.forEach((book,i)=>{const row=readingRoomNode(bibliography,"article","","citation");row.id=`${id}-book-${i}`;readingRoomNode(row,"span",String(i+1).padStart(2,"0"),"label muted");const copy=readingRoomNode(row,"div");readingRoomNode(copy,"h3",book.title);readingRoomNode(copy,"p",`${book.author} / ${book.year}`,"label muted");readingRoomNode(copy,"p",book.note);});const details=readingRoomNode(bibliography,"details");readingRoomNode(details,"summary","A reading group prompt");readingRoomNode(details,"p","Describe a room where you found it easy to think. Which part belonged to the architecture, which to the people, and which to the time you spent there?");
const footer=readingRoomNode(root,"footer","","colophon");readingRoomNode(footer,"span",p.publication,"label");readingRoomLink(footer,"Back to the beginning",`${id}-title`).className="label";
}

export const mount: Mount<ReadingRoomProps> = (host, initial = {}) => {
  let props: ReadingRoomProps = { ...defaults, ...initial };
  const attributes = hostAttributes(host);
  const id = nextId("reading-room");
  attributes.set("role", "region");
  attributes.set("aria-label", props.publication);
  const style = readingRoomNode(host, "style");
  const root = readingRoomNode(host, "article");
  root.id = id;
  style.textContent = readingRoomRules(`[id="${id}"]`);
  readingRoomRender(root, props, id);
  attributes.set("data-pica-ready", "true");
  return {
    update(next) {
      const merged = { ...props, ...next };
      if (sameJson(props, merged)) return;
      props = merged;
      attributes.set("aria-label", props.publication);
      readingRoomRender(root, props, id);
    },
    destroy() {
      root.remove();
      style.remove();
      attributes.restore();
    },
  };
};
