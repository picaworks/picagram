/** A shader component renders on the software path every machine shares, puts something on the GPU path,
 *  advances when it is animated, survives a lost context, and falls back to a still picture when WebGL2 is
 *  missing. The ink and progress checks read the real WebGL2 path: without them a shader that compiles but
 *  draws nothing, or one whose loop never runs, is caught only indirectly, and inside a section not at all,
 *  because the copy around it keeps animating and keeps answering to the palette. */
import type { Page } from "@playwright/test";
import { PARITY_TOLERANCE } from "../config";
import { clipOf, diffPixels, diffRatio, inkRatio, message, open, percent, READY, settle } from "./page";
import type { Clip } from "./page";
import type { Ctx } from "./types";

/** Finds the component's own WebGL2 canvas and says whether the real path is what is on screen. A section
 *  holds more than one canvas, so the probe keeps the one that answers to webgl2: getContext returns the
 *  context a canvas was created with and null for a 2D one, so asking costs nothing. lib/gl.ts sets
 *  canvas.style.background to the CSS fallback only when the program failed to build, which makes an empty
 *  background the contract's own signal that WebGL2 drew this frame. */
async function glCanvas(page: Page): Promise<{ problem: string | null; clip: Clip | null }> {
  const found = await page.evaluate((ready) => {
    const host = document.querySelector(ready);
    for (const canvas of Array.from(host?.querySelectorAll("canvas") ?? [])) {
      let gl: WebGL2RenderingContext | null;
      try {
        gl = canvas.getContext("webgl2");
      } catch {
        gl = null;
      }
      if (!gl) continue;
      canvas.setAttribute("data-pica-gl-probe", "");
      return { lost: gl.isContextLost(), fallback: canvas.style.background !== "" };
    }
    return null;
  }, READY);
  if (!found) return { problem: "no WebGL2 canvas in the host", clip: null };
  if (found.lost) return { problem: "the WebGL2 context is lost", clip: null };
  if (found.fallback) return { problem: "the canvas shows its CSS fallback, not WebGL2", clip: null };
  return { problem: null, clip: await clipOf(page, page.locator("[data-pica-gl-probe]").first()) };
}

/** Shows the probed canvas alone, or puts the host back. A screenshot is of the page, so a region clipped to
 *  the canvas still catches everything painted over it, which in a section is the copy and the other
 *  components it composes. Visibility inherits, so hiding the host and re-showing the one canvas leaves the
 *  canvas on screen in its own place, at its own size, with nothing on top of it. preserveDrawingBuffer is
 *  false in lib/gl.ts, so reading the canvas back directly is not open to us. */
async function isolate(page: Page, on: boolean): Promise<void> {
  await page.evaluate(
    ({ ready, on }) => {
      const host = document.querySelector(ready) as HTMLElement | null;
      const canvas = document.querySelector("[data-pica-gl-probe]") as HTMLElement | null;
      if (!host || !canvas) return;
      host.style.visibility = on ? "hidden" : "";
      canvas.style.visibility = on ? "visible" : "";
    },
    { ready: READY, on },
  );
}

export async function gpu(ctx: Ctx): Promise<void> {
  const context = await ctx.context();
  try {
    const page = await open(context, ctx.url("vanilla"), { props: ctx.base }, ctx.errors);
    const renderer = await page.evaluate(() => {
      const gl = document.createElement("canvas").getContext("webgl2");
      if (!gl) return "no WebGL2";
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      return String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    });
    ctx.checks.push({ name: "software renderer", ok: /swiftshader/i.test(renderer), detail: renderer.slice(0, 80) });

    const probe = await glCanvas(page);
    if (probe.problem || !probe.clip) {
      ctx.checks.push({ name: "gpu inks the frame", ok: false, detail: probe.problem ?? "the canvas has no box on screen" });
    } else {
      await isolate(page, true);
      const drawn = inkRatio(await page.screenshot({ clip: probe.clip }));
      await isolate(page, false);
      ctx.checks.push({ name: "gpu inks the frame", ok: drawn > 0.01, detail: `${percent(drawn)} of the canvas away from its corner` });
    }

    const before = await page.screenshot();
    await page.evaluate(async (ready) => {
      const canvas = document.querySelector(ready)?.querySelector("canvas");
      const extension = canvas?.getContext("webgl2")?.getExtension("WEBGL_lose_context");
      if (!extension) return;
      extension.loseContext();
      await new Promise((resolve) => setTimeout(resolve, 100));
      extension.restoreContext();
      await new Promise((resolve) => setTimeout(resolve, 300));
    }, READY);
    await settle(page);
    const restored = diffRatio(before, await page.screenshot());
    ctx.checks.push({ name: "survives a lost context", ok: restored <= PARITY_TOLERANCE, detail: `${percent(restored)} differ after restoring` });
  } finally {
    await context.close();
  }

  if (ctx.entry.meta.animated) {
    // Free-running props, the way motion.ts builds them: ctx.base pins time for an animated component, which
    // would hold the very frame this check has to watch advance.
    const running = { ...(ctx.entry.meta.demo?.props ?? {}), seed: 1 };
    const live = await ctx.context();
    try {
      const page = await open(live, ctx.url("vanilla"), { props: running }, ctx.errors);
      const probe = await glCanvas(page);
      if (probe.problem || !probe.clip) {
        ctx.checks.push({ name: "gpu frame progress", ok: false, detail: probe.problem ?? "the canvas has no box on screen" });
      } else {
        await isolate(page, true);
        const clip = probe.clip;
        const shot = () => page.screenshot({ clip });
        const started = Date.now();
        const first = await shot();
        let moved = 0;
        while (moved === 0 && Date.now() - started < 3000) moved = diffPixels(first, await shot());
        await isolate(page, false);
        ctx.checks.push({
          name: "gpu frame progress",
          ok: moved > 0,
          detail: moved > 0 ? `${moved} pixels changed within ${Date.now() - started} ms` : "the canvas never advanced in 3 s",
        });
      }
    } catch (error) {
      ctx.checks.push({ name: "gpu frame progress", ok: false, detail: message(error) });
    } finally {
      await live.close();
    }
  }

  const bare = await ctx.context();
  try {
    const page = await open(bare, ctx.url("vanilla"), { props: ctx.base, noWebgl: true }, ctx.errors);
    const ink = inkRatio(await page.screenshot());
    ctx.checks.push({ name: "falls back without WebGL2", ok: ink > 0.01, detail: `${percent(ink)} away from the ground` });
  } catch (error) {
    ctx.checks.push({ name: "falls back without WebGL2", ok: false, detail: message(error) });
  } finally {
    await bare.close();
  }
}
