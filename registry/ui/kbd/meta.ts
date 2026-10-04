import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "kbd",
  title: "Kbd",
  category: "ui",
  description: "A keyboard chord drawn as physical key caps or bracketed monospace text.",
  tags: ["keyboard", "shortcut", "keys", "ui"],
  facets: ["static", "text"],
  wave: 6,
  animated: false,
  decorative: false,
  host: "span",
  stage: "inline",
  palette: ["fg", "muted"],
  controls: {
    keys: { type: "json" },
    variant: { type: "select", options: ["caps", "brackets"] },
  },
  original: true,
  credits: [],
};
