/** Generated files match a fresh build, and every single-file React output typechecks on its own.
 *  See docs/decisions/0002-one-core-two-shapes.md. */
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { generate } from "../scripts/build";
import { ROOT } from "../scripts/catalog";

const run = promisify(execFile);
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
    await writeFile(
      join(dir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          strict: true,
          noUncheckedIndexedAccess: true,
          exactOptionalPropertyTypes: true,
          jsx: "react-jsx",
          module: "esnext",
          moduleResolution: "bundler",
          target: "ES2022",
          lib: ["dom", "dom.iterable", "ES2023"],
          types: ["react"],
          noEmit: true,
          skipLibCheck: true,
          isolatedModules: true,
        },
        include: ["*.tsx"],
      }),
    );
    try {
      await run(join(ROOT, "node_modules", ".bin", "tsc"), ["-p", join(dir, "tsconfig.json")], { cwd: ROOT });
    } catch (error) {
      throw new Error((error as { stdout?: string }).stdout || String(error), { cause: error });
    }
  });
});
