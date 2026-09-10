/** Each component, shared runtime included, stays inside the byte budget. The number lives in
 *  scripts/config.ts and is cited, not copied, by AGENTS.md. */
import { describe, expect, it } from "vitest";
import { loadAll } from "../scripts/catalog";
import { BUDGET_BYTES } from "../scripts/config";
import { vanillaBundle } from "../scripts/single-file";

describe("byte budget", () => {
  it(`every component is at most ${BUDGET_BYTES} bytes minified and gzipped`, async () => {
    for (const entry of await loadAll()) {
      const { gzipBytes } = await vanillaBundle(entry);
      expect(gzipBytes, entry.meta.slug).toBeLessThanOrEqual(BUDGET_BYTES);
    }
  });
});
