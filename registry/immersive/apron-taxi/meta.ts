import type { Meta } from "../../../lib/meta";
export const meta: Meta = {
  slug: "apron-taxi",
  title: "Apron Taxi",
  category: "immersive",
  description: "A chunky airplane follows a broad taxi loop past an open hangar and runway holding strip.",
  tags: ["pixel", "isometric", "airplane", "airfield"],
  facets: ["animated", "canvas"],
  wave: 19,
  release: "pixel-worlds-2026-11-15",
  animated: true,
  decorative: true,
  original: true,
  credits: [],
  palette: ["fg", "bg", "accent"],
  controls: {
    layout: { type: "select", options: ["oval", "triangle", "kidney"], label: "Airfield layout" },
    aircraft: { type: "select", options: ["prop", "commuter"], label: "Aircraft" },
    lapSeconds: { type: "number", min: 16, max: 40, step: 1, label: "Circuit seconds" },
    paused: { type: "boolean", label: "Pause" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Seed" },
  },
  presets: [
    { name: "Club apron", description: "A club plane circles a broad oval beside a low hangar and forward parking spur.", props: { layout: "oval", aircraft: "prop", lapSeconds: 28 } },
    { name: "Regional corner", description: "A twin engine commuter follows three rounded corners past a long hangar and corner parking apron.", props: { layout: "triangle", aircraft: "commuter", lapSeconds: 36 } },
    { name: "Hillside strip", description: "Two unequal lobes wrap a pinched island, with the hangar and parking spur beside the inner bend.", props: { layout: "kidney", aircraft: "prop", lapSeconds: 24 } },
  ],
};
