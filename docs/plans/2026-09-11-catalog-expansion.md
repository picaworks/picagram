# Catalog expansion: 46 to 92 components

Date: 2026-09-11. Approved by Rish in chat, from a set of annotations he made on the live catalog. The research policy it depends on is `docs/decisions/0009-metadata-shortlists.md`.

## Why

The catalog shipped, and browsing it showed what it lacks.
- The filter offered 119 tags, 89 of them used once, so it filtered nothing anybody would think to ask for.
- The chrome was dark only, with no way to see a component on paper without touching the canvas ground.
- The inspector held a third of the width whether or not it was wanted, and the wordmark sat small next to a count.
- Aurora drew blocky columns and the globe a faint dot cloud, so neither read as the thing it is named after.
- Every image component's thumbnail showed the same built-in sphere, because verify has only ever had a synthetic 64 by 48 fixture.
- Forty six components is thin, and none of them is a page opening somebody could drop into a site.

## What ships, and in what order

| Pull request | Contents |
|---|---|
| 1a, `expansion-shell` | This plan, decision 0009, the wave 5 shortlist, facets in meta, the catalog shell, the new clean room and composition checks, the generalized builder brief |
| 1b, `expansion-runtime` | New `lib/` helpers, the `flow` stage, verify upgrades, review photographs, Natural Earth land data, the aurora and globe revisions, `scan-reveal-image` as a reference, the wave 4 briefs |
| 2 to 4 | Wave 4, in batches: dither and effects, then shaders and data, then immersive |
| S, `wave-5-specs` | Ten approved specs and the wave 5 briefs |
| 5 | The wave 4 review decisions and the revisions they call for |
| 6 | Wave 5, ten heroes |
| 7 | The wave 5 review decisions, the revisions, and the final gate |

Only one pull request carries auto-merge at a time. `main` stays protected, so each one rebases onto the last and reruns its gate.

## The shell

- **Twelve facets replace 119 tags.** `FACETS` in `lib/meta.ts` is animated, static, image, text, background, overlay, interactive, chart, shader, canvas, webgl, and dither. Every meta declares which apply. Tags do not change: they stay free text, they stay searchable, and the inspector lists them, where a tag now fills the search box rather than toggling a filter.
- **A theme.** A two state dark and light control sits under the wordmark. It starts from a saved choice, then from the browser's preference, and it is applied by a small script in the page head so the first paint is already right. Choosing a theme also sets the canvas ground, to ink or to paper, and the ground control may then diverge.
- **Chrome tokens.** The stylesheet moves to semantic tokens with a value per theme. Ink and paper stay what they are, the two grounds a component is captured on. On paper, muted becomes `#6a6a66` and the interface accent becomes `#975c00`, because amber measures 1.96:1 there and colors both the focus ring and the error text.
- **The brand.** The wordmark is 39 px, three screen pixels per pixel of the mark, aligned with the search field. The count and the theme control move to a second row.
- **A collapsible inspector.** Collapsing gives its width to the canvas and leaves a labelled control in the canvas bar. Each button exists in one state only, focus moves to its counterpart, and the canvas refits through a resize observer. It defaults to open, and selecting a component never reopens it.
- **The footer** ends with the build year and the name, at the far right.

## The runtime

- **New modules,** because the single React file inlines each `lib/` module whole: `dither-mask.ts` for blue noise and clustered dot screens, `pixels.ts` for palette ink and a precomputed plate, `filter.ts` for Sobel edges and a summed area mean, `chart-marks.ts` and `chart-time.ts` and `braille-plot.ts` for the eight new charts, and `geo.ts` with a generated `geo-land.ts` for the three geographic components.
- **Land data.** `npm run geo` reduces Natural Earth's public domain 1:110m land to about 2 KB: islands under 10,000 km² dropped, geometry simplified, coordinates quantized to a quarter of a degree, and the result encoded as one string. `test/geo.test.ts` pins the source, the size, and a set of land and ocean points.
- **Aurora** keeps every prop and gains arc, folds, horizon, and rays. It now draws layered curtains with a sharp lower border, light fading upward, and vertical rays that follow the folds, which is what distinguishes discrete aurora from a diffuse patch.
- **The globe** keeps every prop and gains land, ocean, graticule, and labels. Land draws as dots by default, because continents read that way at 390 px where hairline coastlines scribble. Outlines are an option, the sphere gains a limb, and the dots brighten toward the centre.
- **Review photographs.** Four public domain photographs live beside verify, one each of a person, a building, a landscape, and an object. Verify and the thumbnails inject one into every image component, so the catalog stops showing the same sphere nineteen times. They never reach a generated file, a demo, or a copy snippet, and every component still looks finished with no image at all.
- **A `flow` stage** lets a section take its natural height above a floor, so a hero is never clipped at 390 px.
- **Verify** gains a check that a component requests nothing beyond its own page, a captures pass at 390 px on paper, a slot limit so parallel builders do not thrash, and a `section` group that checks overflow, focus order, typography, and clipping at 390 px.

## Wave 4: 36 primitives

No new categories and no budget changes.
- **Dither:** temporal, reveal, noise, waves, stipple, crosshatch, contours, and poster. At least four animate, all seeded.
- **Effects, all working on an image:** edge trace, photocopy, risograph, channel shift, pixel displace, slit scan, block glitch, and scan reveal. The last four animate from a precomputed plate, never by reading pixels back each frame.
- **Shaders:** caustic field, contour flow, pixel plasma, ripple field, voronoi drift, tunnel grid, liquid metal, and scan beam. All WebGL2 through `lib/gl.ts`, with a still CSS fallback.
- **Data:** scatter, heatmap, radar, gauge, bullet, candlestick, timeline, and waterfall. Each takes JSON, offers an SVG and a glyph look, and carries a hidden data table.
- **Immersive:** world map, city grid, orbit view, and terrain field, all on a 2D canvas.

Each component follows a published method, cited in its credits. `sources/wave-4.json` holds the briefs.

## Wave 5: ten heroes

Editorial, gallery, mission control, product launch, saas dashboard, agency portfolio, event poster, docs, split image, and manifesto. Each is a section that wraps the page's own content, takes its calls to action as links, inherits the page's typography, composes at most three components from earlier waves, and fits the 16 KB sections budget.

They are built from captures, so 0003 governs them. A researcher shortlists candidates as text under 0009, Rish picks and captures, one spec agent per hero writes a code free spec from the capture, Rish approves it, and a separate builder sees only the spec. The session that orchestrates the work never opens a capture and never writes a hero.

## Checks added

| Check | Where |
|---|---|
| Shortlists hold only their table, with Dribbble shot links and no media, markup, or code host | `test/sources.test.ts` |
| Wave briefs are well formed, and a spec based brief adds nothing to its spec | `test/sources.test.ts` |
| An inspired-by credit and a spec each require the other, and the spec's credit line matches | `test/invariants.test.ts` |
| A spec follows the template and holds no code, color literal, or image | `test/invariants.test.ts` |
| No tracked image or video outside the brand files and the review photographs | `test/invariants.test.ts` |
| A section composes only earlier work, and at most three cores | `test/compose.test.ts` |
| Facets agree with what the component is: animated, image, webgl, shader, canvas, interactive, chart, dither | `test/meta.test.ts` |
| A hero flows, wraps content, and takes its actions as links | `test/meta.test.ts` |
| From wave 4, no credit points at a code host | `test/meta.test.ts` |
| Every chrome text tone clears 4.5:1 in both themes, and the focus ring 3:1 | `test/site.test.ts` |
| The theme script prefers a saved choice, then the system | `test/site.test.ts` |
| The review file decides every component in its wave, with none left to revise | `test/review.test.ts` |
| The land data matches its source | `test/geo.test.ts` |
| The photographs are licensed, small, and absent from every generated file | `test/photos.test.ts`, `test/generated.test.ts` |
| A component page requests nothing beyond itself | `npm run verify` |
| The theme, the facets, the collapse, the logo, the footer, and the mobile layout | `npm run check:site` |

## Verification

Before each merge: `npm run build:registry`, `npm run check`, a serial `npm run verify` over the pull request's components, and `npm run check:site`. The `build` job repeats the gate on macOS.

The final gate, once wave 5 lands: exactly 92 components in the catalog, every one inside its category budget, both shapes matching at both widths, generated files current, and no component requesting anything from the network.

## Not in this plan

- The rest of the wave 3 review notes, which are chart insets, the donut's labels, and shader flow's loudness. They wait for Rish's decisions on that wave.
- Four credits from waves 1 and 2 that point at github.com. The new rule starts at wave 4, and those are for Rish to look at later.
- Any change to a byte budget, a dependency, the license, the clean room, or branch protection. A component that needs one stops and says so.
