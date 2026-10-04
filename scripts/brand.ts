/** Renders the brand assets from the wordmark and the favicon: the link preview (public/og.png), the README's
 *  wordmark (public/wordmark.svg), and PNG copies of the favicon for browsers that skip SVG icons
 *  (public/favicon-32.png and public/apple-touch-icon.png). Run it again when the wordmark, the tagline, or
 *  public/icon.svg changes: npm run brand. */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { LOGO_COLS, LOGO_PATH, LOGO_ROWS, LOGO_VIEWBOX } from "../src/lib/logo";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PUBLIC = join(ROOT, "public");
/** Screen pixels per pixel of the mark in the link preview, so it stays crisp. */
const CELL = 16;

const card = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html, body { margin: 0; width: 1200px; height: 630px; background: #0a0a0a; color: #f1f1ef;
    font-family: "IBM Plex Mono", "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, monospace; }
  main { position: absolute; left: 96px; top: 148px; display: flex; flex-direction: column; gap: 36px; }
  p { margin: 0; font-size: 30px; line-height: 40px; }
  .muted { color: #8d8d8a; font-size: 24px; line-height: 32px; }
  .accent { color: #13C4A3; }
</style></head><body><main>
  <svg width="${CELL * LOGO_COLS}" height="${CELL * LOGO_ROWS}" viewBox="${LOGO_VIEWBOX}" fill="currentColor" shape-rendering="crispEdges"><path d="${LOGO_PATH}"/></svg>
  <p>ASCII-first components for React and plain HTML<span class="accent">_</span></p>
  <p class="muted">One React file and one HTML file per component.</p>
</main></body></html>`;

// The README's wordmark follows the reader's color scheme, so it reads on GitHub's light and dark themes.
const wordmark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${LOGO_VIEWBOX}" width="${LOGO_COLS * 6}" height="${LOGO_ROWS * 6}" shape-rendering="crispEdges">
  <style>path { fill: #0a0a0a; } @media (prefers-color-scheme: dark) { path { fill: #f1f1ef; } }</style>
  <path d="${LOGO_PATH}"/>
</svg>
`;

const icon = `data:image/svg+xml;base64,${Buffer.from(await readFile(join(PUBLIC, "icon.svg"))).toString("base64")}`;
/** The favicon in its light-scheme look: 32 px, clear, for browser tabs, and 180 px on a paper tile for iOS. */
const TILES = [
  { file: "favicon-32.png", size: 32, pad: 0, background: "transparent" },
  { file: "apple-touch-icon.png", size: 180, pad: 28, background: "#f1f1ef" },
] as const;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(card);
  await page.screenshot({ path: join(PUBLIC, "og.png") });
  for (const tile of TILES) {
    const tab = await browser.newPage({ viewport: { width: tile.size, height: tile.size }, colorScheme: "light" });
    await tab.setContent(
      `<!doctype html><body style="margin:0;width:${tile.size}px;height:${tile.size}px;display:grid;place-items:center;background:${tile.background}"><img src="${icon}" alt="" style="height:${tile.size - 2 * tile.pad}px"></body>`,
    );
    await tab.waitForFunction(() => document.images[0]?.complete === true);
    await tab.screenshot({ path: join(PUBLIC, tile.file), omitBackground: tile.background === "transparent" });
    await tab.close();
  }
} finally {
  await browser.close();
}
await writeFile(join(PUBLIC, "wordmark.svg"), wordmark);
console.log("Wrote public/og.png, public/wordmark.svg, public/favicon-32.png, and public/apple-touch-icon.png.");
