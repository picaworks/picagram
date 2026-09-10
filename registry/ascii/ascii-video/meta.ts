import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-video",
  title: "ASCII Video",
  category: "ascii",
  description: "A video or webcam feed drawn as a live grid of glyphs, chosen each frame by the ink they put down in the font in use.",
  tags: ["video", "webcam", "animated", "measured ramp"],
  wave: 1,
  animated: true,
  decorative: false,
  controls: {
    src: { type: "string", label: "Video URL" },
    webcam: { type: "boolean", label: "Use webcam" },
    mirror: { type: "boolean" },
    alt: { type: "string", label: "Alt text" },
    columns: { type: "number", min: 24, max: 240, step: 1 },
    glyphs: { type: "string" },
    contrast: { type: "number", min: 0.5, max: 2.5, step: 0.05 },
    fit: { type: "select", options: ["cover", "contain"] },
    tone: { type: "select", options: ["auto", "light-on-dark", "dark-on-light"] },
    lineHeight: { type: "number", min: 0.8, max: 1.6, step: 0.05 },
    fps: { type: "number", min: 6, max: 30, step: 1 },
    paused: { type: "boolean" },
  },
  credits: [
    {
      relation: "technique",
      title: "play.core",
      author: "Andreas Gysin",
      url: "https://github.com/ertdfgcvb/play.core",
      license: "Apache-2.0",
    },
    {
      relation: "technique",
      title: "ascii-camera",
      author: "Andrei Gheorghe",
      url: "https://github.com/idevelop/ascii-camera",
      license: "MIT",
    },
  ],
};
