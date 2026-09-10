# Testing

Four layers. A change is done when all four hold.

| Layer | Where | What it proves | Run |
|---|---|---|---|
| Unit | `test/lib.test.ts` | the runtime's arithmetic: seeded randomness, noise, ramp picking, shape matching, doc parsing | `npm test` |
| Invariant | `test/invariants.test.ts`, `meta.test.ts`, `license.test.ts`, `budget.test.ts`, and `generated.test.ts`; the list is in `invariants.md` | the hard constraints in `AGENTS.md` cannot be broken silently | `npm test` |
| Browser | `scripts/verify.ts` | each component in Chromium on a dark and a light ground: no errors; React matches vanilla; motion stops under reduced motion and runs otherwise; no long tasks; the host is labelled; the bundle fits the budget. `--quick` checks one viewport and skips the long-task check, for iterating on a busy machine. | `npm run verify -- <slug>` |
| Review | `scripts/review.mjs`, with decisions in `review/` | it looks right, meaning Rish keeps it, revises it, or cuts it | `npm run review -- <wave>` |

`manual-checklist.md` lists what neither a test nor verify can see.
