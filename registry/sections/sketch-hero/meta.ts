import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "sketch-hero",
  title: "Sketch Hero",
  category: "sections",
  description: "A hero still being drawn, with hatched fills, overshot construction lines, and working annotations behind the content.",
  tags: ["hero", "sketch", "construction", "crosshatch", "section", "landing"],
  facets: ["animated", "image", "text", "canvas"],
  wave: 9,
  animated: true,
  decorative: false,
  wraps: "content",
  stage: "flow",
  palette: ["fg", "muted", "accent"],
  demo: {
    props: {
      headline: "",
      subhead: "",
      actions: [
        { label: "See the method", href: "#method" },
        { label: "All components", href: "#components" },
      ],
    },
    children:
      '<p class="kicker">Figure study 09</p><h1>A page still being drawn.</h1><p>Hatched fills, overshot construction lines, and notes in a working hand, wrapped around real content.</p>',
  },
  controls: {
    headline: { type: "string" },
    subhead: { type: "string" },
    actions: { type: "json" },
    align: { type: "select", options: ["start", "center"] },
    minHeight: { type: "number", min: 30, max: 100, step: 5, label: "Min height (vh)" },
    src: { type: "string", label: "Image URL" },
    alt: { type: "string", label: "Alt text" },
    fit: { type: "select", options: ["cover", "contain"] },
    density: { type: "number", min: 0, max: 1, step: 0.05 },
    paused: { type: "boolean" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  original: true,
  credits: [],
};
