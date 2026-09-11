# 0008: The public name is Picagram; the code keeps the prefix pica

Date: 2026-09-10. Status: accepted.

Context: Pica was a codename, and npm's "pica" is taken. Rish picked Picagram for the public name, with the domain picagram.dev. A pica is a unit of type, and "-gram" means something written or drawn, so the name reads as a picture made of type. The rejected alternative was renaming the code along with the product: `--pica-*`, the `pica:` events, `data-pica`, and `window.PICA_PROPS` would all become `picagram`. That touches every component, every generated file, and every page that already sets a palette, for no gain, since a prefix only has to be short and unlikely to collide.

Decision: The site, the README, `llms.txt`, the shadcn registry, the link preview, the license, and the repository say Picagram. The wordmark is "Picagram" in Jacquarda Bastarda 9, traced from the font into `src/lib/logo.ts`. The code keeps `pica`: the custom properties, the event names, the attributes, the `PICA_PROPS` global, `usePica`, and the npm package name, which is private.

Consequences:
- Internal docs still say Pica in places. It is the same project.
- Moving the site to picagram.dev follows the steps in `docs/architecture/site.md`.
