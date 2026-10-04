import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface ArchitectFact {
  /** Specification name. */
  label: string;
  /** Specification value. */
  value: string;
}
export interface ArchitectDossierProps {
  /** Accessible name for the dossier. */
  label: string;
  /** Architecture practice. */
  studio: string;
  /** Project title. */
  title: string;
  /** Project location and stage. */
  subtitle: string;
  /** Project concept. */
  concept: string;
  /** Marginal specifications. */
  facts: readonly ArchitectFact[];
  /** Material strategy. */
  materials: string;
  /** Environmental strategy. */
  environment: string;
  /** Contact text. */
  contact: string;
}

export const defaults: ArchitectDossierProps = {
  "label": "Architecture project dossier",
  "studio": "Office for Common Ground",
  "title": "Courtyard House",
  "subtitle": "Residential study / Aarhus, Denmark / 2026",
  "concept": "A small house arranged around an open room. The courtyard brings daylight into the depth of the plan, while a continuous timber threshold connects everyday life to the garden.",
  "facts": [
    {
      "label": "Project number",
      "value": "CG–026 / Revision B"
    },
    {
      "label": "Site area",
      "value": "480 m²"
    },
    {
      "label": "Floor area",
      "value": "126 m²"
    },
    {
      "label": "Structure",
      "value": "Timber frame"
    },
    {
      "label": "Orientation",
      "value": "Courtyard faces south"
    },
    {
      "label": "Stage",
      "value": "Design development"
    }
  ],
  "materials": "A low brick plinth anchors a lightweight timber frame. Untreated larch cladding records the seasons, while lime plaster and oak joinery bring warmth to the interior.",
  "environment": "Deep eaves provide summer shade. Openings across the courtyard allow natural ventilation. A compact envelope and insulated slab reduce the heating demand before systems are introduced.",
  "contact": "For commissions and collaborations: studio@commonground.example. We welcome conversations about thoughtful buildings, modest budgets, and lasting places."
};

function architectDossierEl<K extends keyof HTMLElementTagNameMap>(tag: K, text = "", mark = ""): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  if (mark) el.setAttribute(`data-pica-${mark}`, "");
  if (text) el.textContent = text;
  return el;
}
function architectDossierLink(text: string, target: string): HTMLAnchorElement {
  const el = architectDossierEl("a", text);
  el.href = `#${target}`;
  return el;
}
function architectDossierLabel(text: string): HTMLElement { return architectDossierEl("p", text, "label"); }
function architectDossierSection(id: string): HTMLElement {
  const el = architectDossierEl("section", "", "section");
  el.id = id;
  return el;
}
function architectDossierSvg(viewBox: string, paths: readonly string[]): SVGSVGElement {
  const el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  el.setAttribute("data-pica", "");
  el.setAttribute("viewBox", viewBox);
  el.setAttribute("aria-hidden", "true");
  for (const d of paths) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("data-pica", "");
    path.setAttribute("d", d);
    el.append(path);
  }
  return el;
}


function architectDossierRules(s: string): string {
  const fg = cssVar("fg");
  const bg = cssVar("bg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  return `
${s}{box-sizing:border-box;color:${fg};background:${bg};font:inherit;line-height:1.5}
${s} [data-pica-page]{max-width:1440px;margin:auto;padding:clamp(20px,4vw,60px)}
${s} [data-pica-page] *{box-sizing:border-box}
${s} [data-pica-page] h1,${s} [data-pica-page] h2,${s} [data-pica-page] h3,${s} [data-pica-page] p,${s} [data-pica-page] figure{margin:0}
${s} [data-pica-page] h1,${s} [data-pica-page] h2,${s} [data-pica-page] h3{font-weight:500;line-height:1.05;overflow-wrap:anywhere}
${s} [data-pica-page] a{color:inherit;text-decoration-thickness:1px;text-underline-offset:.25em}
${s} [data-pica-page] a:focus-visible,${s} [data-pica-page] summary:focus-visible{outline:2px solid ${accent};outline-offset:4px}
${s} [data-pica-page] [data-pica-label]{font-family:${GRID_FONT};font-size:11px;letter-spacing:.07em;text-transform:uppercase;line-height:1.6;color:${muted}}
${s} [data-pica-page] [data-pica-header]{display:flex;justify-content:space-between;gap:24px;padding-bottom:22px;border-bottom:1px solid ${fg};align-items:baseline}
${s} [data-pica-page] [data-pica-nav]{display:flex;gap:20px;flex-wrap:wrap;font-size:13px}
${s} [data-pica-page] [data-pica-footer]{display:grid;grid-template-columns:1fr 1fr;gap:30px;padding-top:30px;margin-top:64px;border-top:1px solid ${fg}}
${s} [data-pica-page] [data-pica-footer] h2{font-size:clamp(28px,4vw,52px);max-width:650px}
${s} [data-pica-page] [data-pica-footer] p{max-width:480px}
${s} [data-pica-page] [data-pica-accent]{color:${fg};border-bottom:6px solid ${accent};padding-bottom:8px}
${s} [data-pica-page] details{border-top:1px solid ${muted};padding:14px 0}
${s} [data-pica-page] summary{cursor:pointer;font-size:14px}
${s} [data-pica-page] details p{margin-top:16px;max-width:58ch;font-size:14px}
${s} [data-pica-page] svg{display:block;width:100%;height:auto;fill:none;stroke:currentColor;stroke-width:1.4;vector-effect:non-scaling-stroke}
${s} [data-pica-page] [data-pica-body]{font-size:15px;max-width:58ch;line-height:1.7}
${s} [data-pica-page] [data-pica-section]{scroll-margin-top:20px}
@media(max-width:600px){${s} [data-pica-page] [data-pica-header]{align-items:flex-start;flex-direction:column;gap:14px}${s} [data-pica-page] [data-pica-nav]{gap:16px}${s} [data-pica-page] [data-pica-footer]{grid-template-columns:1fr;margin-top:44px}}

${s} [data-pica-page] [data-pica-arch-title]{margin:44px 0;display:grid;grid-template-columns:1fr auto;gap:16px;align-items:end}
${s} [data-pica-page] [data-pica-arch-title]>:first-child{grid-column:span 2}
${s} [data-pica-page] [data-pica-arch-title] h1{font-size:clamp(44px,6.5vw,88px);letter-spacing:-.05em}
${s} [data-pica-page] [data-pica-arch-title]>:last-child{max-width:20ch;font-size:17px}
${s} [data-pica-page] [data-pica-arch-layout]{display:grid;grid-template-columns:190px 1fr;gap:44px;border-top:1px solid ${fg};padding-top:26px}
${s} [data-pica-page] [data-pica-arch-margin]>div{padding:16px 0;border-bottom:1px solid ${muted};font-size:13px}
${s} [data-pica-page] [data-pica-arch-drawings] figure{margin-bottom:38px}
${s} [data-pica-page] [data-pica-arch-drawings] svg{max-height:550px}
${s} [data-pica-page] [data-pica-arch-drawings] figcaption{display:grid;grid-template-columns:200px 1fr;gap:22px;border-top:1px solid ${muted};padding-top:14px;font-size:13px}
${s} [data-pica-page] [data-pica-arch-notes]{display:grid;grid-template-columns:190px 1fr;gap:26px 44px;border-top:1px solid ${fg};padding-top:30px}
${s} [data-pica-page] [data-pica-arch-notes] h2{font-size:38px;margin-bottom:18px}
${s} [data-pica-page] [data-pica-arch-notes] details{grid-column:2}
@media(max-width:800px){${s} [data-pica-page] [data-pica-arch-layout]{grid-template-columns:150px 1fr;gap:24px}${s} [data-pica-page] [data-pica-arch-notes]{grid-template-columns:150px 1fr;gap:24px}${s} [data-pica-page] [data-pica-arch-drawings] figcaption{grid-template-columns:1fr;gap:4px}}
@media(max-width:600px){${s} [data-pica-page] [data-pica-arch-title]{grid-template-columns:1fr}${s} [data-pica-page] [data-pica-arch-title]>:first-child{grid-column:auto}${s} [data-pica-page] [data-pica-arch-layout]{display:flex;flex-direction:column-reverse;gap:18px}${s} [data-pica-page] [data-pica-arch-margin]{display:grid;grid-template-columns:1fr 1fr;gap:0 20px}${s} [data-pica-page] [data-pica-arch-margin]>:first-child{grid-column:span 2}${s} [data-pica-page] [data-pica-arch-notes]{grid-template-columns:1fr}${s} [data-pica-page] [data-pica-arch-notes] details{grid-column:auto}}
`;
}

function architectDossierRender(root: HTMLElement, p: ArchitectDossierProps, ids: Record<string, string>): void {
  root.replaceChildren();

  const header = architectDossierEl("header", "", "header"); header.append(architectDossierLabel(p.studio));
  const nav = architectDossierEl("nav", "", "nav"); nav.setAttribute("aria-label", "Dossier navigation"); nav.append(architectDossierLink("Drawings", ids.drawings!), architectDossierLink("Notes", ids.notes!), architectDossierLink("Enquiries", ids.contact!)); header.append(nav); root.append(header);
  const title = architectDossierEl("div", "", "arch-title"); title.append(architectDossierLabel(p.subtitle), architectDossierEl("h1", p.title), architectDossierEl("p", "A house with an open heart.", "accent")); root.append(title);
  const layout = architectDossierEl("div", "", "arch-layout");
  const margin = architectDossierEl("aside", "", "arch-margin"); margin.setAttribute("aria-label", "Project specifications"); margin.append(architectDossierLabel("Project register"));
  for (const fact of p.facts) { const pair = architectDossierEl("div"); pair.append(architectDossierLabel(fact.label), architectDossierEl("p", fact.value)); margin.append(pair); }
  const drawings = architectDossierSection(ids.drawings!); drawings.setAttribute("data-pica-arch-drawings", "");
  const plan = architectDossierEl("figure"); plan.append(architectDossierSvg("0 0 740 470", ["M90 60H650V400H90Z M105 75H635V385H105Z M290 165H470V305H290Z M275 150H485V320H275Z", "M105 165H275 M105 175H275 M105 305H275 M105 315H275 M485 165H635 M485 175H635 M485 305H635 M485 315H635", "M200 75V165 M210 75V165 M550 75V165 M560 75V165 M200 315V385 M210 315V385 M550 315V385 M560 315V385", "M300 175H460V295H300Z M315 190H445V280H315Z M325 203H435 M325 218H435 M325 233H435 M325 248H435 M325 263H435", "M125 90H185V135H125Z M575 205H615V260H575Z M125 330H180V365H125Z", "M65 60V400 M60 60H70 M60 400H70 M90 435H650 M90 430V440 M650 430V440", "M670 78V40L665 50 M670 40L675 50 M90 425V410 M650 425V410", "M20 240H720 M370 20V450"]));
  const cap = architectDossierEl("figcaption"); cap.append(architectDossierLabel("01 / Ground floor plan"), architectDossierEl("p", "Courtyard, living spaces, and a continuous sheltered threshold. Diagrammatic study, not a construction drawing.")); plan.append(cap); drawings.append(plan);
  const section = architectDossierEl("figure"); section.append(architectDossierSvg("0 0 740 260", ["M70 220H670 M90 205H650V220H90Z M110 205V95H290V205 M470 205V95H630V205", "M90 95H300V85H90Z M460 95H650V85H460Z M110 95V70H290 M470 70H630V95", "M130 205V115H260V205 M495 205V115H610V205", "M300 205V185H460V205 M305 190H455 M305 196H455", "M65 85V220 M60 85H70 M60 220H70", "M90 230V250 M650 230V250 M90 245H650", "M70 225L85 240 M100 225L115 240 M130 225L145 240 M160 225L175 240 M190 225L205 240 M220 225L235 240 M250 225L265 240 M280 225L295 240 M310 225L325 240 M340 225L355 240 M370 225L385 240 M400 225L415 240 M430 225L445 240 M460 225L475 240 M490 225L505 240 M520 225L535 240 M550 225L565 240 M580 225L595 240 M610 225L625 240"]));
  const secCap = architectDossierEl("figcaption"); secCap.append(architectDossierLabel("02 / Section through courtyard"), architectDossierEl("p", "Two inhabited edges frame an outdoor room. Low eaves preserve a domestic scale.")); section.append(secCap); drawings.append(section); layout.append(margin, drawings); root.append(layout);
  const notes = architectDossierSection(ids.notes!); notes.setAttribute("data-pica-arch-notes", ""); notes.append(architectDossierLabel("Design notes"));
  const concept = architectDossierEl("div"); concept.append(architectDossierEl("h2", "The open room"), architectDossierEl("p", p.concept, "body")); notes.append(concept);
  for (const [heading, copy] of [["Material assembly", p.materials], ["Passive climate", p.environment]]) { const detail = architectDossierEl("details"); detail.append(architectDossierEl("summary", heading), architectDossierEl("p", copy)); notes.append(detail); } root.append(notes);
  const footer = architectDossierEl("footer", "", "footer"); footer.id = ids.contact!; footer.append(architectDossierEl("h2", "Architecture for everyday life."), architectDossierEl("p", p.contact)); root.append(footer);

}

export const mount: Mount<ArchitectDossierProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  attrs.set("data-pica-id", host.getAttribute("data-pica-id"));
  attrs.set("role", "region");
  attrs.set("aria-label", props.label);
  const sheet = scope(host);
  const root = architectDossierEl("div", "", "page");
  host.append(root);
  const ids: Record<string, string> = { drawings: nextId("architect-dossier-drawings"), notes: nextId("architect-dossier-notes"), contact: nextId("architect-dossier-contact") };
  sheet.setRules(architectDossierRules(sheet.selector));
  architectDossierRender(root, props, ids);
  attrs.set("data-pica-ready", "true");
  let destroyed = false;
  return {
    update(next) {
      if (destroyed) return;
      const before = props;
      props = { ...props, ...next };
      if (sameJson(before, props)) return;
      attrs.set("aria-label", props.label);
      architectDossierRender(root, props, ids);
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
