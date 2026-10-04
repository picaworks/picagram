import { hostAttributes, nextId, scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import { GRID_FONT } from "../../../lib/font";
import { sameJson } from "../../../lib/json";
import type { Mount } from "../../../lib/types";
export interface LetterpressBroadsideProps {
    /** The announcement headline. */
    title: string;
    /** The opening statement. */
    deck: string;
    /** The meeting date. */
    date: string;
    /** The meeting location. */
    place: string;
}
export const defaults: LetterpressBroadsideProps = {
    title: "The right to\ncommon ground",
    deck: "An open assembly on the spaces we share, the things we borrow, and the city we can make together.",
    date: "24 OCTOBER / SATURDAY",
    place: "THE OLD PRINT WORKS / HALL 02",
};
function lbNode<K extends keyof HTMLElementTagNameMap>(parent: Element, tag: K, part: string, text?: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    if (part)
        node.dataset.part = part;
    if (text !== undefined)
        node.textContent = text;
    parent.append(node);
    return node;
}
function lbLink(parent: Element, text: string, id: string): void {
    const link = lbNode(parent, "a", "", text);
    link.href = `#${id}`;
}
function lbRules(s: string): string {
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
  ${s} [data-part="mast"]{display:flex;justify-content:space-between;border-bottom:3px solid ${cssVar("muted")};padding-bottom:1rem;gap:1rem}
  ${s} [data-part="announcement"]{display:grid;grid-template-columns:minmax(0,1fr) 170px;align-items:end;padding:2.5rem 0 1rem}
  ${s} [data-part="words"]{font-family:var(--pica-font-wide,inherit);font-size:clamp(3.9rem,8.6vw,9rem);font-weight:900;text-transform:uppercase;line-height:.88;letter-spacing:-.055em;white-space:pre-line;margin:0}
  ${s} [data-part="stamp"]{border:1px solid ${cssVar("fg")};border-top:6px solid ${cssVar("accent")};text-align:center;padding:1rem}
  ${s} [data-part="stamp-number"]{display:block;font-size:7rem;line-height:1}
  ${s} [data-part="deck"]{font-size:clamp(1.25rem,2.4vw,2rem);max-width:42rem;margin:2rem 0}
  ${s} [data-part="nav"]{display:flex;flex-wrap:wrap;gap:1rem 3rem;border-block:1px solid ${cssVar("fg")};padding:1rem 0}
  ${s} [data-part="meeting"]{display:grid;grid-template-columns:1fr 1.2fr;gap:4rem;padding:3rem 0}
  ${s} [data-part="date"]{font-size:2.1rem;max-width:12ch;line-height:1.1}
  ${s} [data-part="agenda-row"]{display:grid;grid-template-columns:5rem 1fr;gap:1rem;border-bottom:1px solid ${cssVar("muted")};padding:1rem 0}
  ${s} [data-part="agenda-row"]:first-child{padding-top:0}
  ${s} [data-part="agenda-row"] h3{margin:0;font-size:1.25rem}
  ${s} [data-part="bring"]{display:grid;grid-template-columns:110px 1fr;border-top:3px solid ${cssVar("fg")};padding:2rem 0;gap:2rem}
  ${s} [data-part="big-plus"]{color:${cssVar("accent")};font-size:8rem;line-height:1}
  ${s} [data-part="bring"] h2{font-size:2.4rem;line-height:1.1;margin:0}
  ${s} [data-part="colophon"]{border-top:1px solid ${cssVar("fg")};padding-top:1.5rem;display:grid;grid-template-columns:1fr 1fr;gap:1rem}
  ${s} [data-part="register"]{font:2rem ${GRID_FONT};color:${cssVar("accent")};grid-column:1/-1}
  ${s} [data-part="small"]{font-size:.85rem;line-height:1.5}
  ${s} [data-part="colophon"] p{margin:0}@media(max-width:620px){${s} [data-part="announcement"]{grid-template-columns:1fr;gap:2rem}
  ${s} [data-part="stamp"]{display:flex;align-items:center;justify-content:space-between}
  ${s} [data-part="stamp-number"]{font-size:3rem}
  ${s} [data-part="meeting"]{grid-template-columns:1fr;gap:2rem}
  ${s} [data-part="bring"]{grid-template-columns:40px 1fr;gap:1rem}
  ${s} [data-part="big-plus"]{font-size:3.5rem}
  ${s} [data-part="bring"] h2{font-size:1.9rem}
  ${s} [data-part="colophon"]{grid-template-columns:1fr}
  ${s} [data-part="words"]{font-size:clamp(3.4rem,14.5vw,5.5rem)}}
  `;
}
export const mount: Mount<LetterpressBroadsideProps> = (host, initial = {}) => {
    let props: LetterpressBroadsideProps = { ...defaults, ...initial };
    const attrs = hostAttributes(host);
    attrs.set("data-pica-id", host.getAttribute("data-pica-id"));
    const sheet = scope(host);
    const root = lbNode(host, "article", "page");
    const ids = [nextId("letterpress-broadside"), nextId("letterpress-broadside"), nextId("letterpress-broadside")];
    sheet.setRules(lbRules(sheet.selector));
    function render(p: LetterpressBroadsideProps): void {
        root.replaceChildren();
        attrs.set("role", "region");
        attrs.set("aria-label", p.title.replace(/\n/g, " "));
        attrs.set("aria-hidden", null);
        const mast = lbNode(root, "header", "mast");
        lbNode(mast, "span", "label", "PUBLIC NOTICE / NO. 024");
        lbNode(mast, "span", "label", "CIVIC PRINT OFFICE · 2026");
        const head = lbNode(root, "section", "announcement");
        const words = lbNode(head, "h1", "words", p.title);
        const stamp = lbNode(head, "div", "stamp");
        lbNode(stamp, "span", "label", "ALL WELCOME");
        lbNode(stamp, "strong", "stamp-number", "24");
        lbNode(stamp, "span", "label", "OCT / 2026");
        words.setAttribute("aria-label", p.title.replace(/\n/g, " "));
        lbNode(root, "p", "deck", p.deck);
        const nav = lbNode(root, "nav", "nav");
        nav.setAttribute("aria-label", "Announcement sections");
        lbLink(nav, "01 / The assembly", ids[0]!);
        lbLink(nav, "02 / What to bring", ids[1]!);
        lbLink(nav, "03 / Print note", ids[2]!);
        const meeting = lbNode(root, "section", "meeting");
        meeting.id = ids[0]!;
        const facts = lbNode(meeting, "div", "facts");
        lbNode(facts, "h2", "label", "01 / THE ASSEMBLY");
        lbNode(facts, "h3", "date", p.date);
        lbNode(facts, "p", "label", p.place);
        lbNode(facts, "p", "body", "Doors 13:30. Assembly 14:00–17:00. Free entry, step-free access, live captions, and a quiet room.");
        const agenda = lbNode(meeting, "div", "agenda");
        for (const [time, title, copy] of [["14:00", "Who gets a seat?", "A short introduction to the commons, from reading rooms to repair benches."], ["14:40", "Draw the missing room", "Map the places your neighbourhood needs. Work in small, mixed tables."], ["16:00", "Turn a wish into a promise", "Agree one shared experiment and the people who will carry it forward."]]) {
            const row = lbNode(agenda, "div", "agenda-row");
            lbNode(row, "span", "label", time);
            const text = lbNode(row, "div", "");
            lbNode(text, "h3", "", title);
            lbNode(text, "p", "body", copy);
        }
        const bring = lbNode(root, "section", "bring");
        bring.id = ids[1]!;
        lbNode(bring, "span", "big-plus", "+");
        const br = lbNode(bring, "div", "");
        lbNode(br, "h2", "", "Bring a question. Leave with a task.");
        lbNode(br, "p", "body", "Bring a pencil, a story about a shared place, and an idea small enough to try next month. We provide paper, tea, and a table. Children and companions are welcome.");
        const d = lbNode(br, "details", "");
        lbNode(d, "summary", "", "Access and arrival information");
        lbNode(d, "p", "body", "Enter through the east courtyard. Bicycle parking is beside the main gate. The 12 and 18 buses stop at Mill Street. For captions, sit at the marked front tables.");
        const foot = lbNode(root, "footer", "colophon");
        foot.id = ids[2]!;
        lbNode(foot, "div", "register", "⊕ ── ┼ ── ⊕");
        lbNode(foot, "p", "label", "SET IN COMMON / PRINTED FOR THE NEIGHBOURHOOD");
        lbNode(foot, "p", "small", "Edition 024. A fictional civic notice, authored as an original typographic study. Share the invitation; keep the conversation open.");
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
