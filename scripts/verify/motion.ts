/** An animated component holds still under reduced motion, moves otherwise, and stays off long tasks. Motion
 *  is read in both shapes: a wrapper that drops a motion prop, or remounts on every render, leaves the vanilla
 *  file animating perfectly while the React one sits still or restarts. */
import { diffPixels, diffRatio, clipOf, open, percent, READY } from "./page";
import type { Ctx, Shape } from "./types";

export async function motion(ctx: Ctx): Promise<void> {
  const props = { ...(ctx.entry.meta.demo?.props ?? {}), seed: 1 };

  const reduced = await ctx.context({ reducedMotion: "reduce" });
  try {
    const page = await open(reduced, ctx.url("vanilla"), { props }, ctx.errors);
    const before = await page.screenshot();
    await page.waitForTimeout(700);
    const moved = diffRatio(before, await page.screenshot());
    ctx.checks.push({ name: "still under reduced motion", ok: moved === 0, detail: `${percent(moved)} changed in 700 ms` });
  } finally {
    await reduced.close();
  }

  await animates(ctx, props, "vanilla");
  // The React shape's motion is read only on a full run. It doubles the screenshot work of the most
  // timing-sensitive check in the suite, and CI leaves PICA_VERIFY_SLOTS uncapped, so under --quick a slow
  // drifting field can lose its whole three second window to screenshot latency and report no change at all.
  // "no long tasks" is skipped here for the same reason.
  if (!ctx.quick) await animates(ctx, props, "react");
}

/** Watches one shape move. Only the vanilla run carries the long-task check: it measures the core's own work,
 *  which is the same code in both shapes, and a second three-second window would buy nothing. */
async function animates(ctx: Ctx, props: Record<string, unknown>, shape: Shape): Promise<void> {
  const name = shape === "vanilla" ? "animates" : "animates in react";
  const live = await ctx.context();
  try {
    const page = await open(live, ctx.url(shape), { props }, ctx.errors);
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
    // Samples as fast as the browser takes screenshots, for up to three seconds, and stops at the first change.
    // Fixed gaps between samples let a short burst (glitch-text's 280 ms glitch) fall between two of them on a
    // slow machine. Each shot is clipped to the host, which keeps it quick.
    const clip = await clipOf(page, page.locator(READY).first());
    const shot = () => page.screenshot(clip ? { clip } : {});
    const started = Date.now();
    const before = await shot();
    let moved = 0;
    while (moved === 0 && Date.now() - started < 3000) moved = diffPixels(before, await shot());
    const elapsed = Date.now() - started;
    ctx.checks.push({
      name,
      ok: moved > 0,
      detail: moved > 0 ? `${moved} pixels changed within ${elapsed} ms` : "no change in 3 s",
    });
    if (!ctx.quick && shape === "vanilla") {
      // The long-task check keeps its full three-second window, even when motion showed early.
      if (elapsed < 3000) await page.waitForTimeout(3000 - elapsed);
      const longest = await page.evaluate(() => (window as unknown as { picaLongest: number }).picaLongest);
      ctx.checks.push({ name: "no long tasks", ok: longest === 0, detail: longest > 0 ? `a ${longest.toFixed(0)} ms task` : "none over 50 ms in 3 s" });
    }
  } finally {
    await live.close();
  }
}
