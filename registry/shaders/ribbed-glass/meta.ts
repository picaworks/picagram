import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ribbed-glass",
  title: "Ribbed Glass",
  category: "shaders",
  description: "Broad cylindrical ribs refract a fixed tilted line grid through a finite thick glass slab, with a rolled bevel and a restrained moving reflection.",
  tags: ["glass", "ribs", "refraction", "cylindrical", "material", "dither"],
  facets: ["animated", "shader", "webgl", "dither"],
  wave: 18,
  release: "mechanisms-surfaces-2026-11-14",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    ribs: { type: "number", min: 6, max: 18, step: 1, label: "Cylindrical ribs" },
    depth: { type: "number", min: 0.2, max: 0.65, step: 0.05, label: "Rib relief depth" },
    refraction: { type: "number", min: 0.15, max: 0.5, step: 0.05, label: "Index above air" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Reflection sweep speed" },
    intensity: { type: "number", min: 0.3, max: 0.75, step: 0.05, label: "Ink intensity" },
    paused: { type: "boolean", label: "Pause reflection" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Pane orientation seed" },
  },
  presets: [
    {
      name: "Fluted pane",
      description: "Ten rounded glass ribs carry a broad reflection and turning valleys above a quiet locally bent grid.",
      props: { ribs: 10, depth: 0.45, refraction: 0.35, speed: 0.65, intensity: 0.5, seed: 1 },
    },
    {
      name: "Broad casting",
      description: "Six deep cylindrical ribs expose broad curved faces, a rolled edge and a transparent lens effect.",
      props: { ribs: 6, depth: 0.6, refraction: 0.45, speed: 0.45, intensity: 0.55, seed: 4 },
    },
    {
      name: "Fine reeding",
      description: "Sixteen finer rounded ribs show a restrained repeated curvature while gently bending the underlay.",
      props: { ribs: 16, depth: 0.25, refraction: 0.2, speed: 0.85, intensity: 0.4, seed: 7 },
    },
  ],
  original: true,
  credits: [],
};
