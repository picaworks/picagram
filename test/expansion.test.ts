import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { loadAll } from "../scripts/catalog";
import { vanillaParts } from "../scripts/single-file";
import { CURRENT_RELEASE, items, isNew, inRelease, readRelease, matches, type CatalogItem } from "../src/lib/catalog";

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
  it("keeps both review batches and excludes unreviewed or undated items", () => {
    expect(isNew({ release: "microsites-2026-10-04" })).toBe(true);
    expect(isNew({ release: "older-batch" })).toBe(false);
    expect(isNew({})).toBe(false);
    expect(matches({ ...item, release: "older-batch" }, "", [], true)).toBe(false);
  });
  it("selects explicit batches without changing their stable membership", () => {
    const earlier = { ...item, release: "microsites-2026-10-04" };
    expect(matches(earlier, "rome", ["text"], true, "sections", "microsites-2026-10-04")).toBe(true);
    expect(matches(earlier, "", [], true, "all", CURRENT_RELEASE)).toBe(false);
    expect(matches(item, "", [], true, "all", CURRENT_RELEASE)).toBe(true);
    expect(inRelease(earlier, "all")).toBe(true);
    expect(readRelease("microsites-2026-10-04")).toBe("microsites-2026-10-04");
    expect(readRelease("all")).toBe("all");
    expect(readRelease("guess-from-date")).toBeNull();
    expect(readRelease(null)).toBeNull();
  });
});

describe("ASCII and motion release inventory", () => {
  it("adds the exact distinct batch and retains the approved microsites", async () => {
    const entries = await loadAll();
    const latest = entries.filter((entry) => entry.meta.release === CURRENT_RELEASE);
    expect(latest).toHaveLength(47);
    expect(new Set(latest.map((entry) => entry.meta.slug)).size).toBe(47);
    expect(latest.every((entry) => entry.meta.wave === 14)).toBe(true);
    expect(latest.filter((entry) => entry.meta.category === "ascii")).toHaveLength(19);
    expect(latest.filter((entry) => entry.meta.category === "effects" && entry.meta.animated)).toHaveLength(23);
    expect(latest.filter((entry) => entry.meta.category === "immersive")).toHaveLength(5);
    expect(entries.filter((entry) => entry.meta.release === "microsites-2026-10-04")).toHaveLength(36);
    expect(entries.filter((entry) => entry.meta.category === "ascii")).toHaveLength(30);
    expect(entries.filter((entry) => entry.meta.category === "effects" && entry.meta.animated)).toHaveLength(30);
    expect(entries.filter((entry) => entry.meta.category === "immersive")).toHaveLength(10);
  });
});
