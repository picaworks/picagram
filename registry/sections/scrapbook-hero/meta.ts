import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "scrapbook-hero",
  title: "Scrapbook Hero",
  category: "sections",
  description: "A hero assembled like a scrapbook page, with seeded tilts, torn deckle edges, taped corners, and a pasted photocopy print around the page's own copy.",
  tags: ["hero", "scrapbook", "paper", "torn", "tape", "photocopy", "landing", "section"],
  facets: ["static", "text"],
  wave: 9,
  animated: false,
  decorative: false,
  wraps: "content",
  stage: "flow",
  palette: ["fg", "muted", "accent"],
  demo: {
    props: {
      headline: "Assembled by hand.",
      subhead: "Torn slips, taped corners, and a photocopied study, all placed by one seed that remembers where everything landed.",
      actions: [
        { label: "Browse components", href: "#components" },
        { label: "Read the docs", href: "#docs" },
        { label: "See the source", href: "#source" },
      ],
    },
    children: "<p>The page's own copy drops into the same layout, a little off the axis like everything else.</p>",
  },
  controls: {
    headline: { type: "string" },
    subhead: { type: "string" },
    actions: { type: "json" },
    align: { type: "select", options: ["start", "center"] },
    caption: { type: "string" },
    note: { type: "textarea", rows: 2 },
    stub: { type: "string" },
    footline: { type: "string" },
    tilt: { type: "number", min: 0, max: 3, step: 0.1, label: "Tilt (deg)" },
    tear: { type: "number", min: 0, max: 16, step: 0.5, label: "Tear depth (px)" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
    minHeight: { type: "number", min: 30, max: 100, step: 5, label: "Min height (vh)" },
  },
  original: true,
  credits: [],
};
