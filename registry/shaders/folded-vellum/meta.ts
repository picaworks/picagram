import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "folded-vellum",
  title: "Folded Vellum",
  category: "shaders",
  description: "One finite accordion sheet carries quiet printed rules through translucent panel overlaps, with connected creases and diffuse paper lighting.",
  tags: ["vellum", "paper", "accordion", "folds", "translucent", "dither"],
  facets: ["animated", "shader", "webgl", "dither"],
  wave: 18,
  release: "mechanisms-surfaces-2026-11-14",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    panels: { type: "number", min: 4, max: 8, step: 2, label: "Accordion panels" },
    fold: { type: "number", min: 0.2, max: 0.65, step: 0.05, label: "Crease depth" },
    translucency: { type: "number", min: 0.3, max: 0.8, step: 0.05, label: "Panel transmission" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Diffuse light speed" },
    intensity: { type: "number", min: 0.3, max: 0.75, step: 0.05, label: "Ink intensity" },
    paused: { type: "boolean", label: "Pause light" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Sheet orientation seed" },
  },
  presets: [
    {
      name: "Six panel tracing sheet",
      description: "Six medium folds reveal quiet ruled layers through a translucent sheet.",
      props: { panels: 6, fold: 0.45, translucency: 0.65, speed: 0.65, intensity: 0.55, seed: 1 },
    },
    {
      name: "Open letter fold",
      description: "Four shallow panels spread a lighter sheet with broad open faces.",
      props: { panels: 4, fold: 0.25, translucency: 0.75, speed: 0.45, intensity: 0.45, seed: 4 },
    },
    {
      name: "Close archival concertina",
      description: "Eight deeper folds create stronger overlapping layers while retaining thin paper edges.",
      props: { panels: 8, fold: 0.6, translucency: 0.45, speed: 0.75, intensity: 0.65, seed: 7 },
    },
  ],
  original: true,
  credits: [],
};
