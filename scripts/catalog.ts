/** Finds components and reads what the build needs from each: meta, defaults, prop docs, export name. */
import { readdir, readFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Meta } from "../lib/meta";

export const ROOT = fileURLToPath(new URL("..", import.meta.url));
export const REGISTRY = join(ROOT, "registry");

export interface Entry {
  meta: Meta;
  /** Absolute paths. */
  dir: string;
  core: string;
  wrapper: string;
  defaults: Record<string, unknown>;
  /** The React component's name, read from the wrapper. */
  exportName: string;
  /** Prop name to its JSDoc, read from the core's props interface and lib/types.ts. */
  docs: Record<string, string>;
}

/** Absolute paths of every component directory, registry/<category>/<slug>, sorted. */
export async function discover(): Promise<string[]> {
  const out: string[] = [];
  for (const category of await readdir(REGISTRY, { withFileTypes: true })) {
    if (!category.isDirectory()) continue;
    for (const item of await readdir(join(REGISTRY, category.name), { withFileTypes: true })) {
      if (item.isDirectory()) out.push(join(REGISTRY, category.name, item.name));
    }
  }
  return out.sort();
}

export async function load(dir: string): Promise<Entry> {
  const { meta } = (await import(pathToFileURL(join(dir, "meta.ts")).href)) as { meta: Meta };
  const { defaults } = (await import(pathToFileURL(join(dir, "core.ts")).href)) as { defaults: Record<string, unknown> };
  const coreSource = await readFile(join(dir, "core.ts"), "utf8");
  const wrapperSource = await readFile(join(dir, "index.tsx"), "utf8");
  const typesSource = await readFile(join(ROOT, "lib", "types.ts"), "utf8");
  const exportName = /export function (\w+)/.exec(wrapperSource)?.[1];
  if (!exportName) throw new Error(`${relative(ROOT, dir)}/index.tsx exports no function component`);
  return {
    meta,
    dir,
    core: join(dir, "core.ts"),
    wrapper: join(dir, "index.tsx"),
    defaults,
    exportName,
    docs: { ...interfaceDocs(typesSource, "MotionProps"), ...interfaceDocs(coreSource, /\w+Props/) },
  };
}

/** Loads every component, or only the named ones. Naming slugs loads only those directories, so a
 *  half-written component elsewhere in the registry cannot break verifying this one. */
export async function loadAll(slugs: readonly string[] = []): Promise<Entry[]> {
  const dirs = await discover();
  const chosen = slugs.length === 0 ? dirs : dirs.filter((dir) => slugs.includes(basename(dir)));
  const missing = slugs.filter((slug) => !chosen.some((dir) => basename(dir) === slug));
  if (missing.length > 0) throw new Error(`No component named ${missing.join(", ")}`);
  return Promise.all(chosen.map(load));
}

/** The JSDoc on each field of one exported interface. */
export function interfaceDocs(source: string, name: string | RegExp): Record<string, string> {
  const pattern = typeof name === "string" ? name : name.source;
  const block = new RegExp(`export interface ${pattern}\\b[^{]*\\{([\\s\\S]*?)\\n\\}`).exec(source)?.[1] ?? "";
  const docs: Record<string, string> = {};
  for (const m of block.matchAll(/\/\*\*([\s\S]*?)\*\/\s*(\w+)\??\s*:/g)) {
    const text = (m[1] ?? "")
      .split("\n")
      .map((line) => line.replace(/^\s*\*\s?/, "").trim())
      .filter(Boolean)
      .join(" ");
    if (m[2]) docs[m[2]] = text;
  }
  return docs;
}
