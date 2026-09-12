/** Static invariants over the source tree. See docs/testing/invariants.md.
 *  Each rule here is also a lint fence in eslint.config.js; these greps keep it true with lint disabled. */
import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { discover, loadAll, ROOT } from "../scripts/catalog";
import { files, rel } from "./helpers";

const run = promisify(execFile);

const LIB = join(ROOT, "lib");
const REGISTRY = join(ROOT, "registry");
const SPECS = join(ROOT, "specs");
const MEDIA = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".mp4", ".mov", ".webm"];

async function sources(): Promise<string[]> {
  return [...(await files(LIB, [".ts"])), ...(await files(REGISTRY, [".ts", ".tsx"]))];
}

/** The module specifier of every import statement in a file. */
function specifiers(text: string): string[] {
  return [...text.matchAll(/^import\s[^;]*?from\s+["']([^"']+)["']/gm)].map((m) => m[1] ?? "");
}

describe("network", () => {
  it("no lib or component file touches the network", async () => {
    for (const f of await sources()) {
      const text = await readFile(f, "utf8");
      expect(text, rel(f)).not.toMatch(/\bfetch\s*\(|\bnew\s+(XMLHttpRequest|WebSocket|EventSource)\b/);
    }
  });
});

describe("motion", () => {
  it("only lib/loop.ts schedules frames", async () => {
    for (const f of await sources()) {
      if (rel(f) === "lib/loop.ts") continue;
      expect(await readFile(f, "utf8"), rel(f)).not.toMatch(/\brequestAnimationFrame\s*\(|\bsetInterval\s*\(/);
    }
  });

  it("randomness is seeded", async () => {
    for (const f of await sources()) {
      expect(await readFile(f, "utf8"), rel(f)).not.toMatch(/\bMath\.random\s*\(/);
    }
  });
});

/** Code with comments removed, so a color or a call named in prose never counts. URLs keep their "//". */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** A color literal in any CSS syntax. The same pattern as NO_COLOR in eslint.config.js. */
const COLOR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(\s*[\d.]/;

/** The alias a section must import a child core under: ascii-image becomes asciiImage. */
const camel = (slug: string): string => slug.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());

describe("dependencies", () => {
  it("lib imports only lib, and cores import only lib, apart from sections composing other cores", async () => {
    for (const f of await sources()) {
      const name = rel(f);
      if (name === "lib/use-pica.ts" || name.endsWith("/index.tsx")) continue;
      const allowed = name.startsWith("lib/")
        ? /^\.\//
        : name.startsWith("registry/sections/")
          ? /^(\.\.\/\.\.\/\.\.\/lib\/|\.\.\/\.\.\/(?!sections\/)[a-z-]+\/[a-z0-9-]+\/core$)/
          : /^\.\.\/\.\.\/\.\.\/lib\//;
      for (const spec of specifiers(await readFile(f, "utf8"))) {
        expect(spec, `${name} imports ${spec}`).toMatch(allowed);
      }
    }
  });

  it("a section imports another core whole, under its slug in camelCase", async () => {
    for (const f of await files(join(REGISTRY, "sections"), ["core.ts"])) {
      for (const line of (await readFile(f, "utf8")).split("\n")) {
        const target = /from\s+"\.\.\/\.\.\/[a-z-]+\/([a-z0-9-]+)\/core";/.exec(line)?.[1];
        if (target) expect(line, rel(f)).toMatch(new RegExp(`^import \\* as ${camel(target)} from `));
      }
    }
  });

  it("wrappers import react, ./core, and lib/use-pica only", async () => {
    for (const f of await files(REGISTRY, ["index.tsx"])) {
      for (const spec of specifiers(await readFile(f, "utf8"))) {
        expect(spec, `${rel(f)} imports ${spec}`).toMatch(/^(react|\.\/core|(\.\.\/)+lib\/use-pica)$/);
      }
    }
  });

  it("every import statement fits on one line, which the single-file build relies on", async () => {
    for (const f of await sources()) {
      expect(await readFile(f, "utf8"), rel(f)).not.toMatch(/^import[^;\n]*\n[^;]*\sfrom\s/m);
    }
  });
});

describe("single owners", () => {
  const owners: readonly (readonly [string, RegExp, string])[] = [
    ["dispatches an event", /\.dispatchEvent\s*\(/, "lib/events.ts"],
    ["opens a WebGL2 context", /getContext\(\s*["']webgl2["']/, "lib/gl.ts"],
    ["reads a palette custom property", /getPropertyValue\(\s*["'`]--pica-/, "lib/palette.ts"],
  ];

  it.each(owners)("only its owner %s", async (_what, pattern, owner) => {
    for (const f of await sources()) {
      if (rel(f) === owner) continue;
      expect(code(await readFile(f, "utf8")), rel(f)).not.toMatch(pattern);
    }
  });
});

describe("colors", () => {
  it("no component hard-codes a color; colors come from lib/palette.ts", async () => {
    for (const f of await files(REGISTRY, [".ts", ".tsx"])) {
      expect(code(await readFile(f, "utf8")), rel(f)).not.toMatch(COLOR);
    }
  });
});

describe("component shape", () => {
  it("every component directory has core.ts, index.tsx, and meta.ts", async () => {
    for (const dir of await discover()) {
      for (const file of ["core.ts", "index.tsx", "meta.ts"]) {
        await expect(access(join(dir, file)), `${rel(dir)}/${file}`).resolves.toBeUndefined();
      }
    }
  });

  it("cores export mount and defaults, and wrappers export one component", async () => {
    for (const dir of await discover()) {
      const core = await readFile(join(dir, "core.ts"), "utf8");
      const wrapper = await readFile(join(dir, "index.tsx"), "utf8");
      expect(core, `${rel(dir)}/core.ts`).toMatch(/^export const mount: Mount</m);
      expect(core, `${rel(dir)}/core.ts`).toMatch(/^export const defaults: \w+Props = \{/m);
      expect(wrapper.match(/^export function /gm)?.length, `${rel(dir)}/index.tsx`).toBe(1);
      expect(wrapper, `${rel(dir)}/index.tsx`).toMatch(/^"use client";/);
    }
  });
});

/** The spec template from docs/adding-a-component.md. A build agent reads the spec and nothing else, so a
 *  missing heading is a hole it would fill from imagination rather than from the reference. */
const SPEC_HEADINGS = [
  "Status",
  "Look",
  "Layout at 1280",
  "Layout at 390",
  "Motion",
  "Parts",
  "Content and actions",
  "Parameters",
  "How Picagram's version differs",
  "Credit",
];

/** The brand files the site serves, and the photographs the image components are verified against. */
const TRACKED_MEDIA = /^public\/(?:og|favicon-32|apple-touch-icon)\.png$|^scripts\/verify\/photos\//;

/** Each heading in a markdown file with the lines under it, in order. The lines before the first heading come
 *  back under an empty heading, so a link cannot hide above the template. */
function sections(text: string): { heading: string; body: string }[] {
  let current = { heading: "", body: "" };
  const out = [current];
  for (const line of text.split("\n")) {
    const heading = /^#{1,6}\s+(.*?)\s*$/.exec(line);
    if (!heading) current.body += `${line}\n`;
    else out.push((current = { heading: heading[1] ?? "", body: "" }));
  }
  return out;
}

describe("clean room", () => {
  it("captured reference media is gitignored", async () => {
    expect(await readFile(join(ROOT, ".gitignore"), "utf8")).toMatch(/^sources\/inbox\/$/m);
  });

  it("no image or video file lives in registry/ or specs/", async () => {
    const media = [...(await files(REGISTRY, MEDIA)), ...(await files(SPECS, MEDIA))];
    expect(media.map(rel)).toEqual([]);
  });

  it("specs describe and never contain code", async () => {
    for (const f of await files(SPECS, [".md"])) {
      expect(await readFile(f, "utf8"), rel(f)).not.toMatch(/```|~~~/);
    }
  });

  // Both directions, so neither half can be dropped: a look re-implemented from a capture has a spec that
  // says what was re-implemented, and a spec is only ever written for a reference somebody is credited for.
  it("an inspired-by credit and a spec each require the other, and the spec is approved and matches", async () => {
    for (const { meta } of await loadAll()) {
      const inspired = meta.credits.filter((c) => c.relation === "inspired-by");
      if (inspired.length > 0) expect(meta.spec, `${meta.slug} was built from a captured reference`).toBeTruthy();
      if (!meta.spec) continue;
      expect(inspired.length, `${meta.slug} has a spec but credits no reference`).toBeGreaterThan(0);
      expect(meta.spec, `${meta.slug} names its spec after itself`).toBe(`${meta.slug}.md`);
      await expect(access(join(SPECS, meta.spec)), `specs/${meta.spec}`).resolves.toBeUndefined();
      const spec = sections(await readFile(join(SPECS, meta.spec), "utf8"));
      const status = spec.find((s) => s.heading === "Status")?.body ?? "";
      const credit = spec.find((s) => s.heading === "Credit")?.body ?? "";
      expect(status, `specs/${meta.spec} is not approved`).toMatch(/\bapproved\s+\d{4}-\d{2}-\d{2}\b/);
      for (const c of inspired) {
        for (const part of [c.title, c.author, c.url]) expect(credit, `specs/${meta.spec} credits ${part}`).toContain(part);
      }
    }
  });

  it("every spec carries the template headings in order, and nothing but prose", async () => {
    for (const f of await files(SPECS, [".md"])) {
      const text = await readFile(f, "utf8");
      const written = sections(text).map((s) => s.heading);
      expect(written.filter((h) => SPEC_HEADINGS.includes(h)), rel(f)).toEqual(SPEC_HEADINGS);
      expect(text, `${rel(f)} holds a code fence`).not.toMatch(/```|~~~/);
      expect(text, `${rel(f)} holds markup`).not.toMatch(/<\/?[a-zA-Z][^>]*>/);
      expect(text, `${rel(f)} embeds an image`).not.toContain("![");
      expect(text, `${rel(f)} names a color`).not.toMatch(COLOR);
      // The builder reads the spec and never the original, so the credit line holds the spec's only link.
      for (const { heading, body } of sections(text)) {
        if (heading === "Credit") continue;
        expect(body, `${rel(f)} links out under "${heading}"`).not.toMatch(/https?:\/\//);
      }
    }
  });

  // Read from git rather than the disk, so a capture sitting in the gitignored sources/inbox/ never counts,
  // and a committed one always does. A tracked picture of a reference is a reference a builder can open.
  it("no tracked file is an image or a video, apart from the brand files and the fixtures", async () => {
    const { stdout } = await run("git", ["ls-files", "-z"], { cwd: ROOT });
    for (const file of stdout.split("\0").filter(Boolean)) {
      if (!MEDIA.some((ext) => file.endsWith(ext))) continue;
      expect(TRACKED_MEDIA.test(file), `${file} is a tracked image or video`).toBe(true);
    }
  });
});
