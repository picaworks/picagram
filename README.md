# Pica

ASCII-first components for React and plain HTML. Every component ships in two shapes: one React file that imports only `react`, and one HTML file that needs nothing. Both are generated from a single source and checked against each other in a real browser.

License: MIT + Commons Clause. See [LICENSE.md](LICENSE.md).

## Use a component

- **shadcn CLI:** `npx shadcn@latest add <registry url>/<slug>.json`. The URL is on each component's page.
- **Copy React:** one `.tsx` file per component. It imports only `react`, and needs no Tailwind and no `cn()`.
- **Copy HTML:** one self-contained `.html` file per component. It needs no build step.
- **Coding agents:** start at `/llms.txt`. Every component has a markdown twin at `/c/<slug>.md` with both files inline.

## What it looks like

Glyphs on a monospace grid, with tone measured from the ink each glyph actually puts down in the font in use. See [STYLE.md](STYLE.md) for the rules every component follows.

## License

MIT + Commons Clause, the same model React Bits uses. You can use the components in anything, including commercial work. You cannot sell or republish them as a component library or template pack. This makes Pica source-available rather than OSI open source.

## Credits

Every component names what it builds on, on its own page and in [CREDITS.md](CREDITS.md). Components built from a design reference are re-implemented from a written spec, and no code is copied.

## Contributing

Read [AGENTS.md](AGENTS.md) first, then [CONTRIBUTING.md](CONTRIBUTING.md). `npm run check` must pass before anything merges.
