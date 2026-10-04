import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "strata-stack",
  title: "Strata Stack",
  category: "immersive",
  description: "Supplied geological thicknesses form an exploded stack with adjustable gaps, three views, and accessible layer selection.",
  tags: ["geology", "strata", "layers", "thickness", "exploded-view"],
  facets: ["static", "canvas", "interactive"],
  wave: 15,
  release: "components-2026-10-04",
  animated: false,
  decorative: false,
  palette: ["fg", "bg", "accent"],
  controlled: { value: "valueChange" },
  interactions: [[
    { step: "click", selector: "[data-layer-id=\"shale\"]" },
    { step: "expectEvent", name: "valueChange", detail: "shale" },
    { step: "expectAttr", selector: "[data-layer-id=\"shale\"]", name: "aria-pressed", value: "true" },
    { step: "press", key: "ArrowDown" },
    { step: "expectEvent", name: "valueChange", detail: "limestone" },
    { step: "expectFocus", selector: "[data-layer-id=\"limestone\"]" },
  ]],
  controls: {
    layers: { type: "json", label: "Layer records (metres)" },
    separation: { type: "number", min: 0, max: 30, step: 0.5, label: "Gap (metres)" },
    defaultValue: { type: "string", label: "Initial layer ID" },
    view: { type: "select", options: ["isometric", "oblique", "front"] },
    label: { type: "string" },
  },
  credits: [],
  original: true,
};
