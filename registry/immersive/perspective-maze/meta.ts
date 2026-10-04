import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "perspective-maze",
  title: "Perspective Maze",
  category: "immersive",
  description: "A supplied wall grid becomes a perspective viewport with collision-safe navigation, native controls, and a text-map fallback.",
  tags: ["maze", "perspective", "raycasting", "navigation", "keyboard", "canvas"],
  facets: ["static", "canvas", "interactive"],
  wave: 15,
  release: "components-2026-10-04",
  animated: false,
  decorative: false,
  original: true,
  palette: ["fg", "bg", "accent", "muted"],
  controlled: { position: "positionChange", direction: "directionChange" },
  controlledInteractions: {
    position: [{ step: "click", selector: "[data-part=\"forward\"]" }],
    direction: [{ step: "click", selector: "[data-part=\"right\"]" }],
  },
  controls: {
    grid: { type: "json" },
    defaultPosition: { type: "numbers" },
    defaultDirection: { type: "select", options: ["north", "east", "south", "west"] },
    label: { type: "string" },
  },
  interactions: [
    [
      { step: "click", selector: "[data-part=\"forward\"]" },
      { step: "expectEvent", name: "positionChange", detail: [2, 1] },
      { step: "press", key: "ArrowRight" },
      { step: "expectEvent", name: "directionChange", detail: "south" },
      { step: "press", key: "ArrowLeft" },
      { step: "expectEvent", name: "directionChange", detail: "east" },
      { step: "press", key: "ArrowUp" },
      { step: "expectEvent", name: "positionChange", detail: [3, 1] },
    ],
  ],
  credits: [],
};
