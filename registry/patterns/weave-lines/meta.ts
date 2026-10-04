import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "weave-lines",
  title: "Weave Lines",
  category: "patterns",
  description: "Outlined horizontal and vertical ribbons weave over and under, with each under strand broken at a crossing.",
  tags: ["weave", "basket", "ribbon", "textile", "lines", "css"],
  facets: ["static", "background"],
  wave: 12,
  animated: false,
  decorative: true,
  wraps: "content",
  controls: {
    pitch: { type: "number", min: 12, max: 48, step: 1, label: "Pitch (px)" },
    float: { type: "number", min: 1, max: 3, step: 1, label: "Float (crossings)" },
    ribbon: { type: "number", min: 0.5, max: 0.9, step: 0.05 },
    gap: { type: "number", min: 1, max: 6, step: 1, label: "Gap (px)" },
    strength: { type: "number", min: 0, max: 1, step: 0.05 },
  },
  palette: ["fg"],
  demo: {
    children: "<h2>Woven structure</h2><p>Strands pass over and under to give the page a cloth-like rhythm.</p>",
  },
  credits: [],
  original: true,
};
