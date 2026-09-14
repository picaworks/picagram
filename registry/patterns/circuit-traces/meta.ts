import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "circuit-traces",
  title: "Circuit Traces",
  category: "patterns",
  description: "Seeded circuit traces follow an orthogonal grid with accent pads and optional via rings.",
  tags: ["circuit", "traces", "grid", "pcb", "background"],
  facets: ["static", "background"],
  wave: 6,
  animated: false,
  decorative: true,
  wraps: "content",
  controls: {
    pitch: { type: "number", min: 8, max: 48, step: 1, label: "Pitch (px)" },
    traces: { type: "number", min: 4, max: 60, step: 1 },
    vias: { type: "boolean" },
    strength: { type: "number", min: 0, max: 1, step: 0.05 },
    seed: { type: "number", min: -2147483648, max: 2147483647, step: 1 },
  },
  palette: ["fg", "accent"],
  demo: {
    children: "<h2>Signal paths</h2><p>Orthogonal routes leave open ground for the message.</p>",
  },
  credits: [],
  original: true,
};
