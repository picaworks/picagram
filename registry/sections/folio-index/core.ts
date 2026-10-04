import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface FolioProject {
  /** Project name. */
  title: string;
  /** Discipline and completion year. */
  category: string;
  /** Short project summary. */
  summary: string;
  /** Detailed project outcome. */
  outcome: string;
}
export interface FolioIndexProps {
  /** Accessible name for the portfolio. */
  label: string;
  /** Designer name. */
  name: string;
  /** Introduction above the project index. */
  intro: string;
  /** Studio location and availability. */
  status: string;
  /** Selected projects in index order. */
  projects: readonly FolioProject[];
  /** Studio approach. */
  practice: string;
  /** Contact text. */
  contact: string;
}

export const defaults: FolioIndexProps = {
  "label": "Designer portfolio",
  "name": "Mara Ellis",
  "intro": "Independent designer working between identity, digital products, and the printed page.",
  "status": "Based in Copenhagen / Available for selected collaborations",
  "projects": [
    {
      "title": "Public Assembly",
      "category": "Identity / 2026",
      "summary": "A civic identity built around the simple act of coming together.",
      "outcome": "A flexible typographic system, wayfinding toolkit, and accessible website for a network of neighborhood spaces. The open framework lets each place keep its own voice."
    },
    {
      "title": "Interval",
      "category": "Digital product / 2025",
      "summary": "Making room for reflection in a fast-moving planning tool.",
      "outcome": "Research, product strategy, and interface design for an independent calendar. A quieter weekly view reduced scheduling friction and gave the team a clear product language."
    },
    {
      "title": "Soft Matter",
      "category": "Publication / 2025",
      "summary": "An annual journal about materials and the people who make them.",
      "outcome": "Art direction and a modular editorial grid for 176 pages of essays, photography, and field notes. A tactile cover and restrained type hierarchy unite varied voices."
    }
  ],
  "practice": "I work closely with small teams to turn complex ideas into clear systems. My practice connects research, thoughtful typography, and careful execution. Every project begins with listening.",
  "contact": "For a new project, write to hello@mara.example. Include a little about your team, timing, and the question you are trying to answer."
};

function folioIndexEl<K extends keyof HTMLElementTagNameMap>(tag: K, text = "", mark = ""): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  if (mark) el.setAttribute(`data-pica-${mark}`, "");
  if (text) el.textContent = text;
  return el;
}
function folioIndexLink(text: string, target: string): HTMLAnchorElement {
  const el = folioIndexEl("a", text);
  el.href = `#${target}`;
  return el;
}
function folioIndexLabel(text: string): HTMLElement { return folioIndexEl("p", text, "label"); }
function folioIndexSection(id: string): HTMLElement {
  const el = folioIndexEl("section", "", "section");
  el.id = id;
  return el;
}


function folioIndexRules(s: string): string {
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

${s} [data-pica-page] [data-pica-folio-lead]{display:grid;grid-template-columns:1.45fr 1fr;gap:24px;padding:52px 0 66px;align-items:end}
${s} [data-pica-page] [data-pica-folio-lead] h1{font-size:clamp(54px,8.7vw,124px);letter-spacing:-.07em;line-height:.95;grid-row:span 2}
${s} [data-pica-page] [data-pica-folio-lead] [data-pica-body]{font-size:clamp(19px,2vw,25px);line-height:1.35;max-width:29ch}
${s} [data-pica-page] [data-pica-folio-index]{list-style:none;margin:18px 0 0;padding:0;border-top:1px solid ${fg}}
${s} [data-pica-page] [data-pica-folio-index] li{border-bottom:1px solid ${fg}}
${s} [data-pica-page] [data-pica-folio-index] a{display:grid;grid-template-columns:76px 1fr 180px;align-items:center;gap:16px;text-decoration:none;padding:18px 0}
${s} [data-pica-page] [data-pica-folio-number]{font-family:${GRID_FONT};font-size:16px;align-self:start;padding-top:10px;color:${muted}}
${s} [data-pica-page] [data-pica-folio-title]{font-size:clamp(34px,6.3vw,88px);letter-spacing:-.055em;line-height:1.05}
${s} [data-pica-page] [data-pica-folio-dossiers]{display:grid;grid-template-columns:repeat(3,1fr);gap:40px;margin-top:56px}
${s} [data-pica-page] [data-pica-folio-dossiers] h2{font-size:24px;margin:18px 0}
${s} [data-pica-page] [data-pica-folio-summary]{font-size:20px;line-height:1.3;margin-bottom:18px}
${s} [data-pica-page] [data-pica-folio-practice]{display:grid;grid-template-columns:.65fr 1.15fr 1fr;gap:32px;border-top:1px solid ${fg};padding-top:30px;margin-top:64px}
${s} [data-pica-page] [data-pica-folio-practice] h2{font-size:clamp(32px,4.4vw,60px);white-space:pre-line}
@media(max-width:800px){${s} [data-pica-page] [data-pica-folio-index] a{grid-template-columns:42px 1fr}${s} [data-pica-page] [data-pica-folio-index] [data-pica-label]{grid-column:2}${s} [data-pica-page] [data-pica-folio-dossiers]{grid-template-columns:1fr;gap:34px}${s} [data-pica-page] [data-pica-folio-practice]{grid-template-columns:1fr 1fr}${s} [data-pica-page] [data-pica-folio-practice]>:first-child{grid-column:span 2}}
@media(max-width:600px){${s} [data-pica-page] [data-pica-folio-lead]{grid-template-columns:1fr;padding:36px 0}${s} [data-pica-page] [data-pica-folio-lead] h1{grid-row:auto}${s} [data-pica-page] [data-pica-folio-practice]{grid-template-columns:1fr}${s} [data-pica-page] [data-pica-folio-practice]>:first-child{grid-column:auto}}
`;
}

function folioIndexRender(root: HTMLElement, p: FolioIndexProps, ids: Record<string, string>): void {
  root.replaceChildren();

  const header = folioIndexEl("header", "", "header");
  header.append(folioIndexLabel("ME / Independent design"));
  const nav = folioIndexEl("nav", "", "nav"); nav.setAttribute("aria-label", "Portfolio navigation");
  nav.append(folioIndexLink("Selected work", ids.work!), folioIndexLink("Practice", ids.practice!), folioIndexLink("Contact", ids.contact!)); header.append(nav); root.append(header);
  const lead = folioIndexEl("div", "", "folio-lead"); lead.append(folioIndexEl("h1", p.name, "accent"), folioIndexEl("p", p.intro, "body"), folioIndexLabel(p.status)); root.append(lead);
  const work = folioIndexSection(ids.work!); work.append(folioIndexLabel("01 / Selected work"));
  const list = folioIndexEl("ol", "", "folio-index");
  p.projects.forEach((project, i) => {
    const item = folioIndexEl("li"); const link = folioIndexLink(project.title, `${ids.work!}-${i}`); const num = folioIndexEl("span", String(i + 1).padStart(2, "0"), "folio-number");
    const text = folioIndexEl("span", project.title, "folio-title"); const type = folioIndexLabel(project.category); link.textContent = ""; link.append(num, text, type); item.append(link); list.append(item);
  }); work.append(list); root.append(work);
  const dossiers = folioIndexEl("div", "", "folio-dossiers");
  p.projects.forEach((project, i) => {
    const article = folioIndexSection(`${ids.work!}-${i}`); article.append(folioIndexLabel(`${String(i + 1).padStart(2, "0")} / ${project.category}`), folioIndexEl("h2", project.title));
    article.append(folioIndexEl("p", project.summary, "folio-summary"), folioIndexEl("p", project.outcome, "body")); dossiers.append(article);
  }); root.append(dossiers);
  const practice = folioIndexSection(ids.practice!); practice.setAttribute("data-pica-folio-practice", ""); practice.append(folioIndexLabel("02 / Practice"), folioIndexEl("h2", "Clear ideas.\nCarefully made."), folioIndexEl("p", p.practice, "body")); root.append(practice);
  const footer = folioIndexEl("footer", "", "footer"); footer.id = ids.contact!; footer.append(folioIndexEl("h2", "Good work starts with a conversation."), folioIndexEl("p", p.contact)); root.append(footer);

}

export const mount: Mount<FolioIndexProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  attrs.set("data-pica-id", host.getAttribute("data-pica-id"));
  attrs.set("role", "region");
  attrs.set("aria-label", props.label);
  const sheet = scope(host);
  const root = folioIndexEl("div", "", "page");
  host.append(root);
  const ids: Record<string, string> = { work: nextId("folio-index-work"), practice: nextId("folio-index-practice"), contact: nextId("folio-index-contact") };
  sheet.setRules(folioIndexRules(sheet.selector));
  folioIndexRender(root, props, ids);
  attrs.set("data-pica-ready", "true");
  let destroyed = false;
  return {
    update(next) {
      if (destroyed) return;
      const before = props;
      props = { ...props, ...next };
      if (sameJson(before, props)) return;
      attrs.set("aria-label", props.label);
      folioIndexRender(root, props, ids);
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
