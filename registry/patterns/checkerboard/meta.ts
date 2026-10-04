import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "checkerboard",
  title: "Checkerboard",
  category: "patterns",
  description: "A quiet field of alternating ink and transparent squares drawn beneath page content.",
  tags: ["checkerboard", "squares", "grid", "css"],
  facets: ["static", "background"],
  wave: 6,
  animated: false,
  decorative: true,
  wraps: "content",
  controls: {
    size: { type: "number", min: 8, max: 96, step: 1, label: "Cell size (px)" },
    angle: { type: "number", min: 0, max: 45, step: 1, label: "Angle (deg)" },
    strength: { type: "number", min: 0, max: 1, step: 0.01 },
  },
  palette: ["fg"],
  demo: {
    children: "<div><h2>Quiet geometry</h2><p>A measured field leaves every word clear.</p></div>",
  },
  credits: [],
  original: true,
};
