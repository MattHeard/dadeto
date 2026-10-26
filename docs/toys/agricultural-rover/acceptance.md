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

## 2026-10-25 acceptance recheck

- `npm run test:impact -- --files test/core/browser/game/agriculturalRover.test.js test/core/browser/game/agricultural-rover-page.test.js` passed both suites / 40 tests.
- `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates on current main (six serial impact shards); the sandbox attempt needed host permissions after Git/Node child processes failed with `EPERM`.
- `npm run build` passed; the built `/agricultural-rover/` page is present, and `public/index.html` links to the beta catalogue entry with its plain-language value proposition.
- Production deploy evidence remains run `40015046690` for commit `fc379d1`.
- The only unverified criterion remains a real novice editing the seeded example and getting a meaningful comparison in under two minutes. Automated interaction tests do not prove this. Keep the spec Partial until that human trial is recorded.

## Pass/Fail Rules
- The current loop passes only when the deterministic model slice, tests, and required toy docs are complete and required local checks succeed.
- The overall spec remains open until the interactive toy and user-facing acceptance items above are delivered.
- Fail when an evaluator exits non-zero, a required behavior is untested, or the implementation presents a scenario assumption as observed evidence.

## 2026-10-26 discoverability and mutation follow-up

- Owning loop: `dadeto-on0j`; real novice trial remains separately owned by `dadeto-61cr`.
- The catalogue now emits readable anchor links to both `/agricultural-rover/` and `/industrial-heat-pump-readiness/`, with cross-links between the two entries. The rover standalone page adds accessible adjacent-tool navigation. Both beta release settings are preserved.
- Focused model, presenter and actual catalogue-generator tests passed 3 suites / 69 tests. Both rover core files have 100% statements, branches, functions and lines in `/tmp/rover-2026-10-26-coverage/coverage-final.json`.
- Full-model scoped Stryker improved from 185 killed / 55 survived / 1 timeout to **239 killed / 1 survived / 1 timeout**, plus 5 static mutants ignored by the unchanged shared `ignoreStatic` setting. Reports: `reports/mutation/agricultural-rover.json`; initial report retained at `/tmp/rover-mutation-initial.json` for this loop.
- The remaining survivor changes `step < 64` to `step <= 64` in coverage-threshold bisection. Four inspected threshold scenarios (initial coverage `1e-7`, `1`, `5000`, `100000`) returned exactly the same bound after the extra iteration. This is recorded as a remaining precision-related survivor, not a proof of universal equivalence or zero surviving mutants. The `step--` mutant timed out because it makes the loop nonterminating; it is not counted as killed.
- `npm run lint`, `npm run build`, `npm run manuals:check` (85 manuals), generated anchor inspection and `git diff --check` passed. The scoped configuration is retained in this toy's harness.
- A real novice-under-two-minute trial is still missing. Automated input tests and mutation results do not establish that acceptance item.

The remaining bisection precision question is tracked separately in `dadeto-ggr0`; it is not silently treated as resolved by this mutation-evidence loop.

Final local gate: `npm run check` passed all 10 gates (six serial impact-test shards, no coverage instrumentation), with zero reported clones. Log: `/tmp/dadeto-rover-2026-10-26-check.log`. This does not replace asynchronous Full Check coverage/E2E evidence.
