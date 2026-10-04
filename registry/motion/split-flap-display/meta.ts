import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "split-flap-display",
  title: "Split-Flap Display",
  category: "motion",
  description: "A short label in aligned split-flap cells, where only the characters that changed turn through the drum to their new glyph.",
  tags: ["split-flap", "departure board", "flip", "label", "text", "mechanical"],
  facets: ["animated", "text"],
  wave: 15,
  release: "components-2026-10-04",
  animated: true,
  decorative: false,
  stage: "inline",
  palette: ["fg", "bg", "muted"],
  controls: {
    text: { type: "string", label: "Text" },
    label: { type: "string", label: "Caption" },
    duration: { type: "number", min: 800, max: 6000, step: 100, label: "Drum turn (ms)" },
    chars: { type: "string", label: "Drum glyphs" },
    paused: { type: "boolean" },
    seed: { type: "number", min: 1, max: 999, step: 1 },
  },
  credits: [],
  original: true,
  // Every cell has landed by 1500 ms at the default speed, so the capture is the finished label.
  capture: 2000,
  demo: { props: { text: "ON TIME", label: "Status" } },
};
