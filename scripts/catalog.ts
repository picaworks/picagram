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
  /** Prop name to its declared type, as written in the core's props interface and lib/types.ts. */
  types: Record<string, string>;
  /** Event name to its JSDoc and its detail's declared type, from the core's events interface. Empty when
   *  it reports none. */
  events: Record<string, { doc: string; detail: string }>;
}

/** Whether a component takes a picture: a string `src` whose JSDoc calls it an image. Verify hands those
 *  components a photograph, and `test/meta.test.ts` requires the "image" facet of exactly the same set, so
 *  the two can never drift apart. A video source is not one of them. */
export function takesImage(entry: Entry): boolean {
  return typeof entry.defaults.src === "string" && /image/i.test(entry.docs.src ?? "");
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
  const eventDocs = interfaceDocs(coreSource, /\w+Events/);
  return {
    meta,
    dir,
    core: join(dir, "core.ts"),
    wrapper: join(dir, "index.tsx"),
    defaults,
    exportName,
    docs: { ...interfaceDocs(typesSource, "MotionProps"), ...interfaceDocs(coreSource, /\w+Props/) },
    types: { ...interfaceTypes(typesSource, "MotionProps"), ...interfaceTypes(coreSource, /\w+Props/) },
    events: Object.fromEntries(
      Object.entries(interfaceTypes(coreSource, /\w+Events/)).map(([name, detail]) => [name, { doc: eventDocs[name] ?? "", detail }]),
    ),
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

/** The body of one exported interface, or an empty string when the source declares none. */
function interfaceBody(source: string, name: string | RegExp): string {
  const pattern = typeof name === "string" ? name : name.source;
  return new RegExp(`export interface ${pattern}\\b[^{]*\\{([\\s\\S]*?)\\n\\}`).exec(source)?.[1] ?? "";
}

/** The declared type of each field of one exported interface, as written. Each field's type fits on one line. */
export function interfaceTypes(source: string, name: string | RegExp): Record<string, string> {
  const types: Record<string, string> = {};
  for (const m of interfaceBody(source, name).matchAll(/^\s*(\w+)\??\s*:\s*(.+?);\s*$/gm)) {
    if (m[1] && m[2]) types[m[1]] = m[2].trim();
  }
  return types;
}

/** The JSDoc on each field of one exported interface. */
export function interfaceDocs(source: string, name: string | RegExp): Record<string, string> {
  const block = interfaceBody(source, name);
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
