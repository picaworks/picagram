/** Each component, shared runtime included, stays inside its category's byte budget. The numbers live in
 *  scripts/config.ts and are cited, not copied, by AGENTS.md. */
import { describe, expect, it } from "vitest";
import { CATEGORIES } from "../lib/meta";
import { loadAll } from "../scripts/catalog";
import { BUDGETS } from "../scripts/config";
import { vanillaBundle } from "../scripts/single-file";

describe("byte budget", () => {
  it("every category has a budget, and nothing is allowed more than a section", () => {
    for (const category of CATEGORIES) {
      expect(BUDGETS[category], category).toBeGreaterThan(0);
      expect(BUDGETS[category], category).toBeLessThanOrEqual(BUDGETS.sections);
    }
  });

  it("every component is within its category's budget, minified and gzipped", async () => {
    for (const entry of await loadAll()) {
      const { gzipBytes } = await vanillaBundle(entry);
      expect(gzipBytes, entry.meta.slug).toBeLessThanOrEqual(BUDGETS[entry.meta.category]);
    }
  });
});
