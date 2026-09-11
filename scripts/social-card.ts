/** Renders the link preview image, public/og.png, from the wordmark and the tagline, in the site's own colors and
 *  type. Run it again when the wordmark or the tagline changes: npm run social-card. */
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { LOGO_COLS, LOGO_PATH, LOGO_ROWS, LOGO_VIEWBOX } from "../src/lib/logo";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
/** Screen pixels per pixel of the mark, so it stays crisp. */
const CELL = 16;
const height = CELL * LOGO_ROWS;
const width = CELL * LOGO_COLS;

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html, body { margin: 0; width: 1200px; height: 630px; background: #0a0a0a; color: #f1f1ef;
    font-family: "IBM Plex Mono", "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, monospace; }
  main { position: absolute; left: 96px; top: 148px; display: flex; flex-direction: column; gap: 36px; }
  p { margin: 0; font-size: 30px; line-height: 40px; }
  .muted { color: #8d8d8a; font-size: 24px; line-height: 32px; }
  .accent { color: #e8a020; }
</style></head><body><main>
  <svg width="${width}" height="${height}" viewBox="${LOGO_VIEWBOX}" fill="currentColor" shape-rendering="crispEdges"><path d="${LOGO_PATH}"/></svg>
  <p>ASCII-first components for React and plain HTML<span class="accent">_</span></p>
  <p class="muted">One React file and one HTML file per component.</p>
</main></body></html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html);
  await page.screenshot({ path: join(ROOT, "public", "og.png") });
} finally {
  await browser.close();
}
console.log("Wrote public/og.png.");
