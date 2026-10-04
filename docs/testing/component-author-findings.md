# Component author findings

This run completed the remaining 27 assignments in the 36-component release. Six native author slots each received one prepared packet and three starter files. The coordinator owned integration, generated output, lint, types, browser checks and Git. All 81 author source files were produced, all 27 components passed full browser verification, and the 741 preserved source files matched their hashes. The original 256 tracked component sources have no changes in this run.

The pilot reached its first source write after 232 seconds and its first saved desktop render after 260 seconds. Across the 27 assignments, the median first write was 226 seconds, with a range of 95 to 383 seconds. Packets were 23 to 34 KB. Authors reported 74 read calls and 43 write calls, using their individual command or tool conventions. Fifteen components needed coordinator source revisions, usually metadata contracts or strict indexed-access guards. One patch-format rejection made no mutation.

The earlier workflow recorded first writes after 780, 966 and 1020 seconds, with 39 to 47 discovery calls. These are observations, not a controlled comparison. Model selection and input shape both changed, and exact native launch timestamps were missing from the earlier run. Packet bytes are not total model input context. Capture birthtimes measure the first saved ready/parity render, not every check finishing.

## Keep the handoff small

Use `.claude/skills/component-author/prepare.mjs` and the current contract. Assign one component per isolated slot, preload one local structural reference, and let the author read only an exact missing runtime API. Preserve the selected model, reasoning effort and available capacity in machine-readable receipts. Reuse a completed slot only for a new explicit assignment.

A first-write status is telemetry. Integrate the frozen final triplet, since an author can still repair an edge case before its final response. Never recopy a worker triplet over coordinator repairs. Record source revisions separately from author writes.

Run scoped lint and the existing browser verifier, generate both outputs, and check standalone React types. Regular site typechecking can miss strict errors in a new ungenerated source. Guard dynamic array indices, even inside loops whose bounds look sufficient.

Metadata must match default kinds. A nullable controlled value does not fit a JSON inspector control; omit that control or use the matching numeric contract. Numeric controls need min, max and step. Include exactly one static or animated facet. The image facet follows the repository's supplied-image fixture rule, and canvas follows the core's own canvas runtime import. Keep descriptions to one sentence under 160 characters. Match the wrapper host explicitly for an inline stage.

For independent controlled fields, provide isolated `controlledInteractions` probes as well as a complete event/parity interaction. A held field should not fail because the full sequence changes another uncontrolled field. Keep the full navigation sequence checked in both shapes. Demonstrations for content decorators should supply meaningful child content so the local behavior is visible.

The timing and per-component receipts are in `docs/evidence/component-author-2026-10-04.json`. Publication is complete only after the protected PR build, normal merge, Pages deployment and direct live catalog verification succeed.
