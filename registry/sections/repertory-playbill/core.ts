import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface RepertoryCast {
  /** The character or production role. */
  role: string;
  /** The performer or collaborator. */
  name: string;
}

export interface RepertoryPlaybillProps {
  /** The title of the production. */
  title: string;
  /** The presenting theatre. */
  theatre: string;
  /** The performance season. */
  season: string;
  /** The premise of the production. */
  synopsis: string;
  /** Cast members in billing order. */
  cast: readonly RepertoryCast[];
}

export const defaults: RepertoryPlaybillProps = {
  title: "A room for the sea",
  theatre: "The Common Stage",
  season: "AUTUMN REPERTORY / 14 OCT—08 NOV",
  synopsis: "An island house. A storm approaching. Three siblings return to decide what to keep, and discover that a room can hold more than its walls.",
  cast: [ { role: "Mara", name: "Nina Ellis" }, { role: "Ivo", name: "Samir Dey" }, { role: "June", name: "Frances Lake" }, { role: "The visitor", name: "Theo Moss" }, { role: "Live sound", name: "Ruth Amari" } ],
};

function playbillNode<K extends keyof HTMLElementTagNameMap>(tag: K, part: string, text = ""): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  if (part) el.setAttribute("data-pica-part", part);
  el.textContent = text;
  return el;
}

function playbillSvg<K extends keyof SVGElementTagNameMap>(tag: K, values: Readonly<Record<string, string>>): SVGElementTagNameMap[K] {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  el.setAttribute("data-pica", "");
  for (const [key, value] of Object.entries(values)) el.setAttribute(key, value);
  return el;
}

function playbillLink(label: string, target: string): HTMLAnchorElement {
  const a = playbillNode("a", "", label);
  a.href = `#${target}`;
  return a;
}

function playbillRules(s: string): string {
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

${s} [data-pica-part="fold"]{display:grid;grid-template-columns:1.7fr 1fr;border-bottom:1px solid ${fg};min-height:485px}
${s} [data-pica-part="billing"]{padding:34px 60px 38px 0;border-right:1px solid ${fg}}
${s} [data-pica-part="billing"] h1{font-family:var(--pica-font-serif,inherit);font-size:clamp(55px,8vw,100px);max-width:8ch;line-height:.95;margin:24px 0}
${s} [data-pica-part="byline"]{font-size:14px;margin-top:30px}
${s} [data-pica-part="direction"]{font-family:${GRID_FONT};font-size:12px;color:${fg};margin:0 0 24px;border-left:3px solid ${accent};padding-left:12px}
${s} [data-pica-part="synopsis"]{max-width:34rem}
${s} [data-pica-part="company"]{padding:34px 0 34px 36px}
${s} [data-pica-part="cast"]{margin-top:28px}
${s} [data-pica-part="cast-row"]{padding:14px 0;border-top:1px solid ${muted};display:flex;justify-content:space-between;gap:15px;align-items:baseline}
${s} [data-pica-part="role"]{font-family:${GRID_FONT};font-size:11px;color:${muted}}
${s} [data-pica-part="name"]{font-size:19px}
${s} [data-pica-part="credits"]{white-space:pre-line;font-family:${GRID_FONT};font-size:11px;line-height:1.9;margin-top:30px}
${s} [data-pica-part="stage"]{display:grid;grid-template-columns:1fr 1.2fr;gap:45px;padding-top:34px}
${s} [data-pica-part="stage-copy"]{display:grid;gap:18px;align-content:start}
${s} [data-pica-part="stage-plan"]{align-self:center}
${s} [data-pica-part="stage-plan"] figcaption{text-align:center;color:${muted}}
${s} [data-pica-part="curtain"]{display:grid;grid-template-columns:1fr 2fr;gap:45px;border-top:1px solid ${fg};margin-top:35px;padding-top:22px;font-size:14px}
${s} [data-pica-part="curtain"] p{white-space:pre-line;margin-top:12px}
@media(max-width:800px){${s} [data-pica-part="billing"]{padding-right:30px}${s} [data-pica-part="company"]{padding-left:24px}${s} [data-pica-part="cast-row"]{flex-direction:column;gap:5px}${s} [data-pica-part="stage"]{gap:24px}}
@media(max-width:600px){${s} [data-pica-part="fold"]{grid-template-columns:1fr}${s} [data-pica-part="billing"]{border-right:0;padding:25px 0 30px}${s} [data-pica-part="billing"] h1{font-size:65px}${s} [data-pica-part="company"]{border-top:1px solid ${fg};padding:25px 0}${s} [data-pica-part="cast-row"]{flex-direction:row}${s} [data-pica-part="stage"],${s} [data-pica-part="curtain"]{grid-template-columns:1fr;gap:26px}}
`;
}

export const mount: Mount<RepertoryPlaybillProps> = (host, initial = {}) => {
  let props: RepertoryPlaybillProps = { ...defaults, ...initial };
  const attributes = hostAttributes(host);
  const container = playbillNode("div", "");
  host.append(container);
  const sheet = scope(container);
  const page = playbillNode("article", "");
  page.setAttribute("data-pica-page", "");
  container.append(page);
  const id = nextId("pica-repertory-playbill");
  sheet.setRules(playbillRules(sheet.selector));
  let destroyed = false;
  const render = (): void => {
    attributes.set("aria-hidden", "false");
    attributes.set("role", "region");
    attributes.set("aria-label", props.title);
    page.replaceChildren();
    const top = playbillNode("header", "top");
    top.append(playbillNode("span", "label", props.theatre));
    const nav = playbillNode("nav", "");
    nav.setAttribute("aria-label", "Playbill sections");
    nav.append(playbillLink("Company", `${id}-company`), playbillLink("The space", `${id}-stage`));
    top.append(nav);
    const fold = playbillNode("div", "fold");
    const billing = playbillNode("section", "billing");
    billing.append(playbillNode("p", "label", props.season), playbillNode("p", "byline", "A new play by Lena Wren"), playbillNode("h1", "", props.title), playbillNode("p", "direction", "Directed by Milo Aster"), playbillNode("p", "synopsis", props.synopsis));
    const company = playbillNode("section", "company");
    company.id = `${id}-company`;
    company.append(playbillNode("span", "label", "The company / in order of appearance"));
    const cast = playbillNode("dl", "cast");
    for (const person of props.cast) {
      const row = playbillNode("div", "cast-row");
      row.append(playbillNode("dt", "role", person.role), playbillNode("dd", "name", person.name));
      cast.append(row);
    }
    company.append(cast, playbillNode("p", "credits", `Set & costume / Aya Sol
Lighting / Ben Arden
Movement / Kit River
Stage management / Eden Lowe`));
    fold.append(billing, company);
    const stage = playbillNode("section", "stage");
    stage.id = `${id}-stage`;
    const stageTitle = playbillNode("div", "stage-copy");
    stageTitle.append(playbillNode("span", "label", "A note from the director"), playbillNode("h2", "", "The audience completes the room."), playbillNode("p", "", "We have placed the story in the round. Every seat has a different view; every gesture arrives somewhere. The empty chair remains at the centre, waiting for a decision."));
    const figure = playbillNode("figure", "stage-plan");
    const drawing = playbillSvg("svg", { viewBox: "0 0 500 300", "aria-hidden": "true" });
    drawing.append(playbillSvg("rect", { x: "110", y: "55", width: "280", height: "190" }), playbillSvg("rect", { x: "170", y: "105", width: "160", height: "90", "stroke-dasharray": "4 4" }), playbillSvg("path", { d: "M238 130h24v22h-24z M240 152v16 M260 152v16 M246 130v-10h8v10" }));
    for (let i = 0; i < 9; i++) {
      const x = String(123 + i * 30);
      drawing.append(playbillSvg("path", { d: `M${x} 35v-12h18v12 M${x} 265v12h18v-12` }));
    }
    for (let i = 0; i < 5; i++) {
      const y = String(68 + i * 32);
      drawing.append(playbillSvg("path", { d: `M90 ${y}H78v18h12 M410 ${y}h12v18h-12` }));
    }
    figure.append(drawing, playbillNode("figcaption", "label", "Ground plan / audience on all four sides"));
    stage.append(stageTitle, figure);
    const curtain = playbillNode("section", "curtain");
    const time = playbillNode("div", "");
    time.append(playbillNode("span", "label", "The evening"), playbillNode("p", "", `Act I / 55 minutes
Interval / 15 minutes
Act II / 45 minutes`));
    const access = playbillNode("div", "");
    access.append(playbillNode("span", "label", "Before the curtain"), playbillNode("p", "", "Doors open at 19:00. Captioned performance on 23 October. Relaxed matinee on 1 November. Step-free seats are available on each side of the stage."));
    curtain.append(time, access);
    const footer = playbillNode("footer", "footer");
    footer.append(playbillNode("span", "label", "Please silence your phone / keep your curiosity"), playbillLink("Return to the company ↑", `${id}-company`));
    page.append(top, fold, stage, curtain, footer);
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
