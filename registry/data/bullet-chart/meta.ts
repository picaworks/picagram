import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "bullet-chart",
  title: "Bullet Chart",
  category: "data",
  description: "Rows showing measures as bars over muted bands that give qualitative ranges, with targets marked as ticks.",
  tags: ["chart", "bullet", "bars", "bands", "targets", "svg", "glyph grid", "data table"],
  facets: ["static", "chart"],
  wave: 4,
  animated: false,
  decorative: false,
  controls: {
    data: { type: "json" },
    label: { type: "string" },
    highlight: { type: "number", min: -1, max: 30, step: 1 },
    ranges: { type: "number", min: 2, max: 5, step: 1 },
    ticks: { type: "number", min: 2, max: 10, step: 1 },
    look: { type: "select", options: ["svg", "glyph"] },
  },
  palette: ["fg", "accent", "muted"],
  credits: [
    {
      relation: "technique",
      title: "Bullet Graph Design Specification",
      author: "Stephen Few",
      url: "https://www.perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf",
      license: "Specification, no code",
    },
  ],
};
