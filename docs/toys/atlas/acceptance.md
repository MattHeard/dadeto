# Atlas Context Snapshot Acceptance

## Machine-Checkable Criteria
- [x] Full interpretability Jest suite passes with both changed core files at 100% statements, branches, functions, and lines.
- [x] Stable snapshot IDs, content changes, typed records/edges exactly once, page/window continuation, empty/complete/capped states, malformed bounds/cursors, unknown mechanisms, invalid digests, and permission forwarding have regression coverage.
- [x] `npm run tsdoc:check` exits 0.
- [x] `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` exits 0 across all 10 gates and six test shards (1,042 suites / 7,585 tests).
- [x] `npm run build` exits 0.
- [ ] Exact-head GitHub Full Check passes.

## Evidence Collection
- Focused suite: `test/core/interpretability/graph.test.js`, `test/core/interpretability/researchServiceV1.test.js`.
- Full interpretability suite: `test/core/interpretability/` (21 suites, 165 tests).
- Coverage artifact: `reports/coverage/coverage-summary.json` (100% across all four metrics for `index.js` and `researchService.js`).
- Retrospective: `notes/agents/2026-10-23-atlas-context-snapshots.md`.
- Bead: `dadeto-ekqw`.

## Local validation — 2026-10-23
- Full interpretability coverage command passed: 21 suites / 165 tests; both changed core files have 100% statements, branches, functions, and lines.
- `npm run tsdoc:check`, targeted ESLint, `npm run manuals:check` (84 manuals), `npm run build`, and `git diff --check` passed.
- `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates; audit reported zero vulnerabilities and duplication reported zero clones. This fast check is local impact/static evidence, not full coverage or CI evidence.
- Exact-head Full Check remains pending until this change is committed and pushed.

## Pass/Fail Rules
Pass this bounded loop only when required local checks pass, exact outcomes are recorded in Beads, repository memory is present, and the change is landed. This slice does not complete Atlas experiment design, persistence, or scripted-agent acceptance.
