import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "surrealist-hero",
  title: "Surrealist Hero",
  category: "sections",
  description: "A hero behind which a dithered sea stands at two heights, under a sun reflected in the wrong shape.",
  tags: ["hero", "landing", "section", "surreal", "dither", "sea", "horizon"],
  facets: ["animated", "text", "background", "canvas"],
  wave: 9,
  animated: true,
  decorative: false,
  wraps: "content",
  stage: "flow",
  palette: ["fg", "muted", "accent"],
  demo: {
    children:
      '<p class="lede">Eleven primitives for the top of a page, drawn in the library\'s own grammar and set in the page\'s own type.</p>',
  },
  controls: {
    headline: { type: "string" },
    subhead: { type: "string" },
    actions: { type: "json" },
    align: { type: "select", options: ["start", "center"] },
    minHeight: { type: "number", min: 30, max: 100, step: 5, label: "Min height (vh)" },
    intensity: { type: "number", min: 0, max: 1, step: 0.05 },
    horizon: { type: "number", min: 40, max: 85, step: 1, label: "Lower waterline (%)" },
    step: { type: "number", min: 8, max: 40, step: 1, label: "Wall height (%)" },
    seam: { type: "number", min: 30, max: 75, step: 1, label: "Wall position (%)" },
    scale: { type: "number", min: 2, max: 8, step: 1, label: "Dither cell (px)" },
    speed: { type: "number", min: 0, max: 1, step: 0.05 },
    paused: { type: "boolean" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  original: true,
  credits: [],
};
