import { execFile } from "node:child_process";
import { readdir, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { promisify } from "node:util";
import { ROOT } from "../scripts/catalog";

const run = promisify(execFile);

/** What a pasted single React file must compile under with nothing but react installed. erasableSyntaxOnly
 *  matches projects that strip types without a compiler: no enums, namespaces, or parameter properties. */
const ALONE = {
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
  erasableSyntaxOnly: true,
};

/** Typechecks every .tsx file in `dir` on its own. Throws with the compiler's output. */
export async function typecheckAlone(dir: string): Promise<void> {
  await writeFile(join(dir, "tsconfig.json"), JSON.stringify({ compilerOptions: ALONE, include: ["*.tsx"] }));
  try {
    await run(join(ROOT, "node_modules", ".bin", "tsc"), ["-p", join(dir, "tsconfig.json")], { cwd: ROOT });
  } catch (error) {
    throw new Error((error as { stdout?: string }).stdout || String(error), { cause: error });
  }
}

/** Every file under `dir` whose name ends with one of `suffixes`. A missing directory yields none. */
export async function files(dir: string, suffixes: readonly string[]): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await files(full, suffixes)));
    else if (suffixes.some((s) => entry.name.endsWith(s))) out.push(full);
  }
  return out.sort();
}

/** A repo-relative path with forward slashes, for failure messages that name the offending file. */
export function rel(file: string): string {
  return relative(ROOT, file).split(sep).join("/");
}
