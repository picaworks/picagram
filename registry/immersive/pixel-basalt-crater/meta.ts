import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "pixel-basalt-crater", title: "Basalt Crater", category: "immersive",
  description: "Broken basalt shoulders expose a deep lava well where three broad crust rafts circulate through a connected channel.",
  tags: ["pixel", "isometric", "crater", "basalt", "lava"],
  facets: ["animated", "canvas"], wave: 19, release: "pixel-worlds-2026-11-15",
  animated: true, decorative: true, original: true, credits: [], palette: ["fg", "bg", "accent"],
  controls: {
    layout: { type: "select", options: ["openCone", "twinRim", "fissure"], label: "Crater arrangement" },
    wellSpan: { type: "number", min: 0.25, max: 0.5, step: 0.05, label: "Lava well span" },
    convectionSeconds: { type: "number", min: 18, max: 40, step: 1, label: "Convection circuit seconds" },
    paused: { type: "boolean", label: "Pause circulation" },
    time: { type: "number", min: 0, max: 40000, step: 100, label: "Fixed time" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Circulation phase seed" },
  },
  presets: [
    { name: "Open Cone", description: "A tall round cone opens toward the viewer above the circulating well.", props: { layout: "openCone", wellSpan: 0.4, convectionSeconds: 26 } },
    { name: "Twin Rim", description: "Unequal rear and front shoulders enclose one broad elongated lava well.", props: { layout: "twinRim", wellSpan: 0.45, convectionSeconds: 30 } },
    { name: "Fissure", description: "Two jagged plates frame a narrow vent and a stretched convection oval.", props: { layout: "fissure", wellSpan: 0.4, convectionSeconds: 22 } },
  ],
};
