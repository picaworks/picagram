/** The two single-file shapes of a component, generated from its core, its wrapper, and the lib modules
 *  they use. Nothing here is written by hand twice. See docs/decisions/0002-one-core-two-shapes.md. */
import { readFile, stat } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { gzipSync } from "node:zlib";
import { build, type BuildOptions } from "esbuild";
import type { Entry } from "./catalog";
import { ROOT } from "./catalog";
import { DEMO_PAGE_CSS, HOMEPAGE, LICENSE_LABEL, LICENSE_URL } from "./config";

/** Relative imports are single-line by rule (test/invariants.test.ts), which is what makes removing them safe. */
const RELATIVE_IMPORT = /^import\s[^;\n]*?from\s+["'](\.{1,2}\/[^"']+)["'];?[ \t]*$/gm;
const REACT_IMPORT = /^import\s+(type\s+)?\{([^}]*)\}\s+from\s+["']react["'];?[ \t]*$/gm;
const USE_CLIENT = /^["']use client["'];?[ \t]*$/gm;
const LIB_EXPORT = /^export\s+(?=(?:async\s+)?function\b|const\b|let\b|interface\b|type\b|class\b)/gm;

export function headerLines(entry: Entry): string[] {
  return [
    `Pica · ${entry.meta.title} · ${entry.meta.slug}`,
    `${LICENSE_LABEL} · ${LICENSE_URL}`,
    `Docs and credits: ${HOMEPAGE}`,
  ];
}

async function resolveModule(fromDir: string, spec: string): Promise<string> {
  for (const ext of ["", ".ts", ".tsx"]) {
    const candidate = resolve(fromDir, spec + ext);
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {
      // Try the next extension.
    }
  }
  throw new Error(`Cannot resolve ${spec} from ${relative(ROOT, fromDir)}`);
}

/** Every file reachable from `entryFile` through relative imports, dependencies first. */
async function ordered(entryFile: string): Promise<string[]> {
  const seen = new Set<string>();
  const out: string[] = [];
  async function visit(file: string): Promise<void> {
    if (seen.has(file)) return;
    seen.add(file);
    const source = await readFile(file, "utf8");
    for (const m of source.matchAll(RELATIVE_IMPORT)) {
      if (m[1]) await visit(await resolveModule(dirname(file), m[1]));
    }
    out.push(file);
  }
  await visit(entryFile);
  return out;
}

/** One .tsx file that imports only react: lib modules, then the core, then the wrapper. */
export async function reactSingleFile(entry: Entry): Promise<string> {
  const reactNames = new Map<string, boolean>(); // name, and whether it is only ever imported as a type
  const bodies: string[] = [];
  for (const file of await ordered(entry.wrapper)) {
    let source = await readFile(file, "utf8");
    for (const m of source.matchAll(REACT_IMPORT)) {
      for (const raw of (m[2] ?? "").split(",")) {
        const spec = raw.trim();
        if (!spec) continue;
        const isType = Boolean(m[1]) || spec.startsWith("type ");
        const name = spec.replace(/^type\s+/, "");
        const prior = reactNames.get(name);
        reactNames.set(name, prior === undefined ? isType : prior && isType);
      }
    }
    source = source.replace(REACT_IMPORT, "").replace(RELATIVE_IMPORT, "").replace(USE_CLIENT, "");
    const rel = relative(ROOT, file);
    if (rel.split(sep)[0] === "lib") source = source.replace(LIB_EXPORT, "");
    bodies.push(`// ${rel.split(sep).join("/")}\n${source.trim()}\n`);
  }
  const names = [...reactNames.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, typeOnly]) => (typeOnly ? `type ${name}` : name));
  const reactImport = names.length > 0 ? `import { ${names.join(", ")} } from "react";\n\n` : "";
  const header = headerLines(entry).map((line) => `// ${line}`).join("\n");
  // The header follows the imports because the shadcn CLI drops comments that come before "use client"
  // when it installs a file. See docs/decisions/0001-license-mit-commons-clause.md.
  return `"use client";\n\n${reactImport}${header}\n\n${bodies.join("\n")}`;
}

export interface VanillaBundle {
  /** Readable IIFE that defines `globalName` with `mount` and `defaults`. */
  js: string;
  globalName: string;
  /** Minified and gzipped size, the number the budget applies to. */
  gzipBytes: number;
}

export async function vanillaBundle(entry: Entry): Promise<VanillaBundle> {
  const globalName = `Pica${entry.exportName}`;
  const common: BuildOptions = {
    entryPoints: [entry.core],
    bundle: true,
    write: false,
    format: "iife",
    globalName,
    target: "es2020",
    platform: "browser",
    legalComments: "none",
    charset: "utf8",
    absWorkingDir: ROOT,
    logLevel: "silent",
  };
  const readable = await build(common);
  const minified = await build({ ...common, minify: true });
  const js = readable.outputFiles?.[0]?.text ?? "";
  const gzipBytes = gzipSync(minified.outputFiles?.[0]?.contents ?? new Uint8Array()).length;
  return { js, globalName, gzipBytes };
}

/** The mount call both vanilla shapes end with. Initial props come from window.PICA_PROPS. The catalog
 *  site sends later prop changes, and the ground to show, by postMessage from the parent frame. */
function mountScript(globalName: string): string {
  return `(function () {
  var instance = ${globalName}.mount(document.getElementById("pica"), window.PICA_PROPS || {});
  window.addEventListener("message", function (event) {
    if (event.source !== window.parent || !event.data) return;
    if (event.data.type === "pica:props") instance.update(event.data.props);
    if (event.data.type === "pica:ground") {
      document.documentElement.setAttribute("data-ground", event.data.ground);
      instance.update({});
    }
  });
})();`;
}

export function vanillaParts(bundle: VanillaBundle): { html: string; css: string; js: string } {
  return {
    html: `<div id="pica"></div>`,
    css: DEMO_PAGE_CSS,
    js: `${bundle.js}\n${mountScript(bundle.globalName)}`,
  };
}

export function vanillaHtml(entry: Entry, bundle: VanillaBundle): string {
  const parts = vanillaParts(bundle);
  return `<!doctype html>
<!--
  ${headerLines(entry).join("\n  ")}
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>${entry.meta.title} · Pica</title>
<style>${parts.css}</style>
</head>
<body>
${parts.html}
<script>
${parts.js}
</script>
</body>
</html>
`;
}
