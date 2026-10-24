# Atlas Context Snapshot Acceptance

## Experiment Design Record Slice — 2026-10-24

### Machine-Checkable Criteria
- [x] Strict V1 proposed design schema requires an attributed author, optional agent, creation time, stable context snapshot ID, exact mechanism/component/model identity, typed hypothesis and evidence citations, explicit uncertainty and rival/null hypotheses, discriminating inputs/measurements/interventions/controls, rival expected outcomes, a weakening condition, and a bounded reproducibility envelope.
- [x] Designs remain explicitly `proposed` and `untested`; the schema has no synthesized measurement fields.
- [x] Resolved references must match the selected mechanism; unresolved references retain source, author, design ID, and timestamp through V3 identity claims.
- [x] Duplicate/self references, unknown mechanisms/components, cross-checkpoint and model-identity mismatches, malformed records, and invalid resolved/unresolved citations fail deterministically.
- [x] V7 exports and imports design records immutably while legacy V2–V6 import remains supported; a V6 export refuses to silently drop non-empty designs.
- [x] Interpretability suite: 22 suites / 171 tests; changed `index.js` coverage is 100% statements, branches, functions, and lines.
- [x] `npm run tsdoc:check`, focused lint, `npm run build`, and `npm run check` passed locally.
- [ ] Exact-head GitHub Full Check passes.
- [ ] Evidence-sensitive design proposal generation (or explicit insufficient-context result) is a separate follow-up; this record slice intentionally adds no inference or storage submission service.

### Evidence Collection
- Schema, validation, append, and bundle formats: `src/core/interpretability/index.js`.
- Regression coverage: `test/core/interpretability/experimentDesign.test.js`, `test/core/interpretability/interpretability.test.js`, and `test/core/interpretability/researchBundleV2.test.js`.
- Retrospective: `notes/agents/2026-10-24-atlas-experiment-design-record.md`.
- Bead: `dadeto-jeod`.

### Local Validation — 2026-10-24
- Full interpretability coverage run passed: 22 suites / 171 tests; `src/core/interpretability/index.js` had 100% statements, branches, functions, and lines.
- `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 local gates, including six impact-test shards. The run used lockfile-matched dependencies and redirected Jest’s cache off the constrained `/tmp` filesystem.
- `npm run build` completed successfully.
- `npm audit fix --package-lock-only` updated two vulnerable transitive lockfile resolutions; the subsequent audit gate reported zero vulnerabilities.
- Exact-head GitHub Full Check remains separate and has not yet been rerun for this change.

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
