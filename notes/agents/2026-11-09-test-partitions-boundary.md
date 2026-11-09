# Test shard boundary baseline

Owner dadeto-awvd; follows dadeto-je16 / PR #2825. Production relocation awaits
parent acceptance. Do not edit that parent's live mutation worktree.

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
