import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "wabi-sabi-hero",
  title: "Wabi Sabi Hero",
  category: "sections",
  description: "A hero worn like a handled page: a frame missing one side, rules that stop short, and grain that gathers at the edges.",
  tags: ["hero", "wabi-sabi", "imperfection", "grain", "frame", "wear", "section"],
  facets: ["static", "text", "overlay"],
  wave: 9,
  animated: false,
  decorative: false,
  wraps: "content",
  stage: "flow",
  palette: ["fg", "muted"],
  demo: {
    children:
      "<p>What remains is what matters: a boundary that never closes, lines that end early, and wear where hands have been.</p>",
  },
  controls: {
    headline: { type: "string" },
    subhead: { type: "textarea", rows: 2 },
    actions: { type: "json" },
    align: { type: "select", options: ["start", "end"] },
    frame: { type: "boolean" },
    wear: { type: "number", min: 0, max: 1, step: 0.05 },
    intensity: { type: "number", min: 0, max: 1, step: 0.05 },
    minHeight: { type: "number", min: 0, max: 100, step: 5, label: "Min height (vh)" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  original: true,
  credits: [],
};
