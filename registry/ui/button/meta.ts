import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "button",
  title: "Button",
  category: "ui",
  description: "A button in four looks, solid, outline, ghost, and monospace brackets, with a braille spinner while it loads.",
  tags: ["button", "action", "form", "ui"],
  facets: ["static", "interactive"],
  wave: 3,
  animated: false,
  decorative: false,
  host: "button",
  stage: "inline",
  wraps: "content",
  palette: ["accent"],
  demo: { children: "Deploy" },
  interactions: [
    [
      { step: "press", key: "Tab" },
      { step: "expectFocus", selector: "" },
      { step: "press", key: "Enter" },
      { step: "expectEvent", name: "press" },
      { step: "click", selector: "" },
      { step: "expectEvent", name: "press" },
    ],
  ],
  controls: {
    variant: { type: "select", options: ["solid", "outline", "ghost", "brackets"] },
    size: { type: "select", options: ["sm", "md", "lg"] },
    type: { type: "select", options: ["button", "submit", "reset"] },
    disabled: { type: "boolean" },
    loading: { type: "boolean" },
  },
  credits: [
    {
      relation: "technique",
      title: "Button pattern",
      author: "W3C WAI-ARIA Authoring Practices Guide",
      url: "https://www.w3.org/WAI/ARIA/apg/patterns/button/",
      license: "W3C document",
    },
  ],
};
