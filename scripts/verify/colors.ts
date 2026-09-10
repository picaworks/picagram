/** The palette reaches every token a component declares, however it is set: before mount, after it, through
 *  the palette prop, or by the page's own custom properties. */
import type { BrowserContext } from "@playwright/test";
import type { Token } from "../../lib/palette";
import { PARITY_TOLERANCE } from "../config";
import { diffRatio, open, percent, settle, type OpenOptions } from "./page";
import { compare } from "./render";
import type { Ctx } from "./types";

/** Loud test colors, far from the defaults and from each other. */
const TEST: Readonly<Record<Token, string>> = { fg: "#ff2d6f", bg: "#123456", accent: "#20c4ff", muted: "#9cff3a" };

async function shot(ctx: Ctx, context: BrowserContext, options: OpenOptions): Promise<Buffer> {
  const page = await open(context, ctx.url("vanilla"), options, ctx.errors);
  const png = await page.screenshot();
  await page.close();
  return png;
}

export async function colors(ctx: Ctx): Promise<void> {
  const tokens = ctx.entry.meta.palette ?? ["fg"];
  const palette = Object.fromEntries(tokens.map((token) => [token, TEST[token]]));
  const context = await ctx.context();
  try {
    const plain = await shot(ctx, context, { props: ctx.base });
    const silent: Token[] = [];
    for (const token of tokens) {
      const png = await shot(ctx, context, { props: { ...ctx.base, palette: { [token]: TEST[token] } } });
      if (diffRatio(png, plain) === 0) silent.push(token);
    }
    ctx.checks.push({
      name: "palette tokens show",
      ok: silent.length === 0,
      detail:
        silent.length > 0
          ? `setting ${silent.join(", ")} changes nothing`
          : tokens.length > 0
            ? `${tokens.join(", ")} each change the picture`
            : "draws with no palette color",
    });

    const { page, png: painted } = await compare(ctx, context, { props: { ...ctx.base, palette } }, "with a palette", null);
    await page.close();

    const late = await open(context, ctx.url("vanilla"), { props: ctx.base }, ctx.errors);
    await late.evaluate((colorsToSet) => window.postMessage({ type: "pica:props", props: { palette: colorsToSet } }, "*"), palette);
    await late.waitForTimeout(250);
    await settle(late);
    const after = diffRatio(await late.screenshot(), painted);
    await late.close();
    ctx.checks.push({ name: "palette applies after mount", ok: after <= PARITY_TOLERANCE, detail: `${percent(after)} differ from mounting with it` });

    const vars = Object.fromEntries(tokens.map((token) => [`--pica-${token}`, TEST[token]]));
    const cascaded = diffRatio(await shot(ctx, context, { props: ctx.base, rootVars: vars }), painted);
    ctx.checks.push({ name: "palette prop matches page variables", ok: cascaded <= PARITY_TOLERANCE, detail: `${percent(cascaded)} differ` });
  } finally {
    await context.close();
  }
}
