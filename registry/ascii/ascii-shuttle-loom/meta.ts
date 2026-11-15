import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-shuttle-loom",
  title: "ASCII Shuttle Loom",
  category: "ascii",
  description: "A finite upright loom lifts alternating warp banks as one shuttle passes through its working shed above a continuously fed woven strip.",
  tags: ["loom", "shuttle", "warp", "weft", "weaving", "animated"],
  facets: ["animated"],
  wave: 18,
  release: "mechanisms-surfaces-2026-11-14",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    threads: { type: "number", min: 10, max: 22, step: 1, label: "Warp threads" },
    cloth: { type: "number", min: 0.25, max: 0.55, step: 0.05, label: "Woven strip height" },
    shed: { type: "number", min: 0.1, max: 0.3, step: 0.05, label: "Raised shed depth" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Weaving speed" },
    fontSize: { type: "number", min: 14, max: 20, step: 1, label: "Glyph size" },
    paused: { type: "boolean", label: "Pause weaving" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Starting shuttle phase seed" },
  },
  presets: [
    {
      name: "Plain weaving",
      description: "Sixteen warp threads and a short cloth strip leave a clear active weaving area.",
      props: { threads: 16, cloth: 0.35, shed: 0.2, speed: 0.75, fontSize: 16, seed: 1 },
    },
    {
      name: "Open shed",
      description: "Ten widely spaced threads and a deep shed expose the shuttle and its working thread.",
      props: { threads: 10, cloth: 0.3, shed: 0.3, speed: 0.55, fontSize: 16, seed: 4 },
    },
    {
      name: "Fine cloth",
      description: "Twenty two warp threads feed a longer woven strip below a narrower working shed.",
      props: { threads: 22, cloth: 0.5, shed: 0.15, speed: 0.9, fontSize: 14, seed: 3 },
    },
  ],
  original: true,
  credits: [],
};
