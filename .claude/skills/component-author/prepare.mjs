import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";

const [wavePath, slug, outputPath, name, release, referencePath] = process.argv.slice(2);
if (!wavePath || !slug || !outputPath || !name || !release || !referencePath) {
  throw new Error("Usage: prepare.mjs <wave-file> <slug> <output-dir> <export-name> <release> <reference-directory>");
}
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !/^[A-Z][A-Za-z0-9]*$/.test(name)) {
  throw new Error("Invalid slug or export name");
}
const repo = process.cwd();
const wave = JSON.parse(readFileSync(resolve(wavePath), "utf8"));
const item = wave.components.find((entry) => entry.slug === slug);
if (!item) throw new Error(`No assignment for ${slug}`);
const directory = `registry/${item.category}/${slug}`;
const reference = resolve(referencePath);
if (!reference.startsWith(join(repo, "registry") + "/")) throw new Error("Reference must be an existing local registry component");
const contract = readFileSync(join(repo, "docs/architecture/contract.md"), "utf8");
const keep = new Set(["Files", "core.ts", "Events and controlled state", "Palette", "The shared runtime", "index.tsx", "meta.ts", "Motion"]);
const excerpt = contract.split(/(?=^## )/m).filter((section) => keep.has(section.split("\n")[0].replace(/^## /, ""))).join("\n");
const style = readFileSync(join(repo, "STYLE.md"), "utf8");
const styleExcerpt = style.slice(style.indexOf("## Principles"), style.indexOf("## The signature move"));
const meta = { slug, title: item.title, category: item.category, description: item.brief.split(". ")[0] + ".", tags: [], facets: [item.animated ? "animated" : "static"], wave: wave.wave, release, animated: item.animated, decorative: item.decorative, controls: {}, original: true, credits: [] };
const starters = {
  "core.ts": `import type { Mount } from "../../../lib/types";\n\n// Replace this starter with the assigned JSON props and behavior.\nexport interface ${name}Props { label: string }\nexport const defaults: ${name}Props = { label: ${JSON.stringify(item.title)} };\nexport const mount: Mount<${name}Props> = (host, initial = {}) => {\n  let props = { ...defaults, ...initial };\n  const node = document.createElement("div");\n  node.setAttribute("data-pica", "");\n  node.textContent = props.label;\n  host.append(node);\n  return {\n    update(next) { props = { ...props, ...next }; node.textContent = props.label; },\n    destroy() { node.remove(); }\n  };\n};\n`,
  "index.tsx": `"use client";\nimport { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";\nimport { mount, type ${name}Props } from "./core";\n\nexport type ${name}ComponentProps = Partial<${name}Props> & WrapperProps;\nexport function ${name}({ className, style, palette, ...props }: ${name}ComponentProps) {\n  const ref = usePica(mount, props);\n  return <div ref={ref} className={className} style={{ ...paletteStyle(palette), ...style }} />;\n}\n`,
  "meta.ts": `import type { Meta } from "../../../lib/meta";\nexport const meta: Meta = ${JSON.stringify(meta, null, 2)};\n`,
};
const output = resolve(outputPath);
if (output === join(repo, "registry") || output.startsWith(join(repo, "registry") + "/")) throw new Error("Write preparation outside registry");
mkdirSync(join(output, "starter"), { recursive: true });
for (const [file, text] of Object.entries(starters)) writeFileSync(join(output, "starter", file), text);
const example = ["core.ts", "index.tsx", "meta.ts"].map((file) => `REFERENCE ${file}\n${readFileSync(join(reference, file), "utf8")}`).join("\n");
const prompt = `Implement this one original component. Write ONLY ${directory}/core.ts, index.tsx and meta.ts. Export ${name}. The starter files are incomplete scaffolds, never acceptance evidence.\nASSIGNMENT\n${JSON.stringify(item)}\nRelease ${release}; wave ${wave.wave}.\nStart with implementation from the packet. Read only an exact missing runtime API. No repository exploration, shell checks, verifier reading, model delegation, Git, installs, account changes or publication. Finish after the three files; native integration owns mechanical and visual checks. Report a denied action or usage notice and stop.\nCURRENT CONTRACT\n${excerpt}\nSTYLE\n${styleExcerpt}\nONE STRUCTURAL REFERENCE\n${example}`;
writeFileSync(join(output, "prompt.md"), prompt);
writeFileSync(join(output, "assignment.json"), JSON.stringify({ slug, directory, exportName: name, release, wave: wave.wave, sourceFiles: Object.keys(starters).map((file) => `${directory}/${file}`), promptBytes: Buffer.byteLength(prompt) }, null, 2) + "\n");
console.log(`Prepared ${slug}: 3 starter files, ${Buffer.byteLength(prompt)} prompt bytes; no model launched.`);
