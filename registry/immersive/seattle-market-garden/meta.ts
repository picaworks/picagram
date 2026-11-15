import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "seattle-market-garden",
  title: "Seattle Market Garden",
  category: "immersive",
  description: "Open produce stalls and broad cultivated beds share an urban parcel beneath one slowly rolling cloth awning.",
  tags: ["pixel","isometric","market","garden","seattle"],
  facets: ["animated","canvas"],
  wave: 19,
  release: "pixel-worlds-2026-11-15",
  animated: true,
  decorative: true,
  original: true,
  credits: [],
  palette: ["fg","bg","accent"],
  controls: {
    layout: { type: "select", options: ["stair-market","garden-court","roof-market"], label: "Market layout" },
    stallBays: { type: "number", min: 2, max: 4, step: 1, label: "Stall bays" },
    gardenBeds: { type: "number", min: 1, max: 3, step: 1, label: "Growing beds" },
    paused: { type: "boolean", label: "Pause awning" },
    time: { type: "number", min: 0, max: 20000, step: 100, label: "Fixed time" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Awning phase seed" },
  },
  presets: [
    { name: "Market Steps", description: "Three stalls line the lower edge of an exposed stair to a cultivated terrace.", props: { layout: "stair-market", stallBays: 3, gardenBeds: 2 } },
    { name: "Garden Court", description: "An L shaped shed frames three beds and a broad open working entrance.", props: { layout: "garden-court", stallBays: 4, gardenBeds: 3 } },
    { name: "Roof Market", description: "Two market roof layers frame an open gallery beneath a raised garden and exterior stair landing.", props: { layout: "roof-market", stallBays: 2, gardenBeds: 2 } },
  ],
};
