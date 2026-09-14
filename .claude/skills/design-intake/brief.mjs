/** Writes one builder brief per slug from a wave file.
 *
 *  Usage: node .claude/skills/design-intake/brief.mjs <wave-file> <worktree> <out-dir> [<slug> ...]
 *         with no slugs, writes a brief for every component in the wave file.
 *
 *  The "House faults" section below is the reason this generator exists. Every item in it is a fault that
 *  was found in review at least twice and sent back for a second build. Stating them here, in the first
 *  brief, is the cheapest thing available: a revision round costs twenty to forty minutes, and these faults
 *  are entirely predictable. Do not trim that section to make the brief shorter. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const [waveFile, worktree, outDir, ...only] = process.argv.slice(2);
if (!waveFile || !worktree || !outDir) {
  console.error("usage: brief.mjs <wave-file> <worktree> <out-dir> [<slug> ...]");
  process.exit(1);
}

const T = "`";
const F = "```";
const wave = JSON.parse(readFileSync(waveFile, "utf8"));
mkdirSync(outDir, { recursive: true });

const REFERENCE = {
  "glyph grid": "registry/ascii/ascii-image/",
  "text run": "registry/ascii/ascii-reveal/",
  canvas: "registry/dither/dither-image/",
  css: "registry/effects/scanlines/",
  control: "registry/ui/button/",
  chart: "registry/data/bar-chart/",
  shader: "registry/shaders/mesh-gradient/",
  immersive: "registry/immersive/globe/",
  section: "registry/sections/hero/",
};

/** Faults that came back from review more than once. Each is stated as a test the builder can apply to its
 *  own capture without needing taste. */
const HOUSE_FAULTS = `## House faults, which is why this section exists

Every item here was found in review at least twice and cost a rebuild. Check your own capture against each
one before you report. These are tests, not opinions: you can apply them yourself.

- **A background at full intensity is a bug.** STYLE.md says so outright, and it is the single most common
  reason work is sent back. Most of the frame should sit near the ground, with the accent spent sparingly.
  If a headline set over your component would be hard to read, you are not done.
- **No frame in the picture may contain nothing.** A bordered box, cell, or panel holding bare ground reads
  as content that failed to load. If you can point at a rectangle of empty ground inside a border, the
  layout is not finished. Fix it by sizing the frame to its content, not by stretching the content.
- **No half of the frame may be empty by accident.** Deliberate empty space is a composition; an unfilled
  right half is an unfinished one. If the work sits in one half, either fill the other or make the emptiness
  obviously intentional.
- **Nothing may be cropped by the frame edge unless you meant it.** An element clipped by the top or side
  reads as an accident.
- **Treat 95% of your byte budget as a failure.** Gzip output differs between machines, so a component at
  7.9 KB of an 8192 byte limit passes here and fails on the build machine. Leave real headroom, and if you
  cannot, say so in your report rather than shipping at the ceiling.
- **An animated component must visibly move.** The gate only asks that something changed within three
  seconds. A component that changes a few dozen pixels is technically animated and reads as still.
- **Declaring any ${T}interactions${T} or a ${T}controlled${T} prop requires the ${T}interactive${T} facet**,
  in the order ${T}FACETS${T} in ${T}lib/meta.ts${T} lists. The same goes for every other facet your code
  implies: ${T}canvas${T} if you import ${T}lib/canvas${T}, ${T}dither${T} if you import ${T}lib/dither${T},
  ${T}webgl${T} if you open a context. ${T}test/meta.test.ts${T} decides these mechanically.
- **Decoration never covers content.** A section may draw around the page's own content; it may not paint a
  screen, field, or overlay on top of the type. Draw your layers behind it.`;

for (const c of wave.components) {
  if (only.length > 0 && !only.includes(c.slug)) continue;
  const dir = `registry/${c.category}/${c.slug}/`;
  const ref = REFERENCE[String(c.kind).toLowerCase()] ?? REFERENCE.canvas;
  const isSection = c.category === "sections";

  const sectionRules = isSection
    ? `

## What a section must do, which differs from every other kind

- ${T}meta.wraps${T} is ${T}"content"${T}: it renders children, never hides them, and never draws over them.
- Calls to action are real ${T}a[href]${T} or ${T}button${T} elements. The gate fails any other focusable node.
- Prose inherits the page's font. Mono is for labels, figures and code only. Never set a display font.
- ${T}meta.stage${T} is ${T}"flow"${T}, with its minimum in a ${T}:where()${T} rule, not an inline style.
- It composes at most three other cores, each from an earlier wave, as
  ${T}import * as <slugInCamelCase> from "../../<category>/<slug>/core";${T}. Composing none is fine.
- At 390 it must not overflow sideways and must not clip.
- ${T}meta.demo${T} must give child markup, because a section with no content in it cannot be judged.`
    : "";

  const brief = `# Build one Picagram component: ${c.slug}

You are a builder. The repository is at ${worktree}. That is a git worktree; treat it as the whole repo.
Write only inside ${T}${dir}${T}, which you create. Other builders are working in this same tree on their
own components at the same time, so touch nothing outside your own directory.

## Read first, in this order
1. ${T}AGENTS.md${T}, the rules that must never be broken.
2. ${T}STYLE.md${T}, in full. It is what your work is judged against and it is stricter than you expect:
   one pixel lines, square corners, no shadows, and never glow, bloom, blur, drop shadow or neon.
3. ${T}docs/architecture/contract.md${T}, what a component is made of.
4. ${T}docs/adding-a-component.md${T}, the kinds of component.
5. ${T}sources/BUILDER.md${T}, your full working brief. Where it names a repo path, use ${worktree}.
6. The reference for your kind (${c.kind}): ${T}${ref}${T}, all three files. Match its shape.
7. The ${T}lib/${T} modules you use. Read them rather than guessing their APIs.

## Your component

- slug: ${T}${c.slug}${T}
- title: ${c.title}
- category: ${T}${c.category}${T}
- kind: ${c.kind}
- animated: ${c.animated}
- decorative: ${c.decorative}
- ${T}meta.wave${T}: ${wave.wave}

### Brief
${c.brief}

### Props
${c.props}

### Credits
${c.original ? `Set ${T}original: true${T} and ${T}credits: []${T}.` : `Use exactly this for ${T}meta.credits${T}:\n${F}json\n${JSON.stringify(c.credits, null, 2)}\n${F}`}
${sectionRules}

${HOUSE_FAULTS}

## Commands

Run these and nothing else:
- ${T}npx eslint ${dir}${T}
- ${T}npx tsc --noEmit --tsBuildInfoFile .pica/tsc/${c.slug}.tsbuildinfo 2>&1 | grep "${dir.replace(/\/$/, "")}"${T} must print nothing
- ${T}npm run verify -- ${c.slug}${T} until every check passes. Use the full run, not ${T}--quick${T}: the
  long task check only runs on a full verify, and a task over 50 ms will fail the build later if you skip it.
  The machine is shared, so if only a timing check fails, run it once more before changing code.
- Then read ${T}.pica/captures/${c.slug}/vanilla-1280.png${T} and
  ${T}.pica/captures/${c.slug}/vanilla-1280-light.png${T} with your file reader and check them against every
  item under House faults above. Fix and re-verify if any fails. Look at least once before you report.

Do NOT run ${T}npm test${T}, ${T}npm run build:registry${T}, ${T}npm install${T}, or any git command. Do not
open a browser: the browser pane is shared with the other builders.

## Report
The slug, the final verify table pasted as printed, the size in KB against the category budget, one sentence
on the dark ground and one on the light, and anything you compromised on or could not do.
`;

  writeFileSync(join(outDir, `${c.slug}.md`), brief);
  console.log(`brief: ${c.slug} (${brief.length} chars)`);
}
