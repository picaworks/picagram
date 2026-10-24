import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "chainmail-weave",
  title: "Chainmail Weave",
  category: "shaders",
  description: "A staggered field of curved metallic rings alternates front and rear crossings beneath a single slow moving light.",
  tags: ["chainmail", "rings", "metal", "weave", "occlusion", "dither"],
  facets: ["animated", "background", "shader", "webgl", "dither"],
  wave: 17,
  release: "kinetic-studies-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    rings: { type: "number", min: 6, max: 20, step: 1, label: "Ring density" },
    gauge: { type: "number", min: 0.055, max: 0.15, step: 0.005, label: "Wire gauge" },
    lean: { type: "number", min: 0.2, max: 0.8, step: 0.05, label: "Ring lean" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Light speed" },
    intensity: { type: "number", min: 0.2, max: 1, step: 0.05, label: "Ink coverage" },
    paused: { type: "boolean", label: "Paused" },
    time: { type: "number", min: 0, max: 120000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 0, max: 9999, step: 1, label: "Light seed" },
  },
  presets: [
    {
      name: "Linked mail",
      description: "Moderate ring density and alternating lean reveal a regular sequence of curved crossings.",
      props: { rings: 12, gauge: 0.09, lean: 0.45, speed: 0.6, intensity: 0.65, seed: 1 },
    },
    {
      name: "Heavy links",
      description: "Broad, thick rings make the front and rear arcs prominent under a slower light.",
      props: { rings: 8, gauge: 0.13, lean: 0.6, speed: 0.4, intensity: 0.6, seed: 3 },
    },
    {
      name: "Fine mesh",
      description: "Close thin rings form a quieter shallow weave with restrained metallic highlights.",
      props: { rings: 18, gauge: 0.065, lean: 0.3, speed: 0.7, intensity: 0.55, seed: 5 },
    },
  ],
  original: true,
  credits: [],
};
