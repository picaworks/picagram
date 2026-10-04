import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "empty-state",
  title: "Empty State",
  category: "ui",
  description: "A measured empty state with a box drawn mark, supporting copy, and one quiet action.",
  tags: ["empty", "placeholder", "message", "action", "ui"],
  facets: ["static", "text"],
  wave: 6,
  animated: false,
  decorative: false,
  stage: "flow",
  palette: ["fg", "accent", "muted"],
  controls: {
    mark: { type: "select", options: ["tray", "magnifier", "orbit"] },
    title: { type: "string" },
    message: { type: "textarea", rows: 3 },
    action: { type: "json" },
  },
  original: true,
  credits: [],
};
