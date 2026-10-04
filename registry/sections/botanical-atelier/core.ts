import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface BotanicalSpecimen {
  /** Common plant name. */
  name: string;
  /** Scientific name. */
  latin: string;
  /** Botanical family. */
  family: string;
  /** Drawing morphology. */
  form: "branch" | "flower" | "frond";
  /** Place and date of observation. */
  location: string;
  /** Field annotation. */
  note: string;
}
export interface BotanicalAtelierProps {
  /** Accessible name for the atelier. */
  label: string;
  /** Atelier name. */
  studio: string;
  /** Page title. */
  title: string;
  /** Practice introduction. */
  intro: string;
  /** Specimen records. */
  specimens: readonly BotanicalSpecimen[];
  /** Observation methods. */
  method: string;
  /** Commission information. */
  contact: string;
}

export const defaults: BotanicalAtelierProps = {
  "label": "Botanical atelier portfolio",
  "studio": "Fieldwork / Botanical atelier",
  "title": "A cabinet of quiet observations.",
  "intro": "Drawing plants as they are found. An independent practice in botanical illustration, patient observation, and the stories carried by ordinary leaves.",
  "specimens": [
    {
      "name": "Olive",
      "latin": "Olea europaea",
      "family": "Oleaceae",
      "form": "branch",
      "location": "Liguria / 18 May 2026",
      "note": "Silver undersides catch the afternoon light. Leaves grow in opposite pairs along the new branch."
    },
    {
      "name": "Wild chamomile",
      "latin": "Matricaria chamomilla",
      "family": "Asteraceae",
      "form": "flower",
      "location": "Meadow edge / 02 June 2026",
      "note": "A hollow receptacle and fine divided foliage distinguish this small annual. Collected as a drawing, left growing."
    },
    {
      "name": "Common fern",
      "latin": "Polypodium vulgare",
      "family": "Polypodiaceae",
      "form": "frond",
      "location": "North wall / 09 June 2026",
      "note": "The frond uncurls toward a narrow patch of light. Rounded sori form in two rows on its underside."
    }
  ],
  "method": "Every drawing begins outdoors with a pencil and a notebook. Measurements, growth habit, and small irregularities are recorded before the studio study. The finished line work keeps those observations visible rather than smoothing them away.",
  "contact": "Illustration commissions for books, gardens, cultural institutions, and thoughtful brands. Write to hello@fieldwork.example with your subject, format, and timing."
};

function botanicalAtelierEl<K extends keyof HTMLElementTagNameMap>(tag: K, text = "", mark = ""): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  if (mark) el.setAttribute(`data-pica-${mark}`, "");
  if (text) el.textContent = text;
  return el;
}
function botanicalAtelierLink(text: string, target: string): HTMLAnchorElement {
  const el = botanicalAtelierEl("a", text);
  el.href = `#${target}`;
  return el;
}
function botanicalAtelierLabel(text: string): HTMLElement { return botanicalAtelierEl("p", text, "label"); }
function botanicalAtelierSection(id: string): HTMLElement {
  const el = botanicalAtelierEl("section", "", "section");
  el.id = id;
  return el;
}
function botanicalAtelierSvg(viewBox: string, paths: readonly string[]): SVGSVGElement {
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


function botanicalAtelierRules(s: string): string {
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

${s} [data-pica-page] [data-pica-botanical-lead]{display:grid;grid-template-columns:1.5fr 1fr;gap:24px 60px;align-items:end;margin:42px 0}
${s} [data-pica-page] [data-pica-botanical-lead]>:first-child{grid-column:span 2}
${s} [data-pica-page] [data-pica-botanical-lead] h1{font-family:var(--pica-font-serif,Georgia,serif);font-size:clamp(45px,5.7vw,78px);letter-spacing:-.035em;max-width:14ch}
${s} [data-pica-page] [data-pica-botanical-cabinet]{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid ${fg};border-bottom:1px solid ${fg}}
${s} [data-pica-page] [data-pica-botanical-sheet]{padding:22px 28px 18px;border-right:1px solid ${muted}}
${s} [data-pica-page] [data-pica-botanical-sheet]:last-child{border-right:0}
${s} [data-pica-page] [data-pica-botanical-top]{display:flex;justify-content:space-between;gap:10px}
${s} [data-pica-page] [data-pica-botanical-sheet] svg{height:320px;max-height:34vw;margin:20px 0;stroke-width:1.15}
${s} [data-pica-page] [data-pica-botanical-taxonomy] h2{font-family:var(--pica-font-serif,Georgia,serif);font-size:29px;margin-bottom:7px}
${s} [data-pica-page] [data-pica-botanical-latin]{font-family:var(--pica-font-serif,Georgia,serif);font-style:italic;font-size:17px;margin-bottom:17px}
${s} [data-pica-page] [data-pica-botanical-sheet] details{margin-top:18px}
${s} [data-pica-page] [data-pica-botanical-method]{display:grid;grid-template-columns:1fr 1fr;gap:28px 70px;padding-top:44px}
${s} [data-pica-page] [data-pica-botanical-method]>:first-child{grid-column:span 2}
${s} [data-pica-page] [data-pica-botanical-method] h2{font-family:var(--pica-font-serif,Georgia,serif);font-size:clamp(36px,4.5vw,60px);white-space:pre-line}
@media(max-width:800px){${s} [data-pica-page] [data-pica-botanical-sheet]{padding:20px 15px}${s} [data-pica-page] [data-pica-botanical-top]{flex-direction:column;gap:0}${s} [data-pica-page] [data-pica-botanical-lead]{gap:24px}}
@media(max-width:600px){${s} [data-pica-page] [data-pica-botanical-lead],${s} [data-pica-page] [data-pica-botanical-method]{grid-template-columns:1fr}${s} [data-pica-page] [data-pica-botanical-lead]>:first-child,${s} [data-pica-page] [data-pica-botanical-method]>:first-child{grid-column:auto}${s} [data-pica-page] [data-pica-botanical-cabinet]{grid-template-columns:1fr}${s} [data-pica-page] [data-pica-botanical-sheet]{border-right:0;border-bottom:1px solid ${muted};padding:22px 0}${s} [data-pica-page] [data-pica-botanical-sheet]:last-child{border-bottom:0}${s} [data-pica-page] [data-pica-botanical-sheet] svg{height:300px;max-height:none}${s} [data-pica-page] [data-pica-botanical-top]{flex-direction:row}}
`;
}

function botanicalAtelierRender(root: HTMLElement, p: BotanicalAtelierProps, ids: Record<string, string>): void {
  root.replaceChildren();

  const header = botanicalAtelierEl("header", "", "header"); header.append(botanicalAtelierLabel(p.studio)); const nav = botanicalAtelierEl("nav", "", "nav"); nav.setAttribute("aria-label", "Atelier navigation"); nav.append(botanicalAtelierLink("Cabinet", ids.cabinet!), botanicalAtelierLink("Method", ids.method!), botanicalAtelierLink("Commission", ids.contact!)); header.append(nav); root.append(header);
  const lead = botanicalAtelierEl("div", "", "botanical-lead"); lead.append(botanicalAtelierLabel("Herbarium / Volume 01"), botanicalAtelierEl("h1", p.title, "accent"), botanicalAtelierEl("p", p.intro, "body")); root.append(lead);
  const cabinet = botanicalAtelierSection(ids.cabinet!); cabinet.setAttribute("data-pica-botanical-cabinet", "");
  p.specimens.forEach((plant, i) => {
    const card = botanicalAtelierEl("article", "", "botanical-sheet"); const top = botanicalAtelierEl("div", "", "botanical-top"); top.append(botanicalAtelierLabel(`Sheet ${String(i + 1).padStart(3, "0")}`), botanicalAtelierLabel(plant.family)); card.append(top);
    const paths = plant.form === "frond" ? ["M120 280Q116 174 121 45", "M120 65Q94 53 96 38Q111 38 120 65 M120 65Q144 52 145 39Q129 39 120 65", "M120 85Q82 75 77 57Q105 58 120 85 M120 85Q157 75 163 56Q135 58 120 85", "M120 109Q70 93 58 75Q100 80 120 109 M120 109Q166 97 180 73Q141 80 120 109", "M120 136Q60 117 42 94Q99 107 120 136 M120 136Q179 117 196 94Q139 107 120 136", "M119 165Q63 150 39 123Q100 135 119 165 M119 165Q177 149 201 123Q141 135 119 165", "M119 194Q65 180 42 151Q102 165 119 194 M119 194Q175 181 198 151Q139 165 119 194", "M119 224Q72 214 48 183Q100 191 119 224 M119 224Q166 213 193 183Q143 192 119 224", "M119 247Q78 239 58 213Q105 224 119 247 M119 247Q159 239 182 213Q136 224 119 247"] : plant.form === "flower" ? ["M118 286Q130 192 119 96 M129 224Q84 218 60 189 M126 196Q172 194 185 162 M122 164Q84 146 83 119", "M119 71C95 63 104 48 117 60C104 32 126 32 123 58C143 38 155 55 134 67C164 65 157 86 135 79C150 100 128 110 125 87C111 111 94 95 111 82C80 86 83 64 109 73", "M112 69Q121 59 132 70Q137 80 126 86Q113 87 112 69", "M84 215L79 194 M96 219L98 198 M108 221L108 239 M72 203L68 184 M147 191L148 172 M159 184L170 185 M171 177L172 158", "M83 142L72 132 M91 150L92 129 M106 157L112 144"] : ["M104 280Q129 158 125 55 M113 225Q73 182 65 145 M119 176Q164 136 178 95", "M121 96Q81 81 79 54Q113 58 121 96 M124 120Q165 109 170 82Q133 86 124 120", "M116 152Q76 138 75 109Q109 115 116 152 M113 187Q156 182 163 154Q129 153 113 187", "M95 203Q61 213 44 190Q73 175 95 203 M81 178Q49 174 45 145Q72 149 81 178", "M143 151Q148 116 176 111Q179 138 143 151 M160 128Q165 90 188 79Q195 107 160 128", "M123 96L86 62 M124 120L162 90 M116 152L82 117 M113 187L155 162 M95 203L51 190"];
    card.append(botanicalAtelierSvg("0 0 240 310", paths)); const tax = botanicalAtelierEl("div", "", "botanical-taxonomy"); tax.append(botanicalAtelierEl("h2", plant.name), botanicalAtelierEl("p", plant.latin, "botanical-latin"), botanicalAtelierLabel(plant.location)); card.append(tax);
    const detail = botanicalAtelierEl("details"); detail.append(botanicalAtelierEl("summary", "Field annotation"), botanicalAtelierEl("p", plant.note)); card.append(detail); cabinet.append(card);
  }); root.append(cabinet);
  const method = botanicalAtelierSection(ids.method!); method.setAttribute("data-pica-botanical-method", ""); method.append(botanicalAtelierLabel("Practice / Observation before invention"), botanicalAtelierEl("h2", "Look closely.\nLeave things growing."), botanicalAtelierEl("p", p.method, "body")); root.append(method);
  const footer = botanicalAtelierEl("footer", "", "footer"); footer.id = ids.contact!; footer.append(botanicalAtelierEl("h2", "A drawing begins with attention."), botanicalAtelierEl("p", p.contact)); root.append(footer);

}

export const mount: Mount<BotanicalAtelierProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  attrs.set("data-pica-id", host.getAttribute("data-pica-id"));
  attrs.set("role", "region");
  attrs.set("aria-label", props.label);
  const sheet = scope(host);
  const root = botanicalAtelierEl("div", "", "page");
  host.append(root);
  const ids: Record<string, string> = { cabinet: nextId("botanical-atelier-cabinet"), method: nextId("botanical-atelier-method"), contact: nextId("botanical-atelier-contact") };
  sheet.setRules(botanicalAtelierRules(sheet.selector));
  botanicalAtelierRender(root, props, ids);
  attrs.set("data-pica-ready", "true");
  let destroyed = false;
  return {
    update(next) {
      if (destroyed) return;
      const before = props;
      props = { ...props, ...next };
      if (sameJson(before, props)) return;
      attrs.set("aria-label", props.label);
      botanicalAtelierRender(root, props, ids);
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
