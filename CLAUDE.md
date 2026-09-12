@AGENTS.md

## Claude Code specifics

- Use plan mode before touching `lib/` or `scripts/single-file.ts`. Every component depends on them, and a break often shows only in a browser.
- Component waves run as parallel subagents. Each brief restates the clean-room rule and the component contract, because a subagent starts with no memory of `AGENTS.md`.
- A capture in `sources/inbox/` is Rish's to look at. This session never opens one, and never writes or edits a component built from a capture: a clean subagent does that from the approved spec, and a fresh one applies any revision.
- Ship through a pull request, never a push to `main`: work on a branch, open it with `gh pr create`, then run `gh pr merge --squash --auto`, which merges once the `build` check passes. Merging deploys picagram.dev.
- New plans go in `docs/plans/` with a date prefix. Old plans are history, not targets.
- After a session that changed behavior, update `docs/testing/invariants.md` in the same commit as the code.
- Scratch files go in the session scratchpad or `.pica/`, never in tracked paths.
