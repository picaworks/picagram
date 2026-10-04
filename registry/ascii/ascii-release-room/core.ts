import type { Mount } from "../../../lib/types";
import { hostAttributes, nextId } from "../../../lib/host";
import { GRID_FONT } from "../../../lib/font";
import { cssVar } from "../../../lib/palette";
import { sameJson } from "../../../lib/json";
export interface AsciiReleaseRoomProps {
  /** The software project name. */
  title: string;
  /** The project purpose. */
  intro: string;
  /** Published versions and their compatibility facts. */
  versions: { version: string; date: string; runtime: string; status: string; notes: string[] }[];
}
export const defaults: AsciiReleaseRoomProps = {
  "title": "Relay / release room",
  "intro": "A small document transformer for predictable build pipelines. Review the published versions, runtime support and migration notes before upgrading.",
  "versions": [
    {
      "version": "2.4.0",
      "date": "03 OCT 2026",
      "runtime": "Node 22 and 24",
      "status": "Current stable",
      "notes": [
        "Add deterministic field ordering to exported documents.",
        "Preserve empty metadata when importing older records.",
        "No configuration migration is required from 2.3."
      ]
    },
    {
      "version": "2.3.1",
      "date": "14 SEP 2026",
      "runtime": "Node 22 and 24",
      "status": "Maintenance",
      "notes": [
        "Correct line endings in plain-text exports.",
        "Use the 2.3 configuration schema; no new flags."
      ]
    },
    {
      "version": "1.9.8",
      "date": "09 AUG 2026",
      "runtime": "Node 20 and 22",
      "status": "Legacy support",
      "notes": [
        "Final maintenance release for the version 1 schema.",
        "Export your settings before migrating to version 2."
      ]
    }
  ]
};

export const mount: Mount<AsciiReleaseRoomProps> = (host, initial = {}) => {
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
${s} [data-header]{display:grid;grid-template-columns:1.3fr 1fr;gap:48px;align-items:center}
${s} [data-branch]{border-left:4px solid ${cssVar("accent")};padding:24px}
${s} [data-work]{display:grid;grid-template-columns:240px 1fr;gap:48px;border-top:1px solid ${cssVar("muted")};margin-top:40px;padding-top:32px}
${s} fieldset{border:0;padding:0;margin:0 0 32px}
${s} legend{font-family:${GRID_FONT};font-size:12px;margin-bottom:12px}
${s} [data-selector] label{display:flex;align-items:center;gap:12px;font-family:${GRID_FONT};font-size:14px;min-height:44px;padding:8px 0}
${s} input{accent-color:${cssVar("fg")};width:18px;height:18px}
${s} [data-release] h2{font-size:32px}
${s} [data-release] dl{display:grid;grid-template-columns:160px 1fr;margin-bottom:24px}
@media(max-width:760px){${s} [data-header],${s} [data-work]{grid-template-columns:1fr;gap:24px}${s} [data-release] dl{grid-template-columns:1fr}}
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
    attrs.set("role", "region"); attrs.set("aria-label", props.title.trim() || "Release room"); attrs.set("aria-hidden", null);
    marked("p", "kicker", "RELAY DOCUMENT TOOLS / PROJECT REFERENCE");
    const header = marked("header", "header"); const lead = el("div", "", header); el("h1", props.title.trim() || "Release room", lead); el("p", props.intro, lead);
    const branch = marked("aside", "branch", "", header);
    drawing(branch, " main      ●────────●────────●\n           │        │        │\n stable    ├─ 2.3 ──┴─ 2.4 ──┘\n           │\n legacy    └─ 1.9 ───────────●", "main    ●──●──●\n        │  │  │\nstable  ├──┴──┘\nlegacy  └─────●", "Main feeds stable releases. The version 1 branch receives maintenance only.");
    const work = marked("section", "work"); const selector = marked("aside", "selector", "", work);
    const group = el("fieldset", "", selector); el("legend", "Published version", group);
    const name = nextId("relay-version"); let selected = 0;
    const radios: HTMLInputElement[] = [];
    props.versions.forEach((v, i) => { const label = el("label", "", group); const radio = el("input", "", label); radio.type = "radio"; radio.name = name; radio.value = String(i); radio.checked = i === 0; radios.push(radio); el("span", v.version, label); });
    marked("p", "kicker", "Support policy", selector); el("p", "Stable releases receive fixes for twelve months. Legacy releases receive critical repairs only.", selector);
    const panel = marked("article", "release", "", work); panel.setAttribute("aria-live", "polite");
    const show = (): void => { panel.replaceChildren(); const v = props.versions[selected]; if (!v) { el("h2", "No published versions", panel); el("p", "Add a version record to begin the release history.", panel); return; } panel.setAttribute("data-version", v.version); marked("p", "kicker", `${v.date} / ${v.status}`, panel); el("h2", `Release ${v.version}`, panel); const facts = el("dl", "", panel); el("dt", "Supported runtime", facts); el("dd", v.runtime, facts); el("dt", "Distribution", facts); el("dd", "Source archive and package registry", facts); el("h3", "Changes in this release", panel); const list = el("ul", "", panel); for (const note of v.notes) el("li", note, list); };
    radios.forEach((radio, i) => radio.addEventListener("change", () => { if (radio.checked) { selected = i; show(); } })); show();
    const migration = marked("section", "rule"); el("h2", "Upgrade checklist", migration); const sequence = el("ol", "", migration); for (const note of ["Save the current configuration and a representative input file.", "Check your runtime against the selected release above.", "Run a local conversion and compare the exported document."]) el("li", note, sequence);
    const detail = el("details", "", migration); el("summary", "Configuration compatibility", detail); el("p", "Version 2 accepts the version 2 schema. Version 1 settings need an explicit export and conversion before use.", detail);
    attrs.set("data-pica-ready", "true");
  }
  render();
  return {
    update(partial) { const next = { ...props, ...partial }; if (!sameJson(props, next)) { props = next; render(); } },
    destroy() { root.remove(); sheet.remove(); attrs.restore(); },
  };
};
