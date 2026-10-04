import { hostAttributes, nextId, scope } from "../../../lib/host";
import { GRID_FONT } from "../../../lib/font";
import { cssVar } from "../../../lib/palette";
import { emitter } from "../../../lib/events";
import type { Mount } from "../../../lib/types";
export interface OrbitalLogProps {
    /** The page headline. Line breaks preserve the editorial composition. */
    title: string;
    /** Introductory copy beneath the headline. */
    description: string;
    /** The archive or programme label in the masthead. */
    edition: string;
}
export interface OrbitalLogEvents {
    /** Reports the reader opening or closing the supplementary note. */
    reveal: { expanded: boolean };
}
export const defaults: OrbitalLogProps = {
    "title": "THE VIEW\nFROM HERE",
    "description": "An observer’s account of one complete revolution, aboard the fictional survey vessel Meridian.",
    "edition": "MERIDIAN / MISSION DOCUMENTARY 01"
};
type orbitalLogMark = readonly [
    string,
    Record<string, string>
];
function orbitalLogNode(parent: Element, tag: keyof HTMLElementTagNameMap, part: string, text?: string): HTMLElement {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    if (part)
        node.dataset.part = part;
    if (text !== undefined)
        node.textContent = text;
    parent.append(node);
    return node;
}
function orbitalLogDiagram(parent: Element, box: string, marks: readonly orbitalLogMark[]): void {
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
function orbitalLogRules(s: string): string {
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
HOST [data-part="missionhead"]{display:grid;grid-template-columns:1fr 1fr;gap:25px;padding:40px 0 38px}HOST [data-part="missionhead"]>[data-part="label"]{grid-column:1/-1}HOST [data-part="title"]{font-size:clamp(3.1rem,6.1vw,5.8rem);font-weight:500;line-height:.95;letter-spacing:-.055em;white-space:pre-line}HOST [data-part="deck"]{font-size:1.25rem;line-height:1.55;max-width:34ch;align-self:end;justify-self:end}HOST [data-part="orbital"]{display:grid;grid-template-columns:1.25fr 1fr;gap:55px;border-top:1px solid ${fg};padding:38px 0 45px}HOST [data-part="orbitfigure"]{margin:0;align-self:center}HOST [data-part="orbitfigure"] svg{width:100%;height:auto}HOST [data-part="orbitfigure"] figcaption{text-align:center;font-size:.65rem;padding-top:25px}HOST [data-part="log"] [data-part="sectiontitle"]{white-space:pre-line;margin-bottom:26px}HOST [data-part="logentry"]{display:grid;grid-template-columns:65px 1fr;gap:20px;padding:20px 0;border-top:1px solid ${muted}}HOST [data-part="time"]{font-family:${GRID_FONT};font-size:.85rem;padding-top:5px}HOST [data-part="logentry"] h3{font-weight:500;font-size:1.12rem;margin-bottom:9px}HOST [data-part="logentry"] [data-part="copy"]{font-size:.94rem}HOST [data-part="mission"]{border-top:1px solid ${fg};padding-top:28px}HOST [data-part="missiongrid"]{display:grid;grid-template-columns:1fr 1.3fr .8fr;gap:40px;margin-top:30px}HOST [data-part="missiongrid"] h2{white-space:pre-line}HOST [data-part="statvalue"]{margin:6px 0 23px;font-size:1.3rem}HOST [data-part="stats"]{border-left:1px solid ${muted};padding-left:28px}@media(max-width:760px){HOST [data-part="missionhead"]{grid-template-columns:1fr}HOST [data-part="deck"]{justify-self:start;margin-top:15px}HOST [data-part="orbital"]{grid-template-columns:1fr;gap:40px}HOST [data-part="orbitfigure"]{max-width:460px;justify-self:center}HOST [data-part="missiongrid"]{grid-template-columns:1fr;gap:24px}HOST [data-part="stats"]{display:grid;grid-template-columns:1fr 1fr;gap:0 20px;padding-left:0;border-left:0}}
@media(max-width:760px){HOST [data-part="masthead"]{align-items:flex-start;flex-direction:column;gap:15px}HOST [data-part="page"]{padding-top:20px}HOST [data-part="edition"]{border-left:3px solid ${accent};padding-left:12px}
HOST [data-part="navigation"]{gap:15px}HOST [data-part="footer"]{flex-direction:column;gap:10px}}
`;
    return rules.replaceAll("HOST", s);
}
export const mount: Mount<OrbitalLogProps> = (host, initial = {}) => {
    let props: OrbitalLogProps = { ...defaults, ...initial };
    const sheet = scope(host);
    const attributes = hostAttributes(host);
    attributes.set("role", "region");
    attributes.set("aria-label", props.title.replaceAll("\n", " "));
    const root = orbitalLogNode(host, "div", "page");
    const N = orbitalLogNode;
    const D = orbitalLogDiagram;
    type Mark = orbitalLogMark;
    const ids = [nextId("orbital-log-section"), nextId("orbital-log-section"), nextId("orbital-log-section")];
    const header = N(root, "header", "masthead");
    const editionNode = N(header, "p", "edition", props.edition);
    const nav = N(header, "nav", "navigation");
    nav.setAttribute("aria-label", "Page sections");
    ["Orbit", "Observations", "Mission"].forEach((label, i) => {
        const link = N(nav, "a", "", label);
        link.setAttribute("href", `#${ids[i]}`);
    });
    const missionhead = N(root, "section", "missionhead");
    missionhead.id = ids[0]!;
    N(missionhead, "p", "label", "MISSION 017 / ORBIT 284 / 96 MINUTES");
    const titleNode = N(missionhead, "h1", "title", props.title);
    const descriptionNode = N(missionhead, "p", "deck", props.description);
    const orbital = N(root, "section", "orbital");
    const orbit = N(orbital, "figure", "orbitfigure");
    D(orbit, "0 0 500 500", [["circle", { cx: "250", cy: "250", r: "190" }], ["circle", { cx: "250", cy: "250", r: "131", "stroke-dasharray": "3 6" }], ["circle", { cx: "250", cy: "250", r: "84", "stroke-width": "2" }], ["ellipse", { cx: "250", cy: "250", rx: "84", ry: "27" }], ["ellipse", { cx: "250", cy: "250", rx: "30", ry: "84" }], ["path", { d: "M250 18V482M18 250H482", "stroke-dasharray": "2 6" }], ["circle", { cx: "384", cy: "116", r: "8", fill: "currentColor" }], ...[[250, 60], [440, 250], [250, 440], [60, 250]].map(([cx, cy]) => ["path", { d: `M${cx! - 8} ${cy}H${cx! + 8}M${cx} ${cy! - 8}V${cy! + 8}`, "stroke-width": "2" }] as Mark)]);
    N(orbit, "figcaption", "label", "EARTH REFERENCE / SCHEMATIC, NOT TO SCALE");
    const log = N(orbital, "div", "log");
    log.id = ids[1]!;
    N(log, "h2", "sectiontitle", "One revolution.\nFour ways of seeing.");
    for (const [t, h, p] of [["00:00", "First light", "The coast appears before the land. A thin seam of brightness finds the water and travels inland."], ["00:24", "Over the continent", "From here, borders disappear. Roads remain: fine traces of intention across the dark."], ["00:48", "Night side", "The cities make a second geography. I write down the places where the light stops."], ["01:12", "Returning to dawn", "The same coast arrives differently. Cloud has gathered over the bay. Nothing is ever quite the same view."]]) {
        const entry = N(log, "article", "logentry");
        N(entry, "p", "time", t);
        const c = N(entry, "div", "");
        N(c, "h3", "", h);
        N(c, "p", "copy", p);
    }
    const mission = N(root, "section", "mission");
    mission.id = ids[2]!;
    N(mission, "p", "label", "THE MISSION / A RECORD OF ATTENTION");
    const mg = N(mission, "div", "missiongrid");
    N(mg, "h2", "sectiontitle", "Distance changes\nwhat we notice.");
    N(mg, "p", "copy", "Meridian’s survey asks a simple question: what does a planet look like when we stop naming it? This fictional documentary pairs an observer’s notebook with four stations of light, holding each view long enough for its details to emerge.");
    const stats = N(mg, "dl", "stats");
    for (const [term, value] of [["ORBIT PERIOD", "96 min"], ["MEAN ALTITUDE", "408 km"], ["CREW", "03 observers"]]) {
        N(stats, "dt", "label", term);
        N(stats, "dd", "statvalue", value);
    }
    const supplement = N(root, "section", "supplement");
    const button = N(supplement, "button", "note-toggle", "Open the observation protocol");
    button.setAttribute("type", "button");
    const noteId = nextId("orbital-log-note");
    button.setAttribute("aria-controls", noteId);
    button.setAttribute("aria-expanded", "false");
    const note = N(supplement, "div", "note-body");
    note.id = noteId;
    note.hidden = true;
    N(note, "h3", "", "Looking without interruption");
    N(note, "p", "copy", "The observer records one entry at each change in light. Instrument values are transcribed separately from impressions. No entry is corrected after the next station begins, preserving the sequence of the original account.");
    const emit = emitter<OrbitalLogEvents>(host);
    const toggle = (): void => {
        note.hidden = !note.hidden;
        button.setAttribute("aria-expanded", String(!note.hidden));
        emit("reveal", { expanded: !note.hidden });
    };
    button.addEventListener("click", toggle);
    const footer = N(root, "footer", "footer");
    N(footer, "span", "", "ORIGINAL FIELD STUDY / PICAGRAM");
    N(footer, "span", "", "END OF RECORD / 2026");
    sheet.setRules(orbitalLogRules(sheet.selector));
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
