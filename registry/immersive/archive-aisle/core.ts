import { createCanvas } from "../../../lib/canvas";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar, watchPalette } from "../../../lib/palette";
import { hashSeed } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

export interface ArchiveAisleRecord {
  /** Short label used by both the scene and the linear register. */
  name: string;
  /** Reference or location printed above the detail heading. */
  reference: string;
  /** The title of this record's full account. */
  title: string;
  /** Readable context for the selected record. */
  description: string;
  /** Supplied dimensions, access information or observation values. */
  facts: string;
  /** A practical visiting or reading note. */
  note: string;
  /** Horizontal scene position as a percentage, clamped to 8 through 92. */
  x: number;
  /** Vertical scene position as a percentage, clamped to 12 through 86. */
  y: number;
  /** Thematic group used in the reading register. */
  group: string;
  /** Chapter or observation cues displayed in the record. */
  chapters: readonly string[];
  /** Optional program notes for individually selectable chapter cues. */
  chapterNotes?: readonly string[];
}

export interface ArchiveAisleProps extends MotionProps {
  /** Heading of the complete entry experience. */
  title: string;
  /** Introduction displayed above the spatial scene. */
  introduction: string;
  /** Editable records, with spatial positions and full readable details; an empty array displays an empty register. */
  collections: readonly ArchiveAisleRecord[];
  /** Frames per second ceiling, between 1 and 30. */
  fps: number;
}

export const defaults: ArchiveAisleProps = {
  title: "Aisle seven",
  introduction: "Walk the shelves of a fictional civic archive. Four collections trace a town through plans, voices, letters and working records.",
  collections: [
  {
    "name": "Town plans",
    "reference": "A7 / COLLECTION 01",
    "title": "The unbuilt crossing",
    "description": "Nine folded drawings trace a proposed footbridge from 1961 to 1968. Pencil revisions move its landing away from the market. The final envelope carries no approval stamp.",
    "facts": "CA 61/09 · 9 drawings · 1961–1968",
    "note": "Access: open. Unfolding requires a support board; ask the reading room desk.",
    "x": 25,
    "y": 30,
    "group": "Plans",
    "chapters": [
      "Scope and content",
      "Arrangement",
      "Access"
    ]
  },
  {
    "name": "Oral histories",
    "reference": "A7 / COLLECTION 02",
    "title": "Voices from the night shift",
    "description": "Transcripts of 24 interviews document the mill after dark. Speakers describe the sound of each machine and the informal signals used across the floor.",
    "facts": "OH 84/24 · 24 transcripts · 1984",
    "note": "Access: edited transcripts are open. Personal addresses remain closed.",
    "x": 74,
    "y": 36,
    "group": "Voices",
    "chapters": [
      "Scope and content",
      "Names and places",
      "Access"
    ]
  },
  {
    "name": "Correspondence",
    "reference": "A7 / COLLECTION 03",
    "title": "Letters from the allotments",
    "description": "A bundle of 76 letters follows the creation of a shared garden. Seed requests sit alongside meeting minutes and a map drawn on the back of an envelope.",
    "facts": "CO 72/76 · 76 letters · 1972–1975",
    "note": "Access: open. Keep the original bundle order when requesting scans.",
    "x": 28,
    "y": 70,
    "group": "Letters",
    "chapters": [
      "Scope and content",
      "Original order",
      "Access"
    ]
  },
  {
    "name": "Workshop ledgers",
    "reference": "A7 / COLLECTION 04",
    "title": "A repair for every season",
    "description": "Four ledgers list work from a bicycle repair shop. Their ruled columns show how recurring maintenance connected neighbours through tools, parts and trust.",
    "facts": "WL 49/04 · 4 volumes · 1949–1963",
    "note": "Access: open. The fourth volume is available as a reading copy.",
    "x": 71,
    "y": 72,
    "group": "Work",
    "chapters": [
      "Scope and content",
      "Related records",
      "Access"
    ]
  }
],
  fps: 24,
  paused: false,
  time: null,
  seed: 1,
};

export const mount: Mount<ArchiveAisleProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  const sceneId = nextId("scene");
  attrs.set("data-pica-id", sceneId);
  const sheet = document.createElement("style");
  sheet.setAttribute("data-pica", "");
  host.append(sheet);
  const s = `[data-pica-id="${sceneId}"]`;
  sheet.textContent = `
    ${s}{color:${cssVar("fg")};background:${cssVar("bg")};box-sizing:border-box}
    ${s} *,${s} *::before{box-sizing:border-box}
    ${s} [data-part="page"]{padding:clamp(18px,3vw,40px);max-width:1440px;margin:auto}
    ${s} [data-part="edition"],${s} [data-part="caption"],${s} [data-part="reference"]{font:12px/1.5 ${GRID_FONT};letter-spacing:.06em;color:${cssVar("muted")}}
    ${s} h1{font-size:clamp(34px,5vw,68px);font-weight:500;line-height:1.06;letter-spacing:-.045em;margin:14px 0}
    ${s} [data-part="intro"]{max-width:760px;font-size:17px;line-height:1.6;margin:0 0 22px}
    ${s} [data-part="workspace"]{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(270px,1fr);gap:28px;border-top:1px solid ${cssVar("muted")};padding-top:18px}
    ${s} [data-part="scene"]{position:relative;min-width:0;height:365px;border-bottom:1px solid ${cssVar("muted")}}
    ${s} [data-action="select"]{font-family:${GRID_FONT}}
    ${s} [data-part="markers"]{position:absolute;inset:0}
    ${s} [data-part="markers"] button{position:absolute;transform:translate(-50%,-50%);width:44px;height:44px;padding:0;background:${cssVar("bg")};font-size:15px;border:1px solid ${cssVar("fg")};z-index:1}
    ${s} [data-part="markers"] button[aria-pressed="true"]{border:3px solid ${cssVar("accent")}}
    ${s} button{font:inherit;color:inherit;cursor:pointer;background:transparent;border:1px solid ${cssVar("muted")};border-radius:0;min-height:44px;padding:8px 12px}
    ${s} button:focus-visible{outline:2px solid ${cssVar("accent")};outline-offset:3px}
    ${s} button:disabled{opacity:.45;cursor:default}
    ${s} button[aria-pressed="true"]{border-bottom:3px solid ${cssVar("accent")}}
    ${s} [data-part="detail"]{min-width:0}
    ${s} h2{font-size:25px;font-weight:500;line-height:1.2;margin:10px 0 14px}
    ${s} [data-part="detail"] p{font-size:16px;line-height:1.6;margin:12px 0}
    ${s} [data-part="facts"]{border-top:1px solid ${cssVar("muted")};padding-top:12px;font:13px/1.6 ${GRID_FONT}}
    ${s} [data-part="chapters"]{margin:14px 0;padding-left:20px;font-size:14px;line-height:1.7}
    ${s} [data-part="controls"]{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}
    ${s} [data-part="register"]{display:flex;gap:0;flex-wrap:wrap;margin:12px 0 18px;padding:0;list-style:none}
    ${s} [data-part="register"] li{flex:1;min-width:155px}
    ${s} [data-part="register"] button{width:100%;text-align:left;border:0;border-top:1px solid ${cssVar("muted")};font-size:14px;padding:12px 8px}
    ${s} [data-part="foot"]{font:12px/1.6 ${GRID_FONT};color:${cssVar("muted")};border-top:1px solid ${cssVar("muted")};padding-top:12px}
    @media(max-width:620px){${s} [data-part="workspace"]{grid-template-columns:1fr;gap:16px}${s} [data-part="scene"]{height:235px}${s} [data-part="intro"]{font-size:15px;line-height:1.5;margin-bottom:16px}${s} h1{margin:10px 0}${s} [data-part="detail"] p{font-size:15px;line-height:1.5}${s} [data-part="register"] li{min-width:45%}${s} h2{font-size:23px}${s} [data-part="page"]{padding:18px}${s} [data-part="controls"]{margin:12px 0}}
  `;
  const node = <K extends keyof HTMLElementTagNameMap>(tag: K, part: string, text = ""): HTMLElementTagNameMap[K] => {
    const el = document.createElement(tag);
    el.setAttribute("data-pica", "");
    el.dataset.part = part;
    el.textContent = text;
    return el;
  };
  const button = (action: string, text: string): HTMLButtonElement => {
    const el = node("button", action, text);
    el.type = "button";
    el.dataset.action = action;
    return el;
  };
  const page = node("div", "page");
  const edition = node("p", "edition", "PUBLIC ARCHIVE / FINDING AID");
  const heading = node("h1", "heading");
  const intro = node("p", "intro");
  const workspace = node("div", "workspace");
  const sceneWrap = node("div", "scene-wrap");
  const scene = node("div", "scene");
  const markers = node("div", "markers");
  markers.setAttribute("role", "group");
  markers.setAttribute("aria-label", "Spatial collection selection");
  const caption = node("p", "caption", "Scene / Select a number. The register below follows the same route.");
  const detail = node("section", "detail");
  const reference = node("p", "reference");
  const detailTitle = node("h2", "detail-title");
  detailTitle.tabIndex = -1;
  const account = node("p", "account");
  const facts = node("p", "facts");
  const note = node("p", "note");
  const chapters = node("ol", "chapters");
  const chapterNote = node("p", "chapter-note");
  const controls = node("div", "controls");
  const enter = button("enter", "Enter the archive");
  const back = button("back", "Back to overview");
  const prev = button("previous", "Previous collection");
  const next = button("next", "Next collection");
  const pause = button("pause", "Pause scene");
  const registerTitle = node("p", "reference", "LINEAR collection REGISTER");
  const filters = node("div", "controls");
  const register = node("ol", "register");
  const foot = node("p", "foot", "READING ROOM / Request the reference code when arranging a visit.");
  sceneWrap.append(scene, caption);
  controls.append(enter, back, prev, next, pause);
  detail.append(reference, detailTitle, account, facts, note, chapters, chapterNote, controls);
  workspace.append(sceneWrap, detail);
  page.append(edition, heading, intro, workspace, registerTitle, filters, register, foot);
  host.append(page);
  const runtime: { loop?: Loop } = {};
  const pathFiltering = false;
  const chapterSelection = false;
  const surface = createCanvas(scene, { maxDpr: 1.5, maxPixels: 1500000, onResize: () => runtime.loop?.redraw() });
  scene.append(markers);
  const ink = surface.canvas.getContext("2d");
  const palette = watchPalette(host, () => runtime.loop?.redraw());
  let entries: readonly ArchiveAisleRecord[] = [];
  let selected = -1;
  let selectedChapter = 0;
  let entered = false;
  let path = "All";
  let userPaused = props.paused;
  let lastIndex = 0;
  let destroyed = false;
  const point = (entry: ArchiveAisleRecord): readonly [number, number] => [
    Math.min(92, Math.max(8, Number.isFinite(entry.x) ? entry.x : 50)),
    Math.min(86, Math.max(12, Number.isFinite(entry.y) ? entry.y : 50)),
  ];
  function paint(t: number, reduced: boolean): void {
    if (!ink) return;
    const w = surface.width, h = surface.height;
    const colors = palette.colors;
    ink.clearRect(0, 0, w, h);
    ink.lineWidth = Math.max(1, surface.dpr);
    ink.lineJoin = "miter";
    ink.strokeStyle = colors.muted;
    const line = (points: readonly (readonly number[])[], width = 1): void => {
      ink.lineWidth = width * surface.dpr;
      ink.beginPath();
      points.forEach((p, i) => i ? ink.lineTo((p[0] ?? 0)*w,(p[1] ?? 0)*h) : ink.moveTo((p[0] ?? 0)*w,(p[1] ?? 0)*h));
      ink.stroke();
    };
    const rect = (x:number,y:number,a:number,b:number): void => { ink.strokeRect(x*w,y*h,a*w,b*h); };
    const phase = reduced ? .5 : (Math.sin(t / 2200 + hashSeed(props.seed, 7) / 4294967296) + 1) / 2;

    // A single vanishing point joins two shelving banks, with a clear walking aisle.
    line([[.04,.06],[.42,.28],[.42,.75],[.04,.95],[.04,.06]],2);
    line([[.96,.06],[.58,.28],[.58,.75],[.96,.95],[.96,.06]],2);
    line([[.42,.28],[.58,.28],[.58,.75],[.42,.75],[.42,.28]]);
    for(let j=1;j<5;j++){const y=.06+j*.18;const v=.28+j*.095;line([[.04,y],[.42,v]]);line([[.96,y],[.58,v]]);}
    for(let side=0;side<2;side++)for(let col=0;col<7;col++){const x=side?.62+col*.045:.08+col*.045;const depth=side?1-col/9:.25+col/9;for(let row=0;row<3;row++){const y=.19+row*.19;rect(x,y,.025,.095*depth);}}
    line([[.04,.95],[.42,.75]]);line([[.96,.95],[.58,.75]]);line([[.3,1],[.46,.76]]);line([[.7,1],[.54,.76]]);
    ink.strokeStyle=colors.accent;line([[.47,.81+phase*.08],[.53,.81+phase*.08]],2);
    ink.strokeStyle=colors.muted;rect(.46,.36,.08,.15);

    // Selection marks are geometric and never change the record typography.
    entries.forEach((entry,i) => {
      if(pathFiltering && path !== "All" && entry.group !== path) return;
      const [x,y] = point(entry);
      const px=x*w/100, py=y*h/100, radius=22*surface.dpr;
      ink.clearRect(px-radius,py-radius,2*radius,2*radius);
      ink.strokeStyle = i===selected ? colors.accent : colors.fg;
      ink.lineWidth = surface.dpr;
      ink.strokeRect(px-27*surface.dpr,py-27*surface.dpr,54*surface.dpr,54*surface.dpr);
    });
  }
  function render(): void {
    heading.textContent = props.title || "Untitled experience";
    intro.textContent = props.introduction;
    attrs.set("role", "region");
    attrs.set("aria-label", heading.textContent);
    attrs.set("aria-hidden", null);
    page.dataset.view = selected >= 0 ? "detail" : entered ? "overview" : "entrance";
    markers.replaceChildren(); register.replaceChildren(); filters.replaceChildren(); chapters.replaceChildren();
    entries = props.collections.slice(0,12);
    if (selected >= entries.length) selected = -1;
    entries.forEach((entry,i) => {
      if (pathFiltering && path !== "All" && entry.group !== path) return;
      const mark = button("select", String(i+1).padStart(2,"0"));
      mark.dataset.index = String(i);
      mark.setAttribute("aria-label", `collection ${i+1}: ${entry.name}`);
      mark.setAttribute("aria-pressed", String(i===selected));
      const [x,y] = point(entry);mark.style.left=`${x}%`;mark.style.top=`${y}%`;
      markers.append(mark);
      const row = node("li", "row");
      const link = button("select", `${String(i+1).padStart(2,"0")} / ${entry.name}`);
      link.dataset.index=String(i);link.setAttribute("aria-pressed", String(i===selected));
      row.append(link); register.append(row);
    });
    if (pathFiltering) for (const group of ["All", ...new Set(entries.map(e=>e.group))]) {
      const filter=button("path",`${group} path`);filter.dataset.path=group;filter.setAttribute("aria-pressed",String(group===path));filters.append(filter);
    }
    const current = entries[selected];
    reference.textContent = current?.reference ?? (entered ? "Overview / Choose a collection" : "ENTRY / OPEN THE ROUTE");
    detailTitle.textContent = current?.title ?? (entries.length ? "A shelf is a beginning" : "The register is empty");
    account.textContent = current?.description ?? (entries.length ? "Select a shelf number to open its record drawer. The collection register offers the same route without the perspective scene." : "Add records to the collections prop to build a route. The scene remains an architectural guide.");
    facts.textContent = current?.facts ?? `${entries.length} collection${entries.length===1?"":"s"} / Native buttons support keyboard and touch.`;
    note.textContent = current?.note ?? "Escape returns to the overview, then to the entrance.";
    note.hidden = !current;
    for(const [index,cue] of (current?.chapters ?? []).entries()) {
      const row=node("li","chapter");
      if(chapterSelection){const cueButton=button("chapter",cue);cueButton.dataset.chapter=String(index);cueButton.setAttribute("aria-pressed",String(index===selectedChapter));row.append(cueButton);}
      else row.textContent=cue;
      chapters.append(row);
    }
    chapterNote.hidden=!chapterSelection || !current;
    chapterNote.textContent=current?.chapterNotes?.[selectedChapter] ?? "";
    chapters.hidden = !current;
    enter.hidden=entered;enter.disabled=!entries.length;
    back.hidden=!entered;
    prev.hidden=!current;next.hidden=!current;
    const route=entries.map((entry,index)=>({entry,index})).filter(({entry})=>!pathFiltering || path==="All" || entry.group===path).map(({index})=>index);
    prev.disabled=route.indexOf(selected)<=0;next.disabled=route.indexOf(selected)>=route.length-1;
    pause.textContent=userPaused ? "Resume scene" : "Pause scene";
    pause.setAttribute("aria-pressed",String(userPaused));
    runtime.loop?.redraw();
  }
  function choose(i: number): void {
    if(!entries[i]) return;
    selected=i;selectedChapter=0;entered=true;lastIndex=i;
    render();detailTitle.focus({preventScroll:true});
  }
  function overview(): void {
    selected=-1;render();
    const target = markers.querySelector<HTMLButtonElement>(`[data-index="${lastIndex}"]`);
    (target ?? back).focus({preventScroll:true});
  }
  const onClick = (event: Event): void => {
    const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button[data-action]") : null;
    if(!target || !page.contains(target)) return;
    const action=target.dataset.action;
    if(action==="select") choose(Number(target.dataset.index));
    else if(action==="enter"){entered=true;render();markers.querySelector<HTMLButtonElement>("button")?.focus({preventScroll:true});}
    else if(action==="back") overview();
    else if(action==="previous" || action==="next"){const route=entries.map((entry,index)=>({entry,index})).filter(({entry})=>!pathFiltering || path==="All" || entry.group===path).map(({index})=>index);choose(route[route.indexOf(selected)+(action==="next"?1:-1)] ?? -1);}
    else if(action==="chapter"){selectedChapter=Number(target.dataset.chapter);render();Array.from(chapters.querySelectorAll<HTMLButtonElement>("button")).find(b=>Number(b.dataset.chapter)===selectedChapter)?.focus({preventScroll:true});}
    else if(action==="path"){path=target.dataset.path ?? "All";selected=-1;entered=true;render();Array.from(filters.querySelectorAll<HTMLButtonElement>("button")).find(b=>b.dataset.path===path)?.focus({preventScroll:true});}
    else if(action==="pause"){userPaused=!userPaused;runtime.loop?.update({paused:userPaused});render();}
  };
  const onKey = (event: KeyboardEvent): void => {
    if(event.key!=="Escape") return;
    if(selected>=0){event.preventDefault();overview();}
    else if(entered){event.preventDefault();entered=false;path="All";render();enter.focus({preventScroll:true});}
  };
  page.addEventListener("click",onClick);page.addEventListener("keydown",onKey);
  render();
  runtime.loop=createLoop({el:scene,paused:userPaused,time:props.time,fps:Math.max(1,Math.min(30,props.fps)),still:1200,frame:paint});
  attrs.set("data-pica-ready","true");
  return {
    update(partial){
      const old=props;props={...props,...partial};
      if(partial.paused!==undefined) userPaused=props.paused;
      if(!sameJson(old.collections,props.collections)){selected=-1;path="All";}
      palette.refresh();render();runtime.loop?.update({paused:userPaused,time:props.time,fps:Math.max(1,Math.min(30,props.fps))});runtime.loop?.redraw();
    },
    destroy(){
      if(destroyed)return;destroyed=true;
      runtime.loop?.destroy();palette.destroy();surface.destroy();
      page.removeEventListener("click",onClick);page.removeEventListener("keydown",onKey);
      page.remove();sheet.remove();attrs.restore();
    },
  };
};
