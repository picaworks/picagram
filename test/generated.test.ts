/** Generated files match a fresh build, and every single-file React output typechecks on its own.
 *  See docs/decisions/0002-one-core-two-shapes.md. */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { describe, expect, it } from "vitest";
import { generate } from "../scripts/build";
import { ROOT } from "../scripts/catalog";
import { typecheckAlone } from "./helpers";

const artifacts = await generate();

describe("generated output", () => {
  it("every committed generated file matches a fresh build", async () => {
    for (const artifact of artifacts) {
      if (artifact.path.startsWith(".pica/")) continue;
      const committed = await readFile(join(ROOT, artifact.path), "utf8").catch(() => null);
      expect(committed, `${artifact.path} is stale or missing: run npm run build:registry`).toBe(artifact.content);
    }
  });

  it("every single-file React output typechecks with nothing but react installed", async () => {
    const dir = join(ROOT, ".pica", "typecheck");
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    for (const artifact of artifacts.filter((a) => a.path.startsWith("public/react/"))) {
      await writeFile(join(dir, basename(artifact.path)), artifact.content);
    }
    await typecheckAlone(dir);
  });
});
