/** Opening a component's page and comparing captures. */
import type { BrowserContext, Locator, Page } from "@playwright/test";
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

/** Every URL asked for by every page opened since the last forget, in order. A component may request nothing
 *  but its own page, and the only way to see that is to watch a real browser. This lives in module state
 *  rather than in another argument to open(), so a page records what it fetches whichever group opened it.
 *  index.ts reads it once a component's groups have run, and forgets it before the next component. */
const asked: string[] = [];

/** Where a component's page may ask for bytes: the server it was served from, or a source the page carries
 *  itself, meaning a data: URI, as an image component is handed, or a blob: URI a script made. */
function local(url: string, origin: string): boolean {
  return url.startsWith("data:") || url.startsWith("blob:") || url === origin || url.startsWith(`${origin}/`);
}

export interface Requests {
  /** How many requests every page opened since the last forget made. */
  readonly seen: number;
  /** The first request that went anywhere other than the page's own origin, or null when none did. */
  readonly offOrigin: string | null;
}

/** What every page opened so far asked for, judged against the origin they were served from. */
export function requests(origin: string): Requests {
  return { seen: asked.length, offOrigin: asked.find((url) => !local(url, origin)) ?? null };
}

/** Starts the count again, so each component answers for its own pages alone. */
export function forgetRequests(): void {
  asked.length = 0;
}

export async function open(context: BrowserContext, url: string, options: OpenOptions, errors: string[]): Promise<Page> {
  const page = await context.newPage();
  page.on("request", (request) => asked.push(request.url()));
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

/** Share of pixels whose channels moved at all. diffPixels asks pixelmatch whether a person would notice,
 *  and at its 0.1 threshold a hover tint is below the cutoff: STYLE.md allows "a fg tint of about 10%", which
 *  over either ground is a flat channel delta of 23 and scores 267 against pixelmatch's 352, so it reports
 *  exactly zero changed pixels. That is the right answer for a parity check and the wrong one for proving a
 *  hover happened at all, so an intended change is measured here instead, the same way inkRatio measures ink.
 *  The cutoff sits well under the weakest real case (23 + 23 + 23) and well over the noise, which SwiftShader
 *  reports as zero. */
export function changedPixels(a: Buffer, b: Buffer, cutoff = 12): number {
  const left = PNG.sync.read(a);
  const right = PNG.sync.read(b);
  if (left.width !== right.width || left.height !== right.height) {
    return Math.max(left.width * left.height, right.width * right.height);
  }
  let moved = 0;
  for (let i = 0; i < left.width * left.height * 4; i += 4) {
    const dr = Math.abs((left.data[i] ?? 0) - (right.data[i] ?? 0));
    const dg = Math.abs((left.data[i + 1] ?? 0) - (right.data[i + 1] ?? 0));
    const db = Math.abs((left.data[i + 2] ?? 0) - (right.data[i + 2] ?? 0));
    if (dr + dg + db > cutoff) moved++;
  }
  return moved;
}

export function changedRatio(a: Buffer, b: Buffer, cutoff = 12): number {
  const { width, height } = PNG.sync.read(a);
  return Math.min(1, changedPixels(a, b, cutoff) / (width * height));
}

export const percent = (ratio: number): string => `${(ratio * 100).toFixed(3)}% of pixels`;

/** The error message of anything thrown. */
export const message = (error: unknown): string => (error instanceof Error ? error.message.split("\n")[0] ?? "" : String(error));

/** The screenshot clip for one element, cropped to the viewport. Null when it has no box on screen, which is
 *  what a zero-sized or scrolled-away element gives. Clipping matters wherever a small change has to show:
 *  a hover tint measured over a whole 1280 by 800 frame falls under the parity tolerance and reads as noise. */
export async function clipOf(page: Page, locator: Locator): Promise<Clip | null> {
  const box = await locator.boundingBox();
  const view = page.viewportSize();
  if (!box || !view) return null;
  const x = Math.max(0, Math.floor(box.x));
  const y = Math.max(0, Math.floor(box.y));
  const width = Math.min(view.width, Math.ceil(box.x + box.width)) - x;
  const height = Math.min(view.height, Math.ceil(box.y + box.height)) - y;
  return width > 0 && height > 0 ? { x, y, width, height } : null;
}

export interface Clip {
  x: number;
  y: number;
  width: number;
  height: number;
}
