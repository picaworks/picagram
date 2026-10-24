import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-spiral-current",
  title: "ASCII Spiral Current",
  category: "ascii",
  description: "Broad interleaved glyph ribbons turn slowly around an open center, with measured density across each trace and one accented outer tip.",
  tags: ["spiral", "current", "ribbon", "glyph-grid", "animated"],
  facets: ["animated"],
  wave: 16,
  release: "motion-materials-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg", "muted", "accent"],
  capture: 3600,
  controls: {
    arms: { type: "number", min: 1, max: 3, step: 1 },
    turns: { type: "number", min: 0.5, max: 2.25, step: 0.05 },
    spacing: { type: "number", min: 0.35, max: 1.5, step: 0.05 },
    speed: { type: "number", min: 0, max: 2, step: 0.05 },
    fontSize: { type: "number", min: 10, max: 20, step: 1 },
    paused: { type: "boolean" },
    time: { type: "number", min: 0, max: 60000, step: 100 },
    seed: { type: "number", min: 1, max: 99, step: 1 },
  },
  presets: [
    {
      name: "Twin current",
      description: "Two broad ribbons interleave around a clear aperture in a slow clockwise drift.",
      props: { arms: 2, turns: 1.2, spacing: 0.7, speed: 0.6, fontSize: 12, seed: 1 },
    },
    {
      name: "Long eddy",
      description: "One continuous ribbon makes two generous windings with ample separation.",
      props: { arms: 1, turns: 2, spacing: 1.1, speed: 0.35, fontSize: 13, seed: 7 },
    },
    {
      name: "Threefold sweep",
      description: "Three short, open arms fan around the aperture with broader radial gaps.",
      props: { arms: 3, turns: 0.7, spacing: 0.45, speed: 0.8, fontSize: 11, seed: 4 },
    },
  ],
  original: true,
  credits: [],
};
