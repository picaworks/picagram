import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "avatar",
  title: "Avatar",
  category: "ui",
  description: "A square hairline avatar that shows a photo when available and centered mono initials while it loads or fails.",
  tags: ["avatar", "profile", "image", "initials", "ui"],
  facets: ["static", "image", "canvas", "dither"],
  wave: 6,
  animated: false,
  decorative: false,
  stage: "inline",
  palette: ["fg"],
  demo: { props: { size: 128 } },
  controls: {
    src: { type: "string" },
    name: { type: "string" },
    size: { type: "number", min: 24, max: 128, step: 1 },
    dither: { type: "boolean" },
  },
  original: true,
  credits: [],
};
