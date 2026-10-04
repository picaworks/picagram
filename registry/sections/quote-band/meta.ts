import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "quote-band",
  title: "Quote Band",
  category: "sections",
  description: "One pull quote set large between two hairline rules, with its attribution and an optional quiet dot lattice.",
  tags: ["quote", "pull quote", "blockquote", "section", "typography", "attribution"],
  facets: ["static", "text", "background"],
  wave: 11,
  animated: false,
  decorative: false,
  wraps: "content",
  stage: "flow",
  host: "div",
  palette: ["fg", "muted", "accent"],
  demo: {
    children: "<p>From the maintainers' notes.</p>",
  },
  controls: {
    quote: { type: "textarea", rows: 3 },
    name: { type: "string" },
    role: { type: "string" },
    href: { type: "string", label: "Source link" },
    align: { type: "select", options: ["start", "center"] },
    background: { type: "select", options: ["dots", "none"] },
    strength: { type: "number", min: 0, max: 0.6, step: 0.05 },
  },
  original: true,
  credits: [],
};
