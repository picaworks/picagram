# Kinetic studies integration checkpoint

Date: 2026-10-24. Base: 085b9797b5520ef98049e6e12fe249e5fdf7e1ab. Branch: codex/kinetic-studies. State: integrated and verified for PR review. See the [authorized plan](../plans/2026-10-24-kinetic-studies.md) and [wave decisions](../../review/wave-17.json). No Goal was activated.

## Scope

Twenty original animated components, ten ASCII motion designs and ten WebGL materials, form the named Kinetic studies batch. Every design has three described presets, bounded controls, one framework-free core and generated React and HTML formats. Earlier batch membership and archive decisions remain intact. The catalog contains 323 component sources and 322 discoverable entries.

ASCII: ascii-mobius-band, ascii-braided-cords, ascii-helix-ladder, ascii-elastic-membrane, ascii-slat-canopy, ascii-linkage-rosette, ascii-string-modes, ascii-chain-drive, ascii-glyph-carousel, ascii-balance-mobile.

WebGL: hammered-foil, frosted-block, fluted-tunnel, deckled-paper, fluted-shell, chainmail-weave, perforated-screen, stratified-stone, end-grain, terraced-blocks.

## Authorship and review

Three isolated author slots received one prepared component per assignment and wrote only its core, wrapper and metadata. The parent owned integration, generation, all mechanical checks and final review. No external references or reference code were used. Independent visual review inspected actual desktop and phone defaults and presets on ink and paper. Decisions record integration acceptance for PR review, not user approval.

Fluted Tunnel went to an independent author after its first version read as flat radial pleats. Its final geometry has a bounded near lip and circumferential wall joins receding toward an open throat. Stratified Stone went to another independent author after the first version's fault dominated faint strata. Broad stepped bedding and displaced layers now establish the material. Final cross reviews accepted both revisions.

Four ASCII compositions initially clipped at the right edge. Browser DOM ranges measured a 16 px braille glyph at 10.9375 px wide and a space at 9.6328125 px, explaining accumulated drift in text rows. An optional fixedCells canvas path now positions each glyph separately and constrains its width to the measured cell. Nine new braille designs opt in. Existing grid options retain their previous behavior. A regression test simulates unequal advances and checks cell containment, tint retention, row caching and default row behavior. All affected generated files were rebuilt. No dependency, license or hosting change was made.

## Verification

- Full component verification passed for all twenty final components, totaling 710 checks. It covers both formats, all presets at desktop and phone widths, both grounds, motion, reduced motion, byte budgets, accessibility, lifecycle and palettes. All ten shaders passed WebGL2 ink and frame progress, lost context restoration and CSS fallback checks.
- npm run check passed lint, strict types, 5,630 tests, registry generation for 323 components and the production build. Glyph grids retain the repository's existing facet convention.
- npm run check:site passed 40 of 40 checks. A clean npm run build:site passed after the fixture build. Manual catalog interaction confirmed the twenty-entry batch, a phone shader preset, and ASCII presets reflected in controls and exported usage.
- Source hashes, prepared packets, receipts, final verification reports, review sheets and 720 captured PNG frames are preserved in this chat's kinetic-studies-2026-10-24 artifact folder. The contact sheet uses actual default captures.

Browser verification uses Chromium and SwiftShader. It does not establish behavior on every physical GPU or browser, and short motion samples do not prove every frame of a long cycle. Merge and deployment await the next user instruction. The original checkout's unrelated harness work remains untouched.
