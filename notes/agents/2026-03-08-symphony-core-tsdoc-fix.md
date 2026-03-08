# 2026-03-08: fix local Symphony tsdoc typing

- Bead: `dadeto-3iqu`
- Scope: resolve the current `npm run tsdoc:check` failures in `src/core/local/symphony.js` without widening into the broader typed-JS backlog.
- Change:
  - added a non-null type guard for parsed ready beads in `parseReadyBeads()`
  - tightened ready-state summary typing so `selectedBead` is explicitly non-null on the ready path
  - replaced the dynamic summary-dispatch object with explicit branch handling that TypeScript can narrow correctly
- Validation:
  - `npm run tsdoc:check` no longer reports failures for `src/core/local/symphony.js`
  - `npm test` passed with `468` suites and `2304` tests
- Follow-up:
  - remaining `tsdoc:check` failures are in unrelated browser capture, presenter, and toy files
