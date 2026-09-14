import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "progress",
  title: "Progress",
  category: "ui",
  description: "A labelled determinate progress bar drawn as flat block cells with an exact accessible value.",
  tags: ["progress", "status", "completion", "ui"],
  facets: ["static"],
  wave: 6,
  animated: false,
  decorative: false,
  palette: ["fg", "accent", "muted"],
  controls: {
    value: { type: "number", min: 0, max: 100, step: 1 },
    min: { type: "number", min: -100, max: 100, step: 1 },
    max: { type: "number", min: 1, max: 1000, step: 1 },
    label: { type: "string" },
    showValue: { type: "boolean" },
    width: { type: "number", min: 8, max: 80, step: 1 },
  },
  credits: [
    {
      relation: "technique",
      title: "progressbar role",
      author: "W3C",
      url: "https://www.w3.org/TR/wai-aria-1.2/#progressbar",
      license: "W3C document",
    },
  ],
};
