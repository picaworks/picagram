import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "pixel-lily-pond", title: "Lily Pond", category: "immersive",
  description: "A large fish circles broad lily pads and a low cupped lotus in a shallow pond cut into a grassy tile.",
  tags: ["pixel", "isometric", "pond", "fish", "lotus"],
  facets: ["animated", "canvas"], wave: 19, release: "pixel-worlds-2026-11-15",
  animated: true, decorative: true, original: true, credits: [], palette: ["fg", "bg", "accent"],
  controls: {
    layout: { type: "select", options: ["cove", "island", "crescent"], label: "Pond arrangement" },
    lilyCover: { type: "number", min: 0.15, max: 0.45, step: 0.05, label: "Lily coverage" },
    swimPace: { type: "number", min: 0.2, max: 0.8, step: 0.05, label: "Swimming pace" },
    paused: { type: "boolean", label: "Pause swimming" },
    time: { type: "number", min: 0, max: 30000, step: 100, label: "Fixed time" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Route phase seed" },
  },
  presets: [
    { name: "Cove", description: "A sheltered lotus bank opens onto a broad foreground circuit.", props: { layout: "cove", lilyCover: 0.3, swimPace: 0.5 } },
    { name: "Island", description: "A grassy central island divides the water into an outer swimming loop.", props: { layout: "island", lilyCover: 0.25, swimPace: 0.4 } },
    { name: "Crescent", description: "A raised peninsula holds two sheltered tips beside a long return route.", props: { layout: "crescent", lilyCover: 0.35, swimPace: 0.6 } },
  ],
};
