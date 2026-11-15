# Mechanisms and surfaces integration checkpoint

Date: 2026-11-14. Base: fdfe41b4a74ece53cec96d3ab38bd06c58c3578d. Branch: codex/mechanisms-surfaces. State: integrated and verified for PR review. See the [authorized plan](../plans/2026-11-14-mechanisms-surfaces.md) and [wave decisions](../../review/wave-18.json). No Goal was activated.

## Scope

Twenty four original animated components, twelve ASCII mechanisms and twelve WebGL materials, form the named Mechanisms and surfaces batch. Every component has three described presets, bounded controls, one framework-free core and generated React and HTML formats. Earlier batch membership and archive decisions remain intact. The catalog contains 347 component sources and 346 discoverable entries.

ASCII: ascii-orrery, ascii-scissor-lift, ascii-catenary-net, ascii-rolling-cube, ascii-screw-conveyor, ascii-gear-train, ascii-expanding-truss, ascii-tension-sail, ascii-cam-follower, ascii-shuttle-loom, ascii-lift-bridge, ascii-bellows.

WebGL: knurled-drum, crazed-ceramic, braided-cable, folded-vellum, honeycomb-core, ribbed-glass, satin-ribbon, sand-ripples, faceted-crystal, porcelain-relief, chiseled-slate, twill-weave.

## Authorship and review

Three isolated author slots received one prepared component at a time and wrote only its core, wrapper and metadata. The parent owned integration, generation, all mechanical checks and final review. No external references or reference code were used. Independent reviewers inspected actual desktop and phone defaults and all presets on ink and paper. Decisions record integration acceptance for PR review, not user approval.

Eight assets received independent revisions. Orrery gained larger sun and planet bodies. Expanding Truss was rebuilt with continuous crossed bars, shared end pins and sliding crossing pins after its first revision still read as diamond outlines. Ceramic gained asymmetric crack flanks and coherent glaze relief. Glass gained rounded rib reflections and a finite rear edge. Sand gained a bounded lit ridge response after the foreground palette check failed. Slate gained geometric lip obstruction and recessed floor attenuation. Crystal gained displaced reference rules, interior ray paths and a central table cue derived from the actual entry and exit planes. Porcelain gained analytic terrace shoulders, oblique intersections and cast shadows. Final independent reviews accepted every revision.

The ASCII components use the existing fixed cell glyph renderer. No shared runtime, dependency, license or hosting change was made. The parent shortened one metadata description to fit the existing limit.

## Verification

- Full component verification passed for all twenty four final components, totaling 852 checks. It covers both formats, all presets at desktop and phone widths, both grounds, motion, reduced motion, byte budgets, accessibility, lifecycle and palettes. All twelve shaders passed WebGL2 ink and frame progress, lost context restoration and CSS fallback checks. Each new component retains more than five percent byte headroom.
- npm run check passed lint, strict types, 6,039 tests, registry generation for 347 components and the production build.
- npm run check:site passed 40 of 40 checks. A clean npm run build:site passed after its fixture build. Manual catalog interaction confirmed the twenty four entry batch, its twelve and twelve category split, phone shader presets, and ASCII preset values reflected in controls and exported React and HTML usage.
- Existing component markdown and its concatenated agent document were verified byte identical to main. The large generated llms-full.txt diff contains new component sections; repeated embedded runtime code affects diff alignment.
- Final source hashes, prepared packets, handoff receipts, worker source, verification reports, logs, review sheets and 864 captured PNG frames are preserved in this chat's mechanisms-surfaces-2026-11-14 artifact folder. The contact sheet uses actual default captures.

Browser verification uses Chromium and SwiftShader. It does not establish behavior on every physical GPU or browser, and short motion samples do not prove every frame of a long cycle. Merge and deployment await a later user instruction. The original checkout's unrelated harness work remains untouched.
