/** The site works under any base path. The page links to its own files with relative paths, and llms.txt, which
 *  agents read on its own, links with absolute URLs on the site. See docs/architecture/site.md. */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { ROOT } from "../scripts/catalog";
import { SITE_URL } from "../scripts/config";
import { THEME_KEY, THEME_SCRIPT } from "../src/lib/theme";
import { files, rel } from "./helpers";

/** A quoted path from the site's root to a file the site serves. */
const ROOT_RELATIVE = /["'`]\/(?:(?:v|r|c|react|thumbs)\/|llms(?:-full)?\.txt|catalog\.json|icon\.svg|og\.png)/;

const readSrc = (path: string) => readFile(join(ROOT, "src", path), "utf8");

/** WCAG relative luminance, from a six-digit hex. */
function luminance(hex: string): number {
  let sum = 0;
  const weights = [0.2126, 0.7152, 0.0722];
  for (let i = 0; i < 3; i += 1) {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    sum += (weights[i] ?? 0) * (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  }
  return sum;
}

/** The WCAG contrast ratio between two colors, lighter over darker. */
function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

interface Rule {
  selector: string;
  decls: Map<string, string>;
}

/** Every rule in a stylesheet, one level of nesting deep, which is as deep as globals.css goes. Comments come
 *  out first, or one sitting above a rule would be read as part of its selector. */
function rules(css: string): Rule[] {
  const out: Rule[] = [];
  for (const match of css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const decls = new Map<string, string>();
    for (const decl of (match[2] ?? "").split(";")) {
      const at = decl.indexOf(":");
      if (at > 0) decls.set(decl.slice(0, at).trim(), decl.slice(at + 1).trim());
    }
    out.push({ selector: (match[1] ?? "").trim().replace(/\s+/g, " "), decls });
  }
  return out;
}

/** The token a `var(--x)` value names, or null for anything else. */
function tokenOf(value: string | undefined): string | null {
  return value?.match(/^var\((--[a-z0-9-]+)\)$/)?.[1] ?? null;
}

/** The two token blocks: dark on :root, and light as the changes :root[data-theme="light"] makes to it. */
function palettes(css: string): { dark: Map<string, string>; light: Map<string, string> } {
  const dark = new Map<string, string>();
  const light = new Map<string, string>();
  for (const rule of rules(css)) {
    const target = rule.selector === ":root" ? dark : rule.selector === ':root[data-theme="light"]' ? light : null;
    if (!target) continue;
    for (const [name, value] of rule.decls) if (name.startsWith("--") && value.startsWith("#")) target.set(name, value);
  }
  return { dark, light: new Map([...dark, ...light]) };
}

/** Runs THEME_SCRIPT against stubs, the way a browser would, and reports the attribute it set. */
function runThemeScript(options: { saved?: string; throws?: boolean; systemLight?: boolean }): string | undefined {
  const attributes = new Map<string, string>();
  runInNewContext(THEME_SCRIPT, {
    localStorage: {
      getItem(key: string): string | null {
        if (options.throws) throw new Error("storage is blocked");
        return key === THEME_KEY ? (options.saved ?? null) : null;
      },
    },
    matchMedia: (query: string) => ({ matches: query.includes("light") && options.systemLight === true }),
    document: { documentElement: { setAttribute: (name: string, value: string) => void attributes.set(name, value) } },
  });
  return attributes.get("data-theme");
}

describe("site", () => {
  it("links to its own files with relative paths, so it works under any base path", async () => {
    for (const f of await files(join(ROOT, "src"), [".ts", ".tsx"])) {
      const lines = (await readFile(f, "utf8")).split("\n");
      lines.forEach((line, i) => expect(line, `${rel(f)}:${i + 1}`).not.toMatch(ROOT_RELATIVE));
    }
  });

  it("llms.txt links with absolute URLs on the site", async () => {
    const text = await readFile(join(ROOT, "public", "llms.txt"), "utf8");
    const targets = [...text.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1] ?? "");
    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) expect(target.startsWith(`${SITE_URL}/`), target).toBe(true);
  });
});

describe("themes", () => {
  it("every text tone clears 4.5:1 on its own ground, in both themes", async () => {
    const css = await readSrc("app/globals.css");
    const themes = palettes(css);
    const colored = rules(css).filter((rule) => tokenOf(rule.decls.get("color")) !== null);
    expect(colored.length).toBeGreaterThan(20);
    for (const [theme, tokens] of Object.entries(themes)) {
      for (const rule of colored) {
        // A rule paints its own ground when it sets one, and otherwise sits on the page's.
        const ink = tokens.get(tokenOf(rule.decls.get("color")) ?? "");
        const ground = tokens.get(tokenOf(rule.decls.get("background")) ?? "--bg") ?? tokens.get("--bg");
        expect(ink, `${theme}: ${rule.selector} names a color that is not a token`).toBeDefined();
        expect(ground, `${theme}: ${rule.selector} sits on a ground that is not a token`).toBeDefined();
        const ratio = contrast(ink ?? "", ground ?? "");
        expect(ratio, `${theme}: ${rule.selector} reads at ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("the focus ring and the slider track clear 3:1 on the page's ground, in both themes", async () => {
    const themes = palettes(await readSrc("app/globals.css"));
    for (const [theme, tokens] of Object.entries(themes)) {
      const bg = tokens.get("--bg") ?? "";
      for (const token of ["--accent", "--muted-2"]) {
        const ratio = contrast(tokens.get(token) ?? "", bg);
        expect(ratio, `${theme}: ${token} reads at ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("the theme script prefers the saved choice", () => {
    expect(runThemeScript({ saved: "light" })).toBe("light");
    expect(runThemeScript({ saved: "dark", systemLight: true })).toBe("dark");
  });

  it("the theme script falls back to the system, and to dark", () => {
    expect(runThemeScript({ systemLight: true })).toBe("light");
    expect(runThemeScript({})).toBe("dark");
    expect(runThemeScript({ saved: "sepia" })).toBe("dark");
    expect(runThemeScript({ saved: "sepia", systemLight: true })).toBe("light");
  });

  it("the theme script survives storage it cannot read", () => {
    expect(runThemeScript({ throws: true })).toBe("dark");
    expect(runThemeScript({ throws: true, systemLight: true })).toBe("light");
  });

  it("the layout runs the theme script and lets the document element keep its attribute", async () => {
    const layout = await readSrc("app/layout.tsx");
    expect(layout).toContain("suppressHydrationWarning");
    expect(layout).toContain("THEME_SCRIPT");
    expect(layout).toContain("dangerouslySetInnerHTML");
    // React must not own data-theme, or it would clear what the script set.
    expect(layout).not.toMatch(/data-theme=/);
  });
});
