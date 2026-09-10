/** Opening a component's page and comparing captures. */
import type { BrowserContext, Page } from "@playwright/test";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

/** A host marks its first complete frame with this attribute. */
export const READY = '[data-pica-ready="true"]';

/** The WCAG levels axe-core checks. */
export const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

export interface OpenOptions {
  /** window.PICA_PROPS, which both shapes read at mount. */
  props?: Record<string, unknown>;
  /** Markup for the React harness's children, replacing the demo children. Vanilla pages carry theirs. */
  children?: string;
  /** Event names to log in both shapes, from capture-phase listeners on the document, which also hear
   *  events that do not bubble. */
  events?: readonly string[];
  /** Makes the React harness control one prop from its event. "ignore" never changes it. */
  echo?: { prop: string; event: string; mode: "echo" | "ignore" };
  /** Makes getContext("webgl2") return null, to show a shader's fallback. */
  noWebgl?: boolean;
  /** Custom properties set on the root element, as a page's own stylesheet would. */
  rootVars?: Record<string, string>;
}

export interface LogEntry {
  via: "dom" | "react";
  name: string;
  detail: unknown;
}

export async function open(context: BrowserContext, url: string, options: OpenOptions, errors: string[]): Promise<Page> {
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript((o: OpenOptions) => {
    const w = window as unknown as Record<string, unknown>;
    // tsx compiles this file with keepNames, which wraps named functions in __name(...). Functions sent to
    // page.evaluate carry those calls into the page, so the page needs the helper too.
    w.__name = (target: unknown) => target;
    w.PICA_PROPS = o.props ?? {};
    if (o.children !== undefined) w.PICA_CHILDREN = o.children;
    if (o.echo) w.PICA_ECHO = o.echo;
    const log: unknown[] = [];
    w.PICA_LOG = log;
    for (const name of o.events ?? []) {
      document.addEventListener(
        `pica:${name.toLowerCase()}`,
        (event) => log.push({ via: "dom", name, detail: (event as CustomEvent).detail }),
        true,
      );
    }
    if (o.noWebgl) {
      const original = HTMLCanvasElement.prototype.getContext;
      Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
        configurable: true,
        value(this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
          return type === "webgl2" ? null : (original as (...args: unknown[]) => unknown).call(this, type, ...rest);
        },
      });
    }
    const vars = Object.entries(o.rootVars ?? {});
    if (vars.length > 0) {
      // The root element does not exist yet when this runs, so the properties go in an adopted sheet.
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(`:root { ${vars.map(([name, value]) => `${name}: ${value};`).join(" ")} }`);
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }
  }, options);
  await page.goto(url);
  await settle(page);
  return page;
}

/** Waits for the first complete frame, the fonts, and two more animation frames. */
export async function settle(page: Page): Promise<void> {
  await page.waitForSelector(READY, { state: "attached", timeout: 30_000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
}

/** Events logged so far on this page. */
export async function readLog(page: Page): Promise<LogEntry[]> {
  return page.evaluate(() => (window as unknown as { PICA_LOG: LogEntry[] }).PICA_LOG);
}

/** Pixels that differ between two captures. Captures of different sizes count as differing everywhere. */
export function diffPixels(a: Buffer, b: Buffer): number {
  const left = PNG.sync.read(a);
  const right = PNG.sync.read(b);
  if (left.width !== right.width || left.height !== right.height) {
    return Math.max(left.width * left.height, right.width * right.height);
  }
  return pixelmatch(left.data, right.data, undefined, left.width, left.height, { threshold: 0.1 });
}

/** Share of pixels that differ between two captures. */
export function diffRatio(a: Buffer, b: Buffer): number {
  const { width, height } = PNG.sync.read(a);
  return Math.min(1, diffPixels(a, b) / (width * height));
}

/** Share of pixels clearly away from the top-left pixel's color, near 0 for a page showing only its ground. */
export function inkRatio(png: Buffer): number {
  const { data, width, height } = PNG.sync.read(png);
  const r = data[0] ?? 0;
  const g = data[1] ?? 0;
  const b = data[2] ?? 0;
  let away = 0;
  for (let i = 0; i < width * height * 4; i += 4) {
    if (Math.abs((data[i] ?? 0) - r) + Math.abs((data[i + 1] ?? 0) - g) + Math.abs((data[i + 2] ?? 0) - b) > 24) away++;
  }
  return away / (width * height);
}

export const percent = (ratio: number): string => `${(ratio * 100).toFixed(3)}% of pixels`;

/** The error message of anything thrown. */
export const message = (error: unknown): string => (error instanceof Error ? error.message.split("\n")[0] ?? "" : String(error));
