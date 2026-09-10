# 0002: One core per component, two generated shapes

Date: 2026-09-10. Status: accepted.

Context: Every component must ship as a React component and as plain HTML, CSS, and JS. Two alternatives were rejected.
- **Two hand-written implementations per component.** Some libraries publish separate variants this way. Two implementations drift apart and double the bug surface.
- **A shared runtime installed through shadcn `registryDependencies`.** The CLI rewrites import paths to each project's aliases, which breaks relative imports into a shared lib, and it ties every install to a second item.

Decision: Each component has one framework-free core (`core.ts`, exporting `mount` and `defaults`) and a React wrapper of about ten lines. `scripts/single-file.ts` generates both shapes from them.
- **React shape:** the lib modules the component reaches, then the core, then the wrapper, concatenated with relative imports removed. It imports only `react`.
- **Vanilla shape:** an esbuild IIFE inside an HTML page.

The shared runtime is duplicated into each copy, and the byte budget keeps that cheap.

Consequences:
- Relative imports must fit on one line, because the concatenation removes them by pattern (`test/invariants.test.ts`).
- Every generated React file must typecheck on its own (`test/generated.test.ts`). That check also catches a top-level name in `lib/` that collides with one in a core.
- Both shapes must render the same pixels (`npm run verify`).
