import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface SoundProject {
  /** Project title. */
  title: string;
  /** Project medium and year. */
  medium: string;
  /** Project duration in minutes and seconds. */
  duration: string;
  /** Project description. */
  description: string;
  /** Listening annotation. */
  note: string;
}
export interface SoundPracticeProps {
  /** Accessible name for the portfolio. */
  label: string;
  /** Artist name. */
  artist: string;
  /** Portfolio introduction. */
  intro: string;
  /** Project score records. */
  projects: readonly SoundProject[];
  /** Studio approach. */
  approach: string;
  /** Studio capabilities. */
  services: readonly string[];
  /** Contact information. */
  contact: string;
}

export const defaults: SoundPracticeProps = {
  "label": "Sound design portfolio",
  "artist": "Noah Sato",
  "intro": "Sound for spaces, stories, and the moments in between. An independent practice in composition, field recording, and careful listening.",
  "projects": [
    {
      "title": "Room Tone",
      "medium": "Spatial installation / 2026",
      "duration": "08:24",
      "description": "A four-channel composition built from the everyday acoustics of an empty house. Footsteps, pipes, and window resonance become an evolving portrait of a place.",
      "note": "Begin with the room itself. A low pulse enters at 00:40. At 03:10 the close microphone gives way to the distant courtyard. The final minute leaves only air."
    },
    {
      "title": "Tidal Memory",
      "medium": "Short film / 2025",
      "duration": "12:08",
      "description": "Original score and location sound for a film about a coastline in transition. Bowed textures follow the shoreline; recurring fragments mark the return of the tide.",
      "note": "Listen for the dry percussion against the slow strings. The recurring three-note motif is deliberately incomplete until the last shot."
    },
    {
      "title": "Between Stations",
      "medium": "Radio piece / 2025",
      "duration": "06:36",
      "description": "An audio essay assembled from railway announcements, night trains, and conversations recorded at the edges of travel.",
      "note": "The voice stays close and unprocessed. Environmental recordings shift the listener’s sense of distance without overwhelming the words."
    }
  ],
  "approach": "I begin by listening to the material already present: a room, a voice, a rhythm, a story. The work develops through recordings, sketches, and conversations. Silence is part of the arrangement, not a gap to fill.",
  "services": [
    "Original composition",
    "Sound design and editorial",
    "Field and location recording",
    "Spatial audio and installations"
  ],
  "contact": "For a film, installation, or listening project, write to sound@noahsato.example. Include a short brief, the expected format, and your production schedule."
};

function soundPracticeEl<K extends keyof HTMLElementTagNameMap>(tag: K, text = "", mark = ""): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  if (mark) el.setAttribute(`data-pica-${mark}`, "");
  if (text) el.textContent = text;
  return el;
}
function soundPracticeLink(text: string, target: string): HTMLAnchorElement {
  const el = soundPracticeEl("a", text);
  el.href = `#${target}`;
  return el;
}
function soundPracticeLabel(text: string): HTMLElement { return soundPracticeEl("p", text, "label"); }
function soundPracticeSection(id: string): HTMLElement {
  const el = soundPracticeEl("section", "", "section");
  el.id = id;
  return el;
}
function soundPracticeSvg(viewBox: string, paths: readonly string[]): SVGSVGElement {
  const el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  el.setAttribute("data-pica", "");
  el.setAttribute("viewBox", viewBox);
  el.setAttribute("aria-hidden", "true");
  for (const d of paths) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("data-pica", "");
    path.setAttribute("d", d);
    el.append(path);
  }
  return el;
}


function soundPracticeRules(s: string): string {
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

${s} [data-pica-page] [data-pica-sound-lead]{display:grid;grid-template-columns:1.2fr 1fr;gap:28px 80px;padding:48px 0}
${s} [data-pica-page] [data-pica-sound-lead] h1{font-size:clamp(55px,8.8vw,120px);letter-spacing:-.065em}
${s} [data-pica-page] [data-pica-sound-lead] [data-pica-body]{font-size:21px;line-height:1.4;align-self:end;max-width:33ch}
${s} [data-pica-page] [data-pica-sound-notation]{grid-column:span 2;display:flex;justify-content:space-between;border-top:1px solid ${muted};padding-top:18px}
${s} [data-pica-page] [data-pica-sound-scores]>:first-child{padding-bottom:18px}
${s} [data-pica-page] [data-pica-sound-project]{display:grid;grid-template-columns:260px 1fr;gap:52px;padding:32px 0;border-top:1px solid ${fg}}
${s} [data-pica-page] [data-pica-sound-metadata] h2{font-size:clamp(31px,3.4vw,48px);letter-spacing:-.04em;margin:16px 0 24px}
${s} [data-pica-page] [data-pica-sound-content] svg{height:130px;stroke-width:1.3}
${s} [data-pica-page] [data-pica-sound-content] svg path:first-child{stroke:${muted};stroke-width:.5}
${s} [data-pica-page] [data-pica-sound-times]{display:flex;justify-content:space-between;gap:12px;padding:6px 0 24px}
${s} [data-pica-page] [data-pica-sound-content] details{margin-top:22px}
${s} [data-pica-page] [data-pica-sound-approach]{display:grid;grid-template-columns:1fr 1fr;gap:80px;border-top:1px solid ${fg};padding-top:40px}
${s} [data-pica-page] [data-pica-sound-approach] h2{font-size:clamp(38px,5vw,68px);letter-spacing:-.05em;white-space:pre-line;margin-top:22px}
${s} [data-pica-page] [data-pica-sound-approach] ul{list-style:none;margin:28px 0 0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px}
${s} [data-pica-page] [data-pica-sound-approach] li{border-top:1px solid ${muted};padding-top:10px}
@media(max-width:800px){${s} [data-pica-page] [data-pica-sound-project]{grid-template-columns:190px 1fr;gap:24px}${s} [data-pica-page] [data-pica-sound-lead],${s} [data-pica-page] [data-pica-sound-approach]{gap:30px}}
@media(max-width:600px){${s} [data-pica-page] [data-pica-sound-lead],${s} [data-pica-page] [data-pica-sound-project],${s} [data-pica-page] [data-pica-sound-approach]{grid-template-columns:1fr}${s} [data-pica-page] [data-pica-sound-notation]{grid-column:auto;flex-direction:column;gap:8px}${s} [data-pica-page] [data-pica-sound-content] svg{height:95px}${s} [data-pica-page] [data-pica-sound-times]>:nth-child(2){font-size:9px;max-width:16ch;text-align:center}${s} [data-pica-page] [data-pica-sound-metadata] h2{margin-bottom:12px}}
`;
}

function soundPracticeRender(root: HTMLElement, p: SoundPracticeProps, ids: Record<string, string>): void {
  root.replaceChildren();

  const header = soundPracticeEl("header", "", "header"); header.append(soundPracticeLabel("NS / Sound practice")); const nav = soundPracticeEl("nav", "", "nav"); nav.setAttribute("aria-label", "Sound practice navigation"); nav.append(soundPracticeLink("Selected scores", ids.scores!), soundPracticeLink("Approach", ids.approach!), soundPracticeLink("Contact", ids.contact!)); header.append(nav); root.append(header);
  const lead = soundPracticeEl("div", "", "sound-lead"); lead.append(soundPracticeEl("h1", p.artist, "accent"), soundPracticeEl("p", p.intro, "body")); const notation = soundPracticeEl("div", "", "sound-notation"); notation.append(soundPracticeLabel("Composition · Recording · Listening"), soundPracticeLabel("Index 01—03 / 2025—2026")); lead.append(notation); root.append(lead);
  const scores = soundPracticeSection(ids.scores!); scores.setAttribute("data-pica-sound-scores", ""); scores.append(soundPracticeLabel("Selected work / Visual scores"));
  p.projects.forEach((project, i) => {
    const article = soundPracticeEl("article", "", "sound-project"); const metadata = soundPracticeEl("div", "", "sound-metadata"); metadata.append(soundPracticeLabel(`0${i + 1} / ${project.medium}`), soundPracticeEl("h2", project.title), soundPracticeLabel(`Duration ${project.duration}`)); article.append(metadata);
    const content = soundPracticeEl("div", "", "sound-content"); const figure = soundPracticeEl("figure");
    const wave: string[] = ["M0 80H800 M0 30H800 M0 130H800"];
    for (let x = 4; x < 798; x += 6) { const envelope = Math.pow(Math.sin((x / 800) * Math.PI), 0.7); const a = (6 + 54 * Math.abs(Math.sin(x * 0.073 + i * 1.7) * Math.cos(x * 0.019 + i))) * envelope; wave.push(`M${x} ${80 - a}V${80 + a}`); }
    figure.append(soundPracticeSvg("0 0 800 160", wave)); const times = soundPracticeEl("figcaption", "", "sound-times"); times.append(soundPracticeLabel("00:00"), soundPracticeLabel("Visual score / Dynamics"), soundPracticeLabel(project.duration)); figure.append(times); content.append(figure, soundPracticeEl("p", project.description, "body"));
    const notes = soundPracticeEl("details"); notes.append(soundPracticeEl("summary", "Read listening notes"), soundPracticeEl("p", project.note)); content.append(notes); article.append(content); scores.append(article);
  }); root.append(scores);
  const approach = soundPracticeSection(ids.approach!); approach.setAttribute("data-pica-sound-approach", ""); const title = soundPracticeEl("div"); title.append(soundPracticeLabel("Practice notes"), soundPracticeEl("h2", "Make space\nfor listening.")); const copy = soundPracticeEl("div"); copy.append(soundPracticeEl("p", p.approach, "body")); const list = soundPracticeEl("ul"); p.services.forEach(service => list.append(soundPracticeEl("li", service))); copy.append(list); approach.append(title, copy); root.append(approach);
  const footer = soundPracticeEl("footer", "", "footer"); footer.id = ids.contact!; footer.append(soundPracticeEl("h2", "What does your project sound like?"), soundPracticeEl("p", p.contact)); root.append(footer);

}

export const mount: Mount<SoundPracticeProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  attrs.set("data-pica-id", host.getAttribute("data-pica-id"));
  attrs.set("role", "region");
  attrs.set("aria-label", props.label);
  const sheet = scope(host);
  const root = soundPracticeEl("div", "", "page");
  host.append(root);
  const ids: Record<string, string> = { scores: nextId("sound-practice-scores"), approach: nextId("sound-practice-approach"), contact: nextId("sound-practice-contact") };
  sheet.setRules(soundPracticeRules(sheet.selector));
  soundPracticeRender(root, props, ids);
  attrs.set("data-pica-ready", "true");
  let destroyed = false;
  return {
    update(next) {
      if (destroyed) return;
      const before = props;
      props = { ...props, ...next };
      if (sameJson(before, props)) return;
      attrs.set("aria-label", props.label);
      soundPracticeRender(root, props, ids);
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
