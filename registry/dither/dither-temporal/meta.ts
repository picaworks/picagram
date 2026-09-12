import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "dither-temporal",
  title: "Dither Temporal",
  category: "dither",
  description: "A still lit sphere or gradient whose blue noise or cluster screen renews its grain every frame while the tone holds.",
  tags: ["sphere", "gradient", "blue noise", "void and cluster", "temporal dither", "background"],
  facets: ["animated", "background", "canvas", "dither"],
  wave: 4,
  animated: true,
  decorative: true,
  palette: ["fg"],
  controls: {
    subject: { type: "select", options: ["sphere", "gradient"] },
    scale: { type: "number", min: 1, max: 8, step: 1, label: "Pixel scale" },
    mask: { type: "select", options: ["blue", "cluster"] },
    maskSize: { type: "select", options: ["16", "32", "64"], label: "Mask size" },
    levels: { type: "number", min: 2, max: 4, step: 1 },
    contrast: { type: "number", min: 0.5, max: 2, step: 0.05 },
    drift: { type: "number", min: 0, max: 1, step: 0.05 },
    fps: { type: "number", min: 2, max: 16, step: 1, label: "FPS" },
    paused: { type: "boolean" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  credits: [
    {
      relation: "technique",
      title: "Void-and-cluster method for dither array generation",
      author: "Robert A. Ulichney",
      url: "https://doi.org/10.1117/12.152707",
      license: "Paper",
    },
    {
      relation: "technique",
      title: "Spatiotemporal Blue Noise Masks",
      author: "Alan Wolfe, Nathan Morrical, Tomas Akenine-Möller, Ravi Ramamoorthi",
      url: "https://doi.org/10.2312/sr.20221161",
      license: "Paper",
    },
  ],
};
