import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "scroll-area",
  title: "Scroll Area",
  category: "ui",
  description: "A native scroll container with quiet edge rules and a position marker that leave content and keyboard behavior untouched.",
  tags: ["scroll", "overflow", "container", "ui"],
  facets: ["static"],
  wave: 6,
  animated: false,
  decorative: false,
  stage: "flow",
  wraps: "content",
  palette: ["fg", "muted"],
  demo: {
    props: { height: 36 },
    children: `<ol data-scroll-rows>
  <li><span aria-hidden="true">01</span>Overview</li>
  <li><span aria-hidden="true">02</span>Principles</li>
  <li><span aria-hidden="true">03</span>Typography</li>
  <li><span aria-hidden="true">04</span>Spacing</li>
  <li><span aria-hidden="true">05</span>Color</li>
  <li><span aria-hidden="true">06</span>Structure</li>
  <li><span aria-hidden="true">07</span>Navigation</li>
  <li><span aria-hidden="true">08</span>Controls</li>
  <li><span aria-hidden="true">09</span>Inputs</li>
  <li><span aria-hidden="true">10</span>Feedback</li>
  <li><span aria-hidden="true">11</span>States</li>
  <li><span aria-hidden="true">12</span>Motion</li>
  <li><span aria-hidden="true">13</span>Charts</li>
  <li><span aria-hidden="true">14</span>Patterns</li>
  <li><span aria-hidden="true">15</span>Shaders</li>
  <li><span aria-hidden="true">16</span>Sections</li>
  <li><span aria-hidden="true">17</span>Accessibility</li>
  <li><span aria-hidden="true">18</span>Performance</li>
  <li><span aria-hidden="true">19</span>Testing</li>
  <li><span aria-hidden="true">20</span>Release</li>
</ol>`,
  },
  controls: {
    height: { type: "number", min: 4, max: 40, step: 1 },
    thumb: { type: "boolean" },
    edges: { type: "boolean" },
    label: { type: "string" },
  },
  original: true,
  credits: [],
};
