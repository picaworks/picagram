import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface AcquisitionEvent {
  /** The year or period of the provenance event. */
  year: string;
  /** The provenance account. */
  account: string;
}

export interface MuseumAcquisitionProps {
  /** The object title. */
  title: string;
  /** The museum or collection name. */
  museum: string;
  /** The accession identifier. */
  accession: string;
  /** The object maker and place. */
  maker: string;
  /** The curatorial description. */
  description: string;
  /** The documented provenance events. */
  provenance: readonly AcquisitionEvent[];
}

export const defaults: MuseumAcquisitionProps = {
  title: "Portable reading lamp",
  museum: "Museum of Everyday Design",
  accession: "2025.041.01",
  maker: "Atelier Brune / Lyon, France / c. 1932",
  description: "A compact lamp designed to travel between desk, bedside, and workshop. Its hinged stem and folded shade reveal a careful negotiation between utility, material, and movement.",
  provenance: [
    { year: "c. 1932", account: "Made by Atelier Brune, Lyon. Maker’s stamp on the underside of the base." },
    { year: "1933–1987", account: "Used in the Lenoir family workshop. Recorded in a 1956 inventory." },
    { year: "1987–2024", account: "Private collection of Elise Lenoir. Stored with original packing label." },
    { year: "2025", account: "Gift of the Lenoir family to the Museum of Everyday Design." },
  ],
};

function objectNode<K extends keyof HTMLElementTagNameMap>(tag: K, part: string, text = ""): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  if (part) el.setAttribute("data-pica-part", part);
  el.textContent = text;
  return el;
}

function objectSvg<K extends keyof SVGElementTagNameMap>(tag: K, values: Readonly<Record<string, string>>): SVGElementTagNameMap[K] {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  el.setAttribute("data-pica", "");
  for (const [key, value] of Object.entries(values)) el.setAttribute(key, value);
  return el;
}

function objectLink(label: string, target: string): HTMLAnchorElement {
  const a = objectNode("a", "", label);
  a.href = `#${target}`;
  return a;
}

function objectRules(s: string): string {
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

${s} [data-pica-part="record"]{display:grid;grid-template-columns:1.1fr 1fr;border-bottom:1px solid ${fg}}
${s} [data-pica-part="plate"]{padding:30px 30px 30px 0;border-right:1px solid ${fg};display:flex;flex-direction:column;justify-content:space-between}
${s} [data-pica-part="plate"] svg{margin:25px 0;stroke-width:1.6}
${s} [data-pica-part="plate"] figcaption{font-size:9px;color:${muted}}
${s} [data-pica-part="drawing-label"]{font-family:${GRID_FONT};font-size:11px;fill:currentColor;stroke:none;letter-spacing:1px}
${s} [data-pica-part="description"]{padding:30px 0 32px 34px}
${s} [data-pica-part="accession"]{font-family:${GRID_FONT};font-size:32px;letter-spacing:-.05em;line-height:1;margin:20px 0 25px;color:${fg};border-bottom:3px solid ${accent};padding-bottom:15px}
${s} [data-pica-part="description"] h1{font-family:var(--pica-font-serif,inherit);font-size:clamp(44px,5vw,65px);max-width:11ch}
${s} [data-pica-part="maker"]{font-family:${GRID_FONT};font-size:11px;color:${muted};margin-top:20px}
${s} [data-pica-part="summary"]{font-size:15px;margin-top:21px;line-height:1.65}
${s} [data-pica-part="facts"]{border-top:1px solid ${muted};margin-top:26px;padding-top:16px}
${s} [data-pica-part="fact-row"]{display:grid;grid-template-columns:105px 1fr;gap:20px;font-size:12px;margin-bottom:10px}
${s} [data-pica-part="lower"]{display:grid;grid-template-columns:1.1fr 1fr;gap:65px;padding-top:34px}
${s} [data-pica-part="lower"] h2{font-size:30px;margin:16px 0 24px}
${s} [data-pica-part="timeline"]{list-style:none;margin:0;padding:0}
${s} [data-pica-part="history-event"]{display:grid;grid-template-columns:95px 1fr;gap:25px;border-top:1px solid ${muted};padding:16px 0;font-size:13px}
${s} [data-pica-part="year"]{font-family:${GRID_FONT};font-size:11px}
${s} [data-pica-part="condition"]>p{font-size:14px;line-height:1.65}
${s} [data-pica-part="treatment"]{margin-top:24px;border-top:1px solid ${fg};border-bottom:1px solid ${fg};font-size:13px}
${s} [data-pica-part="treatment"] summary{padding:16px 0;cursor:pointer;font-family:${GRID_FONT};font-size:11px}
${s} [data-pica-part="treatment-notes"]{display:grid;gap:14px;padding:0 0 20px}
@media(max-width:800px){${s} [data-pica-part="lower"]{gap:30px}${s} [data-pica-part="description"]{padding-left:24px}${s} [data-pica-part="fact-row"]{grid-template-columns:1fr;gap:4px}${s} [data-pica-part="history-event"]{grid-template-columns:1fr;gap:8px}}
@media(max-width:600px){${s} [data-pica-part="record"]{grid-template-columns:1fr}${s} [data-pica-part="plate"]{border-right:0;border-bottom:1px solid ${fg};padding:22px 0}${s} [data-pica-part="plate"] svg{margin:10px 0}${s} [data-pica-part="description"]{padding:25px 0 30px}${s} [data-pica-part="description"] h1{font-size:49px}${s} [data-pica-part="fact-row"]{grid-template-columns:100px 1fr;gap:15px}${s} [data-pica-part="lower"]{grid-template-columns:1fr;gap:30px}${s} [data-pica-part="history-event"]{grid-template-columns:75px 1fr;gap:18px}}
`;
}

export const mount: Mount<MuseumAcquisitionProps> = (host, initial = {}) => {
  let props: MuseumAcquisitionProps = { ...defaults, ...initial };
  const attributes = hostAttributes(host);
  const container = objectNode("div", "");
  host.append(container);
  const sheet = scope(container);
  const page = objectNode("article", "");
  page.setAttribute("data-pica-page", "");
  container.append(page);
  const id = nextId("pica-museum-acquisition");
  sheet.setRules(objectRules(sheet.selector));
  let destroyed = false;
  const render = (): void => {
    attributes.set("aria-hidden", "false");
    attributes.set("role", "region");
    attributes.set("aria-label", props.title);
    page.replaceChildren();
    const top = objectNode("header", "top");
    top.append(objectNode("span", "label", props.museum));
    const nav = objectNode("nav", "");
    nav.setAttribute("aria-label", "Acquisition sections");
    nav.append(objectLink("The object", `${id}-record`), objectLink("Provenance", `${id}-history`), objectLink("Condition", `${id}-condition`));
    top.append(nav);
    const record = objectNode("section", "record");
    record.id = `${id}-record`;
    const plate = objectNode("figure", "plate");
    const drawing = objectSvg("svg", { viewBox: "0 0 520 450", "aria-hidden": "true" });
    drawing.append(objectSvg("path", { d: "M85 345h200l-10 20H95z M180 345V215 M190 345V215 M176 215l-45-92 M186 212l-44-92 M88 120Q138 47 190 120Z M83 120H195 M131 125v9h14v-9 M111 367v10h149v-10" }), objectSvg("path", { d: "M347 345h110l-8 20h-94z M391 345V217l-17-91 M399 345V214l-15-88 M351 122l33-53 36 53Z M346 122h78 M373 367v10h58v-10" }), objectSvg("path", { d: "M50 389H302 M50 380v18 M302 380v18 M324 389H479 M324 380v18 M479 380v18", "stroke-dasharray": "2 3" }));
    for (let i = 0; i < 16; i++) drawing.append(objectSvg("path", { d: `M${98 + i * 6} 116l5-8`, "stroke-width": ".7" }));
    const front = objectSvg("text", { x: "180", y: "416", "text-anchor": "middle", "data-pica-part": "drawing-label" });
    front.textContent = "FRONT / 1:4";
    const profile = objectSvg("text", { x: "400", y: "416", "text-anchor": "middle", "data-pica-part": "drawing-label" });
    profile.textContent = "PROFILE / 1:4";
    drawing.append(front, profile);
    plate.append(objectNode("span", "label", "OBJECT PLATE / MEASURED STUDY"), drawing, objectNode("figcaption", "label", "Original schematic drawing / dimensions in millimetres"));
    const description = objectNode("div", "description");
    description.append(objectNode("span", "label", "NEW ACQUISITION / DESIGN COLLECTION"), objectNode("p", "accession", props.accession), objectNode("h1", "", props.title), objectNode("p", "maker", props.maker), objectNode("p", "summary", props.description));
    const facts = objectNode("dl", "facts");
    for (const [label, value] of [["Materials", "Steel, brass, enamel"], ["Dimensions", "H 310 × W 220 × D 145 mm"], ["Acquisition", "Gift, 2025"], ["Display", "Gallery 04 / Case 12"]]) {
      const row = objectNode("div", "fact-row");
      row.append(objectNode("dt", "label", label), objectNode("dd", "", value));
      facts.append(row);
    }
    description.append(facts);
    record.append(plate, description);
    const lower = objectNode("div", "lower");
    const history = objectNode("section", "history");
    history.id = `${id}-history`;
    history.append(objectNode("span", "label", "Recorded ownership"), objectNode("h2", "", "A life before the collection"));
    const timeline = objectNode("ol", "timeline");
    for (const entry of props.provenance) {
      const event = objectNode("li", "history-event");
      event.append(objectNode("span", "year", entry.year), objectNode("p", "", entry.account));
      timeline.append(event);
    }
    history.append(timeline);
    const condition = objectNode("section", "condition");
    condition.id = `${id}-condition`;
    condition.append(objectNode("span", "label", "Conservation record"), objectNode("h2", "", "Evidence of use, carefully held."), objectNode("p", "", "The enamel carries small losses at the rim and handle. These marks are retained as evidence of the object’s working life. The lamp is displayed without an electrical connection."));
    const detail = objectNode("details", "treatment");
    const summary = objectNode("summary", "", "Read the treatment notes");
    const notes = objectNode("div", "treatment-notes");
    notes.append(objectNode("p", "label", "EXAMINED 18 FEBRUARY 2025"), objectNode("p", "", "Surface dust removed with a soft brush. Brass hinge stabilised; original wiring retained for study. No repainting or reconstruction undertaken."), objectNode("p", "muted", "Reviewed annually. Keep at stable gallery conditions and handle by the base."));
    detail.append(summary, notes);
    condition.append(detail);
    lower.append(history, condition);
    const footer = objectNode("footer", "footer");
    footer.append(objectNode("span", "label", `Collection record / ${props.accession}`), objectLink("Return to object ↑", `${id}-record`));
    page.append(top, record, lower, footer);
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
