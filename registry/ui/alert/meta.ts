import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "alert",
  title: "Alert",
  category: "ui",
  description: "A live status callout with a tag, title, and message in four restrained tones.",
  tags: ["alert", "status", "live region", "notification", "ui"],
  facets: ["static", "text"],
  wave: 6,
  animated: false,
  decorative: false,
  stage: "flow",
  palette: ["fg", "accent", "muted"],
  controls: {
    tag: { type: "string" },
    title: { type: "string" },
    message: { type: "textarea", rows: 3 },
    tone: { type: "select", options: ["neutral", "muted", "accent", "filled"] },
  },
  credits: [
    {
      relation: "technique",
      title: "Alert pattern",
      author: "W3C WAI-ARIA Authoring Practices Guide",
      url: "https://www.w3.org/WAI/ARIA/apg/patterns/alert/",
      license: "W3C document",
    },
  ],
};
