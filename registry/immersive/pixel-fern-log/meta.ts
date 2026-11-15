import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "pixel-fern-log", title: "Fern Log", category: "immersive",
  description: "A large curled snail follows the bark of a hollow fallen log between broad, still fern fans.",
  tags: ["pixel", "isometric", "fern", "log", "snail"],
  facets: ["animated", "canvas"], wave: 19, release: "pixel-worlds-2026-11-15",
  animated: true, decorative: true, original: true, credits: [], palette: ["fg", "bg", "accent"],
  controls: {
    layout: { type: "select", options: ["hollow", "bridge", "split"], label: "Log arrangement" },
    fernSpan: { type: "number", min: 0.35, max: 0.7, step: 0.05, label: "Fern span" },
    crawlSeconds: { type: "number", min: 24, max: 50, step: 1, label: "Crawl cycle seconds" },
    paused: { type: "boolean", label: "Pause snail" },
    time: { type: "number", min: 0, max: 50000, step: 100, label: "Fixed time" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Trail phase seed" },
  },
  presets: [
    { name: "Hollow", description: "An irregular open trunk and broad rooted fern fronds frame the upper snail trail.", props: { layout: "hollow", fernSpan: 0.5, crawlSeconds: 32 } },
    { name: "Bridge", description: "The suspended trunk crosses a dry gully between two raised soil banks.", props: { layout: "bridge", fernSpan: 0.45, crawlSeconds: 28 } },
    { name: "Split", description: "Two angled lengths keep a continuous bark trail around a fern-filled joint.", props: { layout: "split", fernSpan: 0.4, crawlSeconds: 38 } },
  ],
};
