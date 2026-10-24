import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-accordion-surface",
  title: "ASCII Accordion Surface",
  category: "ascii",
  description: "A rectangular glyph mesh tilts in perspective, with alternating density on its folded panels and one accented ridge.",
  tags: ["accordion", "fold", "mesh", "perspective", "braille", "animated"],
  facets: ["animated"],
  wave: 16,
  release: "motion-materials-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg", "muted", "accent"],
  capture: 3200,
  controls: {
    folds: { type: "number", min: 2, max: 9, step: 1 },
    depth: { type: "number", min: 0.15, max: 1.2, step: 0.05 },
    tilt: { type: "number", min: 15, max: 65, step: 1 },
    speed: { type: "number", min: 0, max: 2, step: 0.05 },
    fontSize: { type: "number", min: 10, max: 20, step: 1 },
    paused: { type: "boolean" },
    time: { type: "number", min: 0, max: 60000, step: 100 },
    seed: { type: "number", min: 1, max: 99, step: 1 },
  },
  presets: [
    {
      name: "Even pleats",
      description: "Five shallow fold pairs form an open mesh with a slow, modest tilt.",
      props: { folds: 5, depth: 0.85, tilt: 35, speed: 0.6, fontSize: 12, seed: 1 },
    },
    {
      name: "Broad hinges",
      description: "Two deep fold pairs make the alternating planes and zigzag edges prominent.",
      props: { folds: 2, depth: 1.15, tilt: 23, speed: 0.35, fontSize: 13, seed: 4 },
    },
    {
      name: "Fine fan",
      description: "Eight close fold pairs reveal a compressed, oblique surface with fine ridges.",
      props: { folds: 8, depth: 0.55, tilt: 57, speed: 0.8, fontSize: 11, seed: 9 },
    },
  ],
  original: true,
  credits: [],
};
