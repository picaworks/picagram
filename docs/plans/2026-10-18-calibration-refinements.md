# Calibration refinements

Version: 1. Date: 2026-10-18. Status: approved by Rish in chat.
Baseline: ec935da8adbcb33e2a1c6feb99210b5b61b045a6, matching the live deployment. Work is integrated on codex/calibration-refinements. The original checkout and its harness edits are preserved. No Goal was requested.

## Scope and requirements

- REQ-01: Archive Cyberpunk Hero from ordinary catalog and agent discovery while preserving its source, direct hash link, generated React and HTML, markdown twin and install URL.
- REQ-02: Refine Caustic Field and Shader Flow with quieter defaults and named presets that preserve their existing visual identities and WebGL fallback.
- REQ-03: Make ASCII Wave Tank show developed waves immediately, with understandable open-water and interference presets. Preserve deterministic seeking and the ability to start at time zero.
- REQ-04: Give Engraved Relief Image clearer defaults, named light/depth presets, and a self-contained real photograph example with source credit.
- REQ-05: Put presets before detailed controls. Selecting one updates the preview and both exported formats together, retains a supplied image or accessible label, and leaves manual adjustment available. Preset metadata contains only JSON props and no new facets.
- REQ-06: Keep all other component sources unchanged, especially Pixel Plasma, Voronoi Drift, ASCII Noise Field and ASCII Rain.

## Milestones and exit evidence

M1 implements archive metadata and compatibility, checked through generated output and default/direct-link site tests (REQ-01, REQ-06).
M2 refines the four components and adds presets, checked through full component verification in both shapes on ink and paper at all configured widths (REQ-02 through REQ-05).
M3 verifies the integrated catalog, preset selection and copied state, and archived links, with lint, unit/invariant/generated tests, registry and site builds, browser site checks, and rendered comparison against the calibration captures (all requirements).

## Boundaries

No deletion of source or legacy installation paths, no changes to the other assets, license, budgets or deployment settings. No external component code or design capture is used. The engraving demo uses an attributed NASA photograph embedded as a data URI, so it does not add runtime network requests. Shipping still requires the existing green PR gate.
