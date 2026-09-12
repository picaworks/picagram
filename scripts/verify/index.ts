/** Renders components in a real browser and checks both shapes. Each group of checks is its own module in
 *  this directory. Captures land in .pica/captures; dark and light thumbnails land in public/thumbs.
 *  Usage: npm run verify -- <slug> [<slug> ...] [--quick]. With no slug, verifies every component.
 *  --quick checks one viewport and skips the long-task check, for iterating while the machine is busy.
 *  PICA_VERIFY_SLOTS caps how many of these may drive a browser at once on one machine, six by default and
 *  uncapped on CI. See docs/testing/README.md. */
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
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
import { forgetRequests, message, requests } from "./page";
import { render } from "./render";
import { section } from "./section";
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
  ["section", section, (ctx) => ctx.entry.meta.category === "sections"],
  ["lifecycle", lifecycle, () => true],
  ["palette", colors, () => true],
  ["gpu", gpu, (ctx) => ctx.staged.gpu],
  ["interaction", interact, (ctx) => (ctx.entry.meta.interactions?.length ?? 0) > 0 || Object.keys(ctx.entry.meta.controlled ?? {}).length > 0],
  ["fixture", fixtures, () => true],
];

async function verify(browser: Browser, origin: string, entry: Entry): Promise<Check[]> {
  const { meta } = entry;
  forgetRequests();
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
  // The last two answer for every page this component opened, so they are counted once the groups have run:
  // a component makes no network request at all, and it logs no error along the way.
  const asked = requests(origin);
  checks.push({
    name: "asks for nothing else",
    ok: asked.offOrigin === null,
    detail: asked.offOrigin ? `${asked.seen} requests, the first away from the page: ${asked.offOrigin}` : `${asked.seen} requests, each to the page itself`,
  });
  checks.push({ name: "console clean", ok: errors.length === 0, detail: errors[0] ?? "no errors" });
  return checks;
}

/** Where a run parks the slot it holds. */
const SLOTS = join(WORK, "slots");

/** How many verifies may drive a browser on this machine at once. A wave of builders runs sixteen of these
 *  side by side, and the timing checks read a loaded machine as a slow component. A CI job owns its runner,
 *  so nothing there waits for anything. */
function slotLimit(): number {
  const set = process.env.PICA_VERIFY_SLOTS;
  if (set === undefined || set === "") return process.env.CI ? Infinity : 6;
  const count = Number(set);
  if (!Number.isInteger(count) || count < 1) throw new Error(`PICA_VERIFY_SLOTS must be a whole number of one or more, not ${JSON.stringify(set)}`);
  return count;
}

/** Whether the run holding a slot is gone. Signal 0 delivers nothing and only asks whether a process is still
 *  there. A process owned by another user answers EPERM, and a process that answers at all is still running. */
async function abandoned(dir: string): Promise<boolean> {
  const pid = Number((await readFile(join(dir, "pid"), "utf8").catch(() => "")).trim());
  if (!Number.isInteger(pid) || pid < 1) {
    // Writing the pid follows creating the directory by a millisecond or so. A directory older than that
    // with no pid in it belongs to a run that died inside that window.
    const made = await stat(dir).catch(() => null);
    return made !== null && Date.now() - made.mtimeMs > 5_000;
  }
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ESRCH";
  }
}

/** Takes one of the slots, waiting until one is free, and returns how to give it back.
 *  mkdir is the lock, because it is one system call that either creates the directory or fails with EEXIST,
 *  and the kernel lets exactly one caller win. A lock file cannot do that: checking it and writing it are two
 *  calls, and two runs both pass the check before either writes. Reclaiming a dead slot goes through rename
 *  for the same reason, so only one of two runs can move the same slot aside. */
async function takeSlot(limit: number): Promise<() => Promise<void>> {
  if (limit === Infinity) return async () => {};
  await mkdir(SLOTS, { recursive: true });
  let waited = false;
  for (;;) {
    for (let n = 0; n < limit; n++) {
      const dir = join(SLOTS, String(n));
      try {
        await mkdir(dir);
      } catch {
        if (!(await abandoned(dir))) continue;
        const aside = `${dir}.gone.${process.pid}`;
        try {
          await rename(dir, aside);
          await rm(aside, { recursive: true, force: true });
          await mkdir(dir);
        } catch {
          continue;
        }
      }
      await writeFile(join(dir, "pid"), `${process.pid}\n`);
      if (waited) console.log(`took verify slot ${n}`);
      return async () => {
        await rm(dir, { recursive: true, force: true });
      };
    }
    if (!waited) console.log(`every verify slot is taken, waiting (PICA_VERIFY_SLOTS is ${limit})`);
    waited = true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

async function main(): Promise<void> {
  const slugs = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
  const entries = await loadAll(slugs);
  const server = await serve(WORK);
  const release = await takeSlot(slotLimit());
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
    await release();
  }
  console.log(`\n${entries.length - failed} of ${entries.length} passed`);
  if (failed > 0) process.exitCode = 1;
}

await main();
