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
    const pathname = decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/");
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

  const catalog = JSON.parse(await readFile(join(ROOT, "public", "catalog.json"), "utf8")) as { title: string; slug: string }[];
  const site = await serve();
  const browser = await chromium.launch();
  const checks: Check[] = [];
  const consoleErrors: string[] = [];

  try {
    const page = await browser.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));
    page.on("response", (response) => {
      if (response.status() >= 400) consoleErrors.push(`${response.status()} for ${response.url()}`);
    });
    await page.goto(site.url);
    await page.waitForSelector(".layers-list");

    // Every catalog item is listed.
    const titles = await page.locator(".layers-row .layers-title").allTextContents();
    const missing = catalog.filter((item) => !titles.includes(item.title));
    checks.push({ name: "every catalog item is listed", ok: missing.length === 0, detail: missing.map((m) => m.slug).join(", ") || "all present" });

    // Selecting a real component loads its frame.
    const first = catalog[0];
    if (first) {
      await select(page, first.title);
      await page.waitForSelector(`iframe.frame-live[src="/v/${first.slug}.html"]`);
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
    await page.waitForSelector('iframe.frame-live[src="/v/select.html"]');
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

    checks.push({ name: "no console errors", ok: consoleErrors.length === 0, detail: consoleErrors[0] ?? "none" });
  } finally {
    await browser.close();
    await site.close();
  }

  for (const c of checks) console.log(`${c.ok ? "pass" : "FAIL"}  ${c.name.padEnd(40)} ${c.detail}`);
  const failed = checks.filter((c) => !c.ok).length;
  console.log(`\n${checks.length - failed} of ${checks.length} passed`);
  if (failed > 0) process.exitCode = 1;
}

await main();
