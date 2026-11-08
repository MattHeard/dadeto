# Trusted impact command construction baseline

Owner: `dadeto-csof`. Canonical Rank11 stays Active / Partial. This checkpoint
prepares a source migration; it changes no production implementation.

## Source and intended move

Immutable baseline `1fcaebd28fc508558962ec51aaa7e7ba3648bd47` contains the legacy impact module with
SHA256 `42138efb1065e2135dfc11025b22375222b013ee93367db312efd42eb60a26fd`. Actual trusted construction comprises
`createScopedCoverageCommand`, `quotePath`, `commandOptions` and `JEST_RUNNER`.
Direct constructor consumers are `src/local/run-impact-coverage.js` and its
existing core test. Seven additional runner sites share process options; path
quoting and the Jest-runner constant also serve plan/execution construction.

Move these actual implementations into one coherent
`src/logic/core/local/impact-commands.js`, update all consumers and remove former
implementations instead of exporting a legacy forwarder. Keep precise JSDoc and
meaningful stream-output state, required typed inputs, environment/shard marker,
timeout/maxBuffer, injected path delegation and error propagation. The broader
effect runner cannot move wholesale into trusted core because it composes raw
boundary parsing and platform effects. Keep unrelated pnrz/znap bugs separate.

## Independent compatibility evidence

`node test/fixtures/typed-logic/impact-command-equivalence.js` loads the immutable
Git source after checking its complete hash. Babel rewrites actual import
declarations only; private helpers are exposed without copying/reimplementing
their bodies. The current side loads actual current source. After the move, point
that side directly to the actual destination, retaining this independent oracle.

- 5,760 complete constructor outputs and injected operation traces:
  `abb9dc1d05606bcc2d30565f4e66816bd8811ca7a45c154ae777291f1b582d13`.
- 117 process-option/quote outputs, preserving undefined, NaN, Infinity
  and negative zero: `cafc9541016af2d6e05f5c9dda800182fed49b280e39bd66281f40beb06bfeec`.
- 27 exact thrown-value and operation-order probes: path join, environment
  getter and quoting errors, including undefined/null/primitives/symbol/object/Error.
- 576 complete public CLI/output/effect outcomes:
  `72f6640da5873ce183e784f9a341fe66718b786428eff73e48c98d48f7c8c6e5`.

Log: `/tmp/dadeto-csof-command-baseline.json`. Three existing Jest suites pass
772 tests (`/tmp/dadeto-csof-existing-contracts.log`); installation audit is zero.
Required local static aggregate receipt is retained in the owning bead.

## Unexpected contracts and next-time guidance

The human preview rewrites every argument equal to the temporary directory, not
merely its positional flag value. Typed path strings can resemble runner flags;
the corpus captures that existing behavior instead of silently changing it. The
injected join operation retains its receiver and raw arguments. Environment
getters run after path construction, even when the shard key will be overwritten.
Frozen arrays and environment objects prove construction does not mutate caller
inputs; complete output objects retain absent-versus-undefined distinctions.
These are operational contracts, not reasons to add runtime argument guards.

Worktree creation again triggers the historical mixed-prefix Beads import warning.
Use the canonical shared-checkout tracker; do not reinitialize/copy its database.
No source move, coverage/mutation acceptance or exact-head CI success is claimed
by this baseline checkpoint. Preserve the live PR2822 candidate in its own tree.

## Baseline checkpoint acceptance

The first local aggregate failed only two max-depth warnings from nested corpus
enumeration. Flatten the Cartesian product with ordered reduce/flatMap; `cmp`
proves the complete result JSON is byte-identical to the original enumeration.
No cases, dimensions or expected outcomes were removed. Repaired
`npm run check -- --skip-tests` exits0 with all11gates passed,
`/tmp/dadeto-csof-baseline-check-repaired.log`. Three focused existing suites
pass772tests. `git diff --exit-code -- src` confirms production is unchanged.
Actual relocation, complete destination coverage/mutation and exact CI remain
required; this baseline checkpoint does not close the owning task.

## Actual trusted source move prepared

The separate worktree is based on validated option-parent
`a9fe5c069edb5bd441df24ca1aea1c011a11d99b`; integration remains after that
slice passes its complete mutation gate. Actual construction now lives in
`src/logic/core/local/impact-commands.js`. The legacy runner removes all three
former function bodies and the constant and imports their actual destination.
The native coverage adapter imports the constructor directly; no legacy forwarding
export remains. Its existing 47-line thin surface is preserved without exemption.

All three function parameter/body runtime ASTs match the immutable original.
Portable precise JSDoc replaces broad Node platform types: consumed path joining
and literal process-option fields, with no native runtime import, argument guard
or unchecked cast. Meaningful stream output state stays intact. The current side
of the independent corpus loads the actual destination; all original digests and
27 exact error probes stay unchanged, as does the option-parser compatibility
corpus. The original reference still loads pinned Git bytes.

Five focused suites pass835tests, and both entire touched logic modules have all
four coverage metrics100%. Evidence: `/tmp/dadeto-csof-relocated-focused.log`,
`reports/coverage/impact-commands/coverage-summary.json`. The actual native
pipeline passes4suites792relatedtests, scoped coverage without uncovered lines or
branches for both files, and scoped static checks:

`npm run check:impact:run -- --files src/logic/core/local/impact-commands.js src/core/local/checkImpactPlan.js`

Log: `/tmp/dadeto-csof-native-scoped-check.log`. The initial full local aggregate
failed only an unused test path import left when the constructor suite moved.
Remove that import rather than suppressing lint. Repaired all11gates pass,
`/tmp/dadeto-csof-relocated-check-repaired.log`. The original read-only AST probe
could not spawn Git under default permissions; rerun with process permission,
not a code change.

Both existing mutation harnesses retain all prior scopes and add the entire new
core module plus its direct tests. Do not run a second full mutation workload
while the option-parent gate is live. Full expanded mutation and exact-head CI
remain required before this source move can land. The broader architecture and
remaining legacy effect/planning source remain unfinished.

## Parent integrated; full validation starts

Option-parent PR2822 is merged at
`c868a8c2c8cf1eff8508c16040517f7b520dc4ef` after clean complete mutation100%
(1232Killed/10legitimateTimeout,8static,no errors/survivors) and inspected exact
FullCheck42525142288 success. Rebasing this isolated source onto landed main
changes no tree bytes relative to prepared `8a4c746b1789aa5ad75eabb9bfe0854e9f9bde6c`
(`git diff --exit-code` is empty). Parent mutation is terminal before starting
this expanded eight-module workload; no parallel full mutation run is needed.
The native/focused/local/build evidence above still describes the same source.
