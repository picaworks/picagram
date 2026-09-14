import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "spinner",
  title: "Spinner",
  category: "ui",
  description: "An inline braille cell run that travels clockwise while work of unknown duration is under way.",
  tags: ["spinner", "loading", "busy", "status", "ui"],
  facets: ["animated"],
  wave: 6,
  animated: true,
  decorative: false,
  host: "div",
  stage: "inline",
  palette: ["fg", "muted", "accent"],
  controls: {
    size: { type: "number", min: 3, max: 9, step: 1 },
    speed: { type: "number", min: 0.25, max: 3, step: 0.25 },
    label: { type: "string" },
    fps: { type: "number", min: 1, max: 30, step: 1 },
  },
  original: true,
  credits: [],
};
