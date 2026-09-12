/** A section holds up as a real page section on a phone: nothing spills sideways, the copy sits above whatever
 *  is drawn behind it, a flow host shows all of itself, prose keeps the page's own typeface, and every
 *  focusable node the core made is a real link or button. Runs at the narrow viewport with the demo children
 *  mounted, since that is where a section either survives or does not. */
import type { BrowserContext } from "@playwright/test";
import { VIEWPORTS } from "../config";
import { open, READY } from "./page";
import type { Ctx } from "./types";

/** The narrow viewport, 390 by 844. A section is judged on a phone. */
const PHONE = VIEWPORTS[1];

/** Anything the browser lets a user or a script focus. A core marks every node it creates with data-pica, so
 *  the two together name the focusable nodes a section is answerable for. */
const FOCUSABLE = "a[href], area[href], button, input, select, textarea, summary, iframe, [tabindex], [contenteditable]";

/** What a section's calls to action may be: a real link or a real button, so the browser's own keyboard,
 *  middle click, and form behavior come with them. */
const REAL = "a[href], button";

/** Runs in the page: the first text the host wraps, meaning an element the core did not create that holds
 *  text of its own, with its computed family beside the body's. */
function wrapped(ready: string): { tag: string; text: string; family: string; body: string } | null {
  const host = document.querySelector(ready);
  if (!host) return null;
  const body = getComputedStyle(document.body).fontFamily;
  for (const el of Array.from(host.querySelectorAll("*"))) {
    if (el.closest("[data-pica]")) continue;
    const ownText = Array.from(el.childNodes).some((node) => node.nodeType === 3 && (node.textContent ?? "").trim() !== "");
    if (!ownText) continue;
    return { tag: el.tagName.toLowerCase(), text: (el.textContent ?? "").trim().slice(0, 24), family: getComputedStyle(el).fontFamily, body };
  }
  return null;
}

/** Runs in the page: every focusable node the core created, and those of them that are neither a link nor a
 *  button, named as the markup reads. */
function focusables(input: { ready: string; focusable: string; real: string }): { total: number; wrong: string[] } {
  const host = document.querySelector(input.ready);
  const nodes = Array.from(host?.querySelectorAll("[data-pica]") ?? []).filter((el) => el.matches(input.focusable));
  const wrong = nodes
    .filter((el) => !el.matches(input.real))
    .map((el) => `<${el.tagName.toLowerCase()}${el.getAttribute("role") ? ` role="${el.getAttribute("role")}"` : ""}>`);
  return { total: nodes.length, wrong };
}

/** Runs in the page: each probe child hit-tested at the centre of whatever of it is on screen. */
function hitTest(): { total: number; covered: string[] } {
  const probes = Array.from(document.querySelectorAll("[data-probe]"));
  const covered: string[] = [];
  for (const el of probes) {
    const box = el.getBoundingClientRect();
    const label = `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 20)}"`;
    if (box.right <= 0 || box.bottom <= 0 || box.left >= innerWidth || box.top >= innerHeight) {
      covered.push(`${label} is off screen`);
      continue;
    }
    const x = (Math.max(0, box.left) + Math.min(innerWidth, box.right)) / 2;
    const y = (Math.max(0, box.top) + Math.min(innerHeight, box.bottom)) / 2;
    const hit = document.elementFromPoint(x, y);
    if (!hit || !(hit === el || el.contains(hit))) covered.push(`${label} sits under <${hit ? hit.tagName.toLowerCase() : "nothing"}>`);
  }
  return { total: probes.length, covered };
}

/** The probe children the accessibility group mounts, hit-tested where a reader would touch them. A layer
 *  drawn behind the content must never answer for the point in the middle of the copy. */
async function onTop(ctx: Ctx, context: BrowserContext): Promise<void> {
  const page = await open(context, ctx.url("vanilla-probe"), { props: ctx.base }, ctx.errors);
  const { total, covered } = await page.evaluate(hitTest);
  await page.close();
  ctx.checks.push({
    name: "content sits on top",
    ok: covered.length === 0 && total > 0,
    detail: covered[0] ?? (total > 0 ? `${total} probe children answer their own centre` : "the probe children never mounted"),
  });
}

export async function section(ctx: Ctx): Promise<void> {
  const { meta } = ctx.entry;
  const context = await ctx.context({ viewport: PHONE });
  try {
    const page = await open(context, ctx.url("vanilla"), { props: ctx.base }, ctx.errors);

    const spread = await page.evaluate(() => document.documentElement.scrollWidth);
    ctx.checks.push({
      name: "no sideways overflow",
      ok: spread <= PHONE.width,
      detail: `${spread} px of page in a ${PHONE.width} px viewport`,
    });

    if (meta.stage === "flow") {
      const box = await page.evaluate((ready) => {
        const host = document.querySelector(ready);
        return host ? { scroll: host.scrollHeight, client: host.clientHeight } : null;
      }, READY);
      // One pixel of slack, since a fractional layout height rounds up in scrollHeight and down in clientHeight.
      ctx.checks.push({
        name: "flow host is not clipped",
        ok: box !== null && box.scroll <= box.client + 1,
        detail: box === null ? "no host found" : `${box.scroll} px of content in a host ${box.client} px tall`,
      });
    }

    // Prose inherits the page's typeface, and only labels and numbers are mono. A section that holds no text
    // of its own has nothing to answer for here, but one that wraps children and shows none has lost them.
    const text = await page.evaluate(wrapped, READY);
    if (text || meta.wraps) {
      const same = text !== null && text.family === text.body;
      ctx.checks.push({
        name: "prose keeps the page font",
        ok: same,
        detail:
          text === null
            ? "found no text outside the nodes the core created"
            : same
              ? `<${text.tag}> "${text.text}" inherits ${text.family}`
              : `<${text.tag}> draws in ${text.family}, the page in ${text.body}`,
      });
    }

    const focus = await page.evaluate(focusables, { ready: READY, focusable: FOCUSABLE, real: REAL });
    ctx.checks.push({
      name: "calls to action are real",
      ok: focus.wrong.length === 0,
      detail: focus.wrong[0]
        ? `${focus.wrong[0]} takes focus and is neither a link nor a button`
        : focus.total === 0
          ? "the core created nothing that takes focus"
          : `${focus.total} focusable nodes, every one a link or a button`,
    });

    await page.close();
    if (meta.wraps) await onTop(ctx, context);
  } finally {
    await context.close();
  }
}
