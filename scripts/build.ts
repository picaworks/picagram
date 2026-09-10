/** Generates every artifact derived from registry/. Nothing it writes is edited by hand, and
 *  test/generated.test.ts fails when a committed copy drifts from a fresh build.
 *  Usage: npm run build:registry */
import { execFile } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import type { Category, Meta } from "../lib/meta";
import { loadAll, ROOT, type Entry } from "./catalog";
import { BUDGET_BYTES, HOMEPAGE, LICENSE_LABEL, LICENSE_URL, REGISTRY_BASE } from "./config";
import { reactSingleFile, vanillaBundle, vanillaHtml, vanillaParts } from "./single-file";

const run = promisify(execFile);

/** One generated file, with its path relative to the repo root. */
export interface Artifact {
  path: string;
  content: string;
}

const CATEGORY_TITLES: Record<Category, string> = {
  ascii: "ASCII",
  "text-mode": "Text mode",
  dither: "Dither",
  effects: "Effects",
  patterns: "Patterns",
};

/** Every generated file, in a stable order. Throws when a component is over the byte budget. */
export async function generate(): Promise<Artifact[]> {
  const entries = await loadAll();
  const files: Artifact[] = [];
  const sizes = new Map<string, number>();
  const over: string[] = [];
  for (const entry of entries) {
    const slug = entry.meta.slug;
    const bundle = await vanillaBundle(entry);
    const react = await reactSingleFile(entry);
    const html = vanillaHtml(entry, bundle);
    sizes.set(slug, bundle.gzipBytes);
    if (bundle.gzipBytes > BUDGET_BYTES) over.push(`${slug} (${bundle.gzipBytes} bytes)`);
    files.push(
      { path: `public/react/${slug}.tsx`, content: react },
      { path: `public/v/${slug}.html`, content: html },
      { path: `public/v/${slug}.json`, content: `${JSON.stringify(vanillaParts(bundle), null, 2)}\n` },
      { path: `public/c/${slug}.md`, content: markdown(entry, react, html, bundle.gzipBytes) },
    );
  }
  if (over.length > 0) throw new Error(`Over the ${BUDGET_BYTES}-byte budget: ${over.join(", ")}`);
  const twins = files.filter((f) => f.path.startsWith("public/c/")).map((f) => f.content);
  files.push(
    { path: "registry.json", content: registryJson(entries) },
    { path: "public/llms.txt", content: llmsTxt(entries) },
    { path: "public/llms-full.txt", content: twins.join("\n---\n\n") },
    { path: "public/catalog.json", content: catalogJson(entries, sizes) },
    { path: "CREDITS.md", content: creditsMd(entries) },
  );
  return files;
}

function escapeCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function propType(entry: Entry, name: string): string {
  const control = entry.meta.controls[name];
  if (control?.type === "select") return control.options.map((o) => `"${o}"`).join(" \\| ");
  const value = entry.defaults[name];
  if (value === null) return "number \\| null";
  if (Array.isArray(value)) return "number[]";
  return typeof value;
}

function creditLines(meta: Meta): string[] {
  if (meta.original && meta.credits.length === 0) return ["Original to Pica."];
  const verb = { "port-of": "Port of", "inspired-by": "Inspired by", technique: "Technique from" } as const;
  return meta.credits.map((c) => `- ${verb[c.relation]} [${c.title}](${c.url}) by ${c.author} (${c.license}).`);
}

function markdown(entry: Entry, react: string, html: string, bytes: number): string {
  const { meta } = entry;
  const motion = meta.animated
    ? "Animated. Holds a still frame under prefers-reduced-motion, and stops offscreen and in hidden tabs."
    : "Static.";
  const rows = Object.keys(entry.defaults).map(
    (name) => `| \`${name}\` | ${propType(entry, name)} | \`${escapeCell(JSON.stringify(entry.defaults[name]))}\` | ${escapeCell(entry.docs[name] ?? "")} |`,
  );
  return [
    `# ${meta.title}`,
    "",
    `> ${meta.description}`,
    "",
    `Category: ${meta.category}. Tags: ${meta.tags.join(", ")}. ${motion} Size: ${(bytes / 1024).toFixed(1)} KB gzipped, runtime included. License: ${LICENSE_LABEL}, ${LICENSE_URL}.`,
    "",
    "## Install",
    "",
    "```bash",
    `npx shadcn@latest add ${REGISTRY_BASE}/${meta.slug}.json`,
    "```",
    "",
    "Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.",
    "",
    "## Props",
    "",
    "| Prop | Type | Default | Description |",
    "|---|---|---|---|",
    ...rows,
    "",
    "## React",
    "",
    "```tsx",
    react.trimEnd(),
    "```",
    "",
    "## HTML, CSS, JS",
    "",
    "```html",
    html.trimEnd(),
    "```",
    "",
    "## Credits",
    "",
    ...creditLines(meta),
    "",
  ].join("\n");
}

function byCategory(entries: readonly Entry[]): [Category, Entry[]][] {
  return (Object.keys(CATEGORY_TITLES) as Category[])
    .map((category): [Category, Entry[]] => [category, entries.filter((e) => e.meta.category === category)])
    .filter(([, list]) => list.length > 0);
}

function llmsTxt(entries: readonly Entry[]): string {
  const sections = byCategory(entries).flatMap(([category, list]) => [
    `## ${CATEGORY_TITLES[category]}`,
    "",
    ...list.map((e) => `- [${e.meta.title}](/c/${e.meta.slug}.md): ${e.meta.description}`),
    "",
  ]);
  return [
    "# Pica",
    "",
    "> ASCII-first components for React and plain HTML. Each component ships as one React file that imports only react, and one HTML file that needs nothing. Every page below is markdown with both files inline.",
    "",
    `Install any component with \`npx shadcn@latest add ${REGISTRY_BASE}/<slug>.json\`. License: ${LICENSE_LABEL}. Use it in anything, including commercial work; do not resell the components as a library or template pack.`,
    "",
    ...sections,
    "## Optional",
    "",
    "- [Every component in one file](/llms-full.txt)",
    "- [shadcn registry index](/r/registry.json)",
    "- [Catalog as JSON](/catalog.json)",
    "",
  ].join("\n");
}

function registryJson(entries: readonly Entry[]): string {
  const registry = {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    name: "pica",
    homepage: HOMEPAGE,
    items: entries.map((e) => ({
      name: e.meta.slug,
      type: "registry:component",
      title: e.meta.title,
      description: e.meta.description,
      categories: [e.meta.category],
      files: [{ path: `public/react/${e.meta.slug}.tsx`, type: "registry:component" }],
      meta: { license: LICENSE_LABEL, licenseUrl: LICENSE_URL, credits: e.meta.credits },
    })),
  };
  return `${JSON.stringify(registry, null, 2)}\n`;
}

function catalogJson(entries: readonly Entry[], sizes: ReadonlyMap<string, number>): string {
  const catalog = entries.map((e) => ({
    ...e.meta,
    exportName: e.exportName,
    defaults: e.defaults,
    docs: e.docs,
    gzipBytes: sizes.get(e.meta.slug) ?? 0,
  }));
  return `${JSON.stringify(catalog, null, 2)}\n`;
}

function creditsMd(entries: readonly Entry[]): string {
  return [
    "# Credits",
    "",
    "Generated from each component's meta by `npm run build:registry`. Edit the meta, not this file.",
    "",
    ...entries.flatMap((e) => [`## ${e.meta.title} (\`${e.meta.slug}\`)`, "", ...creditLines(e.meta), ""]),
  ].join("\n");
}

async function main(): Promise<void> {
  const files = await generate();
  for (const dir of ["public/r", "public/v", "public/c", "public/react"]) {
    await rm(join(ROOT, dir), { recursive: true, force: true });
  }
  for (const file of files) {
    await mkdir(dirname(join(ROOT, file.path)), { recursive: true });
    await writeFile(join(ROOT, file.path), file.content);
  }
  await run(join(ROOT, "node_modules", ".bin", "shadcn"), ["build", "--output", "public/r"], { cwd: ROOT });
  const count = files.filter((f) => f.path.startsWith("public/c/")).length;
  console.log(`Built ${count} components: public/r, public/v, public/c, llms.txt, catalog.json, CREDITS.md`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
