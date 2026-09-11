/** An animated component holds still under reduced motion, moves otherwise, and stays off long tasks. */
import { diffPixels, diffRatio, open, percent } from "./page";
import type { Ctx } from "./types";

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

  const live = await ctx.context();
  try {
    const page = await open(live, ctx.url("vanilla"), { props }, ctx.errors);
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
    const box = await page.locator("#pica").boundingBox();
    const view = page.viewportSize();
    let clip: { x: number; y: number; width: number; height: number } | null = null;
    if (box && view) {
      const x = Math.max(0, Math.floor(box.x));
      const y = Math.max(0, Math.floor(box.y));
      const width = Math.min(view.width, Math.ceil(box.x + box.width)) - x;
      const height = Math.min(view.height, Math.ceil(box.y + box.height)) - y;
      if (width > 0 && height > 0) clip = { x, y, width, height };
    }
    const shot = () => page.screenshot(clip ? { clip } : {});
    const started = Date.now();
    const before = await shot();
    let moved = 0;
    while (moved === 0 && Date.now() - started < 3000) moved = diffPixels(before, await shot());
    const elapsed = Date.now() - started;
    ctx.checks.push({
      name: "animates",
      ok: moved > 0,
      detail: moved > 0 ? `${moved} pixels changed within ${elapsed} ms` : "no change in 3 s",
    });
    if (!ctx.quick) {
      // The long-task check keeps its full three-second window, even when motion showed early.
      if (elapsed < 3000) await page.waitForTimeout(3000 - elapsed);
      const longest = await page.evaluate(() => (window as unknown as { picaLongest: number }).picaLongest);
      ctx.checks.push({ name: "no long tasks", ok: longest === 0, detail: longest > 0 ? `a ${longest.toFixed(0)} ms task` : "none over 50 ms in 3 s" });
    }
  } finally {
    await live.close();
  }
}
