/** Both shapes render and match: at each viewport on the dark ground, and at the first on paper. Writes the
 *  captures and the catalog's two thumbnails, and checks the byte budget. */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { BrowserContext, Page } from "@playwright/test";
import { ROOT } from "../catalog";
import { BUDGETS, PARITY_TOLERANCE, VIEWPORTS } from "../config";
import { diffRatio, open, percent, type OpenOptions } from "./page";
import type { Ctx } from "./types";

const THUMBS = join(ROOT, "public", "thumbs");

/** Opens both shapes with the same options in one context and records whether they match. Returns the
 *  vanilla page, still open, and its capture. `file` names the captures to keep, or null to keep none. */
export async function compare(
  ctx: Ctx,
  context: BrowserContext,
  options: OpenOptions,
  label: string,
  file: string | null,
): Promise<{ page: Page; png: Buffer }> {
  const vanilla = await open(context, ctx.url("vanilla"), options, ctx.errors);
  const react = await open(context, ctx.url("react"), options, ctx.errors);
  const png = await vanilla.screenshot();
  const reactPng = await react.screenshot();
  await react.close();
  if (file) {
    await writeFile(join(ctx.captures, `vanilla-${file}.png`), png);
    await writeFile(join(ctx.captures, `react-${file}.png`), reactPng);
  }
  const ratio = diffRatio(png, reactPng);
  ctx.checks.push({ name: `react matches vanilla ${label}`, ok: ratio <= PARITY_TOLERANCE, detail: `${percent(ratio)} differ` });
  return { page: vanilla, png };
}

export async function render(ctx: Ctx): Promise<void> {
  const { entry, staged } = ctx;
  const budget = BUDGETS[entry.meta.category];
  const kb = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`;
  ctx.checks.push({ name: "byte budget", ok: staged.gzipBytes <= budget, detail: `${kb(staged.gzipBytes)} of ${kb(budget)} gzipped` });
  await mkdir(THUMBS, { recursive: true });
  const viewports = ctx.quick ? VIEWPORTS.slice(0, 1) : VIEWPORTS;
  for (const [index, viewport] of viewports.entries()) {
    const context = await ctx.context({ viewport });
    try {
      const { page } = await compare(ctx, context, { props: ctx.base }, `at ${viewport.width}`, `${viewport.width}`);
      if (index === 0) await writeFile(join(THUMBS, `${entry.meta.slug}.jpg`), await page.screenshot({ type: "jpeg", quality: 72 }));
    } finally {
      await context.close();
    }
  }
  const light = await ctx.context({ colorScheme: "light" });
  try {
    const { page } = await compare(ctx, light, { props: ctx.base }, "on paper", `${VIEWPORTS[0].width}-light`);
    await writeFile(join(THUMBS, `${entry.meta.slug}-light.jpg`), await page.screenshot({ type: "jpeg", quality: 72 }));
  } finally {
    await light.close();
  }
}
