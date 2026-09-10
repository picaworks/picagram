# 0005: The palette is four CSS custom properties, and the palette prop writes them

Date: 2026-09-10. Status: accepted.

Context: Components must match any brand without edits, and Rish asked for palette props. A palette passed only as a prop into each core was rejected, for three reasons:
- it does not cascade, so a brand would be repeated on every instance;
- every section would have to forward it to each child;
- it cannot follow a theme switch without app code.

Decision:
- **The four tokens are the source of truth:**

  | Token | Default |
  |---|---|
  | `--pica-fg` | the inherited text color |
  | `--pica-bg` | transparent |
  | `--pica-accent` | amber `#e8a020` |
  | `--pica-muted` | fg at 65% |

- **`lib/palette.ts` is the only reader:**
  - `cssVar(token)` for styles;
  - `readPalette(host)` for a single read;
  - `watchPalette(host, onChange)` for canvas and WebGL components. It hears a change through a transition on a hidden probe, so `currentColor`, `light-dark()`, and `color-mix()` resolve exactly as they do on the page.
- **The `palette` prop is a typed convenience.**
  - The React wrapper writes it into the host's `style`.
  - The vanilla page applies it from `window.PICA_PROPS`.
  - Precedence is plain CSS: a value on the host beats one inherited from the page.
- **`meta.palette`** lists the tokens a component's default look draws with.

Consequences:
- No color literal appears in `registry/`, and only `lib/palette.ts` reads the custom properties. Both are checked by `eslint.config.js` and `test/invariants.test.ts`.
- `npm run verify` sets a test palette four ways: before mount, after mount, through the prop, and through page variables. It requires each listed token to change the picture, and all four routes to agree.
