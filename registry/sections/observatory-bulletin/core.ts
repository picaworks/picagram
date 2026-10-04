import { hostAttributes, nextId, scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import { GRID_FONT } from "../../../lib/font";
import { sameJson } from "../../../lib/json";
import type { Mount } from "../../../lib/types";
export interface ObservatoryBulletinProps {
    /** The bulletin headline. */
    title: string;
    /** The observing station. */
    station: string;
    /** The bulletin issue. */
    issue: string;
    /** The field note. */
    note: string;
}
export const defaults: ObservatoryBulletinProps = {
    title: "A night at the\nedge of winter",
    station: "NORTH RIDGE OBSERVATORY",
    issue: "BULLETIN 038 / NOVEMBER 2026",
    note: "Before dawn, the eastern sky opens a clear window between the roofline and the ridge. The observing plan favours bright targets and patient eyes.",
};
function obNode<K extends keyof HTMLElementTagNameMap>(parent: Element, tag: K, part: string, text?: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    if (part)
        node.dataset.part = part;
    if (text !== undefined)
        node.textContent = text;
    parent.append(node);
    return node;
}
function obLink(parent: Element, text: string, id: string): void {
    const link = obNode(parent, "a", "", text);
    link.href = `#${id}`;
}
function obSvg(parent: Element, tag: string, attrs: Record<string, string>, text?: string): SVGElement {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    node.setAttribute("data-pica", "");
    for (const [key, value] of Object.entries(attrs))
        node.setAttribute(key, value);
    if (text !== undefined)
        node.textContent = text;
    parent.append(node);
    return node;
}
function obRules(s: string): string {
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
  ${s} [data-part="mast"]{display:flex;justify-content:space-between;gap:1rem;border-block:1px solid ${cssVar("fg")};padding:1rem 0}
  ${s} [data-part="intro"]{display:flex;justify-content:space-between;align-items:end;gap:2rem;padding:2.5rem 0}
  ${s} [data-part="intro"] h1{font-family:var(--pica-font-serif,inherit);font-size:clamp(3rem,5vw,5rem);font-weight:400;white-space:pre-line;line-height:1.07;letter-spacing:-.04em;margin:0}
  ${s} [data-part="coordinates"]{font: .85rem/1.8 ${GRID_FONT};white-space:pre-line;color:${cssVar("muted")}}
  ${s} [data-part="nav"]{display:flex;gap:2.5rem;border-bottom:1px solid ${cssVar("muted")};padding:1rem 0}
  ${s} [data-part="sky-window"]{display:grid;grid-template-columns:1.25fr 1fr;gap:3rem;padding:2.5rem 0}
  ${s} [data-part="sky"]{margin:0}
  ${s} [data-part="sky"] svg{width:100%;height:auto}
  ${s} .ring,${s} .grid{fill:none;stroke:${cssVar("muted")};stroke-width:1}
  ${s} .grid{stroke-dasharray:2 5}
  ${s} .constellation{fill:none;stroke:${cssVar("accent")};stroke-width:2}
  ${s} .star{fill:${cssVar("fg")}}
  ${s} .ridge{fill:${cssVar("muted")}}
  ${s} .sky-label{font:11px ${GRID_FONT};fill:${cssVar("fg")};text-anchor:middle}
  ${s} [data-part="caption"]{font:.72rem/1.6 ${GRID_FONT};color:${cssVar("muted")};text-align:left}
  ${s} [data-part="brief"] h2{font-size:2.3rem;line-height:1.15;margin:2rem 0;font-family:var(--pica-font-serif,inherit);font-weight:400}
  ${s} [data-part="metrics"]{display:grid;grid-template-columns:8rem 1fr;border-top:1px solid ${cssVar("muted")};padding-top:1rem;gap:1rem}
  ${s} [data-part="metrics"] dd{margin:0;font-size:.95rem}
  ${s} [data-part="targets"]{border-top:3px solid ${cssVar("fg")};padding-top:1.5rem}
  ${s} [data-part="targets"] h2{font-size:2rem;font-weight:400}
  ${s} [data-part="targets"] table{width:100%;border-collapse:collapse;table-layout:fixed}
  ${s} [data-part="targets"] caption{padding-bottom:1rem}
  ${s} [data-part="targets"] th,${s} [data-part="targets"] td{text-align:left;padding:1rem .5rem 1rem 0;border-top:1px solid ${cssVar("muted")};vertical-align:top;overflow-wrap:anywhere}
  ${s} [data-part="targets"] td{font-size:.95rem;line-height:1.5}
  ${s} [data-part="log"]{display:grid;grid-template-columns:20% 1fr;gap:2rem;border-top:1px solid ${cssVar("fg")};margin-top:3rem;padding:2rem 0}
  ${s} [data-part="log-number"]{font:5rem ${GRID_FONT};color:${cssVar("fg")};letter-spacing:-.08em}
  ${s} [data-part="log"] h2{font-size:2.2rem;font-weight:400;margin:0;max-width:23ch}
  ${s} [data-part="entry"]{font:.8rem/1.8 ${GRID_FONT};white-space:pre-wrap}
  ${s} [data-part="footer"]{font:.68rem/1.7 ${GRID_FONT};border-top:1px solid ${cssVar("muted")};padding-top:1rem}@media(max-width:700px){${s} [data-part="intro"]{display:block}
  ${s} [data-part="intro"] h1{font-size:3.4rem}
  ${s} [data-part="coordinates"]{margin-top:1.5rem}
  ${s} [data-part="sky-window"]{grid-template-columns:1fr;gap:1rem}
  ${s} [data-part="nav"]{gap:1.2rem}
  ${s} [data-part="log"]{grid-template-columns:1fr;gap:1rem}
  ${s} [data-part="targets"] td{font-size:.8rem}
  ${s} [data-part="targets"] th{font-size:.6rem}
  ${s} [data-part="log-number"]{font-size:3rem}
  ${s} [data-part="sky"]{max-width:32rem}}
  @media(max-width:900px){${s} .sky-label{font-size:18px}}
  `;
}
export const mount: Mount<ObservatoryBulletinProps> = (host, initial = {}) => {
    let props: ObservatoryBulletinProps = { ...defaults, ...initial };
    const attrs = hostAttributes(host);
    attrs.set("data-pica-id", host.getAttribute("data-pica-id"));
    const sheet = scope(host);
    const root = obNode(host, "article", "page");
    const ids = [nextId("observatory-bulletin"), nextId("observatory-bulletin"), nextId("observatory-bulletin")];
    sheet.setRules(obRules(sheet.selector));
    function render(p: ObservatoryBulletinProps): void {
        root.replaceChildren();
        attrs.set("role", "region");
        attrs.set("aria-label", p.title.replace(/\n/g, " "));
        attrs.set("aria-hidden", null);
        const mast = obNode(root, "header", "mast");
        obNode(mast, "strong", "label", p.station);
        obNode(mast, "span", "label", p.issue);
        const intro = obNode(root, "section", "intro");
        obNode(intro, "h1", "", p.title);
        obNode(intro, "div", "coordinates", `52° 18′ N
01° 42′ W
ALT. 412 M`);
        const nav = obNode(root, "nav", "nav");
        nav.setAttribute("aria-label", "Bulletin sections");
        obLink(nav, "Sky window", ids[0]!);
        obLink(nav, "Target list", ids[1]!);
        obLink(nav, "Field log", ids[2]!);
        const window = obNode(root, "section", "sky-window");
        window.id = ids[0]!;
        const fig = obNode(window, "figure", "sky");
        const svg = obSvg(fig, "svg", { viewBox: "0 0 600 570", role: "img", "aria-label": "Schematic eastern sky showing a rising winter asterism above the ridge, with altitude rings" });
        for (const r of [90, 170, 250])
            obSvg(svg, "circle", { cx: "300", cy: "275", r: String(r), class: "ring" });
        obSvg(svg, "path", { d: "M300 25V525 M50 275H550 M123 98L477 452 M123 452L477 98", class: "grid" });
        obSvg(svg, "path", { d: "M204 170L269 210L339 139L410 230L350 325L269 210L225 334", class: "constellation" });
        for (const [x, y, r] of [[204, 170, 4], [269, 210, 6], [339, 139, 4], [410, 230, 4], [350, 325, 5], [225, 334, 3], [131, 250, 2], [468, 140, 2], [395, 390, 2], [165, 395, 2]])
            obSvg(svg, "circle", { cx: String(x), cy: String(y), r: String(r), class: "star" });
        obSvg(svg, "path", { d: "M50 455L92 443L142 460L185 426L236 445L291 408L347 432L398 421L461 446L512 430L550 449V525H50Z", class: "ridge" });
        for (const [x, y, t] of [[300, 19, "E"], [21, 280, "N"], [578, 280, "S"], [300, 554, "HORIZON"], [330, 91, "60°"], [330, 178, "30°"]])
            obSvg(svg, "text", { x: String(x), y: String(y), class: "sky-label" }, String(t));
        obNode(fig, "figcaption", "caption", "FIG. 01 / Eastern sky window. Schematic field drawing, not a navigation or ephemeris chart.");
        const notes = obNode(window, "div", "brief");
        obNode(notes, "p", "label", "OBSERVING WINDOW / 04:40–06:10 UTC");
        obNode(notes, "h2", "", "Let your eyes arrive first.");
        obNode(notes, "p", "body", p.note);
        obNode(notes, "p", "body", "Allow twenty minutes for dark adaptation. Keep the lantern low, record the time before the description, and make one careful drawing before reaching for a photograph.");
        const metrics = obNode(notes, "dl", "metrics");
        for (const [a, b] of [["MOON", "Below horizon"], ["SEEING", "Target: stable 3/5"], ["INSTRUMENT", "90 mm refractor"], ["METHOD", "Visual, sketch, compare"]]) {
            obNode(metrics, "dt", "label", a);
            obNode(metrics, "dd", "", b);
        }
        const targets = obNode(root, "section", "targets");
        targets.id = ids[1]!;
        obNode(targets, "h2", "", "Tonight’s working list");
        const table = obNode(targets, "table", "");
        obNode(table, "caption", "caption", "Illustrative observing targets, ordered from broad view to fine detail.");
        const th = obNode(table, "thead", "");
        const tr = obNode(th, "tr", "");
        for (const t of ["Target", "Instrument", "Look for", "Record"]) {
            const cell = obNode(tr, "th", "label", t);
            cell.setAttribute("scope", "col");
        }
        const tb = obNode(table, "tbody", "");
        for (const row of [["Open cluster", "Binoculars", "Three bright anchors", "Field sketch"], ["Double star", "Refractor · low power", "Separation and colour", "Two estimates"], ["Lunar terminator", "Refractor · medium power", "Long relief shadows", "Timed drawing"]]) {
            const r = obNode(tb, "tr", "");
            for (const value of row)
                obNode(r, "td", "", value);
        }
        const log = obNode(root, "section", "log");
        log.id = ids[2]!;
        obNode(log, "span", "log-number", "038");
        const lc = obNode(log, "div", "");
        obNode(lc, "h2", "", "The field log is part of the instrument.");
        obNode(lc, "p", "body", "Write what you saw, including uncertainty. A blank patch is useful evidence; a confident guess is not. Record cloud cover, transparency, and the light that reaches the site.");
        const d = obNode(lc, "details", "");
        obNode(d, "summary", "", "Open a sample log entry");
        obNode(d, "pre", "entry", `05:12 UTC / Transparency 4 of 5
Cluster resolved into six steady points.
Eastern ridge obscures the lower field.
Repeat observation after ten minutes.`);
        obNode(root, "footer", "footer", "NORTH RIDGE / FIELD SCIENCE SERIES / ORIGINAL ILLUSTRATIVE BULLETIN");
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
