import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "hatch-lines",
  title: "Hatch Lines",
  category: "patterns",
  description: "Fine crossing ink lines make a restrained engraved background for text.",
  tags: ["hatch", "crosshatch", "engraving", "lines", "css"],
  facets: ["static", "background"],
  wave: 6,
  animated: false,
  decorative: true,
  wraps: "content",
  controls: {
    angle: { type: "number", min: 0, max: 90, step: 1, label: "Angle (deg)" },
    density: { type: "number", min: 1, max: 3, step: 1, label: "Line families" },
    spacing: { type: "number", min: 4, max: 32, step: 1, label: "Spacing (px)" },
    strength: { type: "number", min: 0, max: 1, step: 0.01 },
  },
  palette: ["fg"],
  demo: {
    children: "<div><h2>Field notes</h2><p>Fine lines give the page a measured, engraved texture.</p></div>",
  },
  credits: [],
  original: true,
};
