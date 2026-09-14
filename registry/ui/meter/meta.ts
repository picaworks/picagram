import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "meter",
  title: "Meter",
  category: "ui",
  description: "A labelled scalar readout drawn as block cells with an optional threshold marker.",
  tags: ["meter", "value", "range", "status", "ui"],
  facets: ["static"],
  wave: 6,
  animated: false,
  decorative: false,
  host: "div",
  stage: "inline",
  palette: ["fg", "muted", "accent"],
  controls: {
    value: { type: "number", min: -100000, max: 100000, step: 1 },
    min: { type: "number", min: -100000, max: 100000, step: 1 },
    max: { type: "number", min: -100000, max: 100000, step: 1 },
    label: { type: "string" },
    marker: { type: "number", min: -100000, max: 100000, step: 1 },
    valueText: { type: "string" },
    width: { type: "number", min: 8, max: 60, step: 1 },
  },
  credits: [
    {
      relation: "technique",
      title: "Meter pattern",
      author: "W3C WAI-ARIA Authoring Practices Guide",
      url: "https://www.w3.org/WAI/ARIA/apg/patterns/meter/",
      license: "W3C document",
    },
  ],
};
