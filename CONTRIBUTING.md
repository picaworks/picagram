# Contributing

`AGENTS.md` is the rulebook. This file mirrors it for people.

`docs/architecture/` is current; `docs/plans/` is history; `docs/decisions/` says why; `docs/testing/` says what done means.

## Before you open a change

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
