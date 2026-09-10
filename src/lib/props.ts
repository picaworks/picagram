/** Turning inspector state into what people copy: the diff from defaults, a JSX line, a baked HTML file. */
import { REGISTRY_BASE } from "../../scripts/config";
import type { Props, PropValue } from "./catalog";

export function sameValue(a: PropValue | undefined, b: PropValue | undefined): boolean {
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => v === b[i]);
  return a === b;
}

/** The props that differ from the defaults: what gets posted to the live frame, baked into snippets, and kept per slug. */
export function diffProps(defaults: Props, current: Props): Props {
  const out: Props = {};
  for (const [name, value] of Object.entries(current)) {
    if (!sameValue(defaults[name], value)) out[name] = value;
  }
  return out;
}

function jsxAttribute(name: string, value: PropValue): string {
  if (value === true) return name;
  if (typeof value === "string") {
    return /["\\\n]/.test(value) ? `${name}={${JSON.stringify(value)}}` : `${name}="${value}"`;
  }
  return `${name}={${JSON.stringify(value)}}`;
}

/** A usage line with the non-default props baked in, for example `<AsciiImage columns={120} shape />`. */
export function reactSnippet(exportName: string, overrides: Props): string {
  const attrs = Object.entries(overrides).map(([name, value]) => jsxAttribute(name, value));
  const oneLine = `<${exportName}${attrs.map((a) => ` ${a}`).join("")} />`;
  if (oneLine.length <= 72) return oneLine;
  return [`<${exportName}`, ...attrs.map((a) => `  ${a}`), "/>"].join("\n");
}

/** The vanilla file with `window.PICA_PROPS` set before its first script, which is where the file reads it at mount. */
export function withPicaProps(html: string, overrides: Props): string {
  if (Object.keys(overrides).length === 0) return html;
  const json = JSON.stringify(overrides).replace(/</g, "\\u003c");
  const tag = `<script>window.PICA_PROPS = ${json};</script>\n`;
  const at = html.indexOf("<script");
  return at < 0 ? html + tag : html.slice(0, at) + tag + html.slice(at);
}

export function installCommand(slug: string): string {
  return `npx shadcn@latest add ${REGISTRY_BASE}/${slug}.json`;
}

/** "1, 2, 3" to [1, 2, 3]. Anything that is not a number is dropped. */
export function parseNumbers(text: string): number[] {
  return text
    .split(/[,\s]+/)
    .filter((part) => part.length > 0)
    .map(Number)
    .filter((n) => Number.isFinite(n));
}

export function formatNumbers(list: readonly number[]): string {
  return list.join(", ");
}

/** `lineHeight` reads as "line height" in a label. */
export function humanize(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
}

export function formatBytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}
