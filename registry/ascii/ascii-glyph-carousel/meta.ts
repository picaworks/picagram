import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-glyph-carousel",
  title: "ASCII Glyph Carousel",
  category: "ascii",
  description: "Upright word panels circle in perspective, with readable front text and dimmer rear panels hidden by nearer faces.",
  tags: ["carousel", "words", "panels", "perspective", "text", "animated"],
  facets: ["animated", "text"],
  wave: 17,
  release: "kinetic-studies-2026-10-24",
  animated: true,
  decorative: false,
  palette: ["fg", "bg"],
  controls: {
    text: { type: "textarea", rows: 3, label: "Short words separated by spaces" },
    panels: { type: "number", min: 3, max: 8, step: 1, label: "Upright panels" },
    spread: { type: "number", min: 0.4, max: 1, step: 0.05, label: "Carousel spread" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Rotation speed" },
    fontSize: { type: "number", min: 14, max: 24, step: 1, label: "Glyph size" },
    paused: { type: "boolean", label: "Pause carousel" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Starting orientation seed" },
  },
  presets: [
    {
      name: "Four word orbit",
      description: "Four short words occupy broad upright panels around a slow, open orbit.",
      props: { text: "FORM TYPE GRID MOVE", panels: 4, spread: 0.95, speed: 0.7, fontSize: 20, seed: 1 },
    },
    {
      name: "Three clear faces",
      description: "Three larger word faces give the front panel room and make rear occlusion clear.",
      props: { text: "READ MAKE PLAY", panels: 3, spread: 1, speed: 0.5, fontSize: 22, seed: 2 },
    },
    {
      name: "Six word circuit",
      description: "Six compact panels carry a denser sequence while keeping each word upright.",
      props: { text: "INK DOT LINE CELL TYPE FORM", panels: 6, spread: 1, speed: 0.85, fontSize: 16, seed: 1 },
    },
  ],
  original: true,
  credits: [],
};
