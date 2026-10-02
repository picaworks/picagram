import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "event-schedule",
  title: "Event Schedule",
  category: "sections",
  description: "A readable event agenda grouped by day, with times, titles, speakers, and places as plain text.",
  tags: ["schedule", "agenda", "event", "program", "sessions", "section"],
  facets: ["static", "text"],
  wave: 11,
  animated: false,
  decorative: false,
  wraps: "content",
  stage: "flow",
  host: "div",
  palette: ["fg", "muted", "accent"],
  demo: {
    children: "<h2>Two days, six sessions.</h2><p>Every talk, who gives it, and where to find it.</p>",
  },
  controls: {
    sessions: { type: "json" },
    highlight: { type: "number", min: -1, max: 40, step: 1 },
    highlightLabel: { type: "string" },
    zone: { type: "string" },
    headingLevel: { type: "number", min: 2, max: 5, step: 1 },
    label: { type: "string" },
  },
  original: true,
  credits: [],
};
