import type { Mount } from "../../../lib/types";
import { hostAttributes, nextId } from "../../../lib/host";
import { GRID_FONT } from "../../../lib/font";
import { cssVar } from "../../../lib/palette";
import { sameJson } from "../../../lib/json";
export interface AsciiIsometricRoomProps {
  /** The room title. */
  title: string;
  /** The purpose and arrangement of the room. */
  roomNote: string;
  /** Room inventory and the facts shown on selection. */
  objects: { code: string; name: string; position: string; description: string; quantity: number }[];
}
export const defaults: AsciiIsometricRoomProps = {
  "title": "Survey room / 04",
  "roomNote": "A compact working room for preparing field records. The west wall holds the archive; a clear centre aisle links the desk and equipment bench.",
  "objects": [
    {
      "code": "A",
      "name": "Map cabinet",
      "position": "West wall",
      "description": "Flat storage for survey sheets. Keep maps unrolled and label the outer edge before shelving.",
      "quantity": 1
    },
    {
      "code": "B",
      "name": "Drafting desk",
      "position": "Centre, beside the north window",
      "description": "An adjustable work surface for comparing field sketches with the reference map.",
      "quantity": 1
    },
    {
      "code": "C",
      "name": "Equipment bench",
      "position": "East wall",
      "description": "A dry preparation bench for sample jars, compasses and measuring equipment.",
      "quantity": 1
    }
  ]
};

export const mount: Mount<AsciiIsometricRoomProps> = (host, initial = {}) => {
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
${s} [data-root]{max-width:1080px}
${s} [data-root]>h2{font-size:32px;margin:16px 0}
${s} [data-room]{display:grid;grid-template-columns:1.2fr 1fr;gap:48px;margin-top:32px;align-items:start}
${s} [data-scene]{border-top:4px solid ${cssVar("accent")};padding-top:32px}
${s} [data-objects]{display:flex;flex-direction:column;gap:8px;margin:16px 0 28px}
${s} [data-objects] button{text-align:left}
${s} [data-object]{border-top:1px solid ${cssVar("muted")};padding-top:24px}
${s} [data-object] dl{display:grid;grid-template-columns:100px 1fr;gap:0 16px}
@media(max-width:760px){${s} [data-room]{grid-template-columns:1fr;gap:32px}}
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
    attrs.set("role", "region"); attrs.set("aria-label", props.title.trim() || "Isometric room"); attrs.set("aria-hidden", null);
    marked("p", "kicker", "ROOM INVENTORY / FIXED-CELL ELEVATION"); el("h2", props.title.trim() || "Isometric room"); el("p", props.roomNote);
    const room = marked("div", "room"); const scene = marked("div", "scene", "", room);
    drawing(scene, "                  __________________\n                 /                 /│\n                /    NORTH WINDOW / │\n               /_________________/  │\n               │                 │  │\n               │ A ┌──────┐      │  │\n               │   │ MAPS │      │  │\n               │   └──────┘      │  │\n               │       ______    │  │\n               │ B    / DESK /│  │ C│\n               │     /______/ │  │ /\n               │     │      │ /  │/\n               │_____|______|/___/\n                ╲              ╱\n                 ╲   ENTRY    ╱\n                  ╲__________╱", "┌──── NORTH WINDOW ────┐\n│ A                    │\n│ CABINET              │\n│        ┌────┐   C    │\n│        │ B  │ BENCH  │\n│        │DESK│        │\n│        └────┘        │\n└──────── ENTRY ───────┘", "Room schematic. A sits on the west wall, B at the centre and C on the east wall. The south entrance opens onto a clear aisle.");
    const inventory = marked("section", "inventory", "", room); el("h3", "Object register", inventory); const controls = marked("div", "objects", "", inventory); const info = marked("section", "object", "", inventory); info.setAttribute("aria-live", "polite"); const buttons: HTMLButtonElement[] = [];
    const choose = (i: number): void => { buttons.forEach((b,j) => b.setAttribute("aria-pressed", String(i===j))); info.replaceChildren(); const obj = props.objects[i]; if (!obj) { el("p", "No objects registered. Add an inventory record to begin.", info); return; } info.setAttribute("data-code", obj.code); marked("p", "kicker", `OBJECT ${obj.code}`, info); el("h3", obj.name, info); const facts = el("dl", "", info); el("dt", "Location", facts); el("dd", obj.position, facts); el("dt", "Quantity", facts); el("dd", String(obj.quantity), facts); el("p", obj.description, info); };
    props.objects.forEach((obj,i) => { const button = el("button", `${obj.code} / ${obj.name}`, controls); button.type="button"; buttons.push(button); button.addEventListener("click", () => choose(i)); }); choose(0);
    attrs.set("data-pica-ready", "true");
  }
  render();
  return {
    update(partial) { const next = { ...props, ...partial }; if (!sameJson(props, next)) { props = next; render(); } },
    destroy() { root.remove(); sheet.remove(); attrs.restore(); },
  };
};
