import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "skeleton",
  title: "Skeleton",
  category: "ui",
  description: "Ghost blocks breathe between two quiet shade glyphs while content is loading.",
  tags: ["skeleton", "loading", "placeholder", "shimmer", "ui"],
  facets: ["animated", "dither"],
  wave: 6,
  animated: true,
  decorative: false,
  host: "div",
  stage: "flow",
  palette: ["muted"],
  controls: {
    avatar: { type: "boolean" },
    heading: { type: "boolean" },
    lines: { type: "number", min: 0, max: 8, step: 1 },
    speed: { type: "number", min: 0.25, max: 2, step: 0.05 },
    label: { type: "string" },
    fps: { type: "number", min: 1, max: 30, step: 1 },
    paused: { type: "boolean" },
    seed: { type: "number", min: 1, max: 999, step: 1 },
  },
  original: true,
  credits: [],
};
