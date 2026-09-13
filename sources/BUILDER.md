# Builder brief

You build one Picagram component end to end, in the repository your prompt names. Up to sixteen builders work in that checkout at the same time, one component each, so stay inside your own component directory.

## Read first, in this order

1. `AGENTS.md`: the rules that must never be broken.
2. `STYLE.md`: how every component looks, including the sections on gradients and shaders, charts, and controls.
3. `docs/architecture/contract.md`: what a component is made of, how events, children, the palette, shaders, and composition work, and the shared runtime in `lib/`.
4. `docs/adding-a-component.md`: the kinds of component and the reference for each.
5. The reference for your kind, all three files. Match its shape.

   | Kind | Reference |
   |---|---|
   | glyph grid | `registry/ascii/ascii-image/` |
   | text run | `registry/ascii/ascii-reveal/` |
   | canvas | `registry/dither/dither-image/` |
   | CSS overlay | `registry/effects/scanlines/` |
   | control with events and children | `registry/ui/button/` |
   | shader | `registry/shaders/mesh-gradient/` |
   | chart | `registry/data/bar-chart/` |
   | immersive | `registry/immersive/globe/` |
   | section, which composes other cores | `registry/sections/hero/` |

6. The `lib/` modules your component uses. Read them instead of guessing their APIs.
7. Your brief: the entry with your slug in the wave file your prompt names, such as `sources/wave-4.json`.

## Two kinds of brief

- **A technique brief** describes the component in prose and names the published methods it follows. You may read those sources, the WAI-ARIA pattern for a control, and MDN.
- **A spec brief** points at `specs/<your-slug>.md`, which is the whole design. Read "If your brief is a spec" below before you start.

## Rules

These are restated here because you start without the rest of the conversation.

- **Where you write.** Only inside `registry/<category>/<your-slug>/`.
  - Do not edit `lib/`, `scripts/`, `test/`, `docs/`, `src/`, `sources/`, config files, or any other component.
  - If `lib/` lacks something you need, write it inside your core and say so in your report.
- **Commands you do not run.** `npm run build:registry`, `npm test`, and `npm install`, because they touch or depend on files every builder shares. No git command either: writing one changes state that is not yours, and reading one tells you nothing true, since a dozen builders are changing this tree while you work. What you changed is what you wrote in your own directory.
- **No interactive browser.** The Browser pane is shared with the other builders, so a message you send there can land in someone else's tab. Check your work only with `npm run verify` and by reading its captures.
- **Nothing copied.** Write every line yourself.
  - Do not open or copy from any component library, repository, or page. That includes 21st.dev, React Bits, Magic UI, Aceternity, uiverse, CodePen, shadcn/ui, Radix, Headless UI, Paper Shaders, and Shadertoy.
  - You may read:
    - the technique articles named in your brief's credits;
    - the WAI-ARIA Authoring Practices pattern for your control;
    - MDN.
- **No dependencies.** No network requests in the component, no npm imports in the core, and no Tailwind classes or `cn()`.
- **Frames and randomness.**
  - Frames go only through `createLoop` from `lib/loop.ts`.
  - Randomness comes only from `createRng`, `createNoise`, or `hashSeed` with the `seed` prop.
  - Never call `requestAnimationFrame`, `setInterval`, or `Math.random` directly.
- **Code shape.**
  - One import statement per line.
  - A JSDoc line on every prop and every event.
  - Each field's type on one line.
  - Props are JSON values. Callbacks never enter a core: a core reports input with `emitter` from `lib/events.ts`, and the wrapper takes `Handlers<Events>`.
- **Names.** Every name in `lib/` is also a top-level name in your single React file. If verify reports that a name is declared twice, use the `lib/` export instead of your own copy, or rename yours.
- **GLSL inside a template literal.**
  - Indent every line. A line starting at column 0 with `const float` is read by the build as a JavaScript declaration and collides with another file's.
  - Only `lib/` snippets use the `pica_` prefix. Order them `${NOISE}${DITHER}${TONE}`.
  - Uniforms are floats named `u_<prop>`. Read an integer as `int(x + 0.5)`. There are no samplers and no textures.
  - Loops take constant bounds with `if (i >= n) break;`.
  - `gl_FragCoord` is y up. Use `1.0 - uv.y` for top down, and `pointerUv` from `lib/gl.ts` for the pointer.
  - The CSS fallback must ink more than one percent of the frame on both grounds.
- **An animated effect over an image** prepares once and draws forever. Use `createPlate` from `lib/pixels.ts`, and never read the whole image back per frame: verify fails any task over 50 ms. `registry/effects/scan-reveal-image/` is the reference, and its rule is worth copying exactly.
  - Keep every decision about what a pixel is in `prepare`, and every decision about where it goes in `draw`.
  - Anything that changes what a pixel is, meaning `src`, `fit`, `tone`, `contrast`, the palette, or your own per-pixel prop, prepares again. Anything that changes where it goes only redraws.
  - Size each plate to the host's own box, capped at 480 px on the longer side, so no frame has to fit or scale it.
  - Prepare before the loop draws its first frame, prepare again on a resize only when the plate's size actually changed, and turn `imageSmoothingEnabled` off for a plate holding one-bit dots.
- **The host and its children.**
  - Change host attributes and styles only through `styleHost` and `hostAttributes`, and restore them on destroy.
  - Never write to, move, or remove a node you did not create.
  - Mark every node you add with `data-pica`.
  - A component that takes children sets `meta.wraps`.
- **Ready and accessible.**
  - Set `host.dataset.picaReady = "true"` only after the first complete frame is on screen.
  - The core owns the host's accessibility attributes. Use `lib/a11y.ts`, and follow the WAI-ARIA pattern for a control, including its keyboard behavior.
- **Motion.**
  - An animated component extends `MotionProps` and passes `paused`, `time`, and `fps` to the loop.
  - The same `seed` and `time` must always draw the same pixels.
  - Reviewers see the frame at `time` 1200 first (or at `meta.capture`), so make it a good one.
- **Color.**
  - Never hard-code a color: lint and a test both reject color literals in `registry/`.
  - Read the palette through `lib/palette.ts`.
  - List in `meta.palette` the tokens your default look draws with. Verify checks that each one changes the picture.
  - Check that it looks intentional on both the dark ground and the light one.
- **Typography.** Prose inherits the page's font. Use mono (`GRID_FONT` from `lib/font.ts`) only for glyphs, labels, numbers, and code. Never set a display font inside a component.
- **Composition,** for sections only.
  - Import other cores as `import * as <slugInCamelCase> from "../../<category>/<slug>/core";`.
  - Import at most three cores, each from an earlier wave than yours, and none that another builder is writing now. Sizes are in `public/catalog.json`, and your section must still fit its budget. `test/compose.test.ts` checks both rules.
- **Prose.** JSDoc and meta use plain sentences, with no dashes used as punctuation and no marketing words. The meta description is one sentence ending in a period, under 160 characters.
- **Credits.** Use the credits in your brief. If the brief says original, set `original: true` and `credits: []`.

## Work loop

1. **Write** `core.ts`, `index.tsx`, and `meta.ts`. `meta.wave` is the wave number in your prompt. Declare `facets` from the twelve in `lib/meta.ts`, which are the only filters the catalog offers; `test/meta.test.ts` decides the mechanical ones, such as animated and webgl, so match what your component actually is. Add `interactions` for anything a user operates, `controlled` for a value prop, and `demo` when the defaults alone would show an empty or closed state.
   - If your component has a hover state, declare a `hover` step naming the element that changes. Verify measures that element's own box and fails when it changes 1% or less, so the step must name the thing that tints, not its container.
   - If your component answers the pointer, declare `pointerMove` steps with `x` and `y` as fractions of the host from 0 to 1, y measured downward. A list holding one runs with the clock unpinned, which is the only way a core that tracks the pointer while it animates will answer at all.
2. **Lint:** `npx eslint registry/<category>/<your-slug>`, and fix everything it reports.
3. **Typecheck:** `npx tsc --noEmit --tsBuildInfoFile .pica/tsc/<your-slug>.tsbuildinfo 2>&1 | grep "registry/<category>/<your-slug>"` must print nothing. The build info file is yours alone, because every builder shares one repository and one shared cache would have them overwriting each other. Other builders' files may show errors while they work.
4. **Verify:** `npm run verify -- <your-slug> --quick`, fixing until every check passes. It checks:
   - that both shapes match, on the dark and the light ground;
   - the accessibility of the host, with axe-core;
   - that destroy restores the host;
   - the palette;
   - your scripted interactions;
   - for a shader, the software renderer, a lost context, the fallback, and that your own canvas inks and advances on the real WebGL2 path rather than quietly showing its CSS fallback.

   The machine is busy, so if only "animates" or "no long tasks" fails, run it once more before changing code.
5. **Look** at your captures with the Read tool:
   - `.pica/captures/<your-slug>/vanilla-1280.png`, on the dark ground;
   - `.pica/captures/<your-slug>/vanilla-1280-light.png`, on the light ground.

   Judge them against STYLE.md:
   - Does the default already look finished?
   - Is it calm and restrained?
   - Does it look intentional on both grounds?
   - Is anything cut off, empty, or broken?

   If something is not right, change the code and go back to step 4. Look at least once before you report.
6. **Finish:** run the full `npm run verify -- <your-slug>` once, then read `.pica/captures/<your-slug>/vanilla-390.png`, which only the full run writes, and judge it the same way at phone width.

## If your brief is a spec

Some components re-implement a design Rish captured. He is the only person who sees the original, and you work from a written description of it, never from the thing itself. See `docs/decisions/0003-clean-room-soft-clone.md`.

- **Your design input is `specs/<your-slug>.md` and nothing else.** Where the spec is silent, decide within `STYLE.md` and say what you decided in your report.
- **Do not go looking for the original.** Do not open `sources/inbox/` or `sources/shortlists/`, do not open the URL in the spec's credit line, and do not search for the design, its author, or pictures of it.
- **The credit line exists so you can credit it.** Copy it into `meta.credits` as an `inspired-by` credit, and set `meta.spec` to `<your-slug>.md`.
- You still read Picagram's own code: `lib/`, the reference for your kind, and any core you compose.

## Report, as your final message

- The slug, the category, and the final verify table, pasted as printed.
- The size in KB, against the category's budget.
- What it looks like at its defaults: one sentence for the dark ground and one for the light ground.
- Anything you compromised on or could not do.
- Any `lib/` change you would propose. Do not make it.
