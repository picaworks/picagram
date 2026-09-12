/** Builds the static site, serves it, and drives it with headless Chromium to prove the catalog still works
 *  end to end: every component listed, a frame that loads, every control type, the palette, the events
 *  panel, and the copy snippets. Usage: npm run check:site
 *
 *  No single real component has every control type, so PICA_FIXTURE=1 makes src/lib/catalog.ts add one
 *  synthetic item, "pica-fixture", with every control type and a declared event. The events panel is also
 *  checked once against a real component, select, driven by keyboard inside its own frame. This script's own server answers /v/pica-fixture.html itself, a small page that
 *  mirrors the real contract (reads window.PICA_PROPS, applies a palette, answers pica:props messages) and
 *  reflects every prop onto its host as a data attribute, so a change is easy to observe from outside the
 *  frame. Nothing under registry/ or public/ changes; the fixture never appears in a normal build. */
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Frame, type Page } from "@playwright/test";
import { FACETS } from "../lib/meta";
import { BASE_PATH } from "./config";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = join(ROOT, "out");

const FIXTURE_DEFAULTS = { count: 1, name: "hi", note: "line one", on: false, mode: "a", tint: "#e8a020", series: [1, 2, 3], data: { a: 1 } };

const FIXTURE_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"></head><body>
<div id="pica"></div>
<script>
(function () {
  var host = document.getElementById("pica");
  var props = ${JSON.stringify(FIXTURE_DEFAULTS)};
  function reflect() {
    for (var key in props) host.setAttribute("data-" + key.toLowerCase(), JSON.stringify(props[key]));
    host.dataset.picaReady = "true";
  }
  function apply(incoming) {
    for (var key in incoming) if (key !== "palette") props[key] = incoming[key];
    var palette = incoming.palette || {};
    for (var token in palette) {
      if (palette[token]) host.style.setProperty("--pica-" + token, palette[token]);
      else host.style.removeProperty("--pica-" + token);
    }
    reflect();
  }
  apply(window.PICA_PROPS || {});
  window.addEventListener("message", function (event) {
    if (event.data && event.data.type === "pica:props") apply(event.data.props);
    if (event.data && event.data.type === "pica:ground") document.documentElement.setAttribute("data-ground", event.data.ground);
  });
})();
</script>
</body></html>
`;

// A 1x1 JPEG, so the canvas's thumbnail request for the fixture's frame (drawn like any other, since it
// sits in the catalog like a real item) gets a real image instead of a 404.
const BLANK_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
  "base64",
);

const FIXTURE_ROUTES: Readonly<Record<string, { type: string; body: string | Buffer }>> = {
  "/v/pica-fixture.html": { type: "text/html", body: FIXTURE_HTML },
  "/react/pica-fixture.tsx": { type: "text/plain", body: "// pica-fixture has no real React file. It exists only for scripts/check-site.ts.\n" },
  "/c/pica-fixture.md": { type: "text/plain", body: "pica-fixture has no markdown twin. It exists only for scripts/check-site.ts.\n" },
  "/thumbs/pica-fixture.jpg": { type: "image/jpeg", body: BLANK_JPEG },
  "/thumbs/pica-fixture-light.jpg": { type: "image/jpeg", body: BLANK_JPEG },
};

const TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".tsx": "text/plain; charset=utf-8",
  ".jpg": "image/jpeg",
};

/** Serves out/, with the fixture's own routes answered in memory. */
async function serve(): Promise<{ url: string; close: () => Promise<void> }> {
  const server = createServer((req, res) => {
    // A production build is served under BASE_PATH, the way GitHub Pages serves it.
    const full = decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/");
    if (BASE_PATH && full !== BASE_PATH && !full.startsWith(`${BASE_PATH}/`)) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    const pathname = full.slice(BASE_PATH.length) || "/";
    const fixture = FIXTURE_ROUTES[pathname];
    if (fixture) {
      res.writeHead(200, { "Content-Type": fixture.type });
      res.end(fixture.body);
      return;
    }
    const file = join(OUT, pathname === "/" ? "index.html" : pathname);
    readFile(file)
      .then((data) => {
        res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
        res.end(data);
      })
      .catch(() => {
        res.writeHead(404);
        res.end("not found");
      });
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return { url: `http://localhost:${port}`, close: () => new Promise((resolve) => server.close(() => resolve())) };
}

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

/** Polls `check` until it returns true or `timeout` passes. */
async function waitUntil(check: () => Promise<boolean>, timeout = 4000): Promise<boolean> {
  const deadline = Date.now() + timeout;
  for (;;) {
    if (await check()) return true;
    if (Date.now() > deadline) return false;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

async function fixtureFrame(page: Page): Promise<Frame> {
  await page.waitForSelector('iframe.frame-live[src*="pica-fixture"]');
  await waitUntil(async () => page.frame({ url: /pica-fixture\.html/ }) !== null);
  const frame = page.frame({ url: /pica-fixture\.html/ });
  if (!frame) throw new Error("the fixture frame never attached");
  // A host can be zero-size (this fixture draws nothing visible), so "attached" is what a ready frame means.
  await frame.waitForSelector('[data-pica-ready="true"]', { state: "attached" });
  return frame;
}

async function hostAttr(frame: Frame, name: string): Promise<string | null> {
  return frame.locator("#pica").getAttribute(`data-${name}`);
}

async function select(page: Page, title: string): Promise<void> {
  await page.getByRole("searchbox", { name: "Search components" }).fill(title);
  await page.locator(".layers-row", { hasText: title }).first().click();
}

/** The element that has focus, as a short description a failure message can name. */
async function focused(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.activeElement;
    return el instanceof HTMLElement ? `${el.tagName.toLowerCase()}:${(el.textContent ?? "").trim()}` : "nothing";
  });
}

/** Whether an element draws the page's focus ring right now. */
async function focusRing(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!(el instanceof HTMLElement)) return "nothing has focus";
    const style = getComputedStyle(el);
    return `${el.matches(":focus-visible") ? "focus-visible" : "focus"} ${style.outlineStyle} ${style.outlineWidth}`;
  });
}

/** The name of the pressed button in a group of them, such as Theme or Ground. */
async function pressed(page: Page, group: string): Promise<string> {
  return (await page.getByRole("group", { name: group }).locator('[aria-pressed="true"]').first().textContent()) ?? "";
}

async function main(): Promise<void> {
  const built = spawnSync(join(ROOT, "node_modules", ".bin", "next"), ["build"], {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, PICA_FIXTURE: "1" },
  });
  if (built.status !== 0) {
    console.error("next build failed");
    process.exitCode = 1;
    return;
  }

  const catalog = JSON.parse(await readFile(join(ROOT, "public", "catalog.json"), "utf8")) as {
    title: string;
    slug: string;
    facets: string[];
    tags: string[];
  }[];
  const site = await serve();
  const home = `${site.url}${BASE_PATH}/`;
  const browser = await chromium.launch();
  const checks: Check[] = [];
  const consoleErrors: string[] = [];
  /** Every URL any page asked for, so the whole run can be checked for a request that leaves the site. */
  const requested: string[] = [];

  /** A fresh browser context, watched the same way as every other, loaded and hydrated. Playwright defaults to
   *  a light system, so every page says which one it wants rather than inheriting a surprise. */
  async function open(options: {
    colorScheme?: "dark" | "light";
    viewport?: { width: number; height: number };
    /** Holds every script request until this resolves, which is how a page is read before it hydrates. */
    holdScripts?: Promise<void>;
  } = {}): Promise<Page> {
    const context = await browser.newContext({
      colorScheme: options.colorScheme ?? "dark",
      ...(options.viewport ? { viewport: options.viewport } : {}),
    });
    const page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));
    page.on("response", (response) => {
      if (response.status() >= 400) consoleErrors.push(`${response.status()} for ${response.url()}`);
    });
    page.on("request", (request) => requested.push(request.url()));
    const hold = options.holdScripts;
    if (hold) await page.route(/\.js($|\?)/, async (route) => {
      await hold;
      await route.continue();
    });
    await page.goto(home, hold ? { waitUntil: "commit" } : {});
    if (!hold) await hydrated(page);
    return page;
  }

  /** The page has hydrated once the theme control reports which button is pressed, which only the client knows. */
  async function hydrated(page: Page): Promise<void> {
    await page.waitForSelector(".layers-list");
    await page.waitForSelector('[aria-label="Theme"] [aria-pressed="true"]');
  }

  try {
    const page = await open({ colorScheme: "dark" });

    // Every catalog item is listed.
    const titles = await page.locator(".layers-row .layers-title").allTextContents();
    const missing = catalog.filter((item) => !titles.includes(item.title));
    checks.push({ name: "every catalog item is listed", ok: missing.length === 0, detail: missing.map((m) => m.slug).join(", ") || "all present" });

    // Selecting a real component loads its frame.
    const first = catalog[0];
    if (first) {
      await select(page, first.title);
      await page.waitForSelector(`iframe.frame-live[src="v/${first.slug}.html"]`);
      const frame = page.frame({ url: new RegExp(`${first.slug}\\.html`) });
      const ready = frame
        ? await frame.waitForSelector('[data-pica-ready="true"]', { state: "attached", timeout: 5000 }).then(() => true, () => false)
        : false;
      checks.push({ name: "selecting a component loads its frame", ok: ready, detail: ready ? `/v/${first.slug}.html rendered` : "no ready host found" });
    }

    // The fixture: every control type, the palette, invalid json, snippets, and events.
    await select(page, "Pica Fixture");
    const frame = await fixtureFrame(page);

    const demoed = await waitUntil(async () => (await hostAttr(frame, "count")) === "5");
    checks.push({ name: "initial state applies meta.demo.props", ok: demoed, detail: `data-count is ${await hostAttr(frame, "count")}, demo sets it to 5` });

    await page.locator("#control-name").fill("hello");
    await page.locator("#control-note").fill("two\nlines");
    await page.locator("#control-on").check();
    await page.locator("#control-mode").selectOption("b");
    await page.getByLabel("tint as CSS").fill("#123456");
    await page.locator("#control-series").fill("4, 5, 6");
    await page.locator("#control-data").fill('{"a":2}');
    await page.getByLabel("count value").fill("7");

    const controlChecks: [string, string, string][] = [
      ["string", "name", '"hello"'],
      ["textarea", "note", '"two\\nlines"'],
      ["boolean", "on", "true"],
      ["select", "mode", '"b"'],
      ["color", "tint", '"#123456"'],
      ["numbers", "series", "[4,5,6]"],
      ["json", "data", '{"a":2}'],
      ["number", "count", "7"],
    ];
    for (const [type, name, expected] of controlChecks) {
      const ok = await waitUntil(async () => (await hostAttr(frame, name)) === expected);
      checks.push({ name: `${type} control changes the frame`, ok, detail: ok ? `data-${name} is ${expected}` : `data-${name} is ${await hostAttr(frame, name)}, expected ${expected}` });
    }

    // The json control rejects invalid input.
    const jsonField = page.locator("#control-data");
    await jsonField.fill("{not json}");
    const invalid = await waitUntil(async () => (await jsonField.getAttribute("aria-invalid")) === "true");
    const stillOldValue = (await hostAttr(frame, "data")) === '{"a":2}';
    checks.push({ name: "json control rejects invalid input", ok: invalid && stillOldValue, detail: invalid ? "aria-invalid is set and the frame kept its last value" : "aria-invalid never appeared" });
    await jsonField.fill('{"a":3}');

    // The palette.
    await page.locator("#palette-fg").fill("#00ffcc");
    const paletteApplied = await waitUntil(async () => {
      const value = await frame.evaluate(() => getComputedStyle(document.getElementById("pica")!).getPropertyValue("--pica-fg").trim());
      return value === "#00ffcc";
    });
    checks.push({ name: "palette control changes the frame", ok: paletteApplied, detail: paletteApplied ? "--pica-fg is #00ffcc on the host" : "--pica-fg never updated" });

    // The snippets carry the changed props and the palette.
    const snippet = await page.locator(".code").first().textContent();
    const carriesProps = Boolean(snippet?.includes("count={7}") && snippet?.includes('name="hello"'));
    const carriesPalette = Boolean(snippet?.includes("palette={{") && snippet?.includes('fg: "#00ffcc"'));
    checks.push({ name: "snippet carries changed props and palette", ok: carriesProps && carriesPalette, detail: snippet ?? "no snippet text" });

    // The palette resets per token.
    await page.locator(".palette-row", { hasText: "fg" }).getByRole("button", { name: "reset" }).click();
    const paletteReset = await waitUntil(async () => {
      const cleared = await frame.evaluate(() => getComputedStyle(document.getElementById("pica")!).getPropertyValue("--pica-fg").trim() === "");
      return cleared && (await page.locator("#palette-fg").inputValue()) === "";
    });
    checks.push({ name: "palette reset clears a token", ok: paletteReset, detail: paletteReset ? "--pica-fg is unset again" : "the token did not clear" });

    // A pica:event message from inside the frame reaches the events panel.
    await frame.evaluate(() => window.parent.postMessage({ type: "pica:event", name: "ping", detail: { n: 1 } }, "*"));
    const eventShown = await waitUntil(async () => {
      const rows = await page.locator(".events-row").allTextContents();
      return rows.some((row) => row.includes("ping") && row.includes('{"n":1}'));
    });
    checks.push({ name: "pica:event reaches the events panel", ok: eventShown, detail: eventShown ? "a ping row appeared" : "no matching row" });

    // A real component's event, end to end: select's valueChange, driven by keyboard inside its frame.
    await select(page, "Select");
    await page.waitForSelector('iframe.frame-live[src="v/select.html"]');
    await waitUntil(async () => page.frame({ url: /\/v\/select\.html/ }) !== null);
    const selectFrame = page.frame({ url: /\/v\/select\.html/ });
    let valueChangeShown = false;
    if (selectFrame) {
      await selectFrame.waitForSelector('[data-pica-ready="true"]', { state: "attached", timeout: 5000 });
      const combobox = selectFrame.locator("#pica");
      await combobox.focus();
      for (const key of ["Enter", "ArrowDown", "Enter"]) await combobox.press(key);
      valueChangeShown = await waitUntil(async () => {
        const rows = await page.locator(".events-row").allTextContents();
        return rows.some((row) => row.includes("valueChange") && row.includes("dither"));
      });
    }
    checks.push({ name: "select's valueChange reaches the events panel", ok: valueChangeShown, detail: valueChangeShown ? "a valueChange row naming dither appeared" : "no matching row" });

    // The theme, before the page has hydrated: the head script has set the attribute, the stylesheet has
    // painted the light ground, and no button reports itself pressed yet, so the rule keyed on the attribute
    // is what makes the light button look pressed.
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const early = await open({ colorScheme: "light", holdScripts: held });
    await early.waitForSelector(".layers-facets");
    const before = await early.evaluate(() => {
      const button = document.querySelector('[aria-label="Theme"] [data-theme="light"]');
      return {
        theme: document.documentElement.dataset.theme ?? "none",
        ground: getComputedStyle(document.body).backgroundColor,
        reported: document.querySelectorAll('[aria-label="Theme"] [aria-pressed="true"]').length,
        lit: button ? getComputedStyle(button).backgroundColor : "no button",
      };
    });
    release();
    await hydrated(early);
    const earlyOk =
      before.theme === "light" && before.ground === "rgb(241, 241, 239)" && before.reported === 0 && before.lit === "rgb(10, 10, 10)";
    checks.push({
      name: "the theme is set before hydration",
      ok: earlyOk,
      detail: `data-theme ${before.theme}, body ${before.ground}, ${before.reported} buttons pressed, light button ${before.lit}`,
    });

    // The theme follows the system, and a light page opens on the light captures.
    const dark = await open({ colorScheme: "dark" });
    const darkTheme = await dark.evaluate(() => document.documentElement.dataset.theme);
    const light = await open({ colorScheme: "light" });
    const lightTheme = await light.evaluate(() => document.documentElement.dataset.theme);
    checks.push({
      name: "the theme follows the system",
      ok: darkTheme === "dark" && lightTheme === "light",
      detail: `a dark system gets ${darkTheme}, a light one gets ${lightTheme}`,
    });

    // Watched from the first request this time, because the board is held back until it has been fitted
    // exactly so that no capture for the other ground is ever asked for.
    const lightRequests: string[] = [];
    light.on("request", (request) => lightRequests.push(request.url()));
    await light.reload();
    await hydrated(light);
    const thumbs = await light.locator(".frame-thumb").evaluateAll((els) => els.map((el) => el.getAttribute("src") ?? ""));
    const allLight = thumbs.length > 0 && thumbs.every((src) => src.endsWith("-light.jpg"));
    const darkThumb = lightRequests.find((url) => /\/thumbs\/[^/]+\.jpg$/.test(url) && !url.endsWith("-light.jpg"));
    checks.push({
      name: "a light theme shows the light captures",
      ok: allLight && darkThumb === undefined,
      detail: allLight
        ? darkThumb === undefined
          ? `${thumbs.length} frames on ${thumbs[0]}, and no dark capture was asked for`
          : `asked for ${darkThumb}`
        : `${thumbs.find((src) => !src.endsWith("-light.jpg")) ?? "no frames"}`,
    });

    // A chosen theme outlives the page it was chosen on.
    await light.getByRole("group", { name: "Theme" }).getByRole("button", { name: "dark" }).click();
    const stored = await light.evaluate(() => localStorage.getItem("picagram-theme"));
    await light.reload();
    await hydrated(light);
    const afterReload = await light.evaluate(() => document.documentElement.dataset.theme);
    const reloadPressed = await pressed(light, "Theme");
    checks.push({
      name: "a chosen theme survives a reload",
      ok: stored === "dark" && afterReload === "dark" && reloadPressed.trim() === "dark",
      detail: `storage holds ${stored}, the reloaded page is ${afterReload} with ${reloadPressed.trim()} pressed`,
    });

    // Choosing a theme sets the ground; the Ground control can then move away from it, and the next press on
    // the theme, the one already showing included, brings it back.
    await light.getByRole("group", { name: "Theme" }).getByRole("button", { name: "light" }).click();
    const groundFromTheme = (await pressed(light, "Ground")).trim();
    await light.getByRole("group", { name: "Ground" }).getByRole("button", { name: "ink" }).click();
    const groundAlone = (await pressed(light, "Ground")).trim();
    const themeHeld = await light.evaluate(() => document.documentElement.dataset.theme);
    await light.getByRole("group", { name: "Theme" }).getByRole("button", { name: "light" }).click();
    const groundBack = (await pressed(light, "Ground")).trim();
    checks.push({
      name: "a theme sets the ground, which then diverges",
      ok: groundFromTheme === "paper" && groundAlone === "ink" && themeHeld === "light" && groundBack === "paper",
      detail: `light gives ${groundFromTheme}, the control moves it to ${groundAlone} with the theme still ${themeHeld}, and pressing light again gives ${groundBack}`,
    });

    // The filter is the twelve facets, in the order lib/meta.ts lists them, and the Tags fold is gone.
    const chips = (await dark.locator(".layers-facets .chip").allTextContents()).map((text) => text.replace(/\s+\d+$/, "").trim());
    const tagsFold = await dark.locator(".layers").getByText("Tags", { exact: true }).count();
    checks.push({
      name: "the filter is the twelve facets",
      ok: chips.join(",") === FACETS.join(",") && tagsFold === 0,
      detail: chips.join(",") === FACETS.join(",") ? `${chips.length} chips in order, no Tags fold` : chips.join(","),
    });

    // A facet narrows the list, and a tag, which is not a facet, is still found by the search box.
    const facet = "chart";
    const facetCount = catalog.filter((item) => item.facets.includes(facet)).length;
    await dark.locator(".layers-facets .chip", { hasText: new RegExp(`^${facet} `) }).click();
    const filtered = await dark.locator(".layers-row").count();
    const counter = ((await dark.locator(".layers-brand .label").first().textContent()) ?? "").trim();
    checks.push({
      name: "a facet filters the list",
      ok: filtered === facetCount && counter.startsWith(`${facetCount} of `),
      detail: `${facet} leaves ${filtered} of the ${facetCount} it counts, and the header reads ${counter}`,
    });
    await dark.locator(".layers-facets .chip", { hasText: new RegExp(`^${facet} `) }).click();

    const haystack = (item: (typeof catalog)[number]) =>
      [item.title, item.slug, ...item.tags, ...item.facets].join(" ").toLowerCase();
    let owner = catalog[0];
    let uniqueTag = "";
    for (const item of catalog) {
      const only = item.tags.find((tag) => catalog.filter((other) => haystack(other).includes(tag.toLowerCase())).length === 1);
      if (only) {
        owner = item;
        uniqueTag = only;
        break;
      }
    }
    await dark.getByRole("searchbox", { name: "Search components" }).fill(uniqueTag);
    const found = await dark.locator(".layers-row .layers-title").allTextContents();
    checks.push({
      name: "a tag search finds its component",
      ok: found.length === 1 && found[0] === owner?.title,
      detail: `${JSON.stringify(uniqueTag)} finds ${found.join(", ") || "nothing"}`,
    });

    // A tag in the inspector is not a filter: it fills the search box.
    await dark.getByRole("searchbox", { name: "Search components" }).fill("");
    await select(dark, owner?.title ?? "");
    const tagGroup = dark.getByRole("group", { name: "Tags, each searches the catalog" });
    const firstTag = ((await tagGroup.getByRole("button").first().textContent()) ?? "").trim();
    await tagGroup.getByRole("button").first().click();
    const searchValue = await dark.getByRole("searchbox", { name: "Search components" }).inputValue();
    checks.push({
      name: "an inspector tag fills the search box",
      ok: searchValue === firstTag && firstTag.length > 0,
      detail: `pressing ${JSON.stringify(firstTag)} put ${JSON.stringify(searchValue)} in the box`,
    });

    // The wordmark stands on the search field's gutter, at three screen pixels per pixel of the mark.
    const mark = await dark.locator(".layers-brand svg").boundingBox();
    const field = await dark.getByRole("searchbox", { name: "Search components" }).boundingBox();
    const aligned = mark && field ? Math.abs(mark.x - field.x) <= 0.5 : false;
    checks.push({
      name: "the wordmark is 39px and on the field's gutter",
      ok: mark?.height === 39 && aligned,
      detail: `${mark?.height ?? 0}px tall, ${mark?.width ?? 0}px wide, left edge ${mark?.x ?? 0} against the field's ${field?.x ?? 0}`,
    });

    // Collapsing the inspector, and coming back.
    const canvasOpen = (await dark.locator(".canvas").boundingBox())?.width ?? 0;
    const paneWidth = (await dark.locator("#inspector").boundingBox())?.width ?? 0;
    await dark.getByRole("button", { name: "collapse inspector" }).click();
    await dark.waitForSelector('.app[data-inspector="collapsed"]');
    const canvasWide = (await dark.locator(".canvas").boundingBox())?.width ?? 0;
    const wentTo = await focused(dark);
    checks.push({
      name: "collapsing widens the canvas",
      ok: Math.abs(canvasWide - canvasOpen - paneWidth) < 1 && wentTo === "button:show inspector",
      detail: `the canvas went from ${canvasOpen} to ${canvasWide} as the ${paneWidth}px pane closed, and focus went to ${wentTo}`,
    });

    await select(dark, "ASCII Rain");
    const stillCollapsed = await dark.locator(".app").getAttribute("data-inspector");
    checks.push({
      name: "selecting a component leaves it collapsed",
      ok: stillCollapsed === "collapsed" && !(await dark.locator("#inspector").isVisible()),
      detail: `the pane is ${stillCollapsed} after a pick from the list`,
    });

    await dark.getByRole("button", { name: "show inspector" }).click();
    const cameBack = await dark.locator("#inspector").isVisible();
    const wentBack = await focused(dark);
    checks.push({
      name: "restoring moves focus back",
      ok: cameBack && wentBack === "button:collapse inspector",
      detail: `the pane is ${cameBack ? "open" : "still closed"} and focus is on ${wentBack}`,
    });

    // Both new controls, from the keyboard only. The theme buttons are the first tab stop on the page.
    const keys = await open({ colorScheme: "dark" });
    await keys.keyboard.press("Tab");
    const firstStop = await focused(keys);
    const themeRing = await focusRing(keys);
    await keys.keyboard.press("Tab");
    await keys.keyboard.press("Enter");
    const keyedTheme = await keys.evaluate(() => document.documentElement.dataset.theme);
    await keys.getByRole("button", { name: "collapse inspector" }).press("Enter");
    const collapsedRing = await focusRing(keys);
    const onRestore = await focused(keys);
    await keys.keyboard.press("Enter");
    const restoredRing = await focusRing(keys);
    const onCollapse = await focused(keys);
    const ringOk = [themeRing, collapsedRing, restoredRing].every((ring) => ring === "focus-visible solid 2px");
    checks.push({
      name: "the new controls work from the keyboard",
      ok:
        firstStop === "button:dark" &&
        keyedTheme === "light" &&
        onRestore === "button:show inspector" &&
        onCollapse === "button:collapse inspector" &&
        ringOk,
      detail: `first stop ${firstStop}, Enter gives ${keyedTheme}, then ${onRestore} and ${onCollapse}, each ${themeRing}`,
    });

    // The stacked layout, where the inspector is simply hidden rather than a column of zero width.
    const small = await open({ colorScheme: "dark", viewport: { width: 390, height: 844 } });
    const stacked = await small.evaluate(() => {
      const canvas = document.querySelector(".canvas")?.getBoundingClientRect();
      const layers = document.querySelector(".layers")?.getBoundingClientRect();
      const root = document.documentElement;
      return {
        sameColumn: canvas && layers ? Math.abs(canvas.left - layers.left) < 1 : false,
        canvasFirst: canvas && layers ? canvas.top < layers.top : false,
        overflow: root.scrollWidth - root.clientWidth,
      };
    });
    await small.getByRole("button", { name: "collapse inspector" }).click();
    const smallCollapsed = !(await small.locator("#inspector").isVisible());
    const overflowCollapsed = await small.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await small.getByRole("button", { name: "show inspector" }).click();
    const smallRestored = await small.locator("#inspector").isVisible();
    checks.push({
      name: "390 by 844 stacks and collapses",
      ok:
        stacked.sameColumn &&
        stacked.canvasFirst &&
        stacked.overflow <= 0 &&
        overflowCollapsed <= 0 &&
        smallCollapsed &&
        smallRestored,
      detail: `canvas above layers in one column, ${stacked.overflow}px of sideways overflow and ${overflowCollapsed}px while collapsed, collapse ${smallCollapsed ? "hides" : "keeps"} the pane and it comes back ${smallRestored ? "open" : "closed"}`,
    });

    // The footer closes with the copyright, against the right edge.
    const footer = await dark.evaluate(() => {
      const bar = document.querySelector(".status");
      const last = bar?.lastElementChild;
      if (!bar || !(last instanceof HTMLElement)) return null;
      return {
        text: (last.textContent ?? "").trim(),
        gap: bar.getBoundingClientRect().right - parseFloat(getComputedStyle(bar).paddingRight) - last.getBoundingClientRect().right,
      };
    });
    const year = new Date().getUTCFullYear();
    checks.push({
      name: "the footer ends with the copyright",
      ok: footer !== null && footer.text === `© ${year} Picagram` && Math.abs(footer.gap) < 1,
      detail: footer ? `${JSON.stringify(footer.text)}, ${footer.gap.toFixed(1)}px from the right edge` : "no footer",
    });

    // Nothing the site draws comes from anywhere else.
    const foreign = [...new Set(requested)].filter((url) => /^https?:/.test(url) && !url.startsWith(site.url));
    checks.push({
      name: "every request stays on the site",
      ok: foreign.length === 0,
      detail: foreign[0] ?? `${new Set(requested).size} URLs, all on ${site.url}`,
    });

    checks.push({ name: "no console errors", ok: consoleErrors.length === 0, detail: consoleErrors[0] ?? "none" });
  } finally {
    await browser.close();
    await site.close();
  }

  for (const c of checks) console.log(`${c.ok ? "pass" : "FAIL"}  ${c.name.padEnd(46)} ${c.detail}`);
  const failed = checks.filter((c) => !c.ok).length;
  console.log(`\n${checks.length - failed} of ${checks.length} passed`);
  if (failed > 0) process.exitCode = 1;
}

await main();
