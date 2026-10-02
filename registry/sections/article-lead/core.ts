import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId, scope } from "../../../lib/host";
import { changed } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface ArticleLeadAuthor {
  /** The author's name, set in the page's own font. */
  name: string;
  /** What they did on the piece, set as a small mono label under the name. Empty shows no role. */
  role: string;
}

export interface ArticleLeadProps {
  /** The section name at the left of the dateline. Empty removes it. */
  section: string;
  /** The publication date as an ISO date, such as 2026-09-14. It sets the time element's datetime. An empty or invalid date removes the date and the Published row. */
  date: string;
  /** Who wrote the piece. At most four show. An empty list removes the Words by row. */
  authors: readonly ArticleLeadAuthor[];
  /** The reading time in minutes, from 0 to 60. Zero removes the Read time row. */
  readingTime: number;
  /** Up to three key points, each a sentence. An empty list removes the whole group. */
  points: readonly string[];
  /** The label above the key points. */
  pointsLabel: string;
  /** The accessible name of the aside that holds the facts and the key points. */
  label: string;
  /** The width of the text column, in characters of the page's own font, from 48 to 80. */
  measure: number;
}

export const defaults: ArticleLeadProps = {
  section: "ESSAY",
  date: "2026-09-14",
  authors: [
    { name: "Mara Quill", role: "Editor" },
    { name: "Jonas Reed", role: "Design" },
  ],
  readingTime: 8,
  points: [
    "A line near sixty characters is the length a reader can hold without losing the next one.",
    "Rhythm comes from one steady rule for spacing, repeated until the page stops asking to be noticed.",
    "Restraint is a choice about what to leave out, made before the first word is set.",
  ],
  pointsLabel: "In brief",
  label: "Article details",
  measure: 62,
};

const LEAD_MONTHS = [
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

const LEAD_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

/** An ISO date as the machine-readable stamp and the text a reader sees. It is written by hand from fixed
 *  English tables, in UTC terms, because a locale would let the two generated shapes print different text.
 *  Anything that is not a real calendar day gives null. */
function leadDate(iso: string): { stamp: string; text: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof iso === "string" ? iso.trim() : "");
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const length = month === 2 && leap ? 29 : LEAD_DAYS[month - 1];
  const name = LEAD_MONTHS[month - 1];
  if (length === undefined || name === undefined || day < 1 || day > length) return null;
  return { stamp: `${m[1]}-${m[2]}-${m[3]}`, text: `${day} ${name} ${year}` };
}

/** The authors that can be shown: objects with a name, at most four. */
function leadAuthors(value: unknown): ArticleLeadAuthor[] {
  if (!Array.isArray(value)) return [];
  const out: ArticleLeadAuthor[] = [];
  for (const item of value as unknown[]) {
    if (typeof item !== "object" || item === null) continue;
    const { name, role } = item as { name?: unknown; role?: unknown };
    if (typeof name !== "string" || !name.trim()) continue;
    out.push({ name: name.trim(), role: typeof role === "string" ? role.trim() : "" });
  }
  return out.slice(0, 4);
}

/** The key points that can be shown: non-empty strings, at most three. */
function leadPoints(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value as unknown[]) {
    if (typeof item === "string" && item.trim()) out.push(item.trim());
  }
  return out.slice(0, 3);
}

/** The reading time as whole minutes from 0 to 60. */
function leadMinutes(value: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(Math.min(60, Math.max(0, value))) : 0;
}

/** The measure in characters, from 48 to 80. */
function leadMeasure(value: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(80, Math.max(48, value)) : 62;
}

/** One of the core's own nodes: marked, and named for its part so the scoped rules can find it. */
function part(name: string, tag: keyof HTMLElementTagNameMap = "div"): HTMLElement {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute("data-part", name);
  return node;
}

/** A text-bearing child of one of the core's own nodes. */
function bit(name: string, tag: keyof HTMLElementTagNameMap, text: string): HTMLElement {
  const node = part(name, tag);
  node.textContent = text;
  return node;
}

/** Layout for the host and the lead's grammar, from STYLE.md: hairline rules, square corners, prose in the
 *  page's own font, and mono only on labels and figures. The accent sets one short rule and the focus
 *  outline, never text. The host is a grid: the page's children take the first column, held to the measure, and the aside sits at the host's right content edge so both margins match, and
 *  below 720px the grid folds to one column in source order. The floor goes in a :where() rule, which
 *  carries no specificity, so a page that gives this host a height of its own wins. */
function rules(selector: string, measure: number, aside: boolean): string {
  const s = selector;
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const muted = cssVar("muted");
  const hairline = `color-mix(in srgb, ${fg} 26%, transparent)`;
  const label = `font-family:${GRID_FONT};font-size:0.75em;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;font-variant-numeric:tabular-nums;color:${muted}`;
  const columns = aside ? `minmax(0,${measure}ch) 15rem` : `minmax(0,${measure}ch)`;
  return [
    `:where(${s}){min-height:10rem}`,
    `${s}{box-sizing:border-box;display:grid;grid-template-columns:${columns};column-gap:clamp(2rem,5vw,4rem);row-gap:0;align-content:start;justify-content:space-between;color:${fg};padding:clamp(1.5rem,5vw,4rem);overflow-wrap:break-word}`,
    `${s} > :not([data-pica]){grid-column:1;min-width:0}`,
    `${s} > p:first-of-type:not([data-pica]){font-family:inherit;font-size:1.25em;line-height:1.5}`,
    `${s} [data-part="dateline"]{grid-column:1;margin:0 0 1.25rem;${label};color:${fg}}`,
    `${s} [data-part="dateline"]::before{content:"";display:block;width:2rem;height:2px;margin-bottom:0.9rem;background:${accent}}`,
    `${s} [data-part="date"]{color:${muted}}`,
    `${s} [data-part="section"] + [data-part="date"]{margin-left:0.9em;padding-left:0.9em;border-left:1px solid ${hairline}}`,
    `${s} [data-part="aside"]{grid-column:2;grid-row:1 / span 99;align-self:stretch;min-width:0;box-sizing:border-box;padding-left:1.5rem;border-left:1px solid ${hairline}}`,
    `${s} [data-part="facts"]{margin:0;padding:0}`,
    `${s} [data-part="fact"]{padding:0.9rem 0;border-bottom:1px solid ${hairline}}`,
    `${s} [data-part="fact"]:first-child{padding-top:0}`,
    `${s} [data-part="fact"] dt{margin:0 0 0.35rem;${label}}`,
    `${s} [data-part="fact"] dd{margin:0}`,
    `${s} [data-part="fact"] dd + dd{margin-top:0.85rem}`,
    `${s} [data-part="role"]{display:block;margin-top:0.3rem;${label}}`,
    `${s} [data-part="figure"]{font-family:${GRID_FONT};font-variant-numeric:tabular-nums;letter-spacing:0.04em;text-transform:uppercase}`,
    `${s} [data-part="points"]{padding:0.9rem 0 0}`,
    `${s} [data-part="points-label"]{margin:0 0 0.35rem;${label}}`,
    `${s} [data-part="list"]{margin:0;padding:0;list-style:none;counter-reset:pica-lead}`,
    `${s} [data-part="list"] li{counter-increment:pica-lead;display:grid;grid-template-columns:2em minmax(0,1fr);column-gap:0.5em;padding:0.75rem 0;line-height:1.4;border-top:1px solid ${hairline}}`,
    `${s} [data-part="list"] li:first-child{border-top:0;padding-top:0.5rem}`,
    `${s} [data-part="list"] li::before{content:counter(pica-lead, decimal-leading-zero);${label}}`,
    `${s}[data-pica-fit="min"]{grid-template-columns:minmax(0,1fr);padding:1.25rem}`,
    `${s}[data-pica-fit="min"] [data-part="aside"]{grid-column:1;grid-row:auto;margin-top:1.75rem;padding:1.25rem 0 0;border-left:0;border-top:1px solid ${hairline}}`,
    `${s} :is(a,button):focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${s} :is(button,input,select,textarea):disabled{opacity:0.45}`,
  ].join("\n");
}

export const mount: Mount<ArticleLeadProps> = (host, initial = {}) => {
  let props: ArticleLeadProps = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  const sheet = scope(host);

  const dateline = part("dateline");
  const section = part("section", "span");
  const when = part("date", "time");
  dateline.append(section, when);
  const aside = part("aside", "aside");
  host.prepend(dateline);
  host.append(aside);

  let shown = true;

  /** A fact row holding its term, ready for one or more values. */
  function row(term: string): HTMLElement {
    const fact = part("fact");
    fact.append(bit("term", "dt", term));
    return fact;
  }

  /** Writes the dateline: the section name and the date, each removed when empty. */
  function renderDateline(): void {
    const date = leadDate(props.date);
    section.textContent = props.section;
    section.style.display = props.section ? "" : "none";
    if (date) {
      when.textContent = date.text;
      when.setAttribute("datetime", date.stamp);
    } else {
      when.textContent = "";
      when.removeAttribute("datetime");
    }
    when.style.display = date ? "" : "none";
  }

  /** Rebuilds the aside from the props. A row or group with nothing to show is never created, and an aside
   *  with nothing at all is hidden and its column dropped, so the layout never keeps an empty frame. */
  function renderAside(): void {
    const date = leadDate(props.date);
    const authors = leadAuthors(props.authors);
    const minutes = leadMinutes(props.readingTime);
    const points = leadPoints(props.points);
    const facts = part("facts", "dl");
    if (authors.length > 0) {
      const fact = row("Words by");
      for (const author of authors) {
        const dd = part("author", "dd");
        dd.append(bit("name", "span", author.name));
        if (author.role) dd.append(bit("role", "span", author.role));
        fact.append(dd);
      }
      facts.append(fact);
    }
    if (date) {
      const fact = row("Published");
      fact.append(bit("published", "dd", date.text));
      facts.append(fact);
    }
    if (minutes > 0) {
      const fact = row("Read time");
      fact.append(bit("figure", "dd", `${minutes} min`));
      facts.append(fact);
    }
    const children: HTMLElement[] = [];
    if (facts.childElementCount > 0) children.push(facts);
    if (points.length > 0) {
      const group = part("points");
      const list = part("list", "ol");
      if (props.pointsLabel) {
        const id = nextId("pica-lead");
        const heading = bit("points-label", "p", props.pointsLabel);
        heading.id = id;
        list.setAttribute("aria-labelledby", id);
        group.append(heading);
      }
      for (const point of points) {
        const li = document.createElement("li");
        li.setAttribute("data-pica", "");
        li.textContent = point;
        list.append(li);
      }
      group.append(list);
      children.push(group);
    }
    aside.replaceChildren(...children);
    if (props.label) aside.setAttribute("aria-label", props.label);
    else aside.removeAttribute("aria-label");
    const has = children.length > 0;
    aside.style.display = has ? "" : "none";
    if (has !== shown) {
      shown = has;
      sheet.setRules(rules(sheet.selector, leadMeasure(props.measure), shown));
    }
  }

  /** Below 720px the grid folds to one column and the aside drops under the children. */
  function fit(): void {
    attrs.set("data-pica-fit", host.clientWidth < 720 ? "min" : null);
  }

  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(fit) : null;

  sheet.setRules(rules(sheet.selector, leadMeasure(props.measure), true));
  renderDateline();
  renderAside();
  fit();
  observer?.observe(host);
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.measure !== before.measure) sheet.setRules(rules(sheet.selector, leadMeasure(props.measure), shown));
      if (changed(before, props, ["section", "date"])) renderDateline();
      if (changed(before, props, ["date", "authors", "readingTime", "points", "pointsLabel", "label"])) renderAside();
    },
    destroy() {
      observer?.disconnect();
      dateline.remove();
      aside.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};
