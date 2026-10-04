import { hostAttributes, nextId, scope } from "../../../lib/host";
import { cssOn, cssVar } from "../../../lib/palette";
import { GRID_FONT } from "../../../lib/font";
import { sameJson } from "../../../lib/json";
import type { Mount } from "../../../lib/types";
export interface CartographicStoryProps {
    /** The story title. */
    title: string;
    /** The story introduction. */
    deck: string;
    /** The essay byline. */
    byline: string;
    /** The journey essay opening. */
    essay: string;
}
export const defaults: CartographicStoryProps = {
    title: "Following the\nwaterline",
    deck: "A walk through the places where a river has changed its mind.",
    byline: "WORDS & DRAWINGS / ADA REED",
    essay: "The river is an unreliable historian. It carries a story forward, then leaves a bend behind. On this walk, the old channel appears first as a dip in a field and later as a line of gardens.",
};
function csNode<K extends keyof HTMLElementTagNameMap>(parent: Element, tag: K, part: string, text?: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    if (part)
        node.dataset.part = part;
    if (text !== undefined)
        node.textContent = text;
    parent.append(node);
    return node;
}
function csLink(parent: Element, text: string, id: string): void {
    const link = csNode(parent, "a", "", text);
    link.href = `#${id}`;
}
function csSvg(parent: Element, tag: string, attrs: Record<string, string>, text?: string): SVGElement {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    node.setAttribute("data-pica", "");
    for (const [key, value] of Object.entries(attrs))
        node.setAttribute(key, value);
    if (text !== undefined)
        node.textContent = text;
    parent.append(node);
    return node;
}
function csRules(s: string): string {
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
  ${s} [data-part="mast"]{display:flex;justify-content:space-between;border-bottom:1px solid ${cssVar("fg")};gap:1rem;padding-bottom:1rem}
  ${s} [data-part="heading"]{display:grid;grid-template-columns:1.3fr 1fr;align-items:end;gap:2rem;padding:3rem 0}
  ${s} [data-part="heading"] h1{font-family:var(--pica-font-serif,inherit);font-size:clamp(3rem,6vw,5.8rem);font-weight:400;line-height:1.03;letter-spacing:-.055em;white-space:pre-line;margin:0}
  ${s} [data-part="deck"]{font-size:1.4rem;line-height:1.5;max-width:25ch}
  ${s} [data-part="nav"]{grid-column:1/-1;display:flex;gap:2rem;border-top:1px solid ${cssVar("muted")};padding-top:1rem}
  ${s} [data-part="journey"]{display:grid;grid-template-columns:1.1fr 1fr;gap:3rem;border-top:1px solid ${cssVar("fg")};padding-top:2rem}
  ${s} [data-part="map"]{margin:0;border-right:1px solid ${cssVar("muted")};padding-right:2rem}
  ${s} [data-part="map"] svg{width:100%;height:auto}
  ${s} .contour{fill:none;stroke:${cssVar("muted")};stroke-width:1}
  ${s} .river{fill:none;stroke:${cssVar("muted")};stroke-width:22}
  ${s} .route{fill:none;stroke:${cssVar("accent")};stroke-width:3;stroke-dasharray:7 5}
  ${s} .road{fill:none;stroke:${cssVar("fg")};stroke-width:1}
  ${s} .waypoint{fill:${cssVar("fg")};stroke:${cssVar("fg")};stroke-width:1}
  ${s} .map-number{fill:${cssOn("fg")};font:11px ${GRID_FONT};text-anchor:middle}
  ${s} .map-text{fill:${cssVar("fg")};font:10px ${GRID_FONT};text-anchor:middle}
  ${s} .north{fill:none;stroke:${cssVar("fg")};stroke-width:1.5}
  ${s} [data-part="caption"]{font:.72rem/1.6 ${GRID_FONT};color:${cssVar("muted")}}
  ${s} [data-part="stop"]{display:grid;grid-template-columns:3rem 1fr;gap:1rem;padding:1rem 0 1.4rem;border-bottom:1px solid ${cssVar("muted")}}
  ${s} [data-part="stop-number"]{font:2rem ${GRID_FONT};color:${cssVar("fg")}}
  ${s} [data-part="stop"] h2{font-family:var(--pica-font-serif,inherit);font-size:1.8rem;font-weight:400;margin:.75rem 0}
  ${s} [data-part="stop"] [data-part="label"]{margin-top:0}
  ${s} [data-part="essay"]{padding:3rem 0 3rem 15%;border-bottom:1px solid ${cssVar("fg")}}
  ${s} [data-part="essay"] h2{font-family:var(--pica-font-serif,inherit);font-size:2.5rem;font-weight:400}
  ${s} [data-part="lead"]{font-size:1.45rem;line-height:1.6;max-width:40rem}
  ${s} [data-part="essay-columns"]{display:grid;grid-template-columns:1fr 1fr;gap:3rem}
  ${s} [data-part="notes"]{padding-top:1.5rem;max-width:44rem}@media(max-width:720px){${s} [data-part="heading"]{grid-template-columns:1fr;padding:2rem 0;gap:1rem}
  ${s} [data-part="heading"] h1{font-size:3.6rem}
  ${s} [data-part="deck"]{max-width:none;font-size:1.2rem}
  ${s} [data-part="nav"]{gap:1rem;flex-wrap:wrap}
  ${s} [data-part="journey"]{grid-template-columns:1fr;gap:1rem}
  ${s} [data-part="map"]{border-right:0;padding-right:0;max-width:32rem}
  ${s} [data-part="map"] svg{max-height:560px}
  ${s} [data-part="essay"]{padding:2rem 0}
  ${s} [data-part="essay-columns"]{grid-template-columns:1fr;gap:0}
  ${s} [data-part="lead"]{font-size:1.2rem}}
  @media(max-width:900px){${s} .map-number{font-size:18px}${s} .map-text{font-size:17px}}
  `;
}
export const mount: Mount<CartographicStoryProps> = (host, initial = {}) => {
    let props: CartographicStoryProps = { ...defaults, ...initial };
    const attrs = hostAttributes(host);
    attrs.set("data-pica-id", host.getAttribute("data-pica-id"));
    const sheet = scope(host);
    const root = csNode(host, "article", "page");
    const ids = [nextId("cartographic-story"), nextId("cartographic-story"), nextId("cartographic-story")];
    sheet.setRules(csRules(sheet.selector));
    function render(p: CartographicStoryProps): void {
        root.replaceChildren();
        attrs.set("role", "region");
        attrs.set("aria-label", p.title.replace(/\n/g, " "));
        attrs.set("aria-hidden", null);
        const mast = csNode(root, "header", "mast");
        csNode(mast, "span", "label", "WALKING ATLAS / STORY 04");
        csNode(mast, "span", "label", p.byline);
        const head = csNode(root, "section", "heading");
        csNode(head, "h1", "", p.title);
        csNode(head, "p", "deck", p.deck);
        const nav = csNode(head, "nav", "nav");
        nav.setAttribute("aria-label", "Journey sections");
        csLink(nav, "Read the route", ids[0]!);
        csLink(nav, "The essay", ids[1]!);
        csLink(nav, "Walking notes", ids[2]!);
        const journey = csNode(root, "section", "journey");
        journey.id = ids[0]!;
        const map = csNode(journey, "figure", "map");
        const svg = csSvg(map, "svg", { viewBox: "0 0 560 730", role: "img", "aria-label": "Schematic river route from the old weir through reed beds and a ferry crossing to the tidal steps" });
        for (let y = 65; y < 700; y += 70)
            csSvg(svg, "path", { d: `M30 ${y}C130 ${y - 45} 250 ${y + 35} 520 ${y - 20}`, class: "contour" });
        csSvg(svg, "path", { d: "M275 10C150 115 392 166 325 257S108 357 230 440S405 530 279 730", class: "river" });
        csSvg(svg, "path", { d: "M222 80L267 186L373 254L316 405L376 516L246 643", class: "route" });
        csSvg(svg, "path", { d: "M45 185H455 M90 395L495 449 M100 585L462 592", class: "road" });
        for (const [x, y, n] of [[222, 80, "01"], [373, 254, "02"], [316, 405, "03"], [246, 643, "04"]]) {
            csSvg(svg, "circle", { cx: String(x), cy: String(y), r: "18", class: "waypoint" });
            csSvg(svg, "text", { x: String(x), y: String(Number(y) + 4), class: "map-number" }, String(n));
        }
        csSvg(svg, "path", { d: "M65 66V26L55 43M65 26L75 43", class: "north" });
        csSvg(svg, "text", { x: "65", y: "89", class: "map-text" }, "N");
        csSvg(svg, "path", { d: "M365 680H490M365 675V685M490 675V685", class: "north" });
        csSvg(svg, "text", { x: "425", y: "706", class: "map-text" }, "1 KM / SCHEMATIC");
        csNode(map, "figcaption", "caption", "FIG. 01 / An invented estuary, drawn to follow a story rather than to guide navigation. Dashed line: walking route. Broad line: water.");
        const stops = csNode(journey, "div", "stops");
        for (const [num, name, dist, body] of [["01", "The old weir", "0.0 KM / START", "The first sound is water dropping over stone. A brass plate records a flood higher than the door of the mill."], ["02", "A field of reeds", "1.4 KM / EAST BANK", "The path follows a channel that no longer flows. The reed stems keep its outline visible above the grass."], ["03", "The ferry that stayed", "2.8 KM / CROSSING", "There is no ferry now, only the landing. People still meet here because a crossing is also a place to pause."], ["04", "The tidal steps", "4.2 KM / END", "At the last step, fresh water stops keeping its own time. The tide arrives, and the route begins to disappear."]]) {
            const stop = csNode(stops, "section", "stop");
            csNode(stop, "span", "stop-number", num);
            const txt = csNode(stop, "div", "");
            csNode(txt, "p", "label", dist);
            csNode(txt, "h2", "", name);
            csNode(txt, "p", "body", body);
        }
        const essay = csNode(root, "section", "essay");
        essay.id = ids[1]!;
        csNode(essay, "p", "label", "FIELD ESSAY / 650 STEPS AT A TIME");
        csNode(essay, "h2", "", "What the map cannot hold");
        csNode(essay, "p", "lead", p.essay);
        const cols = csNode(essay, "div", "essay-columns");
        csNode(cols, "p", "body", "A map makes a clean distinction between land and water. Standing at the edge, the distinction becomes temporary. Silt, reeds, salt, and weather redraw it together. The useful line is the one that admits it will move.");
        csNode(cols, "p", "body", "Walking is a way to read those revisions at human speed. A gate, a bench, a worn step: each marks a negotiation between a changing place and the people who return to it. The route ends. The waterline does not.");
        const notes = csNode(root, "footer", "notes");
        notes.id = ids[2]!;
        csNode(notes, "h2", "label", "WALKING NOTES");
        csNode(notes, "p", "body", "Illustrative route: 4.2 km, approximately two hours at an unhurried pace. This fictional map is a narrative drawing and should not be used for navigation.");
        const d = csNode(notes, "details", "");
        csNode(d, "summary", "", "Read terrain and preparation notes");
        csNode(d, "p", "body", "A real estuary walk requires a current local map, tide information, and checks for path closures. Carry water, choose footwear for soft ground, and use an accessible alternative wherever steps interrupt the route.");
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
