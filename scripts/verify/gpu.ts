/** A shader component renders on the software path every machine shares, survives a lost context, and falls
 *  back to a still picture when WebGL2 is missing. */
import { PARITY_TOLERANCE } from "../config";
import { diffRatio, inkRatio, message, open, percent, READY, settle } from "./page";
import type { Ctx } from "./types";

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
