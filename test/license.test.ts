/** The license reads the same everywhere it appears, and travels with every copy. See docs/decisions/0001. */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadAll, ROOT } from "../scripts/catalog";
import { LICENSE_LABEL, LICENSE_URL } from "../scripts/config";
import { reactSingleFile, vanillaBundle, vanillaHtml } from "../scripts/single-file";

const read = (path: string) => readFile(join(ROOT, path), "utf8");

describe("license agreement", () => {
  it("LICENSE.md holds the MIT text and the Commons Clause rider", async () => {
    const text = await read("LICENSE.md");
    expect(text).toMatch(/^MIT License/);
    expect(text).toContain('"Commons Clause" License Condition v1.0');
    expect(text).toContain("License: MIT");
  });

  it("package.json points at LICENSE.md", async () => {
    expect(JSON.parse(await read("package.json")).license).toBe("SEE LICENSE IN LICENSE.md");
  });

  it("the README and the site footer carry the same label", async () => {
    expect(await read("README.md")).toContain(LICENSE_LABEL);
    expect(await read("src/app/layout.tsx")).toContain(LICENSE_LABEL);
  });

  it("every generated copy opens with the license header", async () => {
    for (const entry of await loadAll()) {
      const react = await reactSingleFile(entry);
      const html = vanillaHtml(entry, await vanillaBundle(entry));
      for (const [shape, text] of [["react", react], ["html", html]] as const) {
        const head = text.slice(0, 400);
        expect(head, `${entry.meta.slug} ${shape}`).toContain(LICENSE_LABEL);
        expect(head, `${entry.meta.slug} ${shape}`).toContain(LICENSE_URL);
      }
      // The shadcn CLI drops comments that precede "use client" on install, so the header must follow it.
      expect(react.indexOf(LICENSE_LABEL), `${entry.meta.slug}: the header must come after "use client"`)
        .toBeGreaterThan(react.indexOf('"use client"'));
    }
  });
});
