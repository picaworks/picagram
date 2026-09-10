/** Constants the build, the verifier, and the tests share. Each one is written here and nowhere else. */
import type { Category } from "../lib/meta";

/** The license as a reader sees it. test/license.test.ts checks it agrees everywhere it appears. */
export const LICENSE_LABEL = "MIT + Commons Clause";
export const LICENSE_URL = "https://github.com/rishabbalak/pica/blob/main/LICENSE.md";
export const HOMEPAGE = "https://github.com/rishabbalak/pica";
/** Where registry items are fetched from by `npx shadcn add`. Moves to the site's /r once there is a domain. */
export const REGISTRY_BASE = "https://raw.githubusercontent.com/rishabbalak/pica/main/public/r";

/** The most a component's vanilla bundle may weigh, minified and gzipped, shared runtime included. Sections
 *  inline the components they compose, and interactive and GPU components carry more runtime, so the budget
 *  depends on the category. Cited in AGENTS.md. See docs/decisions/0007. */
export const BUDGETS: Readonly<Record<Category, number>> = {
  ascii: 6144,
  "text-mode": 6144,
  dither: 6144,
  effects: 6144,
  patterns: 6144,
  motion: 6144,
  shaders: 8192,
  data: 8192,
  ui: 8192,
  immersive: 8192,
  sections: 16384,
};

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
  ":root { --pica-accent: #e8a020; }",
  'html, body { margin: 0; height: 100%; background: #0a0a0a; color: #f1f1ef; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }',
  "@media (prefers-color-scheme: light) { html:not([data-ground]), html:not([data-ground]) body { background: #f1f1ef; color: #0a0a0a; } }",
  'html[data-ground="paper"], html[data-ground="paper"] body { background: #f1f1ef; color: #0a0a0a; }',
  'html[data-ground="checker"] body { background: repeating-conic-gradient(#161616 0% 25%, #0a0a0a 0% 50%) 50% / 24px 24px; }',
  "#pica { width: 100%; height: 100%; }",
  // A text run is captured centered and enlarged, so it reads at a useful size. See meta.stage.
  ".pica-stage { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: clamp(20px, 3.2vw, 40px); }",
  ".pica-stage #pica { width: auto; height: auto; }",
  ".pica-stage span#pica, .pica-stage div#pica { display: inline-block; }",
].join("\n");
