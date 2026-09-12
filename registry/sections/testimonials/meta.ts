import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "testimonials",
  title: "Testimonials",
  category: "sections",
  description: "Quotes shown as a grid of cards, or as one quote at a time that resolves from scrambled glyphs.",
  tags: ["testimonials", "quotes", "carousel", "section", "social proof"],
  facets: ["animated", "interactive"],
  wave: 3,
  animated: true,
  decorative: false,
  palette: ["fg"],
  capture: 1800,
  demo: { props: { layout: "rotate" } },
  interactions: [
    [
      { step: "press", key: "Tab" },
      { step: "expectFocus", selector: ".tm-prev" },
      { step: "press", key: "Tab" },
      { step: "expectFocus", selector: ".tm-next" },
      { step: "press", key: "Enter" },
      { step: "expectAttr", selector: ".tm-slide", name: "aria-label", value: "2 of 4" },
    ],
  ],
  controls: {
    items: { type: "json" },
    layout: { type: "select", options: ["grid", "rotate"] },
    columns: { type: "number", min: 1, max: 4, step: 1 },
    interval: { type: "number", min: 3000, max: 15000, step: 500 },
    label: { type: "string" },
    fontFamily: { type: "string", label: "Font family" },
    paused: { type: "boolean" },
    seed: { type: "number", min: 1, max: 999, step: 1 },
  },
  credits: [
    {
      relation: "technique",
      title: "Carousel pattern",
      author: "W3C WAI-ARIA Authoring Practices Guide",
      url: "https://www.w3.org/WAI/ARIA/apg/patterns/carousel/",
      license: "W3C document",
    },
  ],
};
