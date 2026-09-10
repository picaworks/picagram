# Builder brief

You build one Pica component end to end, in the repository at `/Users/rishabbalakrishnan/Documents/GitHub/pica`. About two dozen builders are working in this repository at the same time, one component each, so stay inside your own component directory.

## Read first, in this order

1. `AGENTS.md`: the rules that must never be broken.
2. `STYLE.md`: how every component looks.
3. `docs/architecture/contract.md`: what a component is made of, and the shared runtime in `lib/`.
4. `docs/adding-a-component.md`: the kinds of component, in preference order.
5. The reference component, all three files: `registry/ascii/ascii-image/core.ts`, `index.tsx`, and `meta.ts`. Match its shape.
6. The `lib/` modules your component will use. Read them instead of guessing their APIs.
7. Your brief: the entry with your slug in `sources/wave-1.json` or `sources/wave-2.json`.

## Rules

These are restated here because you start without the rest of the conversation.

- **Where you write.** Only inside `registry/<category>/<your-slug>/`. Do not edit `lib/`, `scripts/`, `test/`, `docs/`, `src/`, `sources/`, config files, or any other component. If `lib/` lacks something you need, write it inside your core and say so in your report.
- **Commands you do not run.** `npm run build:registry`, `npm test`, `npm install`, and any git command. They touch files the other builders share.
- **No interactive browser.** The Browser pane is shared with the other builders, so a message you send there can land in someone else's tab. Check your work only with `npm run verify` and by reading its captures.
- **Nothing copied.** Write every line yourself. Do not open or copy from any component library, repository, or page: not 21st.dev, React Bits, Magic UI, Aceternity, uiverse, CodePen, or similar. The technique articles named in your brief's credits are fine to read.
- **No dependencies.** No network requests in the component, no npm imports in the core, no Tailwind classes or `cn()`.
- **Frames and randomness.** Frames go only through `createLoop` from `lib/loop.ts`. Randomness comes only from `createRng` or `createNoise` with the `seed` prop. Never call `requestAnimationFrame`, `setInterval`, or `Math.random` directly.
- **Code shape.** One import statement per line, a JSDoc line on every prop, and props that are plain data.
- **Ready and accessible.**
  - Set `host.dataset.picaReady = "true"` only after the first complete frame is on screen.
  - The core owns the host's accessibility attributes. Use `lib/a11y.ts`.
- **Motion.**
  - An animated component extends `MotionProps` and passes `paused`, `time`, and `fps` to the loop.
  - The same `seed` and `time` must always draw the same pixels.
  - Reviewers see the frame at `time` 1200 first, so make it a good one.
- **Color.** Components inherit it. Glyphs use `--pica-fg` or the inherited color, never a hard-coded color, and must look intentional on both the dark ground and the light one.
- **Prose.** JSDoc and meta use plain sentences, with no dashes used as punctuation and no marketing words. The meta description is one sentence ending in a period, under 160 characters.
- **Credits.** Use the credits in your brief. If the brief says original, set `original: true` and `credits: []`.

## Work loop

1. Write `core.ts`, `index.tsx`, and `meta.ts`. `meta.wave` is the wave number of your brief's file.
2. Run `npx eslint registry/<category>/<your-slug>` and fix everything it reports.
3. Run `npx tsc --noEmit 2>&1 | grep "registry/<category>/<your-slug>"`. Other builders' files may show errors while they work, and only yours matter. Yours must be zero.
4. Run `npm run verify -- <your-slug> --quick` and fix until every check passes. It renders the React and HTML shapes in Chromium, on a dark and a light ground, and writes captures and thumbnails. The machine is busy with other builders, so if only the "animates" check fails, run it once more before changing code.
5. Look at your captures with the Read tool:
   - `.pica/captures/<your-slug>/vanilla-1280.png`, on the dark ground;
   - `.pica/captures/<your-slug>/vanilla-1280-light.png`, on the light ground.

   Judge them against STYLE.md.
   - Does the default already look finished?
   - Is it calm, in one ink color, and tonally coherent rather than glyph soup?
   - Does it look intentional on both grounds?
   - Is anything cut off, empty, or broken?

   If something is not right, change the code and go back to step 4. Look at least once before you report.
6. Finally, run the full `npm run verify -- <your-slug>` once. If only "no long tasks" fails, note it in your report. The machine is loaded, and that check is re-run later on a quiet machine.

## Report, as your final message

- The slug, the category, and the final verify table, pasted as printed.
- The size in KB.
- What it looks like at its defaults: one sentence for the dark ground and one for the light ground.
- Anything you compromised on or could not do.
- Any `lib/` change you would propose. Do not make it.
