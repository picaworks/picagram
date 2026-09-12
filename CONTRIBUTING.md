# Contributing

`AGENTS.md` is the rulebook. This file mirrors it for people.

`docs/architecture/` is current; `docs/plans/` is history; `docs/decisions/` says why; `docs/testing/` says what done means.

## How a change lands

`main` is protected, and nobody pushes to it, the maintainer included. Every change is a pull request from a branch or a fork. It merges, squashed, only after its `build` check passes. That check runs lint, the tests, the registry build, `npm run verify -- --quick` for every component, and `npm run check:site`, on macOS. Merging deploys the site at picagram.dev.

## Before you open a pull request

1. Run `npm install`, then `npx playwright install chromium` once.
2. Run `npm run verify -- <slug>` for every component you touched.
3. Run `npm run build:registry` and commit the generated files.
4. Run `npm run check`.

## What gets a change rejected

- Code copied from a reference component, or a spec that contains code.
- A network call, a font or image fetched by a component, or an npm import in a core.
- `requestAnimationFrame` or `setInterval` outside `lib/loop.ts`, or `Math.random` anywhere in `lib/` or `registry/`.
- A hand edit to a generated file.
- A component over the byte budget, or one whose React and vanilla captures differ.
- A component that keeps moving under prefers-reduced-motion.
- Tailwind classes or `cn()` in a component.
- A prop without a JSDoc line, or a component without credits.
- A component whose `facets` do not match what it is, or a new tag used as a filter. The catalog filters by the twelve facets in `lib/meta.ts`, and tags stay free text.
- A reference's image saved into the repository, or a shortlist row holding anything but text. Only the maintainer captures a reference.
