import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "cyberpunk-hero",
  title: "Cyberpunk Hero",
  category: "sections",
  description: "A hero that reads as a terminal held open too long, with scanlines over everything, a headline that tears in rare bursts, and readouts in the corners.",
  tags: ["hero", "cyberpunk", "terminal", "scanlines", "glitch", "section", "cta", "landing"],
  facets: ["animated", "text", "overlay"],
  wave: 9,
  animated: true,
  decorative: false,
  wraps: "content",
  stage: "flow",
  palette: ["fg", "accent", "bg"],
  demo: {
    children: "<p>The page's own copy lands here, between the lead and the links.</p>",
  },
  controls: {
    headline: { type: "string" },
    subhead: { type: "textarea", rows: 2 },
    kicker: { type: "string" },
    actions: { type: "json" },
    align: { type: "select", options: ["start", "center"] },
    minHeight: { type: "number", min: 30, max: 100, step: 5, label: "Min height (vh)" },
    telemetry: { type: "boolean" },
    scanlines: { type: "boolean" },
    intensity: { type: "number", min: 0, max: 1, step: 0.05 },
    paused: { type: "boolean" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  original: true,
  credits: [],
};
