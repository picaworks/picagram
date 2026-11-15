import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-expanding-truss",
  title: "ASCII Expanding Truss",
  category: "ascii",
  description: "A finite circular truss opens through continuous crossed bars, with fine rear links, shared end pins and sliding crossing pins in short slots.",
  tags: ["truss", "scissor", "hinge", "deployment", "braille", "animated"],
  facets: ["animated"],
  wave: 18,
  release: "mechanisms-surfaces-2026-11-14",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    segments: { type: "number", min: 8, max: 16, step: 1, label: "Scissor units" },
    opening: { type: "number", min: 0.35, max: 0.8, step: 0.05, label: "Mean deployment" },
    travel: { type: "number", min: 0.1, max: 0.3, step: 0.05, label: "Deployment excursion" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Deployment speed" },
    fontSize: { type: "number", min: 14, max: 20, step: 1, label: "Glyph size" },
    paused: { type: "boolean", label: "Pause linkage" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Starting orientation seed" },
  },
  presets: [
    {
      name: "Ten unit deployment",
      description: "Ten paired units make a broad aperture with clearly separated hinged motion.",
      props: { segments: 10, opening: 0.55, travel: 0.3, speed: 0.75, fontSize: 16, seed: 1 },
    },
    {
      name: "Open armature",
      description: "Eight widely spaced units keep a large aperture and a restrained excursion.",
      props: { segments: 8, opening: 0.75, travel: 0.15, speed: 0.5, fontSize: 16, seed: 4 },
    },
    {
      name: "Close instrument",
      description: "Fourteen short scissor units show a denser ring with a smaller open center.",
      props: { segments: 14, opening: 0.4, travel: 0.2, speed: 0.85, fontSize: 14, seed: 7 },
    },
  ],
  original: true,
  credits: [],
};
