# Pixel worlds

Date: 2026-11-15. Add twenty four original animated pixel worlds, eight each for nature, cities and infrastructure. Seattle, airports, shipping and factories are part of the requested direction. The coordinator owns integration and review; isolated subagents author the renderer and components.

## Direction and source boundary

The user confirmed Amir Mushich's Pixel Plays and its MIT license. Only its public README and LICENSE were read, never engine or game implementation, screenshots, sprites or music. Its general isometric pixel-diorama language informs the direction. These scenes and renderer are original work using standard projection and rasterization, not ports of its games. Component metadata remains original with no external code-host technique credit. The reference is recorded here as https://github.com/amirmushichge/pixel-plays. An original generated nature concept sheet is preview-only evidence outside the repository. It is not embedded in any component.

## Scope and architecture

Add an original compact software pixel renderer in lib/pixel-scene.ts with depth testing, palette-derived face lighting, geometric shadows, fixed camera bounds and a cached static scene. Reuse existing canvas, palette, loop, dithering and seeded-randomness owners. Each world has its own core, thin React wrapper and metadata, with three named structural presets and a small set of meaningful controls. Both React and standalone HTML are generated. All scenes fit the existing immersive budget with five percent headroom. Existing components, dependencies, license, hosting, archive decisions and palette ownership stay intact.

## Worlds

- Nature: pixel-lily-pond, pixel-hanging-waterfall, pixel-tidal-shelf, pixel-wind-grove, pixel-fern-log, pixel-terraced-garden, pixel-dune-slipface, pixel-basalt-crater.
- Cities: elliott-bay-ferry-pier, lake-union-float-homes, seattle-rain-terrace, seattle-market-garden, tram-corner, arcade-courtyard, canal-row, shop-lane.
- Infrastructure: apron-taxi, container-wharf, freight-siding, rotary-assembly, canal-lock, terrace-waterworks, ridge-cableway, wind-station.

## Execution and acceptance

Use three concurrent worker slots within the current runtime's capacity. Prepare each component with native deconfliction, brief and component-author helpers. Authors change only their assigned files and run no shared mechanical checks. The coordinator integrates one result at a time, runs focused runtime tests and full targeted browser verification, and inspects actual desktop and phone defaults and all presets on both grounds. Calibrate the first representatives before completing the batch. A visual revision goes to a fresh independent author with concrete structural instructions.

Finish with complete review decisions, lint, strict types, all tests, registry generation, the production build, catalog end-to-end verification and a clean post-fixture build. Preserve source hashes, prepared packets, receipts, reports and actual captures in chat evidence. Open one PR after every local gate passes. Merge and deployment await a later user instruction.

## Completed implementation and review

All twenty four worlds are implemented with seventy two named structural presets. Pixel worlds is the newest review filter, while earlier release filters retain their membership. The catalog contains 371 source components and 370 discoverable components. Every existing catalog entry is unchanged.

Nine independent revision rounds improved eight worlds. These replace thin foliage and uniform bark, lower the pond flower and dune, expose floating-home windows, distinguish the market roof garden, tighten the cableway view and give planted terraces folded leaves. The review log records all twenty four as keep after inspection of actual desktop and phone captures on both grounds.

The shared renderer has fourteen focused tests for visibility, palette alpha, static caching, primitive closure, motion cleanup and bounded shadows. An independent review found a receiving-depth tolerance error at low camera elevations. A regression reproduced it at ten degrees before the repair and passes afterward.

## Verification

- Full native browser verification passes 792 checks across the twenty four worlds. It captures 864 frames, including React and HTML defaults at three widths and every preset on ink and paper at desktop and phone widths.
- Every React and HTML comparison reports zero differing pixels. Motion, reduced motion, palette changes, cleanup, accessibility and the request boundary pass.
- Bundles range from 5,998 to 7,090 bytes gzipped, including their shared runtime, within the existing 8 KiB immersive budget.
- The repository gate passes lint, strict types, all 6,462 tests, registry generation and the production build.
- The catalog gate passes all forty end-to-end checks. A clean production build passes after its test fixture is removed.
- Local review evidence preserves preparation packets, author timing and tool counts, source hashes, reports, actual captures and overview sheets. Author worktrees remain recoverable because the worktree manager still reports active task ownership.

The branch is ready for one review PR. Merge and deployment remain a separate step.
