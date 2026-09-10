/** Constants the build, the verifier, and the tests share. Each one is written here and nowhere else. */

/** The license as a reader sees it. test/license.test.ts checks it agrees everywhere it appears. */
export const LICENSE_LABEL = "MIT + Commons Clause";
export const LICENSE_URL = "https://github.com/rishabbalak/pica/blob/main/LICENSE.md";
export const HOMEPAGE = "https://github.com/rishabbalak/pica";
/** Where registry items are fetched from by `npx shadcn add`. Moves to the site's /r once there is a domain. */
export const REGISTRY_BASE = "https://raw.githubusercontent.com/rishabbalak/pica/main/public/r";

/** The most a component's vanilla bundle may weigh, minified and gzipped, shared runtime included. Cited in AGENTS.md. */
export const BUDGET_BYTES = 6144;

/** Viewports every component is captured at. */
export const VIEWPORTS = [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
] as const;

/** Share of pixels allowed to differ between the React and vanilla captures, for antialiasing. */
export const PARITY_TOLERANCE = 0.002;

/** Props applied to animated components for captures: a fixed time and seed make a frame reproducible. */
export const CAPTURE_MOTION = { time: 1200, seed: 1 } as const;

/** Page styles shared by the vanilla file and the React harness, so their captures compare like with like.
 *  The ground follows the viewer's color scheme unless the parent frame sets data-ground, as the catalog does. */
export const DEMO_PAGE_CSS = [
  "html, body { margin: 0; height: 100%; background: #0a0a0a; color: #f1f1ef; }",
  "@media (prefers-color-scheme: light) { html:not([data-ground]), html:not([data-ground]) body { background: #f1f1ef; color: #0a0a0a; } }",
  'html[data-ground="paper"], html[data-ground="paper"] body { background: #f1f1ef; color: #0a0a0a; }',
  'html[data-ground="checker"] body { background: repeating-conic-gradient(#161616 0% 25%, #0a0a0a 0% 50%) 50% / 24px 24px; }',
  "#pica { width: 100%; height: 100%; }",
].join("\n");
