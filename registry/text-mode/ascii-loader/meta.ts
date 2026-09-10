import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-loader",
  title: "ASCII Loader",
  category: "text-mode",
  description: "A text-mode loading indicator: a braille dot orbit, a progress bar, a shade pulse, or animated dots.",
  tags: ["loader", "spinner", "progress", "inline"],
  wave: 1,
  animated: true,
  decorative: false,
  stage: "inline",
  controls: {
    variant: { type: "select", options: ["braille", "bar", "blocks", "dots"] },
    progress: { type: "number", min: 0, max: 1, step: 0.01 },
    width: { type: "number", min: 8, max: 60, step: 1 },
    label: { type: "string" },
    speed: { type: "number", min: 0.25, max: 3, step: 0.25 },
    fps: { type: "number", min: 1, max: 30, step: 1 },
  },
  credits: [],
  original: true,
};
