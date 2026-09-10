# 0001: Pica is licensed MIT plus Commons Clause

Date: 2026-09-10. Status: accepted.

Context: A copy-paste library is only useful if people can put its code into anything, including commercial sites. PolyForm Noncommercial was rejected because it forbids exactly that use. Plain MIT was rejected because it lets anyone republish the whole catalog as their own product.

Decision: MIT with the Commons Clause rider, the model React Bits uses.
- `LICENSE.md` holds both texts.
- `package.json` says `SEE LICENSE IN LICENSE.md`.
- The README and the site footer say "MIT + Commons Clause".
- Every generated React and HTML file opens with a header that names the license and links to `LICENSE.md`. The rider only binds if the notice travels with the code.

Consequences:
- Pica is source-available, not OSI open source, and some companies' policies block Commons Clause code.
- `test/license.test.ts` fails if the label disappears from any of those four places, or if a generated copy lacks the header.
- In the React file, the header comes after `"use client"` and the imports. The shadcn CLI drops comments that precede `"use client"` when it installs a file. That was observed with shadcn 4.21.0 on 2026-09-10, when an earlier header placement disappeared on install. `test/license.test.ts` keeps the header where it survives.
