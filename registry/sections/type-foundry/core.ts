import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface TypeFoundryProps {
  /** Accessible name for the specimen. */
  label: string;
  /** Foundry name. */
  foundry: string;
  /** Typeface name. */
  name: string;
  /** Large specimen character. */
  glyph: string;
  /** Introduction to the typeface. */
  intro: string;
  /** Alphabet specimen. */
  alphabet: string;
  /** Numeral and punctuation specimen. */
  numerals: string;
  /** Phrase used in the size studies. */
  phrase: string;
  /** Typeface feature descriptions. */
  features: readonly string[];
  /** License notes. */
  license: string;
  /** Contact and purchase instructions. */
  contact: string;
}

export const defaults: TypeFoundryProps = {
  "label": "Typeface specimen",
  "foundry": "Counterform / Independent type",
  "name": "Aperture",
  "glyph": "Ag",
  "intro": "A study in open forms. Aperture brings a generous rhythm to long reading and an unmistakable voice to large words.",
  "alphabet": "ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz",
  "numerals": "0123456789 & @ ! ? ( ) [ ] / + =",
  "phrase": "Form follows feeling.",
  "features": [
    "Open counters preserve clarity at small sizes.",
    "A generous x-height gives short words a quiet presence.",
    "Rhythmic spacing makes long passages feel unhurried.",
    "Figures and punctuation share the alphabet’s deliberate texture."
  ],
  "license": "This page is a visual specimen of the host font. It does not contain a font file. For the finished typeface, request a desktop, web, or editorial license from the foundry. License scope is agreed per project.",
  "contact": "Write to type@counterform.example with the family, number of users, and intended media. We will help you choose the right license."
};

function typeFoundryEl<K extends keyof HTMLElementTagNameMap>(tag: K, text = "", mark = ""): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  if (mark) el.setAttribute(`data-pica-${mark}`, "");
  if (text) el.textContent = text;
  return el;
}
function typeFoundryLink(text: string, target: string): HTMLAnchorElement {
  const el = typeFoundryEl("a", text);
  el.href = `#${target}`;
  return el;
}
function typeFoundryLabel(text: string): HTMLElement { return typeFoundryEl("p", text, "label"); }
function typeFoundrySection(id: string): HTMLElement {
  const el = typeFoundryEl("section", "", "section");
  el.id = id;
  return el;
}


function typeFoundryRules(s: string): string {
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

${s} [data-pica-page] [data-pica-type-hero]{display:grid;grid-template-columns:1.15fr 1fr;gap:50px;align-items:center;padding:22px 0 50px}
${s} [data-pica-page] [data-pica-type-glyph]{font-family:var(--pica-font-serif,Georgia,serif);font-size:clamp(170px,30vw,440px);line-height:.9;letter-spacing:-.1em;min-width:0;border-bottom:8px solid ${accent};padding-bottom:clamp(30px,4vw,60px);overflow-wrap:anywhere}
${s} [data-pica-page] [data-pica-type-title] h1{font-family:var(--pica-font-serif,Georgia,serif);font-size:clamp(52px,7vw,92px);letter-spacing:-.06em;margin:18px 0 24px}
${s} [data-pica-page] [data-pica-type-title] [data-pica-body]{font-size:20px;line-height:1.45;margin-bottom:24px}
${s} [data-pica-page] [data-pica-type-characters]{border-top:1px solid ${fg};padding:24px 0 34px}
${s} [data-pica-page] [data-pica-type-alphabet]{font-family:var(--pica-font-serif,Georgia,serif);font-size:clamp(28px,4.3vw,58px);line-height:1.4;letter-spacing:.015em;overflow-wrap:anywhere;margin-top:20px}
${s} [data-pica-page] [data-pica-type-numerals]{font-family:var(--pica-font-serif,Georgia,serif);font-size:clamp(24px,3vw,38px);margin-top:18px;word-spacing:.35em}
${s} [data-pica-page] [data-pica-type-sizes]{border-top:1px solid ${fg};padding-top:24px}
${s} [data-pica-page] [data-pica-type-row]{display:grid;grid-template-columns:190px 1fr;align-items:baseline;gap:22px;padding:23px 0;border-bottom:1px solid ${muted}}
${s} [data-pica-page] [data-pica-type-row]>p:last-child{font-family:var(--pica-font-serif,Georgia,serif);line-height:1.1;letter-spacing:-.03em}
${s} [data-pica-page] [data-pica-type-features]{display:grid;grid-template-columns:1fr 1fr;gap:50px;padding:48px 0}
${s} [data-pica-page] [data-pica-type-features] h2{font-size:clamp(34px,4vw,52px);max-width:12ch}
${s} [data-pica-page] [data-pica-type-features] ol{margin:0;padding-left:20px;font-size:15px}
${s} [data-pica-page] [data-pica-type-features] li{padding:0 0 12px 8px}
${s} [data-pica-page] [data-pica-type-license]{display:grid;grid-template-columns:1fr 1fr;gap:50px;border-top:1px solid ${fg};padding-top:30px}
${s} [data-pica-page] [data-pica-type-license] h2{font-size:42px;margin:20px 0}
${s} [data-pica-page] [data-pica-type-download]{display:inline-block;font-size:20px;margin:10px 0 22px}
${s} [data-pica-page] [data-pica-type-license] details{margin-top:26px}
@media(max-width:800px){${s} [data-pica-page] [data-pica-type-hero]{gap:24px}${s} [data-pica-page] [data-pica-type-row]{grid-template-columns:130px 1fr}}
@media(max-width:600px){${s} [data-pica-page] [data-pica-type-hero]{grid-template-columns:1fr;gap:30px;padding:34px 0}${s} [data-pica-page] [data-pica-type-glyph]{font-size:68vw;max-width:100%}${s} [data-pica-page] [data-pica-type-row]{grid-template-columns:1fr;gap:12px}${s} [data-pica-page] [data-pica-type-features],${s} [data-pica-page] [data-pica-type-license]{grid-template-columns:1fr;gap:28px}}
`;
}

function typeFoundryRender(root: HTMLElement, p: TypeFoundryProps, ids: Record<string, string>): void {
  root.replaceChildren();

  const header = typeFoundryEl("header", "", "header"); header.append(typeFoundryLabel(p.foundry));
  const nav = typeFoundryEl("nav", "", "nav"); nav.setAttribute("aria-label", "Specimen navigation"); nav.append(typeFoundryLink("Characters", ids.characters!), typeFoundryLink("Size studies", ids.sizes!), typeFoundryLink("Get specimen", ids.license!)); header.append(nav); root.append(header);
  const hero = typeFoundryEl("div", "", "type-hero");
  const glyph = typeFoundryEl("div", p.glyph, "type-glyph"); glyph.setAttribute("aria-hidden", "true");
  const name = typeFoundryEl("div", "", "type-title"); name.append(typeFoundryLabel("Typeface study / 01"), typeFoundryEl("h1", p.name), typeFoundryEl("p", p.intro, "body"), typeFoundryLabel("Serif study · Latin character set")); hero.append(glyph, name); root.append(hero);
  const chars = typeFoundrySection(ids.characters!); chars.setAttribute("data-pica-type-characters", ""); chars.append(typeFoundryLabel("01 / Character inventory"), typeFoundryEl("p", p.alphabet, "type-alphabet"), typeFoundryEl("p", p.numerals, "type-numerals")); root.append(chars);
  const sizes = typeFoundrySection(ids.sizes!); sizes.setAttribute("data-pica-type-sizes", ""); sizes.append(typeFoundryLabel("02 / Scale and rhythm"));
  for (const size of [72, 48, 32, 18]) { const row = typeFoundryEl("div", "", "type-row"); row.append(typeFoundryLabel(`${size} / specimen scale`)); const phrase = typeFoundryEl("p", p.phrase); phrase.style.fontSize = `clamp(${Math.min(size, 30)}px, ${size / 12}vw, ${size}px)`; row.append(phrase); sizes.append(row); } root.append(sizes);
  const features = typeFoundryEl("section", "", "type-features"); features.append(typeFoundryEl("h2", "Details make the voice.")); const list = typeFoundryEl("ol"); p.features.forEach(text => list.append(typeFoundryEl("li", text))); features.append(list); root.append(features);
  const license = typeFoundrySection(ids.license!); license.setAttribute("data-pica-type-license", ""); const copy = typeFoundryEl("div"); copy.append(typeFoundryLabel("03 / Specimen and license"), typeFoundryEl("h2", "Put it to work."), typeFoundryEl("p", p.license, "body"));
  const delivery = typeFoundryEl("div"); const download = typeFoundryEl("a", "Download text specimen ↓", "type-download"); download.href = `data:text/plain;charset=utf-8,${encodeURIComponent([p.name, p.intro, p.alphabet, p.numerals, p.phrase, p.license].join("\n\n"))}`; download.download = "type-specimen.txt";
  delivery.append(download, typeFoundryEl("p", "A plain-text specimen for testing in your own type environment.", "body")); const detail = typeFoundryEl("details"); detail.append(typeFoundryEl("summary", "Which license do I need?"), typeFoundryEl("p", "Desktop covers installed users. Web covers served fonts and traffic. Editorial covers a defined publication. Tell the foundry how the font will be used before selecting a license.")); delivery.append(detail); license.append(copy, delivery); root.append(license);
  const footer = typeFoundryEl("footer", "", "footer"); footer.append(typeFoundryEl("h2", "Letters, made for language."), typeFoundryEl("p", p.contact)); root.append(footer);

}

export const mount: Mount<TypeFoundryProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  attrs.set("data-pica-id", host.getAttribute("data-pica-id"));
  attrs.set("role", "region");
  attrs.set("aria-label", props.label);
  const sheet = scope(host);
  const root = typeFoundryEl("div", "", "page");
  host.append(root);
  const ids: Record<string, string> = { characters: nextId("type-foundry-characters"), sizes: nextId("type-foundry-sizes"), license: nextId("type-foundry-license") };
  sheet.setRules(typeFoundryRules(sheet.selector));
  typeFoundryRender(root, props, ids);
  attrs.set("data-pica-ready", "true");
  let destroyed = false;
  return {
    update(next) {
      if (destroyed) return;
      const before = props;
      props = { ...props, ...next };
      if (sameJson(before, props)) return;
      attrs.set("aria-label", props.label);
      typeFoundryRender(root, props, ids);
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
