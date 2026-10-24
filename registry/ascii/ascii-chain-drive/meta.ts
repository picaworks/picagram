import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-chain-drive",
  title: "ASCII Chain Drive",
  category: "ascii",
  description: "A closed chain of discrete glyph links drives two unequal toothed sprockets through straight connecting runs.",
  tags: ["chain", "sprockets", "mechanism", "links", "braille", "animated"],
  facets: ["animated"],
  wave: 17,
  release: "kinetic-studies-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    ratio: { type: "number", min: 1.2, max: 2.2, step: 0.05, label: "Sprocket radius ratio" },
    links: { type: "number", min: 24, max: 56, step: 1, label: "Chain links" },
    tension: { type: "number", min: 0.5, max: 1.5, step: 0.05, label: "Chain tension and axle spacing" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Drive speed" },
    fontSize: { type: "number", min: 12, max: 20, step: 1, label: "Glyph size" },
    paused: { type: "boolean", label: "Pause motion" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Starting phase seed" },
  },
  presets: [
    {
      name: "Steady drive",
      description: "Thirty-six links travel around a medium ratio pair with clear straight runs.",
      props: { ratio: 1.6, links: 36, tension: 1, speed: 0.7, fontSize: 14, seed: 1 },
    },
    {
      name: "Close coupling",
      description: "Similar wheel sizes and a shorter axle spacing make a compact, coarse chain loop.",
      props: { ratio: 1.25, links: 28, tension: 0.55, speed: 0.5, fontSize: 16, seed: 4 },
    },
    {
      name: "Reduction stage",
      description: "A smaller driven sprocket turns faster within a longer, finer chain path.",
      props: { ratio: 2.1, links: 48, tension: 1.4, speed: 0.9, fontSize: 12, seed: 9 },
    },
  ],
  original: true,
  credits: [],
};
