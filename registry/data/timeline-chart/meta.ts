import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "timeline-chart",
  title: "Timeline Chart",
  category: "data",
  description: "Rows of labeled spans and point events over one shared time axis, for a project plan or a chronology.",
  tags: ["chart", "timeline", "spans", "events", "svg", "glyph", "data table"],
  facets: ["static", "chart"],
  wave: 4,
  animated: false,
  decorative: false,
  controls: {
    data: { type: "json" },
    label: { type: "string" },
    highlight: { type: "number", min: -1, max: 30, step: 1 },
    look: { type: "select", options: ["svg", "glyph"] },
    ticks: { type: "number", min: 2, max: 12, step: 1 },
    rowHeight: { type: "number", min: 16, max: 48, step: 1 },
  },
  palette: ["fg", "accent", "muted"],
  credits: [
    {
      relation: "technique",
      title: "Joseph Priestley and the Graphic Invention of Modern Time",
      author: "Daniel Rosenberg",
      url: "https://doi.org/10.1353/sec.2007.0013",
      license: "Paper",
    },
    {
      relation: "technique",
      title: "Timelines Revisited: A Design Space and Considerations for Expressive Storytelling",
      author: "Brehmer, Lee, Bach, Henry Riche and Munzner",
      url: "https://doi.org/10.1109/TVCG.2016.2614803",
      license: "Paper",
    },
  ],
};
