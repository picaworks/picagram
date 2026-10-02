import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "article-lead",
  title: "Article Lead",
  category: "sections",
  description:
    "The opening of an article: a dateline, the page's own headline and standfirst in a reading measure, and a ruled column of facts and key points.",
  tags: ["article", "essay", "dateline", "byline", "standfirst", "measure", "key points", "section"],
  facets: ["static", "text"],
  wave: 11,
  animated: false,
  decorative: false,
  host: "div",
  wraps: "content",
  stage: "flow",
  palette: ["fg", "muted", "accent"],
  demo: {
    children:
      "<h1>Why a measure matters.</h1><p>Sixty characters is where a line stops being a guess and starts being a reading habit, and every other choice on the page answers to it.</p><p>The paragraphs below hold to the same width.</p>",
  },
  controls: {
    section: { type: "string" },
    date: { type: "string", label: "Date (ISO)" },
    authors: { type: "json" },
    readingTime: { type: "number", min: 0, max: 60, step: 1, label: "Read time (minutes)" },
    points: { type: "json" },
    pointsLabel: { type: "string" },
    label: { type: "string", label: "Aside label" },
    measure: { type: "number", min: 48, max: 80, step: 1, label: "Measure (ch)" },
  },
  original: true,
  credits: [],
};
