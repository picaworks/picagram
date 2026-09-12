import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "block-glitch-image",
  title: "Block Glitch Image",
  category: "effects",
  description: "A photograph that sits still, then briefly shows rectangular blocks copied in from the wrong place.",
  tags: ["image", "glitch", "compression", "blocks", "canvas"],
  facets: ["animated", "image", "canvas"],
  wave: 4,
  animated: true,
  decorative: false,
  palette: ["fg"],
  controls: {
    src: { type: "string", label: "Image URL" },
    alt: { type: "string", label: "Alt text" },
    fit: { type: "select", options: ["cover", "contain"] },
    tone: { type: "select", options: ["auto", "light-on-dark", "dark-on-light"] },
    contrast: { type: "number", min: 0.5, max: 2, step: 0.05 },
    block: { type: "number", min: 8, max: 64, step: 1, label: "Block size" },
    blocks: { type: "number", min: 1, max: 40, step: 1, label: "Blocks per burst" },
    shift: { type: "number", min: 0, max: 0.5, step: 0.01, label: "Shift" },
    burst: { type: "number", min: 60, max: 800, step: 10, label: "Burst length" },
    rest: { type: "number", min: 200, max: 6000, step: 100, label: "Rest length" },
    fps: { type: "number", min: 6, max: 30, step: 1, label: "FPS" },
    paused: { type: "boolean" },
  },
  credits: [
    {
      relation: "technique",
      title: "The Glitch Moment(um)",
      author: "Rosa Menkman",
      url: "https://networkcultures.org/blog/publication/no-04-the-glitch-momentum-rosa-menkman/",
      license: "Book",
    },
    {
      relation: "technique",
      title: "Compression artifact",
      author: "Wikipedia",
      url: "https://en.wikipedia.org/wiki/Compression_artifact",
      license: "Reference, no code",
    },
  ],
};
