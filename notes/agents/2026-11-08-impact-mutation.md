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

The complete first strengthened run is retained as
`reports/mutation/check-impact.strengthened.json`: 824 mutants, 786 killed,
28 survived and ten timed out, score 96.60%, three static mutants. Its embedded
source matches checkpoint `ca94b6428d`; it is a failure, not acceptance. Exact
Full Check 42465445664/artifact 13612015898 passed that checkpoint with 10,205
unit tests, all four global/impact metrics100, twelve E2E tests and eleven gates.
These results do not validate subsequent source edits.

The next bounded source slice relocates the actual scalar path normalization and
classification into `src/logic/boundary/local/impact-paths.js` and introduces
`coverage-line.js`. Integer line parsing is non-coercing and preserves negative,
negative-zero and large integer values. The checked numeric cast stays beside
Number.isInteger's proof in boundary; report consumers use its number/null result.
Related-path absence now defaults at the final normalized output, not to a raw
sentinel that later filtering erases. CLI-produced candidate lists retain their
existing ordering/deduplication policy. A later independent programmatic corpus
caught that sparse lists must preserve an outward TypeError rather than become
an empty selection. The boundary returns that original error explicitly and the
caller propagates it, preserving the established failure semantics.

Three redundant steps were removed after tracing callers: normalizing an empty
string already yields empty; final selected tests are sorted after combining
related/direct tests; empty Git candidates already normalize to rejected unit
paths before the surviving-file check. The first unsupported-path witness now
also determines whether a path is unsupported, including the empty-string case.
Source plans with no tests already become fallback plans, so selected source
coverage is computed only from real executed shard outcomes. Each shard's output,
status assessment and progress text keep their established order. Missing Git
deletion metadata remains absent for explicit paths and failed collections.

Coverage records are projected per requested file before folding, retaining
original shard/key ordering and duplicate normalized paths. Unrelated positive
counters cannot hide a requested miss. New fixtures isolate missing counter
sides, non-integer branch lines, unsupported paths after valid paths, truthful
deletion metadata and a failed middle shard followed by a successful final shard.
Five focused suites pass 825 tests with all four metrics100 across the complete
impact module and both new boundaries; TypeScript and targeted lint pass. Required
aggregate, complete combined mutation and exact published CI remain pending for
this source slice. Every complete touched module stays in the mutation target.

The local aggregate then exposed exactly two clone pairs: repeated failure-state
assignments and identical no-selector plan returns. Derive final status once
from test/static/coverage failure evidence and use one unsupported-or-no-source
early return. Focused 825 tests/all-four100 and the strict zero-clone scan pass
after that repair. The in-flight pre-repair mutation run was stopped as obsolete
(wrapper143); no score is claimed for it. Start a fresh complete run against the
repaired source, not the earlier snapshot.

`node test/fixtures/typed-logic/impact-path-equivalence.js` reproducibly compares
the actual moved scalar path helpers against private helpers loaded from the
committed `ca94b6428d` baseline. All 88,752 primitive/string cases match, including
all concatenations of seventeen path/extension/separator tokens through length
four. Output SHA-256 is
`d5c5e248b8322f4561a63b154f0a1e3af6485e66d120dca807cd13b2ee918245`.
The harness accepts an explicit full baseline SHA; never substitute a current
implementation as its independent oracle.

The harness now also compares 864 public programmatic option combinations,
including absent/dense/sparse lists and malformed containers. It first failed
against the unpublished Array.from implementation, then passed after preserving
the original sparse-list TypeError as an explicit boundary failure. The caller
rethrows the same error. Programmatic outcome SHA-256 is
`25d955d1101ac703e775f5da4fa8ae057faa306c7f1b7e7cb0da990778562a8f`.
The pre-fix mutation run was superseded and terminated143 without a score claim.

Final repaired-source local evidence: five focused suites, 827 tests, all four
metrics100 on all three touched logic modules; targeted lint passes. The prior
full fast aggregate passed before the sparse repair; after separately rerunning
the focused impact tests and both equivalence corpora, the documented
`npm run check -- --skip-tests` path passes all eleven static gates on the repaired
source. Authoritative full CI and a fresh complete mutation run remain required.

The published `572d5b525a` run is retained as
`reports/mutation/git-deletion-evidence.published-boundary-failed.json`:
1,210 killed, two survived and 21 timed out, score 99.84%. Both survivors remove
one of two identical Boolean filters around fallback candidate deduplication;
each removal is hidden by the other. Keep filtering at normalization and remove
the redundant post-Set filter. Existing 827 tests/all-four100, 576 CLI outcomes,
864 programmatic outcomes and 88,752 scalar cases pass after that one-line fix.

The shared-checkout audit request was completed separately using already-
published patches: its live audit is zero and all twenty unrelated tracked
hashes remain unchanged. A supplemental root Jest scan consumed 2.4 GB on this
4 GB host and filled swap. Eleven of the 21 timeouts hit the unchanged report
core during that pressure; its prior standalone run killed all 264 mutants.
Do not claim those timeouts prove non-termination. After stopping only the owned
smoke process, the same 24 security tests pass with canonical test discovery.
Rerun the complete repaired mutation scope without concurrent oversized scans.
