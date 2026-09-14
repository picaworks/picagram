import type { Meta } from "../../../lib/meta";

const PLATE =
  "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22400%22%20height%3D%22500%22%20viewBox%3D%220%200%20400%20500%22%3E%3Crect%20width%3D%22400%22%20height%3D%22500%22%20fill%3D%22dimgray%22%2F%3E%3Ccircle%20cx%3D%22200%22%20cy%3D%22185%22%20r%3D%22120%22%20fill%3D%22whitesmoke%22%2F%3E%3Crect%20x%3D%2255%22%20y%3D%22355%22%20width%3D%22290%22%20height%3D%2295%22%20fill%3D%22silver%22%2F%3E%3C%2Fsvg%3E";

export const meta: Meta = {
  slug: "editorial-hero",
  title: "Editorial Hero",
  category: "sections",
  description:
    "A magazine opening spread: a deck, a large headline, a measured standfirst with a drop capital, and a byline between hairlines.",
  tags: ["editorial", "hero", "magazine", "article", "spread", "drop cap", "section"],
  facets: ["static", "image", "text"],
  wave: 9,
  animated: false,
  decorative: false,
  wraps: "content",
  stage: "flow",
  palette: ["fg", "muted", "accent"],
  demo: {
    props: {
      src: PLATE,
      alt: "A dithered plate of a circle over a plinth.",
    },
    children:
      "<h2>The measure of a page</h2><p>Sixty characters is where a line stops being a guess and starts being a measure, and everything after the standfirst answers to it.</p>",
  },
  controls: {
    deck: { type: "string" },
    headline: { type: "string" },
    subhead: { type: "textarea", rows: 3 },
    byline: { type: "string" },
    date: { type: "string" },
    actions: { type: "json" },
    align: { type: "select", options: ["start", "center"] },
    src: { type: "string", label: "Image URL" },
    alt: { type: "string", label: "Image alt text" },
    minHeight: { type: "number", min: 0, max: 100, step: 5, label: "Min height (vh)" },
  },
  original: true,
  credits: [],
};
