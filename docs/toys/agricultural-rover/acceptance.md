# Agricultural Rover Acceptance

## Machine-Checkable Criteria
- [x] `npm run test:impact -- --files test/core/browser/game/agriculturalRover.test.js test/core/browser/game/agricultural-rover-page.test.js` passes both suites and covers a hand-calculated scenario, input rejection, deterministic sensitivity, cost/capacity direction, and break-even outputs.
- [x] The focused impact evaluator passes ESLint, core-parse, duplication, tests, and changed-core coverage for the model and page modules.
- [x] `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` exits 0 across all 10 gates.
- [x] The model does not mutate input and reports invalid/zero-capacity scenarios rather than producing misleading estimates.
- [x] The standalone `/agricultural-rover/` page provides an editable synthetic default and labels observed versus assumed baseline data.
- [x] The browser page shows conservative/base/optimistic scenarios and a threshold, and provides explicit input errors through an accessible status region.
- [x] Exported JSON includes assumptions, units, calculated results, limitations, and vendor questions; importing it validates and recalculates the same result.
- [x] The catalogue links to the runnable page and its separate field guide.
- [ ] A novice can modify the seeded example and obtain a meaningful comparison in under two minutes; verify with a manual browser playtest.

## Evidence Collection
- Command log path: attach exact commands and outcomes to owning Bead `dadeto-krfo`; if Beads is unavailable, record the lock and evidence in `notes/agents/` and the Notion spec.
- Generated artifacts: none for the pure model. Future user exports must include inputs, units, scenario tags, calculations, limitations, and vendor questions.
- Test report path: focused Jest output and impact-evaluator scoped coverage report.

## 2026-10-23 acceptance recheck

- Focused impact passed 2 suites / 40 tests; ESLint, core-parse, zero-clone duplication, and changed-core line/branch coverage passed for both core modules.
- `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates. Its change-selected Jest stage correctly selected no tests because this audit had no source changes; the focused impact command above ran both relevant suites.
- `npm run build` passed and `npm run manuals:check` validated 84 toy manuals.
- The production deploy was already verified as run 40015046690 for commit `fc379d1367c7c5503eba473797443fb1a5c223d8`. A human browser trial is still missing: no interactive browser route is available here, and the prior host could not resolve `mattheard.net`. Do not infer that a novice can complete the task in under two minutes; keep that acceptance item open.

## Pass/Fail Rules
- The current loop passes only when the deterministic model slice, tests, and required toy docs are complete and required local checks succeed.
- The overall spec remains open until the interactive toy and user-facing acceptance items above are delivered.
- Fail when an evaluator exits non-zero, a required behavior is untested, or the implementation presents a scenario assumption as observed evidence.
