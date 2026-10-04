import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import { sameJson } from "../../../lib/json";
import { emitter } from "../../../lib/events";
import type { Mount } from "../../../lib/types";

export interface Season { name: string; rows: string[]; crops: { glyph: string; name: string; spacing: string; }[]; note: string; }

export interface AsciiGardenPlanProps {
  /** Short heading displayed above the character drawing. */
  title: string;
  /** Accessible name for this interactive record. Empty hides the host. */
  label: string;
  /** Up to four seasons, each with name, up to six ten-cell rows, crop glyph/name/spacing records, and a planting note. Use one ASCII letter per crop and a dot for an empty cell. */
  seasons: Season[];
  /** Zero based current record. Clamped to available records; native buttons change it locally. */
  selected: number;
}

export interface AsciiGardenPlanEvents {
  /** Reports the record chosen by a native button. */
  selection: { index: number };
}

export const defaults: AsciiGardenPlanProps = {
  title: "ALLOTMENT / BED B",
  label: "Garden Plan records",
  seasons: [
  {
    "name": "Spring",
    "rows": [
      "PP..LL..RR",
      "PP..LL..RR",
      "PP..LL..RR",
      "SS..LL..RR",
      "SS........",
      "SS........"
    ],
    "crops": [
      {
        "glyph": "P",
        "name": "Peas",
        "spacing": "10 cm, north trellis"
      },
      {
        "glyph": "L",
        "name": "Lettuce",
        "spacing": "25 cm between plants"
      },
      {
        "glyph": "R",
        "name": "Radish",
        "spacing": "5 cm, repeat sowing"
      },
      {
        "glyph": "S",
        "name": "Spinach",
        "spacing": "15 cm, cool soil"
      }
    ],
    "note": "Each cell represents 25 cm. Leave the two centre aisles open. Sow peas along the north edge and use the trellis."
  },
  {
    "name": "Summer",
    "rows": [
      "BB..TT..CC",
      "BB..TT..CC",
      "BB..TT..CC",
      "BB..HH..CC",
      "....HH....",
      "....HH...."
    ],
    "crops": [
      {
        "glyph": "B",
        "name": "Beans",
        "spacing": "15 cm, reuse trellis"
      },
      {
        "glyph": "T",
        "name": "Tomato",
        "spacing": "50 cm, stake plants"
      },
      {
        "glyph": "C",
        "name": "Chard",
        "spacing": "30 cm, outer leaves"
      },
      {
        "glyph": "H",
        "name": "Basil",
        "spacing": "25 cm, warm soil"
      }
    ],
    "note": "Replace early crops after harvest. The two T cells mark one tomato planting position per pair. Water at soil level."
  },
  {
    "name": "Autumn",
    "rows": [
      "KK..MM..RR",
      "KK..MM..RR",
      "KK..MM..RR",
      "....MM....",
      "....MM....",
      ".........."
    ],
    "crops": [
      {
        "glyph": "K",
        "name": "Kale",
        "spacing": "45 cm, one per pair"
      },
      {
        "glyph": "M",
        "name": "Mustard",
        "spacing": "15 cm, young leaves"
      },
      {
        "glyph": "R",
        "name": "Radish",
        "spacing": "5 cm, sheltered edge"
      }
    ],
    "note": "Clear beans before the first frost. Mulch empty cells and keep kale roots undisturbed through the cold season."
  }
],
  selected: 0,
};

export const mount: Mount<AsciiGardenPlanProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let selected = props.selected;
  let records: Season[] = [];
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
    ${s} [data-part="positions-list"] { list-style:decimal;padding-left:1.2em;margin:12px 0;line-height:1.65; }
    ${s} [data-part="positions-list"] li { border:0;margin:8px 0; }
    ${s} summary { cursor:pointer;line-height:1.6; }
    ${s} summary:focus-visible { outline:2px solid ${cssVar("accent")};outline-offset:2px; }
    @media(max-width:640px) { ${s} [data-part="body"] { grid-template-columns:1fr;gap:28px; } ${s} pre { font-size:12px; } }
  `);
  function make<K extends keyof HTMLElementTagNameMap>(tag: K, part = ""): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag); el.setAttribute("data-pica", ""); if(part) el.setAttribute("data-part", part); return el;
  }
  const record = make("section", "record");
  const heading = make("h2"); const intro = make("p", "intro"); intro.textContent = "A 2.5 m planting bed. Select a season to change the occupied cells and the crop schedule.";
  const body = make("div", "body"); const diagram = make("div"); const art = make("pre"); art.setAttribute("aria-hidden", "true");
  const list = make("ol"); list.setAttribute("aria-label", "Garden Plan register");
  const detail = make("section", "detail"); const eyebrow = make("div", "eyebrow"); eyebrow.textContent = "SELECTED RECORD";
  const detailTitle = make("h3"); const facts = make("p", "facts"); const note = make("p", "note");
  const positions = make("details", "positions"); const positionsLabel = make("summary"); positionsLabel.textContent = "Bed positions / row register"; const positionsList = make("ol", "positions-list"); positions.append(positionsLabel, positionsList);
  detail.setAttribute("aria-live", "polite"); detail.append(eyebrow, detailTitle, facts, positions, note);
  diagram.append(art, list); body.append(diagram, detail); record.append(heading, intro, body); host.append(record);
  const emit = emitter<AsciiGardenPlanEvents>(host);
  function text(value: unknown, max = 40): string { return String(value ?? "").replace(/[\r\n\t]/g, " ").slice(0, max); }
  function rebuild(): void {
    records = (Array.isArray(props.seasons) ? props.seasons : []).filter(r => r && typeof r === "object").slice(0, 4).map(r => ({ name: text(r.name), rows: (Array.isArray(r.rows) ? r.rows : []).slice(0, 6).map(v => text(v, 10).replace(/[^A-Za-z.]/g, ".").padEnd(10, ".")), crops: (Array.isArray(r.crops) ? r.crops : []).filter(v => v && typeof v === "object").slice(0, 10).map(v => ({ glyph: text(v.glyph, 1), name: text(v.name), spacing: text(v.spacing, 70) })), note: text(r.note, 350) }));
    list.replaceChildren();
    records.forEach((r, i) => { const li = make("li"); const button = make("button"); button.type = "button"; button.dataset.choice = String(i);
      const name = make("span"); name.textContent = `${String(i + 1).padStart(2,"0")} / ${r.name}`;
      const metric = make("span", "metric"); metric.textContent = `${r.rows.length} rows / ${r.crops.length} crops`; button.append(name, metric); li.append(button); list.append(li);
    });
  }
  function paint(): void {
    attrs.set("role", "region"); attrs.set("aria-label", props.label || null); attrs.set("aria-hidden", props.label ? null : "true");
    heading.textContent = props.title;
    selected = Math.max(0, Math.min(records.length - 1, Math.floor(Number.isFinite(selected) ? selected : 0)));
    list.querySelectorAll("button").forEach((b, i) => b.setAttribute("aria-pressed", String(i === selected)));
    const r = records[selected];
    positions.hidden = !r; positionsList.replaceChildren();
    r?.rows.forEach((row, i) => { const line = make("li"); const groups: string[] = []; let start = 0;
      for (let end = 1; end <= row.length; end++) { if (row[end] === row[start] && end < row.length) continue; const crop = r.crops.find(c => c.glyph === row[start]); const range = String.fromCharCode(65 + start) + (end - start > 1 ? " to " + String.fromCharCode(64 + end) : ""); groups.push(range + ": " + (crop?.name || (row[start] === "." ? "empty" : row[start]))); start = end; }
      line.textContent = `Row ${i + 1}. ${groups.join("; ")}.`; positionsList.append(line);
    });
    if (!r) { art.textContent = "[ no records supplied ]"; detailTitle.textContent = "No records"; facts.textContent = "Add records through the JSON data prop."; note.textContent = ""; }
    else {
      const rows = ["            N / TRELLIS", "            ^", "    A B C D E F G H I J", "  +---------------------+"];
    for (let i = 0; i < 6; i++) rows.push(`${i + 1} | ${(r.rows[i] ?? ".........." ).split("").join(" ")} |`);
    rows.push("  +---------------------+", "  . unplanted / 25 cm per cell"); art.textContent = rows.join("\n");
      detailTitle.textContent = r.name;
      facts.textContent = r.crops.map(c => `${c.glyph} = ${c.name} (${c.spacing})`).join("; "); note.textContent = r.note;
    }
    attrs.set("data-pica-ready", "true");
  }
  const onClick = (event: Event): void => { const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-choice]"); if (!button || !list.contains(button)) return; selected = Number(button.dataset.choice); paint(); emit("selection", { index: selected }); };
  list.addEventListener("click", onClick);
  rebuild(); paint();
  return {
    update(next) { const before = props; props = { ...props, ...next }; if (next.selected !== undefined) selected = next.selected; if (!sameJson(before.seasons, props.seasons)) rebuild(); paint(); },
    destroy() { list.removeEventListener("click", onClick); record.remove(); styles.destroy(); attrs.restore(); },
  };
};
