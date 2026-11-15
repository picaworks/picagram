import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "lake-union-float-homes",
  title: "Lake Union Float Homes",
  category: "immersive",
  description: "Low floating homes share timber walks, deck gardens and a hinged shore gangway above a broad open inlet.",
  tags: ["pixel","isometric","floating-homes","lake","seattle"],
  facets: ["animated","canvas"],
  wave: 19,
  release: "pixel-worlds-2026-11-15",
  animated: true,
  decorative: true,
  original: true,
  credits: [],
  palette: ["fg","bg","accent"],
  controls: {
    layout: { type: "select", options: ["comb","inlet","islands"], label: "Neighborhood layout" },
    homes: { type: "number", min: 3, max: 5, step: 1, label: "Floating homes" },
    gardenCover: { type: "number", min: 0, max: 1, step: 0.05, label: "Garden coverage" },
    paused: { type: "boolean", label: "Pause swell" },
    time: { type: "number", min: 0, max: 20000, step: 100, label: "Fixed time" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Swell phase seed" },
  },
  presets: [
    { name: "Dock Comb", description: "Three staggered fingers leave the shared walking spine exposed.", props: { layout: "comb", homes: 3, gardenCover: 0.35 } },
    { name: "Sheltered Inlet", description: "Four inward facing homes enclose a broad central water pocket.", props: { layout: "inlet", homes: 4, gardenCover: 0.7 } },
    { name: "Two Islands", description: "Two homes and three homes share unequal platforms linked by a narrow walk.", props: { layout: "islands", homes: 5, gardenCover: 0.5 } },
  ],
};
