import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { loadAll } from "../scripts/catalog";
import { vanillaParts } from "../scripts/single-file";
import { CURRENT_RELEASE, items, isNew, matches, type CatalogItem } from "../src/lib/catalog";

const originals = await loadAll(["clay-hero", "glass-hero", "liquid-glass-hero", "ethereal-hero", "minimal-hero"]);

describe("standalone first mount", () => {
  it.each(originals)("starts $meta.slug with its demo props, then consumer overrides", (entry) => {
    const style = new Map<string, string>();
    let mounted: Record<string, unknown> = {};
    const parts = vanillaParts(entry, { js: "", globalName: "TestCore", gzipBytes: 0 });
    const host = { style: { setProperty: (k: string, v: string) => style.set(k, v), removeProperty: (k: string) => style.delete(k) } };
    const window = { PICA_PROPS: { headline: "Consumer headline", palette: { accent: "custom" } }, parent: null, addEventListener: () => {} };
    runInNewContext(parts.js, { window, document: { getElementById: () => host }, TestCore: { mount: (_: unknown, props: Record<string, unknown>) => { mounted = props; return { update: () => {} }; } } });
    expect(mounted).toEqual({ ...entry.meta.demo?.props, headline: "Consumer headline" });
    expect(style.get("--pica-accent")).toBe("custom");
  });
  it.each(originals)("applies the $meta.slug demo without an injected PICA_PROPS", (entry) => {
    let mounted: Record<string, unknown> = {};
    const parts = vanillaParts(entry, { js: "", globalName: "TestCore", gzipBytes: 0 });
    runInNewContext(parts.js, { window: { parent: null, addEventListener: () => {} }, document: { getElementById: () => ({ style: {} }) }, TestCore: { mount: (_: unknown, props: Record<string, unknown>) => { mounted = props; return { update: () => {} }; } } });
    expect(mounted).toEqual(entry.meta.demo?.props ?? {});
    expect(mounted.headline).toBe("");
  });
});

describe("release filters", () => {
  const item: CatalogItem = { ...items[0]!, slug: "forum-rome", title: "Forum Rome", description: "Civic exhibition.", release: CURRENT_RELEASE, category: "sections", facets: ["static", "text"], tags: ["rome"] };
  it("composes batch, search, facets and category", () => {
    expect(matches(item, "rome", ["text"], true, "sections")).toBe(true);
    expect(matches(item, "rome", [], true, "patterns")).toBe(false);
    expect(matches(item, "zzz", [], true)).toBe(false);
    expect(matches(item, "", ["animated"], true)).toBe(false);
  });
  it("does not label previous batches or undated items new", () => {
    expect(isNew({ release: "older-batch" })).toBe(false);
    expect(isNew({})).toBe(false);
    expect(matches({ ...item, release: "older-batch" }, "", [], true)).toBe(false);
  });
});
