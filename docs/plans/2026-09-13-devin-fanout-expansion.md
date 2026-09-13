# Catalog expansion: 62 to 174 components, built by Devin sessions

Date: 2026-09-13. Approved by Rish in chat.

## Why

Picagram ships 70 components today across 10 categories. The catalog is thin in exactly the
places a component library is judged on: `ui` has 5 primitives, `motion` has 1, `immersive`
has 1, and `patterns` is declared in `CATEGORIES`, `CATEGORY_TITLES` and `BUDGETS` but holds
**zero** components. Meanwhile wave 4 is two thirds built: 24 of its 36 components shipped in #4
and #5, and the remaining 12 already carry complete briefs in `sources/wave-4.json`.

This plan finishes wave 4 and adds 92 new components, farming the build work to Devin CLI
sessions running SWE-2 while a coordinator and a reviewer stay here. It also closes four
holes in the verification gate that let broken hover states and blank shaders through.

Three things found during research that shaped the plan:

1. **Two of the three named sources are not component catalogs.** `particles.casberry.in`
   is a single 3D particle simulator (formations, text-to-particles, image-to-particles,
   blueprint edge detection) and `manus.im` is an AI agent company. Only `originkit`, which
   redirects to `coss.com`, is a real library, and its ~57 primitives map almost exactly onto
   Picagram's biggest gap. The particle simulator survives as direction for one batch of 8
   effects, not as a catalog to mine.

2. **The gate does not test what the catalog sells.** Hover is not exercised anywhere:
   `Step` is only `press | click | expectFocus | expectEvent | expectAttr`, and there is no
   `page.hover` or `mouse.move` in all of `scripts/`. `lib/gl.ts` exposes a `u_pointer`
   uniform and a `pointerUv()` helper that no check ever drives. The `gpu` group never diffs
   two frames and only asserts ink on the *fallback* path. A shader rendering all black is caught
   only indirectly, by `animates` and `palette tokens show`, and inside a section not at all:
   measured on `hero` with a deliberately blank `mesh-gradient`, `palette tokens show` still
   passed, because the copy around the shader carries the palette. `animates` runs against the
   vanilla shape only.

3. **AGENTS.md is stale.** It reads "Waves 1 to 3 are built, 46 components in all"; the tree
   is at 62 with wave 4 in progress.

Outcome: 174 components, a gate that actually checks hover and GPU rendering, and a
`/newdesignintake` skill that replays this whole pipeline on one command.

## Decisions taken in chat

| Question | Decision |
|---|---|
| References | Write `docs/decisions/0010-showcase-shortlists.md` widening shortlists beyond Dribbble. Rish still captures every reference himself. |
| Scope | Finish wave 4's 12 first as the Devin pilot, then 92 new across waves 6, 7, 8. |
| Orchestration | One git worktree per batch, ~8 Devin sessions in parallel inside it, one PR per batch. |
| Review gate | Targeted: `hover` + `pointerMove` steps, `gpu frame progress`, `gpu inks the frame`, React-shape motion diff. |

## Collision check

Run and passed before writing this plan. 70 slugs on disk + 36 briefed in `sources/wave-4.json`
+ 8 heroes reserved in `sources/shortlists/wave-5.md` = 92 reserved names. All 82 new non-hero
slugs below were diffed against that set:

```
duplicates inside the new list:  none
collisions with reserved names:  none
```

`editorial-hero` and `gallery-hero` are named in the 2026-09-11 expansion plan but are
**missing** from `sources/shortlists/wave-5.md`. Two shortlist rows must be added for them.

---

## Batch 0 — wave 4 remainder (12)

The Devin pilot. Briefs already exist in `sources/wave-4.json`; no human input needed, which
is exactly why this batch goes first: it debugs the pipeline on work that costs nothing to
redo.

**Shaders (8)** — WebGL2 via `lib/gl.ts`, still CSS fallback:
`caustic-field`, `contour-flow`, `pixel-plasma`, `ripple-field`, `voronoi-drift`,
`tunnel-grid`, `liquid-metal`, `scan-beam`

**Immersive (4)** — 2D canvas:
`world-map`, `city-grid`, `orbit-view`, `terrain-field`

---

## Wave 6 — primitives and patterns (42)

### UI primitives (30) — budget 8192

Picagram has `button`, `dialog`, `popover-tooltip`, `select`, `tabs`. Every one below is a
generic interaction pattern built from the WAI-ARIA Authoring Practices, credited as
`technique`, drawn in Picagram's mono/hairline grammar. No reference, no capture, no spec.

| # | Slug | What it is |
|---|---|---|
| 1 | `accordion` | Collapsible panels, one or many open, box-drawn headers |
| 2 | `alert` | A callout ruled off with hairlines, four tones from the palette |
| 3 | `avatar` | Initials or a dithered image in a square frame, with fallback |
| 4 | `badge` | A small mono label, solid / outline / bracketed |
| 5 | `breadcrumb` | A path of links separated by a mono glyph, collapsing at 390 |
| 6 | `calendar` | A month grid in mono figures, range and multi-select |
| 7 | `card` | A hairline container with header, body, and footer slots |
| 8 | `checkbox` | A box-drawn check, three states including indeterminate |
| 9 | `combobox` | A text input filtering a listbox below it |
| 10 | `command-palette` | A dialog-hosted filter over a flat command list |
| 11 | `context-menu` | A menu at the pointer on right click or long press |
| 12 | `drawer` | A panel sliding from an edge, with snap points |
| 13 | `empty-state` | A centred glyph, a line of copy, and one action |
| 14 | `input` | A single-line field with a hairline box and a focus rule |
| 15 | `input-otp` | Segmented boxes for a one-time code, paste-aware |
| 16 | `kbd` | Keyboard keys drawn as small bracketed mono caps |
| 17 | `menu` | A dropdown action list with full keyboard navigation |
| 18 | `meter` | A static measured value on a block-character track |
| 19 | `number-field` | A numeric input with increment and decrement affordances |
| 20 | `pagination` | Numbered pages with previous and next, truncating in the middle |
| 21 | `progress` | A determinate and indeterminate bar in block characters |
| 22 | `radio-group` | Single choice, roving tabindex, box-drawn marks |
| 23 | `scroll-area` | A scroll container with a custom mono scrollbar |
| 24 | `segmented-control` | Related choices as one ruled row, the active cell inverted |
| 25 | `separator` | A horizontal or vertical rule, optionally with a mono label |
| 26 | `skeleton` | Loading placeholders as shaded blocks that pulse |
| 27 | `slider` | A value on a track, single and range, arrow-key driven |
| 28 | `switch` | A two-state toggle drawn in box characters |
| 29 | `table` | Tabular data with box-drawing rules and sortable headers |
| 30 | `toast` | A stack of transient notices with an event on dismiss |

Deferred to a later wave so this batch stays reviewable: `toolbar`, `toggle-group`,
`tree-view`, `textarea`, `field`, `fieldset`, `form`, `autocomplete`, `preview-card`,
`date-picker`, `sheet`, `collapsible`, `group`, `input-group`, `label`, `spinner`.

### Patterns (12) — budget 6144, the empty category

Generated, never copied. `AGENTS.md` forbids copying an output from fffuel, MagicPattern or
SVGBackgrounds, so each is produced from its own algorithm and seeded through `lib/rng.ts`.
Named for what they are, per the slug rule (the `ascii-` / `dither-` / `halftone-` prefixes
are reserved for ASCII-first components).

| # | Slug | What it is |
|---|---|---|
| 1 | `grid-paper` | A hairline graph-paper grid with a heavier major rule |
| 2 | `dot-lattice` | A dot lattice, square or offset rows, with an optional fade |
| 3 | `diagonal-stripes` | Angled rules at a set width and gap |
| 4 | `checkerboard` | Alternating cells, optionally at a rotation |
| 5 | `hatch-lines` | Crossing pen rules at two angles, density by tone |
| 6 | `truchet-tiles` | Seeded Truchet tiles, arcs or diagonals, resolving into paths |
| 7 | `isometric-grid` | An isometric cube lattice drawn in three rule directions |
| 8 | `hex-lattice` | A hexagonal lattice in hairlines |
| 9 | `circuit-traces` | Seeded right-angle traces with pads, like a board |
| 10 | `brick-lattice` | Offset brick courses with a mortar gap |
| 11 | `cell-mosaic` | Seeded Voronoi cells drawn as hairline boundaries |
| 12 | `moire-rings` | Two concentric ring sets offset into a moire beat |

---

## Wave 7 — motion, ASCII, particles (30)

### Motion (10) — budget 6144

The category holds only `marquee` today.

| # | Slug | What it is |
|---|---|---|
| 1 | `ticker-tape` | A ticker of labelled figures with delta glyphs |
| 2 | `count-up` | A number tweening to its target on first view |
| 3 | `typewriter-text` | Text typed out a character at a time, then held |
| 4 | `split-flap` | A split-flap board resolving to its target string |
| 5 | `odometer` | Per-digit rolling figures |
| 6 | `carousel` | Slides children one at a time, keyboard and dot navigation |
| 7 | `stagger-list` | Children entering in sequence on a fixed delay |
| 8 | `wave-text` | Per-character vertical offset on a travelling sine |
| 9 | `flip-clock` | A clock whose digits flip, seeded and time-driven |
| 10 | `infinite-columns` | Vertical marquee columns at differing speeds |

Deliberately excluded: scroll-driven components (`scroll-progress`, `reveal-on-scroll`,
`parallax-layers`). The targeted gate adds no scroll step, so they would ship unverified.
They belong in a later wave alongside a `scroll` step.

### ASCII and text-mode (12) — budget 6144

| # | Slug | Category | What it is |
|---|---|---|---|
| 1 | `ascii-fire` | ascii | The Doom fire algorithm, seeded, on the measured ramp |
| 2 | `ascii-life` | ascii | Conway's Game of Life from a seeded start |
| 3 | `ascii-maze` | ascii | A recursive-backtracker maze drawn in box characters |
| 4 | `ascii-plasma` | ascii | Summed sine plasma mapped to the ramp |
| 5 | `ascii-tunnel` | ascii | A perspective tunnel of rings, shaded by depth |
| 6 | `ascii-starfield` | ascii | Seeded stars flying past the viewer |
| 7 | `ascii-metaballs` | ascii | Summed radial fields threshold into glyph blobs |
| 8 | `ascii-streamlines` | ascii | Seeded particles tracing a noise flow field |
| 9 | `ascii-clock` | text-mode | An analog or digital clock in glyphs |
| 10 | `ascii-tree` | text-mode | A file tree in box-drawing characters |
| 11 | `ascii-diff` | text-mode | A side-by-side or unified diff with mono gutters |
| 12 | `braille-scope` | text-mode | An oscilloscope trace on a braille dot canvas |

`ascii-streamlines` is named to stay clear of the existing `ascii-noise-field`.
`braille-scope` avoids colliding with the `lib/braille-plot.ts` module name.

### Particle effects (8) — budget 6144

The one batch that takes direction from `particles.casberry.in`: formations, text and image
as particle sources, pointer response. Every one is `original: true` — the simulator is a
reading, never a citation. Two of these exist specifically to exercise the new hover and
pointer checks.

| # | Slug | What it is |
|---|---|---|
| 1 | `particle-field` | A seeded drifting particle field with depth |
| 2 | `particle-text` | A headline rastered into particles that settle into its glyphs |
| 3 | `particle-image` | An image's tone read as particle density |
| 4 | `particle-orbit` | Particles bound to seeded attractors |
| 5 | `particle-swarm` | Boids-style flocking, seeded |
| 6 | `particle-morph` | Particles moving between formations: sphere, cube, helix |
| 7 | `particle-burst` | A seeded emission triggered on pointer entry |
| 8 | `particle-trail` | Particles following the pointer with decay |

---

## Wave 8 — templates (20)

### Heroes (10) — budget 16384

The ten named in the 2026-09-11 expansion plan. Eight already have candidate rows in
`sources/shortlists/wave-5.md`; two do not and need rows written.

| # | Slug | Shortlist status |
|---|---|---|
| 1 | `editorial-hero` | **Needs a shortlist row** |
| 2 | `gallery-hero` | **Needs a shortlist row** |
| 3 | `mission-control-hero` | 2 candidates, no Pick |
| 4 | `product-launch-hero` | 2 candidates, no Pick |
| 5 | `saas-dashboard-hero` | 2 candidates, no Pick |
| 6 | `agency-portfolio-hero` | 2 candidates, no Pick |
| 7 | `event-poster-hero` | 2 candidates, no Pick |
| 8 | `docs-hero` | 2 candidates, no Pick |
| 9 | `split-image-hero` | 2 candidates, no Pick |
| 10 | `manifesto-hero` | 2 candidates, no Pick |

### Body sections (10) — budget 16384

Existing sections are `bento-grid`, `hero`, `pricing`, `stats-kpi`, `testimonials`.

| # | Slug | What it is |
|---|---|---|
| 1 | `feature-grid` | Feature cards on a ruled grid, each with a glyph mark |
| 2 | `logo-wall` | Partner marks as a grid or a slow marquee |
| 3 | `faq-list` | Questions that expand in place, box-drawn |
| 4 | `cta-banner` | A full-width claim with one or two actions |
| 5 | `milestone-timeline` | Dated milestones on a vertical rule |
| 6 | `team-grid` | People as cards with dithered portraits |
| 7 | `footer-sitemap` | A multi-column footer with a mono colophon |
| 8 | `signup-row` | An email capture row that emits an event, never a request |
| 9 | `feature-compare` | A feature matrix with mono check and dash glyphs |
| 10 | `steps-flow` | A numbered how-it-works row with connecting rules |

Each composes at most three cores, all from waves 1–7, satisfying `test/compose.test.ts`.
`milestone-timeline` is named to stay clear of wave 4's `timeline-chart`; `feature-compare`
to stay clear of `table`; `faq-list` to stay clear of `accordion`.

---

## Decision 0010 — widening shortlists

`test/sources.test.ts` requires every URL in a shortlist to match
`^https://dribbble\.com/shots/\d+`, so a Webflow showcase URL is a hard test failure today.

Write `docs/decisions/0010-showcase-shortlists.md`, superseding only the URL rule of 0009:

- A research agent may record a candidate from a **public showcase or a live site** as well
  as a Dribbble shot: Webflow's Made in Webflow, Awwwards, agency and studio sites.
- The host allowlist stays a deny-by-default list. `CODE_HOSTS` is unchanged and still
  forbidden, so GitHub, CodePen, CodeSandbox, StackBlitz, 21st.dev and Figma stay out.
- Everything else in 0009 stays in force: **metadata only** — title, author, URL, one
  sentence of direction; no image saved, downloaded, screenshotted or linked; no browser
  pane; Rish is still the only person who captures, and still writes the Pick.
- 0003 is untouched. The trail stays shortlist → inbox row → spec → credit.

`test/sources.test.ts` enforces the Dribbble rule in exactly three lines, and only these change:

| Line | Today | After |
|---|---|---|
| `:15` | `const SHOT = /^https:\/\/dribbble\.com\/shots\/\d+/` | `const SOURCES = [ …patterns… ]` |
| `:108` | the URL column must match `SHOT` | must match one allowed pattern |
| `:123` | **every** URL anywhere in the file must match `SHOT` | must match one allowed pattern |

`:124`, the `CODE_HOSTS` ban, is untouched — `github.com`, `codepen.io`, `codesandbox.io`,
`stackblitz.com`, `shadertoy.com`, `figma.com`, `21st.dev` and `cdn.dribbble.com` stay
forbidden anywhere in a shortlist. The one-table, header, direction-format,
one-Pick-per-hero and no-media rules all stay exactly as they are.

**This is an amendment to a hard constraint.** It ships in its own PR, reviewed on its own.

---

## Verify harness extension

Four gaps, closed in `lib/meta.ts` and `scripts/verify/`. Per `docs/testing/invariants.md`,
every new rule gets a row and every row gets a check.

`CLAUDE.md` requires plan mode before touching `lib/`, because every component depends on it
and a break there often shows only in a browser. This is that plan. The extension points are
small and already confirmed: `perform()` in `scripts/verify/interact.ts:15` dispatches on
`step.step` with one `if` per kind, and `diffRatio` is already imported in that file.

**1. Two new `Step` kinds** in the `Step` union in `lib/meta.ts`:

```ts
| { step: "hover"; selector: string }
| { step: "pointerMove"; x: number; y: number }
```

`hover` moves the pointer over an element, empty selector meaning the host. `pointerMove`
takes fractional host coordinates (0–1) so pointer-reactive shaders and `u_pointer` can
finally be driven. Both run in **both shapes**, like every existing step.

**2. A hover visual assertion.** A hover step proves the hover state changed something:
screenshot clipped to the element's own box before and after, requiring a non-zero diff.
Clipping to the element matters because STYLE.md caps hover at "a fg tint of about 10%",
which on a small button is far below `PARITY_TOLERANCE` when measured over a 1280x800 frame.

**3. Two new GPU checks** in `scripts/verify/gpu.ts`:
- `gpu frame progress` — two frames diffed on the **real** WebGL2 path, gated on
  `meta.animated`, proving the component's own canvas advances.
- `gpu inks the frame` — `inkRatio` on the GPU path, catching the all-black shader that
  passes today.

Coverage is total from day one: `aurora`, `mesh-gradient` and `shader-flow` are the only
components that open WebGL2, and all three are `animated: true`, so both checks apply to
every existing shader and to all 8 wave 4 shaders that follow.

**4. React-shape motion.** `animates` also runs against the React shape. The existing code
already warns this check and `no long tasks` flake on a busy machine, so the retry guidance
in `sources/BUILDER.md` extends to the new check.

**Backwards compatibility:** all four are additive and gated. The 62 existing components
declare no hover steps and are unaffected.

Every new interactive component declares hover steps in `meta.interactions`. `particle-burst`
and `particle-trail` exist partly to prove `pointerMove` works.

---

## Orchestration

### Shape

One git worktree per batch. ~8 Devin sessions run concurrently inside it, each confined to
its own `registry/<category>/<slug>/` directory — the model `sources/BUILDER.md` already
assumes ("Up to sixteen builders work in this repository at the same time, one component
each"). One PR per batch, ~12 PRs total, each running the macOS CI gate once.

```bash
git worktree add .pica/wt/wave-6-ui -b wave-6-ui
cd .pica/wt/wave-6-ui && npm ci && npx playwright install chromium

devin -p --model swe-2-high --permission-mode accept-edits \
  --prompt-file .pica/briefs/accordion.md &
devin -p --model swe-2-high --permission-mode accept-edits \
  --prompt-file .pica/briefs/alert.md &
# …8 in flight, then wait
```

SWE-2 is free on this account (`swe-2-high`, `-medium`, `-max`), so the fan-out costs
wall-clock only. `swe-2-high` is the default; `swe-2-max` for shaders and sections.

Two mechanics confirmed by smoke test rather than assumed:

- `devin -p --model swe-2-high --respect-workspace-trust false` returns cleanly (exit 0).
  The trust flag is **required**: non-interactive mode cannot show the trust prompt and
  fails outright in an untrusted directory, which a fresh worktree is.
- `.pica/` is already gitignored, so worktrees and briefs live there without polluting
  the tree. `review/` is **not** ignored, which is correct — `test/review.test.ts` reads
  committed decisions.

**Contention:** `PICA_VERIFY_SLOTS` caps concurrent browsers at 6 by default and is only
uncapped when `CI` is set. Eight workers each running `npm run verify` will queue, and the
timing-sensitive checks (`animates`, `no long tasks`, and the new `gpu frame progress`)
flake under load. Workers run `--quick` only; the coordinator runs the full serial verify
once the batch is done.

### The three roles

| Role | Model | Job |
|---|---|---|
| **Worker** | Devin CLI, SWE-2 | Writes one component's three files. Runs eslint, tsc, `npm run verify -- <slug> --quick`, reads its own captures, reports. |
| **Coordinator** | this session, Opus 5 high | Writes briefs, creates worktrees, launches and watches workers, runs the shared commands workers may not, opens the PR. |
| **Reviewer** | Opus 5 subagent | Judges each finished component against STYLE.md from its captures and the live page, writes revision notes, sends them back to a fresh Devin session. |

The coordinator runs what `BUILDER.md` forbids a worker to run — `npm run build:registry`,
`npm test`, `npm install`, and every git command — because those touch files every worker
shares.

### Worker brief

`sources/BUILDER.md` is the base, with three corrections a Devin session needs:

- Its line 3 names the repo as `.../GitHub/pica`; the checkout is `.../GitHub/picagram`, and
  a worktree path differs again. The brief states the worktree path explicitly.
- It says "no git command" and "do not run `npm test`" on the assumption of one shared tree.
  That still holds inside a worktree, so those bans stay.
- It says "No interactive browser." That stays: the Browser pane is shared, and the reviewer
  owns visual checking.

Per-component briefs go in `.pica/briefs/<slug>.md`, generated from a new
`sources/wave-6.json`, `wave-7.json`, `wave-8.json` in the format `test/sources.test.ts`
enforces: exactly `slug, title, kind, animated, decorative, brief, props, credits`, optionally
`category, original, events, composes, spec`. A spec-backed entry must have `brief` exactly
`"Build from specs/<slug>.md."` and `props` exactly `"See the spec's Parameters section."`

### Review loop

1. Coordinator runs the full `npm run verify -- <slug>` for every component in the batch.
2. Coordinator runs `npm run review -- <wave>` on `http://localhost:3200`.
3. Reviewer subagent judges each component: captures on both grounds, the live page for
   hover and motion, and STYLE.md.
4. `keep` → done. `revise` → the note becomes a revision brief for a **fresh** Devin session.
   `cut` → the directory is removed and the slug retired.
5. `test/review.test.ts` fails if any component in a wave is left undecided or on `revise`,
   so the loop must close before the PR merges.

### Shipping order

| PR | Branch | Contents |
|---|---|---|
| A | `verify-hover-gpu` | The four harness gaps, invariants rows, `AGENTS.md` status correction |
| B | `decision-0010` | Decision 0010, the `test/sources.test.ts` URL allowlist, two new shortlist rows |
| C | `wave-4-shaders` | `caustic-field`, `contour-flow`, `pixel-plasma`, `ripple-field`, `voronoi-drift`, `tunnel-grid`, `liquid-metal`, `scan-beam` |
| E | `wave-4-immersive` | The 4 immersive components + wave 4 review decisions |
| F–H | `wave-6-ui-1/2/3` | 30 UI primitives in three batches of 10 |
| I | `wave-6-patterns` | The 12 patterns |
| J | `wave-7-motion` | The 10 motion components |
| K | `wave-7-ascii` | The 12 ASCII and text-mode components |
| L | `wave-7-particles` | The 8 particle effects |
| M | `wave-8-heroes` | The 10 heroes, after Rish picks and captures |
| N | `wave-8-sections` | The 10 body sections |
| O | `newdesignintake` | The skill |

PR A ships first so every component after it is built against the stronger gate. PR B ships
early because the heroes are blocked behind it. Only one PR carries auto-merge at a time;
`main` stays protected and each rebases onto the last.

**Wave 8 is gated on Rish.** No hero or captured-reference section can start until he writes
`yes` in the shortlist and captures into `sources/inbox/`. Everything before wave 8 — 94
components — needs nothing from him.

---

## The `/newdesignintake` skill

`.claude/skills/newdesignintake/SKILL.md` in the project, replaying this pipeline on command.
Argument: a source URL, a category, or a count. It follows the frontmatter convention of the
existing skills in `~/.claude/skills/`:

```markdown
---
name: newdesignintake
description: Take a design source to shipped Picagram components — harvest, deconflict, brief, fan out to Devin, verify, review, ship
trigger: /newdesignintake
---
```

Stages:

1. **Harvest** — read a source by text listing only, never a screenshot, never page source.
   Emit candidate component names and one line of direction each.
2. **Deconflict** — diff candidate slugs against every slug on disk plus every slug reserved
   in `sources/wave-*.json` and `sources/shortlists/*.md`. Refuse to proceed on a collision.
   This is the mechanical version of the check run for this plan.
3. **Classify** — assign each candidate a category, a kind from the nine in
   `docs/adding-a-component.md`, a budget, and facets from the twelve in `lib/meta.ts`.
4. **Route** — anything generic becomes a technique or original brief and proceeds. Anything
   needing a captured reference stops and writes a shortlist row for Rish.
5. **Brief** — write `sources/wave-<N>.json` and per-component `.pica/briefs/<slug>.md`.
6. **Fan out** — create the worktree, launch the Devin sessions, watch them.
7. **Gate** — `npm run check`, serial full `verify`, `npm run check:site`.
8. **Review** — the contact sheet and the reviewer subagent, until nothing is on `revise`.
9. **Ship** — `gh pr create`, then `gh pr merge --squash --auto`.

The skill carries the clean-room rule verbatim at stage 1 and the deconflict step is a hard
stop, because those are the two places this pipeline can quietly do damage.

---

## Files

| Path | Change |
|---|---|
| `lib/meta.ts` | Two new `Step` kinds |
| `scripts/verify/interact.ts` | Implement `hover` and `pointerMove`, clipped hover diff |
| `scripts/verify/gpu.ts` | `gpu frame progress`, `gpu inks the frame` |
| `scripts/verify/motion.ts` | React-shape `animates` |
| `test/meta.test.ts` | Validate the new step kinds |
| `test/sources.test.ts` | URL allowlist in place of the Dribbble regex |
| `docs/testing/invariants.md` | One row per new check |
| `docs/decisions/0010-showcase-shortlists.md` | New |
| `docs/plans/2026-09-13-devin-fanout-expansion.md` | This plan, in repo form |
| `sources/shortlists/wave-5.md` | Rows for `editorial-hero`, `gallery-hero` |
| `sources/wave-6.json`, `wave-7.json`, `wave-8.json` | New briefs |
| `sources/BUILDER.md` | Worktree path, Devin corrections |
| `AGENTS.md` | Status line: 62 components, wave 4 in progress |
| `registry/<category>/<slug>/` | 92 new component directories, three files each |
| `.claude/skills/newdesignintake/SKILL.md` | New |

`AGENTS.md`, `docs/architecture/`, and the byte budgets are otherwise untouched. No new
category is added: `patterns` already exists and is simply populated.

## Verification

Per batch, run by the coordinator:

```bash
npx eslint registry/<category>/<slug>      # per component, by the worker
npm run verify -- <slug>                   # full, not --quick, per component
npm run build:registry
npm run check                              # lint + test + build
npm run check:site
npm run review -- <wave>                   # contact sheet, then the reviewer subagent
```

For the harness work in PR A specifically:

- `npm run verify -- button` and `-- tabs` pass unchanged, proving the new steps are additive.
- `npm run verify -- mesh-gradient aurora shader-flow` exercise the two new GPU checks against
  the three existing shaders, and must pass without any change to them.
- A deliberately broken shader (fragment writing `vec4(0,0,0,1)`) must fail `gpu inks the
  frame`, and a deliberately frozen one must fail `gpu frame progress`. Both reverted after.
- `npm test` covers the `test/meta.test.ts` and `test/sources.test.ts` changes.

Final gate, once wave 8 lands: 174 components, every one inside its category budget, both
shapes matching at both widths, generated files current, nothing requesting the network,
and `review/wave-{4,6,7,8}.json` with no component left on `revise`.

## Not in this plan

- Scroll-driven components and a `scroll` step. Named and deferred.
- The full input suite: drag, wheel, touch, `ResizeObserver`, focus-visible, offscreen pause.
- The 16 deferred UI primitives listed under wave 6.
- Wave 3 review notes: chart insets, donut labels, shader flow loudness.
- Four wave 1–2 credits still pointing at github.com.
- `test/photos.test.ts` and `scripts/verify/photos/`, which the 2026-09-11 plan lists as
  shipped but which are not in the tree.
- Any change to a byte budget, a dependency, the license, or branch protection.
