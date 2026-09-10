import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-sparkline",
  title: "ASCII Sparkline",
  category: "text-mode",
  description: "A series of numbers drawn inline as eighth-block bars or a braille line, scaled to its own range.",
  tags: ["sparkline", "chart", "braille", "inline"],
  wave: 1,
  animated: false,
  decorative: false,
  controls: {
    values: { type: "numbers", label: "Values" },
    mode: { type: "select", options: ["blocks", "braille"] },
    width: { type: "number", min: 0, max: 120, step: 1 },
    label: { type: "string" },
  },
  credits: [
    {
      relation: "technique",
      title: "Sparkline theory and practice",
      author: "Edward Tufte",
      url: "https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/",
      license: "Concept, no code",
    },
  ],
};
