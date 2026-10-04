import { hostAttributes, nextId, scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import { GRID_FONT } from "../../../lib/font";
import { sameJson } from "../../../lib/json";
import type { Mount } from "../../../lib/types";
export interface MonographSpreadProps {
    /** The book title. */
    title: string;
    /** The artist name. */
    artist: string;
    /** The book subtitle. */
    deck: string;
    /** The opening essay paragraph. */
    essay: string;
}
export const defaults: MonographSpreadProps = {
    title: "Making space\nfor silence",
    artist: "MARA VOSS",
    deck: "Selected works and working notes, 2018–2026.",
    essay: "A room is never empty. It holds the distance between a body and a wall, the time between a footstep and its echo. These works begin with that interval.",
};
function msNode<K extends keyof HTMLElementTagNameMap>(parent: Element, tag: K, part: string, text?: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    if (part)
        node.dataset.part = part;
    if (text !== undefined)
        node.textContent = text;
    parent.append(node);
    return node;
}
function msLink(parent: Element, text: string, id: string): void {
    const link = msNode(parent, "a", "", text);
    link.href = `#${id}`;
}
function msSvg(parent: Element, tag: string, attrs: Record<string, string>, text?: string): SVGElement {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    node.setAttribute("data-pica", "");
    for (const [key, value] of Object.entries(attrs))
        node.setAttribute(key, value);
    if (text !== undefined)
        node.textContent = text;
    parent.append(node);
    return node;
}
function msRules(s: string): string {
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
  ${s} [data-part="cover"]{padding:3rem 0 4rem;margin-left:12%}
  ${s} [data-part="cover"]>[data-part="label"]{border-left:4px solid ${cssVar("accent")};padding-left:1rem}
  ${s} [data-part="cover"] h1{white-space:pre-line;font-family:var(--pica-font-serif,inherit);font-size:clamp(3rem,6.5vw,6rem);font-weight:400;letter-spacing:-.055em;line-height:1.04;max-width:12ch;margin:1rem 0}
  ${s} [data-part="deck"]{font-size:1.2rem;line-height:1.5}
  ${s} [data-part="nav"]{display:flex;gap:2rem;margin-top:2rem}
  ${s} [data-part="spread"]{display:grid;grid-template-columns:1fr 1fr;border-block:1px solid ${cssVar("fg")}}
  ${s} [data-part="plate"],${s} [data-part="right-page"]{margin:0;position:relative;padding:2.5rem 2rem 5.5rem}
  ${s} [data-part="plate"]{border-right:1px solid ${cssVar("muted")}}
  ${s} [data-part="plate"] svg{width:100%;height:auto}
  ${s} .ink{fill:${cssVar("fg")}}
  ${s} .cut{fill:${cssVar("bg")};stroke:${cssVar("fg")};stroke-width:1}
  ${s} .tone{fill:${cssVar("muted")}}
  ${s} .rule{fill:none;stroke:${cssVar("fg")};stroke-width:1}
  ${s} .accent-rule{fill:none;stroke:${cssVar("accent")};stroke-width:4}
  ${s} [data-part="caption"]{font: .7rem/1.6 ${GRID_FONT};color:${cssVar("muted")};max-width:31rem}
  ${s} [data-part="folio"]{position:absolute;bottom:1rem;left:2rem;font:4rem/1 ${GRID_FONT};letter-spacing:-.08em;color:${cssVar("muted")}}
  ${s} [data-part="right-page"] h2{font-size:2.4rem;font-family:var(--pica-font-serif,inherit);font-weight:400;line-height:1.1;margin:2rem 0 1.5rem}
  ${s} [data-part="mini"]{margin:2.5rem 0 0}
  ${s} [data-part="mini"] svg{width:100%;height:auto}
  ${s} [data-part="essay"]{display:grid;grid-template-columns:12% 1fr;gap:1rem;padding:4rem 0}
  ${s} [data-part="chapter"]{font:3rem ${GRID_FONT};color:${cssVar("fg")}}
  ${s} [data-part="essay"] h2{font-size:2.4rem;font-family:var(--pica-font-serif,inherit);font-weight:400;margin:1rem 0 2rem}
  ${s} [data-part="essay-columns"]{columns:2;column-gap:3rem}
  ${s} [data-part="essay-columns"] p{margin:0 0 1rem}
  ${s} [data-part="notes"]{border-top:1px solid ${cssVar("fg")};padding-top:1.5rem;max-width:48rem;margin-left:12%}@media(max-width:700px){${s} [data-part="cover"]{margin-left:0;padding:2.5rem 0}
  ${s} [data-part="spread"]{grid-template-columns:1fr}
  ${s} [data-part="plate"]{border-right:0;border-bottom:1px solid ${cssVar("muted")}}
  ${s} [data-part="plate"],${s} [data-part="right-page"]{padding:1.5rem 0 5.5rem}
  ${s} [data-part="folio"]{left:0}
  ${s} [data-part="plate"] svg{max-height:370px}
  ${s} [data-part="essay"]{grid-template-columns:1fr;padding:2.5rem 0}
  ${s} [data-part="essay-columns"]{columns:1}
  ${s} [data-part="notes"]{margin-left:0}
  ${s} [data-part="nav"]{gap:1rem}
  ${s} [data-part="cover"]>[data-part="label"]{border-left:4px solid ${cssVar("accent")};padding-left:1rem}
  ${s} [data-part="cover"] h1{font-size:3.6rem}}
  `;
}
export const mount: Mount<MonographSpreadProps> = (host, initial = {}) => {
    let props: MonographSpreadProps = { ...defaults, ...initial };
    const attrs = hostAttributes(host);
    attrs.set("data-pica-id", host.getAttribute("data-pica-id"));
    const sheet = scope(host);
    const root = msNode(host, "article", "page");
    const ids = [nextId("monograph-spread"), nextId("monograph-spread"), nextId("monograph-spread")];
    sheet.setRules(msRules(sheet.selector));
    function render(p: MonographSpreadProps): void {
        root.replaceChildren();
        attrs.set("role", "region");
        attrs.set("aria-label", p.title.replace(/\n/g, " "));
        attrs.set("aria-hidden", null);
        const mast = msNode(root, "header", "mast");
        msNode(mast, "span", "label", "FIELD EDITIONS / MONOGRAPH 08");
        msNode(mast, "span", "label", p.artist);
        const cover = msNode(root, "section", "cover");
        msNode(cover, "p", "label", "ON SPACE, MATERIAL & ATTENTION");
        msNode(cover, "h1", "", p.title);
        msNode(cover, "p", "deck", p.deck);
        const nav = msNode(cover, "nav", "nav");
        nav.setAttribute("aria-label", "Book chapters");
        msLink(nav, "I · Work", ids[0]!);
        msLink(nav, "II · Essay", ids[1]!);
        msLink(nav, "III · Notes", ids[2]!);
        const spread = msNode(root, "section", "spread");
        spread.id = ids[0]!;
        const left = msNode(spread, "figure", "plate");
        const art = msSvg(left, "svg", { viewBox: "0 0 500 480", role: "img", "aria-label": "Geometric study of a suspended square and its stepped shadow" });
        msSvg(art, "path", { d: "M85 365H410V395H85Z M115 335H380V365H115Z M145 305H350V335H145Z", class: "tone" });
        msSvg(art, "path", { d: "M148 87H358V297H148Z M178 117V267H328V117Z", class: "ink", "fill-rule": "evenodd" });
        msSvg(art, "path", { d: "M253 27V87 M65 425H435", class: "rule" });
        msNode(left, "figcaption", "caption", "FIG. 01 / INTERVAL, 2024. Folded aluminium, suspended 110 cm above the floor.");
        msNode(left, "span", "folio", "012");
        const right = msNode(spread, "div", "right-page");
        msNode(right, "p", "label", "I / SELECTED WORK");
        msNode(right, "h2", "", "The object and its absence");
        msNode(right, "p", "body", "The frame describes a volume it does not occupy. A changing shadow completes the sculpture, making the visitor an observer of time rather than an owner of a single view.");
        const mini = msNode(right, "figure", "mini");
        const ma = msSvg(mini, "svg", { viewBox: "0 0 440 190", role: "img", "aria-label": "Three paired line studies of frames at different widths" });
        for (const [x, w] of [[25, 80], [155, 105], [305, 110]] as const) {
            msSvg(ma, "rect", { x: String(x), y: "25", width: String(w), height: "130", class: "rule" });
            msSvg(ma, "path", { d: `M${x + 15} 40V140H${x + w - 15}`, class: "accent-rule" });
        }
        msNode(mini, "figcaption", "caption", "FIG. 02 / Three rehearsals for a frame. Graphite on paper, 2019.");
        msNode(right, "span", "folio", "013");
        const essay = msNode(root, "section", "essay");
        essay.id = ids[1]!;
        msNode(essay, "div", "chapter", "II");
        const ec = msNode(essay, "div", "");
        msNode(ec, "p", "label", "AN ESSAY BY THE ARTIST");
        msNode(ec, "h2", "", "The measure of an interval");
        const cols = msNode(ec, "div", "essay-columns");
        msNode(cols, "p", "body", p.essay);
        msNode(cols, "p", "body", "I work by removing what a form can afford to lose. A support becomes a line; a line becomes a pause. The remainder must be specific enough to invite attention and open enough to give it somewhere to go.");
        msNode(cols, "p", "body", "The works are not instructions for stillness. They are small instruments for noticing change: the afternoon light, a shifting weight, another person entering the room. The material keeps the record.");
        const notes = msNode(root, "footer", "notes");
        notes.id = ids[2]!;
        msNode(notes, "h2", "label", "III / WORKING NOTES");
        msNode(notes, "p", "body", "Studio: North Quay. Materials: aluminium, graphite, cotton paper. Installation dimensions vary with the room. All forms and texts in this edition are original studies.");
        const detail = msNode(notes, "details", "");
        msNode(detail, "summary", "", "View the edition colophon");
        msNode(detail, "p", "caption", "Field Editions No. 08. Edited and arranged as a fictional artist book. Plate drawings are procedural vector studies. Published 2026. Reading time: approximately four minutes.");
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
