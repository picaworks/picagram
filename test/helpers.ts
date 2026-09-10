import { readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { ROOT } from "../scripts/catalog";

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
