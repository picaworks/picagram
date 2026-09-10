# 0004: Components hold data, report events, and wrap children

Date: 2026-09-10. Status: accepted.

Context: The original contract allowed only scalars and arrays of numbers, with no events and no children. Sections need structured data such as pricing tiers and chart series. UI primitives need to report input and hold content. Three alternatives were rejected.
- **Data encoded as strings,** such as CSV or a small text format. Every core would need its own parser, and React users would lose types.
- **Callbacks passed into the core.** Functions break the JSON key that detects prop changes. They cannot travel through `window.PICA_PROPS` or a `postMessage`, and the catalog's inspector cannot set them.
- **Named slots through Shadow DOM.** A shadow root can never be removed, so destroy could not restore the host, and any child not assigned to a slot would disappear.

Decision:
- **Props are JSON values** (`Json` in `lib/types.ts`). A core never writes into a prop, and it compares data with `sameJson` from `lib/json.ts`.
- **Events** are CustomEvents named `pica:` plus the event name in lower case, dispatched on the host without bubbling through `emitter` in `lib/events.ts`.
  - `usePica` maps `on` props to these events.
  - It keeps functions out of the data it sends the core.
- **Controlled state** is `value: T | null`, where null means uncontrolled, plus a `default<Prop>` that is read once, at mount. A core emits only in response to input, so echoing a value back cannot loop.
- **Children** are the host's own children.
  - A core never writes to, moves, or removes a node it did not create.
  - It marks every node it adds with `data-pica`.
  - `meta.wraps` says whether a component decorates its content or treats each direct child as a panel.
  - `meta.host` lets a component mount on a real element, such as a button, so the browser's own keyboard and form behavior come for free.

Consequences:
- `test/meta.test.ts` checks that:
  - defaults survive a JSON round trip;
  - each controlled prop starts as null and has a default sibling;
  - a wrapper renders children exactly when `meta.wraps` is set;
  - a wrapper renders the host element the demo page mounts on.
- `lib/events.ts` is the only file that dispatches an event (`eslint.config.js`, `test/invariants.test.ts`).
- `npm run verify` enforces the rest in a browser:
  - it runs each declared interaction in both shapes and requires the same events;
  - it runs axe-core;
  - it puts probe children in every wrapping component, to prove they stay readable, reachable by Tab, on top, and untouched.
