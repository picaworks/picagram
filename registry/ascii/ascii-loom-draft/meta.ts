import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-loom-draft",
  title: "Loom draft",
  category: "ascii",
  description: "A weaving draft in glyphs, where toggling a tie-up cell redraws the crossings of its woven repeat.",
  tags: ["weaving", "draft", "tie-up", "drawdown", "editable grid", "twill"],
  facets: ["static", "text", "interactive"],
  wave: 15,
  release: "components-2026-10-04",
  animated: false,
  decorative: false,
  controls: {
    label: { type: "string", label: "Label" },
    draft: { type: "json", label: "Threading and treadling" },
  },
  credits: [],
  original: true,
  palette: ["fg", "muted", "accent"],
  controlled: { value: "valueChange" },
  interactions: [
    [
      { step: "press", key: "Tab" },
      { step: "expectFocus", selector: "[data-cell='4,1']" },
      { step: "press", key: "ArrowDown" },
      { step: "expectFocus", selector: "[data-cell='3,1']" },
      { step: "press", key: "Space" },
      { step: "expectEvent", name: "valueChange", detail: ["1001", "1100", "1110", "0011"] },
      { step: "expectAttr", selector: "[data-cell='3,1']", name: "aria-pressed", value: "true" },
      {
        step: "expectAttr",
        selector: "[data-part='cells']",
        name: "data-weave",
        value: "11101110/01100110/00110011/10011001/11101110/01100110/00110011/10011001",
      },
    ],
    [
      {
        step: "expectAttr",
        selector: "[data-part='cells']",
        name: "data-weave",
        value: "11001100/01100110/00110011/10011001/11001100/01100110/00110011/10011001",
      },
      { step: "click", selector: "[data-cell='1,1']" },
      { step: "expectEvent", name: "valueChange", detail: ["0001", "1100", "0110", "0011"] },
      { step: "expectAttr", selector: "[data-cell='1,1']", name: "aria-pressed", value: "false" },
      {
        step: "expectAttr",
        selector: "[data-part='cells']",
        name: "data-weave",
        value: "01000100/01100110/00110011/10011001/01000100/01100110/00110011/10011001",
      },
      { step: "click", selector: "[data-cell='1,1']" },
      { step: "expectEvent", name: "valueChange", detail: ["1001", "1100", "0110", "0011"] },
      { step: "expectAttr", selector: "[data-cell='1,1']", name: "aria-pressed", value: "true" },
      {
        step: "expectAttr",
        selector: "[data-part='cells']",
        name: "data-weave",
        value: "11001100/01100110/00110011/10011001/11001100/01100110/00110011/10011001",
      },
    ],
  ],
  demo: {
    props: {
      label: "Straight twill draft",
      draft: { threading: [1, 2, 3, 4, 1, 2, 3, 4], treadling: [1, 2, 3, 4, 1, 2, 3, 4] },
    },
  },
};
