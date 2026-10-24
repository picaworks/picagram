import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-mobius-band",
  title: "ASCII Mobius Band",
  category: "ascii",
  description: "A broad shaded glyph ribbon turns in three dimensions, revealing one continuous half twist around an open center.",
  tags: ["mobius", "ribbon", "surface", "shading", "braille", "animated"],
  facets: ["animated"],
  wave: 17,
  release: "kinetic-studies-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    width: { type: "number", min: 0.25, max: 0.6, step: 0.05 },
    tilt: { type: "number", min: 15, max: 65, step: 1 },
    speed: { type: "number", min: 0, max: 2, step: 0.05 },
    fontSize: { type: "number", min: 12, max: 20, step: 1 },
    paused: { type: "boolean" },
    time: { type: "number", min: 0, max: 60000, step: 100 },
    seed: { type: "number", min: 1, max: 99, step: 1 },
  },
  presets: [
    {
      name: "Open ribbon",
      description: "A broad band shows its half twist and a generous open center at a calm turning rate.",
      props: { width: 0.45, tilt: 42, speed: 0.6, fontSize: 14, seed: 1 },
    },
    {
      name: "Deep fold",
      description: "A wider ribbon and oblique view emphasize the shaded overlap of the continuous surface.",
      props: { width: 0.55, tilt: 55, speed: 0.4, fontSize: 14, seed: 3 },
    },
    {
      name: "Airy loop",
      description: "A narrower strip opens the center and makes the single twist easy to follow.",
      props: { width: 0.3, tilt: 25, speed: 0.75, fontSize: 16, seed: 5 },
    },
  ],
  original: true,
  credits: [],
};
