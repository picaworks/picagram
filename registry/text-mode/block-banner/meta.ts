import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "block-banner",
  title: "Block Banner",
  category: "text-mode",
  description: "Large block letters drawn in text from an original five row pixel font, sized to fit the host's width.",
  tags: ["text", "logotype", "static", "pixel font"],
  wave: 2,
  animated: false,
  decorative: false,
  controls: {
    text: { type: "string", label: "Text" },
    spacing: { type: "number", min: 0, max: 3, step: 1 },
    shadow: { type: "boolean", label: "Shadow" },
    align: { type: "select", options: ["left", "center"] },
    lineHeight: { type: "number", min: 0.8, max: 1.6, step: 0.05 },
  },
  credits: [],
  original: true,
};
