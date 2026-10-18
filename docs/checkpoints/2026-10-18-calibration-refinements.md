# Calibration refinements checkpoint

Date: 2026-10-18T15:00:10-07:00. State: implemented and verified locally.
Baseline: ec935da8adbcb33e2a1c6feb99210b5b61b045a6. Branch: codex/calibration-refinements. Scope: [approved plan](../plans/2026-10-18-calibration-refinements.md). One integrating writer completed this work. No Goal was activated.

## Outcome and evidence

| Requirement | Result | Evidence |
|---|---|---|
| REQ-01 | Cyberpunk Hero is archived from default catalog, agent indexes and public registry discovery. Its source, hash route and individual install files remain available. | `test/curation.test.ts`; the 39 passing site checks; full hero verification passed with its unchanged core. |
| REQ-02 | Caustic Field has a broad, lighter net. Shader Flow has fewer, finer contour bands and a gentler fold. Each has three named presets. | Full component verification, including every preset in both formats on ink and paper at 1280 and 390 pixels. |
| REQ-03 | The wave tank opens with developed waves and one slim barrier. Reflections, Open water and Two sources presets remove the need to author JSON for common setups. Opening time can be zero. | Full verification includes a zero-opening seek comparison and lifecycle checks. |
| REQ-04 | Engraving uses clearer depth and shading defaults with three light presets and an embedded photographic example. | Full verification, palette checks, a real PNG input and the credited NASA Apollo 17 example. |
| REQ-05 | Presets appear before controls, keep supplied images, labels and pause choices, and feed the same state to the frame and both exports. Manual edits remain possible. | Content-preservation unit test and actual frame-message, HTML, React and image-preservation site checks. |
| REQ-06 | All other registry component sources remain unchanged. | Git diff is limited to the four approved cores and their metadata plus Cyberpunk Hero metadata. The four explicitly retained effects remain active. |

`npm run check` passed, including lint, 4,945 tests, registry generation and a production build. `npm run check:site` passed all 39 checks. A clean production site build followed the fixture-enabled site check. The four refined assets passed 145 full browser checks, including all 12 presets; the hero also passed its 29 checks. `git diff --check` passed.

## Recovery and limits

The local preview starts with `npm run dev` at port 3100 in this worktree. Source metadata owns archive and preset settings. Regenerate distribution with `npm run build:registry`; never edit generated files. The complete inventory remains 283, with 282 in default discovery. The build retains legacy registry items before writing a curated public index.

Initial palette regressions were corrected before final verification. Integration checks now wait for iframe navigation before observing ready state. The worktree uses its own dependency copy because Next.js rejected a symlink outside its root. Live thumbnails were cached for unchanged assets to complete the preview; that does not establish fresh verification of those assets.

The engraving demo is a reduced embedded copy of [NASA's Apollo 17 photograph](https://svs.gsfc.nasa.gov/30613/), credited in the component metadata under [NASA media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/). No external image request is needed at runtime. Visual evidence and tested source hashes are saved in this chat's calibration/refinements artifact folder.

Repository state: local working-tree changes only. Nothing committed, pushed or deployed. The original design-intake checkout and its harness edits are preserved.
