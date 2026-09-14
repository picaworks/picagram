import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "field",
  title: "Field",
  category: "ui",
  description: "A label, description, and validation message around a page-owned form control.",
  tags: ["field", "form", "label", "description", "validation", "error"],
  facets: ["static", "text"],
  wave: 6,
  animated: false,
  decorative: false,
  wraps: "content",
  stage: "flow",
  palette: ["fg", "muted"],
  demo: {
    props: { error: "Branch main is protected." },
    children:
      '<style>.pica-field-demo-control{appearance:none;-webkit-appearance:none;box-sizing:border-box;width:100%;min-width:0;margin:0;padding:.55em .7em;border:1px solid currentColor;border-radius:0;background:transparent;color:inherit;font-family:"JetBrains Mono","IBM Plex Mono",ui-monospace,"SFMono-Regular",Menlo,monospace;font-size:1em;line-height:1.25}.pica-field-demo-control:focus-visible{outline:2px solid var(--pica-accent,currentColor);outline-offset:2px}</style><input class="pica-field-demo-control" id="pica-field-control" type="text" value="feature/field-repair" aria-labelledby="pica-field-control-label" aria-describedby="pica-field-control-description pica-field-control-error" aria-invalid="true">',
  },
  controls: {
    label: { type: "string" },
    description: { type: "string" },
    error: { type: "string" },
    required: { type: "boolean" },
  },
  credits: [
    {
      relation: "technique",
      title: "Labeling Controls",
      author: "W3C Web Accessibility Initiative",
      url: "https://www.w3.org/WAI/tutorials/forms/labels/",
      license: "W3C document",
    },
    {
      relation: "technique",
      title: "Validating Input",
      author: "W3C Web Accessibility Initiative",
      url: "https://www.w3.org/WAI/tutorials/forms/validation/",
      license: "W3C document",
    },
  ],
};
