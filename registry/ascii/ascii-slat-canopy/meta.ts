import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-slat-canopy",
  title: "ASCII Slat Canopy",
  category: "ascii",
  description: "Parallel curved slats tilt in a finite open vault, joined by two eaves and a sparse crown rail.",
  tags: ["canopy", "vault", "ribs", "architecture", "braille", "animated"],
  facets: ["animated"],
  wave: 17,
  release: "kinetic-studies-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    ribs: { type: "number", min: 4, max: 12, step: 1, label: "Structural ribs" },
    arch: { type: "number", min: 0.5, max: 1.6, step: 0.05, label: "Vault height" },
    tilt: { type: "number", min: -20, max: 30, step: 1, label: "Rib tilt in degrees" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Rocking speed" },
    fontSize: { type: "number", min: 12, max: 20, step: 1, label: "Glyph size" },
    paused: { type: "boolean", label: "Pause motion" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Starting phase seed" },
  },
  presets: [
    {
      name: "Open pavilion",
      description: "Seven double-edged ribs describe a medium vault with small offset tilts.",
      props: { ribs: 7, arch: 1.05, tilt: 10, speed: 0.7, fontSize: 14, seed: 1 },
    },
    {
      name: "Low arcade",
      description: "Ten close ribs form a shallow canopy with a nearly upright resting angle.",
      props: { ribs: 10, arch: 0.8, tilt: 4, speed: 0.5, fontSize: 12, seed: 4 },
    },
    {
      name: "High shelter",
      description: "Five tall arches leave broad open bays beneath a more pronounced slat tilt.",
      props: { ribs: 5, arch: 1.4, tilt: 22, speed: 0.85, fontSize: 16, seed: 9 },
    },
  ],
  original: true,
  credits: [],
};
