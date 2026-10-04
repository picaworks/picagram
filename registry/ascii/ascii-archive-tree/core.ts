import type { Mount } from "../../../lib/types";
import { hostAttributes, nextId } from "../../../lib/host";
import { GRID_FONT } from "../../../lib/font";
import { cssVar } from "../../../lib/palette";
import { sameJson } from "../../../lib/json";
export interface AsciiArchiveTreeProps {
  /** The archive collection name. */
  title: string;
  /** The collection reference code. */
  reference: string;
  /** The scope and arrangement note. */
  scopeNote: string;
  /** Series and their constituent records. */
  series: { code: string; title: string; dates: string; description: string; records: { title: string; reference: string; extent: string }[] }[];
}
export const defaults: AsciiArchiveTreeProps = {
  "title": "River survey papers",
  "reference": "RS / 1948\u20131976",
  "scopeNote": "Field notebooks, working maps and correspondence from three decades of river surveys. Arranged by record type, then by date.",
  "series": [
    {
      "code": "01",
      "title": "Field notebooks",
      "dates": "1948\u20131968",
      "description": "Daily observations, weather records and instrument readings from the upper river stations.",
      "records": [
        {
          "title": "North channel notebook",
          "reference": "RS/01/001",
          "extent": "1 bound volume / 1948\u20131952"
        },
        {
          "title": "Bridge station notebook",
          "reference": "RS/01/002",
          "extent": "2 bound volumes / 1953\u20131968"
        }
      ]
    },
    {
      "code": "02",
      "title": "Working maps",
      "dates": "1950\u20131976",
      "description": "Annotated sheets recording channels, erosion and changes in the floodplain.",
      "records": [
        {
          "title": "Floodplain index sheets",
          "reference": "RS/02/001",
          "extent": "12 folded sheets / 1950\u20131976"
        }
      ]
    },
    {
      "code": "03",
      "title": "Correspondence",
      "dates": "1949\u20131972",
      "description": "Letters between the field surveyors and the regional water office.",
      "records": [
        {
          "title": "Water office letters",
          "reference": "RS/03/001",
          "extent": "3 folders / 1949\u20131972"
        }
      ]
    }
  ]
};

export const mount: Mount<AsciiArchiveTreeProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  const id = nextId("pica-ascii-system");
  attrs.set("data-pica-id", id);
  const sheet = document.createElement("style"); sheet.setAttribute("data-pica", ""); host.append(sheet);
  const s = `[data-pica-id="${id}"]`;
  sheet.textContent = `${s}{color:${cssVar("fg")};background:${cssVar("bg")};font:inherit;line-height:1.6}
${s} [data-root]{max-width:1120px;margin:auto;padding:clamp(20px,4vw,52px);box-sizing:border-box}
${s} *{box-sizing:border-box}
${s} h1{font-size:clamp(32px,5vw,64px);line-height:1.05;font-weight:500;letter-spacing:-.035em;margin:16px 0 24px;max-width:16ch}
${s} h2{font-size:20px;font-weight:500;margin:0 0 16px}
${s} h3{font-size:16px;font-weight:500;margin:0 0 8px}
${s} p{margin:0 0 16px;max-width:65ch}
${s} [data-kicker],${s} dt,${s} button,${s} select,${s} summary,${s} [data-mono]{font-family:${GRID_FONT};font-size:12px;letter-spacing:.04em}
${s} [data-kicker]{text-transform:uppercase;color:${cssVar("muted")}}
${s} pre{font-family:${GRID_FONT};font-size:13px;line-height:1.35;white-space:pre;margin:0;overflow:auto}
${s} figure{margin:0}
${s} figcaption{font-family:${GRID_FONT};font-size:11px;color:${cssVar("muted")};margin-top:16px}
${s} button,${s} select{color:inherit;background:${cssVar("bg")};border:1px solid ${cssVar("muted")};border-radius:0;padding:10px 12px;min-height:44px;cursor:pointer}
${s} button[aria-pressed="true"]{border-bottom:4px solid ${cssVar("accent")}}
${s} :focus-visible{outline:2px solid ${cssVar("accent")};outline-offset:3px}
${s} [data-rule]{border-top:1px solid ${cssVar("muted")};padding-top:24px;margin-top:32px}
${s} details{border-top:1px solid ${cssVar("muted")};padding:12px 0}
${s} summary{cursor:pointer;min-height:32px}
${s} details p{margin:12px 0}
${s} ul,${s} ol{padding-left:20px;margin:12px 0}
${s} li{margin:8px 0}
${s} dl{margin:0}
${s} dt{color:${cssVar("muted")};text-transform:uppercase}
${s} dd{margin:0 0 16px}
${s} [data-compact]{display:none}
@media(max-width:620px){${s} [data-wide]{display:none}${s} [data-compact]{display:block}${s} h1{font-size:38px}${s} pre{font-size:12px}}
${s} [data-root]{max-width:960px}
${s} [data-heading]{display:flex;justify-content:space-between;gap:24px;align-items:baseline;margin:20px 0}
${s} [data-heading] h2{font-size:32px;max-width:20ch}
${s} [data-reference]{font-family:${GRID_FONT};font-size:14px;border-bottom:4px solid ${cssVar("accent")};padding-bottom:8px}
${s} [data-tree]{margin-top:32px}
${s} [data-tree] summary{display:list-item;padding:8px 0}
${s} [data-prefix],${s} [data-twig]{font-family:${GRID_FONT};color:${cssVar("muted")}}
${s} [data-dates]{float:right;color:${cssVar("muted")}}
${s} [data-records]{margin:20px 0 8px 32px;border-left:1px solid ${cssVar("muted")};padding-left:24px}
${s} [data-records] ul{list-style:none;padding:0}
${s} [data-records] li{margin:20px 0}
${s} [data-records] strong{font-weight:500}
${s} [data-record-id]{font-family:${GRID_FONT};font-size:11px;display:block;margin:4px 0 4px 24px;color:${cssVar("muted")}}
${s} [data-records] li p{margin:0 0 0 24px;font-size:14px}
@media(max-width:620px){${s} [data-heading]{display:block}${s} [data-dates]{float:none;display:block;margin-left:32px}${s} [data-records]{margin-left:12px;padding-left:16px}}
`;
  const root = document.createElement("div"); root.setAttribute("data-pica", ""); root.setAttribute("data-root", ""); host.append(root);
  function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = "", parent: HTMLElement = root): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag); node.setAttribute("data-pica", ""); node.textContent = text; parent.append(node); return node;
  }
  function marked<K extends keyof HTMLElementTagNameMap>(tag: K, mark: string, text = "", parent: HTMLElement = root): HTMLElementTagNameMap[K] {
    const node = el(tag, text, parent); node.setAttribute(`data-${mark}`, ""); return node;
  }
  function render(): void {
    root.replaceChildren();
    attrs.set("role", "region"); attrs.set("aria-label", props.title.trim() || "Archive tree"); attrs.set("aria-hidden", null);
    marked("p", "kicker", "FINDING AID / COLLECTION REGISTER");
    const heading = marked("header", "heading"); el("h2", props.title.trim() || "Archive tree", heading); marked("p", "reference", props.reference, heading); el("p", props.scopeNote);
    const tree = marked("div", "tree");
    marked("p", "mono", `┬ ${props.reference}`, tree);
    if (!props.series.length) el("p", "No series described yet.", tree);
    props.series.forEach((series, i) => { const details = el("details", "", tree); details.open = i === 0; const summary = el("summary", "", details); const prefix = marked("span", "prefix", i === props.series.length - 1 ? "└── " : "├── ", summary); prefix.setAttribute("aria-hidden", "true"); el("span", `${series.code} / ${series.title}`, summary); marked("span", "dates", series.dates, summary); const contents = marked("section", "records", "", details); el("h3", series.title, contents); el("p", series.description, contents); const list = el("ul", "", contents); for (const record of series.records) { const row = el("li", "", list); marked("span", "twig", "├─ ", row).setAttribute("aria-hidden", "true"); el("strong", record.title, row); marked("span", "record-id", record.reference, row); el("p", record.extent, row); } if (!series.records.length) el("p", "No individual records catalogued.", contents); });
    const access = marked("footer", "rule"); el("h3", "Consulting the collection", access); el("p", "Quote the record reference when requesting material. Bound volumes are consulted in the reading room; folded maps require a flat table.", access);
    attrs.set("data-pica-ready", "true");
  }
  render();
  return {
    update(partial) { const next = { ...props, ...partial }; if (!sameJson(props, next)) { props = next; render(); } },
    destroy() { root.remove(); sheet.remove(); attrs.restore(); },
  };
};
