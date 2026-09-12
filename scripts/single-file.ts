/** The two single-file shapes of a component, generated from its core, its wrapper, and the lib modules
 *  they use. Nothing here is written by hand twice. See docs/decisions/0002-one-core-two-shapes.md. */
import { readFile, stat } from "node:fs/promises";
import { basename, dirname, relative, resolve, sep } from "node:path";
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

/** A top-level declaration's kind and name. Types and values live in separate namespaces in TypeScript. */
const TOP_LEVEL = /^(?:export\s+)?(?:declare\s+)?(?:async\s+)?(function\*?|const|let|var|class|enum|interface|type)\s+([A-Za-z_$][\w$]*)/gm;

/** The React file puts every module in one scope, so two modules must never declare the same top-level
 *  name. Throws with both files named, which is clearer than the compiler's "duplicate" error. */
function checkCollisions(entry: Entry, modules: readonly { file: string; source: string }[]): void {
  const seen = new Map<string, string>();
  const clashes: string[] = [];
  for (const { file, source } of modules) {
    for (const m of source.matchAll(TOP_LEVEL)) {
      const kind = m[1] === "interface" || m[1] === "type" ? "type" : "value";
      const key = `${kind} ${m[2] ?? ""}`;
      const other = seen.get(key);
      if (other && other !== file) clashes.push(`${m[2] ?? ""} in ${other} and ${file}`);
      else seen.set(key, file);
    }
  }
  if (clashes.length > 0) {
    throw new Error(
      `${entry.meta.slug}: the single React file would declare the same name twice: ${clashes.join("; ")}. ` +
        "Use the lib/ export instead of a local copy, or rename the local one.",
    );
  }
}

/** The alias a section imports a child core under: ascii-image becomes asciiImage. */
function aliasOf(slug: string): string {
  return slug.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/** One .tsx file that imports only react: lib modules, then any child cores a section composes, then the
 *  core, then the wrapper. A child core is wrapped in a function scope that returns its mount and defaults,
 *  so its helpers can never collide with the section's; the section's namespace import names that object. */
export async function reactSingleFile(entry: Entry): Promise<string> {
  const reactNames = new Map<string, boolean>(); // name, and whether it is only ever imported as a type
  const bodies: string[] = [];
  const modules: { file: string; source: string }[] = [];
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
    const rel = relative(ROOT, file).split(sep).join("/");
    // Another component's core, which only a section may import. See docs/decisions/0007.
    const child = file !== entry.core && basename(file) === "core.ts";
    if (rel.startsWith("lib/") || child) source = source.replace(LIB_EXPORT, "");
    if (child) {
      const alias = aliasOf(basename(dirname(file)));
      bodies.push(`// ${rel}\nconst ${alias} = (() => {\n${source.trim()}\nreturn { mount, defaults };\n})();\n`);
      modules.push({ file: rel, source: `const ${alias} = 0;` });
    } else {
      bodies.push(`// ${rel}\n${source.trim()}\n`);
      modules.push({ file: rel, source });
    }
  }
  checkCollisions(entry, modules);
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

/** The mount call both vanilla shapes end with. Initial props come from window.PICA_PROPS. A palette among
 *  them becomes --pica-* custom properties on the host, as the React wrapper's palette prop does. The
 *  catalog site sends later prop changes, and the ground to show, by postMessage from the parent frame, and
 *  hears the component's events back as pica:event messages. */
function mountScript(globalName: string, events: readonly string[]): string {
  const forward = events.length === 0
    ? ""
    : `
  ${JSON.stringify(events)}.forEach(function (name) {
    host.addEventListener("pica:" + name.toLowerCase(), function (event) {
      if (window.parent !== window) window.parent.postMessage({ type: "pica:event", name: name, detail: event.detail }, "*");
    });
  });`;
  return `(function () {
  var host = document.getElementById("pica");
  function take(props) {
    var data = {};
    for (var key in props) {
      if (key !== "palette") data[key] = props[key];
    }
    var palette = props.palette || {};
    for (var token in palette) {
      if (palette[token]) host.style.setProperty("--pica-" + token, palette[token]);
      else host.style.removeProperty("--pica-" + token);
    }
    return data;
  }
  var instance = ${globalName}.mount(host, take(window.PICA_PROPS || {}));${forward}
  window.addEventListener("message", function (event) {
    if (event.source !== window.parent || !event.data) return;
    if (event.data.type === "pica:props") instance.update(take(event.data.props));
    if (event.data.type === "pica:ground") {
      document.documentElement.setAttribute("data-ground", event.data.ground);
      instance.update({});
    }
  });
})();`;
}

/** The demo page's markup, styles, and script. A text run (meta.stage "inline") mounts on a span inside a
 *  centered stage, as its React wrapper does. Demo children from meta.demo are written into the host. */
export function vanillaParts(entry: Entry, bundle: VanillaBundle): { html: string; css: string; js: string } {
  const children = entry.meta.demo?.children ?? "";
  const inline = entry.meta.stage === "inline";
  const tag = entry.meta.host ?? (inline ? "span" : "div");
  const host = `<${tag} id="pica"${tag === "button" ? ' type="button"' : ""}>${children}</${tag}>`;
  return {
    html: inline ? `<div class="pica-stage">${host}</div>` : host,
    css: DEMO_PAGE_CSS,
    js: `${bundle.js}\n${mountScript(bundle.globalName, Object.keys(entry.events))}`,
  };
}

export function vanillaHtml(entry: Entry, bundle: VanillaBundle): string {
  const parts = vanillaParts(entry, bundle);
  const stage = entry.meta.stage === "flow" ? ' data-stage="flow"' : "";
  return `<!doctype html>
<!--
  ${headerLines(entry).join("\n  ")}
-->
<html lang="en"${stage}>
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
