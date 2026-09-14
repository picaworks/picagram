import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "toast",
  title: "Toast",
  category: "ui",
  description: "A polite live stack of dismissible notices with pausable expiry and four corner positions.",
  tags: ["toast", "notification", "status", "ui"],
  facets: ["static", "interactive"],
  wave: 6,
  animated: false,
  decorative: false,
  host: "div",
  palette: ["fg", "muted", "accent"],
  demo: {
    props: {
      toasts: [
        {
          id: "build-finished",
          title: "Build finished",
          message: "All checks passed in 42 seconds.",
          tone: "accent",
        },
        {
          id: "warnings",
          title: "3 warnings",
          message: "Review the remaining type warnings.",
          tone: "default",
        },
      ],
      duration: 0,
    },
  },
  interactions: [
    [
      { step: "click", selector: '[data-pica-close="build-finished"]' },
      { step: "expectEvent", name: "dismiss", detail: "build-finished" },
    ],
  ],
  controls: {
    toasts: { type: "json" },
    duration: { type: "number", min: 0, max: 20000, step: 500 },
    position: { type: "select", options: ["top-start", "top-end", "bottom-start", "bottom-end"] },
    label: { type: "string" },
    max: { type: "number", min: 1, max: 6, step: 1 },
  },
  credits: [
    {
      relation: "technique",
      title: "Alert pattern",
      author: "W3C WAI-ARIA Authoring Practices Guide",
      url: "https://www.w3.org/WAI/ARIA/apg/patterns/alert/",
      license: "W3C document",
    },
    {
      relation: "technique",
      title: "Alert and message dialogs pattern",
      author: "W3C WAI-ARIA Authoring Practices Guide",
      url: "https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/",
      license: "W3C document",
    },
  ],
};
