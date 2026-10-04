import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "geodesic-shell",
  title: "Geodesic Shell",
  category: "immersive",
  description: "A subdivided icosahedral dome maps supplied panel records to selectable facets, with camera controls and accessible panel buttons.",
  tags: ["geodesic", "dome", "facets", "3d", "panels", "canvas", "keyboard"],
  facets: ["static", "canvas", "interactive"],
  wave: 15,
  release: "components-2026-10-04",
  animated: false,
  decorative: false,
  original: true,
  palette: ["fg", "bg", "accent", "muted"],
  controlled: { value: "valueChange" },
  controls: {
    frequency: { type: "number", min: 1, max: 6, step: 1 },
    panels: { type: "json" },
    defaultValue: { type: "string" },
    view: { type: "json" },
    label: { type: "string" },
  },
  interactions: [
    [
      { step: "click", selector: "[data-shell-panel='panel-b']" },
      { step: "expectEvent", name: "valueChange", detail: "panel-b" },
      { step: "expectEvent", name: "panelSelect", detail: { id: "panel-b", facet: 13, label: "Crown B", description: "Second crown cladding panel" } },
      { step: "expectAttr", selector: "[data-shell-panel='panel-b']", name: "aria-pressed", value: "true" },
      { step: "press", key: "ArrowRight" },
      { step: "expectFocus", selector: "[data-shell-panel='panel-c']" },
      { step: "expectAttr", selector: "[data-shell-panel='panel-c']", name: "aria-pressed", value: "true" },
    ],
  ],
  credits: [],
};
