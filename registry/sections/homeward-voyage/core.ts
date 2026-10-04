import { hostAttributes, nextId, scope } from "../../../lib/host";
import { GRID_FONT } from "../../../lib/font";
import { cssVar } from "../../../lib/palette";
import { emitter } from "../../../lib/events";
import type { Mount } from "../../../lib/types";
export interface HomewardVoyageProps {
    /** The page headline. Line breaks preserve the editorial composition. */
    title: string;
    /** Introductory copy beneath the headline. */
    description: string;
    /** The archive or programme label in the masthead. */
    edition: string;
}
export interface HomewardVoyageEvents {
    /** Reports the reader opening or closing the supplementary note. */
    reveal: { expanded: boolean };
}
export const defaults: HomewardVoyageProps = {
    "title": "The long way\nhome.",
    "description": "A voyage in five crossings. An account of leaving, losing the route, and learning to return.",
    "edition": "THE HOMEWARD PAPERS / VOLUME I"
};
type homewardVoyageMark = readonly [
    string,
    Record<string, string>
];
function homewardVoyageNode(parent: Element, tag: keyof HTMLElementTagNameMap, part: string, text?: string): HTMLElement {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    if (part)
        node.dataset.part = part;
    if (text !== undefined)
        node.textContent = text;
    parent.append(node);
    return node;
}
function homewardVoyageDiagram(parent: Element, box: string, marks: readonly homewardVoyageMark[]): void {
    const drawing = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    drawing.setAttribute("data-pica", "");
    drawing.setAttribute("viewBox", box);
    drawing.setAttribute("aria-hidden", "true");
    drawing.setAttribute("fill", "none");
    drawing.setAttribute("stroke", "currentColor");
    drawing.setAttribute("stroke-width", "1");
    for (const [tag, attrs] of marks) {
        const mark = document.createElementNS("http://www.w3.org/2000/svg", tag);
        mark.setAttribute("data-pica", "");
        for (const [key, value] of Object.entries(attrs))
            mark.setAttribute(key, value);
        drawing.append(mark);
    }
    parent.append(drawing);
}
function homewardVoyageRules(s: string): string {
    const fg = cssVar("fg");
    const muted = cssVar("muted");
    const accent = cssVar("accent");
    const rules = `
:where(HOST){min-height:100vh}
HOST{color:${fg};background:${cssVar("bg")};position:relative;box-sizing:border-box}
HOST [data-part="page"]{max-width:1200px;margin:0 auto;padding:28px clamp(22px,5vw,65px) 24px;box-sizing:border-box}
HOST [data-pica]{box-sizing:border-box;min-width:0}
HOST h1{overflow-wrap:anywhere}
HOST h1,HOST h2,HOST h3,HOST p,HOST figure,HOST dl,HOST dd,HOST blockquote{margin:0}
HOST [data-part="masthead"]{display:flex;justify-content:space-between;align-items:center;gap:25px;border-top:3px solid ${fg};border-bottom:1px solid ${fg};padding:17px 0}
HOST [data-part="label"],HOST [data-part="edition"]{font-family:${GRID_FONT};font-size:.7rem;line-height:1.7;letter-spacing:.035em;white-space:pre-line}
HOST [data-part="edition"]{border-left:3px solid ${accent};padding-left:12px}
HOST [data-part="navigation"]{display:flex;flex-wrap:wrap;gap:18px}
HOST a{color:${fg};text-decoration:none;font-family:${GRID_FONT};font-size:.7rem;line-height:1.5;border-bottom:1px solid ${muted};padding-bottom:3px}
HOST a:focus-visible,HOST button:focus-visible{outline:2px solid ${accent};outline-offset:4px}
HOST [data-part="sectiontitle"]{font-size:clamp(1.7rem,2.8vw,2.5rem);font-weight:450;line-height:1.12;letter-spacing:-.035em;margin-bottom:24px}
HOST [data-part="copy"]{font-size:1rem;line-height:1.65}
HOST [data-part="supplement"]{margin:38px 0 32px;border-top:1px solid ${muted};border-bottom:1px solid ${muted}}
HOST [data-part="note-toggle"]{appearance:none;display:flex;align-items:center;justify-content:space-between;gap:20px;width:100%;padding:20px 0;border:0;background:transparent;color:${fg};font:inherit;font-size:.95rem;text-align:left;cursor:pointer}
HOST [data-part="note-toggle"]::after{content:"+";font-family:${GRID_FONT};font-size:1.4rem;color:${accent}}
HOST [data-part="note-toggle"][aria-expanded="true"]::after{content:"−"}
HOST [data-part="note-body"]{padding:0 0 25px;max-width:760px}
HOST [data-part="note-body"] h3{font-weight:500;font-size:1.3rem;margin:5px 0 15px}
HOST [data-part="footer"]{display:flex;justify-content:space-between;gap:20px;font-family:${GRID_FONT};font-size:.64rem;letter-spacing:.03em;line-height:1.6}
HOST [data-part="title"],HOST [data-part="chaptertitle"],HOST [data-part="prose"],HOST [data-part="quote"]{font-family:var(--pica-font-serif,Georgia,serif)}
HOST [data-part="lead"]{padding:58px 0 20px;max-width:820px}HOST [data-part="title"]{font-size:clamp(4rem,9vw,8.5rem);font-weight:400;line-height:.97;letter-spacing:-.06em;white-space:pre-line;margin-top:28px}HOST [data-part="deck"]{max-width:40ch;line-height:1.7;font-size:1.15rem;margin-top:28px}HOST [data-part="coast"]{margin:10px 0 60px}HOST [data-part="coast"] svg{width:100%;height:auto;color:${muted}}HOST [data-part="coast"] figcaption{font-size:.65rem;letter-spacing:.1em;text-align:center}HOST [data-part="story"]{display:grid;grid-template-columns:1fr 2.2fr;gap:70px;border-top:1px solid ${fg};padding-top:50px}HOST [data-part="chapter"]{border-top:1px solid ${muted};margin-top:55px;padding-top:30px}
HOST [data-part="chapterindex"]{position:sticky;top:24px;align-self:start;border-right:1px solid ${muted};padding-right:36px}HOST [data-part="indexrow"]{display:flex;gap:22px;padding:18px 0;border-bottom:1px solid ${muted};font-size:.85rem}HOST [data-part="indexrow"] span:first-child{width:20px;font-family:${GRID_FONT}}HOST [data-part="reading"]{max-width:650px;padding-right:8%}HOST [data-part="chaptertitle"]{font-size:clamp(2rem,3.5vw,3rem);font-weight:400;line-height:1.15;letter-spacing:-.035em;white-space:pre-line;margin:24px 0 32px}HOST [data-part="prose"]{font-size:1.08rem;line-height:1.9;margin:22px 0}HOST [data-part="quote"]{white-space:pre-line;font-size:2rem;line-height:1.3;margin:45px 0;padding-left:25px;border-left:3px solid ${accent}}HOST [data-part="notes"]{border-top:1px solid ${fg};margin-top:70px;padding-top:28px}HOST [data-part="notesgrid"]{display:grid;grid-template-columns:1.2fr 1.3fr 1fr;gap:40px;padding-top:25px}HOST [data-part="sectiontitle"]{white-space:pre-line}@media(max-width:760px){HOST [data-part="story"]{grid-template-columns:1fr;gap:36px}HOST [data-part="chapter"]{border-top:1px solid ${muted};margin-top:55px;padding-top:30px}
HOST [data-part="chapterindex"]{position:static;top:auto;align-self:start;border-right:0;padding-right:0}HOST [data-part="indexrow"]{padding:10px 0}HOST [data-part="reading"]{padding-right:0}HOST [data-part="coast"]{margin-bottom:35px}HOST [data-part="notesgrid"]{grid-template-columns:1fr;gap:22px}}
@media(max-width:760px){HOST [data-part="masthead"]{align-items:flex-start;flex-direction:column;gap:15px}HOST [data-part="page"]{padding-top:20px}HOST [data-part="edition"]{border-left:3px solid ${accent};padding-left:12px}
HOST [data-part="navigation"]{gap:15px}HOST [data-part="footer"]{flex-direction:column;gap:10px}}
`;
    return rules.replaceAll("HOST", s);
}
export const mount: Mount<HomewardVoyageProps> = (host, initial = {}) => {
    let props: HomewardVoyageProps = { ...defaults, ...initial };
    const sheet = scope(host);
    const attributes = hostAttributes(host);
    attributes.set("role", "region");
    attributes.set("aria-label", props.title.replaceAll("\n", " "));
    const root = homewardVoyageNode(host, "div", "page");
    const N = homewardVoyageNode;
    const D = homewardVoyageDiagram;
    type Mark = homewardVoyageMark;
    const ids = [nextId("homeward-voyage-section"), nextId("homeward-voyage-section"), nextId("homeward-voyage-section")];
    const header = N(root, "header", "masthead");
    const editionNode = N(header, "p", "edition", props.edition);
    const nav = N(header, "nav", "navigation");
    nav.setAttribute("aria-label", "Page sections");
    ["The crossing", "Chapters", "Reading notes"].forEach((label, i) => {
        const link = N(nav, "a", "", label);
        link.setAttribute("href", `#${ids[i]}`);
    });
    const lead = N(root, "section", "lead");
    lead.id = ids[0]!;
    N(lead, "p", "label", "AN ORIGINAL VOYAGE / 5 CHAPTERS");
    const titleNode = N(lead, "h1", "title", props.title);
    const descriptionNode = N(lead, "p", "deck", props.description);
    const map = N(root, "figure", "coast");
    D(map, "0 0 1000 250", [["path", { d: "M0 170L65 162 89 189 126 180 139 211 194 190 223 205 259 176 301 185 319 144 367 155 391 110 430 135 469 124 487 158 535 129 567 161 603 131 647 140 666 101 694 121 737 90 774 106 805 66 861 75 896 48 936 73 1000 45", "stroke-width": "2" }], ["path", { d: "M62 115C270 15 348 76 485 63S756 210 927 120", "stroke-dasharray": "5 8" }], ...[[62, 115], [280, 56], [485, 63], [715, 145], [927, 120]].map(([cx, cy]) => ["circle", { cx: String(cx), cy: String(cy), r: "6", fill: "currentColor" }] as Mark)]);
    N(map, "figcaption", "label", "DEPARTURE → OPEN WATER → RETURN");
    const story = N(root, "section", "story");
    story.id = ids[1]!;
    const chapterIds = Array.from({ length: 5 }, () => nextId("homeward-voyage-chapter"));
    const side = N(story, "aside", "chapterindex");
    N(side, "p", "label", "CONTENTS");
    for (const [index, [num, t]] of [["I", "The harbour"], ["II", "A borrowed wind"], ["III", "No familiar stars"], ["IV", "The other shore"], ["V", "A light left on"]].entries()) {
        const row = N(side, "a", "indexrow");
        row.setAttribute("href", `#${chapterIds[index]}`);
        N(row, "span", "", num);
        N(row, "span", "", t);
    }
    const column = N(story, "div", "reading");
    const firstChapter = N(column, "section", "firstchapter");
    firstChapter.id = chapterIds[0]!;
    N(firstChapter, "p", "label", "CHAPTER I / THE HARBOUR");
    N(firstChapter, "h2", "chaptertitle", "You can leave a place.\nIt takes longer to leave\na life.");
    N(firstChapter, "p", "prose", "At first light, the harbour was all ropes and small sounds. A gull stepped between the fish boxes. Somewhere behind the warehouses, a kettle began to sing. These were the things I thought I would forget.");
    N(firstChapter, "p", "prose", "I had packed the map twice and the photograph once. The boat held less than I had expected: a spare shirt, a tin cup, a coil of line. It seemed an impossible arrangement for carrying a whole person into the unknown.");
    const quote = N(firstChapter, "blockquote", "quote", "“The sea offered no promise.\nOnly room.”");
    quote.setAttribute("aria-label", "The sea offered no promise. Only room.");
    N(firstChapter, "p", "prose", "By noon the headland was gone. I looked back at the empty horizon and understood, for the first time, that a departure is not a single act. It is a hundred small refusals to turn around.");
    const chapter2 = N(column, "section", "chapter");
    chapter2.id = chapterIds[1]!;
    N(chapter2, "p", "label", "CHAPTER II / A BORROWED WIND");
    N(chapter2, "h2", "chaptertitle", "A direction is not\nalways a decision.");
    N(chapter2, "p", "prose", "For three days the wind came from the west. I let it choose the course and called that courage. In the evenings, I studied the map as though certainty might appear if I held the paper closer to the lamp.");
    N(chapter2, "p", "prose", "On the fourth morning, the sail fell quiet. The boat turned slowly in its own reflection. I took out the oars. There was no grand revelation, only the plain weight of water against wood. At last the motion belonged to me.");
    const chapter3 = N(column, "section", "chapter");
    chapter3.id = chapterIds[2]!;
    N(chapter3, "p", "label", "CHAPTER III / NO FAMILIAR STARS");
    N(chapter3, "h2", "chaptertitle", "The dark makes\nits own country.");
    N(chapter3, "p", "prose", "The storm arrived after midnight. I lashed the cup to the rail and sat with my back against the cabin door. Every sound seemed to announce an ending. By dawn, only one rope had broken. I had been afraid of a hundred things that never happened.");
    N(chapter3, "p", "prose", "That night the clouds cleared. The stars were unfamiliar, but their distance was the same. I stopped searching for the pattern I knew and began to learn the one above me. For the first time since leaving, I slept without the map beside my hand.");
    const chapter4 = N(column, "section", "chapter");
    chapter4.id = chapterIds[3]!;
    N(chapter4, "p", "label", "CHAPTER IV / THE OTHER SHORE");
    N(chapter4, "h2", "chaptertitle", "A stranger can\nleave the light on.");
    N(chapter4, "p", "prose", "The village had no harbour wall. A woman in a blue apron helped me pull the boat onto the sand, then pointed toward a room above the bakery. We had no language in common. By supper, I knew where the cups were kept.");
    N(chapter4, "p", "prose", "I stayed until the repaired sail was dry. Each morning I carried bread to the landing. Each evening someone asked, with a gesture, whether I would leave tomorrow. The last time, I nodded. It was a different kind of departure: I had learned that leaving need not mean refusing to belong.");
    const chapter5 = N(column, "section", "chapter");
    chapter5.id = chapterIds[4]!;
    N(chapter5, "p", "label", "CHAPTER V / A LIGHT LEFT ON");
    N(chapter5, "h2", "chaptertitle", "Home is a place\nyou enter again.");
    N(chapter5, "p", "prose", "At dusk I saw the headland. The houses rose one by one from the horizon, smaller than memory had made them. I waited outside the harbour until the first window brightened. Then I turned the boat toward shore.");
    N(chapter5, "p", "prose", "The gulls were still arguing over the fish boxes. A kettle sang behind the warehouses. I tied the line, took the photograph from my bag, and stood for a while beside the boat. Nothing had waited unchanged. That was the gift. There was room here for the person who had returned.");
    const notes = N(root, "section", "notes");
    notes.id = ids[2]!;
    N(notes, "p", "label", "READING THE VOYAGE");
    const ng = N(notes, "div", "notesgrid");
    N(ng, "h2", "sectiontitle", "Every return\nchanges the shore.");
    N(ng, "p", "copy", "Read a chapter in one sitting, then let it settle. The story’s five crossings follow departure, doubt, estrangement, recognition and return. The final harbour is familiar; the person entering it is not.");
    N(ng, "p", "label", "READING TIME / 6 MIN\nFORM / LITERARY FICTION\nEDITION / AUTUMN 2026");
    const supplement = N(root, "section", "supplement");
    const button = N(supplement, "button", "note-toggle", "Open the navigator’s note");
    button.setAttribute("type", "button");
    const noteId = nextId("homeward-voyage-note");
    button.setAttribute("aria-controls", noteId);
    button.setAttribute("aria-expanded", "false");
    const note = N(supplement, "div", "note-body");
    note.id = noteId;
    note.hidden = true;
    N(note, "h3", "", "On the unreliable map");
    N(note, "p", "copy", "The route shown here is an imagined coastline. It follows the emotional geography of the story rather than a navigable sea. Each harbour stands for a decision, and every crossing has a cost.");
    const emit = emitter<HomewardVoyageEvents>(host);
    const toggle = (): void => {
        note.hidden = !note.hidden;
        button.setAttribute("aria-expanded", String(!note.hidden));
        emit("reveal", { expanded: !note.hidden });
    };
    button.addEventListener("click", toggle);
    const footer = N(root, "footer", "footer");
    N(footer, "span", "", "ORIGINAL FIELD STUDY / PICAGRAM");
    N(footer, "span", "", "END OF RECORD / 2026");
    sheet.setRules(homewardVoyageRules(sheet.selector));
    attributes.set("data-pica-ready", "true");
    let destroyed = false;
    return {
        update(next) {
            if (destroyed)
                return;
            props = { ...props, ...next };
            titleNode.textContent = props.title;
            descriptionNode.textContent = props.description;
            editionNode.textContent = props.edition;
            attributes.set("aria-label", props.title.replaceAll("\n", " "));
        },
        destroy() {
            if (destroyed)
                return;
            destroyed = true;
            button.removeEventListener("click", toggle);
            root.remove();
            sheet.destroy();
            attributes.restore();
        },
    };
};
