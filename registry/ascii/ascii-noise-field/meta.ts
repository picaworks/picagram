import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-noise-field",
  title: "ASCII Noise Field",
  category: "ascii",
  description: "A quiet field of drifting simplex noise, drawn as glyphs chosen by measured density.",
  tags: ["background", "noise", "animated", "decorative"],
  wave: 1,
  animated: true,
  decorative: true,
  controls: {
    scale: { type: "number", min: 0.02, max: 0.3, step: 0.01 },
    speed: { type: "number", min: 0, max: 1, step: 0.01 },
    octaves: { type: "number", min: 1, max: 3, step: 1 },
    contrast: { type: "number", min: 0.5, max: 3, step: 0.05 },
    density: { type: "number", min: 0, max: 1, step: 0.01 },
    glyphs: { type: "string" },
    fontSize: { type: "number", min: 8, max: 24, step: 1 },
    lineHeight: { type: "number", min: 0.8, max: 1.6, step: 0.05 },
    fps: { type: "number", min: 1, max: 30, step: 1 },
    paused: { type: "boolean" },
    seed: { type: "number", min: 1, max: 9999, step: 1 },
  },
  credits: [
    {
      relation: "technique",
      title: "Simplex noise demystified",
      author: "Stefan Gustavson",
      url: "https://weber.itn.liu.se/~stegu/simplexnoise/simplexnoise.pdf",
      license: "Public domain",
    },
  ],
};
