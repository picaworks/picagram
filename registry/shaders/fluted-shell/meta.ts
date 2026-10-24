import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "fluted-shell",
  title: "Fluted Shell",
  category: "shaders",
  description: "A bounded concave shell carries radial flutes and a scalloped rim above a fixed hinge under slowly moving light.",
  tags: ["shell", "fan", "flutes", "scalloped", "concavity", "dither"],
  facets: ["animated", "background", "shader", "webgl", "dither"],
  wave: 17,
  release: "kinetic-studies-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    flutes: { type: "number", min: 6, max: 24, step: 1, label: "Radial flutes" },
    concavity: { type: "number", min: 0.25, max: 1.5, step: 0.05, label: "Bowl concavity" },
    spread: { type: "number", min: 80, max: 140, step: 5, label: "Fan spread in degrees" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Directional light speed" },
    intensity: { type: "number", min: 0.2, max: 1, step: 0.05, label: "Ink intensity" },
    paused: { type: "boolean", label: "Pause light" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 9999, step: 1, label: "Light and grain seed" },
  },
  presets: [
    {
      name: "Quiet scallop",
      description: "Thirteen flutes cross a balanced concave fan with a restrained scalloped rim.",
      props: { flutes: 13, concavity: 1, spread: 110, speed: 0.6, intensity: 0.65, seed: 1 },
    },
    {
      name: "Broad shallow shell",
      description: "Nine broad flutes open into a wider, shallower bowl with a clear fixed hinge.",
      props: { flutes: 9, concavity: 0.55, spread: 135, speed: 0.45, intensity: 0.6, seed: 4 },
    },
    {
      name: "Narrow deep fan",
      description: "Eighteen close flutes reveal deeper concavity in a taller, narrower shell.",
      props: { flutes: 18, concavity: 1.35, spread: 90, speed: 0.8, intensity: 0.7, seed: 7 },
    },
  ],
  original: true,
  credits: [],
};
