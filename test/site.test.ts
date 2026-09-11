/** The site works under any base path. The page links to its own files with relative paths, and llms.txt, which
 *  agents read on its own, links with absolute URLs on the site. See docs/architecture/site.md. */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ROOT } from "../scripts/catalog";
import { SITE_URL } from "../scripts/config";
import { files, rel } from "./helpers";

/** A quoted path from the site's root to a file the site serves. */
const ROOT_RELATIVE = /["'`]\/(?:(?:v|r|c|react|thumbs)\/|llms(?:-full)?\.txt|catalog\.json|icon\.svg|og\.png)/;

describe("site", () => {
  it("links to its own files with relative paths, so it works under any base path", async () => {
    for (const f of await files(join(ROOT, "src"), [".ts", ".tsx"])) {
      const lines = (await readFile(f, "utf8")).split("\n");
      lines.forEach((line, i) => expect(line, `${rel(f)}:${i + 1}`).not.toMatch(ROOT_RELATIVE));
    }
  });

  it("llms.txt links with absolute URLs on the site", async () => {
    const text = await readFile(join(ROOT, "public", "llms.txt"), "utf8");
    const targets = [...text.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1] ?? "");
    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) expect(target.startsWith(`${SITE_URL}/`), target).toBe(true);
  });
});
