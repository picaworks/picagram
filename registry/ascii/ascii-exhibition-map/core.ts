import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { measureCell } from "../../../lib/glyph-grid";
import { hostAttributes, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import { measureRamp } from "../../../lib/ramp";
import type { Mount } from "../../../lib/types";

/** One room on the plan. Its rectangle is in plan units, counted from the plan's top left corner. */
export interface AsciiExhibitionMapRoom {
  /** The room's name, drawn after its number inside the plan and on its button. */
  name: string;
  /** One line about the room, shown first when it is selected. */
  subject: string;
  /** A short paragraph about what the room holds. */
  note: string;
  /** Practical access notes, set as a label under the note. */
  access: string;
  /** The left edge, in plan units. */
  x: number;
  /** The top edge, in plan units. */
  y: number;
  /** The width, in plan units. */
  w: number;
  /** The height, in plan units. */
  h: number;
  /** Openings one plan unit wide: the wall each one cuts, and which unit along it, counted from 0 at the room's left or top corner. */
  doors?: readonly { side: "n" | "e" | "s" | "w"; at: number }[];
}

export interface AsciiExhibitionMapProps {
  /** Names the region and prints as the plan's caption. Empty leaves no caption and no role. */
  label: string;
  /** The plan's size in plan units. It grows to hold every room. */
  plan: { cols: number; rows: number };
  /** The rooms in route order, numbered from 01. Rooms that touch share one wall, and a door cuts it for both. */
  rooms: readonly AsciiExhibitionMapRoom[];
  /** The selected room's index while controlled, or null to let the component keep its own selection. */
  value: number | null;
  /** The room selected at mount while uncontrolled, or -1 for none. */
  defaultValue: number;
}

export interface AsciiExhibitionMapEvents {
  /** The index of the room a visitor chose, from its button or from the plan. */
  valueChange: number;
}

export const defaults: AsciiExhibitionMapProps = {
  label: "Ground floor plan",
  plan: { cols: 16, rows: 11 },
  rooms: [
    {
      name: "Entrance",
      subject: "Desk, lockers and the start of the route",
      note: "Pick up a printed plan at the desk. Lockers sit beside the street door, and the route begins through the opening in the north wall.",
      access: "Level street entrance / Seats at the desk",
      x: 0,
      y: 7,
      w: 11,
      h: 4,
      doors: [{ side: "s", at: 5 }, { side: "n", at: 2 }],
    },
    {
      name: "Measure",
      subject: "Tools for agreeing on a length",
      note: "A folded ruler, a marked string and a workshop gauge show three ways of making a measurement repeatable. Read the wear marks beside the numbered divisions.",
      access: "Level access / Seating by the east wall",
      x: 0,
      y: 0,
      w: 5,
      h: 7,
      doors: [{ side: "e", at: 3 }],
    },
    {
      name: "Mend",
      subject: "Repair as a visible record",
      note: "Patched cloth and a joined ceramic bowl preserve the decision to keep an object in use. A handling sample lets visitors feel the seam without touching the exhibited pieces.",
      access: "Level access / Seated handling sample",
      x: 5,
      y: 0,
      w: 6,
      h: 7,
      doors: [{ side: "e", at: 2 }],
    },
    {
      name: "Carry",
      subject: "The shape of a daily journey",
      note: "A market basket, a tool roll and a parcel wrapper are arranged around the routes they served. Each label traces a repeated trip from the maker to the place of use.",
      access: "Level access / Large print labels",
      x: 11,
      y: 0,
      w: 5,
      h: 6,
      doors: [{ side: "s", at: 2 }],
    },
    {
      name: "Keep",
      subject: "Where each tool waits between jobs",
      note: "Shadow boards, labelled drawers and a mended tool chest show how a workshop keeps its things in order. The last opening leads back to the entrance.",
      access: "Level access / Drawers at seated height",
      x: 11,
      y: 6,
      w: 5,
      h: 5,
      doors: [{ side: "w", at: 2 }],
    },
  ],
  value: null,
  defaultValue: 0,
};

/** Wall glyphs indexed by the sides a wall cell joins: north 1, east 2, south 4, west 8. A cell that joins
 *  on one side only is a door's jamb. */
const EXHIBIT_WALLS = "─╵╶└╷│┌├╴┘─┴┐┤┬┼";

let exhibitProbe: CanvasRenderingContext2D | null | undefined;

function exhibitEl<K extends keyof HTMLElementTagNameMap>(tag: K, parent: Node, part = ""): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  if (part) el.setAttribute("data-part", part);
  parent.appendChild(el);
  return el;
}

/** The row height as a multiple of the glyph size: the measured ink of a vertical rule, less a quarter pixel
 *  and rounded down to whole pixels, so the rules of consecutive rows always overlap. Kept between 1 and 1.25. */
function exhibitLine(size: number): number {
  if (exhibitProbe === undefined) exhibitProbe = document.createElement("canvas").getContext("2d");
  let ink = size * 1.2;
  if (exhibitProbe) {
    exhibitProbe.font = `${size}px ${GRID_FONT}`;
    const m = exhibitProbe.measureText("│");
    ink = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent || ink;
  }
  return Math.max(1, Math.floor(Math.min(1.25 * size, Math.max(size, ink - 0.25)))) / size;
}

/** Greedy word wrap. A word longer than the width keeps a line of its own, so the caller can reject the fit. */
function exhibitWrap(text: string, width: number): string[] {
  const lines: string[] = [];
  for (const word of text.split(/\s+/)) {
    const last = lines[lines.length - 1];
    if (last !== undefined && last.length + word.length < width) lines[lines.length - 1] = `${last} ${word}`;
    else if (word) lines.push(word);
  }
  return lines;
}

const exhibitUnit = (value: unknown, min: number): number => Math.max(min, Math.round(Number(value)) || 0);

function exhibitRules(map: string): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  const rule = `1px solid color-mix(in srgb, ${fg} 24%, transparent)`;
  return [
    `:where(${map}){box-sizing:border-box;display:grid;grid-template-columns:minmax(0,1fr);gap:1.5rem 2.5rem;align-items:start;padding:clamp(1rem,4%,2.5rem);color:${fg}}`,
    `${map}[data-layout=split]{grid-template-columns:repeat(2,minmax(0,1fr))}`,
    `${map}[data-layout=split]>figure{grid-column:1/-1}`,
    `${map}[data-layout=wide]{grid-template-columns:minmax(0,1fr) 22rem;grid-template-rows:auto 1fr}`,
    `${map}[data-layout=wide]>figure{grid-row:span 2}`,
    `${map} figure{min-width:0;margin:0;overflow-x:auto;overflow-y:hidden}`,
    `${map} p{margin:0}`,
    `${map} figcaption,${map} [data-part=empty],${map} [data-part=access]{font:.75em/1.4 ${GRID_FONT};letter-spacing:.04em;text-transform:uppercase;color:${muted}}`,
    `${map} figcaption{margin-bottom:1rem}`,
    `${map} pre{margin:0;font-family:${GRID_FONT};letter-spacing:0;word-spacing:0;font-kerning:none;font-variant-ligatures:none;white-space:pre;user-select:none}`,
    `${map} [data-tone=accent]{color:${accent}}`,
    `${map} [data-room]{cursor:pointer}`,
    `${map} ol{margin:0;padding:0;list-style:none;border-top:${rule}}`,
    `${map} li{border-bottom:${rule}}`,
    `${map} button{box-sizing:border-box;display:flex;align-items:baseline;gap:.9em;width:100%;min-height:2.75rem;margin:0;padding:.6em .75em;border:0;border-left:3px solid transparent;border-radius:0;background:none;color:inherit;font:inherit;line-height:1.3;text-align:left;cursor:pointer}`,
    `${map} button:hover{background:color-mix(in srgb, ${fg} 8%, transparent)}`,
    `${map} button[aria-pressed=true]{border-left-color:${accent}}`,
    `${map} button:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${map} button>span{font:.8em/1 ${GRID_FONT};color:${muted}}`,
    `${map} button[aria-pressed=true]>span{color:inherit}`,
    `${map} [data-part=detail]{max-width:62ch}`,
    `${map} [data-part=detail] p+p{margin-top:.75em}`,
    `${map} [data-part=subject]{font-size:1.125em;line-height:1.35}`,
    `${map} [data-part=note]{line-height:1.6}`,
  ].join("\n");
}

export const mount: Mount<AsciiExhibitionMapProps> = (host, initial = {}) => {
  let props: AsciiExhibitionMapProps = { ...defaults, ...initial };
  let chosen = props.defaultValue;
  let width = -1;
  let base = 0;
  let shown = "";
  let timer: ReturnType<typeof setTimeout> | undefined;
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const emit = emitter<AsciiExhibitionMapEvents>(host);
  const root = exhibitEl("div", host, "map");
  const figure = exhibitEl("figure", root, "plan");
  const caption = exhibitEl("figcaption", figure);
  const pre = exhibitEl("pre", figure, "drawing");
  const empty = exhibitEl("p", figure, "empty");
  const list = exhibitEl("ol", root, "rooms");
  const detail = exhibitEl("div", root, "detail");
  pre.setAttribute("aria-hidden", "true");
  detail.setAttribute("aria-live", "polite");
  empty.textContent = "No rooms";
  sheet.setRules(exhibitRules(`${sheet.selector}>[data-part=map]`));

  const current = (): number => {
    const index = typeof props.value === "number" ? props.value : chosen;
    return Number.isInteger(index) && index >= 0 && index < props.rooms.length ? index : -1;
  };

  function draw(): void {
    base = parseFloat(getComputedStyle(host).fontSize) || 16;
    width = root.clientWidth;
    root.setAttribute("data-layout", width >= 72 * base ? "wide" : width >= 40 * base ? "split" : "stack");
    const units = props.rooms.map((room) => ({ room, x: exhibitUnit(room.x, 0), y: exhibitUnit(room.y, 0), w: exhibitUnit(room.w, 1), h: exhibitUnit(room.h, 1) }));
    if (units.length === 0) {
      pre.replaceChildren();
      return;
    }
    let cols = exhibitUnit(props.plan?.cols, 1);
    let rows = exhibitUnit(props.plan?.rows, 1);
    for (const u of units) {
      cols = Math.max(cols, u.x + u.w);
      rows = Math.max(rows, u.y + u.h);
    }
    // Two columns per unit keep doors open and units near square, so glyphs shrink, down to 10 px, before a
    // plan falls back to one column per unit.
    const avail = figure.clientWidth - 1;
    const advance = measureCell(GRID_FONT, base, 1).w / base;
    const fit = (per: number): number => Math.floor((avail / ((per * cols + 1) * advance)) * 10) / 10;
    const size = fit(2) >= base ? base : fit(2) >= 10 ? fit(2) : Math.max(10, Math.min(base, fit(1)));
    const lh = exhibitLine(size);
    const cell = measureCell(GRID_FONT, size, lh);
    // A unit is sx columns by a whole number of rows, so it can come out far from square. One column fewer is
    // taken when that brings the plan's proportions much closer, so the drawing keeps its shape at every width.
    const rowsFor = (per: number): number => Math.max(1, Math.round((per * cell.w) / cell.h));
    const skew = (per: number): number => Math.abs(Math.log((per * cell.w) / (rowsFor(per) * cell.h)));
    let sx = Math.max(1, Math.floor((avail / cell.w - 1) / cols + 1e-6));
    if (sx > 2 && skew(sx) > 0.22 && skew(sx - 1) < skew(sx)) sx -= 1;
    const sy = rowsFor(sx);
    const stride = cols * sx + 1;
    const n = stride * (rows * sy + 1);
    const walls = new Uint8Array(n);
    const owner = new Int16Array(n).fill(-1);
    const glyphs = new Array<string>(n).fill(" ");
    const tinted = new Uint8Array(n);
    const join = (at: number, sides: number): void => {
      walls[at] = (walls[at] ?? 0) | sides;
    };
    const cut = (at: number, sides: number): void => {
      walls[at] = (walls[at] ?? 0) & ~sides;
    };
    units.forEach(({ x, y, w, h }, i) => {
      for (let r = y * sy; r <= (y + h) * sy; r++) {
        for (let c = x * sx; c <= (x + w) * sx; c++) {
          const at = r * stride + c;
          const across = r === y * sy || r === (y + h) * sy;
          const down = c === x * sx || c === (x + w) * sx;
          if (across) join(at, (c < (x + w) * sx ? 2 : 0) | (c > x * sx ? 8 : 0));
          if (down) join(at, (r < (y + h) * sy ? 4 : 0) | (r > y * sy ? 1 : 0));
          if (!across && !down) owner[at] = i;
        }
      }
    });
    for (const { room, x, y, w, h } of units) {
      for (const door of room.doors ?? []) {
        const across = door.side === "n" || door.side === "s";
        const step = across ? sx : sy;
        const from = exhibitUnit(door.at, 0) * step;
        if (from + step > (across ? w * sx : h * sy)) continue;
        const next = across ? 1 : stride;
        const origin = across ? (door.side === "n" ? y : y + h) * sy * stride + x * sx : y * sy * stride + (door.side === "w" ? x : x + w) * sx;
        // A door cuts the wall's own links between two unit lines, so the opening is one unit at every scale, the
        // cells at either end join one way only and draw as jambs, and a wall that meets the opening keeps its links.
        for (let k = from; k < from + step; k++) {
          cut(origin + k * next, across ? 2 : 4);
          cut(origin + (k + 1) * next, across ? 8 : 1);
        }
      }
    }
    const index = current();
    const dot = measureRamp("·.", GRID_FONT, lh).glyphs[0] ?? ".";
    units.forEach(({ room, x, y, w, h }, i) => {
      const inner = w * sx - 1;
      const tall = h * sy - 1;
      const number = String(i + 1).padStart(2, "0");
      let lines = exhibitWrap(`${number} ${room.name ?? ""}`, inner - 2);
      if (lines.length + 2 > tall || lines.some((line) => line.length > inner - 2)) lines = tall > 0 && number.length <= inner - 2 ? [number] : [];
      if (i === index) {
        owner.forEach((o, at) => {
          if (o === i && !walls[at]) {
            glyphs[at] = dot;
            tinted[at] = 1;
          }
        });
      }
      // Each label line keeps a clear cell on either side, and a lone fill cell left between it and a wall is
      // cleared as well, so the label reads against the fill.
      const top = y * sy + 1 + ((tall - lines.length) >> 1);
      lines.forEach((line, k) => {
        const left = x * sx + 1 + ((inner - line.length) >> 1);
        const lo = left - 1 === x * sx + 2 ? left - 2 : left - 1;
        const hi = left + line.length === (x + w) * sx - 2 ? left + line.length + 1 : left + line.length;
        for (let c = lo; c <= hi; c++) {
          const at = (top + k) * stride + c;
          glyphs[at] = line[c - left] ?? " ";
          tinted[at] = 0;
        }
      });
    });
    const out = document.createDocumentFragment();
    for (let at = 0; at < n; ) {
      if (at > 0 && at % stride === 0) out.append("\n");
      const room = walls[at] ? -1 : (owner[at] ?? -1);
      const tone = tinted[at] ?? 0;
      const end = at - (at % stride) + stride;
      let text = "";
      while (at < end && (walls[at] ? -1 : (owner[at] ?? -1)) === room && (tinted[at] ?? 0) === tone) {
        text += walls[at] ? (EXHIBIT_WALLS[walls[at] ?? 0] ?? "") : (glyphs[at] ?? " ");
        at++;
      }
      const run = exhibitEl("span", out);
      run.setAttribute("data-tone", tone ? "accent" : "fg");
      if (room >= 0) run.setAttribute("data-room", String(room));
      run.textContent = text;
    }
    pre.style.cssText = `font-size:${size}px;line-height:${cell.h}px`;
    pre.replaceChildren(out);
  }

  function render(): void {
    const index = current();
    const room = props.rooms[index];
    const none = props.rooms.length === 0;
    caption.textContent = props.label;
    caption.hidden = !props.label;
    empty.hidden = !none;
    pre.hidden = list.hidden = detail.hidden = none;
    figure.setAttribute("data-selected", String(index));
    list.querySelectorAll("button").forEach((button, i) => button.setAttribute("aria-pressed", String(i === index)));
    const text: [string, string][] = room ? [["subject", room.subject], ["note", room.note], ["access", room.access]] : [];
    if (JSON.stringify(text) !== shown) {
      shown = JSON.stringify(text);
      detail.replaceChildren();
      for (const [part, line] of text) if (line) exhibitEl("p", detail, part).textContent = line;
    }
    draw();
  }

  function buildList(): void {
    list.replaceChildren();
    props.rooms.forEach((room, i) => {
      const button = exhibitEl("button", exhibitEl("li", list));
      button.type = "button";
      button.setAttribute("data-index", String(i));
      exhibitEl("span", button).textContent = String(i + 1).padStart(2, "0");
      button.append(` ${room.name ?? ""}`);
    });
  }

  function nameRegion(): void {
    attrs.set("role", props.label ? "region" : null);
    attrs.set("aria-label", props.label || null);
  }

  root.addEventListener("click", (event) => {
    const hit = (event.target as Element | null)?.closest?.("[data-room],[data-index]");
    if (!hit) return;
    const index = Number(hit.getAttribute("data-room") ?? hit.getAttribute("data-index"));
    if (typeof props.value !== "number") {
      chosen = index;
      render();
    }
    emit("valueChange", index);
  });

  // A redraw changes the host's height, so it waits for the next task instead of running inside the
  // observer's own callback, where it would trip the resize loop error.
  const observer = typeof ResizeObserver === "function"
    ? new ResizeObserver(() => {
        if (root.clientWidth === width && (parseFloat(getComputedStyle(host).fontSize) || 16) === base) return;
        clearTimeout(timer);
        timer = setTimeout(draw);
      })
    : null;
  observer?.observe(host);
  document.fonts?.addEventListener("loadingdone", draw);

  nameRegion();
  buildList();
  render();
  attrs.set("data-pica-ready", "true");

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (sameJson(before, props)) return;
      nameRegion();
      if (!sameJson(before.rooms, props.rooms)) buildList();
      render();
    },
    destroy() {
      clearTimeout(timer);
      observer?.disconnect();
      document.fonts?.removeEventListener("loadingdone", draw);
      root.remove();
      sheet.destroy();
      attrs.restore();
    },
  };
};
