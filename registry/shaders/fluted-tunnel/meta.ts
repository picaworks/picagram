import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "fluted-tunnel",
  title: "Fluted Tunnel",
  category: "shaders",
  description: "A finite near lip frames continuous fluted walls and receding chamber joins around an open far aperture under slow grazing light.",
  tags: ["tunnel", "flutes", "chamber", "aperture", "grazing-light", "dither"],
  facets: ["animated", "background", "shader", "webgl", "dither"],
  wave: 17,
  release: "kinetic-studies-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    flutes: { type: "number", min: 8, max: 32, step: 1, label: "Wall flutes" },
    depth: { type: "number", min: 2, max: 6, step: 0.25, label: "Chamber depth" },
    aperture: { type: "number", min: 0.12, max: 0.38, step: 0.01, label: "Far aperture" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Light speed" },
    intensity: { type: "number", min: 0.2, max: 1, step: 0.05, label: "Ink coverage" },
    paused: { type: "boolean", label: "Paused" },
    time: { type: "number", min: 0, max: 120000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 0, max: 9999, step: 1, label: "Light seed" },
  },
  presets: [
    {
      name: "Deep chamber",
      description: "A bounded near rim and four compressed chamber joins reveal depth between eighteen rounded flutes and an open far throat.",
      props: { flutes: 18, depth: 3.5, aperture: 0.22, speed: 0.6, intensity: 0.65, seed: 1 },
    },
    {
      name: "Broad vault",
      description: "Ten broad flutes connect the visible near lip to a wider aperture through a shallower joined chamber.",
      props: { flutes: 10, depth: 2.5, aperture: 0.32, speed: 0.45, intensity: 0.55, seed: 3 },
    },
    {
      name: "Narrow throat",
      description: "Twenty-eight close flutes and receding circumferential joins lead from a visible mouth toward a small far aperture.",
      props: { flutes: 28, depth: 5, aperture: 0.15, speed: 0.7, intensity: 0.7, seed: 5 },
    },
  ],
  original: true,
  credits: [],
};
