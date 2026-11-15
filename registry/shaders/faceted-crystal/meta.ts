import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "faceted-crystal",
  title: "Faceted Crystal",
  category: "shaders",
  description: "A finite crystal lozenge refracts a few reference rules through its continuous table, with connected crown and pavilion facets.",
  tags: ["crystal", "lozenge", "facets", "refraction", "transparent", "dither"],
  facets: ["animated", "shader", "webgl", "dither"],
  wave: 18,
  release: "mechanisms-surfaces-2026-11-14",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    facets: { type: "number", min: 6, max: 12, step: 2, label: "Facets per cut ring" },
    bevel: { type: "number", min: 0.1, max: 0.3, step: 0.05, label: "Crown and girdle bevel" },
    refraction: { type: "number", min: 0.15, max: 0.5, step: 0.05, label: "Solid refraction" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Crystal rotation speed" },
    intensity: { type: "number", min: 0.3, max: 0.75, step: 0.05, label: "Ink intensity" },
    paused: { type: "boolean", label: "Pause crystal" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Starting solid orientation seed" },
  },
  presets: [
    {
      name: "Eight face lozenge",
      description: "Eight balanced crown facets frame a transparent table and a clear bevelled girdle.",
      props: { facets: 8, bevel: 0.2, refraction: 0.3, speed: 0.7, intensity: 0.55, seed: 1 },
    },
    {
      name: "Broad six cut",
      description: "Six broad planes and a wider crown cut expose a simple symmetric solid.",
      props: { facets: 6, bevel: 0.25, refraction: 0.2, speed: 0.5, intensity: 0.5, seed: 4 },
    },
    {
      name: "Fine refracting crown",
      description: "Twelve narrower facets surround a lighter bevel with stronger transmitted reference rules.",
      props: { facets: 12, bevel: 0.15, refraction: 0.45, speed: 0.85, intensity: 0.65, seed: 7 },
    },
  ],
  original: true,
  credits: [],
};
