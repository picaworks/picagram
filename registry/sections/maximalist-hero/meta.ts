import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "maximalist-hero",
  title: "Maximalist Hero",
  category: "sections",
  description: "A maximalist page hero that packs two beating fields, an index and a boxed figure, and edge bands around a headline and copy.",
  tags: ["hero", "landing", "section", "cta", "maximalist", "marquee", "dither", "background"],
  facets: ["animated", "text", "background"],
  wave: 9,
  animated: true,
  decorative: false,
  wraps: "content",
  stage: "flow",
  palette: ["fg", "muted", "accent", "bg"],
  demo: {
    children:
      "<p>Seventy components drawn in text and counting, from glyph grids to WebGL fields, all reading the same four tones.</p><ul><li>React and single file HTML builds</li><li>No runtime dependencies</li><li>One palette, everywhere</li></ul>",
  },
  controls: {
    headline: { type: "string" },
    subhead: { type: "textarea", rows: 2 },
    kicker: { type: "string" },
    ticker: { type: "string" },
    figure: { type: "string" },
    caption: { type: "string" },
    index: { type: "json" },
    indexTitle: { type: "string" },
    actions: { type: "json" },
    align: { type: "select", options: ["start", "center"] },
    intensity: { type: "number", min: 0, max: 1, step: 0.05 },
    minHeight: { type: "number", min: 30, max: 100, step: 5, label: "Min height (vh)" },
    paused: { type: "boolean" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  original: true,
  credits: [],
};
