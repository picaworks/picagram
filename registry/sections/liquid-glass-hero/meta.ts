import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "liquid-glass-hero",
  title: "Liquid Glass Hero",
  category: "sections",
  description: "A hero behind a drifting lens slab that bends the printed field beneath its curved edge, screened into tone steps.",
  tags: ["hero", "liquid glass", "lens", "refraction", "dither", "section", "landing"],
  facets: ["animated", "text", "background", "canvas", "dither"],
  wave: 9,
  animated: true,
  decorative: false,
  wraps: "content",
  stage: "flow",
  palette: ["fg", "muted", "accent", "bg"],
  demo: {
    props: {
      headline: "",
      subhead: "",
      actions: [
        { label: "Get started", href: "#start" },
        { label: "How it bends", href: "#how" },
      ],
    },
    children:
      "<h1>Light, bent through a slab.</h1><p>A thick lens drifts over a printed field and displaces what lies beneath its curved edge, drawn in screened ink behind the page's own content.</p>",
  },
  controls: {
    headline: { type: "string" },
    subhead: { type: "string" },
    actions: { type: "json" },
    align: { type: "select", options: ["start", "center"] },
    minHeight: { type: "number", min: 30, max: 100, step: 5, label: "Min height (vh)" },
    size: { type: "number", min: 0.2, max: 0.8, step: 0.02, label: "Slab diameter" },
    bend: { type: "number", min: 0, max: 1, step: 0.05 },
    spacing: { type: "number", min: 12, max: 80, step: 2, label: "Lattice spacing (px)" },
    intensity: { type: "number", min: 0, max: 1, step: 0.05 },
    drift: { type: "number", min: 0, max: 1, step: 0.05 },
    levels: { type: "number", min: 2, max: 6, step: 1 },
    mask: { type: "select", options: ["blue", "bayer"] },
    pixel: { type: "number", min: 2, max: 6, step: 1 },
    fps: { type: "number", min: 5, max: 60, step: 5 },
    paused: { type: "boolean" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  original: true,
  credits: [],
};
