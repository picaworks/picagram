import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "cinemateque-program",
  title: "Cinemateque Program",
  category: "sections",
  description: "A repertory cinema program with an oversized screening date, asymmetric schedule, and projection notes.",
  tags: ["culture", "editorial", "cinemateque-program"],
  facets: ["static", "text", "interactive"],
  wave: 13,
  release: "microsites-2026-10-04",
  animated: false,
  decorative: false,
  stage: "flow",
  palette: ["fg", "bg", "accent", "muted"],
  controls: { title: { type: "string" }, cinema: { type: "string" }, date: { type: "string" }, introduction: { type: "textarea", rows: 3 }, films: { type: "json" } },
  interactions: [[{ step: "press", key: "Tab" }, { step: "expectFocus", selector: "a" }]],
  original: true,
  credits: [],
};
