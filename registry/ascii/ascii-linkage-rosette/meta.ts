import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-linkage-rosette",
  title: "ASCII Linkage Rosette",
  category: "ascii",
  description: "Radial chains of hinged diamonds open and close together around a small stationary hub.",
  tags: ["linkage", "rosette", "hinge", "diamond", "braille", "animated"],
  facets: ["animated"],
  wave: 17,
  release: "kinetic-studies-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    arms: { type: "number", min: 4, max: 10, step: 1, label: "Radial arms" },
    opening: { type: "number", min: 0.25, max: 1, step: 0.05, label: "Hinge opening" },
    reach: { type: "number", min: 0.5, max: 1, step: 0.05, label: "Link reach" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Opening cycle speed" },
    fontSize: { type: "number", min: 14, max: 20, step: 1, label: "Glyph size" },
    paused: { type: "boolean", label: "Pause linkage" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Starting orientation seed" },
  },
  presets: [
    {
      name: "Sixfold linkage",
      description: "Six long diamond chains articulate around the fixed hub with a broad shared opening.",
      props: { arms: 6, opening: 0.9, reach: 0.95, speed: 0.65, fontSize: 16, seed: 1 },
    },
    {
      name: "Four wide hinges",
      description: "Four open arms emphasize the fixed link lengths and paired diamonds.",
      props: { arms: 4, opening: 1, reach: 1, speed: 0.45, fontSize: 16, seed: 3 },
    },
    {
      name: "Fine radial crown",
      description: "Nine narrower arms form a dense radial assembly with distinct shared tip joints.",
      props: { arms: 9, opening: 0.85, reach: 1, speed: 0.85, fontSize: 14, seed: 5 },
    },
  ],
  original: true,
  credits: [],
};
