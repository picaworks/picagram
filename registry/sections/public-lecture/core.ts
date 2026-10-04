import { hostAttributes, nextId, scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import { GRID_FONT } from "../../../lib/font";
import { sameJson } from "../../../lib/json";
import type { Mount } from "../../../lib/types";
export interface PublicLectureProps {
    /** The lecture question. */
    title: string;
    /** The speaker name. */
    speaker: string;
    /** The event date. */
    date: string;
    /** The lecture thesis. */
    thesis: string;
}
export const defaults: PublicLectureProps = {
    title: "Can a city\nlearn to listen?",
    speaker: "DR. ELIAN PARK",
    date: "THURSDAY 19 NOVEMBER 2026",
    thesis: "A city becomes more intelligent when it makes room for disagreement. Listening is not a passive act. It is a form of public infrastructure.",
};
function plNode<K extends keyof HTMLElementTagNameMap>(parent: Element, tag: K, part: string, text?: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    if (part)
        node.dataset.part = part;
    if (text !== undefined)
        node.textContent = text;
    parent.append(node);
    return node;
}
function plLink(parent: Element, text: string, id: string): void {
    const link = plNode(parent, "a", "", text);
    link.href = `#${id}`;
}
function plSvg(parent: Element, tag: string, attrs: Record<string, string>, text?: string): SVGElement {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    node.setAttribute("data-pica", "");
    for (const [key, value] of Object.entries(attrs))
        node.setAttribute(key, value);
    if (text !== undefined)
        node.textContent = text;
    parent.append(node);
    return node;
}
function plRules(s: string): string {
    return `
  ${s}{box-sizing:border-box;color:${cssVar("fg")};background:${cssVar("bg")};font-family:var(--pica-font-sans,inherit)}
  ${s} [data-part="page"]{padding:clamp(1.25rem,4.5vw,4.5rem);max-width:1280px;margin:auto}
  ${s} *,${s} *:before,${s} *:after{box-sizing:border-box}
  ${s} section,${s} figure,${s} div{min-width:0}
  ${s} [data-part="label"]{font:.7rem/1.65 ${GRID_FONT};letter-spacing:.06em}
  ${s} [data-part="body"]{font-size:1rem;line-height:1.65}
  ${s} a{color:${cssVar("fg")};font:.75rem/1.65 ${GRID_FONT};text-underline-offset:4px}
  ${s} a:focus-visible,${s} summary:focus-visible{outline:2px solid ${cssVar("accent")};outline-offset:4px}
  ${s} details{margin-top:1rem}
  ${s} summary{cursor:pointer;font:.8rem/1.6 ${GRID_FONT};padding:.6rem 0}
  ${s} h1,${s} h2,${s} h3,${s} p{overflow-wrap:break-word}
  ${s} [data-part="mast"]{display:flex;justify-content:space-between;border-bottom:1px solid ${cssVar("fg")};padding-bottom:1rem;gap:1rem}
  ${s} [data-part="nav"]{display:flex;flex-wrap:wrap;gap:2rem;padding:1rem 0}
  ${s} [data-part="argument"]{display:grid;grid-template-columns:.85fr 1.15fr;gap:4rem;padding:3rem 0}
  ${s} [data-part="board"]{margin:0;border:1px solid ${cssVar("muted")};padding:1.4rem;align-self:start}
  ${s} [data-part="board"] svg{width:100%;height:auto}
  ${s} .circle{fill:none;stroke:${cssVar("muted")};stroke-width:1;stroke-dasharray:3 5}
  ${s} .arrow{fill:none;stroke:${cssVar("accent")};stroke-width:3}
  ${s} .diagram-label{font:12px ${GRID_FONT};fill:${cssVar("fg")};text-anchor:middle}
  ${s} [data-part="formula"]{font:clamp(.8rem,1.2vw,1.1rem) ${GRID_FONT};padding:1rem 0;border-top:1px solid ${cssVar("muted")}}
  ${s} [data-part="caption"]{font-size:.85rem;line-height:1.6;color:${cssVar("muted")}}
  ${s} [data-part="speaker"]{font:1rem ${GRID_FONT};color:${cssVar("muted")}}
  ${s} [data-part="thesis"] h1{font-family:var(--pica-font-serif,inherit);font-size:clamp(3rem,5.5vw,5.4rem);font-weight:400;white-space:pre-line;letter-spacing:-.05em;line-height:1.02;margin:1.5rem 0}
  ${s} [data-part="statement"]{font-size:1.45rem;line-height:1.5;margin:2rem 0}
  ${s} [data-part="programme"]{border-top:3px solid ${cssVar("fg")};padding:2rem 0}
  ${s} [data-part="programme"] h2{font-size:2rem;font-weight:400;margin:0 0 2rem}
  ${s} [data-part="program-row"]{display:grid;grid-template-columns:6rem 4rem 1fr;gap:1.5rem;border-top:1px solid ${cssVar("muted")};padding:1.5rem 0}
  ${s} [data-part="part"]{font:2rem ${GRID_FONT};color:${cssVar("fg")}}
  ${s} [data-part="program-row"] h3{font-size:1.4rem;margin:0}
  ${s} [data-part="attend"]{display:grid;grid-template-columns:1fr 1fr;gap:2rem 4rem;padding:2rem 0;border-top:1px solid ${cssVar("fg")}}
  ${s} [data-part="attend"] h2{font-size:2.3rem;font-family:var(--pica-font-serif,inherit);font-weight:400;line-height:1.1;margin:0}
  ${s} [data-part="reservation"]{border:1px solid ${cssVar("fg")};align-self:start;padding:1.2rem}
  ${s} [data-part="attend"]>[data-part="caption"]{grid-column:1/-1;max-width:45rem}
  ${s} [data-part="footer"]{font:.7rem ${GRID_FONT};border-top:1px solid ${cssVar("muted")};padding-top:1.5rem}@media(max-width:740px){${s} [data-part="argument"]{grid-template-columns:1fr;gap:2rem;padding:2rem 0}
  ${s} [data-part="thesis"]{grid-row:1}
  ${s} [data-part="board"]{max-width:30rem;width:100%;box-sizing:border-box}
  ${s} [data-part="program-row"]{grid-template-columns:4.5rem 2.5rem 1fr;gap:.7rem}
  ${s} [data-part="part"]{font-size:1.5rem}
  ${s} [data-part="attend"]{grid-template-columns:1fr}
  ${s} [data-part="thesis"] h1{font-size:3.6rem}
  ${s} [data-part="statement"]{font-size:1.2rem}}
  @media(max-width:900px){${s} .diagram-label{font-size:20px}}
  `;
}
export const mount: Mount<PublicLectureProps> = (host, initial = {}) => {
    let props: PublicLectureProps = { ...defaults, ...initial };
    const attrs = hostAttributes(host);
    attrs.set("data-pica-id", host.getAttribute("data-pica-id"));
    const sheet = scope(host);
    const root = plNode(host, "article", "page");
    const ids = [nextId("public-lecture"), nextId("public-lecture"), nextId("public-lecture")];
    sheet.setRules(plRules(sheet.selector));
    function render(p: PublicLectureProps): void {
        root.replaceChildren();
        attrs.set("role", "region");
        attrs.set("aria-label", p.title.replace(/\n/g, " "));
        attrs.set("aria-hidden", null);
        const head = plNode(root, "header", "mast");
        plNode(head, "span", "label", "THE PUBLIC LECTURES / 07");
        plNode(head, "span", "label", "SCHOOL OF COMMON INQUIRY");
        const nav = plNode(root, "nav", "nav");
        nav.setAttribute("aria-label", "Lecture sections");
        plLink(nav, "The proposition", ids[0]!);
        plLink(nav, "Programme", ids[1]!);
        plLink(nav, "Attend", ids[2]!);
        const argument = plNode(root, "section", "argument");
        argument.id = ids[0]!;
        const board = plNode(argument, "figure", "board");
        plNode(board, "p", "label", "WORKING MODEL / NOT A SOLUTION");
        const svg = plSvg(board, "svg", { viewBox: "0 0 460 440", role: "img", "aria-label": "A feedback loop connects speaking, listening, and revising; care surrounds the loop" });
        for (const [cx, cy, r] of [[230, 220, 165], [230, 220, 95]])
            plSvg(svg, "circle", { cx: String(cx), cy: String(cy), r: String(r), class: "circle" });
        plSvg(svg, "path", { d: "M80 155L105 120L130 149 M348 92L373 120L340 137 M300 366L266 380L261 345", class: "arrow" });
        for (const [x, y, txt] of [[120, 220, "SPEAK"], [235, 140, "LISTEN"], [300, 300, "REVISE"]])
            plSvg(svg, "text", { x: String(x), y: String(y), class: "diagram-label" }, String(txt));
        plSvg(svg, "text", { x: "230", y: "50", class: "diagram-label" }, "CARE");
        plNode(board, "figcaption", "formula", "public intelligence = attention × trust");
        plNode(board, "p", "caption", "A provisional equation. Neither term can be supplied by technology alone.");
        const thesis = plNode(argument, "div", "thesis");
        plNode(thesis, "p", "label", "A LECTURE WITH");
        plNode(thesis, "p", "speaker", p.speaker);
        plNode(thesis, "h1", "", p.title);
        plNode(thesis, "p", "statement", p.thesis);
        plNode(thesis, "p", "label", p.date);
        plNode(thesis, "p", "body", "18:30–20:30 · Assembly Theatre · Free and open to all");
        const programme = plNode(root, "section", "programme");
        programme.id = ids[1]!;
        plNode(programme, "h2", "", "An evening in three movements");
        for (const [time, part, title, body] of [["18:30", "01", "Make the case", "Why listening deserves a budget, a building, and a place in civic life."], ["19:15", "02", "Test the argument", "Three local organisers respond with stories from libraries, streets, and neighbourhood councils."], ["19:45", "03", "Open the floor", "Questions, disagreements, and a shared list of what we still need to learn."]]) {
            const row = plNode(programme, "div", "program-row");
            plNode(row, "span", "label", time);
            plNode(row, "span", "part", part);
            const col = plNode(row, "div", "");
            plNode(col, "h3", "", title);
            plNode(col, "p", "body", body);
        }
        const attend = plNode(root, "section", "attend");
        attend.id = ids[2]!;
        const intro = plNode(attend, "div", "");
        plNode(intro, "h2", "", "Take a seat. Bring a question.");
        plNode(intro, "p", "body", "The room has 180 seats, including wheelchair spaces. Doors open at 18:00. The lecture will include live captions and a hearing loop.");
        const d = plNode(attend, "details", "reservation");
        plNode(d, "summary", "", "Reservation and access information");
        plNode(d, "p", "body", "Reservations are free and available at the theatre desk, Monday to Friday, 12:00–18:00. Walk-in seats are held until 18:20. Enter via the courtyard ramp; ushers can help with accessible seating.");
        plNode(attend, "p", "caption", "ABOUT THE SPEAKER / Elian Park studies how public institutions turn attention into action. Their current work follows listening practices in neighbourhood assemblies.");
        plNode(root, "footer", "footer", "PUBLIC LECTURES · IDEAS BELONG IN PUBLIC · SERIES 2026");
    }
    render(props);
    attrs.set("data-pica-ready", "true");
    let destroyed = false;
    return {
        update(next) {
            if (destroyed) return;
            const merged = { ...props, ...next };
            if (!sameJson(props, merged)) {
                props = merged;
                render(props);
            }
        },
        destroy() {
            if (destroyed) return;
            destroyed = true;
            root.remove();
            sheet.destroy();
            attrs.restore();
        },
    };
};
