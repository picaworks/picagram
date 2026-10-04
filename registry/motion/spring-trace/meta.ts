import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "spring-trace",
  title: "Spring Trace",
  category: "motion",
  description: "A damped spring approaches its target along a glyph trace, with analytic overshoot, continuous retargeting, and automatic settling.",
  tags: ["spring", "damping", "overshoot", "settling", "physics", "glyph trace"],
  facets: ["animated", "chart"],
  wave: 15,
  release: "components-2026-10-04",
  animated: true,
  decorative: false,
  palette: ["fg", "bg", "accent", "muted"],
  controls: {
    target: { type: "number", min: -1000, max: 1000, step: 1 },
    stiffness: { type: "number", min: 0.1, max: 100, step: 0.1 },
    damping: { type: "number", min: 0.1, max: 40, step: 0.1 },
    range: { type: "json", label: "Vertical range [minimum, maximum]" },
    from: { type: "number", min: -1000, max: 1000, step: 1, label: "Initial position" },
    label: { type: "string" },
    paused: { type: "boolean" },
  },
  credits: [],
  original: true,
};
