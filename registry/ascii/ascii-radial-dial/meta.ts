import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-radial-dial",
  title: "ASCII Radial Dial",
  category: "ascii",
  description: "Broken concentric glyph rings turn at unequal slow rates around a clear opening, with staggered gaps and one accent arc.",
  tags: ["radial", "rings", "arcs", "braille", "rotation"],
  facets: ["animated"],
  wave: 16,
  release: "motion-materials-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg", "muted", "accent"],
  capture: 2400,
  presets: [
    {
      name: "Open mechanism",
      description: "Four staggered rings balance a generous central opening with long broken arcs.",
      props: { rings: 4, segments: 5, opening: 0.36, speed: 0.55, fontSize: 16, seed: 1 },
    },
    {
      name: "Wide aperture",
      description: "Three widely open rings use broad arc segments and a gentler turn.",
      props: { rings: 3, segments: 3, opening: 0.62, speed: 0.32, fontSize: 18, seed: 4 },
    },
    {
      name: "Fine teeth",
      description: "Six rings of shorter segments form a more intricate annulus around a smaller opening.",
      props: { rings: 6, segments: 9, opening: 0.24, speed: 0.8, fontSize: 14, seed: 7 },
    },
  ],
  controls: {
    rings: { type: "number", min: 2, max: 6, step: 1 },
    segments: { type: "number", min: 3, max: 12, step: 1 },
    opening: { type: "number", min: 0.2, max: 0.65, step: 0.01 },
    speed: { type: "number", min: 0, max: 2, step: 0.01 },
    fontSize: { type: "number", min: 12, max: 22, step: 1 },
    paused: { type: "boolean" },
    time: { type: "number", min: 0, max: 120000, step: 100 },
    seed: { type: "number", min: 0, max: 100, step: 1 },
  },
  original: true,
  credits: [],
};
