import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "dialog",
  title: "Dialog",
  category: "ui",
  description: "A modal dialog on the native dialog element, with focus containment, Escape, and the top layer handled by the browser.",
  tags: ["dialog", "modal", "overlay", "ui"],
  wave: 3,
  animated: false,
  decorative: false,
  host: "dialog",
  wraps: "content",
  palette: ["fg"],
  controlled: { open: "openChange" },
  demo: {
    props: { defaultOpen: true },
    children: '<p>This publishes the current build to production.</p><button type="button">Deploy</button>',
  },
  interactions: [
    [
      { step: "press", key: "Escape" },
      { step: "expectEvent", name: "openChange", detail: false },
    ],
  ],
  controls: {
    title: { type: "string" },
    closable: { type: "boolean" },
    dismissOnBackdrop: { type: "boolean" },
    width: { type: "number", min: 20, max: 60, step: 1 },
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
