import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "command-palette",
  title: "Command Palette",
  category: "ui",
  description: "A modal command palette that filters a flat command list and supports keyboard and pointer selection.",
  tags: ["command", "palette", "combobox", "dialog", "filter", "ui"],
  facets: ["static", "interactive"],
  wave: 6,
  animated: false,
  decorative: false,
  host: "dialog",
  palette: ["fg", "accent", "muted"],
  controlled: { open: "openChange" },
  demo: { props: { defaultOpen: true } },
  interactions: [
    [
      { step: "press", key: "ArrowDown" },
      { step: "press", key: "Enter" },
      { step: "expectEvent", name: "command", detail: "new-component" },
    ],
    [
      { step: "press", key: "Escape" },
      { step: "expectEvent", name: "openChange", detail: false },
    ],
  ],
  controls: {
    commands: { type: "json" },
    defaultOpen: { type: "boolean" },
    placeholder: { type: "string" },
    emptyText: { type: "string" },
    label: { type: "string" },
    width: { type: "number", min: 20, max: 48, step: 1 },
    dismissOnBackdrop: { type: "boolean" },
  },
  credits: [
    {
      relation: "technique",
      title: "Combobox pattern",
      author: "W3C WAI-ARIA Authoring Practices Guide",
      url: "https://www.w3.org/WAI/ARIA/apg/patterns/combobox/",
      license: "W3C document",
    },
    {
      relation: "technique",
      title: "Dialog (modal) pattern",
      author: "W3C WAI-ARIA Authoring Practices Guide",
      url: "https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/",
      license: "W3C document",
    },
  ],
};
