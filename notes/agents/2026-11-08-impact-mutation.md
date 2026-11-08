# Impact protocol and coverage failure isolation

Owner: `dadeto-0nth`. Report migration is independently owned by `dadeto-6jvu`
and PR #2820; integrate its branch before inspecting the remaining impact diff.
Do not mix its accepted report mutation score with unfinished impact acceptance.

The retained full impact report contained 68 survivors and ten detected
non-termination outcomes. Broad fixtures combined several coverage failures, so
one failure could hide another. New fixtures separately assert a coverage-read
error with complete locations, a single missing file among collected files,
statement-only misses with numeric sorting/deduplication and missing locations,
branch-line fallback, and positive counter accumulation across shards. Pure-plan
fixtures mix valid/invalid paths and direct/related tests. Process fixtures assert
the complete NUL name/status protocol, cached/untracked flags, safe base
resolution and the final diff terminator. These are observable contracts, not
assertions about private helper names.

`node scripts/run-jest.js --runInBand --runTestsByPath
test/core/local/checkImpactPlan.test.js test/scripts/plan-check-impact.test.js
test/scripts/typed-logic-legacy-contract.test.js` passes 763 tests, including the
independent 576 CLI outcomes. Production source is unchanged in this fixture
loop. `docs/quality/check-impact.stryker.config.mjs` evaluates the complete impact
module diagnostically; it inherits the combined harness without skips, exclusions
or reduced thresholds. The combined harness now also includes the actual report
boundary suites after that source migration. Final complete combined acceptance
remains required. Record terminal evaluator results in the owning bead.

Inspection also exposed a separate deletion policy gap: a Git-confirmed deleted
unit test with `fileExists: () => false` still produces a direct plan executing
that absent test. A planner reproduction returns `mode: selected`,
`testSelection: direct`, and `tests: ['test/core/deleted.test.js']`. Source-deletion
fallback does not cover it. Preserve this evidence for a separately specified
follow-up; do not silently freeze that behavior with a regression fixture merely
to kill a mutant. Explicit `--files` and restored files must remain distinct from
Git-confirmed current absence.

Next time, inspect the terminal complete-module report before editing source.
Some default/guard survivors can be equivalent because later filtering erases
the changed sentinel. Trace callers and move real input normalization into typed
boundary results rather than adding irrelevant output or suppressing mutants.
