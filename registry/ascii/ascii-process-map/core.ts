import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { measureCell } from "../../../lib/glyph-grid";
import { hostAttributes, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface AsciiProcessMapProps {
  /** Names the region and prints as the drawing's caption. Empty leaves out both the caption and the region role. */
  label: string;
  /** The entry step, drawn in a light box above the decision. Empty leaves the box out. */
  start: string;
  /** The question the routes answer, drawn in a double box. Empty leaves the box out. */
  decision: string;
  /** Each answer with its ordered steps and its outcome. At most four are drawn and listed. */
  routes: { choice: string; steps: string[]; outcome: string }[];
  /** The selected route's index. Null leaves the component uncontrolled, so it keeps its own choice. */
  value: number | null;
  /** The route selected at mount, read once, while value is null. */
  defaultValue: number;
}

export interface AsciiProcessMapEvents {
  /** The index of the route chosen, from its button or from its head box in the drawing. */
  valueChange: number;
}

export const defaults: AsciiProcessMapProps = {
  label: "Document intake",
  start: "Receive submission",
  decision: "Can it be reviewed?",
  routes: [
    { choice: "Ready for review", steps: ["Validate identifiers", "Assign an editor", "Schedule review"], outcome: "The document enters the review queue." },
    { choice: "Needs information", steps: ["List missing fields", "Return to contributor", "Receive amended record"], outcome: "The amended record returns to intake." },
    { choice: "Out of scope", steps: ["Record the reason", "Refer to another archive", "Close the submission"], outcome: "The contributor receives a referral." },
  ],
  value: null,
  defaultValue: 0,
};

type ProcessRoute = AsciiProcessMapProps["routes"][number];

/** One cell of the drawing: a glyph set directly, its tone, the light lines that meet in it as bits (up 1,
 *  down 2, left 4, right 8), and the route whose head it belongs to, or -1. */
interface ProcessCell {
  c: string;
  t: string;
  l: number;
  r: number;
}

/** Frame glyphs by weight: four corners, the rule, the side, then the junctions where a light line meets the
 *  top, the bottom, and the left edge. */
const PROCESS_LIGHT = "┌┐└┘─│┴┬┤";
const PROCESS_HEAVY = "┏┓┗┛━┃┷┯┨";
const PROCESS_DOUBLE = "╔╗╚╝═║╧╤╢";
/** The light line through a cell for each set of directions, indexed by ProcessCell.l. */
const PROCESS_LINES = " ╵╷│╴┘┐┤╶└┌├─┴┬┼";

/** Measures glyph ink. Made on first use, because the build imports every core in Node. */
let processInk: CanvasRenderingContext2D | null | undefined;

/** Greedy word wrap that never truncates. A word longer than a line breaks across lines with no ellipsis, and
 *  lines after the first start with `hang`. */
function processWrap(text: string, width: number, hang = ""): string[] {
  const lines: string[] = [];
  let line = "";
  for (let word of text.split(/\s+/).filter(Boolean)) {
    for (;;) {
      const room = Math.max(1, width - (lines.length ? hang.length : 0));
      const next = line ? `${line} ${word}` : word;
      if (next.length <= room) {
        line = next;
        break;
      }
      if (line) lines.push(line);
      else {
        lines.push(word.slice(0, room));
        word = word.slice(room);
      }
      line = "";
    }
  }
  lines.push(line);
  return lines.map((s, i) => (i ? hang + s : s));
}

/** Lays the map out in cells across `cols` columns. Route heads stand side by side under a bus while each box
 *  keeps 20 columns, and otherwise hang from a trunk down the left. Only the selected route draws its steps.
 *  Every rule and frame takes an opaque tone, fg or accent: a translucent tone darkens wherever neighboring
 *  glyphs overlap, which beads a rule at every cell. Muted is kept for the step counts. */
function processLayout(props: AsciiProcessMapProps, sel: number, cols: number): ProcessCell[][] {
  const grid: ProcessCell[][] = [];
  const at = (x: number, y: number): ProcessCell => {
    const row = (grid[y] ??= []);
    return (row[x] ??= { c: " ", t: "", l: 0, r: -1 });
  };
  const put = (x: number, y: number, c: string, t: string, r = -1): void => {
    Object.assign(at(x, y), { c, t, r });
  };
  const write = (x: number, y: number, text: string, t: string, r = -1): void => {
    [...text].forEach((c, i) => put(x + i, y, c, t, r));
  };
  /** Gives a junction on the selected route's line the accent, whichever frame it belongs to. */
  const mark = (x: number, y: number): void => {
    at(x, y).t = "accent";
  };
  /** A straight light line between two cells. A cell that already holds a glyph keeps it, and its tone. */
  const line = (x0: number, y0: number, x1: number, y1: number, t: string): void => {
    const down = x0 === x1;
    const a = down ? Math.min(y0, y1) : Math.min(x0, x1);
    const b = down ? Math.max(y0, y1) : Math.max(x0, x1);
    for (let i = a; a < b && i <= b; i++) {
      const k = down ? at(x0, i) : at(i, y0);
      k.l |= (i > a ? (down ? 1 : 4) : 0) | (i < b ? (down ? 2 : 8) : 0);
      if (k.c === " ") k.t = t;
    }
  };
  /** A framed box of wrapped lines. `legs` adds the junctions where a line enters the top (1), leaves the
   *  bottom (2), or enters the left edge at the first line (4). Returns the bottom row. */
  const box = (x: number, y: number, w: number, lines: string[], f: string, t: string, r: number, legs: number, lx = x + ((w - 1) >> 1)): number => {
    const end = y + lines.length + 1;
    const rule = f.charAt(4).repeat(w - 2);
    write(x, y, f.charAt(0) + rule + f.charAt(1), t, r);
    write(x, end, f.charAt(2) + rule + f.charAt(3), t, r);
    lines.forEach((text, i) => {
      put(x, y + i + 1, f.charAt(legs & 4 && !i ? 8 : 5), t, r);
      write(x + 1, y + i + 1, ` ${text}`.padEnd(w - 2), "fg", r);
      put(x + w - 1, y + i + 1, f.charAt(5), t, r);
    });
    if (legs & 1) put(lx, y, f.charAt(6), t, r);
    if (legs & 2) put(lx, end, f.charAt(7), t, r);
    return end;
  };
  /** The selected route's steps under its head, each joined to the box above, then an arrow into the outcome.
   *  The line and the junctions it passes through take the accent, so it reads as one stroke; frames stay fg. */
  const chain = (x: number, w: number, y: number, item: ProcessRoute): number => {
    const cx = x + ((w - 1) >> 1);
    const outcome = item.outcome.trim();
    item.steps.forEach((step, i) => {
      const top = y + 2;
      const more = Boolean(outcome) || i < item.steps.length - 1;
      line(cx, y, cx, top, "accent");
      y = box(x, top, w, processWrap(step, w - 4), PROCESS_LIGHT, "fg", -1, more ? 3 : 1);
      mark(cx, top);
      if (more) mark(cx, y);
    });
    if (outcome) {
      put(cx, y + 1, "▼", "accent");
      y = box(x, y + 2, w, processWrap(outcome, w - 4), PROCESS_LIGHT, "fg", -1, 0);
    }
    return y;
  };

  const routes = props.routes.slice(0, 4);
  const n = routes.length;
  const trunk = ([[props.start, PROCESS_LIGHT], [props.decision, PROCESS_DOUBLE]] as [string, string][]).filter(([text]) => text.trim());
  const heads = routes.map((item, i) => `${String(i + 1).padStart(2, "0")} ${item.choice}`);
  const texts = [...trunk.map(([text]) => text), ...heads, ...routes.flatMap((item) => [...item.steps, item.outcome])];
  const per = n ? Math.floor((cols - 2 * (n - 1)) / n) : cols;
  const wide = n < 2 || per >= 20;
  const w = wide ? Math.min(28, per, Math.max(20, ...texts.map((text) => text.length + 4))) : Math.min(cols, 44) - 4;
  const h = (w - 1) >> 1;
  const colX = (i: number): number => (wide ? i * (w + 2) : 4);
  const mid = wide ? h + ((Math.max(0, n - 1) * (w + 2)) >> 1) : 2;
  const tw = wide ? w : w + 4;
  const count = (item: ProcessRoute): string => `${item.steps.length} step${item.steps.length === 1 ? "" : "s"}`;
  const exit = (item: ProcessRoute, on: boolean): number => (on && (item.steps.length || item.outcome.trim()) ? 2 : 0);
  let y = -1;
  trunk.forEach(([text, f], i) => {
    const ty = y + (i ? 2 : 1);
    if (i) line(mid, y, mid, ty, "fg");
    y = box(mid - (wide ? h : 2), ty, tw, processWrap(text, tw - 4), f, "fg", -1, (i ? 1 : 0) | (n || i < trunk.length - 1 ? 2 : 0), mid);
  });
  if (n && trunk.length) mark(mid, y);
  if (!n) write(2, trunk.length ? y + 2 : 0, "No routes", "muted");
  const labels = heads.map((text) => processWrap(text, w - 4, "   "));
  const top = trunk.length ? y + (wide ? (n > 1 ? 4 : 2) : 1) : 0;
  if (wide) {
    const cs = colX(sel) + h;
    const tall = Math.max(1, ...labels.map((text) => text.length));
    if (trunk.length && n > 1) {
      const bus = y + 2;
      line(h, bus, colX(n - 1) + h, bus, "fg");
      routes.forEach((_, i) => line(colX(i) + h, bus, colX(i) + h, top, "fg"));
      line(mid, bus, cs, bus, "accent");
      line(cs, bus, cs, top, "accent");
      line(mid, y, mid, bus, "accent");
    } else if (trunk.length && n) line(mid, y, mid, top, "accent");
    routes.forEach((item, i) => {
      const on = i === sel;
      const text = labels[i] ?? [];
      while (text.length < tall) text.push("");
      const end = box(colX(i), top, w, text, on ? PROCESS_HEAVY : PROCESS_LIGHT, on ? "accent" : "fg", i, (trunk.length ? 1 : 0) | exit(item, on));
      if (on) chain(colX(i), w, end, item);
      else write(colX(i) + ((w - count(item).length) >> 1), end + 1, count(item), "muted", i);
    });
  } else {
    let pick = 0;
    let last = 0;
    y = top - 1;
    routes.forEach((item, i) => {
      const on = i === sel;
      const end = box(4, y + 1, w, labels[i] ?? [], on ? PROCESS_HEAVY : PROCESS_LIGHT, on ? "accent" : "fg", i, 4 | exit(item, on));
      last = y + 2;
      if (on) pick = last;
      line(2, last, 4, last, "fg");
      if (on) y = chain(4, w, end, item) + (i < n - 1 ? 1 : 0);
      else {
        write(6, end + 1, count(item), "muted", i);
        y = end + 1;
      }
    });
    if (n) {
      const first = trunk.length ? top - 1 : top + 1;
      line(2, first, 2, last, "fg");
      line(2, first, 2, pick, "accent");
      line(2, pick, 4, pick, "accent");
    }
  }
  return grid;
}

export const mount: Mount<AsciiProcessMapProps> = (host, initial = {}) => {
  let props: AsciiProcessMapProps = { ...defaults, ...initial };
  let internal = props.defaultValue;
  let cols = 0;
  let rowPx = 0;
  let metrics = "";
  let listed = "";
  let pending: ReturnType<typeof setTimeout> | undefined;
  let buttons: HTMLButtonElement[] = [];
  const emit = emitter<AsciiProcessMapEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const s = sheet.selector;
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  sheet.setRules(
    [
      `:where(${s}){display:block;box-sizing:border-box;padding:clamp(1rem,3%,2.5rem);color:${fg}}`,
      `${s} [data-part=diagram]{margin:0}`,
      `${s} [data-part=drawing]{margin:0;font:400 1em/1.2 ${GRID_FONT};letter-spacing:0;word-spacing:0;font-kerning:none;font-variant-ligatures:none;text-transform:none;text-align:left;text-indent:0;direction:ltr;white-space:pre}`,
      `${s} [data-tone=muted]{color:${muted}}`,
      `${s} [data-tone=accent]{color:${accent}}`,
      `${s} [data-route-index]{cursor:pointer}`,
      `${s} [data-part=caption]{margin-top:.75em;color:${muted};font-size:.875em}`,
      `${s} [data-part=choices]{display:flex;flex-wrap:wrap;gap:.5em;margin-top:1.25em}`,
      `${s} [data-part=choices]:empty{display:none}`,
      `${s} [data-index]{box-sizing:border-box;min-width:44px;min-height:44px;max-width:100%;margin:0;padding:.5em .9em;border:1px solid ${muted};border-radius:0;background:none;color:inherit;font:inherit;line-height:1.3;text-align:left;cursor:pointer}`,
      `${s} [data-index]:hover{background:color-mix(in srgb,${fg} 10%,transparent)}`,
      `${s} [data-index][aria-pressed=true]{border-color:${fg};box-shadow:inset 0 -2px ${accent}}`,
      `${s} [data-index]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
      `${s} [data-part=index]{font-family:${GRID_FONT};font-size:.875em;color:${muted}}`,
      `${s} [data-part=route]{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}`,
    ].join("\n"),
  );

  function make<K extends keyof HTMLElementTagNameMap>(tag: K, part = "", parent?: Node): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    if (part) node.setAttribute("data-part", part);
    parent?.appendChild(node);
    return node;
  }

  const figure = make("figure", "diagram", host);
  const pre = make("pre", "drawing", figure);
  const caption = make("figcaption", "caption");
  const choices = make("div", "choices", host);
  const route = make("div", "route", host);
  pre.setAttribute("aria-hidden", "true");
  choices.setAttribute("role", "group");
  route.setAttribute("aria-live", "polite");

  const selected = (): number => Math.min(Math.min(4, props.routes.length) - 1, Math.max(0, (props.value ?? internal) | 0));

  function choose(index: number): void {
    if (props.value === null) {
      internal = index;
      sync();
    }
    emit("valueChange", index);
  }

  function build(): void {
    buttons = props.routes.slice(0, 4).map((item, i) => {
      const button = make("button");
      button.type = "button";
      button.setAttribute("data-index", String(i));
      make("span", "index", button).textContent = String(i + 1).padStart(2, "0");
      button.append(` ${item.choice}`);
      button.addEventListener("click", () => choose(i));
      return button;
    });
    choices.replaceChildren(...buttons);
  }

  /** Takes the glyph size from the host and the cell from the font. A row is the measured ink of a vertical rule,
   *  rounded down to whole pixels with a quarter pixel to spare, so vertical runs overlap and never part.
   *  Reports whether anything the drawing depends on changed. */
  function measure(): boolean {
    const size = parseFloat(getComputedStyle(host).fontSize) || 16;
    if (processInk === undefined) processInk = document.createElement("canvas").getContext("2d");
    let lh = 1.2;
    if (processInk) {
      processInk.font = `${size}px ${GRID_FONT}`;
      const bar = processInk.measureText("│");
      lh = Math.min(1.25, Math.max(1, Math.floor(bar.actualBoundingBoxAscent + bar.actualBoundingBoxDescent - 0.25) / size));
    }
    const cell = measureCell(GRID_FONT, size, lh);
    const next = Math.max(12, Math.floor(figure.clientWidth / cell.w));
    const key = `${size} ${cell.w} ${cell.h} ${next}`;
    if (key === metrics) return false;
    metrics = key;
    cols = next;
    rowPx = cell.h;
    pre.style.fontSize = `${size}px`;
    pre.style.lineHeight = `${cell.h}px`;
    return true;
  }

  /** Paints the cell buffer as text runs, one span per stretch of cells that share a tone and a route. */
  function draw(): void {
    const index = selected();
    const grids = props.routes.slice(0, 4).map((_, i) => processLayout(props, i, cols));
    const grid = grids[index] ?? processLayout(props, index, cols);
    // Every route reserves the tallest drawing, so choosing one never moves the controls below it.
    pre.style.minHeight = `${Math.max(grid.length, ...grids.map((rows) => rows.length)) * rowPx}px`;
    const frag = document.createDocumentFragment();
    for (let y = 0; y < grid.length; y++) {
      const row = grid[y] ?? [];
      for (let x = 0; x < row.length; ) {
        const tone = row[x]?.t ?? "";
        const owner = row[x]?.r ?? -1;
        let text = "";
        while (x < row.length && (row[x]?.t ?? "") === tone && (row[x]?.r ?? -1) === owner) {
          const k = row[x++];
          text += !k ? " " : k.c !== " " ? k.c : PROCESS_LINES.charAt(k.l);
        }
        if (!tone) frag.append(text);
        else {
          const span = make("span", "", frag);
          span.setAttribute("data-tone", tone);
          if (owner >= 0) span.setAttribute("data-route-index", String(owner));
          span.textContent = text;
        }
      }
      if (y < grid.length - 1) frag.append("\n");
    }
    pre.replaceChildren(frag);
  }

  /** Applies the props and the selection: the host's name, the caption, the pressed choice, the route that
   *  assistive technology reads, and the drawing. */
  function sync(): void {
    const label = props.label.trim();
    const decision = props.decision.trim();
    const index = selected();
    const item = props.routes[index];
    attrs.set("role", label ? "region" : null);
    attrs.set("aria-label", label || null);
    caption.textContent = label;
    if (label) figure.append(caption);
    else caption.remove();
    if (decision) choices.setAttribute("aria-label", decision);
    else choices.removeAttribute("aria-label");
    buttons.forEach((button, i) => button.setAttribute("aria-pressed", String(i === index)));
    if (item) figure.setAttribute("data-selected", String(index));
    else figure.removeAttribute("data-selected");
    const steps = item ? [props.start, ...item.steps].filter((text) => text.trim()) : [];
    const end = item ? item.outcome.trim() : "No routes";
    const key = JSON.stringify([steps, end]);
    if (key !== listed) {
      listed = key;
      const list = make("ol");
      for (const text of steps) make("li", "", list).textContent = text;
      const outcome = make("p");
      outcome.textContent = end;
      route.replaceChildren(...(steps.length ? [list] : []), ...(end ? [outcome] : []));
    }
    draw();
    attrs.set("data-pica-ready", "true");
  }

  const relayout = (): void => {
    if (measure()) draw();
  };
  // A redraw changes the host's height, so it runs in a task of its own rather than inside the observer's
  // callback, where the new height would leave a notification undelivered.
  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(() => {
    clearTimeout(pending);
    pending = setTimeout(relayout);
  }) : null;
  pre.addEventListener("click", (event) => {
    const hit = (event.target as Element).closest("[data-route-index]");
    if (hit && pre.contains(hit)) choose(Number(hit.getAttribute("data-route-index")));
  });
  build();
  measure();
  sync();
  observer?.observe(host);
  document.fonts.addEventListener("loadingdone", relayout);

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (sameJson(before, props)) return;
      if (!sameJson(before.routes, props.routes)) build();
      measure();
      sync();
    },
    destroy() {
      clearTimeout(pending);
      observer?.disconnect();
      document.fonts.removeEventListener("loadingdone", relayout);
      figure.remove();
      choices.remove();
      route.remove();
      sheet.destroy();
      attrs.restore();
    },
  };
};
