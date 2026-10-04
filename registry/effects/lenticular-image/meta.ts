import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "lenticular-image",
  title: "Lenticular Image",
  category: "effects",
  description: "Two registered images share parallel lenticular strips, with viewing position revealing different source content through each strip.",
  tags: ["image", "lenticular", "interlace", "strips", "canvas"],
  facets: ["static", "canvas"],
  wave: 15,
  release: "components-2026-10-04",
  animated: false,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    sources: { type: "json", label: "Two image URLs" },
    position: { type: "number", min: 0, max: 1, step: 0.01, label: "Viewing position" },
    pitch: { type: "number", min: 4, max: 64, step: 1, label: "Strip pitch" },
    axis: { type: "select", options: ["vertical", "horizontal"], label: "Strip direction" },
  },
  credits: [],
  original: true,
};
