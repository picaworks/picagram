import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "elliott-bay-ferry-pier",
  title: "Elliott Bay Ferry Pier",
  category: "immersive",
  description: "A low double ended ferry glides through clear berth water beside a pile supported passenger shelter and landing ramp.",
  tags: ["pixel", "isometric", "ferry", "pier", "seattle"],
  facets: ["animated", "canvas"],
  wave: 19,
  release: "pixel-worlds-2026-11-15",
  animated: true,
  decorative: true,
  original: true,
  credits: [],
  palette: ["fg", "bg", "accent"],
  controls: {
    layout: { type: "select", options: ["finger", "seawall", "fork"], label: "Pier layout" },
    berthLength: { type: "number", min: 3, max: 5, step: 1, label: "Structural bays" },
    waterLevel: { type: "number", min: 0, max: 1, step: 0.05, label: "Water level" },
    paused: { type: "boolean", label: "Pause ferry" },
    time: { type: "number", min: 0, max: 20000, step: 100, label: "Fixed time" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Route phase seed" },
  },
  presets: [
    { name: "Long Finger", description: "A narrow five bay pier projects from a compact passenger forecourt.", props: { layout: "finger", berthLength: 5, waterLevel: 0.45 } },
    { name: "Seawall Landing", description: "An L shaped masonry shore encloses a shallow side berth.", props: { layout: "seawall", berthLength: 4, waterLevel: 0.75 } },
    { name: "Forked Slip", description: "A Y shaped walk surrounds two slips below the waiting shelter.", props: { layout: "fork", berthLength: 3, waterLevel: 0.25 } },
  ],
};
