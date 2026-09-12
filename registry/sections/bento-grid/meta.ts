import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "bento-grid",
  title: "Bento Grid",
  category: "sections",
  description: "A CSS grid section that sizes its children by position into a feature, mosaic, or equal column pattern.",
  tags: ["grid", "layout", "bento", "section", "css"],
  facets: ["static"],
  wave: 3,
  animated: false,
  decorative: false,
  wraps: "content",
  controls: {
    pattern: { type: "select", options: ["feature", "mosaic", "columns"] },
    columns: { type: "number", min: 2, max: 6, step: 1 },
    gap: { type: "number", min: 0, max: 2, step: 0.05, label: "Gap (rem)" },
    corners: { type: "boolean" },
    minTile: { type: "number", min: 160, max: 400, step: 10, label: "Min tile (px)" },
  },
  credits: [],
  original: true,
  palette: ["fg"],
  demo: {
    children:
      "<article><h3>ASCII</h3><p>Images and text rendered as glyphs on a measured density ramp.</p></article><article><h3>Dither</h3><p>Continuous tone broken into ink and paper with ordered dithering.</p></article><article><h3>Shaders</h3><p>GPU fields dithered and drawn in one accent over the ground.</p></article><article><h3>Charts</h3><p>Bars, lines, and rings drawn from data, in SVG or glyphs.</p></article><article><h3>Controls</h3><p>Buttons, dialogs, and selects built on native elements.</p></article>",
  },
};
