/** Every component's meta agrees with its directory and its core. See docs/testing/invariants.md. */
import { basename, dirname } from "node:path";
import { describe, expect, it } from "vitest";
import { loadAll } from "../scripts/catalog";

const entries = await loadAll();
const MOTION = ["paused", "time", "seed"];

describe.each(entries.map((e) => [e.meta.slug, e] as const))("%s", (_slug, entry) => {
  const { meta, defaults, docs } = entry;

  it("slug and category match its directory", () => {
    expect(meta.slug).toBe(basename(entry.dir));
    expect(meta.category).toBe(basename(dirname(entry.dir)));
  });

  it("every inspector control names a prop in the core's defaults", () => {
    for (const name of Object.keys(meta.controls)) expect(Object.keys(defaults), `control "${name}"`).toContain(name);
  });

  it("every prop has a JSDoc description", () => {
    for (const name of Object.keys(defaults)) expect(docs[name], `prop "${name}" has no JSDoc`).toBeTruthy();
  });

  it("names what it builds on, or is marked original", () => {
    expect(meta.credits.length > 0 || meta.original === true).toBe(true);
    for (const credit of meta.credits) {
      expect(credit.url, credit.title).toMatch(/^https:\/\//);
      expect(credit.license, credit.title).toBeTruthy();
    }
  });

  it("animated components accept the motion props", () => {
    for (const name of MOTION) {
      if (meta.animated) expect(Object.keys(defaults), `animated component lacks "${name}"`).toContain(name);
    }
  });

  it("has a one-sentence description", () => {
    expect(meta.description).toMatch(/^[A-Z][^.]*\.$/);
    expect(meta.description.length).toBeLessThanOrEqual(160);
  });
});
