/** A mount leaves no trace. Destroy restores the host exactly, and calling it twice is harmless. The props
 *  passed in and the defaults come back unchanged. Wrapped children are never touched. Empty data still
 *  renders. Runs in the vanilla page, against a fresh host, through the bundle's global. */
import { open } from "./page";
import { probeFor } from "./stage";
import type { Ctx } from "./types";

interface ScratchInput {
  global: string;
  /** The host element to mount on, as meta.host names it, so a dialog core gets a real dialog. */
  tag: string;
  props: Record<string, unknown>;
  children: string;
  panels: boolean;
}

interface Scratch {
  ready: boolean;
  same: boolean;
  before: string;
  after: string;
  defaultsSame: boolean;
  givenSame: boolean;
  /** Mutations inside the children, other than the attributes a panels component may set. */
  records: string[];
}

/** Runs in the page: mount, update, destroy twice, then compare the host with how it started. */
async function scratch(input: ScratchInput): Promise<Scratch | null> {
  type Instance = { update(props: unknown): void; destroy(): void };
  const global = (window as unknown as Record<string, { mount(host: HTMLElement, props: unknown): Instance; defaults: unknown } | undefined>)[input.global];
  if (!global) return null;
  const host = document.createElement(input.tag);
  // Written as the browser serializes it, since any style change rewrites the attribute in this form.
  host.setAttribute("style", "position: absolute; left: 0px; top: 0px; width: 480px; height: 320px;");
  host.innerHTML = input.children;
  document.body.appendChild(host);
  const before = host.outerHTML;
  const records: string[] = [];
  const allowed = new Set(["role", "id", "aria-labelledby", "hidden"]);
  const observer = new MutationObserver((list) => {
    for (const record of list) {
      const el = record.target instanceof Element ? record.target : record.target.parentElement;
      if (!el || !el.closest("[data-probe]")) continue;
      if (input.panels && record.type === "attributes" && record.target.parentElement === host && allowed.has(record.attributeName ?? "")) continue;
      records.push(`${record.type}${record.attributeName ? ` ${record.attributeName}` : ""} on <${el.tagName.toLowerCase()}>`);
    }
  });
  observer.observe(host, { subtree: true, attributes: true, childList: true, characterData: true });
  const defaultsBefore = JSON.stringify(global.defaults);
  const given = JSON.parse(JSON.stringify({ ...(global.defaults as object), ...input.props })) as Record<string, unknown>;
  const givenBefore = JSON.stringify(given);
  const instance = global.mount(host, given);
  const start = performance.now();
  while (host.dataset.picaReady !== "true" && performance.now() - start < 10_000) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const ready = host.dataset.picaReady === "true";
  instance.update({});
  await new Promise((resolve) => setTimeout(resolve, 100));
  instance.destroy();
  instance.destroy();
  // Anything still pending, such as an image that finishes loading, must not touch the host either.
  await new Promise((resolve) => setTimeout(resolve, 300));
  observer.disconnect();
  const after = host.outerHTML;
  host.remove();
  return {
    ready,
    same: before === after,
    before,
    after,
    defaultsSame: JSON.stringify(global.defaults) === defaultsBefore,
    givenSame: JSON.stringify(given) === givenBefore,
    records,
  };
}

/** Where two strings first differ, with some context, for a failure message. */
function firstDifference(before: string, after: string): string {
  let i = 0;
  while (i < before.length && before[i] === after[i]) i++;
  return `left behind near: ${after.slice(Math.max(0, i - 30), i + 60)}`;
}

export async function lifecycle(ctx: Ctx): Promise<void> {
  const { meta, defaults } = ctx.entry;
  const children = meta.wraps ? probeFor(meta).markup : "";
  const context = await ctx.context();
  try {
    const page = await open(context, ctx.url("vanilla"), { props: ctx.base }, ctx.errors);
    const input: ScratchInput = {
      global: ctx.staged.bundle.globalName,
      tag: meta.host ?? "div",
      props: ctx.base,
      children,
      panels: meta.wraps === "panels",
    };
    const result = await page.evaluate(scratch, input);
    if (!result) {
      ctx.checks.push({ name: "destroy restores the host", ok: false, detail: `the page has no ${input.global}` });
      return;
    }
    ctx.checks.push({
      name: "destroy restores the host",
      ok: result.ready && result.same,
      detail: !result.ready ? "never reported ready" : result.same ? "no attribute, style, or node left behind" : firstDifference(result.before, result.after),
    });
    ctx.checks.push({
      name: "props left unchanged",
      ok: result.defaultsSame && result.givenSame,
      detail: !result.defaultsSame ? "wrote into its defaults" : !result.givenSame ? "wrote into the props it was given" : "defaults and passed props intact",
    });
    if (meta.wraps) {
      ctx.checks.push({ name: "children untouched", ok: result.records.length === 0, detail: result.records[0] ?? "no mutation inside the children" });
    }
    const data = Object.entries(defaults).filter(([, value]) => typeof value === "object" && value !== null);
    if (data.length > 0) {
      const failed: string[] = [];
      for (const [name, value] of data) {
        const empty = await page.evaluate(scratch, { ...input, props: { ...ctx.base, [name]: Array.isArray(value) ? [] : {} } });
        if (!empty?.ready) failed.push(name);
      }
      ctx.checks.push({
        name: "renders with empty data",
        ok: failed.length === 0,
        detail: failed.length > 0 ? `never ready with an empty ${failed.join(", ")}` : `ready with ${data.map(([name]) => name).join(", ")} empty`,
      });
    }
  } finally {
    await context.close();
  }
}
