# A bounded composition proof

The lab at `public/lab/composer.html` tests whether Picagram's generated parts can make a useful, portable page. It offers seven practical parts: article lead, quote band, stats KPI, event schedule, accordion, contact panel, and button. A starter page contains the article lead, quote band, and schedule. The UI holds a vertical stack of up to twelve instances, with native drag insertion and reordering and ordinary Add, Up, Down, and Remove buttons for keyboard use. Preview widths are 1280, 768, and 390 pixels, with ink and paper grounds.

## Data and isolation

The in-memory composition is an ordered array of `{ id, slug, props }`, plus title and ground. IDs are stable during the editing session and unique for each instance. Source definitions are an allowlisted map loaded from the same origin's `../v/<slug>.json`; the editor does not fetch outside the local catalog. Stats use `countUp: false` for immediately readable metrics. Other parts retain their generated defaults and demo children. Reload resets the session.

The preview is a single `srcdoc` iframe with `sandbox="allow-scripts"`, without same-origin privileges. Its real viewport width changes independently of its display scale. A source-window and revision check accepts only its own readiness message. Rebuilding the frame tears down the previous document and its component listeners. Every generated bundle is enclosed in a separate function scope. `lib/host.ts` keeps `globalThis.__picaSerial` shared across bundle copies, giving every core scope and ARIA relationship a distinct ID, including children composed by a section.

## Export pipeline

Download and Copy HTML use the same assembled document as the preview. The pipeline renames each generated `id="pica"`, its `#pica` CSS selectors, and its `getElementById("pica")` mount lookup to the instance ID. It also names the generated stage class per instance and substitutes an explicit props object for the initial `window.PICA_PROPS` expression. Core code and its runtime scope mechanism remain intact. Small outer layout rules replace the single-demo full-height stage with page flow and add spacing to bare stats and accordion parts.

The result embeds the generated HTML, CSS, and JavaScript, the complete project license, and a JSON composition manifest naming each generated JSON and source core. It opens directly from disk. The implementation handoff includes the complete HTML, order, props, ground, source paths, and the shared-serial rule. It asks the receiving agent to wire application actions explicitly: button press and contact send remain local events, and the demo form does not send a network request. Clipboard failure exposes a selectable textarea.

## Evidence and next milestone

An isolated headless Chromium session and disposable loopback server verified keyboard add, move, and remove; actual library drag insertion and stack drag reordering; empty and twelve-instance states; repeated article hosts and twelve repeated buttons; scoped CSS and unique DOM/ARIA IDs; six preview and six direct-file width/ground combinations; copied HTML and handoff contents; and download equality with copied HTML. Exported accordion, button, and contact interactions worked. There were no page errors, horizontal page overflow, external editor requests, or network requests from the file export. Screenshots and the detailed report are disposable QA evidence in `/tmp/.pica/composer/`; the verification script is `verify.mjs` there. The agent-browser CLI was unavailable, so the installed Playwright browser performed the checks.

This is an exploration, not a Figma replacement. It has no arbitrary positioning, nested layout, content inspector, undo, project storage, or round-trip import. Bundles repeat their runtime code, so exports grow with instance count. The renaming adapter deliberately understands only the current generated shape and rejects missing hosts at load time. The next useful milestone is a versioned composition JSON save/import flow with a schema check and one selected-instance content/props inspector. That would test reusable handoffs before expanding the catalog or adding a canvas editor.
