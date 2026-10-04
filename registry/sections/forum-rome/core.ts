import { hostAttributes, nextId, scope } from "../../../lib/host";
import { GRID_FONT } from "../../../lib/font";
import { cssVar } from "../../../lib/palette";
import { emitter } from "../../../lib/events";
import type { Mount } from "../../../lib/types";
export interface ForumRomeProps {
    /** The page headline. Line breaks preserve the editorial composition. */
    title: string;
    /** Introductory copy beneath the headline. */
    description: string;
    /** The archive or programme label in the masthead. */
    edition: string;
}
export interface ForumRomeEvents {
    /** Reports the reader opening or closing the supplementary note. */
    reveal: { expanded: boolean };
}
export const defaults: ForumRomeProps = {
    "title": "THE CITY\nIN COMMON",
    "description": "Two thousand years of public life, read through the stones of the Roman Forum.",
    "edition": "CIVIC ATLAS / EXHIBITION 04"
};
type forumRomeMark = readonly [
    string,
    Record<string, string>
];
function forumRomeNode(parent: Element, tag: keyof HTMLElementTagNameMap, part: string, text?: string): HTMLElement {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    if (part)
        node.dataset.part = part;
    if (text !== undefined)
        node.textContent = text;
    parent.append(node);
    return node;
}
function forumRomeDiagram(parent: Element, box: string, marks: readonly forumRomeMark[]): void {
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
function forumRomeRules(s: string): string {
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
HOST [data-part="title"],HOST [data-part="statement"]{font-family:var(--pica-font-serif,Georgia,serif)}
HOST [data-part="opening"]{display:grid;grid-template-columns:1.15fr 1fr;align-items:center;gap:5%;padding:60px 0 48px}HOST [data-part="title"]{font-size:clamp(3.3rem,7.2vw,6.6rem);line-height:.91;letter-spacing:-.035em;font-weight:500;white-space:pre-line}HOST [data-part="deck"]{max-width:32ch;margin:30px 0;font-size:1.1rem;line-height:1.6}HOST [data-part="arch"]{margin:0;border-bottom:1px solid ${fg};padding:0 12px 20px}HOST [data-part="arch"] svg{width:100%;height:auto}HOST [data-part="arch"] figcaption{text-align:center;margin-top:20px}HOST [data-part="thesis"]{display:grid;grid-template-columns:.65fr 1.2fr 1fr;gap:32px;border-top:1px solid ${fg};padding:42px 0 60px}HOST [data-part="statement"]{font-size:clamp(2rem,3.5vw,3.4rem);font-weight:400;line-height:1.07;white-space:pre-line}HOST [data-part="ledgerrow"]{display:grid;grid-template-columns:70px 1fr 190px;gap:28px;padding:28px 0;border-top:1px solid ${muted}}HOST [data-part="number"]{font-size:2rem}HOST [data-part="ledgertext"] h3{font-weight:500;font-size:1.4rem;margin-bottom:10px}HOST [data-part="ledgertext"] [data-part="copy"]{max-width:66ch}HOST [data-part="visit"]{padding:48px 0 28px}HOST [data-part="visitgrid"]{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:40px}@media(max-width:760px){HOST [data-part="title"],HOST [data-part="statement"]{font-family:var(--pica-font-serif,Georgia,serif)}
HOST [data-part="opening"]{grid-template-columns:1fr;padding-top:40px}HOST [data-part="arch"]{max-width:420px;justify-self:center;margin-top:30px}HOST [data-part="thesis"]{grid-template-columns:1fr;gap:22px}HOST [data-part="ledgerrow"]{grid-template-columns:38px 1fr;gap:16px}HOST [data-part="ledgerrow"]>p{grid-column:2}HOST [data-part="visitgrid"]{grid-template-columns:1fr;gap:24px}}
@media(max-width:760px){HOST [data-part="masthead"]{align-items:flex-start;flex-direction:column;gap:15px}HOST [data-part="page"]{padding-top:20px}HOST [data-part="edition"]{border-left:3px solid ${accent};padding-left:12px}
HOST [data-part="navigation"]{gap:15px}HOST [data-part="footer"]{flex-direction:column;gap:10px}}
`;
    return rules.replaceAll("HOST", s);
}
export const mount: Mount<ForumRomeProps> = (host, initial = {}) => {
    let props: ForumRomeProps = { ...defaults, ...initial };
    const sheet = scope(host);
    const attributes = hostAttributes(host);
    attributes.set("role", "region");
    attributes.set("aria-label", props.title.replaceAll("\n", " "));
    const root = forumRomeNode(host, "div", "page");
    const N = forumRomeNode;
    const D = forumRomeDiagram;
    type Mark = forumRomeMark;
    const ids = [nextId("forum-rome-section"), nextId("forum-rome-section"), nextId("forum-rome-section")];
    const header = N(root, "header", "masthead");
    const editionNode = N(header, "p", "edition", props.edition);
    const nav = N(header, "nav", "navigation");
    nav.setAttribute("aria-label", "Page sections");
    ["The forum", "Excavations", "Visit"].forEach((label, i) => {
        const link = N(nav, "a", "", label);
        link.setAttribute("href", `#${ids[i]}`);
    });
    const opening = N(root, "section", "opening");
    opening.id = ids[0]!;
    const titleBox = N(opening, "div", "titlebox");
    const titleNode = N(titleBox, "h1", "title", props.title);
    N(titleBox, "p", "deck", props.description);
    const descriptionNode = titleBox.lastElementChild as HTMLElement;
    N(titleBox, "p", "label", "ROMA · 41°53′ N / 12°29′ E");
    const plate = N(opening, "figure", "arch");
    D(plate, "0 0 500 440", [
        ["path", { d: "M55 405V210A195 195 0 0 1 445 210V405M140 405V210A110 110 0 0 1 360 210V405M55 210H140M360 210H445M55 405H445", "stroke-width": "2" }],
        ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => ["path", { d: `M${250 + 195 * Math.cos(Math.PI + i * Math.PI / 8)} ${210 + 195 * Math.sin(Math.PI + i * Math.PI / 8)}L${250 + 110 * Math.cos(Math.PI + i * Math.PI / 8)} ${210 + 110 * Math.sin(Math.PI + i * Math.PI / 8)}` }] as Mark),
        ...[250, 290, 330, 370].map(y => ["path", { d: `M55 ${y}H140M360 ${y}H445` }] as Mark),
        ["path", { d: "M25 420H475M250 100V440M15 210H485", "stroke-dasharray": "3 7" }]
    ]);
    N(plate, "figcaption", "label", "PLATE I / ARCH OF THE PUBLIC WAY");
    const thesis = N(root, "section", "thesis");
    N(thesis, "p", "label", "A PLACE BEFORE A MONUMENT");
    N(thesis, "h2", "statement", "Who gets to belong\nto a city?");
    N(thesis, "p", "copy", "Before the Forum was a ruin, it was an argument. Merchants, magistrates, neighbours and strangers shared this narrow valley. Its architecture gave shape to a restless experiment: life in public.");
    const ledger = N(root, "section", "ledger");
    ledger.id = ids[1]!;
    N(ledger, "h2", "sectiontitle", "Excavation ledger");
    for (const [number, title, period, copy] of [["01", "The threshold", "6TH CENTURY BCE", "A road laid across marshland becomes a shared address. Look for the worn central track and the raised edges that kept feet above the water."], ["02", "The speaking place", "1ST CENTURY BCE", "A small platform amplifies a voice into civic power. Recovered fastenings reveal where bronze fittings once held the crowd’s attention."], ["03", "The ordinary fragment", "3RD CENTURY CE", "A scratched measuring weight brings the market into focus. Beside imperial inscriptions, this modest object records a daily act of trust."]]) {
        const row = N(ledger, "article", "ledgerrow");
        N(row, "span", "number", number);
        const text = N(row, "div", "ledgertext");
        N(text, "h3", "", title);
        N(text, "p", "copy", copy);
        N(row, "p", "label", period);
    }
    const visit = N(root, "section", "visit");
    visit.id = ids[2]!;
    N(visit, "h2", "sectiontitle", "Walk the public way");
    const v = N(visit, "div", "visitgrid");
    N(v, "p", "copy", "Start at the east entrance, follow the valley floor, and return through the upper gallery. Allow 75 minutes for the exhibition.");
    N(v, "p", "label", "OPEN TUE–SUN\n09:30–18:00\nLAST ENTRY 17:00");
    N(v, "p", "label", "LEVEL ACCESS VIA EAST GATE\nLARGE PRINT GUIDE AVAILABLE\nQUIET HOUR: THURSDAY 09:30");
    const supplement = N(root, "section", "supplement");
    const button = N(supplement, "button", "note-toggle", "Read the conservation note");
    button.setAttribute("type", "button");
    const noteId = nextId("forum-rome-note");
    button.setAttribute("aria-controls", noteId);
    button.setAttribute("aria-expanded", "false");
    const note = N(supplement, "div", "note-body");
    note.id = noteId;
    note.hidden = true;
    N(note, "h3", "", "The work beneath the work");
    N(note, "p", "copy", "Every exposed surface is a record. Our conservators photograph, map, and stabilize each fragment before it enters the exhibition. Replacement stone is marked discreetly so repair never passes as history.");
    const emit = emitter<ForumRomeEvents>(host);
    const toggle = (): void => {
        note.hidden = !note.hidden;
        button.setAttribute("aria-expanded", String(!note.hidden));
        emit("reveal", { expanded: !note.hidden });
    };
    button.addEventListener("click", toggle);
    const footer = N(root, "footer", "footer");
    N(footer, "span", "", "ORIGINAL FIELD STUDY / PICAGRAM");
    N(footer, "span", "", "END OF RECORD / 2026");
    sheet.setRules(forumRomeRules(sheet.selector));
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
