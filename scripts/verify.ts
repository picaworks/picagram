/** Renders components in a real browser and checks both shapes: they render without errors, match each
 *  other on a dark and a light ground, hold still under reduced motion, animate otherwise, stay off long
 *  tasks, fit the byte budget, and label themselves for assistive technology. Captures land in
 *  .pica/captures; dark and light thumbnails land in public/thumbs.
 *  Usage: npm run verify -- <slug> [<slug> ...] [--quick]   With no slug, verifies every component.
 *  --quick checks one viewport and skips the long-task check, for iterating while the machine is busy.
 *  See docs/testing/README.md. */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { build } from "esbuild";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { loadAll, ROOT, type Entry } from "./catalog";
import { BUDGET_BYTES, CAPTURE_MOTION, DEMO_PAGE_CSS, PARITY_TOLERANCE, VIEWPORTS } from "./config";
import { reactSingleFile, vanillaBundle, vanillaHtml } from "./single-file";

const WORK = join(ROOT, ".pica");
const THUMBS = join(ROOT, "public", "thumbs");
const READY = '[data-pica-ready="true"]';
const quick = process.argv.includes("--quick");

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

interface Staged {
  vanilla: string;
  react: string;
  gzipBytes: number;
}

/** Writes both shapes and a React harness page for one component under .pica/<slug>/. */
async function stage(entry: Entry): Promise<Staged> {
  const dir = join(WORK, entry.meta.slug);
  await mkdir(dir, { recursive: true });
  const bundle = await vanillaBundle(entry);
  await writeFile(join(dir, "vanilla.html"), vanillaHtml(entry, bundle));
  await writeFile(join(dir, "react.tsx"), await reactSingleFile(entry));
  await writeFile(
    join(dir, "harness.tsx"),
    [
      'import { createRoot } from "react-dom/client";',
      `import { ${entry.exportName} } from "./react";`,
      "const props = (window as unknown as { PICA_PROPS?: Record<string, unknown> }).PICA_PROPS ?? {};",
      `createRoot(document.getElementById("root")!).render(<${entry.exportName} {...props} />);`,
      "",
    ].join("\n"),
  );
  const harness = await build({
    entryPoints: [join(dir, "harness.tsx")],
    bundle: true,
    write: false,
    format: "iife",
    jsx: "automatic",
    target: "es2020",
    define: { "process.env.NODE_ENV": '"production"' },
    absWorkingDir: ROOT,
    logLevel: "silent",
    charset: "utf8",
  });
  const js = harness.outputFiles?.[0]?.text ?? "";
  await writeFile(
    join(dir, "react.html"),
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark light"><style>${DEMO_PAGE_CSS}\n#root { width: 100%; height: 100%; }</style></head><body><div id="root"></div><script>${js}</script></body></html>`,
  );
  await writeFile(
    join(dir, "meta.json"),
    `${JSON.stringify({ ...entry.meta, exportName: entry.exportName, gzipBytes: bundle.gzipBytes }, null, 2)}\n`,
  );
  return {
    vanilla: pathToFileURL(join(dir, "vanilla.html")).href,
    react: pathToFileURL(join(dir, "react.html")).href,
    gzipBytes: bundle.gzipBytes,
  };
}

/** Opens a page with initial props and waits until the component reports its first complete frame. */
async function open(context: BrowserContext, url: string, props: Record<string, unknown>, errors: string[]): Promise<Page> {
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript((initial) => {
    (window as unknown as { PICA_PROPS: unknown }).PICA_PROPS = initial;
  }, props);
  await page.goto(url);
  await page.waitForSelector(READY, { state: "attached", timeout: 30_000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  return page;
}

/** Pixels that differ between two captures. Captures of different sizes count as differing everywhere. */
function diffPixels(a: Buffer, b: Buffer): number {
  const left = PNG.sync.read(a);
  const right = PNG.sync.read(b);
  if (left.width !== right.width || left.height !== right.height) {
    return Math.max(left.width * left.height, right.width * right.height);
  }
  return pixelmatch(left.data, right.data, undefined, left.width, left.height, { threshold: 0.1 });
}

/** Share of pixels that differ between two captures. */
function diffRatio(a: Buffer, b: Buffer): number {
  const { width, height } = PNG.sync.read(a);
  return Math.min(1, diffPixels(a, b) / (width * height));
}

const percent = (ratio: number): string => `${(ratio * 100).toFixed(3)}% of pixels`;

/** Captures both shapes in one context and records whether they match. Returns the vanilla page. */
async function compare(
  context: BrowserContext,
  staged: Staged,
  props: Record<string, unknown>,
  errors: string[],
  label: string,
  file: string,
  checks: Check[],
  captures: string,
): Promise<Page> {
  const vanilla = await open(context, staged.vanilla, props, errors);
  const react = await open(context, staged.react, props, errors);
  const vanillaPng = await vanilla.screenshot();
  const reactPng = await react.screenshot();
  await writeFile(join(captures, `vanilla-${file}.png`), vanillaPng);
  await writeFile(join(captures, `react-${file}.png`), reactPng);
  const ratio = diffRatio(vanillaPng, reactPng);
  checks.push({ name: `react matches vanilla ${label}`, ok: ratio <= PARITY_TOLERANCE, detail: `${percent(ratio)} differ` });
  return vanilla;
}

async function verify(browser: Browser, entry: Entry): Promise<Check[]> {
  const { meta } = entry;
  const checks: Check[] = [];
  const errors: string[] = [];
  const staged = await stage(entry);
  checks.push({
    name: "byte budget",
    ok: staged.gzipBytes <= BUDGET_BYTES,
    detail: `${(staged.gzipBytes / 1024).toFixed(1)} KB of ${(BUDGET_BYTES / 1024).toFixed(1)} KB gzipped`,
  });

  const captures = join(WORK, "captures", meta.slug);
  await mkdir(captures, { recursive: true });
  await mkdir(THUMBS, { recursive: true });
  const still: Record<string, unknown> = meta.animated ? { ...CAPTURE_MOTION } : {};
  const viewports = quick ? VIEWPORTS.slice(0, 1) : VIEWPORTS;

  for (const [index, viewport] of viewports.entries()) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, colorScheme: "dark" });
    try {
      const vanilla = await compare(context, staged, still, errors, `at ${viewport.width}`, `${viewport.width}`, checks, captures);
      if (index === 0) {
        await writeFile(join(THUMBS, `${meta.slug}.jpg`), await vanilla.screenshot({ type: "jpeg", quality: 72 }));
        const aria = await vanilla.evaluate((selector) => {
          const el = document.querySelector(selector);
          return el ? { hidden: el.getAttribute("aria-hidden"), role: el.getAttribute("role"), label: el.getAttribute("aria-label") } : null;
        }, READY);
        const labelled = aria !== null && Boolean(aria.role) && Boolean(aria.label);
        const hidden = aria?.hidden === "true";
        checks.push({
          name: "accessible host",
          ok: meta.decorative ? hidden : hidden || labelled,
          detail: aria ? `aria-hidden=${aria.hidden ?? "unset"} role=${aria.role ?? "unset"} label=${aria.label ?? "unset"}` : "no host found",
        });
      }
    } finally {
      await context.close();
    }
  }

  // The same component on a light ground: both shapes again, and the light thumbnail.
  const first = VIEWPORTS[0];
  const light = await browser.newContext({ viewport: first, deviceScaleFactor: 1, colorScheme: "light" });
  try {
    const vanilla = await compare(light, staged, still, errors, "on paper", `${first.width}-light`, checks, captures);
    await writeFile(join(THUMBS, `${meta.slug}-light.jpg`), await vanilla.screenshot({ type: "jpeg", quality: 72 }));
  } finally {
    await light.close();
  }

  if (meta.animated) {
    const reduced = await browser.newContext({ viewport: first, deviceScaleFactor: 1, colorScheme: "dark", reducedMotion: "reduce" });
    try {
      const page = await open(reduced, staged.vanilla, { seed: 1 }, errors);
      const before = await page.screenshot();
      await page.waitForTimeout(700);
      const moved = diffRatio(before, await page.screenshot());
      checks.push({ name: "still under reduced motion", ok: moved === 0, detail: `${percent(moved)} changed in 700 ms` });
    } finally {
      await reduced.close();
    }

    const live = await browser.newContext({ viewport: first, deviceScaleFactor: 1, colorScheme: "dark" });
    try {
      const page = await open(live, staged.vanilla, { seed: 1 }, errors);
      await page.evaluate(() => {
        const w = window as unknown as { picaLongest: number };
        w.picaLongest = 0;
        try {
          new PerformanceObserver((list) => {
            for (const task of list.getEntries()) w.picaLongest = Math.max(w.picaLongest, task.duration);
          }).observe({ type: "longtask" });
        } catch {
          // Long-task timing is unsupported here, so the check reads zero.
        }
      });
      // Six samples across three seconds rather than two instants, so an effect that moves in bursts (a
      // glitch, a blink, a scramble that settles) still counts, and so does a single inline glyph.
      const before = await page.screenshot();
      let moved = 0;
      for (let sample = 0; sample < 6; sample++) {
        await page.waitForTimeout(500);
        moved = Math.max(moved, diffPixels(before, await page.screenshot()));
      }
      checks.push({ name: "animates", ok: moved > 0, detail: `up to ${moved} pixels changed across 3 s` });
      if (!quick) {
        const longest = await page.evaluate(() => (window as unknown as { picaLongest: number }).picaLongest);
        checks.push({ name: "no long tasks", ok: longest === 0, detail: longest > 0 ? `a ${longest.toFixed(0)} ms task` : "none over 50 ms in 3 s" });
      }
    } finally {
      await live.close();
    }
  }

  checks.push({ name: "console clean", ok: errors.length === 0, detail: errors[0] ?? "no errors" });
  return checks;
}

async function main(): Promise<void> {
  const slugs = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
  const entries = await loadAll(slugs);
  const browser = await chromium.launch();
  let failed = 0;
  try {
    for (const entry of entries) {
      const checks = await verify(browser, entry);
      const ok = checks.every((c) => c.ok);
      if (!ok) failed++;
      await writeFile(
        join(WORK, entry.meta.slug, "verify.json"),
        `${JSON.stringify({ ok, quick, checks, at: new Date().toISOString() }, null, 2)}\n`,
      );
      console.log(`\n${entry.meta.slug}${quick ? " (quick)" : ""}`);
      for (const c of checks) console.log(`  ${c.ok ? "pass" : "FAIL"}  ${c.name.padEnd(32)} ${c.detail}`);
    }
  } finally {
    await browser.close();
  }
  console.log(`\n${entries.length - failed} of ${entries.length} passed`);
  if (failed > 0) process.exitCode = 1;
}

await main();
