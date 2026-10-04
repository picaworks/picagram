import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import { sameJson } from "../../../lib/json";
import { emitter } from "../../../lib/events";
import type { Mount } from "../../../lib/types";

export interface WeatherSample { name: string; date: string; wind: string; speed: number; temperature: number; rainfall: number[]; note: string; }

export interface AsciiWeatherStationProps {
  /** Short heading displayed above the character drawing. */
  title: string;
  /** Accessible name for this interactive record. Empty hides the host. */
  label: string;
  /** Up to eight historical samples with name, ISO date, wind compass direction, speed in km/h, temperature in Celsius, seven daily rainfall values in mm, and a note. Values are deterministic supplied data. */
  samples: WeatherSample[];
  /** Zero based current record. Clamped to available records; native buttons change it locally. */
  selected: number;
}

export interface AsciiWeatherStationEvents {
  /** Reports the record chosen by a native button. */
  selection: { index: number };
}

export const defaults: AsciiWeatherStationProps = {
  title: "STATION / NORTH FIELD",
  label: "Weather Station records",
  samples: [
  {
    "name": "Dry interval",
    "date": "2026-04-08",
    "wind": "NE",
    "speed": 12,
    "temperature": 14,
    "rainfall": [
      0,
      2,
      0,
      0,
      1,
      0,
      0
    ],
    "note": "Recorded at 09:00 UTC. Clear mornings and an easterly flow followed the previous front."
  },
  {
    "name": "Passing front",
    "date": "2026-04-15",
    "wind": "SW",
    "speed": 28,
    "temperature": 11,
    "rainfall": [
      1,
      0,
      3,
      8,
      12,
      5,
      2
    ],
    "note": "Recorded at 09:00 UTC. Rainfall is the daily gauge total, ending with the selected date."
  },
  {
    "name": "Calm return",
    "date": "2026-04-22",
    "wind": "N",
    "speed": 4,
    "temperature": 16,
    "rainfall": [
      2,
      1,
      0,
      0,
      0,
      0,
      0
    ],
    "note": "Recorded at 09:00 UTC. The wind direction is where the wind came from; this is a historical record."
  }
],
  selected: 0,
};

export const mount: Mount<AsciiWeatherStationProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let selected = props.selected;
  let records: WeatherSample[] = [];
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
  const heading = make("h2"); const intro = make("p", "intro"); intro.textContent = "Historical field measurements. Select a sample to compare wind and rainfall across a seven day window.";
  const body = make("div", "body"); const diagram = make("div"); const art = make("pre"); art.setAttribute("aria-hidden", "true");
  const list = make("ol"); list.setAttribute("aria-label", "Weather Station register");
  const detail = make("section", "detail"); const eyebrow = make("div", "eyebrow"); eyebrow.textContent = "SELECTED RECORD";
  const detailTitle = make("h3"); const facts = make("p", "facts"); const note = make("p", "note");
  detail.setAttribute("aria-live", "polite"); detail.append(eyebrow, detailTitle, facts, note);
  diagram.append(art, list); body.append(diagram, detail); record.append(heading, intro, body); host.append(record);
  const emit = emitter<AsciiWeatherStationEvents>(host);
  function text(value: unknown, max = 40): string { return String(value ?? "").replace(/[\r\n\t]/g, " ").slice(0, max); }
  function number(value: unknown, min: number, max: number): number { const n = Number(value); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min; }
  function rebuild(): void {
    records = (Array.isArray(props.samples) ? props.samples : []).filter(r => r && typeof r === "object").slice(0, 8).map(r => ({ name: text(r.name), date: text(r.date, 20), wind: text(r.wind, 2).toUpperCase(), speed: number(r.speed, 0, 300), temperature: number(r.temperature, -80, 60), rainfall: (Array.isArray(r.rainfall) ? r.rainfall : []).slice(0, 7).map(v => number(v, 0, 1000)), note: text(r.note, 350) }));
    list.replaceChildren();
    records.forEach((r, i) => { const li = make("li"); const button = make("button"); button.type = "button"; button.dataset.choice = String(i);
      const name = make("span"); name.textContent = `${String(i + 1).padStart(2,"0")} / ${r.name}`;
      const metric = make("span", "metric"); metric.textContent = `${r.date} / ${r.temperature} C`; button.append(name, metric); li.append(button); list.append(li);
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
      const rain = [...r.rainfall]; while (rain.length < 7) rain.push(0); const peak = Math.max(5, ...rain);
    const rows = ["     N            RAIN / DAILY mm", "  NW | NE         " + peak.toFixed(0).padStart(3) + " +--------------+", "W----+----E           |" + rain.map(v => v >= peak * .75 ? "##" : "  ").join("") + "|", "  SW | SE             |" + rain.map(v => v >= peak * .5 ? "##" : "  ").join("") + "|", "     S                |" + rain.map(v => v > 0 ? "##" : "  ").join("") + "|", "                      +--------------+", " FROM " + r.wind.padEnd(3) + "             1 2 3 4 5 6 7", " " + r.speed + " km/h             0 = dry day"];
    art.textContent = rows.join("\n");
      detailTitle.textContent = r.name;
      facts.textContent = `${r.temperature} °C · wind from ${r.wind} at ${r.speed} km/h\nDaily rain (mm): ${r.rainfall.join(", ")}\nSeven day total: ${r.rainfall.reduce((a,b) => a+b, 0)} mm`; note.textContent = r.note;
    }
    attrs.set("data-pica-ready", "true");
  }
  const onClick = (event: Event): void => { const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-choice]"); if (!button || !list.contains(button)) return; selected = Number(button.dataset.choice); paint(); emit("selection", { index: selected }); };
  list.addEventListener("click", onClick);
  rebuild(); paint();
  return {
    update(next) { const before = props; props = { ...props, ...next }; if (next.selected !== undefined) selected = next.selected; if (!sameJson(before.samples, props.samples)) rebuild(); paint(); },
    destroy() { list.removeEventListener("click", onClick); record.remove(); styles.destroy(); attrs.restore(); },
  };
};
