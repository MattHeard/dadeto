# Test shard boundary baseline

Owner dadeto-awvd; follows dadeto-je16 / PR #2825. Production relocation is prepared in this isolated branch after the parent's
exact-head CI success; integration awaits complete parent acceptance. Do not edit
that parent's live mutation worktree.

Caller trace: src/local/check-impact-command-dependencies.js uses Number on
DADETO_CHECK_IMPACT_SHARD_SIZE with nullish text default200. The legacy runner's
resolveImpactShardSize reads deps.impactShardSize once, applies nullish default200,
and accepts Number.isInteger(value) && value > 0. Its only partitionTests caller
uses this result. Trusted partitioning can therefore consume an explicitly proven
positive bound without revalidating the argument. Preserve positive unsafe integer
values; a safe-integer restriction would change existing behavior. The wrapper's
Number conversion remains an effect-layer concern, not implicit parser coercion.

Before source changes run:
`node test/fixtures/typed-logic/test-partitions-equivalence.js`.
It loads the actual complete original module at
bd05ee9acb946e77b1f0a338295a0dbb9a82e809 and checks source SHA256
ff612b63219d311046f734737be5809480ddd6162335c830d6a2f6cff36424df.
Only AST import specifiers and private export visibility change in the observer.
Twenty-seven option cases retain resolver hash
8bab9a7f02e526f256b311c5224d8911ed490240c204574094344eed7c4bcd77.
Eight exact thrown-value cases and single-read/non-coercion controls also pass.
One hundred eight dense/sparse partition cases retain hash
b437c9f54cc55f5a4a8c2f6e175f0c6dca47c20f24ed1a2bef5e1a5f8fdad988.
The576complete CLI corpus retains hash
72f6640da5873ce183e784f9a341fe66718b786428eff73e48c98d48f7c8c6e5.
Two native processes produce identical receipts:
/tmp/dadeto-awvd-sharding-baseline.json and /tmp/dadeto-awvd-sharding-repeat.json.

Never call the original partition loop with zero/negative/non-progress bounds:
its caller has already established a valid positive integer. Test rejection at the
boundary; do not add a trusted-core fallback to hide an invalid caller contract.
The corpus preserves sparse holes, ordering, fresh shard arrays, input immutability
and object-element identity. Exact getter failures belong to dependency access;
keep that access order when extracting the value interpreter.

This slice does not change deleted-test selection (dadeto-pnrz), raw coverage JSON
schema, or inherited counter lookup semantics (dadeto-ef2o). The architecture spec
remains partial.

Baseline `npm run check -- --skip-tests` passes all eleven gates, including zero
clones and fresh audit0; /tmp/dadeto-awvd-baseline-check.log. Cold lint took204s
on this constrained host while parent mutation ran; heartbeat progress reflected
active work. Native baseline scripts supply characterization evidence separately.

## Positive-bound type experiment

Before choosing the production API, TypeScript strict checkJs accepted a JSDoc
intersection `number & {readonly positiveShardSize: unique symbol}`. A boundary
candidate first computes `typeof input === 'number' && Number.isInteger(input)
&& input > 0 ? input : 200`, then makes one proof-backed cast to that type. The
runtime predicate/default establish positivity; the erased brand prevents callers
from accidentally supplying arbitrary numbers. The trusted consumer needs no guard.

Temporary experiment /tmp/dadeto-awvd-type-proof.js compiled with:
`node node_modules/typescript/bin/tsc --allowJs --checkJs --strict --noEmit --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext --types node --typeRoots ./node_modules/@types /tmp/dadeto-awvd-type-proof.js`.
The positive controls consume interpreted2 and interpretedundefined; negative
controls consume raw2,0,-1,NaN with `@ts-expect-error`. Exit0 proves the expected
errors exist (unused expect-error would fail). Removing those four directives
produced exactly four TS2345 errors and exit2, retained in
/tmp/dadeto-awvd-type-negative.log. This is a type-system capability experiment,
not evidence that a production typed partition API already exists. When the
actual API is implemented, repeat the proof using its real exports/typedefs.

## Actual source preparation

After the parent's inspected exact-head CI passed, scheduling was refined to allow
isolated source implementation while its complete mutation continued. The parent
worktree remained unchanged; integration still requires parent acceptance. This
was an agent scheduling constraint, not a user permission requirement.

The actual partitionTests body moved unchanged into trusted test-partitions.js.
The legacy resolver implementation is removed; runImpactShards reads the dependency
once and composes parseTestShardSize with partitionTests. The boundary preserves
the original Number.isInteger && >0 predicate and default200. A numeric assertion
is justified by Number.isInteger, which TypeScript itself does not narrow; the
result-brand assertion is justified by positivity/default. An initially considered
typeof guard was removed because it is redundant with Number.isInteger and would
introduce an equivalent mutation. No positive-safe-integer restriction is added.

The actual API now has compile-only negative controls in
types/test-partitions.contract.ts, included directly in tsconfig.jsdoc.json.
This replaces reliance on the temporary experiment when proving production types.
The trusted input array is readonly; slicing returns fresh ordered arrays and
preserves holes. Direct tests construct sparse arrays explicitly rather than
literal elisions. Five focused suites / 813 tests pass with all4 changed-module
metrics100 (/tmp/dadeto-awvd-focused-final.log,
reports/coverage/test-partitions/coverage-summary.json). The relocated native
receipt remains byte-identical to /tmp/dadeto-awvd-sharding-baseline.json.
Complete thirteen-module mutation scope retains all prior modules and adds both
whole shard modules and their tests. Full mutation is queued behind the parent's
single-worker run; no acceptance is claimed before that report and exact CI.

Final actual API verification: npm run check -- --skip-tests passes all11gates,
including the durable positive/negative tsdoc contract, zero clones and audit0;
/tmp/dadeto-awvd-final-check.log. Removing the four expected-error directives from
the actual production imports yields exactly four TS2345 errors and exit2;
/tmp/dadeto-awvd-actual-type-negative.log. The actual partition function runtime AST
matches the immutable original (/tmp/dadeto-awvd-partition-ast.log). Native scoped
CLI, site/cloud builds and import verification all exit0, logs
/tmp/dadeto-awvd-{native-scoped-check,site-build,cloud-build,cloud-imports}.log;
27packages,711modules,1231imports. Full CI/mutation acceptance remain pending.
