# Dynamic MUD Acceptance

## Machine-Checkable Criteria
- [x] Known `look`, `ring the bell`, and `open the floodgate` commands execute through the validated DSL without providers.
- [x] With injected providers, unknown commands follow propose → build → validate → isolated dry-run → predicted-world comparison → register → execute. Known commands bypass providers, command runs serialize, and registered commands reuse their verified program.
- [x] Invalid DSL, invalid or mismatched predicted worlds, stale snapshots, failed execution, empty commands, and provider exceptions reject safely without changing the live graph or leaving an unverified command registered.
- [x] Tests use deterministic injected providers and cover the complete orchestration without making a model or network call.
- [x] Scoped evaluator for `dynamicMud.js`, `game.js`, `page.js`, and `unknownCommandRuntime.js` reports 100% statements, branches, functions, and lines; ESLint/core-parse pass; zero clones.
- [x] `npm run check` exits 0 (10/10 aggregate checks; local impact test selection runs the four related suites).
- [x] `npm run build` emits the standalone `/dynamic-mud/` route for this orchestration change.
- [x] `npm run manuals:check` exits 0 (82 toy manuals).
- [x] `git diff --cached --check` exits 0 after staging.

## Evidence Collection
- Command log path: Bead `dadeto-vd2q` comments and GitHub Actions run for the implementation commit.
- Generated artifacts: Jest and check output under ignored `reports/` paths.
- Test report path: `reports/check/` as emitted by the repository check runner.
- Exact-head GitHub Full Check `39957239921` failed before test execution at `npm run threefold:spec:check`: Actions has no `NOTION_THREEFOLD_SPEC_READ_TOKEN`. Terraform Validate `39957239945` passed. Full CI coverage remains unverified until the dedicated read-only Notion token is configured.

## 2026-10-23 Unknown-command orchestration slice
- Bead: `dadeto-vd2q`.
- `npm run check:impact:run -- --files src/core/browser/game/dynamic-mud/dynamicMud.js src/core/browser/game/dynamic-mud/game.js src/core/browser/game/dynamic-mud/page.js src/core/browser/game/dynamic-mud/unknownCommandRuntime.js test/core/browser/game/dynamicMud-game.test.js test/core/browser/game/dynamicMud-page.test.js test/core/browser/game/dynamicMud-unknownCommandRuntime.test.js` passed: four related suites / 35 tests; ESLint, core-parse, and duplication passed; all four coverage metrics were complete for each of the four changed core files.
- `npm run check` passed all 10 local gates. It selected the same four related suites; this is the fast local check, not full CI coverage.
- `npm run build` passed and copied the `/dynamic-mud/` page and all core modules. `npm run manuals:check` passed (82 toy manuals).
- The combined MUD and Threefold navigation test run passed six suites / 93 tests. Threefold route coverage confirms each destination is reached through the in-game travel control without changing the URL, and `?scene=` does not select a region.
- Exact-head GitHub Full Check `39957239921` failed before test execution at `npm run threefold:spec:check`: Actions has no `NOTION_THREEFOLD_SPEC_READ_TOKEN`. Terraform Validate `39957239945` passed. The local fast check is not full-coverage evidence; full CI coverage remains unavailable until the dedicated read-only Notion token is configured.

## Pass/Fail Rules
This loop adds a provider-injected safe orchestration boundary, but the page still has no deployed provider wired in. Full Notion acceptance remains open until the default-off integration with the billed chat proxy is implemented and safely configured. No model call or billable request has been made.
