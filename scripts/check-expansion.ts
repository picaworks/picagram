/** Full-page responsive proof for a released batch, using disposable browser contexts. */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loadAll, ROOT } from "./catalog";
import { stage, WORK } from "./verify/stage";
import { serve } from "./verify/serve";
import { diffRatio } from "./verify/page";

const release = process.env.PICA_RELEASE ?? "microsites-2026-10-04";
const entries = (await loadAll()).filter((e) => e.meta.release === release && (process.argv.length === 2 || process.argv.slice(2).includes(e.meta.slug)));
if (entries.length === 0) throw new Error(`No components selected for ${release}`);
const evidence = join(ROOT, ".pica", release === "microsites-2026-10-04" ? "expansion-proof" : `${release}-proof`);
await mkdir(evidence, { recursive: true });
const server = await serve(WORK);
const browser = await chromium.launch({ headless: true });
const results: unknown[] = [];
let failures = 0;
try {
  for (const entry of entries) {
    await stage(entry);
    for (const width of [1280, 768, 390]) {
      for (const ground of ["ink", "paper"] as const) {
        const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, colorScheme: ground === "ink" ? "dark" : "light", reducedMotion: "reduce" });
        const page = await context.newPage();
        const errors: string[] = [];
        page.on("pageerror", (e) => errors.push(e.message));
        page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
        page.on("response", (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
        await page.goto(`${server.origin}/${entry.meta.slug}/vanilla.html`);
        await page.waitForSelector('[data-pica-ready="true"]');
        await page.evaluate(() => document.fonts.ready);
        const audit = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));
          const broken = links.filter((a) => a.hash.length > 1 && !document.getElementById(decodeURIComponent(a.hash.slice(1)))).map((a) => a.hash);
          const overflow = Array.from(document.querySelectorAll<HTMLElement>("#pica *")).filter((el) => {
            if (el.closest('[aria-hidden="true"]') || getComputedStyle(el).display === "none") return false;
            const b = el.getBoundingClientRect(); return b.width > 0 && (b.right > innerWidth + 1 || b.left < -1);
          }).map((el) => `${el.tagName}:${(el.textContent ?? "").slice(0, 40)}`);
          return { scrollWidth: document.documentElement.scrollWidth, headings: document.querySelectorAll("h1").length, broken, overflow, text: document.body.innerText.length };
        });
        const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
        const keyboard = page.locator("a[href],button,summary").first();
        if (await keyboard.count()) await keyboard.focus();
        const focus = await keyboard.count() === 0 || await keyboard.evaluate((el) => document.activeElement === el);
        const fullPage = entry.meta.category === "immersive" || entry.meta.category === "sections" || entry.meta.tags.includes("website") || entry.meta.tags.includes("layout");
        const vanilla = await page.screenshot({ path: join(evidence, `${entry.meta.slug}-${width}-${ground}.png`), fullPage: true });
        let parity: number | null = null;
        if (process.env.PICA_COMPARE_REACT === "1") {
          await page.goto(`${server.origin}/${entry.meta.slug}/react.html`);
          await page.waitForSelector('[data-pica-ready="true"]');
          await page.evaluate(() => document.fonts.ready);
          const reactControl = page.locator("a[href],button,summary").first();
          if (await reactControl.count()) await reactControl.focus();
          parity = diffRatio(vanilla, await page.screenshot({ path: join(evidence, `${entry.meta.slug}-${width}-${ground}-react.png`), fullPage: true }));
        }
        const ok = audit.scrollWidth <= width && audit.headings <= 1 && (!fullPage || audit.headings === 1) && audit.broken.length === 0 && audit.overflow.length === 0 && audit.text > (fullPage ? 300 : 100) && axe.violations.length === 0 && errors.length === 0 && focus && (parity === null || parity <= .002);
        if (!ok) failures++;
        results.push({ slug: entry.meta.slug, width, ground, ok, ...audit, focus, parity, axe: axe.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })), errors });
        await context.close();
      }
    }
    console.log(entry.meta.slug);
  }
} finally { await browser.close(); await server.close(); }
await writeFile(join(evidence, "results.json"), JSON.stringify({ designs: entries.length, scenarios: results.length, failures, results }, null, 2) + "\n");
console.log(`${entries.length} designs, ${results.length} scenarios, ${failures} failures`);
process.exitCode = failures ? 1 : 0;
