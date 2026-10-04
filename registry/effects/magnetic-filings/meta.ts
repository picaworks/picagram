import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "magnetic-filings",
  title: "Magnetic Filings",
  category: "effects",
  description: "Orientation glyphs follow the field of slowly drifting charges behind the content they wrap, leaving it a clear margin.",
  tags: ["field", "vector", "glyphs", "charges", "reading"],
  facets: ["animated", "background", "canvas"],
  wave: 14,
  release: "ascii-motion-2026-10-04",
  animated: true,
  decorative: false,
  wraps: "content",
  palette: ["fg", "muted", "accent"],
  controls: {
    sources: { type: "json" },
    spacing: { type: "number", min: 1, max: 3, step: 1, label: "Spacing (columns)" },
    fontSize: { type: "number", min: 10, max: 20, step: 1, label: "Glyph size (px)" },
    quiet: { type: "number", min: 0, max: 6, step: 1, label: "Quiet band (cells)" },
    layout: { type: "select", options: ["none", "center"] },
    period: { type: "number", min: 12, max: 60, step: 1, label: "Loop (s)" },
    opacity: { type: "number", min: 0.1, max: 1, step: 0.05 },
    fps: { type: "number", min: 12, max: 24, step: 1 },
    paused: { type: "boolean" },
    seed: { type: "number", min: 1, max: 999, step: 1 },
  },
  demo: {
    props: { layout: "center" },
    children: "<p>Bearings were taken from the ridge every quarter mile, each one written in pencil beside the last.</p><p>By noon the readings agreed: north had moved four degrees since the old chart was drawn.</p>",
  },
  original: true,
  credits: [],
};
