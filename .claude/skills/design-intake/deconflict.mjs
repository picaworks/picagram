/** Refuses a slug that is already taken. Reads every name the repository has reserved: directories under
 *  registry/, slugs briefed in sources/wave-*.json whether or not they are built yet, and heroes named in
 *  sources/shortlists/*.md. A collision found here costs a rename; one found after eight builders have run
 *  costs a batch.
 *
 *  Usage: node .claude/skills/design-intake/deconflict.mjs <slug> [<slug> ...]
 *         node .claude/skills/design-intake/deconflict.mjs --list   (print every reserved name)
 *  Exits 1 on any collision or internal duplicate. */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function reserved() {
  const taken = new Map();
  const registry = join(ROOT, "registry");
  if (existsSync(registry)) {
    for (const category of readdirSync(registry, { withFileTypes: true }).filter((e) => e.isDirectory())) {
      for (const slug of readdirSync(join(registry, category.name), { withFileTypes: true }).filter((e) => e.isDirectory())) {
        taken.set(slug.name, `built in registry/${category.name}/`);
      }
    }
  }
  const sources = join(ROOT, "sources");
  if (existsSync(sources)) {
    for (const file of readdirSync(sources).filter((f) => /^wave-\d+\.json$/.test(f))) {
      const brief = JSON.parse(readFileSync(join(sources, file), "utf8"));
      for (const c of brief.components ?? []) if (!taken.has(c.slug)) taken.set(c.slug, `briefed in sources/${file}`);
    }
    const lists = join(sources, "shortlists");
    if (existsSync(lists)) {
      for (const file of readdirSync(lists).filter((f) => f.endsWith(".md"))) {
        const text = readFileSync(join(lists, file), "utf8");
        // Only the Hero column, which is the first cell of a row. Matching the whole file would catch
        // fragments of shot URLs, such as "Landing-page-hero", and reserve names nobody asked for.
        for (const line of text.split("\n")) {
          const cell = /^\|\s*([a-z0-9]+(?:-[a-z0-9]+)*)\s*\|/.exec(line);
          if (cell?.[1] && !taken.has(cell[1])) taken.set(cell[1], `shortlisted in sources/shortlists/${file}`);
        }
      }
    }
  }
  return taken;
}

const taken = reserved();
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "--list") {
  for (const [slug, where] of [...taken].sort()) console.log(`${slug.padEnd(28)} ${where}`);
  console.log(`\n${taken.size} names reserved.`);
  process.exit(0);
}

let bad = 0;
const seen = new Set();
for (const slug of args) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    console.log(`BAD NAME   ${slug} — slugs are lowercase and hyphenated`);
    bad++;
  } else if (seen.has(slug)) {
    console.log(`DUPLICATE  ${slug} — listed twice in this request`);
    bad++;
  } else if (taken.has(slug)) {
    console.log(`COLLISION  ${slug} — already ${taken.get(slug)}`);
    bad++;
  } else {
    console.log(`free       ${slug}`);
  }
  seen.add(slug);
}
console.log(`\n${args.length - bad} of ${args.length} free, against ${taken.size} reserved names.`);
process.exit(bad > 0 ? 1 : 0);
