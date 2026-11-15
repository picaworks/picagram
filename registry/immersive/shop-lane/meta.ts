import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "shop-lane",
  title: "Shop Lane",
  category: "immersive",
  description: "A broad timber screen slides into a visible wall pocket, revealing a counter beside a winding lane of deep roofed shops.",
  tags: ["pixel","isometric","shops","lane","screen"],
  facets: ["animated","canvas"],
  wave: 19,
  release: "pixel-worlds-2026-11-15",
  animated: true,
  decorative: true,
  original: true,
  credits: [],
  palette: ["fg","bg","accent"],
  controls: {
    layout: { type: "select", options: ["dogleg","gate-court","bridge-lane"], label: "Lane layout" },
    frontages: { type: "number", min: 2, max: 4, step: 1, label: "Shop frontages" },
    canopyDepth: { type: "number", min: 0, max: 2, step: 1, label: "Canopy beam bays" },
    paused: { type: "boolean", label: "Pause screen" },
    time: { type: "number", min: 0, max: 20000, step: 100, label: "Fixed time" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Screen phase seed" },
  },
  presets: [
    { name: "Dogleg Lane", description: "Unequal deep shops turn an open lane around the low near storefront.", props: { layout: "dogleg", frontages: 3, canopyDepth: 1 } },
    { name: "Gate Court", description: "An entrance beam frames a forecourt before the lane narrows between high roofs.", props: { layout: "gate-court", frontages: 4, canopyDepth: 2 } },
    { name: "Upper Passage", description: "An enclosed rear passage spans an open lane beside an exposed exterior stair.", props: { layout: "bridge-lane", frontages: 2, canopyDepth: 0 } },
  ],
};
