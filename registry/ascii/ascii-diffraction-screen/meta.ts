import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-diffraction-screen",
  title: "ASCII Diffraction Screen",
  category: "ascii",
  description: "An analytic illustration of two narrow openings and gently breathing glyph fringes around a stable central band, using illustrative units.",
  tags: ["diffraction", "interference", "fringes", "two-slits", "glyph-density"],
  facets: ["animated"],
  wave: 16,
  release: "motion-materials-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg", "muted", "accent"],
  capture: 2400,
  presets: [
    {
      name: "Central fringe",
      description: "A clear center band and several balanced side bands from two separated openings.",
      props: { spacing: 0.72, wavelength: 0.12, contrast: 1.35, speed: 0.6, fontSize: 16, seed: 1 },
    },
    {
      name: "Broad bands",
      description: "Closer openings and a broader fringe scale create a quieter, more open screen.",
      props: { spacing: 0.42, wavelength: 0.2, contrast: 1.15, speed: 0.4, fontSize: 18, seed: 4 },
    },
    {
      name: "Fine fringes",
      description: "Wider opening separation and stronger contrast produce narrower, more numerous bands.",
      props: { spacing: 0.9, wavelength: 0.08, contrast: 1.8, speed: 0.75, fontSize: 14, seed: 7 },
    },
  ],
  controls: {
    spacing: { type: "number", min: 0.3, max: 0.9, step: 0.02 },
    wavelength: { type: "number", min: 0.08, max: 0.24, step: 0.01 },
    contrast: { type: "number", min: 0.6, max: 2.5, step: 0.05 },
    speed: { type: "number", min: 0, max: 2, step: 0.05 },
    fontSize: { type: "number", min: 12, max: 22, step: 1 },
    paused: { type: "boolean" },
    time: { type: "number", min: 0, max: 120000, step: 100 },
    seed: { type: "number", min: 0, max: 100, step: 1 },
  },
  original: true,
  credits: [],
};
