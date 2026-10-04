import type { Mount } from "../../../lib/types";
import { hostAttributes, nextId } from "../../../lib/host";
import { GRID_FONT } from "../../../lib/font";
import { cssVar } from "../../../lib/palette";
import { sameJson } from "../../../lib/json";
export interface AsciiCampusDirectoryProps {
  /** The campus name. */
  title: string;
  /** The visitor introduction. */
  intro: string;
  /** Campus locations and step-free visiting directions. */
  locations: { code: string; name: string; department: string; hours: string; directions: string }[];
}
export const defaults: AsciiCampusDirectoryProps = {
  "title": "Northbank campus",
  "intro": "Find a department, plan your arrival and follow a step-free route from the south gate. The central walk connects every public building.",
  "locations": [
    {
      "code": "A",
      "name": "Archive hall",
      "department": "History and collections",
      "hours": "Mon\u2013Fri / 09:00\u201317:00",
      "directions": "From the south gate, follow Central Walk past the courtyard. Turn left at the reading garden; the level entrance faces east."
    },
    {
      "code": "B",
      "name": "Workshop wing",
      "department": "Design and fabrication",
      "hours": "Mon\u2013Fri / 10:00\u201318:00",
      "directions": "Follow Central Walk to the courtyard, then turn right. The accessible entrance is beside the covered loading path."
    },
    {
      "code": "C",
      "name": "Field sciences",
      "department": "Ecology and survey",
      "hours": "Mon\u2013Thu / 08:30\u201316:30",
      "directions": "Continue north along Central Walk. Cross the short bridge and use the ground-floor entrance beside the lift."
    },
    {
      "code": "D",
      "name": "Visitor house",
      "department": "Admissions and visitor services",
      "hours": "Daily / 09:00\u201316:00",
      "directions": "Enter through the south gate. Visitor House is immediately on your left; the information desk is on the ground floor."
    }
  ]
};

export const mount: Mount<AsciiCampusDirectoryProps> = (host, initial = {}) => {
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
${s} [data-site]{margin:32px 0;padding:32px 0;border-top:4px solid ${cssVar("accent")};border-bottom:1px solid ${cssVar("muted")}}
${s} [data-site] figure{display:grid;grid-template-columns:1.3fr 1fr;gap:48px;align-items:center}
${s} [data-directory]{display:grid;grid-template-columns:1fr 1fr;gap:48px}
${s} [data-locations]{display:flex;flex-direction:column;align-items:stretch;gap:8px}
${s} [data-locations] button{text-align:left}
${s} [data-location]{padding-top:12px}
@media(max-width:760px){${s} [data-directory],${s} [data-site] figure{grid-template-columns:1fr;gap:24px}}
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
    attrs.set("role", "region"); attrs.set("aria-label", props.title.trim() || "Campus directory"); attrs.set("aria-hidden", null);
    marked("p", "kicker", "VISITOR GUIDE / NORTHBANK / 01"); el("h1", props.title.trim() || "Campus directory"); el("p", props.intro);
    const map = marked("section", "site");
    const codes = Array.from({length:4}, (_,i) => (props.locations[i]?.code ?? "·").slice(0,1));
    drawing(map, `                          N ↑\n     ┌──────────┐    ║    ┌──────────┐\n     │ ${codes[0]} / 01   │────╫────│ ${codes[2]} / 03   │\n     └──────────┘    ║    └──────────┘\n         garden      ║       bridge\n     · · · · ·    CENTRAL    · · · · ·\n                  COURT\n     ┌──────────┐    ║    ┌──────────┐\n     │ ${codes[3]} / 04   │────╫────│ ${codes[1]} / 02   │\n     └──────────┘    ║    └──────────┘\n                  SOUTH GATE`, `          N ↑\n  [${codes[0]}]─────╬─────[${codes[2]}]\n          ║\n       COURTYARD\n          ║\n  [${codes[3]}]─────╬─────[${codes[1]}]\n      SOUTH GATE`, `Schematic map, north at the top. ${props.locations.slice(0,4).map(item => `${item.code}: ${item.name}`).join("; ")}. Central Walk runs north from the south gate.`);
    const directory = marked("section", "directory"); const index = el("div", "", directory); el("h2", "Department index", index); const nav = marked("div", "locations", "", index);
    const panel = marked("article", "location", "", directory); panel.setAttribute("aria-live", "polite");
    const buttons: HTMLButtonElement[] = [];
    const choose = (i: number): void => { buttons.forEach((b, j) => b.setAttribute("aria-pressed", String(i === j))); panel.replaceChildren(); const item = props.locations[i]; if (!item) { el("h2", "No locations listed", panel); el("p", "Add campus locations to populate this directory.", panel); return; } panel.setAttribute("data-code", item.code); marked("p", "kicker", `LOCATION ${item.code} / ${item.department}`, panel); el("h2", item.name, panel); const facts = el("dl", "", panel); el("dt", "Visitor hours", facts); el("dd", item.hours, facts); el("dt", "Step-free directions", facts); el("dd", item.directions, facts); };
    props.locations.forEach((item, i) => { const button = el("button", `${item.code} / ${item.department}`, nav); button.type = "button"; buttons.push(button); button.addEventListener("click", () => choose(i)); }); choose(0);
    const visit = marked("footer", "rule"); el("h2", "Arriving at Northbank", visit); el("p", "The public bus stops at South Gate. Cycle stands sit beside Visitor House. Accessible parking is reached from River Road; check in at Visitor House on arrival.", visit); const details = el("details", "", visit); el("summary", "After-hours access", details); el("p", "Public buildings close at the listed times. Arrange an appointment with your department before travelling outside visitor hours.", details);
    attrs.set("data-pica-ready", "true");
  }
  render();
  return {
    update(partial) { const next = { ...props, ...partial }; if (!sameJson(props, next)) { props = next; render(); } },
    destroy() { root.remove(); sheet.remove(); attrs.restore(); },
  };
};
