import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-terminal",
  title: "ASCII Terminal",
  category: "text-mode",
  description: "A terminal session that types a command and prints its output, then rests on a blinking cursor.",
  tags: ["terminal", "typing", "cursor", "cli"],
  facets: ["animated", "text"],
  wave: 2,
  animated: true,
  decorative: false,
  palette: ["fg", "accent"],
  // The frame at 4000 ms shows the whole default transcript; the one at 1200 ms shows half a command.
  capture: 4000,
  controls: {
    script: { type: "textarea", rows: 5, label: "Script" },
    prompt: { type: "string" },
    typeSpeed: { type: "number", min: 4, max: 40, step: 1, label: "Type speed" },
    lineDelay: { type: "number", min: 0, max: 1500, step: 10, label: "Line delay" },
    loop: { type: "number", min: 0, max: 8000, step: 100 },
  },
  credits: [],
  original: true,
};
