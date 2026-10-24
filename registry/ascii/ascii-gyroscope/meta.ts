import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-gyroscope",
  title: "ASCII Gyroscope",
  category: "ascii",
  description: "Three nested glyph wire rings precess around a fixed center, with dim rear arcs and one accent joint revealing their depth.",
  tags: ["gyroscope", "rings", "wireframe", "braille", "precession"],
  facets: ["animated"],
  wave: 16,
  release: "motion-materials-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg", "muted", "accent"],
  capture: 2400,
  presets: [
    {
      name: "Gimbal",
      description: "Three nested orthogonal rings with a balanced inclination and slow precession.",
      props: { rings: 3, tilt: 32, speed: 0.65, fontSize: 16, seed: 1 },
    },
    {
      name: "Crossed orbits",
      description: "Two broad crossing wires viewed at a steeper angle, with a slower turn.",
      props: { rings: 2, tilt: 63, speed: 0.35, fontSize: 18, seed: 4 },
    },
    {
      name: "Quiet gimbal",
      description: "Two gently inclined wires keep an open center and a slow accent joint.",
      props: { rings: 2, tilt: 42, speed: 0.22, fontSize: 16, seed: 7 },
    },
  ],
  controls: {
    rings: { type: "number", min: 1, max: 3, step: 1 },
    tilt: { type: "number", min: 15, max: 75, step: 1 },
    speed: { type: "number", min: 0, max: 2, step: 0.01 },
    fontSize: { type: "number", min: 12, max: 22, step: 1 },
    paused: { type: "boolean" },
    time: { type: "number", min: 0, max: 120000, step: 100 },
    seed: { type: "number", min: 0, max: 100, step: 1 },
  },
  credits: [],
  original: true,
};
