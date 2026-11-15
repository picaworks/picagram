import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-cam-follower",
  title: "ASCII Cam Follower",
  category: "ascii",
  description: "A finite braille cam lifts a tangent roller and vertical follower through a fixed guide, compressing a return spring above its moving collar.",
  tags: ["cam", "roller", "follower", "spring", "braille", "mechanism", "animated"],
  facets: ["animated"],
  wave: 18,
  release: "mechanisms-surfaces-2026-11-14",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    eccentricity: { type: "number", min: 0.15, max: 0.4, step: 0.05, label: "Cam lift amplitude" },
    lobes: { type: "number", min: 1, max: 3, step: 1, label: "Lift lobes" },
    springTurns: { type: "number", min: 5, max: 9, step: 1, label: "Return spring turns" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Cam rotation speed" },
    fontSize: { type: "number", min: 14, max: 20, step: 1, label: "Glyph size" },
    paused: { type: "boolean", label: "Pause cam follower" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Starting cam orientation seed" },
  },
  presets: [
    {
      name: "Single lift",
      description: "One eccentric lobe raises a seven turn spring once per slow revolution.",
      props: { eccentricity: 0.25, lobes: 1, springTurns: 7, speed: 0.7, fontSize: 16, seed: 1 },
    },
    {
      name: "Twin rise",
      description: "Two broad lobes repeat a higher lift against a visibly open five turn spring.",
      props: { eccentricity: 0.35, lobes: 2, springTurns: 5, speed: 0.5, fontSize: 16, seed: 4 },
    },
    {
      name: "Three gentle strokes",
      description: "Three shallow lobes cycle a fine nine turn return spring with a smaller vertical stroke.",
      props: { eccentricity: 0.15, lobes: 3, springTurns: 9, speed: 0.85, fontSize: 14, seed: 7 },
    },
  ],
  original: true,
  credits: [],
};
