import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "bohemian-hero",
  title: "Bohemian Hero",
  category: "sections",
  description: "A hero dressed like a weaving: seeded thread bands, a scalloped hairline arch, and copy offset against a selvedge joined by a woven crossband.",
  tags: ["hero", "bohemian", "woven", "textile", "arch", "border", "section"],
  facets: ["static", "text", "background", "canvas"],
  wave: 9,
  animated: false,
  decorative: false,
  wraps: "content",
  stage: "flow",
  palette: ["fg", "muted", "accent"],
  demo: {
    children:
      "<p>Every band is generated from the seed: a counted thread border, a scalloped edge, and a fringe, with the prose kept in front of all of it.</p>",
  },
  controls: {
    headline: { type: "string" },
    subhead: { type: "textarea", rows: 2 },
    actions: { type: "json" },
    align: { type: "select", options: ["start", "end"] },
    bands: { type: "boolean" },
    arch: { type: "boolean" },
    intensity: { type: "number", min: 0, max: 1, step: 0.05 },
    minHeight: { type: "number", min: 0, max: 100, step: 5, label: "Min height (vh)" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  original: true,
  credits: [],
};
