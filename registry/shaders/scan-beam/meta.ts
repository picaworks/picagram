import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "scan-beam",
  title: "Scan Beam",
  category: "shaders",
  description: "A radar plan position display whose accent beam sweeps hairline rings and spokes, lighting seeded echoes that decay in dithered steps.",
  tags: ["radar", "sweep", "shader", "webgl", "dither"],
  facets: ["animated", "background", "shader", "webgl", "dither"],
  wave: 4,
  animated: true,
  decorative: true,
  palette: ["fg", "accent", "bg"],
  controls: {
    period: { type: "number", min: 4, max: 30, step: 0.5, label: "Period (s)" },
    rings: { type: "number", min: 2, max: 8, step: 1 },
    spokes: { type: "number", min: 4, max: 36, step: 1 },
    echoes: { type: "number", min: 0, max: 24, step: 1 },
    persistence: { type: "number", min: 0, max: 1, step: 0.05 },
    levels: { type: "number", min: 2, max: 16, step: 1 },
    pixel: { type: "number", min: 1, max: 4, step: 1, label: "Pixel (px)" },
    fps: { type: "number", min: 6, max: 60, step: 1 },
    paused: { type: "boolean" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  credits: [
    {
      relation: "technique",
      title: "IEEE Standard for Radar Definitions",
      author: "IEEE Std 686-2024",
      url: "https://doi.org/10.1109/IEEESTD.2024.10815038",
      license: "IEEE standard",
    },
  ],
  original: false,
};
