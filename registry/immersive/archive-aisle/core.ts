import { createCanvas } from "../../../lib/canvas";
import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssOn, cssVar, watchPalette } from "../../../lib/palette";
import { createRng, hashSeed } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

/** One collection, shelved in a bay of its own. */
export interface ArchiveAisleCollection {
  /** Short name, read with the bay's number and listed in the register. */
  name: string;
  /** Reference code set in mono above the detail heading. */
  reference: string;
  /** Heading of the collection's detail. */
  title: string;
  /** A sentence or two describing the collection. */
  description: string;
  /** Extent and dates, set in mono. Empty leaves the line out. */
  facts: string;
  /** A practical note for a visit. Empty leaves it out. */
  note: string;
  /** Series or chapters, listed in the detail. */
  chapters: readonly string[];
}

export interface ArchiveAisleProps extends MotionProps {
  /** Accessible name of the aisle region. Empty leaves the host without a role. */
  label: string;
  /** Collections in bay order, up to 12. Collection i is shelved on the left wall for even i and on the right for odd i, floor(i / 2) bays in. */
  collections: readonly ArchiveAisleCollection[];
  /** The open collection's index, -1 for the overview, or null to let the component manage its own view. */
  value: number | null;
  /** The view at mount while value is null: a collection's index, or -1 for the overview. */
  defaultValue: number;
  /** Level of the detail heading, from 2 to 6. */
  headingLevel: number;
  /** Frames per second ceiling while the camera moves, from 1 to 30. */
  fps: number;
}

export interface ArchiveAisleEvents {
  /** A visitor opened a collection, giving its index, or went back to the overview, giving -1. */
  valueChange: number;
}

export const defaults: ArchiveAisleProps = {
  label: "Aisle seven",
  collections: [
    {
      name: "Town plans",
      reference: "CA 61/09",
      title: "The unbuilt crossing",
      description: "Nine folded drawings trace a footbridge proposed in 1961. Pencil revisions move its landing away from the market, and the final envelope carries no approval stamp.",
      facts: "9 drawings · 1961–1968",
      note: "Open. Unfolding needs a support board from the desk.",
      chapters: ["Scope and content", "Arrangement", "Access"],
    },
    {
      name: "Oral histories",
      reference: "OH 84/24",
      title: "Voices from the night shift",
      description: "Transcripts of 24 interviews document the mill after dark, from the sound of each machine to the signals passed across the floor.",
      facts: "24 transcripts · 1984",
      note: "Edited transcripts are open. Personal addresses remain closed.",
      chapters: ["Scope and content", "Names and places", "Access"],
    },
    {
      name: "Correspondence",
      reference: "CO 72/76",
      title: "Letters from the allotments",
      description: "A bundle of 76 letters follows the making of a shared garden, with seed requests, minutes and a map drawn on an envelope.",
      facts: "76 letters · 1972–1975",
      note: "Open. Keep the bundle in its original order when asking for scans.",
      chapters: ["Scope and content", "Original order", "Access"],
    },
    {
      name: "Workshop ledgers",
      reference: "WL 49/04",
      title: "A repair for every season",
      description: "Four ledgers from a bicycle repair shop show how regular maintenance tied a street together through tools, parts and trust.",
      facts: "4 volumes · 1949–1963",
      note: "Open. The fourth volume is served as a copy.",
      chapters: ["Scope and content", "Related records", "Access"],
    },
  ],
  value: null,
  defaultValue: -1,
  headingLevel: 3,
  fps: 30,
  paused: false,
  time: null,
  seed: 1,
};

/** A camera position in metres: across the aisle, height, and depth along it. It always looks straight down the
 *  aisle, so the vanishing point stays at the centre of the scene. */
type AisleCamera = readonly [number, number, number];
/** One book spine on a shelf front: x, near and far depth, bottom, top, and one of three tones. */
type AisleBook = readonly [number, number, number, number, number, number];

/** Milliseconds the camera takes to walk in from the aisle mouth at mount, and to move between bays after. */
const AISLE_ENTRANCE = 4000;
const AISLE_MOVE = 800;
/** Half the aisle's width, the eye's height and the top of the shelving, in metres. A bay is a metre long. */
const AISLE_HALF = 0.95;
const AISLE_EYE = 1.2;
const AISLE_TOP = 2.3;
/** The underside of a bay's four boards, and the thickness of a board or an upright. */
const AISLE_BOARDS = [0.06, 0.78, 1.5, 2.22];
const AISLE_PLANK = 0.04;
/** Focal length as a share of the scene's width, used on both axes. */
const AISLE_FOCAL = 0.6;
const AISLE_OVERVIEW: AisleCamera = [0, AISLE_EYE, -1.2];
const AISLE_MOUTH: AisleCamera = [0, AISLE_EYE + 0.3, -4.2];

/** Seeded book spines for every bay, on the plane of the shelf fronts. Each stands on its board and stops short
 *  of the board above, so no spine can cross a board once the plane is projected. */
function aisleBooks(seed: number, bays: number): AisleBook[] {
  const out: AisleBook[] = [];
  for (let bay = 0; bay < bays * 2; bay++) {
    const x = bay % 2 ? AISLE_HALF : -AISLE_HALF;
    const j = bay >> 1;
    for (let row = 0; row < 3; row++) {
      const rand = createRng(hashSeed(seed, bay, row));
      const base = (AISLE_BOARDS[row] ?? 0) + AISLE_PLANK;
      const room = (AISLE_BOARDS[row + 1] ?? 0) - base;
      for (let z = j + 0.04; ; ) {
        const thick = 0.02 + rand() * 0.045;
        if (z + thick > j + 0.96) break;
        if (rand() > 0.07) out.push([x, z, z + thick, base, base + room * (0.55 + rand() * 0.38), Math.floor(rand() * 3)]);
        z += thick + 0.005;
      }
    }
  }
  return out;
}

/** The scoped rules. Prose keeps the page's type and mono marks the numbers, references and facts. The layout
 *  follows the component's own width, and only the focus ring borrows the accent, which the scene keeps for the
 *  open bay. */
function aisleRules(s: string): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const tint = (n: number): string => `color-mix(in srgb,${fg} ${n}%,transparent)`;
  const line = `1px solid ${tint(22)}`;
  const ring = `outline:2px solid ${cssVar("accent")};outline-offset:2px`;
  return [
    `:where(${s}){display:block;color:${fg};background:${cssVar("bg")}}`,
    `${s} [data-part=aisle]{container-type:inline-size;padding:clamp(16px,3%,40px)}`,
    `${s} [data-part=layout]{display:grid;grid-template-columns:minmax(0,1fr);gap:24px 40px;align-items:start}`,
    `${s} [data-part=scene]{position:relative;aspect-ratio:4/3}`,
    `@container (min-width:620px){${s} [data-part=scene]{aspect-ratio:16/9}}`,
    `@container (min-width:620px) and (max-width:959px){${s} [data-part=layout]{grid-template-columns:repeat(2,minmax(0,1fr))}${s} [data-part=scene],${s} [data-view=overview] [data-part=register]{grid-column:1/-1}${s} [data-view=overview] [data-part=register]{columns:2;column-gap:40px}}`,
    `@container (min-width:960px){${s} [data-part=layout]{grid-template-columns:minmax(0,1.65fr) minmax(0,1fr)}${s} [data-part=scene]{grid-row:1/span 2}${s} [data-part=layout]>:not([data-part=scene]){grid-column:2}}`,
    `${s} [data-part=markers]{position:absolute;inset:0}`,
    `${s} [data-part=markers]:focus-within{opacity:1!important}`,
    // A marker is a clear 44 px target around a 32 by 24 plate. The plate carries the one outline and the numerals.
    `${s} [data-part=markers] button{position:absolute;left:0;top:0;display:flex;align-items:center;justify-content:center;width:44px;height:44px;margin:0;padding:0;border:0;border-radius:0;background:none;color:${fg};font:inherit;cursor:pointer}`,
    `${s} [data-part=register]{margin:0;padding:0;list-style:none;border-top:${line}}`,
    `${s} [data-part=register] li{break-inside:avoid;border-bottom:${line}}`,
    `${s} [data-part=register] button{display:flex;align-items:baseline;gap:.75em;width:100%;min-height:44px;margin:0;padding:.55em 0;border:0;border-radius:0;background:none;color:inherit;font:inherit;line-height:1.35;text-align:left;cursor:pointer}`,
    `${s} [data-part=num],${s} [data-part=ref],${s} [data-part=reference],${s} [data-part=facts]{font-family:${GRID_FONT};font-size:.75em;letter-spacing:.04em;color:${muted}}`,
    `${s} [data-part=num]{padding:.1em .4em}`,
    `${s} [data-part=markers] [data-part=num]{box-sizing:border-box;width:32px;height:24px;padding:0;border:1px solid ${fg};color:${fg};font-weight:500;line-height:22px;text-align:center}`,
    `${s} [data-part=ref]{margin-left:auto;white-space:nowrap}`,
    `${s} [data-part=reference],${s} [data-part=facts]{margin:0;text-transform:uppercase;line-height:1.6;overflow-wrap:anywhere}`,
    `${s} [data-part=heading]{margin:.3em 0 .5em;font-size:1.5em;font-weight:500;line-height:1.15}`,
    `${s} [data-part=description]{margin:0 0 .9em;max-width:62ch;line-height:1.55}`,
    `${s} [data-part=note],${s} [data-part=empty]{margin:.8em 0 0;color:${muted};line-height:1.5}`,
    `${s} [data-part=chapters]{margin:.8em 0 0;padding-left:1.4em;line-height:1.6}`,
    `${s} [data-part=controls]{display:flex;flex-wrap:wrap;gap:8px;margin-top:1.2em}`,
    `${s} [data-part=controls] button{min-height:44px;padding:0 1em;border:${line};border-radius:0;background:none;color:inherit;font:inherit;cursor:pointer}`,
    // Hover follows every button's own rule, which it would otherwise lose to at equal weight, and on a marker it
    // tints the plate rather than the whole target. The pressed fill is the ink of the plate itself, while the
    // numerals inside take the readable ink on it: currentColor stands in for fg when the page sets no palette, so
    // the fill and the figures cannot share one element.
    `${s} [data-part=register] button:hover,${s} [data-part=controls] button:hover,${s} [data-part=markers] [aria-pressed=false]:hover>span{background:${tint(10)}}`,
    `${s} [aria-pressed=true] [data-part=num]{color:${fg};background:${fg}}`,
    `${s} [aria-pressed=true] [data-part=num]>span{color:${cssOn("fg")}}`,
    `${s} [data-part=controls] button:disabled{opacity:.45;cursor:default;background:none}`,
    `${s} :focus-visible{${ring}}`,
    `${s} [data-part=markers] :focus-visible{outline:0}`,
    `${s} [data-part=markers] :focus-visible>span{${ring}}`,
  ].join("");
}

export const mount: Mount<ArchiveAisleProps> = (host, initial = {}) => {
  let props: ArchiveAisleProps = { ...defaults, ...initial };
  const emit = emitter<ArchiveAisleEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  sheet.setRules(aisleRules(sheet.selector));
  const make = <K extends keyof HTMLElementTagNameMap>(tag: K, part: string, parent?: HTMLElement): HTMLElementTagNameMap[K] => {
    const el = document.createElement(tag);
    el.setAttribute("data-pica", "");
    if (part) el.dataset.part = part;
    parent?.append(el);
    return el;
  };
  const aisle = make("div", "aisle", host);
  const layout = make("div", "layout", aisle);
  const scene = make("div", "scene", layout);
  const detail = make("div", "detail", layout);
  const register = make("ol", "register", layout);
  const empty = make("p", "empty", layout);
  empty.textContent = "No collections";
  const reference = make("p", "reference", detail);
  const description = make("p", "description", detail);
  const facts = make("p", "facts", detail);
  const note = make("p", "note", detail);
  const chapters = make("ol", "chapters", detail);
  const controls = make("div", "controls", detail);
  const action = (name: string): HTMLButtonElement => {
    const button = make("button", "", controls);
    button.type = "button";
    button.dataset.action = name.toLowerCase();
    button.textContent = name;
    return button;
  };
  action("Back");
  const previous = action("Previous");
  const next = action("Next");
  let heading: HTMLElement = make("h3", "heading");
  const run: { loop?: Loop } = {};
  const surface = createCanvas(scene, { maxDpr: 2, maxPixels: 2400000, onResize: () => (measure(), run.loop?.redraw()) });
  const ctx = surface.canvas.getContext("2d");
  const group = make("div", "markers", scene);
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", "Bays");
  const palette = watchPalette(host, () => run.loop?.redraw());

  let list: readonly ArchiveAisleCollection[] = [];
  let bays = 4;
  let books: AisleBook[] = [];
  let marks: HTMLButtonElement[] = [];
  let items: HTMLButtonElement[] = [];
  let mw = 44;
  let mh = 44;
  let pw = 32;
  let ph = 24;
  let internal = props.defaultValue;
  let shown = -1;
  let wish: [number, number, HTMLButtonElement | undefined] | null = null;
  let from = AISLE_MOUTH;
  let to = AISLE_OVERVIEW;
  let start = 0;
  let span = AISLE_ENTRANCE;
  let entering = true;
  let held = false;
  let now = 0;
  let dead = false;
  const num = (i: number): string => String(i + 1).padStart(2, "0");
  /** Where a crowded marker may step, in whole targets and nearest first: away from the horizon before towards it,
   *  and towards its own wall before the vanishing point. */
  const steps: [number, number][] = [];
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) steps.push([dx, dy]);
  const cost = ([dx, dy]: [number, number]): number => Math.abs(dy) + 1.5 * Math.abs(dx) + (dy < 0 ? 0.5 : 0) + (dx < 0 ? 0.5 : 0);
  steps.sort((a, b) => cost(a) - cost(b));

  /** Rebuilds the markers, the register and the shelves from the collections. */
  function build(): void {
    list = (Array.isArray(props.collections) ? props.collections : []).slice(0, 12);
    bays = Math.min(7, Math.max(4, Math.ceil(list.length / 2) + 1));
    books = aisleBooks(props.seed, bays);
    group.replaceChildren();
    register.replaceChildren();
    marks = list.map((c, i) => {
      const mark = make("button", "", group);
      mark.type = "button";
      mark.dataset.index = String(i);
      make("span", "", make("span", "num", mark)).textContent = num(i);
      mark.setAttribute("aria-label", `${num(i)} ${c.name}`);
      return mark;
    });
    items = list.map((c, i) => {
      const item = make("button", "", make("li", "", register));
      item.type = "button";
      item.dataset.index = String(i);
      make("span", "", make("span", "num", item)).textContent = num(i);
      make("span", "name", item).textContent = c.name;
      make("span", "ref", item).textContent = c.reference;
      return item;
    });
    register.hidden = !list.length;
    empty.hidden = !!list.length;
    measure();
  }

  /** Reads a marker's target and its plate as rendered, so placement, clearance and the canvas erase follow them. */
  function measure(): void {
    const plate = marks[0]?.firstElementChild as HTMLElement | null | undefined;
    mw = marks[0]?.offsetWidth || 44;
    mh = marks[0]?.offsetHeight || 44;
    pw = plate?.offsetWidth || 32;
    ph = plate?.offsetHeight || 24;
  }

  function makeHeading(): void {
    const h = make(`h${Math.min(6, Math.max(2, Math.round(props.headingLevel) || 3))}` as "h3", "heading");
    h.tabIndex = -1;
    heading.remove();
    detail.insertBefore(h, description);
    heading = h;
  }

  /** The camera that frames a view: the overview, or a step into the aisle towards the chosen bay's wall, just
   *  short of the bay, so the bay fills that side of the frame from its near upright. */
  const aim = (i: number): AisleCamera => (i < 0 ? AISLE_OVERVIEW : [i % 2 ? 0.2 : -0.2, AISLE_EYE, Math.floor(i / 2) - 0.95]);

  /** How far the camera has come at loop time t. It eases out, so it answers at once and settles softly. */
  const progress = (t: number): number => 1 - (1 - Math.min(1, Math.max(0, (t - start) / span))) ** 3;

  const view = (t: number): AisleCamera => {
    const e = progress(t);
    return [from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e, from[2] + (to[2] - from[2]) * e];
  };

  const current = (): number => {
    const v = props.value ?? internal;
    return Number.isInteger(v) && v >= 0 && v < list.length ? v : -1;
  };

  const motion = (): void => run.loop?.update({ paused: props.paused || held, time: props.time, fps: Math.min(30, Math.max(1, props.fps || 30)) });

  function render(): void {
    attrs.set("role", props.label ? "region" : null);
    attrs.set("aria-label", props.label || null);
    aisle.dataset.view = shown < 0 ? "overview" : "detail";
    detail.hidden = shown < 0;
    for (const set of [marks, items]) set.forEach((button, i) => button.setAttribute("aria-pressed", String(i === shown)));
    const c = list[shown];
    if (!c) return;
    reference.textContent = c.reference;
    heading.textContent = c.title;
    description.textContent = c.description;
    facts.textContent = c.facts;
    note.textContent = c.note;
    chapters.replaceChildren(...(Array.isArray(c.chapters) ? c.chapters : []).map((text) => {
      const li = make("li", "");
      li.textContent = text;
      return li;
    }));
    facts.hidden = !c.facts;
    note.hidden = !c.note;
    chapters.hidden = !chapters.children.length;
    previous.disabled = shown < 1;
    next.disabled = shown >= list.length - 1;
  }

  /** Shows the current view, and starts the camera towards it when it changed, from wherever the camera is now. */
  function apply(): void {
    const v = current();
    if (v !== shown) {
      from = view(now);
      to = aim(v);
      start = now;
      span = AISLE_MOVE;
      shown = v;
      entering = false;
      held = false;
      motion();
    }
    render();
  }

  /** Moves focus once the view a visitor asked for is showing: into the detail when a collection opens, or onto
   *  the button pressed while it can still be pressed, and back to the collection's marker when it closes, or to
   *  its register entry while the marker is out of view. */
  function land(): void {
    if (!wish || wish[0] !== shown) return;
    const [v, was, keep] = wish;
    wish = null;
    const mark = marks[was];
    (v >= 0 ? (keep && !keep.disabled ? keep : heading) : mark?.style.visibility ? items[was] : mark)?.focus();
  }

  function act(v: number, keep?: HTMLButtonElement): void {
    if (v !== shown) emit("valueChange", v);
    wish = [v, shown, keep];
    if (props.value === null) {
      internal = v;
      apply();
    }
    land();
  }

  const onClick = (event: MouseEvent): void => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button") : null;
    if (!button || !aisle.contains(button)) return;
    const { index, action: name } = button.dataset;
    if (index) act(Number(index));
    else if (name === "back") act(-1);
    else if (name) act(shown + (name === "next" ? 1 : -1), button);
  };
  const onKey = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || shown < 0) return;
    event.preventDefault();
    act(-1);
  };
  aisle.addEventListener("click", onClick);
  aisle.addEventListener("keydown", onKey);

  /** Projects the aisle for camera c, places the markers clear of each other, and draws the shelving. */
  function paint(c: AisleCamera, fade: number): void {
    const w = surface.cssWidth;
    const h = surface.cssHeight;
    const f = AISLE_FOCAL * w;
    const at = (x: number, y: number, z: number): [number, number] | null => {
      const d = z - c[2];
      return d > 0.2 ? [w / 2 + (f * (x - c[0])) / d, h / 2 - (f * (y - c[1])) / d] : null;
    };
    const placed: [number, number, number, number][] = [];
    const order = marks.map((_, i) => i);
    if (shown >= 0) order.unshift(...order.splice(shown, 1));
    group.style.opacity = String(fade);
    for (const i of order) {
      const mark = marks[i];
      const j = Math.floor(i / 2);
      const p = at(i % 2 ? AISLE_HALF : -AISLE_HALF, AISLE_EYE + (j % 2 ? -0.45 : 0.45), j + 0.5);
      const inside = !!p && p[0] > 0 && p[0] < w && p[1] > 0 && p[1] < h;
      if (!mark) continue;
      mark.style.visibility = inside ? "" : "hidden";
      if (!p || !inside) continue;
      // A crowded marker takes the nearest step at which its whole target sits inside the scene and clear of the
      // targets already placed, so every visible target keeps its full size.
      const away = p[1] < h / 2 ? -1 : 1;
      const out = i % 2 ? 1 : -1;
      let spot: [number, number, number, number] | undefined;
      for (const [dx, dy] of steps) {
        const x = Math.round(Math.min(w - mw, Math.max(0, p[0] - mw / 2 + out * dx * (mw + 2))));
        const y = Math.round(Math.min(h - mh, Math.max(0, p[1] - mh / 2 + away * dy * (mh + 2))));
        const clear = placed.every((q) => Math.abs(q[0] - x) >= mw + 2 || Math.abs(q[1] - y) >= mh + 2);
        if (clear || !spot) spot = [x, y, p[0], p[1]];
        if (clear) break;
      }
      if (!spot) continue;
      placed.push(spot);
      mark.style.transform = `translate(${spot[0]}px,${spot[1]}px)`;
    }
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, surface.width, surface.height);
    ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
    const colors = palette.colors;
    const face = (x: number, y0: number, y1: number, z0: number, z1: number): void => {
      const a = at(x, y0, z0);
      const b = at(x, y0, z1);
      const e = at(x, y1, z1);
      const g = at(x, y1, z0);
      if (!a || !b || !e || !g) return;
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.lineTo(e[0], e[1]);
      ctx.lineTo(g[0], g[1]);
      ctx.closePath();
    };
    const seg = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): void => {
      const n = c[2] + 0.21;
      if (z0 < n && z1 < n) return;
      if (z0 < n) {
        const k = (n - z0) / (z1 - z0);
        x0 += (x1 - x0) * k;
        y0 += (y1 - y0) * k;
        z0 = n;
      } else if (z1 < n) {
        const k = (n - z1) / (z0 - z1);
        x1 += (x0 - x1) * k;
        y1 += (y0 - y1) * k;
        z1 = n;
      }
      const a = at(x0, y0, z0);
      const b = at(x1, y1, z1);
      if (!a || !b) return;
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
    };
    /** An outline facing the camera, at depth z. */
    const rect = (x0: number, y0: number, x1: number, y1: number, z: number): void => {
      seg(x0, y0, z, x1, y0, z);
      seg(x1, y0, z, x1, y1, z);
      seg(x1, y1, z, x0, y1, z);
      seg(x0, y1, z, x0, y0, z);
    };
    ctx.fillStyle = colors.fg;
    for (let tone = 0; tone < 3; tone++) {
      ctx.beginPath();
      for (const [x, z0, z1, y0, y1, t] of books) if (t === tone) face(x, y0, y1, z0, z1);
      ctx.globalAlpha = 0.14 + tone * 0.1;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.beginPath();
    for (const x of [-AISLE_HALF, AISLE_HALF]) {
      for (let j = 0; j <= bays; j++) {
        face(x, 0, AISLE_TOP, j - AISLE_PLANK / 2, j + AISLE_PLANK / 2);
        if (j < bays) for (const y of AISLE_BOARDS) face(x, y, y + AISLE_PLANK, j + AISLE_PLANK / 2, j + 1 - AISLE_PLANK / 2);
      }
    }
    ctx.fillStyle = colors.muted;
    ctx.fill();
    ctx.beginPath();
    const end = bays + 0.8;
    for (const side of [-1, 1]) {
      const x = side * AISLE_HALF;
      // The floor runs down each wall and out along the corridor from the ends of the two ranges.
      seg(x, 0, 0, x, 0, end);
      seg(side * (AISLE_HALF + 0.45), 0, 0, side * 6, 0, 0);
      rect(x, 0, side * (AISLE_HALF + 0.45), AISLE_TOP, 0);
    }
    for (let j = 0; j <= bays; j++) seg(-AISLE_HALF, 0, j, AISLE_HALF, 0, j);
    rect(-AISLE_HALF, 0, AISLE_HALF, 2.6, end);
    rect(-0.42, 0, 0.42, 2.05, end);
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 1;
    ctx.stroke();
    if (shown >= 0) {
      const j = Math.floor(shown / 2);
      ctx.beginPath();
      face(shown % 2 ? AISLE_HALF : -AISLE_HALF, 0, AISLE_TOP, j, j + 1);
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // A marker that had to step aside keeps a hairline from its plate back to its bay.
    ctx.globalAlpha = fade;
    ctx.beginPath();
    for (const [x, y, ax, ay] of placed) {
      const left = x + (mw - pw) / 2;
      const top = y + (mh - ph) / 2;
      if (Math.abs(left + pw / 2 - ax) < pw && Math.abs(top + ph / 2 - ay) < ph) continue;
      ctx.moveTo(ax, ay);
      ctx.lineTo(Math.min(left + pw, Math.max(left, ax)), Math.min(top + ph, Math.max(top, ay)));
    }
    ctx.strokeStyle = colors.fg;
    ctx.lineWidth = 1;
    ctx.stroke();
    // The canvas clears under every marker's plate as it fades in, so the plate's own border is its one outline.
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = colors.fg;
    for (const [x, y] of placed) ctx.fillRect(x + (mw - pw) / 2, y + (mh - ph) / 2, pw, ph);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }

  build();
  makeHeading();
  shown = current();
  to = aim(shown);
  render();
  run.loop = createLoop({
    el: scene,
    paused: props.paused,
    time: props.time,
    fps: Math.min(30, Math.max(1, props.fps || 30)),
    still: AISLE_ENTRANCE,
    frame(t, reduced) {
      now = t;
      // Pinned to a time, paused, or under reduced motion, the camera is already where it is going.
      const instant = reduced || props.paused || props.time !== null;
      if (instant) {
        from = to;
        start = -Infinity;
      }
      const e = progress(t);
      if (e === 1) entering = false;
      // The markers fade in over the second half of the entrance, once their bays have spread apart.
      paint(view(t), entering ? Math.min(1, Math.max(0, e * 2.5 - 1.25)) : 1);
      // Once the camera settles the loop holds, so a still aisle repaints only when something changes.
      if (e === 1 && !instant && !held && run.loop) {
        held = true;
        run.loop.update({ paused: true });
      }
    },
  });
  host.dataset.picaReady = "true";

  return {
    update(nextProps) {
      const before = props;
      props = { ...props, ...nextProps };
      if (!sameJson(before.collections, props.collections) || before.seed !== props.seed) build();
      if (before.headingLevel !== props.headingLevel) makeHeading();
      palette.refresh();
      apply();
      land();
      wish = null;
      motion();
      run.loop?.redraw();
    },
    destroy() {
      if (dead) return;
      dead = true;
      run.loop?.destroy();
      palette.destroy();
      surface.destroy();
      aisle.removeEventListener("click", onClick);
      aisle.removeEventListener("keydown", onKey);
      aisle.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};
