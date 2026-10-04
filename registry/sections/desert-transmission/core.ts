import { hostAttributes, nextId, scope } from "../../../lib/host";
import { GRID_FONT } from "../../../lib/font";
import { cssVar } from "../../../lib/palette";
import { emitter } from "../../../lib/events";
import type { Mount } from "../../../lib/types";
export interface DesertTransmissionProps {
    /** The page headline. Line breaks preserve the editorial composition. */
    title: string;
    /** Introductory copy beneath the headline. */
    description: string;
    /** The archive or programme label in the masthead. */
    edition: string;
}
export interface DesertTransmissionEvents {
    /** Reports the reader opening or closing the supplementary note. */
    reveal: { expanded: boolean };
}
export const defaults: DesertTransmissionProps = {
    "title": "Nothing here\nis silent.",
    "description": "Field recordings and radio dispatches from a twelve day crossing of the fictional Aster Basin.",
    "edition": "ASTER BASIN / RADIO ARCHIVE 03"
};
type desertTransmissionMark = readonly [
    string,
    Record<string, string>
];
function desertTransmissionNode(parent: Element, tag: keyof HTMLElementTagNameMap, part: string, text?: string): HTMLElement {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    if (part)
        node.dataset.part = part;
    if (text !== undefined)
        node.textContent = text;
    parent.append(node);
    return node;
}
function desertTransmissionDiagram(parent: Element, box: string, marks: readonly desertTransmissionMark[]): void {
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
function desertTransmissionRules(s: string): string {
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
HOST [data-part="signal"]{padding:35px 0 0}HOST [data-part="signalhead"]{display:flex;justify-content:space-between;align-items:center;gap:20px}HOST [data-part="frequency"]{font-family:${GRID_FONT};font-size:1.5rem;white-space:nowrap}HOST [data-part="title"]{font-weight:450;font-size:clamp(3.8rem,8vw,7rem);letter-spacing:-.055em;line-height:.98;white-space:pre-line;margin:40px 0 25px}HOST [data-part="deck"]{max-width:49ch;font-size:1.1rem;line-height:1.6}HOST [data-part="horizon"]{margin:35px 0 0}HOST [data-part="horizon"] svg{width:100%;height:auto}HOST [data-part="horizon"] figcaption{border-top:1px solid ${muted};padding:14px 0}HOST [data-part="archive"]{padding-top:44px}HOST [data-part="archivehead"]{display:flex;justify-content:space-between;align-items:end;gap:30px;padding-bottom:28px}HOST [data-part="archivehead"] h2{max-width:420px}HOST [data-part="band"]{display:grid;grid-template-columns:210px 1fr;gap:45px;padding:35px 0;border-top:1px solid ${fg}}HOST [data-part="stamp"] [data-part="time"]{font-family:${GRID_FONT};font-size:1.7rem;margin:12px 0 16px}HOST [data-part="spoken"]{font-size:clamp(1.2rem,2vw,1.6rem);line-height:1.55;max-width:48ch;margin-bottom:18px}HOST [data-part="kit"]{padding-top:48px;border-top:1px solid ${fg}}HOST [data-part="inventory"]{display:grid;grid-template-columns:repeat(3,1fr);gap:35px;padding:30px 0 20px}HOST [data-part="item"] h3{margin:20px 0 10px;font-weight:500;font-size:1.25rem}@media(max-width:760px){HOST [data-part="signalhead"]{align-items:start;flex-direction:column;gap:12px}HOST [data-part="title"]{margin-top:30px}HOST [data-part="archivehead"]{display:block}HOST [data-part="archivehead"]>p{margin-top:20px}HOST [data-part="band"]{grid-template-columns:1fr;gap:16px;padding:26px 0}HOST [data-part="stamp"]{display:flex;flex-wrap:wrap;gap:12px;align-items:center}HOST [data-part="stamp"] [data-part="time"]{font-size:1.25rem;margin:0}HOST [data-part="inventory"]{grid-template-columns:1fr;gap:25px}HOST [data-part="item"]{border-bottom:1px solid ${muted};padding-bottom:24px}}
@media(max-width:760px){HOST [data-part="masthead"]{align-items:flex-start;flex-direction:column;gap:15px}HOST [data-part="page"]{padding-top:20px}HOST [data-part="edition"]{border-left:3px solid ${accent};padding-left:12px}
HOST [data-part="navigation"]{gap:15px}HOST [data-part="footer"]{flex-direction:column;gap:10px}}
`;
    return rules.replaceAll("HOST", s);
}
export const mount: Mount<DesertTransmissionProps> = (host, initial = {}) => {
    let props: DesertTransmissionProps = { ...defaults, ...initial };
    const sheet = scope(host);
    const attributes = hostAttributes(host);
    attributes.set("role", "region");
    attributes.set("aria-label", props.title.replaceAll("\n", " "));
    const root = desertTransmissionNode(host, "div", "page");
    const N = desertTransmissionNode;
    const D = desertTransmissionDiagram;
    const ids = [nextId("desert-transmission-section"), nextId("desert-transmission-section"), nextId("desert-transmission-section")];
    const header = N(root, "header", "masthead");
    const editionNode = N(header, "p", "edition", props.edition);
    const nav = N(header, "nav", "navigation");
    nav.setAttribute("aria-label", "Page sections");
    ["Frequency", "Transcripts", "Field kit"].forEach((label, i) => {
        const link = N(nav, "a", "", label);
        link.setAttribute("href", `#${ids[i]}`);
    });
    const signal = N(root, "section", "signal");
    signal.id = ids[0]!;
    const top = N(signal, "div", "signalhead");
    N(top, "p", "label", "TRANSMITTING FROM 26°14′ N / 14°08′ E");
    N(top, "p", "frequency", "7.120 MHz");
    const titleNode = N(signal, "h1", "title", props.title);
    const descriptionNode = N(signal, "p", "deck", props.description);
    const horizon = N(signal, "figure", "horizon");
    D(horizon, "0 0 1000 230", [["path", { d: "M0 185Q100 135 195 160T395 135T590 169T775 124T1000 159M0 206Q160 175 330 195T690 177T1000 198", "stroke-width": "2" }], ["path", { d: "M760 147V37M741 37H779M746 78H774M738 118H782M742 147L760 37 778 147" }], ["circle", { cx: "198", cy: "70", r: "29" }], ["path", { d: "M32 28V8H52M948 8H968V28M32 202V222H52M948 222H968V202" }]]);
    N(horizon, "figcaption", "label", "HORIZON STUDY / DAY 08 / EAST RIDGE / WIND ENE 14 KM/H");
    const archive = N(root, "section", "archive");
    archive.id = ids[1]!;
    const ah = N(archive, "div", "archivehead");
    N(ah, "h2", "sectiontitle", "Three signals from the crossing");
    N(ah, "p", "label", "TRANSCRIPT / UTC");
    for (const [day, time, call, text, note] of [["DAY 02", "06:12:08", "BASE → FIELD", "The ridge has turned pale. We can see the old road now. Keep the sun on your left until the second marker.", "[carrier steady / background wind]"], ["DAY 08", "18:44:31", "FIELD → BASE", "We stopped at the dry well. Someone has tied a strip of cloth to the pump handle. It moves even when the air feels still.", "[six seconds of silence / cloth against metal]"], ["DAY 12", "05:03:19", "FIELD → BASE", "The lights are yours. We thought they were stars until they held their place. We are coming in from the south.", "[signal weak / two acknowledgements]"]]) {
        const band = N(archive, "article", "band");
        const stamp = N(band, "div", "stamp");
        N(stamp, "p", "label", day);
        N(stamp, "p", "time", time);
        N(stamp, "p", "label", call);
        const transcript = N(band, "div", "transcript");
        N(transcript, "p", "spoken", text);
        N(transcript, "p", "label", note);
    }
    const kit = N(root, "section", "kit");
    kit.id = ids[2]!;
    N(kit, "h2", "sectiontitle", "Carried across the basin");
    const inv = N(kit, "div", "inventory");
    for (const [n, t, d] of [["01", "Shortwave receiver", "Fixed frequency. Spare aerial coiled inside the lid."], ["02", "Field recorder", "Twelve numbered reels. One minute of room tone at every stop."], ["03", "Paper log", "Times, bearings, weather and every failed attempt to call home."]]) {
        const c = N(inv, "article", "item");
        N(c, "p", "label", n + " / FIELD INVENTORY");
        N(c, "h3", "", t);
        N(c, "p", "copy", d);
    }
    const supplement = N(root, "section", "supplement");
    const button = N(supplement, "button", "note-toggle", "Read the archive method");
    button.setAttribute("type", "button");
    const noteId = nextId("desert-transmission-note");
    button.setAttribute("aria-controls", noteId);
    button.setAttribute("aria-expanded", "false");
    const note = N(supplement, "div", "note-body");
    note.id = noteId;
    note.hidden = true;
    N(note, "h3", "", "What the archive keeps");
    N(note, "p", "copy", "Each dispatch is recorded twice: once over shortwave and once on the field recorder. Gaps are preserved rather than reconstructed. Brackets describe audible events. Times use the expedition’s fixed UTC reference.");
    const emit = emitter<DesertTransmissionEvents>(host);
    const toggle = (): void => {
        note.hidden = !note.hidden;
        button.setAttribute("aria-expanded", String(!note.hidden));
        emit("reveal", { expanded: !note.hidden });
    };
    button.addEventListener("click", toggle);
    const footer = N(root, "footer", "footer");
    N(footer, "span", "", "ORIGINAL FIELD STUDY / PICAGRAM");
    N(footer, "span", "", "END OF RECORD / 2026");
    sheet.setRules(desertTransmissionRules(sheet.selector));
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
