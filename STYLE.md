---
name: pica-style
description: Rish's visual rules for Pica components and any interface built from them. Use when generating, reviewing, or restyling any Pica component (ASCII, text mode, dither, pattern, shader, chart, control, or section), or a page that uses them.
---

# Pica style

This is the house style for every Pica component. It is short on purpose, because a model follows a few precise rules better than a long moodboard. Read all of it before writing or reviewing a component.

## The reference

The 1975 NASA Graphics Standards Manual crossed with the International Typographic Style: systematic, grid-based, and warm. Typography is the design. A component earns its place by being precise, not by being loud.

## Principles

1. **The grid is the medium.** Every glyph sits on a monospace cell grid. Nothing is placed off the grid, rotated, or scaled unevenly. Motion changes which glyph occupies a cell, never where the cell is.
2. **Tone comes from glyph density, measured.** Characters are ordered by the ink they actually put down in the font in use, measured at runtime by `lib/ramp.ts`, not by a hand-typed ramp. The fallback ramp is ` .:-=+*#%@`.
3. **One color does the work.** A component renders in one foreground color on the host's background. Tone is density, not hue. A second color is an accent that appears in one place, for one reason.
4. **Inherit, do not impose.** Components draw with four palette tokens: `--pica-fg`, `--pica-bg`, `--pica-accent`, and `--pica-muted`. Unset, fg is the inherited text color, and components take the host's font size. A component pasted into a light site must look intentional without edits, and a brand is one palette away.
5. **Restraint over spectacle.** Motion is slow and low in amplitude. A background is quieter than the type above it. If a demo has to be watched to be understood, it is too loud.
6. **Motion is optional and pausable.** Under `prefers-reduced-motion` a component renders one well-chosen static frame. Offscreen and hidden-tab components stop. Anything that moves for longer than five seconds exposes `paused`.
7. **Dim, do not hide.** Secondary marks are dimmer, never absent. Every tone that carries readable text clears 4.5:1 against its background.
8. **Honest parameters.** Every prop does one visible thing, has a sensible range, and has a default that already looks finished. No prop exists only for completeness.

## Tokens

Demo defaults. Every one is overridable.

| Token | Value | Use |
|---|---|---|
| ink | `#0a0a0a` | dark ground |
| paper | `#f1f1ef` | light ground, and the foreground on ink |
| mint | `#13C4A3` | the one accent. It measures 8.91:1 on ink and 1.96:1 on paper, so it fills and marks but never sets text on paper. |
| muted | fg at 65% | secondary text. It clears 4.5:1 on both ink and paper, where the old fixed `#8d8d8a` reached only 3:1 on paper. |
| line | `#2c2c2c` | hairlines only, never text |

The palette tokens map onto these:

| Token | Default |
|---|---|
| `--pica-fg` | the inherited text color: paper on ink, ink on paper |
| `--pica-bg` | transparent, so the page's own ground shows |
| `--pica-accent` | mint |
| `--pica-muted` | fg at 65% |

Set the tokens on a page or a section, and every component follows. Pass `palette` to one component to set them on its host alone.

## Type

| Role | Stack |
|---|---|
| Grid, for all glyph rendering | `"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace` |
| Labels and metadata | `"IBM Plex Mono", ui-monospace, monospace`, uppercase, tracked +0.04em |
| Display, on pages only and never inside a component | `"Barlow Condensed", "Helvetica Neue", Arial, sans-serif` |

Never Courier or a typewriter face. Never a proportional face inside a grid.

Prose inside a component, such as a section's headline and copy, inherits the page's own font. Typography belongs to the page. Mono is for labels, numbers, and code.

## The signature move

Structure is drawn in text. Frames, rules, and loaders are built from box-drawing, block, and braille characters, so a Pica component reads as a technical document that happens to move. Controls and charts keep the same grammar where text cannot carry them:
- hairline rules;
- square corners;
- mono labels.

Every chart offers a glyph look beside its SVG one.

## Gradients and shaders

- Two tones within the palette, usually the accent and fg over the ground. Never a third hue, and never hue cycling.
- Slow. A field drifts; it does not churn.
- Often dithered or grained, so a gradient reads as printed rather than airbrushed. `lib/glsl.ts` has the Bayer matrix for this.
- Quieter than the type above it. A background at full intensity is a bug.
- Without WebGL2, a still CSS gradient in the same palette.

## Charts

- Hairline axes in muted, and no chart borders or background fills.
- Tick labels in mono with tabular figures, at round values (`niceTicks`).
- One accent series. Every other series is fg or muted.
- No legend where a direct label fits.
- A visually hidden data table carries the numbers for assistive technology.

## Controls

The catalog site's own controls are the model.
- **Surfaces.** One-pixel lines, square corners, and no shadows.
- **Type.** Labels inherit the page's font; mono is for values.
- **Focus.** A two-pixel accent outline, offset by two pixels, on `:focus-visible` only.
- **Disabled.** Dimmed to 45% opacity, never hidden.
- **Hover.** At most a fg tint of about 10%, or accent text.
- **Motion.** State changes are instant. Nothing transitions on load.
- **Behavior.** It comes from the platform where the platform has it: a real `<button>`, a native `<dialog>`, the Popover API.

## Do not

- Cycle hues or use rainbow gradients. Hue does not carry tone here.
- Add glow, bloom, blur, drop shadows, or neon.
- Default to phosphor green on black, meaning a saturated `#00FF00` on a pure black ground. It quotes the Matrix; it is not a style. A measured green such as the mint accent is not that, and is fine.
- Add sparkles, confetti, or any celebratory garnish. A seeded particle system is a different thing and is fine: it draws structure rather than decoration, takes its colors from the palette, moves slowly enough to read, and never glows or blends additively.
- Round the corners of anything a component draws.
- Produce glyph soup: random characters with no tonal logic behind them.
- Hand-order a density ramp in place of the measured one.
- Move faster than the eye can follow, or loop with a visible seam.
- Fetch fonts, images, or data from the network inside a component.
- Hard-code a color in a component. Read the palette.
- Set a component's own display font. The page owns typography.
