import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "marquee",
  title: "Marquee",
  category: "motion",
  description: "Scrolls its children sideways in an endless loop, like a ticker.",
  tags: ["ticker", "scroll", "loop", "css"],
  wave: 3,
  animated: true,
  decorative: false,
  wraps: "content",
  controls: {
    speed: { type: "number", min: 5, max: 200, step: 5, label: "Speed (px/s)" },
    direction: { type: "select", options: ["left", "right"] },
    gap: { type: "number", min: 0, max: 4, step: 0.5, label: "Gap (em)" },
    pauseOnHover: { type: "boolean", label: "Pause on hover" },
    fps: { type: "number", min: 6, max: 30, step: 1 },
    paused: { type: "boolean" },
  },
  credits: [],
  original: true,
  palette: [],
  demo: {
    children: "<span>ASCII</span><span>Dither</span><span>Effects</span><span>Shaders</span><span>Motion</span><span>Controls</span>",
  },
};
