import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "scanlines",
  title: "Scanlines",
  category: "effects",
  description: "A CRT scanline overlay in the ink color, with an optional soft band that rolls slowly down the screen.",
  tags: ["overlay", "crt", "scanlines", "css"],
  wave: 2,
  animated: true,
  decorative: true,
  wraps: "content",
  controls: {
    spacing: { type: "number", min: 2, max: 8, step: 1, label: "Spacing (px)" },
    thickness: { type: "number", min: 1, max: 3, step: 1, label: "Thickness (px)" },
    opacity: { type: "number", min: 0.05, max: 0.5, step: 0.01 },
    roll: { type: "boolean" },
    rollSpeed: { type: "number", min: 4, max: 20, step: 1, label: "Roll speed (s)" },
    fps: { type: "number", min: 6, max: 30, step: 1 },
    paused: { type: "boolean" },
  },
  credits: [],
  original: true,
};
