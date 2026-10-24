import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "perforated-screen",
  title: "Perforated Screen",
  category: "shaders",
  description: "Staggered round holes expose a lower receiving plane beneath a shallow metal sheet, with cylindrical rims and aligned moving shadows.",
  tags: ["perforated", "screen", "holes", "metal", "cast-shadow", "dither"],
  facets: ["animated", "background", "shader", "webgl", "dither"],
  wave: 17,
  release: "kinetic-studies-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    pitch: { type: "number", min: 36, max: 120, step: 1, label: "Hole spacing in pixels" },
    aperture: { type: "number", min: 0.3, max: 0.7, step: 0.05, label: "Hole diameter ratio" },
    thickness: { type: "number", min: 2, max: 14, step: 1, label: "Metal thickness in pixels" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Light orbit speed" },
    intensity: { type: "number", min: 0.2, max: 1, step: 0.05, label: "Ink intensity" },
    paused: { type: "boolean", label: "Pause light" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Initial light direction seed" },
  },
  presets: [
    {
      name: "Punched sheet",
      description: "Medium staggered apertures reveal short cylindrical walls and a clearly separated lower plane.",
      props: { pitch: 64, aperture: 0.55, thickness: 6, speed: 0.65, intensity: 0.65, seed: 1 },
    },
    {
      name: "Open grille",
      description: "Larger apertures and thin metal expose more of the coherent moving light pattern below.",
      props: { pitch: 88, aperture: 0.7, thickness: 3, speed: 0.5, intensity: 0.6, seed: 4 },
    },
    {
      name: "Heavy gauge",
      description: "Close smaller openings make the thick cylindrical rims and grazing cast shadows prominent.",
      props: { pitch: 44, aperture: 0.4, thickness: 11, speed: 0.85, intensity: 0.75, seed: 9 },
    },
  ],
  original: true,
  credits: [],
};
