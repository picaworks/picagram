import { hostAttributes, nextId, scope } from "../../../lib/host";
import { GRID_FONT } from "../../../lib/font";
import { cssVar } from "../../../lib/palette";
import { emitter } from "../../../lib/events";
import type { Mount } from "../../../lib/types";
export interface NocturneFilmProps {
    /** The page headline. Line breaks preserve the editorial composition. */
    title: string;
    /** Introductory copy beneath the headline. */
    description: string;
    /** The archive or programme label in the masthead. */
    edition: string;
}
export interface NocturneFilmEvents {
    /** Reports the reader opening or closing the supplementary note. */
    reveal: { expanded: boolean };
}
export const defaults: NocturneFilmProps = {
    "title": "NOCTURNE",
    "description": "A city. A missing voice. One last train before the morning.",
    "edition": "AFTER HOURS CINEMA / PROGRAMME 07"
};
type nocturneFilmMark = readonly [
    string,
    Record<string, string>
];
function nocturneFilmNode(parent: Element, tag: keyof HTMLElementTagNameMap, part: string, text?: string): HTMLElement {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    if (part)
        node.dataset.part = part;
    if (text !== undefined)
        node.textContent = text;
    parent.append(node);
    return node;
}
function nocturneFilmDiagram(parent: Element, box: string, marks: readonly nocturneFilmMark[]): void {
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
function nocturneFilmRules(s: string): string {
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
HOST [data-part="title"]{font-family:var(--pica-font-display,inherit)}
HOST [data-part="spread"]{display:grid;grid-template-columns:1.1fr 1fr;gap:9%;padding:55px 0 70px;align-items:center}HOST [data-part="poster"]{border:1px solid ${fg};padding:25px 30px 28px;max-width:510px;min-width:0;text-align:center}HOST [data-part="poster"]>[data-part="label"]{font-size:.62rem}HOST [data-part="title"]{font-size:clamp(2.8rem,5.5vw,5.4rem);font-weight:650;line-height:1;letter-spacing:-.07em;padding-top:27px;overflow-wrap:anywhere}HOST [data-part="posterart"]{padding:20px 0 14px}HOST [data-part="posterart"] svg{width:100%;height:auto}HOST [data-part="posterline"]{font-family:${GRID_FONT};font-size:.72rem;line-height:1.7;white-space:pre-line;margin:10px 0 22px;letter-spacing:.06em}HOST [data-part="deck"]{font-size:clamp(2rem,3vw,2.9rem);line-height:1.18;letter-spacing:-.045em;margin:30px 0}HOST [data-part="brief"]>[data-part="copy"]{margin:20px 0}HOST [data-part="filmquote"]{font-size:1.5rem;line-height:1.4;white-space:pre-line;margin:45px 0 0;padding-top:20px;border-top:1px solid ${muted}}HOST [data-part="screening"]{border-top:1px solid ${fg};padding-top:28px}HOST [data-part="schedule"]{margin-top:25px}HOST [data-part="schedulerow"]{display:grid;grid-template-columns:100px 1fr 1.4fr;gap:25px;align-items:start;padding:23px 0;border-bottom:1px solid ${muted}}HOST [data-part="time"]{font-family:${GRID_FONT};font-size:1.5rem}HOST [data-part="schedulerow"] h3{font-weight:500;font-size:1.15rem}HOST [data-part="credits"]{padding-top:50px}HOST [data-part="creditgrid"]{display:grid;grid-template-columns:repeat(3,1fr);gap:30px;margin:30px 0 40px}HOST [data-part="creditname"]{font-size:1.15rem;padding-top:7px}@media(max-width:760px){HOST [data-part="title"]{font-family:var(--pica-font-display,inherit)}
HOST [data-part="spread"]{grid-template-columns:1fr;gap:40px;padding-top:35px}HOST [data-part="poster"]{width:100%;max-width:480px;justify-self:center;padding:22px}HOST [data-part="title"]{font-size:clamp(2.6rem,12vw,4.5rem)}HOST [data-part="schedulerow"]{grid-template-columns:75px 1fr;gap:15px}HOST [data-part="schedulerow"]>[data-part="copy"]{grid-column:2}HOST [data-part="creditgrid"]{grid-template-columns:repeat(2,1fr);gap:25px}}
@media(max-width:760px){HOST [data-part="masthead"]{align-items:flex-start;flex-direction:column;gap:15px}HOST [data-part="page"]{padding-top:20px}HOST [data-part="edition"]{border-left:3px solid ${accent};padding-left:12px}
HOST [data-part="navigation"]{gap:15px}HOST [data-part="footer"]{flex-direction:column;gap:10px}}
`;
    return rules.replaceAll("HOST", s);
}
export const mount: Mount<NocturneFilmProps> = (host, initial = {}) => {
    let props: NocturneFilmProps = { ...defaults, ...initial };
    const sheet = scope(host);
    const attributes = hostAttributes(host);
    attributes.set("role", "region");
    attributes.set("aria-label", props.title.replaceAll("\n", " "));
    const root = nocturneFilmNode(host, "div", "page");
    const N = nocturneFilmNode;
    const D = nocturneFilmDiagram;
    type Mark = nocturneFilmMark;
    const ids = [nextId("nocturne-film-section"), nextId("nocturne-film-section"), nextId("nocturne-film-section")];
    const header = N(root, "header", "masthead");
    const editionNode = N(header, "p", "edition", props.edition);
    const nav = N(header, "nav", "navigation");
    nav.setAttribute("aria-label", "Page sections");
    ["The film", "Screening", "Credits"].forEach((label, i) => {
        const link = N(nav, "a", "", label);
        link.setAttribute("href", `#${ids[i]}`);
    });
    const spread = N(root, "section", "spread");
    spread.id = ids[0]!;
    const poster = N(spread, "div", "poster");
    N(poster, "p", "label", "AN ORIGINAL FILM BY MARA VOSS");
    const titleNode = N(poster, "h1", "title", props.title);
    const art = N(poster, "div", "posterart");
    D(art, "0 0 400 410", [["path", { d: "M40 410V140H95V105H155V180H210V70H274V150H335V40H365V410", "stroke-width": "2" }], ["path", { d: "M0 250H400M0 285H400M0 320H400M0 355H400M0 390H400" }], ...[60, 120, 180, 240, 300, 360].map(x => ["path", { d: `M${x} 0L${x - 140} 410`, "stroke-width": "1" }] as Mark), ["circle", { cx: "202", cy: "232", r: "46", "stroke-width": "2" }], ["path", { d: "M170 410L177 286 227 286 244 410", "stroke-width": "2" }]]);
    N(poster, "p", "posterline", "WHEN THE CITY GOES QUIET,\nWHO IS STILL LISTENING?");
    N(poster, "p", "label", "98 MINUTES / FICTION / 2026");
    const brief = N(spread, "div", "brief");
    N(brief, "p", "label", "ONE NIGHT ONLY");
    const descriptionNode = N(brief, "p", "deck", props.description);
    N(brief, "p", "copy", "Sound archivist Iris Vale finds an anonymous recording of a station that closed twenty years ago. Following the tape across a sleepless city, she discovers that the voice she is searching for may be her own.");
    N(brief, "p", "copy", "Nocturne is a fictional chamber thriller about memory, listening and the things a city keeps after its people have gone.");
    N(brief, "blockquote", "filmquote", "Some stories are heard\nbefore they are seen.");
    const screen = N(root, "section", "screening");
    screen.id = ids[1]!;
    N(screen, "p", "label", "THE EVENING / SATURDAY 24 OCTOBER");
    const schedule = N(screen, "div", "schedule");
    for (const [time, title, text] of [["19:00", "Doors & listening room", "A selection of field recordings from the imagined city."], ["19:30", "A note from the director", "A ten minute introduction to the sound and the story."], ["19:40", "Nocturne", "Feature presentation with open captions. No interval."], ["21:20", "In conversation", "A short discussion on building a city through sound."]]) {
        const r = N(schedule, "article", "schedulerow");
        N(r, "p", "time", time);
        N(r, "h3", "", title);
        N(r, "p", "copy", text);
    }
    const credits = N(root, "section", "credits");
    credits.id = ids[2]!;
    N(credits, "h2", "sectiontitle", "The people behind the silence.");
    const cg = N(credits, "div", "creditgrid");
    for (const [role, name] of [["WRITTEN & DIRECTED", "Mara Voss"], ["IRIS VALE", "Leah Arden"], ["CINEMATOGRAPHY", "Jonas Reed"], ["SOUND & SCORE", "Eli Sato"], ["EDITING", "Nora Finch"], ["PRODUCTION DESIGN", "Adam Bell"]]) {
        const c = N(cg, "div", "credit");
        N(c, "p", "label", role);
        N(c, "p", "creditname", name);
    }
    N(credits, "p", "label", "A FICTIONAL FILM AND PROGRAMME. CREATED AS AN ORIGINAL EDITORIAL STUDY.");
    const supplement = N(root, "section", "supplement");
    const button = N(supplement, "button", "note-toggle", "Read the screening access guide");
    button.setAttribute("type", "button");
    const noteId = nextId("nocturne-film-note");
    button.setAttribute("aria-controls", noteId);
    button.setAttribute("aria-expanded", "false");
    const note = N(supplement, "div", "note-body");
    note.id = noteId;
    note.hidden = true;
    N(note, "h3", "", "A screening for everyone");
    N(note, "p", "copy", "This programme includes open captions. The auditorium has level access, six wheelchair spaces, and an induction loop. A transcript of the introduction is available at the ticket desk. Doors open thirty minutes before the film.");
    const emit = emitter<NocturneFilmEvents>(host);
    const toggle = (): void => {
        note.hidden = !note.hidden;
        button.setAttribute("aria-expanded", String(!note.hidden));
        emit("reveal", { expanded: !note.hidden });
    };
    button.addEventListener("click", toggle);
    const footer = N(root, "footer", "footer");
    N(footer, "span", "", "ORIGINAL FIELD STUDY / PICAGRAM");
    N(footer, "span", "", "END OF RECORD / 2026");
    sheet.setRules(nocturneFilmRules(sheet.selector));
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
