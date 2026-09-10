/** Turning inspector state into what people copy: the diff from defaults, a JSX line, a baked HTML file. */
import { sameJson } from "../../lib/json";
import { TOKENS } from "../../lib/palette";
import { REGISTRY_BASE } from "../../scripts/config";
import type { PaletteProp, Props, PropValue } from "./catalog";

/** The props that differ from `defaults`, compared as JSON so arrays and objects diff correctly, not by
 *  reference. What gets posted to the live frame, baked into snippets, and kept per slug. */
export function diffProps(defaults: Props, current: Props): Props {
  const out: Props = {};
  for (const [name, value] of Object.entries(current)) {
    if (!sameJson(defaults[name], value)) out[name] = value;
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

/** The palette tokens a user set, as CSS colors. Null when none are set. */
function paletteBody(palette: PaletteProp): PaletteProp | null {
  const body: PaletteProp = {};
  let any = false;
  for (const token of TOKENS) {
    const value = palette[token];
    if (value) {
      body[token] = value;
      any = true;
    }
  }
  return any ? body : null;
}

function paletteAttribute(palette: PaletteProp): string | null {
  const body = paletteBody(palette);
  if (!body) return null;
  const inner = TOKENS.filter((token) => body[token])
    .map((token) => `${token}: ${JSON.stringify(body[token])}`)
    .join(", ");
  return `palette={{ ${inner} }}`;
}

const VOID_ELEMENTS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);

/** Demo markup as JSX: class becomes className, for becomes htmlFor, and void elements self-close. Demo
 *  markup never carries inline styles, so style is never converted. Only tag boundaries are rewritten, so
 *  the words "class" and "for" pass through untouched in text content. */
function htmlToJsx(html: string): string {
  return html.replace(/<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s+[^<>]*)?\/?>/g, (tag) => {
    if (tag.startsWith("</")) return tag;
    let out = tag.replace(/(\s)class(\s*=)/g, "$1className$2").replace(/(\s)for(\s*=)/g, "$1htmlFor$2");
    const name = /^<([a-zA-Z][a-zA-Z0-9-]*)/.exec(out)?.[1] ?? "";
    if (VOID_ELEMENTS.has(name.toLowerCase())) out = out.replace(/\s*\/?>$/, " />");
    return out;
  });
}

/** A usage line with the non-default props, and any palette tokens the user set, baked in, for example
 *  `<AsciiImage columns={120} shape />`. Demo children, when the component has them, follow as JSX. */
export function reactSnippet(exportName: string, overrides: Props, palette: PaletteProp = {}, children?: string): string {
  const attrs = Object.entries(overrides).map(([name, value]) => jsxAttribute(name, value));
  const paletteAttr = paletteAttribute(palette);
  if (paletteAttr) attrs.push(paletteAttr);
  const jsx = children ? htmlToJsx(children) : "";

  if (!jsx) {
    const oneLine = `<${exportName}${attrs.map((a) => ` ${a}`).join("")} />`;
    if (oneLine.length <= 72) return oneLine;
    return [`<${exportName}`, ...attrs.map((a) => `  ${a}`), "/>"].join("\n");
  }

  const open = attrs.length === 0 ? `<${exportName}>` : [`<${exportName}`, ...attrs.map((a) => `  ${a}`), ">"].join("\n");
  const indented = jsx
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
  return `${open}\n${indented}\n</${exportName}>`;
}

/** The vanilla file with `window.PICA_PROPS` set before its first script, which is where the file reads it
 *  at mount. Palette tokens the user set travel inside the same object, as the live frame receives them. */
export function withPicaProps(html: string, overrides: Props, palette: PaletteProp = {}): string {
  const body: Record<string, unknown> = { ...overrides };
  const paletteValues = paletteBody(palette);
  if (paletteValues) body.palette = paletteValues;
  if (Object.keys(body).length === 0) return html;
  const json = JSON.stringify(body).replace(/</g, "\\u003c");
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
