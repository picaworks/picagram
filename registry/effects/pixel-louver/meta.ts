import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "pixel-louver",
  title: "Pixel Louver",
  category: "effects",
  description: "Eighth-block louver blades turn in whole cells beside the content, or in every cell around it, and never draw under it.",
  tags: ["material", "louver", "shutters", "blocks", "geometric", "motion"],
  facets: ["animated", "background", "canvas"],
  wave: 14,
  release: "ascii-motion-2026-10-04",
  animated: true,
  decorative: true,
  wraps: "content",
  original: true,
  credits: [],
  palette: ["fg", "muted"],
  controls: {
    area: { type: "select", options: ["margins", "full"] },
    axis: { type: "select", options: ["x", "y"] },
    columns: { type: "number", min: 2, max: 16, step: 1 },
    quiet: { type: "number", min: 0, max: 6, step: 1 },
    layout: { type: "select", options: ["none", "center"] },
    speed: { type: "number", min: 0.2, max: 2, step: 0.1 },
    opacity: { type: "number", min: 0.1, max: 0.65, step: 0.05 },
    scale: { type: "number", min: 0.6, max: 1.8, step: 0.1 },
    paused: { type: "boolean" },
    seed: { type: "number", min: 1, max: 100, step: 1 },
  },
  demo: {
    props: { layout: "center" },
    children: "<p>Shade moves across the east elevation through the afternoon.</p><p>By evening the blades stand open to the street.</p>",
  },
};
