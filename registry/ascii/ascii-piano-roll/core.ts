import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, scope, styleHost } from "../../../lib/host";
import { changed } from "../../../lib/json";
import { cssOn, cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface AsciiPianoRollNote {
  /** Unique, stable identifier used by selection. */
  id: string;
  /** Pitch label matching an entry in pitches. */
  pitch: string;
  /** Starting beat, measured from zero. */
  start: number;
  /** Note length in beats; positive durations occupy at least one cell. */
  duration: number;
}

export interface AsciiPianoRollProps {
  /** Notes to draw; out-of-range notes are clipped and invalid notes are omitted. */
  notes: AsciiPianoRollNote[];
  /** Visible beat count, from 1 to 32. */
  beats: number;
  /** Pitch rows in display order, from top to bottom. */
  pitches: string[];
  /** Selected note ID; null enables internal selection. An empty string clears selection. */
  value: string | null;
  /** Initial selected note ID, read once when mounting in uncontrolled mode. */
  defaultValue: string;
  /** Horizontal cells per beat, from 2 to 12; durations snap outward to cell boundaries. */
  cellsPerBeat: number;
  /** Accessible name for the roll; an empty name hides it from assistive technology. */
  label: string;
  /** Monospace glyph size in CSS pixels, from 10 to 24. */
  fontSize: number;
}

export interface AsciiPianoRollEvents {
  /** Selected note ID, emitted only after pointer or keyboard input. */
  valueChange: string;
  /** The supplied note's musical values and original array index. */
  noteSelect: AsciiPianoRollNote & { index: number };
}

export const defaults: AsciiPianoRollProps = {
  notes: [
    { id: "lead-1", pitch: "G4", start: 0, duration: 1.5 },
    { id: "lead-2", pitch: "A4", start: 1.5, duration: 0.5 },
    { id: "lead-3", pitch: "C5", start: 2, duration: 1 },
    { id: "lead-4", pitch: "B4", start: 3, duration: 1 },
    { id: "lead-5", pitch: "G4", start: 4, duration: 1.5 },
    { id: "lead-6", pitch: "E4", start: 5.5, duration: 0.5 },
    { id: "lead-7", pitch: "D4", start: 6, duration: 1 },
    { id: "lead-8", pitch: "C4", start: 7, duration: 1 },
    { id: "bass-1", pitch: "C4", start: 0, duration: 3 },
  ],
  beats: 8,
  pitches: ["C5", "B4", "A4", "G4", "F4", "E4", "D4", "C4"],
  value: null,
  defaultValue: "lead-1",
  cellsPerBeat: 4,
  label: "Piano roll. Select a note to inspect its pitch, start, and duration.",
  fontSize: 14,
};

interface PianoRollPlacedNote {
  note: AsciiPianoRollNote;
  index: number;
  row: number;
  button: HTMLButtonElement;
}

function pianoRollNumber(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

function pianoRollElement<K extends keyof HTMLElementTagNameMap>(tag: K, part: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.setAttribute("data-pica", "");
  element.setAttribute("data-piano-part", part);
  return element;
}

export const mount: Mount<AsciiPianoRollProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let internalValue = props.defaultValue;
  let focusedId = "";
  let alive = true;
  let placed: PianoRollPlacedNote[] = [];
  const attributes = hostAttributes(host);
  // Preserve a possible pre-existing scope attribute for exact teardown.
  attributes.set("data-pica-id", host.getAttribute("data-pica-id"));
  const styles = scope(host);
  const selector = styles.selector;
  const restore = styleHost(host, {
    display: "grid",
    "place-items": "center",
    "background-color": cssVar("bg"),
  });
  const viewport = pianoRollElement("div", "viewport");
  const roll = pianoRollElement("div", "roll");
  viewport.append(roll);
  host.append(viewport);
  const emit = emitter<AsciiPianoRollEvents>(host);

  styles.setRules(`
    ${selector} [data-piano-part="viewport"] { width:100%; max-height:100%; min-width:0; overflow:auto; overscroll-behavior:contain; }
    ${selector} [data-piano-part="roll"] { display:grid; width:max-content; margin:0 auto; font-family:${GRID_FONT}; line-height:1.8; color:${cssVar("fg")}; padding:1ch; }
    ${selector} [data-piano-part="pitch"], ${selector} [data-piano-part="beats"], ${selector} [data-piano-part="ruler"], ${selector} [data-piano-part="track"] { white-space:pre; min-width:0; pointer-events:none; }
    ${selector} [data-piano-part="pitch"] { text-align:right; padding-right:1ch; }
    ${selector} [data-piano-part="beats"] { color:${cssVar("fg")}; }
    ${selector} [data-piano-part="ruler"], ${selector} [data-piano-part="track"] { color:${cssVar("muted")}; }
    ${selector} [data-piano-part="note"] { appearance:none; box-sizing:border-box; min-width:0; padding:0; margin:0; border:0; border-radius:0; font:inherit; line-height:inherit; white-space:pre; text-align:left; cursor:pointer; color:${cssVar("fg")}; background:transparent; overflow:hidden; position:relative; }
    ${selector} [data-piano-part="note"][aria-pressed="true"] { color:${cssOn("accent")}; background:${cssVar("accent")}; z-index:2; }
    ${selector} [data-piano-part="note"]:hover { text-decoration:underline; }
    ${selector} [data-piano-part="note"]:focus-visible { outline:1px solid ${cssVar("fg")}; outline-offset:0; z-index:3; }
  `);

  function accessibility(): void {
    const label = props.label.trim();
    attributes.set("role", label ? "group" : null);
    attributes.set("aria-label", label || null);
    attributes.set("aria-hidden", label ? null : "true");
  }

  function selection(): string {
    return props.value === null ? internalValue : props.value;
  }

  function synchronize(): void {
    const selected = selection();
    if (!placed.some((item) => item.note.id === focusedId)) {
      focusedId = placed.find((item) => item.note.id === selected)?.note.id ?? placed[0]?.note.id ?? "";
    }
    for (const item of placed) {
      item.button.setAttribute("aria-pressed", String(item.note.id === selected));
      item.button.tabIndex = item.note.id === focusedId ? 0 : -1;
    }
  }

  function select(item: PianoRollPlacedNote): void {
    const detail = { ...item.note, index: item.index };
    focusedId = item.note.id;
    if (props.value === null) internalValue = item.note.id;
    synchronize();
    emit("valueChange", item.note.id);
    emit("noteSelect", detail);
  }

  function render(): void {
    const hadFocus = roll.contains(document.activeElement);
    const beats = Math.round(pianoRollNumber(props.beats, 8, 1, 32));
    const resolution = Math.round(pianoRollNumber(props.cellsPerBeat, 4, 2, 12));
    const columns = beats * resolution;
    const pitches = (Array.isArray(props.pitches) ? props.pitches : [])
      .filter((pitch): pitch is string => typeof pitch === "string" && pitch.trim().length > 0)
      .filter((pitch, index, all) => all.indexOf(pitch) === index).slice(0, 32);
    const gutter = Math.max(4, ...pitches.map((pitch) => [...pitch].length + 1));
    roll.style.gridTemplateColumns = `${gutter}ch repeat(${columns}, 1ch)`;
    roll.style.gridTemplateRows = `repeat(${pitches.length + 2}, 1.8em)`;
    roll.style.fontSize = `${pianoRollNumber(props.fontSize, 14, 10, 24)}px`;
    roll.replaceChildren();
    placed = [];

    const beatLabel = pianoRollElement("span", "beats");
    const ruler = pianoRollElement("span", "ruler");
    let beatText = "";
    for (let beat = 0; beat < beats; beat++) beatText += String(beat + 1).padEnd(resolution, " ");
    beatLabel.textContent = beatText;
    ruler.textContent = ("+" + "-".repeat(resolution - 1)).repeat(beats);
    beatLabel.style.gridArea = `1 / 2 / 2 / ${columns + 2}`;
    ruler.style.gridArea = `2 / 2 / 3 / ${columns + 2}`;
    beatLabel.setAttribute("aria-hidden", "true");
    ruler.setAttribute("aria-hidden", "true");
    roll.append(beatLabel, ruler);

    pitches.forEach((pitch, index) => {
      const label = pianoRollElement("span", "pitch");
      const track = pianoRollElement("span", "track");
      label.textContent = pitch;
      label.style.gridArea = `${index + 3} / 1`;
      label.setAttribute("aria-hidden", "true");
      track.textContent = ("|" + ".".repeat(resolution - 1)).repeat(beats);
      track.style.gridArea = `${index + 3} / 2 / ${index + 4} / ${columns + 2}`;
      track.setAttribute("aria-hidden", "true");
      roll.append(label, track);
    });

    const ids = new Set<string>();
    const notes = Array.isArray(props.notes) ? props.notes : [];
    notes.slice(0, 512).forEach((raw, index) => {
      if (!raw || typeof raw.id !== "string" || !raw.id || ids.has(raw.id)) return;
      const row = pitches.indexOf(raw.pitch);
      if (row < 0 || !Number.isFinite(raw.start) || !Number.isFinite(raw.duration) || raw.duration <= 0) return;
      const end = raw.start + raw.duration;
      if (end <= 0 || raw.start >= beats) return;
      ids.add(raw.id);
      const cell = Math.max(0, Math.floor(raw.start * resolution));
      const last = Math.min(columns, Math.ceil(end * resolution));
      const width = Math.max(1, last - cell);
      const note: AsciiPianoRollNote = { id: raw.id, pitch: raw.pitch, start: raw.start, duration: raw.duration };
      const button = pianoRollElement("button", "note");
      button.type = "button";
      button.setAttribute("data-note-id", note.id);
      button.setAttribute("aria-label", `${note.pitch}, starts at beat ${note.start + 1}, duration ${note.duration} ${note.duration === 1 ? "beat" : "beats"}`);
      button.title = `${note.pitch} · beat ${note.start + 1} · ${note.duration} beats`;
      button.textContent = width === 1 ? "#" : "[" + "=".repeat(width - 2) + "]";
      button.style.gridArea = `${row + 3} / ${cell + 2} / ${row + 4} / span ${width}`;
      placed.push({ note, index, row, button });
      roll.append(button);
    });
    placed.sort((a, b) => a.note.start - b.note.start || a.row - b.row || a.index - b.index);
    synchronize();
    if (hadFocus) placed.find((item) => item.note.id === focusedId)?.button.focus({ preventScroll: true });
    attributes.set("data-pica-ready", "true");
  }

  function inputItem(event: Event): PianoRollPlacedNote | undefined {
    const target = event.target;
    return target instanceof Element ? placed.find((item) => item.button === target.closest("[data-piano-part='note']")) : undefined;
  }

  function click(event: MouseEvent): void {
    const item = inputItem(event);
    if (item) select(item);
  }

  function focus(event: FocusEvent): void {
    const item = inputItem(event);
    if (item) {
      focusedId = item.note.id;
      synchronize();
    }
  }

  function keyboard(event: KeyboardEvent): void {
    const current = inputItem(event);
    if (!current) return;
    let next: PianoRollPlacedNote | undefined;
    if (event.key === "Home") next = placed[0];
    else if (event.key === "End") next = placed[placed.length - 1];
    else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      next = placed.filter((item) => (item.note.start - current.note.start) * direction > 0)
        .sort((a, b) => Math.abs(a.note.start - current.note.start) - Math.abs(b.note.start - current.note.start) || Math.abs(a.row - current.row) - Math.abs(b.row - current.row))[0];
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const direction = event.key === "ArrowUp" ? -1 : 1;
      next = placed.filter((item) => (item.row - current.row) * direction > 0)
        .sort((a, b) => Math.abs(a.row - current.row) - Math.abs(b.row - current.row) || Math.abs(a.note.start - current.note.start) - Math.abs(b.note.start - current.note.start))[0];
    } else return;
    event.preventDefault();
    if (next) {
      next.button.focus({ preventScroll: true });
      next.button.scrollIntoView({ block: "nearest", inline: "nearest" });
      select(next);
    }
  }

  roll.addEventListener("click", click);
  roll.addEventListener("focusin", focus);
  roll.addEventListener("keydown", keyboard);
  accessibility();
  render();

  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      if (before.label !== props.label) accessibility();
      if (changed(before, props, ["notes", "pitches", "beats", "cellsPerBeat"])) render();
      else {
        if (before.fontSize !== props.fontSize) roll.style.fontSize = `${pianoRollNumber(props.fontSize, 14, 10, 24)}px`;
        synchronize();
      }
    },
    destroy() {
      if (!alive) return;
      alive = false;
      roll.removeEventListener("click", click);
      roll.removeEventListener("focusin", focus);
      roll.removeEventListener("keydown", keyboard);
      viewport.remove();
      styles.destroy();
      restore();
      attributes.restore();
      placed = [];
    },
  };
};
