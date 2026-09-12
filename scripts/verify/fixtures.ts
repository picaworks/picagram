/** Real inputs as well as the built-in subject: an image component draws a PNG, and the video component draws
 *  Chromium's fake camera. */
import { PNG } from "pngjs";
import { takesImage } from "../catalog";
import { inkRatio, message, open, percent } from "./page";
import type { Ctx } from "./types";

let fixture = "";

/** A small grey ramp with a dark square, as a data URI. A data URI keeps the canvas readable, where a file
 *  from another origin would taint it. */
function image(): string {
  if (fixture) return fixture;
  const png = new PNG({ width: 64, height: 48 });
  for (let y = 0; y < 48; y++) {
    for (let x = 0; x < 64; x++) {
      const i = (y * 64 + x) * 4;
      const v = x > 20 && x < 44 && y > 12 && y < 36 ? 16 : Math.round((255 * x) / 63);
      png.data[i] = v;
      png.data[i + 1] = v;
      png.data[i + 2] = v;
      png.data[i + 3] = 255;
    }
  }
  fixture = `data:image/png;base64,${PNG.sync.write(png).toString("base64")}`;
  return fixture;
}

async function attempt(ctx: Ctx, name: string, props: Record<string, unknown>): Promise<void> {
  const context = await ctx.context();
  try {
    const page = await open(context, ctx.url("vanilla"), { props }, ctx.errors);
    const ink = inkRatio(await page.screenshot());
    ctx.checks.push({ name, ok: ink > 0.01, detail: `${percent(ink)} away from the ground` });
  } catch (error) {
    ctx.checks.push({ name, ok: false, detail: message(error) });
  } finally {
    await context.close();
  }
}

export async function fixtures(ctx: Ctx): Promise<void> {
  const { defaults } = ctx.entry;
  if (takesImage(ctx.entry)) await attempt(ctx, "renders a real image", { ...ctx.base, src: image() });
  if (typeof defaults.webcam === "boolean") await attempt(ctx, "renders the camera", { ...ctx.base, webcam: true });
}
