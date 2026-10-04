import { hostAttributes, nextId, scope } from "../../../lib/host";
import { GRID_FONT } from "../../../lib/font";
import { cssVar } from "../../../lib/palette";
import { emitter } from "../../../lib/events";
import type { Mount } from "../../../lib/types";
export interface PolarExpeditionProps {
    /** The page headline. Line breaks preserve the editorial composition. */
    title: string;
    /** Introductory copy beneath the headline. */
    description: string;
    /** The archive or programme label in the masthead. */
    edition: string;
}
export interface PolarExpeditionEvents {
    /** Reports the reader opening or closing the supplementary note. */
    reveal: { expanded: boolean };
}
export const defaults: PolarExpeditionProps = {
    "title": "At the edge\nof the known.",
    "description": "Route notes, collected specimens and four dispatches from the fictional White Reach expedition.",
    "edition": "WHITE REACH / FIELD NOTEBOOK 09"
};
type polarExpeditionMark = readonly [
    string,
    Record<string, string>
];
function polarExpeditionNode(parent: Element, tag: keyof HTMLElementTagNameMap, part: string, text?: string): HTMLElement {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    if (part)
        node.dataset.part = part;
    if (text !== undefined)
        node.textContent = text;
    parent.append(node);
    return node;
}
function polarExpeditionDiagram(parent: Element, box: string, marks: readonly polarExpeditionMark[]): void {
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
function polarExpeditionRules(s: string): string {
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
HOST [data-part="cover"]{display:grid;grid-template-columns:1fr 1fr;gap:65px;padding:48px 0 60px;align-items:center}HOST [data-part="title"]{font-size:clamp(3.4rem,6.5vw,6.2rem);font-weight:450;letter-spacing:-.05em;line-height:1;white-space:pre-line;margin:26px 0}HOST [data-part="deck"]{font-size:1.08rem;line-height:1.7;max-width:38ch}HOST [data-part="route"]{border:1px solid ${muted};padding:20px;margin:0}HOST [data-part="route"] svg{width:100%;height:auto}HOST [data-part="route"] figcaption{border-top:1px solid ${muted};padding-top:18px;font-size:.67rem}HOST [data-part="record"]{display:grid;grid-template-columns:.8fr 1.7fr;gap:65px;border-top:1px solid ${fg};padding:35px 0 50px}HOST [data-part="recordtitle"] h2{white-space:pre-line;margin-top:24px}HOST [data-part="specimen"]{display:grid;grid-template-columns:70px 1fr;gap:22px;padding:25px 0;border-bottom:1px solid ${muted}}HOST [data-part="code"]{font-family:${GRID_FONT};font-size:1.1rem}HOST [data-part="specimen"] h3{font-size:1.35rem;font-weight:500;margin-bottom:10px}HOST [data-part="specimen"] [data-part="copy"]{margin-top:15px}HOST [data-part="dispatches"]{border-top:1px solid ${fg};padding-top:35px}HOST [data-part="dispatchgrid"]{display:grid;grid-template-columns:repeat(4,1fr);gap:28px;margin:30px 0}HOST [data-part="dispatch"]{border-left:1px solid ${muted};padding-left:20px}HOST [data-part="dispatch"] h3{font-weight:500;font-size:1.2rem;line-height:1.3;margin:20px 0 12px}HOST [data-part="closing"]{font-size:clamp(1.5rem,2.6vw,2.25rem);line-height:1.35;max-width:700px;margin:55px 0 40px;letter-spacing:-.025em}@media(max-width:1000px){HOST [data-part="dispatchgrid"]{grid-template-columns:repeat(2,1fr)}}
@media(max-width:760px){HOST [data-part="cover"]{grid-template-columns:1fr;gap:32px;padding-top:32px}HOST [data-part="route"]{max-width:470px;justify-self:center}HOST [data-part="record"]{grid-template-columns:1fr;gap:20px}HOST [data-part="specimen"]{grid-template-columns:52px 1fr;gap:15px}HOST [data-part="dispatchgrid"]{grid-template-columns:repeat(2,1fr);gap:28px 22px}HOST [data-part="dispatch"]{padding-left:12px}}@media(max-width:430px){HOST [data-part="dispatchgrid"]{grid-template-columns:1fr}HOST [data-part="dispatch"]{padding-bottom:20px;border-bottom:1px solid ${muted}}}
@media(max-width:760px){HOST [data-part="masthead"]{align-items:flex-start;flex-direction:column;gap:15px}HOST [data-part="page"]{padding-top:20px}HOST [data-part="edition"]{border-left:3px solid ${accent};padding-left:12px}
HOST [data-part="navigation"]{gap:15px}HOST [data-part="footer"]{flex-direction:column;gap:10px}}
`;
    return rules.replaceAll("HOST", s);
}
export const mount: Mount<PolarExpeditionProps> = (host, initial = {}) => {
    let props: PolarExpeditionProps = { ...defaults, ...initial };
    const sheet = scope(host);
    const attributes = hostAttributes(host);
    attributes.set("role", "region");
    attributes.set("aria-label", props.title.replaceAll("\n", " "));
    const root = polarExpeditionNode(host, "div", "page");
    const N = polarExpeditionNode;
    const D = polarExpeditionDiagram;
    type Mark = polarExpeditionMark;
    const ids = [nextId("polar-expedition-section"), nextId("polar-expedition-section"), nextId("polar-expedition-section")];
    const header = N(root, "header", "masthead");
    const editionNode = N(header, "p", "edition", props.edition);
    const nav = N(header, "nav", "navigation");
    nav.setAttribute("aria-label", "Page sections");
    ["Route", "Specimens", "Dispatches"].forEach((label, i) => {
        const link = N(nav, "a", "", label);
        link.setAttribute("href", `#${ids[i]}`);
    });
    const cover = N(root, "section", "cover");
    cover.id = ids[0]!;
    const headline = N(cover, "div", "headline");
    N(headline, "p", "label", "AN EXPEDITION IN ATTENTION / 81° N");
    const titleNode = N(headline, "h1", "title", props.title);
    const descriptionNode = N(headline, "p", "deck", props.description);
    const map = N(cover, "figure", "route");
    D(map, "0 0 500 430", [["path", { d: "M10 160Q130 30 270 140T490 65M0 230Q115 95 260 200T500 135M0 310Q130 175 275 260T500 215M20 395Q150 260 290 330T490 300" }], ["path", { d: "M75 365L178 278 222 188 336 131 390 64", "stroke-width": "2", "stroke-dasharray": "6 5" }], ...[[75, 365], [178, 278], [222, 188], [336, 131], [390, 64]].map(([cx, cy]) => ["circle", { cx: String(cx), cy: String(cy), r: "6", fill: "currentColor" }] as Mark), ["path", { d: "M452 360V304M444 314L452 304 460 314M32 401H132M32 396V406M132 396V406" }]]);
    N(map, "figcaption", "label", "FIVE STATIONS / 42 KM / NORTH ↑");
    const record = N(root, "section", "record");
    record.id = ids[1]!;
    const rid = N(record, "div", "recordtitle");
    N(rid, "p", "label", "COLLECTION RECORD / 03 ITEMS");
    N(rid, "h2", "sectiontitle", "Small evidence\nof a vast place.");
    const specimens = N(record, "div", "specimens");
    for (const [code, name, where, text] of [["S–01", "Wind-polished stone", "STATION 02 / WEST MORAINE", "One face smooth, one face rough. The exposed edge shows the prevailing wind better than our compass notes."], ["S–02", "Ice core fragment", "STATION 03 / RIDGE SHELF", "Three clear layers separated by a thin band of trapped air. Photographed in place, then returned to the shelf."], ["S–03", "Lichen trace", "STATION 05 / RETURN POINT", "A small colony on the sheltered side of a boulder. Its presence changes our sense of what can endure here."]]) {
        const s = N(specimens, "article", "specimen");
        N(s, "p", "code", code);
        const c = N(s, "div", "");
        N(c, "h3", "", name);
        N(c, "p", "label", where);
        N(c, "p", "copy", text);
    }
    const dispatch = N(root, "section", "dispatches");
    dispatch.id = ids[2]!;
    N(dispatch, "h2", "sectiontitle", "From the field");
    const dg = N(dispatch, "div", "dispatchgrid");
    for (const [n, day, title, copy] of [["01", "04 OCT / 07:40", "A line to follow", "We laid the first markers before the light rose. From camp, they look less like a route than a sentence waiting to be finished."], ["02", "06 OCT / 13:10", "The sound of stillness", "The wind stopped at noon. We could hear the buckles on each other’s packs. For six minutes, the place seemed almost close."], ["03", "08 OCT / 16:25", "Weather turns", "Cloud crossed the ridge faster than expected. We ended the survey with one station unrecorded. The blank belongs in the notebook."], ["04", "09 OCT / 09:05", "The return", "Our own footprints had softened overnight. The markers held. We reached camp with three specimens and a better question."]]) {
        const c = N(dg, "article", "dispatch");
        N(c, "p", "label", n + " / " + day);
        N(c, "h3", "", title);
        N(c, "p", "copy", copy);
    }
    const final = N(root, "p", "closing", "What we brought back was not a claim on the place. It was a record of having paid attention.");
    final.setAttribute("role", "note");
    const supplement = N(root, "section", "supplement");
    const button = N(supplement, "button", "note-toggle", "Read the field safety note");
    button.setAttribute("type", "button");
    const noteId = nextId("polar-expedition-note");
    button.setAttribute("aria-controls", noteId);
    button.setAttribute("aria-expanded", "false");
    const note = N(supplement, "div", "note-body");
    note.id = noteId;
    note.hidden = true;
    N(note, "h3", "", "The rule of the return route");
    N(note, "p", "copy", "At each station the team marks a return bearing before beginning observations. If visibility falls below the next marker, work stops and the party returns together. A specimen is never worth losing the route home.");
    const emit = emitter<PolarExpeditionEvents>(host);
    const toggle = (): void => {
        note.hidden = !note.hidden;
        button.setAttribute("aria-expanded", String(!note.hidden));
        emit("reveal", { expanded: !note.hidden });
    };
    button.addEventListener("click", toggle);
    const footer = N(root, "footer", "footer");
    N(footer, "span", "", "ORIGINAL FIELD STUDY / PICAGRAM");
    N(footer, "span", "", "END OF RECORD / 2026");
    sheet.setRules(polarExpeditionRules(sheet.selector));
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
