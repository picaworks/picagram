/** Scripted interactions from meta.interactions run in both shapes. Both shapes must report the same events,
 *  React's on props must hear every one, nothing may fire before the first input, and axe-core must pass
 *  after the steps. A controlled prop echoed back from its event must end where the uncontrolled component
 *  ends, and a controlled prop that is never updated must not move. */
import AxeBuilder from "@axe-core/playwright";
import type { BrowserContext, Page } from "@playwright/test";
import { sameJson } from "../../lib/json";
import type { Step } from "../../lib/meta";
import { PARITY_TOLERANCE } from "../config";
import { AXE_TAGS, diffRatio, open, percent, readLog, READY, type OpenOptions } from "./page";
import type { Ctx } from "./types";

type Reported = { name: string; detail: unknown }[];

async function perform(page: Page, step: Step): Promise<void> {
  const host = page.locator(READY).first();
  if (step.step === "press") await page.keyboard.press(step.key);
  if (step.step === "click") await (step.selector ? host.locator(step.selector).first() : host).click();
}

/** Checks one expectation step. Returns a problem, or null when it holds. */
async function expectation(page: Page, step: Step, reported: Reported, cursor: { at: number }): Promise<string | null> {
  if (step.step === "expectFocus") {
    const focused = await page.evaluate(({ ready, selector }) => {
      const host = document.querySelector(ready);
      const target = selector ? host?.querySelector(selector) : host;
      return Boolean(target) && document.activeElement === target;
    }, { ready: READY, selector: step.selector });
    return focused ? null : `focus is not on ${step.selector || "the host"}`;
  }
  if (step.step === "expectEvent") {
    const next = reported[cursor.at];
    cursor.at++;
    if (next && next.name === step.name && (step.detail === undefined || sameJson(next.detail, step.detail))) return null;
    const wanted = `${step.name}${step.detail === undefined ? "" : ` ${JSON.stringify(step.detail)}`}`;
    return `expected ${wanted}, got ${next ? `${next.name} ${JSON.stringify(next.detail)}` : "nothing"}`;
  }
  if (step.step === "expectAttr") {
    const value = await page.evaluate(({ ready, selector, name }) => {
      const host = document.querySelector(ready);
      const target = selector ? host?.querySelector(selector) : host;
      return target ? target.getAttribute(name) : "(no element)";
    }, { ready: READY, selector: step.selector, name: step.name });
    return value === step.value ? null : `${step.selector || "the host"} has ${step.name}=${JSON.stringify(value)}, expected ${JSON.stringify(step.value)}`;
  }
  return null;
}

const domEvents = (log: Awaited<ReturnType<typeof readLog>>): Reported =>
  log.filter((entry) => entry.via === "dom").map(({ name, detail }) => ({ name, detail }));

/** Opens the React harness, performs only the input steps, and captures the start and the end, unfocused. */
async function drive(ctx: Ctx, context: BrowserContext, options: OpenOptions, steps: readonly Step[]): Promise<{ start: Buffer; end: Buffer }> {
  const page = await open(context, ctx.url("react"), options, ctx.errors);
  const start = await page.screenshot();
  for (const step of steps) {
    await perform(page, step);
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(150);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.waitForTimeout(50);
  const end = await page.screenshot();
  await page.close();
  return { start, end };
}

async function controlled(ctx: Ctx, context: BrowserContext, prop: string, event: string, events: readonly string[]): Promise<void> {
  const name = `controlled ${prop}`;
  const steps = (ctx.entry.meta.interactions?.[0] ?? []).filter((step) => step.step === "press" || step.step === "click");
  if (steps.length === 0) {
    ctx.checks.push({ name, ok: false, detail: "needs a first interaction with at least one press or click" });
    return;
  }
  const defaultKey = `default${prop.charAt(0).toUpperCase()}${prop.slice(1)}`;
  const initial = ctx.base[defaultKey] ?? ctx.entry.defaults[defaultKey] ?? null;
  const held = { ...ctx.base, [prop]: initial };
  const free = await drive(ctx, context, { props: ctx.base, events }, steps);
  const echoed = await drive(ctx, context, { props: held, events, echo: { prop, event, mode: "echo" } }, steps);
  const ignored = await drive(ctx, context, { props: held, events, echo: { prop, event, mode: "ignore" } }, steps);
  const echo = diffRatio(echoed.end, free.end);
  const still = diffRatio(ignored.end, ignored.start);
  const ok = echo <= PARITY_TOLERANCE && still <= PARITY_TOLERANCE;
  ctx.checks.push({
    name,
    ok,
    detail: ok ? "echoed ends like uncontrolled; ignored stays put" : `echoed ${percent(echo)} off uncontrolled; ignored moved ${percent(still)}`,
  });
}

export async function interact(ctx: Ctx): Promise<void> {
  const { meta } = ctx.entry;
  const events = Object.keys(ctx.entry.events);
  const context = await ctx.context();
  try {
    for (const [index, steps] of (meta.interactions ?? []).entries()) {
      const failures: string[] = [];
      const reported: Partial<Record<"vanilla" | "react", Reported>> = {};
      for (const shape of ["vanilla", "react"] as const) {
        const page = await open(context, ctx.url(shape), { props: ctx.base, events }, ctx.errors);
        if ((await readLog(page)).length > 0) failures.push(`${shape}: an event fired before any input`);
        const cursor = { at: 0 };
        for (const step of steps) {
          await perform(page, step);
          await page.waitForTimeout(40);
          const problem = await expectation(page, step, domEvents(await readLog(page)), cursor);
          if (problem) failures.push(`${shape}: ${problem}`);
        }
        const log = await readLog(page);
        reported[shape] = domEvents(log);
        if (shape === "react") {
          const heard = log.filter((entry) => entry.via === "react").map(({ name, detail }) => ({ name, detail }));
          if (!sameJson(heard, reported.react)) failures.push("react: the on props did not hear every event");
        }
        const axe = await new AxeBuilder({ page }).include(READY).withTags(AXE_TAGS).analyze();
        if (axe.violations.length > 0) failures.push(`${shape}: axe after the steps: ${axe.violations.map((v) => v.id).join(", ")}`);
        await page.close();
      }
      if (!sameJson(reported.vanilla, reported.react)) failures.push("the two shapes reported different events");
      ctx.checks.push({
        name: `interaction ${index + 1}`,
        ok: failures.length === 0,
        detail: failures[0] ?? `${steps.length} steps and ${reported.vanilla?.length ?? 0} events, the same in both shapes`,
      });
    }
    for (const [prop, event] of Object.entries(meta.controlled ?? {})) await controlled(ctx, context, prop, event, events);
  } finally {
    await context.close();
  }
}
