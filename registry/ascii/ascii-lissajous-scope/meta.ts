import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-lissajous-scope",
  title: "ASCII Lissajous Scope",
  category: "ascii",
  description: "Two oscillator harmonics form a measured glyph trace with equal amplitude scales, a fading persistence trail, and labeled X-phase landmarks.",
  tags: ["lissajous", "oscilloscope", "signal", "phase", "glyph-grid", "animated"],
  facets: ["animated"],
  wave: 15,
  release: "components-2026-10-04",
  animated: true,
  decorative: false,
  palette: ["fg", "bg", "muted", "accent"],
  capture: 2400,
  controls: {
    frequencyX: { type: "number", min: 1, max: 9, step: 1 },
    frequencyY: { type: "number", min: 1, max: 9, step: 1 },
    phase: { type: "number", min: -180, max: 180, step: 5 },
    persistence: { type: "number", min: 0, max: 12, step: 0.25 },
    label: { type: "string" },
    fontSize: { type: "number", min: 6, max: 28, step: 1 },
    lineHeight: { type: "number", min: 1, max: 2, step: 0.05 },
    fps: { type: "number", min: 1, max: 30, step: 1 },
    paused: { type: "boolean" },
  },
  credits: [],
  original: true,
};
