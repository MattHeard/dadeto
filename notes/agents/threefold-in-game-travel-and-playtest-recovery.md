# THREEFOLD in-game travel and playtest recovery

- Unexpected hurdle: Existing page tests treated `?scene=` URLs as the way to select authored regions, and those tests hid the remaining URL-navigation assumptions after scene queries were removed from the page.
- Diagnosis: The scene query parser and authored `?scene=` links were removed; a repo-wide search and the first aggregate check then exposed tests still relying on the old routing contract.
- Chosen fix: Ignore scene query parameters, expose all authored regions through the page's in-game travel menu, switch the runtime scene while retaining independent region saves, and update route-specific tests to inject scenes directly. Add immediate input acknowledgments and an accessible startup/render failure recovery message.
- Verification: Focused Threefold and presenter tests pass (81 tests); `npm run check` passes all 10 gates; `npm run build` succeeds; `git diff --check` is clean.
- Next-time guidance: Keep query-string regression coverage that confirms `?scene=` leaves the default region selected. Use explicit scene injection only for unit tests of authored region copy; production travel belongs in the game UI.

## 2026-10-23 — Remove URL scene guidance

- Unexpected hurdle: The implementation already ignored scene queries and exposed every authored region in its in-game travel menu, but the manual, harness, spec, acceptance history, failure catalog, and several test fixtures still described or implied URL-based scene selection.
- Diagnosis: Searched the Threefold source/docs/tests for `?scene=` and found that only a default-scene regression and stale docs/fixtures remained; no runtime URL parser or scene deep links remain.
- Chosen fix: Document the in-game travel menu as the sole region selector, remove stale query-string fixture data from explicit-scene tests, and expand the regression to assert every former scene slug leaves the default Broken Gate active.
- Verification: Focused tests passed (5 suites / 53 tests); `npm run check` passed all 10 gates after its six-shard local fallback; `npm run build`, `npm run manuals:check` (79 manuals), and `git diff --check` passed.
- Next-time guidance: Keep one parameterized regression for all legacy scene slugs and direct callers through in-game controls; don't reintroduce region deep links in docs or UI.

## 2026-10-23 — Close coverage gaps in recovery and travel

- Unexpected hurdle: The first exact-head Full Check failed its 100% branch-coverage gate, and the narrower tests did not exercise every recovery and travel branch.
- Diagnosis: The coverage report identified the uncovered arms; focused recovery tests also exposed that an initialization error could be overwritten by the first draw and that teardown needed a safe no-op disposer when bindings failed.
- Chosen fix: Preserve and redraw the startup recovery state, make teardown safe, remove impossible travel-label fallbacks, and exercise all ten authored destinations through the actual in-game travel controls.
- Verification: Focused tests passed (4 suites / 80 tests); the prior full check passed all 10 gates, including full unit coverage and 12 local Playwright cases. Final `npm run check` with the ten-destination matrix passed all 10 gates, including six serial Jest shards; `git diff --check` passed. `npm run build` was attempted but the sandbox denied removal of the generated `public/` directory; retry with reviewed write permission before recording build evidence. Exact-head Actions remains required before closing the Bead.
- Next-time guidance: When coverage reports an uncovered branch, inspect the exact report, add a focused behavior test, and run a destination matrix through the user-facing control rather than testing only its mapping helper.
