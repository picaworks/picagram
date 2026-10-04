import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import { sameJson } from "../../../lib/json";
import { emitter } from "../../../lib/events";
import type { Mount } from "../../../lib/types";

export interface Hop { name: string; address: string; latency: number; note: string; }

export interface AsciiPacketRouteProps {
  /** Short heading displayed above the character drawing. */
  title: string;
  /** Accessible name for this interactive record. Empty hides the host. */
  label: string;
  /** Up to eight hops with name, documentation address, latency in ms, and operational note. Values are supplied records, never live requests. */
  hops: Hop[];
  /** Zero based current record. Clamped to available records; native buttons change it locally. */
  selected: number;
}

export interface AsciiPacketRouteEvents {
  /** Reports the record chosen by a native button. */
  selection: { index: number };
}

export const defaults: AsciiPacketRouteProps = {
  title: "ARCHIVE / RELAY 04",
  label: "Packet Route records",
  hops: [
  {
    "name": "Studio",
    "address": "192.0.2.12",
    "latency": 0,
    "note": "Source workstation. Packet enters the recorded route here."
  },
  {
    "name": "Edge router",
    "address": "192.0.2.1",
    "latency": 2.4,
    "note": "Local gateway. Small added delay is expected for this link."
  },
  {
    "name": "Exchange",
    "address": "198.51.100.8",
    "latency": 11.2,
    "note": "Transit handoff. This is the largest change in the supplied sample."
  },
  {
    "name": "Archive",
    "address": "203.0.113.24",
    "latency": 14.8,
    "note": "Destination accepts the relay. Total round trip is 14.8 ms."
  }
],
  selected: 0,
};

export const mount: Mount<AsciiPacketRouteProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let selected = props.selected;
  let records: Hop[] = [];
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
  const heading = make("h2"); const intro = make("p", "intro"); intro.textContent = "A recorded relay, read from source to destination. Select a hop to inspect its contribution.";
  const body = make("div", "body"); const diagram = make("div"); const art = make("pre"); art.setAttribute("aria-hidden", "true");
  const list = make("ol"); list.setAttribute("aria-label", "Packet Route register");
  const detail = make("section", "detail"); const eyebrow = make("div", "eyebrow"); eyebrow.textContent = "SELECTED RECORD";
  const detailTitle = make("h3"); const facts = make("p", "facts"); const note = make("p", "note");
  detail.setAttribute("aria-live", "polite"); detail.append(eyebrow, detailTitle, facts, note);
  diagram.append(art, list); body.append(diagram, detail); record.append(heading, intro, body); host.append(record);
  const emit = emitter<AsciiPacketRouteEvents>(host);
  function text(value: unknown, max = 40): string { return String(value ?? "").replace(/[\r\n\t]/g, " ").slice(0, max); }
  function number(value: unknown, min: number, max: number): number { const n = Number(value); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min; }
  function rebuild(): void {
    records = (Array.isArray(props.hops) ? props.hops : []).filter(r => r && typeof r === "object").slice(0, 8).map(r => ({ name: text(r.name), address: text(r.address), latency: number(r.latency, 0, 9999), note: text(r.note, 300) }));
    list.replaceChildren();
    records.forEach((r, i) => { const li = make("li"); const button = make("button"); button.type = "button"; button.dataset.choice = String(i);
      const name = make("span"); name.textContent = `${String(i + 1).padStart(2,"0")} / ${r.name}`;
      const metric = make("span", "metric"); metric.textContent = `${r.address} / ${r.latency} ms`; button.append(name, metric); li.append(button); list.append(li);
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
      const rows = ["RECORDED PATH / ROUND TRIP", "  |"];
    records.forEach((r, i) => { const indent = " ".repeat(i * 3); rows.push(`${indent}${i === selected ? "[@]" : "[o]"} ${String(i + 1).padStart(2, "0")} ${r.name.slice(0, 16)}`); if (i < records.length - 1) rows.push(indent + "  +-->"); });
    rows.push("", "@ selected hop / o recorded hop"); art.textContent = rows.join("\n");
      detailTitle.textContent = r.name;
      facts.textContent = `${r.address} · round trip ${r.latency} ms · added ${Math.max(0, r.latency - (records[selected - 1]?.latency ?? 0)).toFixed(1)} ms`; note.textContent = r.note;
    }
    attrs.set("data-pica-ready", "true");
  }
  const onClick = (event: Event): void => { const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-choice]"); if (!button || !list.contains(button)) return; selected = Number(button.dataset.choice); paint(); emit("selection", { index: selected }); };
  list.addEventListener("click", onClick);
  rebuild(); paint();
  return {
    update(next) { const before = props; props = { ...props, ...next }; if (next.selected !== undefined) selected = next.selected; if (!sameJson(before.hops, props.hops)) rebuild(); paint(); },
    destroy() { list.removeEventListener("click", onClick); record.remove(); styles.destroy(); attrs.restore(); },
  };
};
