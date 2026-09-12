import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "slit-scan-image",
  title: "Slit Scan Image",
  category: "effects",
  description: "An image rebuilt column by column from a slit sweeping across it, streaking whatever falls behind.",
  tags: ["image", "slit-scan", "streak", "canvas"],
  facets: ["animated", "image", "canvas"],
  wave: 4,
  animated: true,
  decorative: false,
  palette: ["fg"],
  controls: {
    src: { type: "string", label: "Image URL" },
    alt: { type: "string", label: "Alt text" },
    fit: { type: "select", options: ["cover", "contain"] },
    tone: { type: "select", options: ["auto", "light-on-dark", "dark-on-light"] },
    contrast: { type: "number", min: 0.5, max: 2, step: 0.05 },
    axis: { type: "select", options: ["horizontal", "vertical"] },
    width: { type: "number", min: 1, max: 64, step: 1, label: "Slit width" },
    amount: { type: "number", min: 0, max: 1, step: 0.05, label: "Lag amount" },
    speed: { type: "number", min: 0, max: 1, step: 0.05 },
    wrap: { type: "boolean" },
    fps: { type: "number", min: 6, max: 30, step: 1, label: "FPS" },
    paused: { type: "boolean" },
  },
  credits: [
    {
      relation: "technique",
      title: "An Informal Catalogue of Slit-Scan Video Artworks and Research",
      author: "Golan Levin",
      url: "https://www.flong.com/archive/texts/lists/slit_scan/index.html",
      license: "Article",
    },
  ],
};
