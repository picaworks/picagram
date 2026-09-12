import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "scan-reveal-image",
  title: "Scan Reveal Image",
  category: "effects",
  description: "An image a scan bar reveals as it sweeps down, sparse dither ahead of the bar and the finished picture behind it.",
  tags: ["image", "scan", "fax", "reveal", "canvas"],
  facets: ["animated", "image", "canvas", "dither"],
  wave: 4,
  animated: true,
  decorative: false,
  palette: ["fg", "accent"],
  // A little past the middle of the 5000 ms sweep, so the frame a reviewer sees carries both states at once:
  // the finished picture down to just below the middle, the sparse dither under it, and the bar between them.
  // The default 1200 ms lands in the first quarter, where the finished picture is a thin strip.
  capture: 2800,
  controls: {
    src: { type: "string", label: "Image URL" },
    alt: { type: "string", label: "Alt text" },
    fit: { type: "select", options: ["cover", "contain"] },
    tone: { type: "select", options: ["auto", "light-on-dark", "dark-on-light"] },
    contrast: { type: "number", min: 0.5, max: 2.5, step: 0.05 },
    duration: { type: "number", min: 1000, max: 12000, step: 250 },
    hold: { type: "number", min: 0, max: 6000, step: 250 },
    bar: { type: "number", min: 1, max: 8, step: 1, label: "Bar thickness" },
    preview: { type: "number", min: 0, max: 1, step: 0.05, label: "Preview ink" },
    fps: { type: "number", min: 6, max: 30, step: 1, label: "FPS" },
    paused: { type: "boolean" },
  },
  credits: [
    {
      relation: "technique",
      title: "ITU-T Recommendation T.4: Standardization of Group 3 facsimile terminals for document transmission",
      author: "ITU-T",
      url: "https://www.itu.int/rec/T-REC-T.4/en",
      license: "ITU-T Recommendation",
    },
  ],
};
