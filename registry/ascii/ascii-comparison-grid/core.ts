import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import { sameJson } from "../../../lib/json";
import { emitter } from "../../../lib/events";
import type { Mount } from "../../../lib/types";

export interface Specimen { name: string; code: string; mass: number; thickness: number; absorbency: string; use: string; note: string; }

export interface AsciiComparisonGridProps {
  /** Short heading displayed above the character drawing. */
  title: string;
  /** Accessible name for this interactive record. Empty hides the host. */
  label: string;
  /** Up to six specimens with name, short code, basis mass in g/m2, thickness in mm, absorbency, intended use, and note. Supplied values describe a sample set, not a product recommendation. The diagram shows three columns and keeps the selected column in view. */
  specimens: Specimen[];
  /** Zero based current record. Clamped to available records; native buttons change it locally. */
  selected: number;
}

export interface AsciiComparisonGridEvents {
  /** Reports the record chosen by a native button. */
  selection: { index: number };
}

export const defaults: AsciiComparisonGridProps = {
  title: "MATERIALS / SPECIMEN REGISTER",
  label: "Comparison Grid records",
  specimens: [
  {
    "name": "Rag sheet",
    "code": "A",
    "mass": 160,
    "thickness": 0.29,
    "absorbency": "High",
    "use": "Wet media",
    "note": "Soft surface holds a wash well. Allow the sheet to dry fully before stacking."
  },
  {
    "name": "Drawing stock",
    "code": "B",
    "mass": 120,
    "thickness": 0.18,
    "absorbency": "Medium",
    "use": "Graphite",
    "note": "A lightly sized sheet for line studies. The sample bends cleanly along the grain."
  },
  {
    "name": "Coated board",
    "code": "C",
    "mass": 240,
    "thickness": 0.36,
    "absorbency": "Low",
    "use": "Print proof",
    "note": "The coated face keeps printed edges sharp. Test adhesion before finishing the proof."
  }
],
  selected: 0,
};

export const mount: Mount<AsciiComparisonGridProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let selected = props.selected;
  let records: Specimen[] = [];
  const attrs = hostAttributes(host);
  const scopeId = nextId("ascii-record");
  attrs.set("data-pica-id", scopeId);
  const stylesheet = make("style"); host.append(stylesheet);
  const styles = {
    selector: `[data-pica-id="${scopeId}"]`,
    setRules(css: string): void { stylesheet.textContent = css; },
    destroy(): void { stylesheet.remove(); },
  };
  const s = styles.selector;
  styles.setRules(`
    ${s} { color:${cssVar("fg")};background:${cssVar("bg")};box-sizing:border-box; }
    ${s} [data-part="record"] { padding:clamp(18px,4vw,48px);max-width:1080px;margin:auto; }
    ${s} h2 { font:inherit;font-size:1.15em;margin:0 0 12px; }
    ${s} [data-part="intro"] { color:${cssVar("muted")};max-width:62ch;line-height:1.6;margin:0 0 28px; }
    ${s} [data-part="body"] { display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:36px;border-top:1px solid ${cssVar("muted")};padding-top:24px; }
    ${s} pre { font:14px/1.7 ${GRID_FONT};margin:0;overflow:auto;white-space:pre; }
    ${s} ol { padding:0;margin:24px 0 0;list-style:none; }
    ${s} li { border-top:1px solid ${cssVar("muted")}; }
    ${s} button { display:flex;flex-wrap:wrap;gap:4px 16px;justify-content:space-between;width:100%;text-align:left;padding:12px 8px;color:${cssVar("fg")};background:${cssVar("bg")};border:0;border-left:3px solid transparent;font:inherit;cursor:pointer; }
    ${s} button[aria-pressed="true"] { border-left-color:${cssVar("accent")}; }
    ${s} button:focus-visible { outline:2px solid ${cssVar("accent")};outline-offset:2px; }
    ${s} [data-part="metric"],${s} [data-part="eyebrow"] { font:12px/1.6 ${GRID_FONT};color:${cssVar("muted")}; }
    ${s} [data-part="detail"] { border-top:3px solid ${cssVar("accent")};padding-top:20px;min-width:0; }
    ${s} h3 { font:inherit;font-size:1.3em;margin:12px 0; }
    ${s} [data-part="facts"] { white-space:pre-line;font:13px/1.8 ${GRID_FONT};overflow-wrap:anywhere; }
    ${s} [data-part="note"] { line-height:1.65;overflow-wrap:anywhere; }
    @media(max-width:640px) { ${s} [data-part="body"] { grid-template-columns:1fr;gap:28px; } ${s} pre { font-size:12px; } }
  `);
  function make<K extends keyof HTMLElementTagNameMap>(tag: K, part = ""): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag); el.setAttribute("data-pica", ""); if(part) el.setAttribute("data-part", part); return el;
  }
  const record = make("section", "record");
  const heading = make("h2"); const intro = make("p", "intro"); intro.textContent = "A supplied paper sample set. Select a specimen to inspect measurements and handling notes.";
  const body = make("div", "body"); const diagram = make("div"); const art = make("pre"); art.setAttribute("aria-hidden", "true");
  const list = make("ol"); list.setAttribute("aria-label", "Comparison Grid register");
  const detail = make("section", "detail"); const eyebrow = make("div", "eyebrow"); eyebrow.textContent = "SELECTED RECORD";
  const detailTitle = make("h3"); const facts = make("p", "facts"); const note = make("p", "note");
  detail.setAttribute("aria-live", "polite"); detail.append(eyebrow, detailTitle, facts, note);
  diagram.append(art, list); body.append(diagram, detail); record.append(heading, intro, body); host.append(record);
  const emit = emitter<AsciiComparisonGridEvents>(host);
  function text(value: unknown, max = 40): string { return String(value ?? "").replace(/[\r\n\t]/g, " ").slice(0, max); }
  function number(value: unknown, min: number, max: number): number { const n = Number(value); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min; }
  function rebuild(): void {
    records = (Array.isArray(props.specimens) ? props.specimens : []).filter(r => r && typeof r === "object").slice(0, 6).map(r => ({ name: text(r.name), code: text(r.code, 3), mass: number(r.mass, 0, 2000), thickness: number(r.thickness, 0, 20), absorbency: text(r.absorbency, 20), use: text(r.use, 60), note: text(r.note, 350) }));
    list.replaceChildren();
    records.forEach((r, i) => { const li = make("li"); const button = make("button"); button.type = "button"; button.dataset.choice = String(i);
      const name = make("span"); name.textContent = `${String(i + 1).padStart(2,"0")} / ${r.name}`;
      const metric = make("span", "metric"); metric.textContent = `${r.code} / ${r.mass} g/m²`; button.append(name, metric); li.append(button); list.append(li);
    });
  }
  function paint(): void {
    attrs.set("role", "region"); attrs.set("aria-label", props.label || null); attrs.set("aria-hidden", props.label ? null : "true");
    heading.textContent = props.title;
    selected = Math.max(0, Math.min(records.length - 1, Math.floor(Number.isFinite(selected) ? selected : 0)));
    list.querySelectorAll("button").forEach((b, i) => b.setAttribute("aria-pressed", String(i === selected)));
    const r = records[selected];
    if (!r) { art.textContent = "[ no records supplied ]"; detailTitle.textContent = "No records"; facts.textContent = "Add records through the JSON data prop."; note.textContent = ""; }
    else {
      const offset = Math.max(0, selected - 2); const shown = records.slice(offset, offset + 3); const cell = (v: string): string => v.slice(0, 7).padStart(7); const line = "+----------+" + shown.map(() => "-------+").join("");
    const rows = [line, "| SPECIMEN |" + shown.map((s, i) => cell((i + offset === selected ? ">" : " ") + s.code) + "|").join(""), line];
    [["g/m2", (s: Specimen) => String(s.mass)], ["mm", (s: Specimen) => String(s.thickness)], ["absorb.", (s: Specimen) => s.absorbency]].forEach(([key, fn]) => rows.push("| " + String(key).padEnd(9) + "|" + shown.map(s => cell((fn as (s: Specimen) => string)(s)) + "|").join("")));
    rows.push(line, "> marks selected column", "Full facts in the specimen register"); art.textContent = rows.join("\n");
      detailTitle.textContent = r.name;
      facts.textContent = `${r.mass} g/m² · ${r.thickness} mm\nAbsorbency: ${r.absorbency}\nIntended use: ${r.use}`; note.textContent = r.note;
    }
    attrs.set("data-pica-ready", "true");
  }
  const onClick = (event: Event): void => { const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-choice]"); if (!button || !list.contains(button)) return; selected = Number(button.dataset.choice); paint(); emit("selection", { index: selected }); };
  list.addEventListener("click", onClick);
  rebuild(); paint();
  return {
    update(next) { const before = props; props = { ...props, ...next }; if (next.selected !== undefined) selected = next.selected; if (!sameJson(before.specimens, props.specimens)) rebuild(); paint(); },
    destroy() { list.removeEventListener("click", onClick); record.remove(); styles.destroy(); attrs.restore(); },
  };
};
