import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "card",
  title: "Card",
  category: "ui",
  description: "A hairline frame gives page content an optional heading and a compact row of linked actions.",
  tags: ["card", "content", "links", "ui"],
  facets: ["static", "text", "interactive"],
  wave: 6,
  animated: false,
  decorative: false,
  stage: "flow",
  wraps: "content",
  palette: ["fg", "accent", "muted"],
  demo: { children: "<p>Keep the details close, then choose what should happen next.</p>" },
  interactions: [[{ step: "hover", selector: "[data-pica-card-action=\"1\"]" }]],
  controls: {
    kicker: { type: "string" },
    title: { type: "string" },
    actions: { type: "json" },
  },
  original: true,
  credits: [],
};
