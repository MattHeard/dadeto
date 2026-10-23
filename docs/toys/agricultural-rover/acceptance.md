# Agricultural Rover Acceptance

## Machine-Checkable Criteria
- [ ] `npx jest --runInBand --runTestsByPath test/core/browser/game/agriculturalRover.test.js` exits 0 and covers a hand-calculated scenario, input rejection, deterministic sensitivity, cost/capacity direction, and break-even outputs.
- [ ] The focused impact evaluator exits 0 with ESLint, core-parse, duplication, tests, and changed-core coverage passing.
- [ ] `npm run check` exits 0 before the model loop is closed.
- [ ] Model does not mutate input and reports zero capacity/invalid values rather than producing misleading estimates.
- [ ] The standalone `/agricultural-rover/` page provides an editable synthetic default and labels observed versus assumed baseline data.
- [ ] The browser page shows conservative/base/optimistic scenarios and a threshold, and provides explicit input errors through an accessible status region.
- [ ] Exported JSON includes assumptions, units, calculated results, limitations, and vendor questions; importing it validates and recalculates the same result.
- [ ] The catalogue links to the runnable page and its separate field guide.
- [ ] A novice can modify the seeded example and obtain a meaningful comparison in under two minutes; verify with a manual browser playtest.

## Evidence Collection
- Command log path: attach exact commands and outcomes to owning Bead `dadeto-krfo`; if Beads is unavailable, record the lock and evidence in `notes/agents/` and the Notion spec.
- Generated artifacts: none for the pure model. Future user exports must include inputs, units, scenario tags, calculations, limitations, and vendor questions.
- Test report path: focused Jest output and impact-evaluator scoped coverage report.

## Pass/Fail Rules
- The current loop passes only when the deterministic model slice, tests, and required toy docs are complete and required local checks succeed.
- The overall spec remains open until the interactive toy and user-facing acceptance items above are delivered.
- Fail when an evaluator exits non-zero, a required behavior is untested, or the implementation presents a scenario assumption as observed evidence.
