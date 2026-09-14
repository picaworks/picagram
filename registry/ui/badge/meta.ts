import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "badge",
  title: "Badge",
  category: "ui",
  description: "A compact status label with a solid, outline, or bracket frame.",
  tags: ["badge", "status", "label", "version", "ui"],
  facets: ["static", "text"],
  wave: 6,
  animated: false,
  decorative: false,
  host: "span",
  stage: "inline",
  palette: ["fg", "accent"],
  controls: {
    text: { type: "string" },
    variant: { type: "select", options: ["outline", "solid", "brackets"] },
    tone: { type: "select", options: ["fg", "muted", "accent"] },
  },
  original: true,
  credits: [],
};
