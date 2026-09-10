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
    // Six samples across three seconds rather than two instants, so an effect that moves in bursts (a
    // glitch, a blink, a scramble that settles) still counts, and so does a single inline glyph.
    const before = await page.screenshot();
    let moved = 0;
    for (let sample = 0; sample < 6; sample++) {
      await page.waitForTimeout(500);
      moved = Math.max(moved, diffPixels(before, await page.screenshot()));
    }
    ctx.checks.push({ name: "animates", ok: moved > 0, detail: `up to ${moved} pixels changed across 3 s` });
    if (!ctx.quick) {
      const longest = await page.evaluate(() => (window as unknown as { picaLongest: number }).picaLongest);
      ctx.checks.push({ name: "no long tasks", ok: longest === 0, detail: longest > 0 ? `a ${longest.toFixed(0)} ms task` : "none over 50 ms in 3 s" });
    }
  } finally {
    await live.close();
  }
}
