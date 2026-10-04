import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-fretboard",
  title: "ASCII Fretboard",
  category: "ascii",
  description: "A monospace fretboard maps MIDI string tuning and root-relative scale intervals to real pitches, marking roots with brackets.",
  tags: ["music", "pitch", "scale", "guitar", "fretboard"],
  facets: ["static", "text", "chart"],
  wave: 15,
  release: "components-2026-10-04",
  animated: false,
  decorative: false,
  palette: ["fg", "bg", "muted"],
  controls: {
    tuning: { type: "numbers", label: "Open pitches (MIDI, top to bottom)" },
    frets: { type: "number", min: 1, max: 24, step: 1 },
    intervals: { type: "numbers", label: "Scale intervals (semitones)" },
    root: { type: "number", min: 0, max: 11, step: 1, label: "Root (C = 0)" },
    label: { type: "string" },
  },
  credits: [],
  original: true,
};
