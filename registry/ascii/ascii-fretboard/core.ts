import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, styleHost } from "../../../lib/host";
import { changed } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface AsciiFretboardProps {
  /** Open-string MIDI pitches, in display order from top to bottom; at most 12 strings. */
  tuning: number[];
  /** Last fret displayed, from 1 to 24; fret zero is always included. */
  frets: number;
  /** Scale intervals in semitones relative to root; values wrap into one octave. */
  intervals: number[];
  /** Root pitch class, with C = 0, C sharp = 1, through B = 11; values wrap. */
  root: number;
  /** Accessible name; an empty name hides the diagram from assistive technology. */
  label: string;
}

export const defaults: AsciiFretboardProps = {
  tuning: [64, 59, 55, 50, 45, 40],
  frets: 12,
  intervals: [0, 2, 4, 5, 7, 9, 11],
  root: 0,
  label: "Fretboard",
};

const FRETBOARD_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function fretboardClass(value: number): number {
  return ((Math.round(value) % 12) + 12) % 12;
}

function fretboardPitchName(pitch: number): string {
  return `${FRETBOARD_NAMES[fretboardClass(pitch)]}${Math.floor(pitch / 12) - 1}`;
}

function fretboardElement<K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.setAttribute("data-pica", "");
  return element;
}

export const mount: Mount<AsciiFretboardProps> = (host, initial = {}) => {
  let props: AsciiFretboardProps = { ...defaults, ...initial };
  let alive = true;
  const attributes = hostAttributes(host);
  const restore = styleHost(host, {
    display: "grid",
    "place-items": "center",
    "background-color": cssVar("bg"),
  });
  const viewport = fretboardElement("div");
  viewport.setAttribute("aria-hidden", "true");
  viewport.style.cssText = "width:max-content;max-width:100%;min-width:0;box-sizing:border-box;overflow:auto;padding:1em;";
  const drawing = fretboardElement("pre");
  drawing.style.cssText = `margin:0;width:max-content;font-family:${GRID_FONT};font-size:inherit;line-height:1.6;white-space:pre;letter-spacing:0;font-kerning:none;font-variant-ligatures:none;color:${cssVar("fg")};`;
  viewport.append(drawing);
  const table = fretboardElement("table");
  table.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0;";
  host.append(viewport, table);

  function accessibility(): void {
    const label = props.label.trim();
    attributes.set("role", "group");
    attributes.set("aria-label", label || null);
    attributes.set("aria-hidden", label ? null : "true");
  }

  function draw(): void {
    if (!alive) return;
    const fretCount = Math.min(24, Math.max(1, Number.isFinite(props.frets) ? Math.round(props.frets) : defaults.frets));
    const root = fretboardClass(Number.isFinite(props.root) ? props.root : defaults.root);
    const tuning = props.tuning.slice(0, 12).map((pitch) => Number.isFinite(pitch) ? Math.min(127, Math.max(0, Math.round(pitch))) : null);
    const intervals = new Set(props.intervals.filter(Number.isFinite).map(fretboardClass));
    const rootName = FRETBOARD_NAMES[root] ?? "C";
    drawing.replaceChildren();
    table.replaceChildren();

    function text(value: string, muted = false): void {
      const span = fretboardElement("span");
      span.textContent = value;
      if (muted) span.style.color = cssVar("muted");
      drawing.append(span);
    }

    text(`${rootName} / ${[...intervals].sort((a, b) => a - b).join(" ") || "no scale intervals"}\n\n`);
    text(" fret ");
    for (let fret = 0; fret <= fretCount; fret++) text(`${String(fret).padStart(3)} |`);
    text(`\n----++${"----+".repeat(fretCount + 1)}\n`, true);

    const caption = fretboardElement("caption");
    caption.textContent = `${rootName} scale, intervals ${[...intervals].sort((a, b) => a - b).join(", ") || "none"}. Open strings followed by frets 1 through ${fretCount}.`;
    const head = fretboardElement("thead");
    const header = fretboardElement("tr");
    const stringHeader = fretboardElement("th");
    stringHeader.scope = "col";
    stringHeader.textContent = "String";
    header.append(stringHeader);
    for (let fret = 0; fret <= fretCount; fret++) {
      const cell = fretboardElement("th");
      cell.scope = "col";
      cell.textContent = fret === 0 ? "Open" : `Fret ${fret}`;
      header.append(cell);
    }
    head.append(header);
    const body = fretboardElement("tbody");

    tuning.forEach((open, index) => {
      const row = fretboardElement("tr");
      const name = fretboardElement("th");
      name.scope = "row";
      name.textContent = `String ${index + 1}, ${open === null ? "invalid tuning" : fretboardPitchName(open)}`;
      row.append(name);
      text(`${(open === null ? "?" : fretboardPitchName(open)).padStart(4)}||`);
      for (let fret = 0; fret <= fretCount; fret++) {
        const pitch = open === null ? null : open + fret;
        const pitchClass = pitch === null ? null : fretboardClass(pitch);
        const included = pitchClass !== null && intervals.has(fretboardClass(pitchClass - root));
        const isRoot = included && pitchClass === root;
        const noteName = pitchClass === null ? "?" : FRETBOARD_NAMES[pitchClass] ?? "?";
        const glyph = pitch === null ? " ?? " : isRoot ? `[${noteName.padEnd(2)}]` : included ? `-${noteName.padEnd(2, "-")}-` : "----";
        text(glyph, !included);
        text("|", true);
        const cell = fretboardElement("td");
        cell.textContent = pitch === null ? "Invalid tuning" : `${fretboardPitchName(pitch)}${included ? isRoot ? ", root" : ", in scale" : ", outside scale"}`;
        row.append(cell);
      }
      text("\n");
      body.append(row);
    });
    if (!tuning.length) text("No strings: supply open-string MIDI pitches.\n");
    text(`----++${"----+".repeat(fretCount + 1)}\n`, true);
    text("[  ] root    -  - scale note    ---- outside scale");
    table.append(caption, head, body);
    attributes.set("data-pica-ready", "true");
  }

  accessibility();
  draw();

  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      if (before.label !== props.label) accessibility();
      if (changed(before, props, ["tuning", "frets", "intervals", "root"])) draw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      viewport.remove();
      table.remove();
      restore();
      attributes.restore();
    },
  };
};
