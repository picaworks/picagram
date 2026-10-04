import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "festival-route",
  title: "Festival Route",
  category: "sections",
  description: "A neighbourhood arts walk with an original schematic route, ordered venues, and accessible event information.",
  tags: ["culture", "editorial", "festival-route"],
  facets: ["static", "text", "interactive"],
  wave: 13,
  release: "microsites-2026-10-04",
  animated: false,
  decorative: false,
  stage: "flow",
  palette: ["fg", "bg", "accent", "muted"],
  controls: { title: { type: "string" }, neighbourhood: { type: "string" }, date: { type: "string" }, introduction: { type: "textarea", rows: 3 }, venues: { type: "json" } },
  interactions: [[{ step: "press", key: "Tab" }, { step: "expectFocus", selector: "a" }]],
  original: true,
  credits: [],
};
