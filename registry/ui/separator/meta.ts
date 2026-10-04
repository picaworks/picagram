import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "separator",
  title: "Separator",
  category: "ui",
  description: "A quiet horizontal or vertical hairline with an optional label on the horizontal rule.",
  tags: ["separator", "divider", "rule", "layout", "ui"],
  facets: ["static"],
  wave: 6,
  animated: false,
  decorative: false,
  stage: "fill",
  palette: ["fg", "muted"],
  demo: { props: { label: "Section" } },
  controls: {
    orientation: { type: "select", options: ["horizontal", "vertical"] },
    label: { type: "string" },
  },
  credits: [
    {
      relation: "technique",
      title: "separator role",
      author: "W3C",
      url: "https://www.w3.org/TR/wai-aria-1.2/#separator",
      license: "W3C document",
    },
  ],
};
