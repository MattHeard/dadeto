# Atlas V3 native-neuron lineage

## Loop result

V3 portable research bundles now derive a component-only identity link for each V1 `native-neuron` mechanism. The link points to the canonical V2 native component and deliberately omits activation-position identity because V1 mechanisms do not specify a token position. Existing recurrent links retain their activation-position field, and the combined list remains sorted by V1 mechanism ID.

The Pythia-14M regression uses the pinned activation artifact to check export/import, deterministic ordering, and rejection when the canonical component is missing or a supplied link is tampered. The V1-to-V2 migration requires the strict V1 mechanism and V2 native-component schemas. V2 bundle behavior remains unchanged.

## Unexpected hurdle and diagnosis

The first focused run found that the V1 mechanism schema is strict and rejects attribution fields such as `authorId` and `createdAt`; those belong to surrounding research records, not the mechanism. It also exposed a service test fixture whose default native mechanism had no corresponding V2 component. The fixture now supplies the canonical component required by V3 lineage. Scoped coverage identified defensive migration-failure branches that needed explicit tests; the redundant missing-mechanism-schema guard was removed because successful evidence-graph validation already guarantees that schema for mechanism-bearing bundles.

The first fast aggregate check found a TSDoc mismatch: the native component schema had been marked required even for recurrent-only service adapters. The public adapter type now marks it optional, while V3 runtime validation still requires it whenever native mechanisms need lineage.

The first test command was blocked by sandbox `EPERM` while spawning Node and Git. The same focused evaluator passed under reviewed elevated execution.

## Evidence

- `npm run check:impact:run -- --files src/core/interpretability/index.js test/core/interpretability/identityV2.test.js test/core/interpretability/researchBundleV2.test.js test/core/interpretability/researchServiceV1.test.js` — passed; 8 suites / 66 tests, changed-core lines and branches fully covered, ESLint/core-parse/duplication passed, 0 clones.
- `npm run check` — passed all 10 gates; five impact shards passed 976 suites / 6,818 tests with 0 failures; duplication reported 0 clones. The local runner selected its conservative all-unit fallback.
- Exact-head Full Check [39458283378](https://github.com/MattHeard/dadeto/actions/runs/39458283378) and Terraform Validate [39458283813](https://github.com/MattHeard/dadeto/actions/runs/39458283813) — both passed for commit `4cdc870a47a670ddc1958dc452974161417f2043`.

## Next-time guidance

When a V3 lineage kind is added, use the actual strict V1 record shape in fixtures, add its corresponding canonical V2 component, and specify the minimum identity granularity the old schema can prove. Do not infer a token-position link from artifact context when the V1 mechanism record contains no token position.
