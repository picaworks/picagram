import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface ExhibitionWork {
  /** The title of the work. */
  title: string;
  /** The artist and making date. */
  artist: string;
  /** The materials and dimensions. */
  medium: string;
  /** The curatorial label. */
  label: string;
}

export interface ExhibitionLabelsProps {
  /** The exhibition title. */
  title: string;
  /** The gallery name. */
  gallery: string;
  /** The exhibition dates. */
  dates: string;
  /** The curatorial introduction. */
  introduction: string;
  /** Works paired with original abstract studies. */
  works: readonly ExhibitionWork[];
}

export const defaults: ExhibitionLabelsProps = {
  title: "A measure of silence",
  gallery: "Field Gallery / Room 02",
  dates: "12 SEPTEMBER—18 JANUARY",
  introduction: "An exhibition of pauses, intervals, and the marks that remain. Three artists make space visible by attending to what is almost there.",
  works: [
    { title: "Interval, no. 7", artist: "Ari Kato, 2025", medium: "Graphite on paper · 72 × 110 cm", label: "Parallel lines accumulate into a field. A single break makes the surface legible as a record of time, measured by the hand rather than the clock." },
    { title: "Holding an edge", artist: "Nora Bell, 2024", medium: "Ink and linen · 160 × 80 cm", label: "A dark form presses against a pale boundary. Neither a landscape nor an object, it asks how little information a shape needs to feel present." },
    { title: "Two distances", artist: "Idris Fenn, 2025", medium: "Etched aluminium · 48 × 48 cm", label: "Two circles share the same surface without sharing a centre. Their quiet misalignment changes as the viewer moves through the room." },
  ],
};

function galleryNode<K extends keyof HTMLElementTagNameMap>(tag: K, part: string, text = ""): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  if (part) el.setAttribute("data-pica-part", part);
  el.textContent = text;
  return el;
}

function gallerySvg<K extends keyof SVGElementTagNameMap>(tag: K, values: Readonly<Record<string, string>>): SVGElementTagNameMap[K] {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  el.setAttribute("data-pica", "");
  for (const [key, value] of Object.entries(values)) el.setAttribute(key, value);
  return el;
}

function galleryLink(label: string, target: string): HTMLAnchorElement {
  const a = galleryNode("a", "", label);
  a.href = `#${target}`;
  return a;
}

function galleryRules(s: string): string {
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

${s} [data-pica-part="opening"]{display:grid;grid-template-columns:1.6fr 1fr;gap:60px;padding:37px 0 50px}
${s} [data-pica-part="headline"] h1{font-family:var(--pica-font-serif,inherit);margin-top:24px;max-width:11ch;font-size:clamp(46px,6vw,77px)}
${s} [data-pica-part="intro"]{padding-top:5px;display:grid;align-content:space-between;gap:24px}
${s} [data-pica-part="intro"] p{font-size:18px}
${s} [data-pica-part="work"]{display:grid;grid-template-columns:1.6fr 1fr;align-items:center;gap:60px;border-top:1px solid ${fg};padding:35px 0}
${s} [data-pica-part="art"]{padding:18px;border:1px solid ${muted}}
${s} [data-pica-part="art"] svg{width:100%;max-height:350px}
${s} [data-pica-part="art"] figcaption{margin-top:14px;font-size:9px;color:${muted}}
${s} [data-pica-part="work-label"]{display:grid;gap:12px;max-width:28rem}
${s} [data-pica-part="number"]{font-family:${GRID_FONT};font-size:14px;color:${fg};border-bottom:1px solid ${accent};padding-bottom:8px;width:34px}
${s} [data-pica-part="artist"]{font-size:16px}
${s} [data-pica-part="medium"]{font-family:${GRID_FONT};font-size:11px;color:${muted};margin-bottom:10px}
${s} [data-pica-part="curatorial"]{font-size:15px;line-height:1.65}
${s} [data-pica-form="1"]{grid-template-columns:1fr 1.1fr;padding-left:20%}
${s} [data-pica-form="1"] [data-pica-part="art"]{max-width:280px}
${s} [data-pica-form="2"]{grid-template-columns:1.1fr 1fr;padding-right:12%}
${s} [data-pica-part="visit"]{border-top:1px solid ${fg};padding-top:24px;display:grid;grid-template-columns:1fr 2fr;gap:25px;font-size:14px}
${s} [data-pica-part="visit"]>p:last-child{grid-column:2}
@media(max-width:800px){${s} [data-pica-part="opening"],${s} [data-pica-part="work"]{gap:30px}${s} [data-pica-form="1"]{padding-left:8%}${s} [data-pica-form="2"]{padding-right:0}}
@media(max-width:600px){${s} [data-pica-part="opening"],${s} [data-pica-part="work"]{grid-template-columns:1fr;gap:25px;padding-left:0;padding-right:0}${s} [data-pica-part="opening"]{padding:26px 0 30px}${s} [data-pica-part="intro"] p{font-size:16px}${s} [data-pica-part="work-label"]{gap:10px}${s} [data-pica-form="1"] [data-pica-part="art"]{margin:auto;width:75%}${s} [data-pica-part="visit"]{grid-template-columns:1fr;gap:15px}${s} [data-pica-part="visit"]>p:last-child{grid-column:auto}}
`;
}

export const mount: Mount<ExhibitionLabelsProps> = (host, initial = {}) => {
  let props: ExhibitionLabelsProps = { ...defaults, ...initial };
  const attributes = hostAttributes(host);
  const container = galleryNode("div", "");
  host.append(container);
  const sheet = scope(container);
  const page = galleryNode("article", "");
  page.setAttribute("data-pica-page", "");
  container.append(page);
  const id = nextId("pica-exhibition-labels");
  sheet.setRules(galleryRules(sheet.selector));
  let destroyed = false;
  const render = (): void => {
    attributes.set("aria-hidden", "false");
    attributes.set("role", "region");
    attributes.set("aria-label", props.title);
    page.replaceChildren();
    const top = galleryNode("header", "top");
    top.append(galleryNode("span", "label", props.gallery));
    const nav = galleryNode("nav", "");
    nav.setAttribute("aria-label", "Exhibition sections");
    nav.append(galleryLink(`Works / ${String(props.works.length).padStart(2, "0")}`, `${id}-works`), galleryLink("Visitor notes", `${id}-visit`));
    top.append(nav);
    const opening = galleryNode("section", "opening");
    const headline = galleryNode("div", "headline");
    headline.append(galleryNode("span", "label", "EXHIBITION / CATALOGUE EXCERPT"), galleryNode("h1", "", props.title));
    const intro = galleryNode("div", "intro");
    intro.append(galleryNode("span", "label", props.dates), galleryNode("p", "", props.introduction));
    opening.append(headline, intro);
    const works = galleryNode("section", "works");
    works.id = `${id}-works`;
    works.setAttribute("aria-label", "Selected works");
    for (const [i, work] of props.works.entries()) {
      const row = galleryNode("article", "work");
      row.dataset.picaForm = String(i % 3);
      const figure = galleryNode("figure", "art");
      const drawing = gallerySvg("svg", { viewBox: i % 3 === 1 ? "0 0 260 390" : "0 0 520 310", "aria-hidden": "true" });
      if (i % 3 === 0) {
        for (let line = 0; line < 26; line++) {
          const y = 24 + line * 10;
          drawing.append(gallerySvg("path", { d: `M24 ${y}H${205 + line % 5 * 4} M${246 + line % 3 * 4} ${y}H496` }));
        }
      } else if (i % 3 === 1) {
        drawing.append(gallerySvg("path", { d: "M22 23H176L230 182L182 366H22Z", "data-pica-part": "solid" }));
        for (let line = 0; line < 9; line++) drawing.append(gallerySvg("path", { d: `M${191 + line * 5} 24V365` }));
      } else {
        drawing.append(gallerySvg("circle", { cx: "225", cy: "155", r: "110" }), gallerySvg("circle", { cx: "295", cy: "155", r: "110" }));
        for (let line = 0; line < 11; line++) drawing.append(gallerySvg("path", { d: `M${150 + line * 20} 50V260`, "stroke-dasharray": "1 7" }));
      }
      figure.append(drawing, galleryNode("figcaption", "label", `STUDY ${String(i + 1).padStart(2, "0")} / ORIGINAL ABSTRACT PLATE`));
      const label = galleryNode("div", "work-label");
      label.append(galleryNode("span", "number", String(i + 1).padStart(2, "0")), galleryNode("h2", "", work.title), galleryNode("p", "artist", work.artist), galleryNode("p", "medium", work.medium), galleryNode("p", "curatorial", work.label));
      row.append(figure, label);
      works.append(row);
    }
    const visit = galleryNode("section", "visit");
    visit.id = `${id}-visit`;
    visit.append(galleryNode("span", "label", "Spend a little longer"), galleryNode("p", "", "The gallery is quietest before noon. Seating is available in each room. Large-print labels and a tactile guide can be borrowed from the welcome desk."), galleryNode("p", "muted", "Free entry · Tuesday–Sunday, 10:00–18:00 · Step-free throughout"));
    const footer = galleryNode("footer", "footer");
    footer.append(galleryNode("span", "label", "Curated by Leah Morrow / Edition 003"), galleryLink("Return to the works ↑", `${id}-works`));
    page.append(top, opening, works, visit, footer);
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
