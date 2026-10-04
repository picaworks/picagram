import { hostAttributes, nextId } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import { GRID_FONT } from "../../../lib/font";
import type { Mount } from "../../../lib/types";
export interface AsciiPressWireProps {
  /** The wire service name. */
  label: string;
  /** The lead dispatch headline. */
  title: string;
  /** The edition date and place. */
  edition: string;
  /** Timestamped dispatches in publication order. */
  reports: readonly { time: string; title: string; body: string }[];
}
export const defaults: AsciiPressWireProps = {
  "label": "Common Ground Wire",
  "title": "The night shift keeps the city moving",
  "edition": "Morning edition / 04 October 2026 / North Quay",
  "reports": [
    {
      "time": "06:20",
      "title": "The first crossings reopen",
      "body": "The east footbridge reopened after crews replaced four deck panels overnight. Pedestrians can use both approaches; the maintenance crew will return next week to inspect the remaining joints."
    },
    {
      "time": "05:45",
      "title": "A room stays open late",
      "body": "The quay reading room will trial evening hours on Tuesdays and Thursdays. The trial begins with two staffed desks and a quiet table for students returning from shift work."
    },
    {
      "time": "05:10",
      "title": "Repair bench publishes its register",
      "body": "The cooperative repair bench has issued its first monthly register. The summary lists 38 completed repairs, 7 items awaiting parts and the average time each item remained on the bench."
    }
  ]
};

function wireNode<T extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: T, text = "", cls = ""): HTMLElementTagNameMap[T] {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  el.className = cls;
  el.textContent = text;
  parent.append(el);
  return el;
}
function wireLink(parent: HTMLElement, text: string, target: string): HTMLAnchorElement {
  const a = wireNode(parent, "a", text);
  a.href = target;
  return a;
}
function wireArt(parent: HTMLElement, wide: string, compact: string, caption: string): void {
  const figure = wireNode(parent, "figure");
  wireNode(figure, "pre", wide, "art wide-art").setAttribute("aria-hidden", "true");
  wireNode(figure, "pre", compact, "art small-art").setAttribute("aria-hidden", "true");
  wireNode(figure, "figcaption", caption, "label muted");
}
function wireDisclosure(parent: HTMLElement, heading: string, body: string): void {
  const d = wireNode(parent, "details");
  wireNode(d, "summary", heading);
  wireNode(d, "p", body);
}
function wireRules(s: string): string {
  const fg = cssVar("fg"), bg = cssVar("bg"), muted = cssVar("muted"), accent = cssVar("accent");
  return `
${s}{box-sizing:border-box;max-width:1400px;margin:auto;padding:clamp(20px,4vw,52px);color:${fg};background:${bg};line-height:1.6;overflow-wrap:anywhere}
${s} *{box-sizing:border-box;min-width:0}
${s} h1,${s} h2,${s} h3,${s} p,${s} pre,${s} figure{margin:0}
${s} h1{font-size:clamp(2.5rem,5.4vw,5rem);font-weight:500;line-height:1.04;letter-spacing:-.045em;max-width:15ch}
${s} h2{font-weight:500;font-size:1.6rem;line-height:1.25;margin-bottom:1rem}
${s} h3{font-size:1.15rem;font-weight:600;line-height:1.35}
${s} p+p{margin-top:1rem}
${s} .label{font-family:${GRID_FONT};font-size:.72rem;letter-spacing:.05em;text-transform:uppercase}
${s} .muted{color:${muted}}
${s} .mast{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;border-bottom:1px solid ${fg};padding-bottom:1rem}
${s} .mark{display:inline-block;width:10px;height:10px;background:${accent};margin-right:10px}
${s} a{color:inherit;text-underline-offset:.3em}
${s} nav{display:flex;gap:1.4rem;flex-wrap:wrap}
${s} a:focus-visible,${s} summary:focus-visible,${s} button:focus-visible{outline:2px solid ${accent};outline-offset:4px}
${s} button{font:inherit;font-family:${GRID_FONT};font-size:.8rem;padding:.8rem 1rem;color:inherit;background:transparent;border:1px solid ${muted};cursor:pointer;text-align:left}
${s} button[aria-pressed=true]{border-color:${fg};border-left:5px solid ${accent};padding-left:calc(1rem - 4px)}
${s} .art{font-family:${GRID_FONT};font-size:clamp(11px,1.2vw,15px);line-height:1.35;white-space:pre;overflow-wrap:normal}
${s} .small-art{display:none}
${s} .intro{font-size:1.2rem;max-width:46ch;margin:1.5rem 0 2rem}
${s} .rule{border-top:1px solid ${muted};padding-top:1.5rem;margin-top:2rem}
${s} details{border-top:1px solid ${muted};padding:1rem 0}
${s} summary{cursor:pointer;font-family:${GRID_FONT};font-size:.8rem}
${s} details p{padding-top:1rem;max-width:62ch}
${s} .foot{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-top:3rem;border-top:1px solid ${fg};padding-top:1rem}
${s} .row{border-top:1px solid ${muted};padding:1.3rem 0;display:grid;grid-template-columns:4rem 1fr 7rem;gap:1.2rem}
${s} .row p{max-width:58ch;margin-top:.5rem}
${s} .columns{display:grid;grid-template-columns:1.4fr 1fr;gap:3rem;margin-top:2rem}
${s} .choices{display:flex;flex-wrap:wrap;gap:.7rem;margin:1.5rem 0}
${s} .facts{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin:2rem 0;padding:1rem 0;border-block:1px solid ${muted}}
${s} .facts strong{display:block;font-family:${GRID_FONT};font-size:1.4rem;font-weight:400}
${s} ul,${s} ol{padding-left:1.4rem;margin:1rem 0}
${s} li+li{margin-top:.7rem}
@media(max-width:600px){${s}{padding:20px}${s} h1{font-size:2.7rem}${s} .columns{grid-template-columns:1fr;gap:2rem}${s} .art{font-size:11px}${s} .wide-art{display:none}${s} .small-art{display:block}${s} .row{grid-template-columns:2rem 1fr;gap:.6rem}${s} .row>.label:last-child{grid-column:2}${s} nav{gap:.7rem}${s} .facts{gap:.7rem}${s} .intro{font-size:1.1rem}}
${s} .wireplate{display:flex;justify-content:space-between;gap:2rem;align-items:end;padding:2rem 0;border-bottom:3px double ${fg}}${s} .newspaper{display:grid;grid-template-columns:1.6fr 1fr;gap:4rem;margin-top:2rem}${s} .newspaper h1{margin-top:1rem}${s} .dispatches{border-left:1px solid ${muted};padding-left:2rem}${s} .dispatch{border-top:1px solid ${muted};padding:1rem 0}${s} .dispatch h3{margin:.5rem 0}${s} .dispatch p{font-size:.95rem}@media(max-width:800px){${s} .newspaper{gap:2rem}}@media(max-width:600px){${s} .wireplate{display:block}${s} .wireplate nav{margin-top:1rem}${s} .newspaper{grid-template-columns:1fr}${s} .dispatches{border-left:0;padding:0}}
`;
}
function wireRender(root: HTMLElement, p: AsciiPressWireProps, id: string): void {
  root.replaceChildren();
const mast=wireNode(root,"header","","mast label");const brand=wireNode(mast,"span");wireNode(brand,"span","","mark").setAttribute("aria-hidden","true");wireNode(brand,"span",p.label);wireNode(mast,"span",p.edition,"muted");const plate=wireNode(root,"div","","wireplate");wireArt(plate,"┌─ W I R E ───────────────────────────┐\n│ ::::::  EDITION 004  ::::::  READY   │\n└────────────────────────────────────┘","┌─ W I R E ────────────┐\n│ EDITION 004 / READY  │\n└──────────────────────┘","Local reporting / Issued once each morning");const nav=wireNode(plate,"nav","","label");wireLink(nav,"Latest reports",`#${id}-reports`);wireLink(nav,"Corrections",`#${id}-corrections`);const columns=wireNode(root,"div","","newspaper");const lead=wireNode(columns,"article");wireNode(lead,"p","Lead dispatch / Public works","label muted");const h=wireNode(lead,"h1",p.title);h.id=`${id}-title`;wireNode(lead,"p","Before the first tram reaches the quay, a different timetable is already in motion.","intro");wireNode(lead,"p","At 03:40 the maintenance crew starts with the smallest jobs: tighten a loose rail, clear a blocked drain, replace a damaged sign. None makes an announcement. Together they determine whether the morning journey feels ordinary.");wireNode(lead,"p","This edition follows the people who care for the city's shared routes and rooms. The work is measured in safe crossings, readable directions and doors that open when they are needed.");wireNode(lead,"p","Reporting note: this is an authored sample edition. The dispatches demonstrate a local wire format, rather than a live news feed.","rule muted");const reports=wireNode(columns,"section","","dispatches");reports.id=`${id}-reports`;wireNode(reports,"h2","Latest on the wire");p.reports.forEach(x=>{const report=wireNode(reports,"article","","dispatch");wireNode(report,"p",`${x.time} / Local desk`,"label muted");wireNode(report,"h3",x.title);wireNode(report,"p",x.body);});const corrections=wireNode(root,"section","","rule");corrections.id=`${id}-corrections`;wireNode(corrections,"h2","Corrections & method");wireDisclosure(corrections,"Edition 003: opening time amended","The evening reading room trial begins at 18:00, rather than 17:00 as the earlier edition stated. The program desk confirmed the staffed hours before this edition was issued.");wireDisclosure(corrections,"How an item reaches the wire","Each item identifies the place, the responsible desk and the time of confirmation. Unconfirmed observations remain in the reporting notebook and do not enter the edition.");const foot=wireNode(root,"footer","","foot label");wireNode(foot,"span","Common Ground / Edition closed at 06:30");wireLink(foot,"Back to top",`#${id}-title`);
}
export const mount: Mount<AsciiPressWireProps> = (host, initial = {}) => {
  let props: AsciiPressWireProps = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  const id = nextId("ascii-press-wire");
  attrs.set("role", "region");
  attrs.set("aria-label", props.label);
  const style = wireNode(host, "style");
  const root = wireNode(host, "article");
  root.id = id;
  style.textContent = wireRules(`[id="${id}"]`);

  const draw = (): void => wireRender(root, props, id);
  draw();
  attrs.set("data-pica-ready", "true");
  return {
    update(next) {
      const merged = { ...props, ...next };
      if (sameJson(merged, props)) return;
      props = merged;
      attrs.set("aria-label", props.label);
      draw();
    },
    destroy() {
      root.remove();
      style.remove();
      attrs.restore();
    },
  };
};
