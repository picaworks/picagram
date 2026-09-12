/** The paper trail from a reference to a component: a shortlist of metadata, then a wave brief. Neither may
 *  carry the design itself, only a pointer to it. See docs/decisions/0009-metadata-shortlists.md. */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CATEGORIES } from "../lib/meta";
import { ROOT } from "../scripts/catalog";
import { CODE_HOSTS, files, rel } from "./helpers";

const SOURCES = join(ROOT, "sources");

/** The columns decision 0009 fixes, in its order. A shortlist that grows a column is a shortlist that has
 *  started describing the picture. */
const HEADER = "| Hero | # | Title | Author | URL | Direction | Pick |";
const SHOT = /^https:\/\/dribbble\.com\/shots\/\d+/;
const URLS = /https?:\/\/[^\s|)>\]]+/g;
const MEDIA = /\.(?:png|jpe?g|gif|webp|avif|mp4|mov|webm)\b/i;
const TAG = /<\/?[a-zA-Z][^>]*>/;
const FENCE = /```|~~~/;
const HERO = /^[a-z0-9]+(?:-[a-z0-9]+)*-hero$/;
/** The same shape as a component description in test/meta.test.ts: one sentence, capitalised, ending in a stop. */
const SENTENCE = /^[A-Z][^.]*\.$/;

/** The keys every brief entry carries, in every wave written so far. */
const BRIEF_KEYS = ["slug", "title", "kind", "animated", "decorative", "brief", "props", "credits"] as const;
/** Keys a brief entry may add. `category` arrived in wave 2; `spec` names the spec a builder works from. */
const BRIEF_EXTRA = ["category", "original", "events", "composes", "spec"] as const;

interface Brief {
  wave: number;
  path: string;
  components: readonly Record<string, unknown>[];
}

/** The cells of one markdown row. A pipe inside a title is escaped, so it never splits a cell. */
function cells(row: string): string[] {
  return row
    .split(/(?<!\\)\|/)
    .slice(1, -1)
    .map((cell) => cell.trim());
}

/** Every run of consecutive table rows in a markdown file, in order. */
function tables(text: string): string[][] {
  const out: string[][] = [];
  let open = false;
  for (const line of text.split("\n")) {
    if (!line.trimStart().startsWith("|")) {
      open = false;
      continue;
    }
    if (!open) out.push([]);
    out[out.length - 1]?.push(line.trim());
    open = true;
  }
  return out;
}

/** Every shortlist, with its wave, its whole text, and its table's data rows already split into cells. */
async function shortlists(): Promise<{ file: string; wave: number; text: string; rows: string[][] }[]> {
  const out: { file: string; wave: number; text: string; rows: string[][] }[] = [];
  for (const file of await files(join(SOURCES, "shortlists"), [".md"])) {
    const named = /^sources\/shortlists\/wave-(\d+)\.md$/.exec(rel(file));
    if (!named) continue;
    const text = await readFile(file, "utf8");
    out.push({ file, wave: Number(named[1] ?? 0), text, rows: (tables(text)[0] ?? []).slice(2).map(cells) });
  }
  return out;
}

/** Every wave brief, by wave number. */
async function briefs(): Promise<{ file: string; wave: number; brief: Brief }[]> {
  const out: { file: string; wave: number; brief: Brief }[] = [];
  for (const file of await files(SOURCES, [".json"])) {
    const named = /^sources\/wave-(\d+)\.json$/.exec(rel(file));
    if (!named) continue;
    out.push({ file, wave: Number(named[1] ?? 0), brief: JSON.parse(await readFile(file, "utf8")) as Brief });
  }
  return out;
}

describe("shortlists", () => {
  it("holds one table, with the columns the decision fixes", async () => {
    for (const { file, text } of await shortlists()) {
      const found = tables(text);
      expect(found.length, `${rel(file)} holds ${found.length} tables`).toBe(1);
      expect(found[0]?.[0], rel(file)).toBe(HEADER);
    }
  });

  it("names a hero on every row, and only heroes its wave builds", async () => {
    const written = await briefs();
    for (const { file, wave, rows } of await shortlists()) {
      const slugs = written.find((b) => b.wave === wave)?.brief.components.map((c) => String(c.slug));
      for (const row of rows) {
        const hero = row[0] ?? "";
        expect(hero, rel(file)).toMatch(HERO);
        if (slugs) expect(slugs, `${rel(file)} shortlists ${hero}, which wave ${wave} does not build`).toContain(hero);
      }
    }
  });

  it("links a Dribbble shot on every row, and each shot once", async () => {
    for (const { file, rows } of await shortlists()) {
      const seen = new Set<string>();
      for (const row of rows) {
        const url = row[4] ?? "";
        expect(url, rel(file)).toMatch(SHOT);
        expect(seen.has(url), `${rel(file)} lists ${url} twice`).toBe(false);
        seen.add(url);
      }
    }
  });

  // A shortlist is read by the agent that writes the next one and by nobody who is building. Anything here
  // that renders, downloads, or leads to code puts the original in front of a clean room.
  it("carries no image, markup, code fence, or link to code", async () => {
    for (const { file, text } of await shortlists()) {
      expect(text, `${rel(file)} embeds an image`).not.toContain("![");
      expect(text, `${rel(file)} holds markup`).not.toMatch(TAG);
      expect(text, `${rel(file)} holds a code fence`).not.toMatch(FENCE);
      expect(text, `${rel(file)} names a media file`).not.toMatch(MEDIA);
      for (const [url] of text.matchAll(URLS)) expect(url, `${rel(file)} links ${url}`).toMatch(SHOT);
      for (const host of CODE_HOSTS) expect(text, `${rel(file)} names ${host}`).not.toContain(host);
    }
  });

  it("gives one sentence of direction, and at most one pick per hero", async () => {
    for (const { file, rows } of await shortlists()) {
      const picked = new Set<string>();
      for (const row of rows) {
        const [hero = "", , , , , direction = "", pick = ""] = row;
        expect(direction, `${rel(file)} directs ${hero}`).toMatch(SENTENCE);
        expect(direction.length, `${rel(file)} directs ${hero}`).toBeLessThanOrEqual(160);
        expect(["", "yes", "no"], `${rel(file)} picks "${pick}" for ${hero}`).toContain(pick);
        if (pick !== "yes") continue;
        expect(picked.has(hero), `${rel(file)} picks ${hero} twice`).toBe(false);
        picked.add(hero);
      }
    }
  });
});

describe("briefs", () => {
  it("declares the wave its file name promises", async () => {
    for (const { file, wave, brief } of await briefs()) expect(brief.wave, rel(file)).toBe(wave);
  });

  it("gives every entry the keys a builder reads, and a category the catalog has", async () => {
    for (const { file, wave, brief } of await briefs()) {
      for (const entry of brief.components) {
        const name = `${rel(file)}, ${String(entry.slug)}`;
        for (const key of BRIEF_KEYS) expect(Object.keys(entry), name).toContain(key);
        for (const key of Object.keys(entry)) expect([...BRIEF_KEYS, ...BRIEF_EXTRA], `${name} sets ${key}`).toContain(key);
        // Wave 1 predates the category key, and every wave since has set it.
        if (wave > 1) expect(Object.keys(entry), name).toContain("category");
        if (entry.category !== undefined) expect(CATEGORIES, `${name} is a ${String(entry.category)}`).toContain(entry.category);
      }
    }
  });

  it("uses each slug once across every wave", async () => {
    const seen = new Map<string, string>();
    for (const { file, brief } of await briefs()) {
      for (const entry of brief.components) {
        const slug = String(entry.slug);
        expect(seen.get(slug), `${rel(file)} repeats ${slug}`).toBeUndefined();
        seen.set(slug, rel(file));
      }
    }
  });

  // Whoever writes a brief from a capture has seen the reference. A brief that also described it would carry
  // the design to a builder who must never see it, so the pointer to the spec is the whole entry.
  it("says nothing about a reference beyond naming its spec", async () => {
    for (const { file, brief } of await briefs()) {
      for (const entry of brief.components) {
        const slug = String(entry.slug);
        if (entry.spec === undefined && !`${String(entry.brief)} ${String(entry.props)}`.includes("specs/")) continue;
        const name = `${rel(file)}, ${slug}`;
        expect(entry.brief, name).toBe(`Build from specs/${slug}.md.`);
        expect(entry.props, name).toBe("See the spec's Parameters section.");
      }
    }
  });
});
