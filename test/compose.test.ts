/** A section's single React file wraps each core it composes in a scope of its own, so the two cores' helpers
 *  can share names, and the file still typechecks alone. See docs/decisions/0007-composition-and-budgets.md. */
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ROOT, type Entry } from "../scripts/catalog";
import { reactSingleFile } from "../scripts/single-file";
import { typecheckAlone } from "./helpers";

const FIXTURE = join(ROOT, "test", "fixtures", "compose");

const entry: Entry = {
  meta: {
    slug: "section",
    title: "Section",
    category: "sections",
    description: "A fixture section that composes another core.",
    tags: [],
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
