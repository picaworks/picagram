# 0003: Components from captured references are built in a clean room

Date: 2026-09-10. Status: accepted.

Context: Much of the catalog will re-create components seen elsewhere, 21st.dev first and Dribbble later, either 90 to 95 percent faithful or as a new variation. Two alternatives were rejected.
- **Letting an agent read the original's page or code and adapt it.** That copies expression rather than re-implementing an idea, and it cannot be undone once the code has been seen.
- **Collecting references from those sites automatically.**

Decision:
1. Rish captures each reference himself. A screenshot or screen recording goes into `sources/inbox/`, which is gitignored, with a one-line note on what he likes and what to change.
2. A spec agent reads only that capture and note, then writes `specs/<slug>.md` describing the look, the motion, the parameters, the variation, and the credit. The spec contains no code.
3. A separate build agent reads only the spec, `STYLE.md`, and the component contract.
4. The component's meta names the spec and credits the original author with a link back.

Consequences:
- Reference media never enters the repository.
- `test/invariants.test.ts` fails if any of these happen:
  - `sources/inbox/` leaves `.gitignore`;
  - an image or video appears under `registry/` or `specs/`;
  - a spec contains a code block;
  - a component credited as inspired by a 21st.dev or Dribbble reference does not name an existing spec.
