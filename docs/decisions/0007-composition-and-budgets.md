# 0007: Sections compose other components, and budgets are set per category

Date: 2026-09-10. Status: accepted.

Context: A hero needs a background component and buttons, and a pricing section needs buttons. Reimplementing those inside each section would duplicate code, and the copies would drift. A section that inlines the components it composes also cannot fit the original 6 KB budget; ascii-image alone is 5 KB. TypeScript namespace blocks were rejected as the way to keep each composed core apart, because they are not erasable syntax, and projects that strip types without a compiler reject them.

Decision:
- **Who may compose.** Only cores in `registry/sections/` may import other components' cores. They go one level deep, as `import * as <slug in camelCase> from "../../<category>/<slug>/core";`.
- **How a section uses a child.**
  - It mounts each child into a sub-host it creates.
  - It destroys each child in its own destroy.
  - The palette reaches children through the cascade.
- **Keeping names apart.**
  - In the React file, `scripts/single-file.ts` wraps each composed core in a function scope that returns its `mount` and `defaults`, so helpers cannot collide. esbuild already keeps them apart in the vanilla shape.
  - For every other top-level name, the generator stops with both files named when two modules would declare the same one.
- **Budgets per category,** set in `scripts/config.ts`:

  | Categories | Budget |
  |---|---|
  | the ASCII-first categories, and motion | 6 KB |
  | ui, data, shaders, and immersive | 8 KB |
  | sections | 16 KB |

- **Timing.** A section composes only components that existed before its wave started.

Consequences:
- The import fence in `eslint.config.js` and `test/invariants.test.ts` allows lib imports everywhere, and core imports only from sections, in the namespace form.
- `test/compose.test.ts` checks that a composed core is scoped, and that the file typechecks alone with `erasableSyntaxOnly`.
- `test/budget.test.ts` and `scripts/build.ts` apply each component's category budget.
