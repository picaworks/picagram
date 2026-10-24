import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-cellular-tape",
  title: "ASCII Cellular Tape",
  category: "ascii",
  description: "An elementary cellular automaton unfolds row by row into a numbered ASCII tape, with its rule table and current generation always visible.",
  tags: ["cellular-automaton", "rule-tape", "generative", "ascii", "animated"],
  facets: ["animated"],
  wave: 15,
  release: "components-2026-10-04",
  animated: true,
  decorative: false,
  palette: ["fg", "bg", "accent", "muted"],
  capture: 2400,
  presets: [
    {
        "name": "Compact rule 110",
        "description": "A readable compact tape with enough rows to show the rule.",
        "props": {
            "rule": 110,
            "columns": 31,
            "generations": 24,
            "initialCells": ""
        }
    },
    {
        "name": "Rule 30 fan",
        "description": "One initial cell expands into an irregular triangular pattern.",
        "props": {
            "rule": 30,
            "columns": 41,
            "generations": 24,
            "initialCells": "1"
        }
    },
    {
        "name": "Rule 90 triangle",
        "description": "A wider tape reveals the repeated branching of rule 90.",
        "props": {
            "rule": 90,
            "columns": 41,
            "generations": 32,
            "initialCells": "1"
        }
    }
],
  controls: {
    rule: { type: "number", min: 0, max: 255, step: 1 },
    columns: { type: "number", min: 15, max: 121, step: 1 },
    generations: { type: "number", min: 8, max: 80, step: 1 },
    initialCells: { type: "string" },
    paused: { type: "boolean" },
    seed: { type: "number", min: 1, max: 999, step: 1 },
  },
  credits: [],
  original: true,
};
