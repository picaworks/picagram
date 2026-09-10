---
name: pica-style
description: Rish's visual rules for Pica components and any interface built from them. Use when generating, reviewing, or restyling an ASCII, text-mode, dither, or pattern component, or a page that uses them.
---

# Pica style

This is the house style for every Pica component. It is short on purpose, because a model follows a few precise rules better than a long moodboard. Read all of it before writing or reviewing a component.

## The reference

The 1975 NASA Graphics Standards Manual crossed with the International Typographic Style: systematic, grid-based, and warm. Typography is the design. A component earns its place by being precise, not by being loud.

## Principles

1. **The grid is the medium.** Every glyph sits on a monospace cell grid. Nothing is placed off the grid, rotated, or scaled unevenly. Motion changes which glyph occupies a cell, never where the cell is.
2. **Tone comes from glyph density, measured.** Characters are ordered by the ink they actually put down in the font in use, measured at runtime by `lib/ramp.ts`, not by a hand-typed ramp. The fallback ramp is ` .:-=+*#%@`.
3. **One color does the work.** A component renders in one foreground color on the host's background. Tone is density, not hue. A second color is an accent that appears in one place, for one reason.
4. **Inherit, do not impose.** Components read `currentColor` and the host's font size by default, and expose `--pica-fg`, `--pica-bg`, and `--pica-accent`. A component pasted into a light site must look intentional without edits.
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
| amber | `#e8a020` | the one accent |
| muted | `#8d8d8a` | secondary text, 4.5:1 or better on ink |
| line | `#2c2c2c` | hairlines only, never text |

## Type

| Role | Stack |
|---|---|
| Grid, for all glyph rendering | `"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace` |
| Labels and metadata | `"IBM Plex Mono", ui-monospace, monospace`, uppercase, tracked +0.04em |
| Display, on pages only and never inside a component | `"Barlow Condensed", "Helvetica Neue", Arial, sans-serif` |

Never Courier or a typewriter face. Never a proportional face inside a grid.

## The signature move

Structure is drawn in text. Frames, rules, charts, and loaders are built from box-drawing, block, and braille characters rather than CSS borders and SVG, so a Pica component reads as a technical document that happens to move.

## Do not

- Cycle hues or use rainbow gradients. Hue does not carry tone here.
- Add glow, bloom, blur, drop shadows, or neon.
- Default to green on black. It quotes the Matrix; it is not a style.
- Add particles, sparkles, or confetti.
- Round the corners of anything a component draws.
- Produce glyph soup: random characters with no tonal logic behind them.
- Hand-order a density ramp in place of the measured one.
- Move faster than the eye can follow, or loop with a visible seam.
- Fetch fonts, images, or data from the network inside a component.
