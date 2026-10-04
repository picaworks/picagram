import type { Mount } from "../../../lib/types";
import { hostAttributes, nextId } from "../../../lib/host";
import { GRID_FONT } from "../../../lib/font";
import { cssVar } from "../../../lib/palette";
import { sameJson } from "../../../lib/json";
export interface AsciiExpeditionLogProps {
  /** The expedition name. */
  title: string;
  /** The mission and terrain summary. */
  intro: string;
  /** Dated field stations in travel order. */
  logs: { date: string; station: string; elevation: number; note: string; observation: string }[];
  /** Supplies to check before departing. */
  supplies: string[];
}
export const defaults: AsciiExpeditionLogProps = {
  "title": "Across the upper basin",
  "intro": "A three-day traverse documenting snowmelt, exposed strata and the first vegetation above the tree line. Field series 07, eastern watershed.",
  "logs": [
    {
      "date": "18 JUN / 06:40",
      "station": "01 / Alder gate",
      "elevation": 680,
      "note": "Left the river road at first light. The lower channel runs clear.",
      "observation": "Water sample B01: 8 \u00b0C. Alder roots reinforce the eastern bank; use the marked footbridge."
    },
    {
      "date": "19 JUN / 11:20",
      "station": "02 / Moraine shelf",
      "elevation": 1420,
      "note": "Camp set below the old ice margin. Two meltwater channels cross the shelf.",
      "observation": "Loose angular stones on the northern cut. The traverse stays below the fresh scree."
    },
    {
      "date": "20 JUN / 08:10",
      "station": "03 / Survey ridge",
      "elevation": 2180,
      "note": "Reached the divide. Wind from the west; visibility extends to the lake.",
      "observation": "Photograph sequence R01\u2013R06 records the remaining snow patches. Descend by the southern shoulder."
    }
  ],
  "supplies": [
    "Map and compass",
    "Two litres of water",
    "Sample jars B01\u2013B06",
    "Weather layer and first aid"
  ]
};

export const mount: Mount<AsciiExpeditionLogProps> = (host, initial = {}) => {
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
${s} [data-split]{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:48px;margin-top:36px}
${s} [data-map]{padding-top:24px;border-top:4px solid ${cssVar("accent")}}
${s} [data-map] dl{margin-top:32px;display:grid;grid-template-columns:1fr 1fr;gap:0 16px}
${s} [data-entry]{padding-bottom:24px}
${s} [data-supplies]{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:24px}
${s} label{display:flex;align-items:center;gap:12px;min-height:44px}
${s} input{width:18px;height:18px;accent-color:${cssVar("fg")}}
@media(max-width:760px){${s} [data-split]{grid-template-columns:1fr;gap:32px}${s} [data-supplies]{grid-template-columns:1fr}}
`;
  const root = document.createElement("div"); root.setAttribute("data-pica", ""); root.setAttribute("data-root", ""); host.append(root);
  function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = "", parent: HTMLElement = root): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag); node.setAttribute("data-pica", ""); node.textContent = text; parent.append(node); return node;
  }
  function marked<K extends keyof HTMLElementTagNameMap>(tag: K, mark: string, text = "", parent: HTMLElement = root): HTMLElementTagNameMap[K] {
    const node = el(tag, text, parent); node.setAttribute(`data-${mark}`, ""); return node;
  }
  function drawing(parent: HTMLElement, wide: string, compact: string, caption: string): void {
    const figure = el("figure", "", parent);
    marked("pre", "wide", wide, figure).setAttribute("aria-hidden", "true");
    marked("pre", "compact", compact, figure).setAttribute("aria-hidden", "true");
    el("figcaption", caption, figure);
  }
  function render(): void {
    root.replaceChildren();
    attrs.set("role", "region"); attrs.set("aria-label", props.title.trim() || "Expedition log"); attrs.set("aria-hidden", null);
    marked("p", "kicker", "FIELD DOSSIER / 07 / EASTERN WATERSHED");
    el("h1", props.title.trim() || "Expedition log"); el("p", props.intro);
    const split = marked("div", "split"); const map = marked("aside", "map", "", split);
    el("h2", "Elevation transect", map);
    const transect = (width: number): string => {
      const samples = props.logs.slice(0, 9); if (!samples.length) return "No elevation samples";
      const top = Math.max(1, ...samples.map(item => Math.max(0, Number.isFinite(item.elevation) ? item.elevation : 0)));
      const rows = Array.from({ length: 10 }, () => Array<string>(width).fill(" "));
      const points = samples.map((item, i) => ({ x: Math.round(i * (width - 2) / Math.max(1, samples.length - 1)), y: 8 - Math.round(Math.max(0, Number.isFinite(item.elevation) ? item.elevation : 0) / top * 7) }));
      points.forEach((point, i) => { const previous = points[i - 1]; if (previous) for (let x = previous.x; x <= point.x; x++) { const y = Math.round(previous.y + (point.y - previous.y) * (x - previous.x) / Math.max(1, point.x - previous.x)); const row = rows[y]; if (row) row[x] = point.y < previous.y ? "╱" : point.y > previous.y ? "╲" : "─"; } const row = rows[point.y]; if (row) row[point.x] = String(i + 1); });
      rows[9] = Array<string>(width).fill("─");
      return `${Math.round(top)} m / HIGH POINT\n${rows.map(row => row.join("").trimEnd()).join("\n")}\nSTATIONS IN TRAVEL ORDER →`;
    };
    drawing(map, transect(42), transect(27), "Elevation profile scaled to the highest recorded station. Numerals follow the dated field log; the ledger below carries every exact elevation.");
    const stats = el("dl", "", map); for (const log of props.logs) { el("dt", log.station, stats); el("dd", `${log.elevation} m above sea level`, stats); }
    const journal = marked("section", "journal", "", split); el("h2", "Dated field log", journal);
    if (!props.logs.length) el("p", "No field stations recorded yet.", journal);
    for (const log of props.logs) { const entry = marked("article", "entry", "", journal); marked("p", "kicker", log.date, entry); el("h3", log.station, entry); el("p", log.note, entry); const detail = el("details", "", entry); el("summary", "Read observation", detail); el("p", log.observation, detail); }
    const footer = marked("section", "rule"); el("h2", "Before leaving camp", footer);
    const list = marked("div", "supplies", "", footer); for (const supply of props.supplies) { const label = el("label", "", list); const check = el("input", "", label); check.type = "checkbox"; el("span", supply, label); }
    if (!props.supplies.length) el("p", "No supplies listed.", list);
    marked("p", "kicker", "ROUTE NOTE / Leave the basin by the southern shoulder. Record changes before departure.", footer);
    attrs.set("data-pica-ready", "true");
  }
  render();
  return {
    update(partial) { const next = { ...props, ...partial }; if (!sameJson(props, next)) { props = next; render(); } },
    destroy() { root.remove(); sheet.remove(); attrs.restore(); },
  };
};
