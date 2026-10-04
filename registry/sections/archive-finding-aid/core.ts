import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface ArchiveSeries {
  /** The series title. */
  title: string;
  /** The date span. */
  dates: string;
  /** The physical extent. */
  extent: string;
  /** A description of the series contents. */
  description: string;
  /** Folder titles in the series. */
  folders: readonly string[];
}

export interface ArchiveFindingAidProps {
  /** The collection title. */
  title: string;
  /** The institutional collection identifier. */
  identifier: string;
  /** The repository name. */
  repository: string;
  /** The collection summary. */
  summary: string;
  /** The series arranged in the finding aid. */
  series: readonly ArchiveSeries[];
}

export const defaults: ArchiveFindingAidProps = {
  title: "Morrow Print Workshop records",
  identifier: "MPW / 017",
  repository: "City Archive / Special Collections",
  summary: "The working papers of a community print studio, documenting forty years of posters, teaching, and collective publishing. The collection preserves the everyday decisions behind a public visual culture.",
  series: [
    { title: "Administration & correspondence", dates: "1978–2016", extent: "4 boxes / 23 folders", description: "Meeting minutes, letters, lease agreements, and the notebooks used to coordinate the workshop. Original folder order has been retained.", folders: ["Founding documents, 1978–1980", "Committee minutes, 1981–2004", "Correspondence with artists, 1983–2016"] },
    { title: "Posters & print editions", dates: "1979–2018", extent: "12 flat files / 186 items", description: "Proofs, finished editions, and annotated layouts for neighbourhood campaigns, exhibitions, and performances. Oversize items require advance notice.", folders: ["Campaign posters, 1979–1992", "Exhibition editions, 1985–2010", "Uncatalogued proofs, undated"] },
    { title: "Teaching & public programs", dates: "1982–2018", extent: "3 boxes / 18 folders", description: "Course outlines, attendance books, sample exercises, and photographs of open studio days. Personal contact details are restricted.", folders: ["Course outlines, 1982–2001", "Open studio records, 1990–2018", "Photographic documentation, 1982–2015"] },
  ],
};

function archiveNode<K extends keyof HTMLElementTagNameMap>(tag: K, part: string, text = ""): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  if (part) el.setAttribute("data-pica-part", part);
  el.textContent = text;
  return el;
}

function archiveLink(label: string, target: string): HTMLAnchorElement {
  const a = archiveNode("a", "", label);
  a.href = `#${target}`;
  return a;
}

function archiveRules(s: string): string {
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

${s} [data-pica-part="layout"]{display:grid;grid-template-columns:290px 1fr;gap:48px;padding-top:34px}
${s} [data-pica-part="sidebar"]{border-right:1px solid ${fg};padding-right:34px}
${s} [data-pica-part="identifier"]{font-family:${GRID_FONT};font-size:42px;line-height:1.1;letter-spacing:-.055em;margin-top:17px;color:${fg};border-bottom:3px solid ${accent};padding-bottom:15px}
${s} [data-pica-part="stamp"]{font-family:${GRID_FONT};font-size:12px;line-height:1.65;letter-spacing:.09em;white-space:pre-line;border:1px solid ${fg};display:inline-block;padding:12px 20px;margin:29px 0}
${s} [data-pica-part="facts"] dd{font-size:13px;margin:5px 0 21px}
${s} [data-pica-part="tree"]{white-space:pre-line;font-family:${GRID_FONT};font-size:11px;line-height:2.1;margin-top:30px;color:${muted}}
${s} [data-pica-part="overview"] h1{font-size:clamp(42px,5vw,66px);margin-top:20px;max-width:13ch;overflow-wrap:anywhere}
${s} [data-pica-part="summary"]{margin-top:26px;font-size:18px;max-width:42rem}
${s} [data-pica-part="context"]{margin-top:30px;padding:23px 0;border-top:1px solid ${muted};display:grid;grid-template-columns:1fr 1.7fr;gap:24px;font-size:14px}
${s} [data-pica-part="context"] h2{font-size:21px}
${s} [data-pica-part="contents"]{padding-top:28px;border-top:1px solid ${fg}}
${s} [data-pica-part="contents"]>p{margin:12px 0 25px;font-size:13px}
${s} [data-pica-part="series"]{border-top:1px solid ${fg}}
${s} [data-pica-part="series"]:last-child{border-bottom:1px solid ${fg}}
${s} [data-pica-part="series-heading"]{display:list-item;cursor:pointer;padding:22px 0;list-style-position:inside;font-size:18px}
${s} [data-pica-part="series-number"]{font-family:${GRID_FONT};font-size:11px;margin:0 16px 0 5px;color:${muted}}
${s} [data-pica-part="series-dates"]{font-family:${GRID_FONT};font-size:11px;display:block;padding-left:48px;color:${muted};margin-top:7px}
${s} [data-pica-part="series-body"]{padding:0 0 23px 48px;display:grid;gap:16px;font-size:14px}
${s} [data-pica-part="folders"]{margin:0;padding-left:20px;font-family:${GRID_FONT};font-size:11px;line-height:2}
${s} [data-pica-part="access"]{margin-top:34px;display:grid;gap:17px;font-size:14px}
${s} [data-pica-part="access"] h2{font-size:27px}
${s} [data-pica-part="citation"]{border-left:2px solid ${accent};padding-left:20px;color:${muted};font-size:12px}
@media(max-width:900px){${s} [data-pica-part="layout"]{grid-template-columns:230px 1fr;gap:30px}${s} [data-pica-part="identifier"]{font-size:34px}${s} [data-pica-part="context"]{grid-template-columns:1fr;gap:15px}}
@media(max-width:600px){${s} [data-pica-part="layout"]{grid-template-columns:1fr;gap:26px;padding-top:24px}${s} [data-pica-part="sidebar"]{border-right:0;border-bottom:1px solid ${fg};padding:0 0 20px;display:grid;grid-template-columns:1fr 1fr;gap:12px}${s} [data-pica-part="sidebar"]>span{grid-column:1/-1}${s} [data-pica-part="identifier"]{font-size:32px;margin:0}${s} [data-pica-part="stamp"]{margin:0;justify-self:end;font-size:10px;padding:9px 12px}${s} [data-pica-part="facts"]{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:6px 15px;margin-top:12px}${s} [data-pica-part="facts"] dd{margin:0 0 5px}${s} [data-pica-part="tree"]{display:none}${s} [data-pica-part="overview"] h1{font-size:46px}${s} [data-pica-part="summary"]{font-size:16px}${s} [data-pica-part="series-heading"]{font-size:16px}${s} [data-pica-part="series-number"]{margin-right:8px}${s} [data-pica-part="series-dates"]{padding-left:40px}${s} [data-pica-part="series-body"]{padding-left:20px}}
`;
}

export const mount: Mount<ArchiveFindingAidProps> = (host, initial = {}) => {
  let props: ArchiveFindingAidProps = { ...defaults, ...initial };
  const attributes = hostAttributes(host);
  const container = archiveNode("div", "");
  host.append(container);
  const sheet = scope(container);
  const page = archiveNode("article", "");
  page.setAttribute("data-pica-page", "");
  container.append(page);
  const id = nextId("pica-archive-finding-aid");
  sheet.setRules(archiveRules(sheet.selector));
  let destroyed = false;
  const render = (): void => {
    attributes.set("aria-hidden", "false");
    attributes.set("role", "region");
    attributes.set("aria-label", props.title);
    page.replaceChildren();
    const top = archiveNode("header", "top");
    top.append(archiveNode("span", "label", props.repository));
    const nav = archiveNode("nav", "");
    nav.setAttribute("aria-label", "Finding aid sections");
    nav.append(archiveLink("Collection", `${id}-collection`), archiveLink("Contents", `${id}-contents`), archiveLink("Access", `${id}-access`));
    top.append(nav);
    const layout = archiveNode("div", "layout");
    const sidebar = archiveNode("aside", "sidebar");
    sidebar.setAttribute("aria-label", "Collection reference");
    sidebar.append(archiveNode("span", "label", "Collection reference"), archiveNode("p", "identifier", props.identifier), archiveNode("div", "stamp", `PROCESSED
FINDING AID
REV. 2025.02`));
    const facts = archiveNode("dl", "facts");
    for (const [label, value] of [["Inclusive dates", "1978–2018"], ["Extent", "19 boxes + 12 flat files"], ["Language", "English"], ["Arrangement", `${props.series.length} series`]]) {
      facts.append(archiveNode("dt", "label", label), archiveNode("dd", "", value));
    }
    sidebar.append(facts, archiveNode("p", "tree", `COLLECTION\n${props.series.map((series, i) => `${i === props.series.length - 1 ? "└" : "├"}── ${String(i + 1).padStart(2, "0")}. ${series.title}`).join("\n")}`));
    const main = archiveNode("div", "main");
    const overview = archiveNode("section", "overview");
    overview.id = `${id}-collection`;
    overview.append(archiveNode("span", "label", "Descriptive inventory / 01"), archiveNode("h1", "", props.title), archiveNode("p", "summary", props.summary));
    const context = archiveNode("div", "context");
    context.append(archiveNode("h2", "", "Administrative history"), archiveNode("p", "", "Founded in a converted bakery in 1978, the workshop offered shared presses and evening instruction. Members deposited the records when the studio relocated in 2018."));
    overview.append(context);
    const contents = archiveNode("section", "contents");
    contents.id = `${id}-contents`;
    contents.append(archiveNode("h2", "", "Scope & contents"), archiveNode("p", "muted", "Expand a series to inspect its description and folder list."));
    for (const [i, series] of props.series.entries()) {
      const detail = archiveNode("details", "series");
      const summary = archiveNode("summary", "series-heading");
      summary.append(archiveNode("span", "series-number", String(i + 1).padStart(2, "0")), archiveNode("span", "series-name", series.title), archiveNode("span", "series-dates", series.dates));
      const body = archiveNode("div", "series-body");
      body.append(archiveNode("p", "label", series.extent), archiveNode("p", "", series.description));
      const folders = archiveNode("ol", "folders");
      for (const folder of series.folders) folders.append(archiveNode("li", "", folder));
      body.append(folders);
      detail.append(summary, body);
      contents.append(detail);
    }
    const access = archiveNode("section", "access");
    access.id = `${id}-access`;
    access.append(archiveNode("span", "label", "Conditions of use"), archiveNode("h2", "", "Start with the reference number."), archiveNode("p", "", "Consultation is by appointment in the reading room. Request boxes at least two working days before your visit. Most material is open; selected personal information remains restricted."), archiveNode("p", "citation", `Suggested citation: ${props.title}, ${props.identifier}, ${props.repository}.`));
    main.append(overview, contents, access);
    layout.append(sidebar, main);
    const footer = archiveNode("footer", "footer");
    footer.append(archiveNode("span", "label", "Prepared by the collections team / descriptive record"), archiveLink("Back to collection ↑", `${id}-collection`));
    page.append(top, layout, footer);
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
