/** Renders components in a real browser and checks both shapes. Each group of checks is its own module in
 *  this directory. Captures land in .pica/captures; dark and light thumbnails land in public/thumbs.
 *  Usage: npm run verify -- <slug> [<slug> ...] [--quick]. With no slug, verifies every component.
 *  --quick checks one viewport and skips the long-task check, for iterating while the machine is busy.
 *  See docs/testing/README.md. */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium, type Browser } from "@playwright/test";
import { loadAll, type Entry } from "../catalog";
import { CAPTURE_MOTION, VIEWPORTS } from "../config";
import { access } from "./access";
import { colors } from "./colors";
import { fixtures } from "./fixtures";
import { gpu } from "./gpu";
import { interact } from "./interact";
import { lifecycle } from "./lifecycle";
import { motion } from "./motion";
import { message } from "./page";
import { render } from "./render";
import { serve } from "./serve";
import { stage, WORK } from "./stage";
import type { Check, Ctx, Shape } from "./types";

const quick = process.argv.includes("--quick");

/** WebGL on the SwiftShader software renderer, so every machine renders shaders alike, and a fake camera
 *  that needs no permission prompt. */
const FLAGS = [
  "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader",
  "--use-fake-device-for-media-stream",
  "--use-fake-ui-for-media-stream",
];

/** Each group of checks, in order, with when it applies. A group that throws becomes one failing check, and
 *  the groups after it still run. */
const GROUPS: readonly (readonly [string, (ctx: Ctx) => Promise<void>, (ctx: Ctx) => boolean])[] = [
  ["render", render, () => true],
  ["motion", motion, (ctx) => ctx.entry.meta.animated],
  ["accessibility", access, () => true],
  ["lifecycle", lifecycle, () => true],
  ["palette", colors, () => true],
  ["gpu", gpu, (ctx) => ctx.staged.gpu],
  ["interaction", interact, (ctx) => (ctx.entry.meta.interactions?.length ?? 0) > 0 || Object.keys(ctx.entry.meta.controlled ?? {}).length > 0],
  ["fixture", fixtures, () => true],
];

async function verify(browser: Browser, origin: string, entry: Entry): Promise<Check[]> {
  const { meta } = entry;
  let staged: Awaited<ReturnType<typeof stage>>;
  try {
    staged = await stage(entry);
  } catch (error) {
    // A component that cannot be generated, such as one whose single React file would declare a name twice.
    return [{ name: "builds both shapes", ok: false, detail: message(error) }];
  }
  const captures = join(WORK, "captures", meta.slug);
  await mkdir(captures, { recursive: true });
  const checks: Check[] = [];
  const errors: string[] = [];
  const page = (shape: Shape): string =>
    shape === "vanilla" ? staged.pages.vanilla : shape === "react" ? staged.pages.react : staged.pages.vanillaProbe ?? staged.pages.vanilla;
  const ctx: Ctx = {
    browser,
    entry,
    staged,
    quick,
    checks,
    errors,
    captures,
    base: {
      ...(meta.demo?.props ?? {}),
      ...(meta.animated ? { time: meta.capture ?? CAPTURE_MOTION.time, seed: CAPTURE_MOTION.seed } : {}),
    },
    url: (shape) => `${origin}/${page(shape)}`,
    context: (options = {}) =>
      browser.newContext({
        viewport: VIEWPORTS[0],
        deviceScaleFactor: 1,
        colorScheme: "dark",
        locale: "en-US",
        permissions: ["camera"],
        ...options,
      }),
  };
  for (const [name, run, applies] of GROUPS) {
    if (!applies(ctx)) continue;
    try {
      await run(ctx);
    } catch (error) {
      checks.push({ name: `${name} checks`, ok: false, detail: `stopped: ${message(error)}` });
    }
  }
  checks.push({ name: "console clean", ok: errors.length === 0, detail: errors[0] ?? "no errors" });
  return checks;
}

async function main(): Promise<void> {
  const slugs = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
  const entries = await loadAll(slugs);
  const server = await serve(WORK);
  const browser = await chromium.launch({ args: FLAGS });
  let failed = 0;
  try {
    for (const entry of entries) {
      const checks = await verify(browser, server.origin, entry);
      const ok = checks.every((c) => c.ok);
      if (!ok) failed++;
      await writeFile(
        join(WORK, entry.meta.slug, "verify.json"),
        `${JSON.stringify({ ok, quick, checks, at: new Date().toISOString() }, null, 2)}\n`,
      );
      console.log(`\n${entry.meta.slug}${quick ? " (quick)" : ""}`);
      for (const c of checks) console.log(`  ${c.ok ? "pass" : "FAIL"}  ${c.name.padEnd(36)} ${c.detail}`);
    }
  } finally {
    await browser.close();
    await server.close();
  }
  console.log(`\n${entries.length - failed} of ${entries.length} passed`);
  if (failed > 0) process.exitCode = 1;
}

await main();
