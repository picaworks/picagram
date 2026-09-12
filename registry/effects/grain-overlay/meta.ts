import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "grain-overlay",
  title: "Grain Overlay",
  category: "effects",
  description: "An SVG turbulence tile rendered once as a data URI and laid over content as film grain that jitters a few pixels several times a second.",
  tags: ["overlay", "grain", "texture", "blend mode"],
  facets: ["animated", "overlay"],
  wave: 2,
  animated: true,
  decorative: true,
  wraps: "content",
  // Grain is grayscale turbulence blended over the content, so no palette color changes it.
  palette: [],
  controls: {
    frequency: { type: "number", min: 0.4, max: 1.2, step: 0.05 },
    opacity: { type: "number", min: 0.04, max: 0.4, step: 0.02 },
    size: { type: "number", min: 64, max: 256, step: 8 },
    blend: { type: "select", options: ["overlay", "soft-light", "normal"] },
    jitter: { type: "boolean" },
    fps: { type: "number", min: 1, max: 30, step: 1 },
    paused: { type: "boolean" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  credits: [
    {
      relation: "technique",
      title: "Grainy gradients",
      author: "CSS-Tricks",
      url: "https://css-tricks.com/grainy-gradients/",
      license: "Article",
    },
  ],
};
