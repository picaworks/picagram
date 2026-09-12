/** A section's single React file wraps each core it composes in a scope of its own, so the two cores' helpers
 *  can share names, and the file still typechecks alone. What a real section may compose, and how much of it,
 *  is checked below against the registry. See docs/decisions/0007-composition-and-budgets.md. */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadAll, ROOT, type Entry } from "../scripts/catalog";
import { reactSingleFile } from "../scripts/single-file";
import { rel, typecheckAlone } from "./helpers";

const FIXTURE = join(ROOT, "test", "fixtures", "compose");

/** The one import shape a section may use for a sibling core, from the dependencies rule in invariants.test.ts:
 *  import * as meshGradient from "../../shaders/mesh-gradient/core"; */
const COMPOSED = /^import \* as \w+ from "\.\.\/\.\.\/[a-z-]+\/([a-z0-9-]+)\/core";$/gm;

const entries = await loadAll();
const sections = entries.filter((e) => e.meta.category === "sections");
const waves = new Map(entries.map((e) => [e.meta.slug, e.meta.wave]));

/** The slugs a wave's builders were briefed to build, or none when that wave has no brief. */
async function briefed(wave: number): Promise<string[]> {
  const text = await readFile(join(ROOT, "sources", `wave-${wave}.json`), "utf8").catch(() => "");
  if (!text) return [];
  const brief = JSON.parse(text) as { components: readonly { slug: string }[] };
  return brief.components.map((component) => component.slug);
}

const entry: Entry = {
  meta: {
    slug: "section",
    title: "Section",
    category: "sections",
    description: "A fixture section that composes another core.",
    tags: [],
    facets: ["static"],
    wave: 0,
    animated: false,
    decorative: true,
    controls: {},
    credits: [],
    original: true,
  },
  dir: join(FIXTURE, "section"),
  core: join(FIXTURE, "section", "core.ts"),
  wrapper: join(FIXTURE, "section", "index.tsx"),
  defaults: { label: "section" },
  exportName: "Section",
  docs: {},
  types: {},
  events: {},
};

describe("composition", () => {
  it("wraps a composed core in its own scope, named after its slug", async () => {
    const file = await reactSingleFile(entry);
    expect(file).toContain("const child = (() => {");
    expect(file).toContain("return { mount, defaults };");
  });

  it("typechecks alone with nothing but react installed, same-named helpers and all", async () => {
    const dir = join(ROOT, ".pica", "compose");
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "section.tsx"), await reactSingleFile(entry));
    await typecheckAlone(dir);
  });
});

describe("sections", () => {
  // A section inlines every core it composes, so each one spends from the same 16 KB.
  it("composes at most three cores", async () => {
    for (const { core } of sections) {
      const composed = [...(await readFile(core, "utf8")).matchAll(COMPOSED)].map((m) => m[1]);
      expect(composed.length, `${rel(core)} composes ${composed.join(", ")}`).toBeLessThanOrEqual(3);
    }
  });

  // A section composes only what existed before its own wave started, so no two builders wait on each other.
  // Equal waves pass only for a reference component, built ahead of the wave and so absent from its brief,
  // which is what mesh-gradient is to hero.
  it("composes only cores that existed before its wave started", async () => {
    for (const { meta, core } of sections) {
      const brief = await briefed(meta.wave);
      for (const [, slug = ""] of (await readFile(core, "utf8")).matchAll(COMPOSED)) {
        const wave = waves.get(slug);
        const earlier = wave !== undefined && (wave < meta.wave || (wave === meta.wave && !brief.includes(slug)));
        expect(earlier, `${rel(core)} composes ${slug}, from wave ${String(wave)}, and is itself wave ${meta.wave}`).toBe(true);
      }
    }
  });
});
