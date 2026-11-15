import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-screw-conveyor",
  title: "ASCII Screw Conveyor",
  category: "ascii",
  description: "Broad continuous screw flights turn around a diagonal shaft between two bearing blocks, carrying three tiny solid loads inside a lower trough.",
  tags: ["screw", "conveyor", "auger", "mechanism", "braille", "animated"],
  facets: ["animated"],
  wave: 18,
  release: "mechanisms-surfaces-2026-11-14",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    turns: { type: "number", min: 2, max: 5, step: 1, label: "Complete flights" },
    pitch: { type: "number", min: 0.7, max: 1.3, step: 0.05, label: "Flight spacing" },
    angle: { type: "number", min: 15, max: 65, step: 1, label: "Shaft angle" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Conveyor speed" },
    fontSize: { type: "number", min: 14, max: 20, step: 1, label: "Glyph size" },
    paused: { type: "boolean", label: "Pause conveyor" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Starting rotation seed" },
  },
  presets: [
    {
      name: "Workshop feed",
      description: "Three broad flights turn at a gentle diagonal while three small loads move along the lower trough.",
      props: { turns: 3, pitch: 1, angle: 35, speed: 0.7, fontSize: 16, seed: 1 },
    },
    {
      name: "Wide flights",
      description: "Two widely spaced turns expose the shaft and broad radial sheets at a shallow loading angle.",
      props: { turns: 2, pitch: 1.25, angle: 20, speed: 0.5, fontSize: 18, seed: 4 },
    },
    {
      name: "Uphill grain",
      description: "Five closely spaced flights form a taller conveyor with a steep shaft and compact payload marks.",
      props: { turns: 5, pitch: 0.75, angle: 60, speed: 0.85, fontSize: 14, seed: 7 },
    },
  ],
  original: true,
  credits: [],
};
