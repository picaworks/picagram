import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "seattle-rain-terrace",
  title: "Seattle Rain Terrace",
  category: "immersive",
  description: "Narrow hillside houses, exposed retaining terraces and a public stair shelter beneath sparse pixel rain.",
  tags: ["pixel", "isometric", "seattle", "rain", "terraces"],
  facets: ["animated", "canvas"],
  wave: 19,
  release: "pixel-worlds-2026-11-15",
  animated: true,
  decorative: true,
  original: true,
  credits: [],
  palette: ["fg", "bg", "accent"],
  controls: {
    layout: { type: "select", options: ["stair-canyon", "hairpin", "corner-terraces"], label: "Street layout" },
    rise: { type: "number", min: 2, max: 4, step: 1, label: "Terrain levels" },
    rain: { type: "number", min: 0, max: 1, step: 0.05, label: "Rain density" },
    paused: { type: "boolean", label: "Pause rain" },
    time: { type: "number", min: 0, max: 10000, step: 100, label: "Animation time" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Rain seed" },
  },
  presets: [
    { name: "Stair Canyon", description: "Two offset house rows enclose a continuous central stair.", props: { layout: "stair-canyon", rise: 3, rain: 0.35 } },
    { name: "Hairpin Street", description: "Alternating road bends surround a planted wedge below outer houses.", props: { layout: "hairpin", rise: 4, rain: 0.65 } },
    { name: "Corner Terraces", description: "Broad garden platforms turn a corner beside a connecting stair.", props: { layout: "corner-terraces", rise: 2, rain: 0.2 } },
  ],
};
