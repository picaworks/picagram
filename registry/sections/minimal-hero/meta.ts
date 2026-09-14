import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "minimal-hero",
  title: "Minimal Hero",
  category: "sections",
  description: "A hero reduced to one large headline, a line of support, and a single call to action.",
  tags: ["hero", "minimal", "landing", "section", "cta"],
  facets: ["static", "text"],
  wave: 9,
  animated: false,
  decorative: false,
  wraps: "content",
  stage: "flow",
  palette: ["fg", "muted"],
  demo: {
    props: {
      headline: "",
      subhead: "Everything on this page earns its place.",
      actions: [{ label: "Read the manual", href: "#docs" }],
    },
    children: "<h1>One idea, set large.</h1>",
  },
  controls: {
    headline: { type: "string" },
    subhead: { type: "string" },
    actions: { type: "json" },
    align: { type: "select", options: ["start", "center"] },
  },
  original: true,
  credits: [],
};
