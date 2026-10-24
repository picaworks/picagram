# Motion and materials integration checkpoint

Date: 2026-10-24. Base: 55cf80a2585d741faee82847ac9dcb3ab0fd98bc. Branch: codex/ascii-wind-tunnel. State: integrated and verified for PR review. See the [authorized plan](../plans/2026-10-24-motion-materials-and-refinements.md) and [wave decisions](../../review/wave-16.json). No Goal was activated.

## Scope

Twenty original animated components are included, ten ASCII assets including the previously accepted Wind Tunnel and ten WebGL materials. Each has three named presets, one framework-free core and two generated formats. The catalog names this release Motion and materials and filters it to exactly twenty entries. The full generated catalog has 303 sources, with Cyberpunk Hero still archived.

ASCII: ascii-wind-tunnel, ascii-gyroscope, ascii-loop-knot, ascii-harmonic-stack, ascii-radial-dial, ascii-accordion-surface, ascii-orbit-trails, ascii-diffraction-screen, ascii-spiral-current, ascii-folding-fan.

WebGL: brushed-alloy, lenticular-ridges, quilted-surface, stippled-silk, glass-ripple-lens, contour-engraving, prismatic-tiles, orbiting-halftone, etched-radial, cut-paper-relief.

The eight earlier refinement recommendations are implemented. Aurora keeps its form on paper with a softer rim. Hero has editorial typography in its opt-in demo content, a quieter default and a clear Text first preset. Pixel Weft uses the existing credited Earth photograph and finer weaving. Cellular Tape and Pendulum Chain start with readable compact configurations. Cylinder Roll, Scanning Prism and Tape Head have stronger material geometry and dedicated compact compositions. Existing archive decisions and the other components remain intact.

Time controls now offer Live to restore null after seeking without discarding other settings. New numeric controls represent every authored default and preset exactly. Six material shaders expose only palette roles whose changes are perceptible at the default. No shared runtime, dependency, license, budget or hosting change was needed.

## Authorship and review

The parent chat was the single integrating writer. Three isolated authors received one native prepared assignment per turn and changed only their component's core, wrapper and metadata. Authors did not run builds, checks, Git or browsers. The parent integrated their sources, generated outputs and owned all checks. Read-only cross reviews found phone preset density issues, the time resume gap and invalid slider steps. The final sources address them. Wind Tunnel's open stream and reading margin remain deliberate content backgrounds.

Integration inspected actual desktop and phone renders on ink and paper, defaults and named presets. Named review decisions represent integration acceptance, with the PR remaining available for Rish's review. No external design reference or reference component code was used. Source packets, integration hashes, final verification reports and 1,008 captured frames are preserved in this chat's production-2026-10-24 artifact folder. Generated source remains reproducible from the registry.

## Verification

- Full component verification passed for all twenty new and eight refined components, totaling 1,005 checks. This covers React and HTML parity, defaults and all presets at desktop and phone widths on both grounds, byte budgets, motion, reduced motion, lifecycle, accessibility and palette behavior. The ten new shaders also passed real WebGL2 ink and frame progress, context restoration and CSS fallback checks.
- npm run check passed lint, strict types, all 5,286 tests, registry generation and the production build. Three incorrect canvas facets were removed to match the glyph grid contract. Inventory checks now require the twenty-entry split and representable slider values.
- npm run check:site passed 40 of 40 checks, including seek then Live retaining other props, preset exports, image preservation, archive links, keyboard use and phone layout.
- A clean npm run build:site passed after the fixture build. git diff --check passed. origin/main still matched the base before PR preparation.
- Manual catalog interaction confirmed the named twenty-entry batch, preset changes and seeking then Live with the chosen intensity retained.

The browser gate uses Chromium and SwiftShader. These results do not establish behavior on every physical GPU or browser, and short motion samples do not prove an entire long animation cycle. No merge or deployment was performed as part of this checkpoint. The original design-intake checkout and its unrelated harness changes remain untouched.
