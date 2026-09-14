import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "luxury-hero",
  title: "Luxury Hero",
  category: "sections",
  description: "A hero built from space alone: a small tracked headline, one accent hairline, and text links with rules beneath them.",
  tags: ["hero", "landing", "section", "luxury", "minimal", "cta"],
  facets: ["static", "text"],
  wave: 9,
  animated: false,
  decorative: false,
  wraps: "content",
  stage: "flow",
  palette: ["fg", "muted", "accent"],
  demo: {
    props: {
      headline: "Spring, Numbered",
      subhead: "Sixty pieces, each one signed, dated, and guaranteed for life.",
      actions: [
        { label: "View the lookbook", href: "#lookbook" },
        { label: "Book an appointment", href: "#appointments" },
      ],
    },
    children: "<p>Every order is wrapped by hand and dispatched within two days.</p>",
  },
  controls: {
    headline: { type: "string" },
    subhead: { type: "textarea", rows: 2 },
    actions: { type: "json" },
    align: { type: "select", options: ["center", "start"] },
    minHeight: { type: "number", min: 30, max: 100, step: 5, label: "Min height (vh)" },
  },
  original: true,
  credits: [],
};
