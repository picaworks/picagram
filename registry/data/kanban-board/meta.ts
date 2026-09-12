import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "kanban-board",
  title: "Kanban Board",
  category: "data",
  description: "Columns of cards that move between columns by keyboard or by pointer drag.",
  tags: ["kanban", "board", "cards", "drag", "listbox"],
  facets: ["static", "interactive"],
  wave: 3,
  animated: false,
  decorative: false,
  palette: ["fg", "accent"],
  controlled: { value: "valueChange" },
  interactions: [
    [
      { step: "press", key: "Tab" },
      { step: "expectFocus", selector: '[data-pica="card"]' },
      { step: "press", key: "Space" },
      { step: "press", key: "ArrowRight" },
      { step: "press", key: "Space" },
      { step: "expectEvent", name: "move" },
    ],
  ],
  controls: {
    defaultValue: { type: "json" },
    label: { type: "string" },
    fontFamily: { type: "string" },
  },
  credits: [
    {
      relation: "technique",
      title: "Rearrangeable listbox example",
      author: "W3C WAI-ARIA Authoring Practices Guide",
      url: "https://www.w3.org/WAI/ARIA/apg/patterns/listbox/examples/listbox-rearrangeable/",
      license: "W3C document",
    },
  ],
};
