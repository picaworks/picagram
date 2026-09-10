# Testing

Four layers. A change is done when all four hold.

| Layer | Where | What it proves | Run |
|---|---|---|---|
| Unit | `test/lib.test.ts` | the runtime's arithmetic: seeded randomness and hashing, noise, ramps, dithering, chart scales and ticks, block glyphs, fitting, font sizing, JSON equality, and doc parsing | `npm test` |
| Invariant | `test/invariants.test.ts`, `meta.test.ts`, `license.test.ts`, `budget.test.ts`, `generated.test.ts`, and `compose.test.ts`; the list is in `invariants.md` | the hard constraints in `AGENTS.md` cannot be broken silently | `npm test` |
| Browser | `scripts/verify/`, one module per group of checks | each component in Chromium, over http from localhost, on the SwiftShader software renderer. The groups follow this table. | `npm run verify -- <slug>` |
| Site | `scripts/check-site.ts` | the catalog end to end in Chromium: every component listed, a frame that loads, every control type, the palette, the snippets, and the events panel, once from a fixture and once from select | `npm run check:site` |
| Review | `scripts/review.mjs`, with decisions in `review/` | it looks right, meaning Rish keeps it, revises it, or cuts it | `npm run review -- <wave>` |

What each browser group checks:

| Group | Checks |
|---|---|
| render | React matches vanilla at two viewports and on paper; thumbnails; the byte budget |
| motion | still under reduced motion, moving otherwise, and no long tasks |
| accessibility | the host rule, axe-core, and probe children in wrapping components |
| lifecycle | destroy restores the host, props stay untouched, and empty data still renders |
| palette | four ways of setting colors agree |
| gpu | the software renderer, a lost context, and the fallback without WebGL2 |
| interaction | scripted steps, events, and controlled echo |
| fixture | a real PNG, and a fake camera |

`--quick` checks one viewport and skips the long-task check, for iterating on a busy machine.

`manual-checklist.md` lists what neither a test nor verify can see.
