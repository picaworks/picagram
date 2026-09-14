import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "calendar",
  title: "Calendar",
  category: "ui",
  description: "A month grid with roving keyboard focus and controlled or uncontrolled single date selection.",
  tags: ["calendar", "date", "picker", "form", "ui"],
  facets: ["static", "interactive"],
  wave: 6,
  animated: false,
  decorative: false,
  host: "div",
  stage: "inline",
  palette: ["fg", "accent", "muted"],
  controlled: { value: "valueChange" },
  demo: { props: { defaultValue: "2026-09-15" } },
  interactions: [
    [
      { step: "press", key: "Tab" },
      { step: "expectFocus", selector: "button[data-calendar-date][tabindex=\"0\"]" },
      { step: "press", key: "ArrowRight" },
      { step: "press", key: "Enter" },
      { step: "expectEvent", name: "valueChange" },
    ],
  ],
  controls: {
    defaultValue: { type: "string" },
    weekStartsOn: { type: "number", min: 0, max: 1, step: 1 },
    label: { type: "string" },
  },
  credits: [
    {
      relation: "technique",
      title: "Date picker dialog example",
      author: "W3C WAI-ARIA Authoring Practices Guide",
      url: "https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/",
      license: "W3C document",
    },
  ],
};
