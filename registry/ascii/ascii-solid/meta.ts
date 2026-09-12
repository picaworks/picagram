import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-solid",
  title: "ASCII Solid",
  category: "ascii",
  description: "A torus, sphere, or cube rotated in three dimensions and shaded with the measured ramp.",
  tags: ["3d", "rotation", "measured ramp", "depth buffer"],
  facets: ["animated"],
  wave: 1,
  animated: true,
  decorative: true,
  controls: {
    shape: { type: "select", options: ["torus", "sphere", "cube"] },
    speed: { type: "number", min: 0, max: 2, step: 0.05 },
    size: { type: "number", min: 0.3, max: 1, step: 0.05 },
    glyphs: { type: "string" },
    fontSize: { type: "number", min: 8, max: 24, step: 1 },
    lineHeight: { type: "number", min: 0.8, max: 1.6, step: 0.05 },
    fps: { type: "number", min: 12, max: 30, step: 1 },
    paused: { type: "boolean" },
  },
  credits: [
    {
      relation: "technique",
      title: "Donut math: how donut.c works",
      author: "Andy Sloane",
      url: "https://www.a1k0n.net/2011/07/20/donut-math.html",
      license: "Article",
    },
  ],
};
