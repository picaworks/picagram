---
name: design-intake
description: Take a design source or a list of component ideas all the way to a merged pull request — harvest, deconflict, brief, fan out to builder sessions, verify, review, ship
trigger: /design-intake
---

# /design-intake

Turns an intake (a source to read, a list of ideas, or a count) into merged components. The session running
this skill is the **coordinator and reviewer**. It does not write components. Builder sessions do that, one
component each, in parallel.

Argument: a source URL, a category, a list of component names, or a count. With no argument, ask what the
intake is before doing anything.

---

## The three roles

| Role | Who | Does |
|---|---|---|
| **Coordinator** | this session | Harvests, deconflicts, writes briefs, creates the worktree, launches builders, runs the shared commands, opens the PR |
| **Builder** | a Devin CLI session per component | Writes one component's three files, verifies it, reads its own captures, reports |
| **Reviewer** | this session, or a subagent | Judges each finished component against `STYLE.md` and writes revision notes |

The coordinator runs what `sources/BUILDER.md` forbids a builder to run: `npm run build:registry`,
`npm test`, `npm install`, and every git command. Builders never touch those, because every builder shares
one tree.

A `revise` note becomes the brief for a **fresh** builder, never a correction sent back to the one that
wrote it.

---

## Stage 1 — Harvest

Read the source **by text only**. Never screenshot it, never save an image from it, never open a component's
page source, repository, or registry entry.

This is not a style preference. `AGENTS.md` makes it a hard constraint, and `docs/decisions/0003` and `0009`
say why: a clean room that has seen the code is not clean, and only Rish captures a reference.

**Two things make a harvest legitimate without any capture at all:**

- **A public idiom is not anyone's work.** Swiss design, brutalism, Y2K, cyberpunk, wabi-sabi are design
  languages. Building inside one is originating, not cloning. Those components are `original: true` with
  empty credits and need no shortlist, no capture, and no spec.
- **A published method is not anyone's work either.** Delaunay triangulation, marching squares, Bayer
  dithering, the WAI-ARIA patterns. Those carry a `technique` credit naming the paper or the standard, never
  the site you found them through.

Only a **specific captured design** needs the full trail: shortlist row → Rish captures into
`sources/inbox/` → spec agent writes `specs/<slug>.md` → a separate builder sees only the spec.

If the intake needs that trail, stop at the shortlist row and say so. Do not start builders.

---

## Stage 2 — Deconflict, and this is a hard stop

```bash
node .claude/skills/design-intake/deconflict.mjs <slug> [<slug> ...]
node .claude/skills/design-intake/deconflict.mjs --list   # every reserved name
```

It checks directories under `registry/`, every slug briefed in `sources/wave-*.json` whether built or not,
and every hero named in `sources/shortlists/*.md`. It exits non-zero on a collision, an internal duplicate,
or a malformed slug.

**Do not proceed past a non-zero exit.** A collision found here costs a rename. One found after eight
builders have run costs the batch.

Naming: ASCII-first components start with `ascii-`, `braille-`, `dither-` or `halftone-`. Everything else is
named for what it is.

---

## Stage 3 — Classify and brief

Give every component a category from `CATEGORIES` in `lib/meta.ts`, a kind from the nine in
`docs/adding-a-component.md`, and facets from the twelve in `lib/meta.ts`.

Write `sources/wave-<N>.json`. `test/sources.test.ts` enforces the shape: exactly the keys `slug`, `title`,
`kind`, `animated`, `decorative`, `brief`, `props`, `credits`, optionally `category`, `original`, `events`,
`composes`, `spec`. Slugs must be unique across every wave file. A spec-backed entry must have `brief`
exactly `"Build from specs/<slug>.md."` and `props` exactly `"See the spec's Parameters section."`

A good `brief` field names the look, the published method if there is one, the reference component to copy
the pattern from, what the capture frame must show, and an explicit **"It is wrong if…"** clause. That last
one does more work than anything else in the brief.

Then generate the per-component briefs:

```bash
node .claude/skills/design-intake/brief.mjs sources/wave-<N>.json <worktree> .pica/briefs
```

That generator carries a **House faults** section listing every fault that has come back from review more
than once, written as tests a builder can apply to its own capture. Do not trim it. A revision round costs
twenty to forty minutes and those faults are entirely predictable.

---

## Stage 4 — Fan out

One worktree per batch, roughly seven or eight builders inside it.

```bash
git worktree add .pica/wt/<batch> -b <batch> <base>
cd .pica/wt/<batch> && npm ci          # a real install, ~90s
```

**Never symlink `node_modules` into a worktree.** Turbopack rejects it outright ("points out of the
filesystem root") and `next build` dies partway through the gate.

```bash
.claude/skills/design-intake/launch.sh \
  /abs/path/.pica/wt/<batch> /abs/path/.pica/briefs /abs/path/.pica/logs \
  <slug> <slug> ...
```

The launcher reports `BUILT`, `BLOCKED`, `NOTHING` or `NOBRIEF` per slug and exits non-zero if any failed.

**Read its status, not the exit code of `devin`.** A builder session can reject a tool call, write nothing,
and still exit 0. The flags in `launch.sh` are each there for a reason recorded in its header; the one that
matters most is that `--sandbox` silently overrides `--permission-mode` and produces an empty directory.

---

## Stage 5 — Verify, as the coordinator

```bash
npm run verify -- <slug> <slug> ...     # full, not --quick
npm run build:registry
npm run check                            # lint, tests, build
npm run check:site
```

`check:site` needs every component's thumbnail, and thumbnails are generated by `verify` and gitignored. In
a fresh worktree, copy them in from wherever they were last generated:

```bash
cp -n /path/to/other/worktree/public/thumbs/*.jpg public/thumbs/
```

---

## Stage 6 — Review, which is the actual bottleneck

The gate cannot see composition, tone, or whether a thing reads as what it claims to be. Everything that
came back in review passed every mechanical check first.

Use the contact sheet rather than opening captures one at a time:

```bash
npm run review -- <wave>      # http://localhost:3200
```

It shows every component in a wave as a grid with its verify result, and takes `j`/`k` to move, `1`/`2`/`3`
for keep/revise/cut, `o` for the live page, `w` for width, `l` for ground. It writes
`review/wave-<N>.json`, and `test/review.test.ts` fails if anything in the wave is left undecided or on
`revise`. So the loop must close before the PR can merge.

### Writing a revision note

A note stating a **principle** works only when the builder can already see the fault. When it cannot, the
principle gets satisfied superficially and the fault **relocates**.

- **Name the structure to build, not the quality to achieve.** "The left column must hold two cells, an
  upper one with the headline and actions and a lower one holding something real" lands. "Resolve the
  vertical distribution" does not.
- **Give a test applicable without taste.** "No frame in the picture may contain nothing" lands. "Should
  look finished" does not.
- **After one failed note, stop describing and prescribe.** Offer at most two concrete options and say
  explicitly not to invent a third.
- **Name a component that already passed review, in the same directory, as the calibration.**
- **Say what must not change**, or the builder rebuilds working things and regresses them.

Then regenerate that one brief and relaunch a fresh builder with `launch.sh`.

---

## Stage 7 — Ship

```bash
git add -A && git commit      # imperative subject under 72 chars, body says why
gh pr create
gh pr merge --squash --auto
```

`main` requires branches to be up to date, so each PR rebases onto the last and reruns its gate. Merge the
PR that speeds everything else up first when there is a choice.

Never `git add -A` with unrelated generated files in the tree: it will sweep a wave file or a scratch output
into an unrelated commit.

---

## What to expect

- Builders are not the constraint. They run in parallel and their build time is hidden behind each other.
- Review rounds are. Budget for roughly a third of an aesthetic batch needing a second pass, far less for
  mechanical work such as WAI-ARIA controls.
- CI is about three minutes on the sharded workflow and is not worth optimising further.
