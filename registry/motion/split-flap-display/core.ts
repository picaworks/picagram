import { animatedText } from "../../../lib/a11y";
import { GRID_FONT } from "../../../lib/font";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import { createRng, hashSeed } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

export interface SplitFlapDisplayProps extends MotionProps {
  /** The label to show. Assistive technology reads it whole, and every cell lands on its own character. */
  text: string;
  /** Milliseconds one cell takes to turn through the whole drum. A cell turns only as far as its glyph needs, so most changes finish sooner. */
  duration: number;
  /** The drum: the glyphs in the order a cell turns through them. A cell only turns forward, and a character the drum lacks becomes one last flap. */
  chars: string;
  /** A small caption above the cells, read before the text and set in the host's own font. Empty shows none. */
  label: string;
}

export const defaults: SplitFlapDisplayProps = {
  text: "SPLIT FLAP",
  duration: 2400,
  // A blank flap first, so a cell at rest is empty, then letters, digits, and the marks a time or a code needs.
  chars: " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:.-",
  label: "",
  paused: false,
  time: null,
  seed: 1,
};

/** Frames per second a turn is sampled at. A flap is a glyph swap, so this only bounds how finely it is drawn. */
const FPS = 30;
/** The longest a cell waits before its first flap, as a share of the duration. Each cell draws its own wait from the seed. */
const STAGGER = 0.15;
/** The animation time reduced motion holds: far past every landing, so each cell rests on its own character. */
const RESTING = 1e9;
const WHITESPACE = /\s/;

const EDGE = `color-mix(in srgb,${cssVar("muted")} 55%,transparent)`;
const HINGE = `color-mix(in srgb,${cssVar("muted")} 35%,transparent)`;
const ROW = `display:flex;flex-wrap:wrap;gap:2px;max-width:100%;user-select:none;font-family:${GRID_FONT}`;
/** One flap: a fixed box, so the row stays on a grid whatever it shows, with a hairline hinge across its middle. */
const CELL = [
  "box-sizing:border-box",
  "flex:none",
  "width:.95em",
  "height:1.4em",
  "line-height:calc(1.4em - 2px)",
  "text-align:center",
  `color:${cssVar("fg")}`,
  `border:1px solid ${EDGE}`,
  `background:linear-gradient(transparent calc(50% - .5px),${HINGE} calc(50% - .5px) calc(50% + .5px),transparent calc(50% + .5px)),${cssVar("bg")}`,
].join(";");
const CAPTION = `display:block;margin-bottom:.6em;font-size:max(.4em,11px);line-height:1.2;letter-spacing:.04em;text-transform:uppercase;color:${cssVar("muted")}`;

/** How one cell gets from the glyph it shows to the one it must land on. */
interface Turn {
  /** The glyph it shows until its first flap. */
  from: string;
  /** Every glyph it turns through, ending on the one it lands on. Empty when it already shows that glyph. */
  path: readonly string[];
  /** Milliseconds it waits before its first flap. */
  wait: number;
}

/** The drum as single glyphs, each once, falling back to the default drum when empty. */
function toDrum(chars: string): string[] {
  return [...new Set(chars.length > 0 ? chars : defaults.chars)];
}

/** A text as one glyph per cell. Any whitespace is a blank flap. */
function toGlyphs(text: string): string[] {
  return Array.from(text, (ch) => (WHITESPACE.test(ch) ? " " : ch));
}

/** The glyphs a cell shows, in order, turning forward from `from` until it lands on `to`. A glyph the drum
 *  lacks is one last flap after the rest of the drum. */
function route(drum: readonly string[], from: string, to: string): string[] {
  const out: string[] = [];
  if (from === to) return out;
  const goal = drum.indexOf(to);
  let at = drum.indexOf(from);
  if (goal < 0) {
    for (at += 1; at < drum.length; at++) out.push(drum[at] ?? to);
    out.push(to);
    return out;
  }
  do {
    at = (at + 1) % drum.length;
    out.push(drum[at] ?? to);
  } while (at !== goal);
  return out;
}

export const mount: Mount<SplitFlapDisplayProps> = (host, initial = {}) => {
  let props: SplitFlapDisplayProps = { ...defaults, ...initial };
  let drum = toDrum(props.chars);
  let target = toGlyphs(props.text);
  // What each cell showed when the current change began. A cell with no entry begins on the blank flap.
  let origin: string[] = [];
  let turns: Turn[] = [];
  let flapMs = 1;
  let changes = 0;
  let settled = false;
  let loop: Loop | null = null;
  let caption: HTMLElement | null = null;
  const cells: HTMLElement[] = [];
  const shown: string[] = [];

  // The host keeps no role, so a heading around it stays a heading. Assistive technology reads the final
  // text from a hidden copy, and the cells draw into a layer hidden from it.
  const text = animatedText(host, props.text);
  const row = text.layer;
  row.style.cssText = ROW;

  /** Adds or removes cells until the row has one per glyph. */
  function fit(count: number): void {
    while (cells.length < count) {
      const cell = document.createElement("span");
      cell.setAttribute("data-pica", "");
      cell.style.cssText = CELL;
      row.append(cell);
      cells.push(cell);
      shown.push("");
    }
    while (cells.length > count) {
      cells.pop()?.remove();
      shown.pop();
    }
  }

  /** Shows the caption, or removes it when the label is empty. It sits first, so it is read first. */
  function setCaption(): void {
    if (props.label === "") {
      caption?.remove();
      caption = null;
      return;
    }
    if (!caption) {
      caption = document.createElement("span");
      caption.setAttribute("data-pica", "");
      caption.style.cssText = CAPTION;
      host.prepend(caption);
    }
    caption.textContent = props.label;
  }

  /** Works out each cell's turn from `origin` to `target`. A cell that already shows its glyph has no turn,
   *  so it never moves. Every cell flips at the same speed, so the ones with less to turn land first. */
  function plan(): void {
    const blank = drum[0] ?? " ";
    flapMs = Math.max(1, props.duration / drum.length);
    turns = target.map((to, i) => {
      const from = origin[i] || blank;
      const path = route(drum, from, to);
      const wait = path.length > 0 ? createRng(hashSeed(props.seed, i, changes))() * props.duration * STAGGER : 0;
      return { from, path, wait };
    });
  }

  /** The glyph cell `i` shows `t` milliseconds into the change. */
  function glyphAt(i: number, t: number): string {
    const turn = turns[i];
    const to = target[i] ?? " ";
    if (!turn || turn.path.length === 0) return to;
    if (!(t >= turn.wait)) return turn.from;
    const flaps = Math.min(turn.path.length, Math.floor((t - turn.wait) / flapMs) + 1);
    return turn.path[flaps - 1] ?? to;
  }

  /** Holds the loop once every cell has landed, so a settled board costs no frames, and releases it on the
   *  next change. The paused prop holds it either way. */
  function hold(): void {
    loop?.update({ paused: props.paused || settled });
  }

  function draw(t: number): void {
    let pending = 0;
    for (const [i, cell] of cells.entries()) {
      const glyph = glyphAt(i, t);
      if (glyph !== target[i]) pending++;
      if (glyph !== shown[i]) {
        shown[i] = glyph;
        cell.textContent = glyph;
      }
    }
    if ((pending === 0) !== settled) {
      settled = pending === 0;
      hold();
    }
    if (host.dataset.picaReady !== "true") host.dataset.picaReady = "true";
  }

  /** Starts a change from what the cells show now to the new text, on a clock that starts again at zero. A
   *  pinned time then shows that moment of this change. */
  function begin(): void {
    origin = shown.slice();
    target = toGlyphs(props.text);
    changes += 1;
    fit(target.length);
    plan();
    settled = false;
    loop?.update({ time: 0 });
    loop?.update({ time: props.time, paused: props.paused || settled });
    loop?.redraw();
  }

  setCaption();
  fit(target.length);
  plan();
  // The first change is the board coming up: every cell begins on the blank flap and turns to its glyph.
  loop = createLoop({ el: host, fps: FPS, paused: props.paused, time: props.time, still: RESTING, frame: draw });
  if (settled) hold();

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.label !== before.label) setCaption();
      if (props.chars !== before.chars) drum = toDrum(props.chars);
      if (props.text !== before.text) {
        text.setText(props.text);
        begin();
        return;
      }
      // A settled board has nothing left to turn, so a new speed, seed, or drum applies from the next change.
      if (!settled && (props.chars !== before.chars || props.duration !== before.duration || props.seed !== before.seed)) plan();
      loop?.update({ time: props.time, paused: props.paused || settled });
    },
    destroy() {
      loop?.destroy();
      loop = null;
      text.remove();
      caption?.remove();
      delete host.dataset.picaReady;
    },
  };
};
