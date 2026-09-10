/** A component meets assistive technology the right way: the host rule, an axe-core pass, and, for a component
 *  that wraps children, proof those children stay readable, reachable by Tab, and on top. */
import AxeBuilder from "@axe-core/playwright";
import type { BrowserContext } from "@playwright/test";
import { AXE_TAGS, open, READY } from "./page";
import { probeFor } from "./stage";
import type { Check, Ctx } from "./types";

interface HostInfo {
  hidden: string | null;
  role: string | null;
  label: string | null;
  /** Text assistive technology can reach inside the host: everything outside aria-hidden subtrees. */
  text: string;
}

/** The host rule. A decorative component that wraps nothing is hidden. A wrapping component never hides its
 *  host or gives it a role that hides children. Anything else is hidden, or named by a role and label, or
 *  carries readable text, as animatedText provides. */
function hostRule(decorative: boolean, wraps: "content" | "panels" | undefined, host: HostInfo | null): Check {
  const name = "accessible host";
  if (!host) return { name, ok: false, detail: "no host found" };
  const hidden = host.hidden === "true";
  const detail = `aria-hidden=${host.hidden ?? "unset"} role=${host.role ?? "unset"} label=${host.label ?? "unset"}`;
  if (wraps) return { name, ok: !hidden && !["img", "presentation", "none"].includes(host.role ?? ""), detail: `wraps children, ${detail}` };
  if (decorative) return { name, ok: hidden, detail };
  const named = Boolean(host.role) && Boolean(host.label);
  return { name, ok: hidden || named || host.text.length > 0, detail: host.text ? `${detail} text="${host.text.slice(0, 40)}"` : detail };
}

async function probe(ctx: Ctx, context: BrowserContext): Promise<void> {
  const { markup, heading, action } = probeFor(ctx.entry.meta);
  const failures: string[] = [];
  for (const shape of ["vanilla-probe", "react"] as const) {
    const options = shape === "react" ? { props: ctx.base, children: markup } : { props: ctx.base };
    const page = await open(context, ctx.url(shape), options, ctx.errors);
    const snapshot = await page.locator(READY).first().ariaSnapshot();
    if (!snapshot.includes(heading)) failures.push(`${shape}: the probe is missing from the accessibility tree`);
    let reached = false;
    for (let i = 0; i < 12 && !reached; i++) {
      await page.keyboard.press("Tab");
      // innerText, not textContent: a core's scoped <style> inside the host is text but never rendered.
      reached = await page.evaluate((text) => (document.activeElement as HTMLElement | null)?.innerText.trim() === text, action);
    }
    if (!reached) failures.push(`${shape}: Tab never reaches the probe's button`);
    const onTop = await page.evaluate((text) => {
      const button = Array.from(document.querySelectorAll("button")).find((b) => b.innerText.trim() === text);
      if (!button) return false;
      const box = button.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return hit !== null && (hit === button || button.contains(hit));
    }, action);
    if (!onTop) failures.push(`${shape}: something covers the probe's button`);
    await page.close();
  }
  ctx.checks.push({
    name: "children stay usable",
    ok: failures.length === 0,
    detail: failures[0] ?? "readable, reachable by Tab, and on top in both shapes",
  });
}

export async function access(ctx: Ctx): Promise<void> {
  const { meta } = ctx.entry;
  const context = await ctx.context();
  try {
    const page = await open(context, ctx.url("vanilla"), { props: ctx.base }, ctx.errors);
    const host = await page.evaluate((ready): HostInfo | null => {
      const el = document.querySelector(ready);
      if (!el) return null;
      const exposed = (node: Node): string => {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
        if (!(node instanceof Element) || node.getAttribute("aria-hidden") === "true") return "";
        if (node.tagName === "STYLE" || node.tagName === "SCRIPT") return "";
        return Array.from(node.childNodes).map(exposed).join("");
      };
      return { hidden: el.getAttribute("aria-hidden"), role: el.getAttribute("role"), label: el.getAttribute("aria-label"), text: exposed(el).trim() };
    }, READY);
    ctx.checks.push(hostRule(meta.decorative, meta.wraps, host));
    const axe = await new AxeBuilder({ page }).include(READY).withTags(AXE_TAGS).analyze();
    ctx.checks.push({
      name: "axe",
      ok: axe.violations.length === 0,
      detail: axe.violations.length === 0 ? "no violations" : axe.violations.map((v) => `${v.id} on ${v.nodes.length}`).join(", "),
    });
    await page.close();
    if (meta.wraps) await probe(ctx, context);
  } finally {
    await context.close();
  }
}
