# Dynamic MUD Acceptance

## Machine-Checkable Criteria
- [x] The focused DSL, game and page suites pass: `npm run test:impact -- --files test/core/browser/game/dynamicMud.test.js test/core/browser/game/dynamicMud-game.test.js test/core/browser/game/dynamicMud-page.test.js`.
- [x] `npm run check` exits 0 (10/10 aggregate checks; six impact shards).
- [x] `npm run build` emits the standalone `/dynamic-mud/` route.
- [x] `npm run manuals:check` exits 0 (82 toy manuals).
- [x] `git diff --check` exits 0 after staging.
- [x] Scoped evaluator reports 100% statements, branches, functions, and lines for both new core modules; zero clones.
- [x] The known `look`, `ring the bell`, and `open the floodgate` commands execute through the validated DSL without a provider; unknown commands do not mutate the graph.

## Evidence Collection
- Command log path: Bead `dadeto-jzup` comment and CI run for the commit.
- Generated artifacts: Jest and check output under ignored `reports/` paths.
- Test report path: `reports/check/` as emitted by the repository check runner.
- Exact-head full CI is expected after this change is pushed; the local fast check is not full-coverage evidence.

## Pass/Fail Rules
This loop covers a playable known-command slice. Full Notion acceptance remains open until unknown commands flow through propose, build, isolated dry-run, validation, registration and execution using the deployed billed chat proxy. No model call or billable request has been made.
