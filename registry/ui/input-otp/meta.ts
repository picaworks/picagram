import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "input-otp",
  title: "Input OTP",
  category: "ui",
  description: "A one-time code field with roving focus, paste distribution, and controlled or uncontrolled state.",
  tags: ["input", "otp", "code", "form", "ui"],
  facets: ["static", "interactive"],
  wave: 6,
  animated: false,
  decorative: false,
  host: "div",
  stage: "inline",
  palette: ["fg", "accent"],
  controlled: { value: "valueChange" },
  demo: { props: { defaultValue: "37" } },
  interactions: [
    [
      { step: "press", key: "Tab" },
      { step: "press", key: "4" },
      { step: "expectEvent", name: "valueChange", detail: "374" },
      { step: "press", key: "2" },
      { step: "expectEvent", name: "valueChange", detail: "3742" },
    ],
  ],
  controls: {
    length: { type: "number", min: 4, max: 8, step: 1 },
    defaultValue: { type: "string" },
    pattern: { type: "select", options: ["numeric", "alphanumeric"] },
    label: { type: "string" },
    disabled: { type: "boolean" },
  },
  original: true,
  credits: [],
};
