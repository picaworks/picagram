import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-catenary-net",
  title: "ASCII Catenary Net",
  category: "ascii",
  description: "Curved braille cables and transverse ties form a finite hanging net between two upright posts, with fixed attachment rings and a low travelling wave.",
  tags: ["catenary", "hammock", "net", "braille", "tension", "animated"],
  facets: ["animated"],
  wave: 18,
  release: "mechanisms-surfaces-2026-11-14",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    sag: { type: "number", min: 0.2, max: 0.6, step: 0.05, label: "Cable sag" },
    strands: { type: "number", min: 5, max: 10, step: 1, label: "Longitudinal cables" },
    sway: { type: "number", min: 0.05, max: 0.2, step: 0.05, label: "Tension wave amplitude" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Tension wave speed" },
    fontSize: { type: "number", min: 14, max: 20, step: 1, label: "Glyph size" },
    paused: { type: "boolean", label: "Pause tension wave" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Net orientation seed" },
  },
  presets: [
    {
      name: "Suspended mesh",
      description: "Seven cables hang at a moderate depth as a small wave travels through their tied center.",
      props: { sag: 0.4, strands: 7, sway: 0.1, speed: 0.75, fontSize: 16, seed: 1 },
    },
    {
      name: "Taut crossing",
      description: "Five shallow cables leave generous openings between ties, with a quieter and slower wave.",
      props: { sag: 0.25, strands: 5, sway: 0.05, speed: 0.5, fontSize: 16, seed: 4 },
    },
    {
      name: "Deep sling",
      description: "Nine cables form a deeper hammock with a more visible travelling tension wave.",
      props: { sag: 0.55, strands: 9, sway: 0.15, speed: 0.9, fontSize: 14, seed: 7 },
    },
  ],
  original: true,
  credits: [],
};
