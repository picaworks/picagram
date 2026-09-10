import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-frame",
  title: "ASCII Frame",
  category: "text-mode",
  description: "A container framed in box-drawing characters, with an optional title set into the top rule.",
  tags: ["frame", "border", "box-drawing", "static"],
  wave: 1,
  animated: false,
  decorative: false,
  wraps: "content",
  controls: {
    variant: { type: "select", options: ["light", "heavy", "double", "dashed", "ascii"] },
    title: { type: "string" },
    titleAlign: { type: "select", options: ["left", "center", "right"], label: "Title align" },
    padding: { type: "number", min: 0, max: 4, step: 1 },
    accent: { type: "boolean", label: "Accent title" },
    fontSize: { type: "number", min: 10, max: 24, step: 1 },
    lineHeight: { type: "number", min: 0.8, max: 1.6, step: 0.05 },
  },
  credits: [],
  original: true,
};
