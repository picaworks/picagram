import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface CinematequeFilm {
  /** The screening day and time. */
  when: string;
  /** The film title. */
  title: string;
  /** Director, year, runtime, and format. */
  credit: string;
  /** A short note about the screening. */
  note: string;
}

export interface CinematequeProgramProps {
  /** The name of the film series. */
  title: string;
  /** The cinema or presenting institution. */
  cinema: string;
  /** A large issue date or month. */
  date: string;
  /** The opening curatorial statement. */
  introduction: string;
  /** The ordered screening program. */
  films: readonly CinematequeFilm[];
}

export const defaults: CinematequeProgramProps = {
  title: "The city after dark",
  cinema: "North Screen / Cinematheque",
  date: "NOV 06—09",
  introduction: "Four nights of streets, strangers, and the spaces in between. A repertory program about the city as both a stage and a state of mind.",
  films: [
    { when: "THU 06 / 19:00", title: "Night on the tram", credit: "Mira Orlov · 1962 · 92 min · 35 mm", note: "A last tram crosses a sleeping city. Introduced by curator Ada Vale." },
    { when: "FRI 07 / 20:30", title: "Windows facing west", credit: "Lucien Morel · 1974 · 108 min · 16 mm", note: "Three apartments, one summer evening. A newly restored print." },
    { when: "SAT 08 / 18:00", title: "Under the railway", credit: "Emi Tanaka · 1988 · 84 min · DCP", note: "A tender portrait of the people who keep the night running." },
    { when: "SUN 09 / 16:00", title: "The morning returns", credit: "Jonas Reed · 1997 · 101 min · 35 mm", note: "The closing screening is followed by a conversation in the foyer." },
  ],
};

function cinemaNode<K extends keyof HTMLElementTagNameMap>(tag: K, part: string, text = ""): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  if (part) el.setAttribute("data-pica-part", part);
  el.textContent = text;
  return el;
}

function cinemaLink(label: string, target: string): HTMLAnchorElement {
  const a = cinemaNode("a", "", label);
  a.href = `#${target}`;
  return a;
}

function cinemaRules(s: string): string {
  const fg = cssVar("fg");
  const bg = cssVar("bg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  return `
${s}{box-sizing:border-box;color:${fg};background:${bg}}
${s} [data-pica-page]{max-width:1200px;margin:auto;padding:clamp(20px,4vw,54px);font-size:16px;line-height:1.55}
${s} [data-pica-page] *{box-sizing:border-box;min-width:0}
${s} h1,${s} h2,${s} h3,${s} p,${s} figure,${s} dl,${s} dd{margin:0}
${s} h1{font:inherit;font-size:clamp(42px,6vw,80px);line-height:.98;letter-spacing:-.055em;font-weight:500}
${s} h2{font:inherit;font-size:clamp(25px,3vw,38px);line-height:1.1;letter-spacing:-.035em;font-weight:500}
${s} h3{font:inherit;font-size:22px;line-height:1.2;letter-spacing:-.02em;font-weight:500}
${s} [data-pica-part="label"]{font-family:${GRID_FONT};font-size:11px;line-height:1.5;letter-spacing:.08em;text-transform:uppercase}
${s} [data-pica-part="muted"]{color:${muted}}
${s} [data-pica-part="top"]{display:flex;justify-content:space-between;align-items:center;gap:18px;border-bottom:1px solid ${fg};padding-bottom:15px}
${s} nav{display:flex;gap:22px;flex-wrap:wrap}
${s} a{color:inherit;text-decoration-thickness:1px;text-underline-offset:4px;font-family:${GRID_FONT};font-size:11px;letter-spacing:.04em}
${s} a:focus-visible,${s} summary:focus-visible{outline:2px solid ${accent};outline-offset:4px}
${s} [data-pica-part="footer"]{display:flex;justify-content:space-between;gap:20px;margin-top:44px;border-top:1px solid ${fg};padding-top:18px;font-size:12px}
${s} svg{display:block;width:100%;height:auto;fill:none;stroke:currentColor;stroke-width:1.4}
${s} [data-pica-part="solid"]{fill:currentColor;stroke:none}
${s} [data-pica-part="accent"]{color:${accent}}
${s} [data-pica-part="rule"]{height:1px;background:${fg}}
@media(max-width:600px){${s} [data-pica-part="top"]{align-items:flex-start;flex-direction:column;gap:12px}${s} nav{gap:17px}${s} [data-pica-part="footer"]{flex-direction:column;gap:8px}${s} [data-pica-page]{font-size:15px}}

${s} [data-pica-part="opening"]{display:grid;grid-template-columns:1fr 2.1fr;gap:42px;padding:40px 0 45px}
${s} [data-pica-part="issue"]{border-right:1px solid ${fg};padding-right:30px;display:flex;flex-direction:column;justify-content:space-between;gap:24px}
${s} [data-pica-part="date"]{font-family:${GRID_FONT};font-size:clamp(40px,5vw,68px);font-weight:500;line-height:.95;letter-spacing:-.08em;max-width:6ch;overflow-wrap:normal;color:${fg};border-bottom:3px solid ${accent};padding-bottom:15px}
${s} [data-pica-part="month"]{display:block;font-size:22px;line-height:1.4;letter-spacing:.04em;margin-bottom:8px}
${s} [data-pica-part="days"]{white-space:nowrap}
${s} [data-pica-part="statement"]{max-width:38rem;margin-top:25px;font-size:18px;line-height:1.55}
${s} [data-pica-part="section-title"]{border-top:1px solid ${fg};padding:18px 0;font-family:${GRID_FONT};font-size:12px;letter-spacing:.05em;text-transform:uppercase}
${s} [data-pica-part="program"]{display:grid;grid-template-columns:1.25fr .75fr 1fr 1fr;border-top:1px solid ${fg};border-bottom:1px solid ${fg}}
${s} [data-pica-part="film"]{padding:22px 20px 30px 0;display:flex;flex-direction:column;gap:14px}
${s} [data-pica-part="film"]+[data-pica-part="film"]{border-left:1px solid ${fg};padding-left:20px}
${s} [data-pica-part="strip"]{font-family:${GRID_FONT};font-size:20px;height:62px;overflow:hidden;display:flex;align-items:center;letter-spacing:4px;color:${muted};border-top:1px solid ${muted};border-bottom:1px solid ${muted}}
${s} [data-pica-part="film"]:nth-child(2) [data-pica-part="strip"]{height:92px}
${s} [data-pica-part="film"]:nth-child(3) [data-pica-part="strip"]{height:44px}
${s} [data-pica-part="credit"]{font-family:${GRID_FONT};font-size:11px;line-height:1.6;color:${muted}}
${s} [data-pica-part="film-note"]{font-size:14px;line-height:1.6}
${s} [data-pica-part="visit"]{display:grid;grid-template-columns:1.25fr 1fr;gap:80px;padding-top:36px}
${s} [data-pica-part="notes"],${s} [data-pica-part="access"]{display:grid;align-content:start;gap:14px}
${s} [data-pica-part="access"]{font-size:14px;border-left:1px solid ${muted};padding-left:26px}
@media(max-width:900px){${s} [data-pica-part="program"]{grid-template-columns:1fr 1fr}${s} [data-pica-part="film"]:nth-child(3){border-left:0;padding-left:0;border-top:1px solid ${fg}}${s} [data-pica-part="film"]:nth-child(4){border-top:1px solid ${fg}}${s} [data-pica-part="visit"]{gap:35px}}
@media(max-width:600px){${s} [data-pica-part="opening"]{grid-template-columns:1fr;gap:25px;padding:26px 0}${s} [data-pica-part="issue"]{border-right:0;flex-direction:row;align-items:flex-start;padding:0;gap:15px}${s} [data-pica-part="issue"]>span{max-width:9ch}${s} [data-pica-part="issue"]>p{display:none}${s} [data-pica-part="date"]{max-width:none;font-size:38px;letter-spacing:-.08em}${s} [data-pica-part="month"]{font-size:16px;margin-bottom:4px}${s} [data-pica-part="program"]{grid-template-columns:1fr}${s} [data-pica-part="film"]+[data-pica-part="film"]{border-left:0;padding-left:0;border-top:1px solid ${fg}}${s} [data-pica-part="strip"]{height:45px!important}${s} [data-pica-part="visit"]{grid-template-columns:1fr;gap:25px}${s} [data-pica-part="access"]{padding-left:0;border-left:0;border-top:1px solid ${muted};padding-top:20px}}
`;
}

export const mount: Mount<CinematequeProgramProps> = (host, initial = {}) => {
  let props: CinematequeProgramProps = { ...defaults, ...initial };
  const attributes = hostAttributes(host);
  const container = cinemaNode("div", "");
  host.append(container);
  const sheet = scope(container);
  const page = cinemaNode("article", "");
  page.setAttribute("data-pica-page", "");
  container.append(page);
  const id = nextId("pica-cinemateque-program");
  sheet.setRules(cinemaRules(sheet.selector));
  let destroyed = false;
  const render = (): void => {
    attributes.set("aria-hidden", "false");
    attributes.set("role", "region");
    attributes.set("aria-label", props.title);
    page.replaceChildren();
    const top = cinemaNode("header", "top");
    top.append(cinemaNode("span", "label", props.cinema));
    const nav = cinemaNode("nav", "");
    nav.setAttribute("aria-label", "Program sections");
    nav.append(cinemaLink("01 / Screenings", `${id}-screenings`), cinemaLink("02 / Visiting", `${id}-visit`));
    top.append(nav);
    const opening = cinemaNode("div", "opening");
    const issue = cinemaNode("div", "issue");
    const date = cinemaNode("div", "date");
    const dateParts = props.date.trim().split(/\s+/);
    if (dateParts.length > 1) {
      date.append(cinemaNode("span", "month", `${dateParts.shift() ?? ""} `), cinemaNode("span", "days", dateParts.join(" ")));
    } else date.textContent = props.date;
    issue.append(cinemaNode("span", "label", "PROGRAM 041 / REPERTORY"), date, cinemaNode("p", "label", "One screen. Shared attention."));
    const intro = cinemaNode("div", "intro");
    intro.append(cinemaNode("h1", "", props.title), cinemaNode("p", "statement", props.introduction));
    opening.append(issue, intro);
    const screenings = cinemaNode("section", "screenings");
    screenings.id = `${id}-screenings`;
    screenings.append(cinemaNode("h2", "section-title", "On the screen"));
    const program = cinemaNode("div", "program");
    for (const [i, film] of props.films.entries()) {
      const screening = cinemaNode("article", "film");
      screening.append(cinemaNode("span", "label", `${String(i + 1).padStart(2, "0")}  /  ${film.when}`));
      const strip = cinemaNode("div", "strip");
      strip.setAttribute("aria-hidden", "true");
      strip.append(cinemaNode("span", "", "▥ ▥ ▥ ▥ ▥ ▥ ▥ ▥ ▥ ▥ ▥ ▥"));
      screening.append(strip, cinemaNode("h3", "", film.title), cinemaNode("p", "credit", film.credit), cinemaNode("p", "film-note", film.note));
      program.append(screening);
    }
    screenings.append(program);
    const visit = cinemaNode("section", "visit");
    visit.id = `${id}-visit`;
    const notes = cinemaNode("div", "notes");
    notes.append(cinemaNode("span", "label", "A note on projection"), cinemaNode("h2", "", "Seen together, in the dark."), cinemaNode("p", "", "Each print has its own grain, rhythm, and history. The lights come down at the listed time; arrive fifteen minutes early to find your seat."));
    const access = cinemaNode("div", "access");
    access.append(cinemaNode("span", "label", "Plan your evening"), cinemaNode("p", "", "Box office opens 45 minutes before each screening. All films include English subtitles. Step-free entry is available from the courtyard."), cinemaNode("p", "muted", "12 Mercer Lane · 86 seats · Hearing loop in rows A–D"));
    visit.append(notes, access);
    const footer = cinemaNode("footer", "footer");
    footer.append(cinemaNode("span", "label", "Independent cinema / shared attention"), cinemaLink("Back to screenings ↑", `${id}-screenings`));
    page.append(top, opening, screenings, visit, footer);
    attributes.set("data-pica-ready", "true");
  };
  render();
  return {
    update(next) {
      if (destroyed) return;
      const before = props;
      props = { ...props, ...next };
      if (!sameJson(before, props)) render();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      container.remove();
      sheet.destroy();
      attributes.restore();
    },
  };
};
