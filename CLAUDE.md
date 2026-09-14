@AGENTS.md

## Claude Code specifics

- Use plan mode before touching `lib/` or `scripts/single-file.ts`. Every component depends on them, and a break often shows only in a browser.
- Component waves run as parallel workers, one component each. Each brief restates the clean-room rule and the component contract, because a worker starts with no memory of `AGENTS.md`.
- From the 2026-09-13 expansion on, those workers are Devin CLI sessions: one git worktree per batch under `.pica/wt/`, about eight sessions at a time inside it, each confined to its own `registry/<category>/<slug>/`. Launch them with `devin -p --model <worker model> --respect-workspace-trust false --prompt-file .pica/briefs/<slug>.md`; the trust flag is required, because non-interactive mode cannot show the trust prompt and fails outright in a fresh worktree. The plan names the model, and it is free on this account, so the cost is wall clock.
- This session is the coordinator, and it runs what `sources/BUILDER.md` forbids a worker to run: `npm run build:registry`, `npm test`, `npm install`, and every git command. Workers run `npm run verify -- <slug> --quick` only; `PICA_VERIFY_SLOTS` caps browsers at 6, so the full serial verify is the coordinator's, once a batch is done.
- Reviewing is a separate agent's job, against `STYLE.md` and the captures. A `revise` note becomes the brief for a fresh worker, never a correction sent to the one that wrote it. Name the structure to build rather than the quality to achieve: a note stating a principle only lands when the worker can already see the fault, and otherwise the fault relocates instead of going away.
- `/design-intake` runs that whole pipeline, from an intake to a merged pull request, and carries the flags, the deconflict check, the brief template and the review loop that this session had to learn by failing. Use it rather than rebuilding the launcher by hand. See `.claude/skills/design-intake/SKILL.md`.
- A capture in `sources/inbox/` is Rish's to look at. This session never opens one, and never writes or edits a component built from a capture: a clean subagent does that from the approved spec, and a fresh one applies any revision.
- Ship through a pull request, never a push to `main`: work on a branch, open it with `gh pr create`, then run `gh pr merge --squash --auto`, which merges once the `build` check passes. Merging deploys picagram.dev.
- New plans go in `docs/plans/` with a date prefix. Old plans are history, not targets.
- After a session that changed behavior, update `docs/testing/invariants.md` in the same commit as the code.
- Scratch files go in the session scratchpad or `.pica/`, never in tracked paths.
