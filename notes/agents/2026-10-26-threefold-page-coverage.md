# Threefold page coverage increment — 2026-10-26

## Diagnosis

The exact-head Full Check for `68bfd08` ran all 1,051 suites / 7,823 tests successfully but failed the 100% aggregate thresholds: statements 99.976%, branches 99.924%, functions 99.96%, lines 99.99%. Its report identified 12 uncovered branches in `src/core/browser/game/threefold/page.js`, in menu navigation and optional alternate-scene DOM updates.

## Fix and evidence

Added public menu regressions for scrolling the in-game guide, returning through its Back row, retaining the guide when selecting an instructional row, and creating a scene for every generated travel destination. The travel action is generated from the same fixed destination list, so the redundant silent null guard was removed; a ten-destination regression verifies the invariant. Added alternate-scene regressions for both present and missing optional DOM elements.

- `npm run check:impact:run -- --files src/core/browser/game/threefold/page.js test/core/browser/game/threefold-page.test.js test/core/browser/game/threefold-menu.test.js` — passed 7 suites / 85 tests; changed core file has 100% statements, branches, functions, and lines.
- `npm run check` — passed all 10 gates, zero clones; log `/tmp/dadeto-threefold-page-2026-10-26-check.log`.
- `npm run build` — passed; log `/tmp/dadeto-threefold-page-2026-10-26-build.log`.
- Exact-head Full Check `40309743141` on `68bfd08` — all 7,823 unit tests passed; aggregate coverage failed at 99.976% statements, 99.924% branches, 99.96% functions, and 99.99% lines. Detailed artifact `/tmp/dadeto-full-40309743141/full-check-40309743141/coverage/coverage-final.json`; remaining reported modules are Dynamic MUD page, Mosslight presenter, Tetracube page, Threefold return-tide presentation/projection/runtime, and OpenAI chat renderer.

No coverage threshold or exclusion changed. No provider, GCP, or paid operation was used.

## Next time

After pushing, use the next exact-head Full Check artifact to refresh the remaining-file list. Keep the global coverage Bead open until all four suite-wide metrics pass.
