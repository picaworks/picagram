import type { Mount } from "../../../lib/types";
import { hostAttributes, nextId } from "../../../lib/host";
import { GRID_FONT } from "../../../lib/font";
import { cssVar } from "../../../lib/palette";
import { sameJson } from "../../../lib/json";
export interface AsciiProcessMapProps {
  /** The process title. */
  title: string;
  /** The entry step. */
  start: string;
  /** The decision prompt. */
  decision: string;
  /** Decision choices and the ordered steps for each branch. */
  routes: { choice: string; steps: string[]; outcome: string }[];
}
export const defaults: AsciiProcessMapProps = {
  "title": "Document intake",
  "start": "Receive submission",
  "decision": "Is the record complete?",
  "routes": [
    {
      "choice": "Ready for review",
      "steps": [
        "Validate identifiers",
        "Assign an editor",
        "Schedule review"
      ],
      "outcome": "The document enters the review queue."
    },
    {
      "choice": "Needs information",
      "steps": [
        "List missing fields",
        "Return to contributor",
        "Receive amended record"
      ],
      "outcome": "The contributor supplies the missing information before review."
    }
  ]
};

export const mount: Mount<AsciiProcessMapProps> = (host, initial = {}) => {
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
${s} [data-root]{max-width:880px}
${s} [data-root]>h2{font-size:30px;margin:16px 0 24px}
${s} [data-diagram]{border-left:4px solid ${cssVar("accent")};padding:24px 24px 24px 0;margin-bottom:24px}
${s} [data-choices]{display:flex;flex-wrap:wrap;gap:12px;margin:16px 0 28px}
${s} [data-route]{display:grid;grid-template-columns:1fr 1.4fr;gap:0 32px;border-top:1px solid ${cssVar("muted")};padding-top:24px}
${s} [data-route] ol{grid-column:2;grid-row:1 / 4}
@media(max-width:620px){${s} [data-route]{display:block}}
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
    attrs.set("role", "region"); attrs.set("aria-label", props.title.trim() || "Process map"); attrs.set("aria-hidden", null);
    marked("p", "kicker", "PROCESS / DECISION REGISTER"); el("h2", props.title.trim() || "Process map");
    const diagram = marked("div", "diagram");
    const intake = props.start.slice(0, 14).padEnd(14);
    const branchOne = (props.routes[0]?.choice ?? "No route").slice(0, 14).padEnd(14);
    const branchTwo = (props.routes[1]?.choice ?? "No route").slice(0, 14).padEnd(14);
    drawing(diagram, `                 ┌──────────────┐\n                 │${intake}│\n                 └──────┬───────┘\n                        │\n                 ◇   DECISION   ◇\n                 ╱              ╲\n        ┌───────┴──────┐  ┌──────┴───────┐\n        │${branchOne}│  │${branchTwo}│\n        └───────┬──────┘  └──────┬───────┘\n                ▼                ▼\n             ROUTE 01         ROUTE 02`, `      [ INTAKE ]\n           │\n      ◇ DECISION ◇\n       ╱       ╲\n  ROUTE 01   ROUTE 02\n     │          │\n  READ STEPS BELOW`, "Entry leads to a decision. Choose a route below to read its exact steps. Additional supplied routes remain available as choices.");
    marked("p", "mono", `START / ${props.start}`); el("h3", props.decision);
    const choices = marked("div", "choices"); const route = marked("section", "route"); route.setAttribute("aria-live", "polite");
    const buttons: HTMLButtonElement[] = [];
    const choose = (i: number): void => { buttons.forEach((b,j) => b.setAttribute("aria-pressed", String(i === j))); route.replaceChildren(); const record = props.routes[i]; if (!record) { el("p", "No routes supplied. Add a choice and its steps.", route); return; } route.setAttribute("data-route", String(i)); marked("p", "kicker", `SELECTED ROUTE / ${String(i + 1).padStart(2,"0")}`, route); el("h3", record.choice, route); const list = el("ol", "", route); el("li", props.start, list); for (const step of record.steps) el("li", step, list); el("p", record.outcome, route); };
    props.routes.forEach((record,i) => { const button = el("button", `${String(i+1).padStart(2,"0")} / ${record.choice}`, choices); button.type = "button"; buttons.push(button); button.addEventListener("click", () => choose(i)); }); choose(0);
    attrs.set("data-pica-ready", "true");
  }
  render();
  return {
    update(partial) { const next = { ...props, ...partial }; if (!sameJson(props, next)) { props = next; render(); } },
    destroy() { root.remove(); sheet.remove(); attrs.restore(); },
  };
};
