import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ROOT } from "../scripts/catalog";
import { diffProps, presetValues, reactSnippet, withPicaProps } from "../src/lib/props";

describe("curation compatibility", () => {
  it("keeps the archived hero installable and identified while discovery omits it", async () => {
    const catalog = JSON.parse(await readFile(join(ROOT, "public/catalog.json"), "utf8")) as { slug: string; archived?: boolean }[];
    expect(catalog.filter((entry) => entry.archived).map((entry) => entry.slug)).toEqual(["cyberpunk-hero"]);
    for (const slug of ["pixel-plasma", "voronoi-drift", "ascii-noise-field", "ascii-rain"]) {
      expect(catalog.find((entry) => entry.slug === slug)?.archived).not.toBe(true);
    }
    const index = await readFile(join(ROOT, "public/llms.txt"), "utf8");
    const full = await readFile(join(ROOT, "public/llms-full.txt"), "utf8");
    expect(index).not.toContain("/c/cyberpunk-hero.md");
    expect(full).not.toContain("# Cyberpunk Hero");
    for (const file of ["public/v/cyberpunk-hero.html", "public/react/cyberpunk-hero.tsx", "public/r/cyberpunk-hero.json"]) {
      expect((await readFile(join(ROOT, file), "utf8")).length).toBeGreaterThan(100);
    }
    expect(await readFile(join(ROOT, "public/c/cyberpunk-hero.md"), "utf8")).toContain("Archived from default discovery");
    const registry = JSON.parse(await readFile(join(ROOT, "public/r/cyberpunk-hero.json"), "utf8")) as { meta: { archived: boolean } };
    expect(registry.meta.archived).toBe(true);
    const publicIndex = JSON.parse(await readFile(join(ROOT, "public/r/registry.json"), "utf8")) as { items: { name: string }[] };
    expect(publicIndex.items.some((item) => item.name === "cyberpunk-hero")).toBe(false);
  });

  it("resets visual tuning, retains supplied content, and exports the chosen settings", () => {
    const defaults = Object.freeze({ src: "", label: "Image", depth: 36, speed: 4.5, seed: 1, paused: false });
    const current = Object.freeze({ src: "data:image/png;base64,userImage", label: "My specimen", depth: 8, speed: 9, seed: 42, paused: true });
    const preset = Object.freeze({ depth: 46, speed: 3 });
    const values = presetValues(defaults, current, preset);
    expect(values).toEqual({ src: current.src, label: current.label, depth: 46, speed: 3, seed: 1, paused: true });
    const props = diffProps(defaults, values);
    expect(reactSnippet("Relief", props)).toContain("depth={46}");
    expect(withPicaProps("<html><script>mount()</script></html>", props)).toContain('"speed":3');
    expect(withPicaProps("<html><script>mount()</script></html>", props)).toContain(current.src);
    expect(presetValues(defaults, current, { src: "", label: "Replacement" })).toMatchObject({ src: "", label: "Replacement" });
    expect(current.seed).toBe(42);
  });
});
