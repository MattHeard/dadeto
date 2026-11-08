# Impact option boundary baseline

Owner: `dadeto-9i6i`. Canonical Rank 11 architecture remains Active / Partial.
This checkpoint captures compatibility before moving production parsing.

## Source and contract

`parseImpactArguments` remains private in `src/core/local/checkImpactPlan.js`,
called by `preparePlan`. The runner also imports boundary parsers and coordinates
effects; relocating that whole module to trusted core would violate dependency
direction. Extract the actual option parser instead of adding a forwarding tree.

Immutable baseline: `bde25b950cf237a1e0b65a4e4a6d2e7ef0f8e2b1`. Complete module SHA-256:
`42138efb1065e2135dfc11025b22375222b013ee93367db312efd42eb60a26fd`.

`node test/fixtures/typed-logic/impact-options-equivalence.js` loads that original
with Git, verifies its hash, and extracts its actual parser with Babel AST ranges.
Import rewriting touches actual import declarations only. The current private
parser is evaluated independently, and all existing public factory modes are
compared with deterministic ports. No implementation is copied into the oracle.

Baseline result: 14,060 exact parser outcomes, digest
`e2d5953902131f52ae5dba9d438b1c7b0d910e9517639fa1b8772f4bd7c11c3d`; 576 exact public CLI/output/operation outcomes,
digest `72f6640da5873ce183e784f9a341fe66718b786428eff73e48c98d48f7c8c6e5`. Log: `/tmp/dadeto-9i6i-options-baseline.json`.

Thirty-six additional exact thrown-value identity probes pass, including undefined,
null, primitives, symbols, object references and Error instances at length access,
member access, startsWith and coercion. They prevent totality from hiding exceptions.

The existing immutable public-contract Jest suite also passes 694 tests:
`node scripts/run-jest.js --runInBand --roots test --runTestsByPath test/scripts/typed-logic-legacy-contract.test.js`
(`/tmp/dadeto-9i6i-existing-cli-contract.log`). Dependency installation completes
with zero audit findings. Full local static-gate outcome is recorded in the bead.

The option corpus exhausts eight tokens through length four with absent, empty
and nonempty default base refs. Additional cases cover scalar collections, sparse
arrays and non-string members. Existing malformed inputs can throw; total parser
results must preserve the original thrown value through outer composition rather
than silently selecting defaults. Keep repeated option handling, accumulated paths,
base precedence, diagnostic wording and effect order unchanged.

## Unexpected hurdle and next-time guidance

The existing whole-runner design combines parsing and trusted planning. Its direct
boundary imports make a mechanical trusted-core move invalid. Use a pure total
boundary with explicit normal/diagnostic/exception outcomes, then trace each caller
before removing guards. This baseline is preparation, not a source migration or
coverage/mutation acceptance. Update the current-side loader to consume the actual
destination after relocation; keep the immutable reference and digests unchanged.

Worktree creation triggered an automatic Beads import warning about historical
mixed prefixes. Do not reinitialize or copy the database: all task operations use
the canonical shared checkout; source work stays isolated.

## Baseline checkpoint verification

The first static aggregate failed only four JSDoc type/description warnings on the
new comparison helper. Supply complete parameter documentation before running
ESLint; its automatic comment skeleton is insufficient. Repaired
`npm run check -- --skip-tests` passes all eleven gates, wrapper exit zero,
`/tmp/dadeto-9i6i-baseline-check-repaired.log`. The baseline script rerun retains
both exact digests and all 36 thrown-value probes. `git diff --exit-code -- src`
proves no production source changed at this checkpoint. The owning task remains
open for actual extraction, complete mutation/coverage and exact-head CI.

## Actual source extraction prepared

The actual interpreter now lives in
`src/logic/boundary/local/impact-arguments.js`; its body remains byte-identical
to the immutable original. Precise JSDoc describes unparsed argument primitives,
normal interpreted input and the original unknown structural failure. Its pure
total wrapper returns `{ok: true, input}` or `{ok: false, error}`. The effect
runner removes its former parser and unwraps/rethrows the original failure before
any process, coverage or output effect. There is no legacy source forwarder.

The reference diagnostic now invokes the actual destination on its current side;
the original Git source and both digests stay unchanged. Exact-category tests
cover repeated options, accumulated paths, base precedence and diagnostic wording.
All three public runner modes preserve exact thrown values before any effects.
One initial expectation wrongly assumed sparse argv must throw: the baseline
shows it produces `Unsupported impact option: undefined.` instead. Correct only
that test expectation; do not invent new validation.

Four focused suites / 818 tests pass, with all four coverage metrics at100% for
both the entire touched effect runner and new boundary. Log:
`/tmp/dadeto-9i6i-relocated-focused-repaired.log`; coverage:
`reports/coverage/impact-arguments/coverage-summary.json`. All eleven local static
gates pass (`/tmp/dadeto-9i6i-relocated-check.log`). The existing complete
seven-module git-deletion evidence harness adds the new actual boundary and its
category tests, retaining every previous module, threshold100 and static mutants.
The compact impact harness also includes the new boundary; no selection silently
loses the relocated parser. Complete mutation, builds and exact CI remain pending.
