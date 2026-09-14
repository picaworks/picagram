import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "victorian-hero",
  title: "Victorian Hero",
  category: "sections",
  description: "A playbill hero: a doubled ruled border with fleuron corners, stacked lines in many sizes, and rules between them.",
  tags: ["hero", "landing", "section", "victorian", "playbill", "border", "cta"],
  facets: ["static", "text"],
  wave: 9,
  animated: false,
  decorative: false,
  wraps: "content",
  stage: "flow",
  palette: ["fg", "muted", "accent"],
  demo: {
    props: {
      kicker: "Picagram, by special arrangement",
      headline: "A Grand Exhibition of Drawn Type",
      subhead: "being a library of components rendered in text, for one night and every night",
      actions: [
        { label: "Take a seat", href: "#seats" },
        { label: "Read the programme", href: "#programme" },
      ],
    },
    children: "<p>Doors at seven. The management begs patience for any delay in the machinery.</p>",
  },
  controls: {
    kicker: { type: "string" },
    headline: { type: "string" },
    subhead: { type: "textarea", rows: 2 },
    actions: { type: "json" },
    align: { type: "select", options: ["center", "start"] },
    frame: { type: "select", options: ["double", "single", "none"] },
    minHeight: { type: "number", min: 30, max: 100, step: 5, label: "Min height (vh)" },
  },
  original: true,
  credits: [],
};
