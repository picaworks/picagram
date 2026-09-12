# 0009: References may be shortlisted by their metadata, and captures stay manual

Date: 2026-09-11. Status: accepted.

Context: 0003 rejected "collecting references from those sites automatically" without saying what collecting means. Wave 5 needs ten references for its heroes. Two are Dribbble shots with named authors, one is a design whose author is not yet known, and seven archetypes have nothing at all. Finding those seven by hand is the slowest part of the wave. What 0003 protects against is the original's code or its pixels reaching an agent or the repository, and a URL, a title, an author, and one sentence of direction carry neither. Two alternatives were rejected.
- **Letting the researcher capture the shots it shortlists.** That is the collection 0003 rejected, and a saved image invites a later agent to open it.
- **Leaving every search to Rish.** It stays available, and it is what happens for a reference he already has in mind, but it stalls seven heroes behind one person's browsing.

Decision:
1. A research agent may search the web and open a Dribbble shot page to read its title and its author. It may not open a page that shows code, which means 21st.dev, CodePen, sandboxes, component collections, repositories, registry entries, and Figma files.
2. It records each candidate in `sources/shortlists/wave-<N>.md`, in one table: the hero, the candidate number, the title, the author, the shot URL, one sentence of direction of at most 160 characters, and an empty Pick.
3. It never saves, screenshots, downloads, or links an image or a video. It never uses a browser pane, whose screenshots would themselves be captures, and it never uploads anything to a reverse image search.
4. Rish writes `yes` against at most one candidate per hero and captures that reference himself into `sources/inbox/`, as 0003 already requires. Only then does a spec agent start.
5. Provenance research for a capture Rish already holds works the same way, by text search alone. It reports an author and a URL, and Rish confirms the match before any spec is written.
6. Algorithm research cites papers, standards, and authoritative documentation. From wave 4 on, no `technique` or `inspired-by` credit points at a code host or a component collection.

This narrows the second alternative 0003 rejected. Collecting the reference itself stays rejected, and collecting a pointer to it is now allowed. 0003 is otherwise unchanged and stays in force.

Consequences:
- Every wave built from captures leaves one committed shortlist of plain text, and the trail from a candidate to a component reads shortlist, inbox row, spec, credit.
- A design whose author cannot be established never becomes a component. Each shortlist carries fallback candidates, so that costs no time.
- `test/sources.test.ts` fails if a shortlist holds anything but that table, if a URL is not a Dribbble shot link, if an image, an HTML tag, a code fence, or a code host appears in it, or if a hero carries more than one pick.
- `test/invariants.test.ts` fails if any tracked file is an image or a video outside the brand files and the review photographs.
- `test/meta.test.ts` fails if a credit from wave 4 on points at a code host.
