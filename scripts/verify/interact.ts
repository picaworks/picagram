/** Scripted interactions from meta.interactions run in both shapes. Both shapes must report the same events,
 *  React's on props must hear every one, nothing may fire before the first input, and axe-core must pass
 *  after the steps. A controlled prop echoed back from its event must end where the uncontrolled component
 *  ends, and a controlled prop that is never updated must not move. */
import AxeBuilder from "@axe-core/playwright";
import type { BrowserContext, Page } from "@playwright/test";
import { sameJson } from "../../lib/json";
import type { Step } from "../../lib/meta";
import { PARITY_TOLERANCE } from "../config";
import { AXE_TAGS, changedRatio, clipOf, diffRatio, open, percent, readLog, READY, type OpenOptions } from "./page";
import type { Ctx } from "./types";

type Reported = { name: string; detail: unknown }[];

/** What one input step did. A pointer step is the only kind that measures anything: `changed` is how much of
 *  the hovered box moved, and null when the picture was already moving and nothing could be attributed to the
 *  pointer. */
interface Done {
  problem: string | null;
  changed: number | null;
  label: string;
}

const nothing = (): Done => ({ problem: null, changed: null, label: "" });

/** Runs one input step. Only the pointer steps can report a problem of their own: a hover that tints nothing
 *  is the failure this step exists to catch.
 *
 *  A hover is compared against a still picture. Two shots are taken a frame apart before the pointer moves,
 *  and when they already differ the comparison is abandoned rather than credited to the hover. That idle
 *  control is what lets one rule cover both kinds of component: the interaction group pins an animated
 *  component's time, so its picture is frozen and a hover is measurable, while a list that drives the pointer
 *  runs the clock live and is skipped here.
 *
 *  The pointer is moved with page.mouse rather than locator.hover(), because lib/canvas.ts gives every canvas
 *  pointer-events:none and hover()'s hit-target check would throw where a real pointer simply arrives. */
async function perform(page: Page, step: Step): Promise<Done> {
  const host = page.locator(READY).first();
  if (step.step === "press") await page.keyboard.press(step.key);
  if (step.step === "click") await (step.selector ? host.locator(step.selector).first() : host).click();
  if (step.step === "hover") {
    const label = step.selector || "the host";
    const target = step.selector ? host.locator(step.selector).first() : host;
    const clip = await clipOf(page, target);
    if (!clip) return { problem: `nothing to hover at ${label}`, changed: null, label };
    const first = await page.screenshot({ clip });
    await page.waitForTimeout(POINTER_SETTLE);
    const idle = await page.screenshot({ clip });
    const moving = changedRatio(first, idle) > 0;
    await page.mouse.move(clip.x + Math.round((clip.width - 1) / 2), clip.y + Math.round((clip.height - 1) / 2), { steps: 1 });
    await page.waitForTimeout(POINTER_SETTLE);
    if (moving) return { problem: null, changed: null, label };
    const changed = changedRatio(idle, await page.screenshot({ clip }));
    const problem = changed > HOVER_FLOOR ? null : `hovering ${label} changed ${percent(changed)} of its box, under ${percent(HOVER_FLOOR)}`;
    return { problem, changed, label };
  }
  if (step.step === "pointerMove") {
    const clip = await clipOf(page, host);
    if (!clip) return { problem: "the host has no box to move the pointer over", changed: null, label: "the host" };
    const x = clip.x + Math.round((clip.width - 1) * step.x);
    const y = clip.y + Math.round((clip.height - 1) * step.y);
    await page.mouse.move(x, y, { steps: 1 });
    await page.waitForTimeout(POINTER_SETTLE);
    return nothing();
  }
  return nothing();
}

/** The least a hover must change of the element it names. A tint covers most of a box and accent text covers
 *  its glyphs, so both land far above this, while a still picture reads exactly zero. */
const HOVER_FLOOR = 0.01;

/** How long a pointer step waits before reading the picture back. A hover state is instant under STYLE.md,
 *  so this only has to cover a frame the loop still owes. */
const POINTER_SETTLE = 120;

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
  const hovers: number[] = [];
  let skipped = 0;
  try {
    for (const [index, steps] of (meta.interactions ?? []).entries()) {
      const failures: string[] = [];
      const reported: Partial<Record<"vanilla" | "react", Reported>> = {};
      // A core only tracks the pointer while its clock runs: shader-flow and ascii-pointer-ripple both ignore
      // a pointermove when `time` is pinned, which is what ctx.base does to an animated component. So a list
      // that drives the pointer runs live, and its hovers go unmeasured because the picture moves on its own.
      const props = steps.some((step) => step.step === "pointerMove") ? { ...ctx.base, time: null } : ctx.base;
      for (const shape of ["vanilla", "react"] as const) {
        const page = await open(context, ctx.url(shape), { props, events }, ctx.errors);
        if ((await readLog(page)).length > 0) failures.push(`${shape}: an event fired before any input`);
        const cursor = { at: 0 };
        for (const step of steps) {
          const acted = await perform(page, step);
          if (acted.problem) failures.push(`${shape}: ${acted.problem}`);
          if (acted.changed !== null) hovers.push(acted.changed);
          if (step.step === "hover" && acted.changed === null && !acted.problem) skipped++;
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
    if (hovers.length > 0 || skipped > 0) {
      const weakest = hovers.length > 0 ? Math.min(...hovers) : 0;
      const note = skipped > 0 ? `, ${skipped} not compared while the picture moved` : "";
      ctx.checks.push({
        name: "hover changes the picture",
        ok: hovers.every((changed) => changed > HOVER_FLOOR),
        detail: hovers.length > 0 ? `${hovers.length} hovers, the smallest ${percent(weakest)} of its box${note}` : `nothing compared${note}`,
      });
    }
    for (const [prop, event] of Object.entries(meta.controlled ?? {})) await controlled(ctx, context, prop, event, events);
  } finally {
    await context.close();
  }
}
