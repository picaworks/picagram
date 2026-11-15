import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-bellows",
  title: "ASCII Bellows",
  category: "ascii",
  description: "A finite pleated bellows expands between two square end plates, with alternating measured face densities and straight corner ribs preserving its depth.",
  tags: ["bellows", "accordion", "pleats", "braille", "volume", "animated"],
  facets: ["animated"],
  wave: 18,
  release: "mechanisms-surfaces-2026-11-14",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    folds: { type: "number", min: 6, max: 14, step: 1, label: "Accordion folds" },
    compression: { type: "number", min: 0.3, max: 0.75, step: 0.05, label: "Resting compression" },
    travel: { type: "number", min: 0.1, max: 0.25, step: 0.05, label: "Expansion travel" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Expansion cycle speed" },
    fontSize: { type: "number", min: 14, max: 20, step: 1, label: "Glyph size" },
    paused: { type: "boolean", label: "Pause bellows" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "View and starting phase seed" },
  },
  presets: [
    {
      name: "Workshop bellows",
      description: "Nine connected folds breathe through a moderate travel between braced square end plates.",
      props: { folds: 9, compression: 0.5, travel: 0.15, speed: 0.65, fontSize: 16, seed: 1 },
    },
    {
      name: "Open pleats",
      description: "Six widely spaced folds reveal the alternating faces through a longer expansion cycle.",
      props: { folds: 6, compression: 0.3, travel: 0.25, speed: 0.5, fontSize: 16, seed: 4 },
    },
    {
      name: "Close concertina",
      description: "Fourteen tightly packed folds hold a compact volume with shorter and slower travel.",
      props: { folds: 14, compression: 0.7, travel: 0.1, speed: 0.4, fontSize: 14, seed: 7 },
    },
  ],
  original: true,
  credits: [],
};
