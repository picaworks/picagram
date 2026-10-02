import { hiddenText } from "../../../lib/a11y";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId, scope } from "../../../lib/host";
import { changed } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface ScheduleSession {
  /** The day the session is on, as an ISO date such as 2026-11-12. */
  day: string;
  /** Start time as wall clock text, such as 09:30. Printed exactly as given. */
  start: string;
  /** End time as wall clock text, such as 10:15. Printed exactly as given. */
  end: string;
  /** Session title. A session with an empty title is skipped. */
  title: string;
  /** Who gives it. Optional. */
  speaker?: string;
  /** Where it happens. Optional. */
  place?: string;
  /** Where the title links to. Optional; without it the title is plain text. */
  href?: string;
}

export interface EventScheduleProps {
  /** Sessions in any order. They are grouped by day, in date order and then start order, ties in input order. */
  sessions: ScheduleSession[];
  /** Index of one session in the sorted order that is marked with a bar and a label. -1 marks none. */
  highlight: number;
  /** Visible label printed before the highlighted session's title. */
  highlightLabel: string;
  /** Caption printed once above the first day, such as the time zone. Empty shows none. */
  zone: string;
  /** Heading level of each day heading, from 2 to 5, so it fits under the page's own headings. */
  headingLevel: number;
  /** Accessible name of the schedule. */
  label: string;
}

export const defaults: EventScheduleProps = {
  sessions: [
    { day: "2026-11-12", start: "09:00", end: "09:30", title: "Opening remarks", speaker: "Maren Holt", place: "Main hall" },
    { day: "2026-11-12", start: "10:00", end: "10:45", title: "How a grid measures type", speaker: "Dario Okafor", place: "Main hall" },
    { day: "2026-11-12", start: "13:30", end: "16:00", title: "Workshop: setting a page in one font", speaker: "Priya Venkataraman", place: "Studio 2" },
    { day: "2026-11-13", start: "09:30", end: "10:30", title: "Panel: print habits on the screen", speaker: "Lena Aoki and guests", place: "Main hall" },
    { day: "2026-11-13", start: "11:00", end: "11:40", title: "Palettes of four colors", speaker: "Tomas Brandt", place: "Room 4" },
    { day: "2026-11-13", start: "16:30", end: "17:00", title: "Closing session", speaker: "Maren Holt", place: "Main hall" },
  ],
  highlight: 1,
  highlightLabel: "Next up",
  zone: "All times local to the venue",
  headingLevel: 3,
  label: "Event schedule",
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** One valid session, with the pieces the draw needs. */
interface Entry {
  session: ScheduleSession;
  minutes: number;
}

/** The weekday, day of the month, and month name of an ISO date, read in UTC from fixed English tables so every
 *  shape prints the same text. Null when the text is not a real calendar date. */
function parseDay(day: string): { weekday: string; date: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const date = Number(m[3]);
  const t = new Date(Date.UTC(year, month, date));
  if (t.getUTCFullYear() !== year || t.getUTCMonth() !== month || t.getUTCDate() !== date) return null;
  return { weekday: WEEKDAYS[t.getUTCDay()] ?? "", date: `${date} ${MONTHS[month] ?? ""}` };
}

/** Minutes after midnight for HH:MM text, used only to order sessions. Unreadable text sorts last in its day. */
function clockMinutes(text: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : Infinity;
}

/** The datetime attribute for a start time, or null when the start is not clock text. */
function startStamp(day: string, start: string): string | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(start.trim());
  return m ? `${day}T${(m[1] ?? "").padStart(2, "0")}:${m[2] ?? "00"}` : null;
}

/** Sessions with a title and a real day, in date order and then start order. The sort is stable, so ties keep
 *  their input order. */
function arrange(sessions: readonly ScheduleSession[]): Entry[] {
  const entries: Entry[] = [];
  for (const session of sessions) {
    if (!session || typeof session.title !== "string" || session.title.trim() === "") continue;
    if (typeof session.day !== "string" || !parseDay(session.day)) continue;
    entries.push({ session, minutes: clockMinutes(String(session.start ?? "")) });
  }
  return entries.sort((a, b) => {
    if (a.session.day !== b.session.day) return a.session.day < b.session.day ? -1 : 1;
    if (a.minutes === b.minutes) return 0;
    return a.minutes < b.minutes ? -1 : 1;
  });
}

/** Whether a link target is safe to put in an href. Script and data targets are dropped. */
function safeHref(href: unknown): string {
  if (typeof href !== "string") return "";
  const value = href.trim();
  return /^(javascript|data|vbscript):/i.test(value.replace(/\s/g, "")) ? "" : value;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, role: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", role);
  if (text !== undefined) node.textContent = text;
  return node;
}

/** One session's list item: start and end time, then the title, then a line of speaker and place. */
function buildSession(day: string, session: ScheduleSession, marked: boolean, markLabel: string): HTMLLIElement {
  const li = el("li", "session");
  if (marked) li.setAttribute("data-pica-mark", "");

  const when = el("div", "when");
  const start = el("time", "start", String(session.start ?? ""));
  const stamp = startStamp(day, String(session.start ?? ""));
  if (stamp) start.setAttribute("datetime", stamp);
  when.append(start);
  const endText = String(session.end ?? "").trim();
  if (endText) {
    const end = el("span", "end");
    const until = hiddenText("until ");
    until.setAttribute("data-pica", "");
    end.append(until, endText);
    when.append(end);
  }

  const body = el("div", "body");
  if (marked && markLabel) body.append(el("span", "mark", markLabel));
  const href = safeHref(session.href);
  const title = href ? el("a", "title", session.title) : el("span", "title", session.title);
  if (href) (title as HTMLAnchorElement).setAttribute("href", href);
  body.append(title);
  const who = [session.speaker, session.place].filter((s): s is string => typeof s === "string" && s.trim() !== "");
  if (who.length) body.append(el("span", "who", who.join(" · ")));

  li.append(when, body);
  return li;
}

/** The scoped rules. Hairlines are fg at a low strength, the accent is only the highlight bar, and a host under
 *  640px wide stacks the day label above its sessions and each time above its title. */
function rules(s: string): string {
  const rule = `1px solid color-mix(in srgb, ${cssVar("fg")} 22%, transparent)`;
  const m = (role: string) => `${s} [data-pica="${role}"]`;
  /** The same selector, narrowed to a host that is measured as narrow. */
  const n = (selector: string) => selector.replace(s, `${s}[data-pica-fit="min"]`);
  return [
    `:where(${s}){min-height:12rem}`,
    `${s}{box-sizing:border-box;padding:clamp(1.5rem,5vw,4rem);color:${cssVar("fg")}}`,
    `${m("schedule")}{display:block;margin-top:2.5em;min-width:0}`,
    `${m("zone")}{margin:0 0 1rem;font-family:${GRID_FONT};font-variant-numeric:tabular-nums;font-size:0.8em;letter-spacing:0.04em;text-transform:uppercase;color:${cssVar("muted")}}`,
    `${m("empty")}{margin:0;color:${cssVar("muted")}}`,
    `${m("day")}{display:grid;grid-template-columns:11rem minmax(0,1fr);column-gap:2rem;padding:1.5rem 0;border-top:${rule};min-width:0}`,
    `${m("day")}:last-child{border-bottom:${rule}}`,
    `${m("heading")}{margin:0;padding:0;font:inherit;font-size:1em;font-weight:inherit;line-height:1.1;letter-spacing:normal;text-transform:none;color:inherit}`,
    `${m("weekday")}{display:block;font-family:${GRID_FONT};font-variant-numeric:tabular-nums;font-size:0.8em;font-weight:500;letter-spacing:0.04em;text-transform:uppercase;color:${cssVar("muted")}}`,
    `${m("date")}{display:block;margin-top:0.35em;font-size:1.75em;font-weight:600;line-height:1.1;overflow-wrap:anywhere}`,
    `${m("list")}{margin:0;padding:0;list-style:none;min-width:0}`,
    `${m("session")}{position:relative;display:grid;grid-template-columns:6rem minmax(0,1fr);column-gap:1rem;margin:0;padding:0.9rem 0 0.9rem 1rem;min-width:0}`,
    `${m("session")}:first-child{padding-top:0}`,
    `${m("session")}:last-child{padding-bottom:0}`,
    `${m("session")}:not(:first-child){border-top:${rule}}`,
    `${m("session")}[data-pica-mark]::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:${cssVar("accent")}}`,
    `${m("session")}[data-pica-mark]:first-child::before{top:0}`,
    `${m("when")}{display:flex;flex-direction:column;gap:0.15em;font-family:${GRID_FONT};font-variant-numeric:tabular-nums;font-size:0.9em;line-height:1.4}`,
    `${m("end")}{color:${cssVar("muted")}}`,
    `${m("body")}{display:flex;flex-direction:column;gap:0.25em;min-width:0;overflow-wrap:anywhere}`,
    `${m("mark")}{font-family:${GRID_FONT};font-variant-numeric:tabular-nums;font-size:0.8em;font-weight:500;letter-spacing:0.04em;text-transform:uppercase}`,
    `${m("title")}{font-size:1.1em;font-weight:600;line-height:1.3;color:inherit}`,
    `${s} a[data-pica="title"]{text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:0.2em}`,
    `${s} a[data-pica="title"]:hover{background:color-mix(in srgb, ${cssVar("fg")} 10%, transparent)}`,
    `${s} a[data-pica="title"]:focus-visible{outline:2px solid ${cssVar("accent")};outline-offset:2px}`,
    `${m("who")}{font-size:0.95em;line-height:1.4;color:${cssVar("muted")}}`,
    `${n(m("day"))}{grid-template-columns:minmax(0,1fr);row-gap:1rem}`,
    `${n(m("session"))}{grid-template-columns:minmax(0,1fr);row-gap:0.4rem}`,
    `${n(m("when"))}{flex-direction:row;flex-wrap:wrap;column-gap:0.5em}`,
    `${n(m("end"))}::before{content:"\\2013\\00a0"}`,
  ].join("\n");
}

export const mount: Mount<EventScheduleProps> = (host, initial = {}) => {
  let props: EventScheduleProps = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const frame = el("div", "schedule");
  host.appendChild(frame);

  function draw(): void {
    frame.replaceChildren();
    const entries = arrange(Array.isArray(props.sessions) ? props.sessions : []);
    const level = Math.min(5, Math.max(2, Math.round(props.headingLevel)));
    if (props.label && entries.length) {
      frame.setAttribute("role", "group");
      frame.setAttribute("aria-label", props.label);
    } else {
      frame.removeAttribute("role");
      frame.removeAttribute("aria-label");
    }
    if (entries.length === 0) {
      frame.append(el("p", "empty", "No sessions scheduled."));
      return;
    }
    if (props.zone) frame.append(el("p", "zone", props.zone));

    let section: HTMLElement | null = null;
    let list: HTMLOListElement | null = null;
    let current = "";
    entries.forEach((entry, i) => {
      const { session } = entry;
      if (session.day !== current || !section || !list) {
        current = session.day;
        const parts = parseDay(current);
        section = el("section", "day");
        const id = nextId("pica-day");
        const heading = el(`h${level}` as "h2", "heading");
        heading.id = id;
        heading.append(el("span", "weekday", parts?.weekday ?? ""), " ", el("span", "date", parts?.date ?? ""));
        section.setAttribute("aria-labelledby", id);
        list = el("ol", "list");
        section.append(heading, list);
        frame.append(section);
      }
      list.append(buildSession(session.day, session, i === props.highlight, props.highlightLabel));
    });
  }

  /** Below 640px the day label stacks above its sessions, and each time sits above its title. */
  function measure(): void {
    attrs.set("data-pica-fit", host.clientWidth < 640 ? "min" : null);
  }

  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
  sheet.setRules(rules(sheet.selector));
  draw();
  measure();
  observer?.observe(host);
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (changed(before, props, ["sessions", "highlight", "highlightLabel", "zone", "headingLevel", "label"])) draw();
    },
    destroy() {
      observer?.disconnect();
      frame.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};
