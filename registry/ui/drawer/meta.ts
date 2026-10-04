import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "drawer",
  title: "Drawer",
  category: "ui",
  description: "A native modal panel pinned to the left, right, or bottom edge of the viewport.",
  tags: ["drawer", "dialog", "modal", "panel", "ui"],
  facets: ["static", "interactive"],
  wave: 6,
  animated: false,
  decorative: false,
  host: "dialog",
  wraps: "content",
  palette: ["fg", "bg"],
  controlled: { open: "openChange" },
  demo: {
    props: { defaultOpen: true },
    children: "<p>Review the spacing, palette, and export settings before publishing.</p>",
  },
  interactions: [
    [
      { step: "press", key: "Escape" },
      { step: "expectEvent", name: "openChange", detail: false },
    ],
  ],
  controls: {
    defaultOpen: { type: "boolean" },
    edge: { type: "select", options: ["left", "right", "bottom"] },
    size: { type: "number", min: 16, max: 40, step: 1 },
    title: { type: "string" },
    closable: { type: "boolean" },
    dismissOnBackdrop: { type: "boolean" },
  },
  credits: [
    {
      relation: "technique",
      title: "Dialog (modal) pattern",
      author: "W3C WAI-ARIA Authoring Practices Guide",
      url: "https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/",
      license: "W3C document",
    },
  ],
};
