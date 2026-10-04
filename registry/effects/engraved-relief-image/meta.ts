import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "engraved-relief-image",
  title: "Engraved Relief Image",
  category: "effects",
  description: "Image luminance becomes a recessed height field with fine tool cuts, its fixed geometry revealed by a slowly rotating grazing light.",
  tags: ["image", "engraving", "relief", "light", "canvas"],
  facets: ["animated", "image", "canvas"],
  wave: 15,
  release: "components-2026-10-04",
  animated: true,
  decorative: true,
  palette: ["fg", "bg", "accent", "muted"],
  controls: {
    src: { type: "string", label: "Image URL" },
    depth: { type: "number", min: 0, max: 48, step: 1, label: "Carving depth" },
    lightAngle: { type: "number", min: -180, max: 180, step: 1, label: "Light angle" },
    speed: { type: "number", min: -20, max: 20, step: 0.5, label: "Light speed" },
    paused: { type: "boolean" },
    seed: { type: "number", min: 1, max: 999, step: 1, label: "Tool-cut seed" },
  },
  credits: [],
  original: true,
};
