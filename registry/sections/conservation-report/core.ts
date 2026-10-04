import { hostAttributes, nextId, scope } from "../../../lib/host";
import { cssOn, cssVar } from "../../../lib/palette";
import { GRID_FONT } from "../../../lib/font";
import { sameJson } from "../../../lib/json";
import type { Mount } from "../../../lib/types";
export interface ConservationReportProps {
    /** The report headline. */
    title: string;
    /** The heritage project name. */
    site: string;
    /** The case reference. */
    reference: string;
    /** The conservation statement. */
    statement: string;
}
export const defaults: ConservationReportProps = {
    title: "Keeping the\nmarks of time",
    site: "EAST GATE READING ROOM",
    reference: "CASE FILE 026 / COMPLETED 2026",
    statement: "Repair should recover use without erasing the evidence of a building’s life. The work at East Gate began with a drawing of what had survived.",
};
function crNode<K extends keyof HTMLElementTagNameMap>(parent: Element, tag: K, part: string, text?: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    if (part)
        node.dataset.part = part;
    if (text !== undefined)
        node.textContent = text;
    parent.append(node);
    return node;
}
function crLink(parent: Element, text: string, id: string): void {
    const link = crNode(parent, "a", "", text);
    link.href = `#${id}`;
}
function crSvg(parent: Element, tag: string, attrs: Record<string, string>, text?: string): SVGElement {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    node.setAttribute("data-pica", "");
    for (const [key, value] of Object.entries(attrs))
        node.setAttribute(key, value);
    if (text !== undefined)
        node.textContent = text;
    parent.append(node);
    return node;
}
function crElevation(svg: SVGElement, after: boolean): void {
    crSvg(svg, "path", { d: "M60 310H840 M90 285V105L450 25L810 105V285Z M90 105H810 M90 285H810", class: "building" });
    for (const x of [145, 300, 520, 675]) {
        crSvg(svg, "rect", { x: String(x), y: "140", width: "80", height: "115", class: "building" });
        crSvg(svg, "path", { d: `M${x + 40} 140V255 M${x} 185H${x + 80}`, class: "fine" });
    }
    crSvg(svg, "path", { d: "M415 285V145Q450 105 485 145V285 M435 285H465", class: "building" });
    for (let y = 120; y < 280; y += 25)
        crSvg(svg, "path", { d: `M95 ${y}H405 M495 ${y}H805`, class: "masonry" });
    crSvg(svg, "path", { d: after ? "M540 115L565 150L575 150L575 180L600 195L600 225" : "M540 115L565 150L575 150L575 180L600 195L600 225L625 235", class: after ? "repair" : "defect" });
    crSvg(svg, "path", { d: after ? "M340 52L445 29L485 38" : "M355 57L380 49M405 43L445 33", class: after ? "repair" : "defect" });
    crSvg(svg, "path", { d: "M415 284H485", class: after ? "repair" : "defect" });
    crSvg(svg, "path", { d: "M90 340H810 M90 335V345 M810 335V345", class: "fine" });
    crSvg(svg, "text", { x: "450", y: "365", class: "dimension" }, "SOUTH ELEVATION / NOT TO SCALE");
}
function crRules(s: string): string {
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
  ${s} [data-part="mast"]{display:flex;justify-content:space-between;gap:1rem;border-bottom:1px solid ${cssVar("fg")};padding-bottom:1rem}
  ${s} [data-part="heading"]{display:grid;grid-template-columns:1.3fr 1fr;gap:4rem;padding:3rem 0;align-items:end}
  ${s} [data-part="heading"] h1{font-family:var(--pica-font-serif,inherit);font-size:clamp(3rem,5.8vw,5.6rem);font-weight:400;line-height:1.03;letter-spacing:-.05em;white-space:pre-line;margin:1rem 0 0}
  ${s} [data-part="statement"]{font-size:1.25rem;line-height:1.6}
  ${s} [data-part="nav"]{display:flex;flex-wrap:wrap;gap:3rem;padding:1rem 0;border-block:1px solid ${cssVar("fg")}}
  ${s} [data-part="condition"]{padding:2rem 0}
  ${s} [data-part="elevation"]{margin:0}
  ${s} [data-part="elevation"] svg{width:100%;height:auto}
  ${s} .building{fill:none;stroke:${cssVar("fg")};stroke-width:2}
  ${s} .fine{fill:none;stroke:${cssVar("fg")};stroke-width:1}
  ${s} .masonry{fill:none;stroke:${cssVar("muted")};stroke-width:.6}
  ${s} .defect{fill:none;stroke:${cssVar("accent")};stroke-width:3;stroke-dasharray:5 3}
  ${s} .repair{fill:none;stroke:${cssVar("accent")};stroke-width:5}
  ${s} .marker{fill:${cssVar("fg")}}
  ${s} .mark-text{fill:${cssOn("fg")};font:10px ${GRID_FONT};text-anchor:middle}
  ${s} .dimension{font:12px ${GRID_FONT};fill:${cssVar("muted")};text-anchor:middle}
  ${s} [data-part="caption"]{font:.72rem/1.6 ${GRID_FONT};color:${cssVar("muted")}}
  ${s} [data-part="findings"]{display:grid;grid-template-columns:repeat(3,1fr);gap:2rem;border-top:1px solid ${cssVar("muted")};margin-top:1.5rem;padding-top:1.5rem}
  ${s} [data-part="findings"] h3{font-size:1.25rem;font-weight:500;line-height:1.3}
  ${s} [data-part="work"]{border-top:3px solid ${cssVar("fg")};padding:1.5rem 0}
  ${s} [data-part="work"] h2,${s} [data-part="evidence"] h2{font-size:2.3rem;font-family:var(--pica-font-serif,inherit);font-weight:400}
  ${s} [data-part="compare"]{display:grid;grid-template-columns:1fr 1fr;gap:2rem}
  ${s} [data-part="compare"] figure{margin:0}
  ${s} [data-part="compare"] svg{width:100%;height:auto}
  ${s} [data-part="timeline"]{display:grid;grid-template-columns:repeat(4,1fr);gap:1.5rem;padding:2rem 0 0;list-style:none;counter-reset:stage}
  ${s} [data-part="timeline"] li{border-top:1px solid ${cssVar("muted")};padding-top:1rem;counter-increment:stage}
  ${s} [data-part="timeline"] li:before{content:"0" counter(stage);font:1.5rem ${GRID_FONT};color:${cssVar("fg")}}
  ${s} [data-part="timeline"] h3{font-size:1.05rem;font-weight:500}
  ${s} [data-part="evidence"]{border-top:1px solid ${cssVar("fg")};padding-top:1.5rem}
  ${s} [data-part="evidence"] table{width:100%;border-collapse:collapse;table-layout:fixed}
  ${s} [data-part="evidence"] caption{padding-bottom:1rem}
  ${s} [data-part="evidence"] td,${s} [data-part="evidence"] th{border-top:1px solid ${cssVar("muted")};padding:1rem .8rem 1rem 0;text-align:left;vertical-align:top;overflow-wrap:anywhere}
  ${s} [data-part="evidence"] td{font-size:.95rem;line-height:1.5}
  ${s} [data-part="method"]{padding:1.5rem 0}
  ${s} [data-part="footer"]{font:.7rem/1.7 ${GRID_FONT};border-top:1px solid ${cssVar("muted")};padding-top:1rem}@media(max-width:700px){${s} [data-part="heading"]{grid-template-columns:1fr;gap:1rem;padding:2rem 0}
  ${s} [data-part="heading"] h1{font-size:3.6rem}
  ${s} [data-part="nav"]{gap:1rem}
  ${s} [data-part="findings"]{grid-template-columns:1fr;gap:0}
  ${s} [data-part="findings"] h3{margin:.5rem 0}
  ${s} [data-part="compare"]{grid-template-columns:1fr}
  ${s} [data-part="timeline"]{grid-template-columns:1fr 1fr}
  ${s} [data-part="evidence"] td{font-size:.8rem}
  ${s} [data-part="evidence"] th{font-size:.6rem}}
  @media(max-width:620px){${s} .marker{r:25px}${s} .mark-text{font-size:24px}${s} .dimension{font-size:24px}}
  `;
}
export const mount: Mount<ConservationReportProps> = (host, initial = {}) => {
    let props: ConservationReportProps = { ...defaults, ...initial };
    const attrs = hostAttributes(host);
    attrs.set("data-pica-id", host.getAttribute("data-pica-id"));
    const sheet = scope(host);
    const root = crNode(host, "article", "page");
    const ids = [nextId("conservation-report"), nextId("conservation-report"), nextId("conservation-report")];
    sheet.setRules(crRules(sheet.selector));
    function render(p: ConservationReportProps): void {
        root.replaceChildren();
        attrs.set("role", "region");
        attrs.set("aria-label", p.title.replace(/\n/g, " "));
        attrs.set("aria-hidden", null);
        const mast = crNode(root, "header", "mast");
        crNode(mast, "span", "label", "FIELD OFFICE / CONSERVATION");
        crNode(mast, "span", "label", p.reference);
        const heading = crNode(root, "section", "heading");
        const title = crNode(heading, "div", "");
        crNode(title, "p", "label", p.site);
        crNode(title, "h1", "", p.title);
        crNode(heading, "p", "statement", p.statement);
        const nav = crNode(root, "nav", "nav");
        nav.setAttribute("aria-label", "Case study sections");
        crLink(nav, "01 Condition", ids[0]!);
        crLink(nav, "02 Intervention", ids[1]!);
        crLink(nav, "03 Evidence", ids[2]!);
        const condition = crNode(root, "section", "condition");
        condition.id = ids[0]!;
        const figure = crNode(condition, "figure", "elevation");
        const svg = crSvg(figure, "svg", { viewBox: "0 0 900 390", role: "img", "aria-label": "Condition drawing of a reading room facade: roof joint, cracked masonry, and timber threshold are numbered" });
        crElevation(svg, false);
        for (const [x, y, n] of [[420, 58, "01"], [610, 180, "02"], [315, 295, "03"]]) {
            crSvg(svg, "circle", { cx: String(x), cy: String(y), r: "16", class: "marker" });
            crSvg(svg, "text", { x: String(x), y: String(Number(y) + 4), class: "mark-text" }, String(n));
        }
        crNode(figure, "figcaption", "caption", "FIG. 01 / South elevation, condition survey. Original schematic drawing. Dimensions and defects illustrate a fictional case study.");
        const findings = crNode(condition, "div", "findings");
        for (const [n, title, copy] of [["01", "Water at the roof joint", "Open flashing allowed moisture into the wall head. Map the wet zone before opening the joint."], ["02", "A crack with a history", "The stepped crack followed an earlier repair. Monitor movement and retain sound historic mortar."], ["03", "A worn threshold", "The timber remained structurally useful. Local splicing preserved the surface visitors had made."]]) {
            const f = crNode(findings, "div", "");
            crNode(f, "span", "label", n);
            crNode(f, "h3", "", title);
            crNode(f, "p", "body", copy);
        }
        const work = crNode(root, "section", "work");
        work.id = ids[1]!;
        crNode(work, "h2", "", "Do enough. Leave a record.");
        const compare = crNode(work, "div", "compare");
        for (const [after, label] of [[false, "BEFORE / RECORD THE LOSS"], [true, "AFTER / MAKE THE REPAIR LEGIBLE"]] as const) {
            const f = crNode(compare, "figure", "");
            const s = crSvg(f, "svg", { viewBox: "0 0 900 390", role: "img", "aria-label": after ? "Facade after repairs, with joint and threshold interventions marked" : "Facade before repairs, showing the crack and open roof joint" });
            crElevation(s, after);
            crNode(f, "figcaption", "label", label);
        }
        const timeline = crNode(work, "ol", "timeline");
        for (const [stage, body] of [["Survey / February", "Photograph, draw, and test. Establish a baseline with the room in use."], ["Trial / April", "Prepare small mortar and timber samples. Choose compatibility over visual uniformity."], ["Repair / June", "Renew the roof joint, repoint local losses, and splice the threshold."], ["Review / October", "Compare moisture readings and reopen the maintenance log with the custodians."]]) {
            const li = crNode(timeline, "li", "");
            crNode(li, "h3", "", stage);
            crNode(li, "p", "body", body);
        }
        const evidence = crNode(root, "section", "evidence");
        evidence.id = ids[2]!;
        crNode(evidence, "h2", "", "Evidence before certainty");
        const table = crNode(evidence, "table", "");
        crNode(table, "caption", "caption", "Illustrative project evidence and the decisions it supported.");
        const thead = crNode(table, "thead", "");
        const tr = crNode(thead, "tr", "");
        for (const label of ["Observation", "Evidence", "Decision"]) {
            const t = crNode(tr, "th", "label", label);
            t.setAttribute("scope", "col");
        }
        const tbody = crNode(table, "tbody", "");
        for (const row of [["Moisture at wall head", "Six comparable readings over eight weeks", "Repair flashing, then continue monitoring"], ["Local mortar loss", "Sound adjacent joints and a compatible trial panel", "Repoint losses; retain sound joints"], ["Threshold wear", "Probe confirmed sound internal timber", "Splice the end; keep the worn face"]]) {
            const r = crNode(tbody, "tr", "");
            for (const t of row)
                crNode(r, "td", "", t);
        }
        const d = crNode(evidence, "details", "method");
        crNode(d, "summary", "", "Read the maintenance and method note");
        crNode(d, "p", "body", "Inspect the roof joint after heavy rain, photograph the crack from the same fixed position each quarter, and check the threshold annually. This original fictional report demonstrates editorial structure; real conservation decisions require site-specific evidence and qualified review.");
        crNode(root, "footer", "footer", "FIELD OFFICE · REPAIR / RECORD / RETURN · ORIGINAL CASE STUDY");
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
