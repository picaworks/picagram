import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-orbit-trails",
  title: "ASCII Orbit Trails",
  category: "ascii",
  description: "A small family of glyph markers follows offset elliptical paths with short fading trails in an open field.",
  tags: ["orbits", "trails", "ellipses", "glyph-grid", "motion"],
  facets: ["animated"],
  wave: 16,
  release: "motion-materials-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg", "accent"],
  presets: [
    { name: "Passing Quartet", description: "Four distinct arcs move gently through a spacious field.", props: { orbits: 4, trail: 4.8, inclination: 55, speed: 0.65, fontSize: 13 } },
    { name: "Parallel Duet", description: "Two low ellipses leave longer, nearly parallel strokes.", props: { orbits: 2, trail: 8, inclination: 12, speed: 0.5, fontSize: 14 } },
    { name: "Crossing Sextet", description: "Six steeply inclined paths exchange short, clear trails.", props: { orbits: 6, trail: 2.8, inclination: 80, speed: 0.8, fontSize: 12 } },
  ],
  controls: {
    orbits: { type: "number", min: 1, max: 7, step: 1 },
    trail: { type: "number", min: 0.5, max: 9, step: 0.1 },
    inclination: { type: "number", min: 0, max: 85, step: 1 },
    speed: { type: "number", min: 0, max: 2, step: 0.05 },
    fontSize: { type: "number", min: 11, max: 20, step: 1 },
    paused: { type: "boolean" },
    time: { type: "number", min: 0, max: 120000, step: 100 },
    seed: { type: "number", min: 1, max: 100, step: 1 },
  },
  credits: [],
  original: true,
};
