# Impact planning boundary baseline

Owner dadeto-oy3p. Source worktree typed-impact-planning-20261109 follows PR #2826;
no production planner source changes yet. The legacy createCheckImpactPlan mixes
path normalization and structural interpretation with deterministic selection,
fallback-state decisions and command construction. Establish a truthful boundary
contract before extracting trusted computation.

Run `node test/fixtures/typed-logic/impact-planning-equivalence.js`.
The fixture loads the actual complete original module at
bd05ee9acb946e77b1f0a338295a0dbb9a82e809, asserting source SHA256
ff612b63219d311046f734737be5809480ddd6162335c830d6a2f6cff36424df.
Only AST import specifiers are rewritten for native loading; no planner body is
copied. It compares9,011complete planner outcomes across changed/related candidate
lists, discovery flags, default/null/root primitive options and collection-error
payloads. It also proves32exact thrown getter sentinels, parameter-property read
order before array entries, opaque reason identity, canonical key order and576CLI
outcomes. Two processes produce identical receipts:
/tmp/dadeto-oy3p-plan-baseline.json and /tmp/dadeto-oy3p-plan-repeat.json.
Plan hash: 4d0646a7388982263545a58fdb57f3b952364cf8c7cfc12761d5ae6d37a823da.
CLI hash: 72f6640da5873ce183e784f9a341fe66718b786428eff73e48c98d48f7c8c6e5.
The fixture pins those semantic hashes as assertions, preventing shared-helper
changes from silently changing both sides of the oracle.

Opaque collectionError values are a real observed constraint: truthy numbers,
booleans, objects, arrays, symbols and functions are retained as fallback reason
payloads, including exact identity. Symbol/function payloads are represented by
fixture labels only in fingerprint serialization, after identity assertions.
Do not claim these preserved values are strings or introduce coercion during this
architecture move. Normal CLI callers supply strings; trace them, but keep the
public planner's established observation or explicitly justify a separate policy.

Sparse changed/related lists can expose native structural errors; total input
interpretation should represent original errors explicitly, with thin composition
rethrowing them. Root property reads occur changedPaths,relatedTestPaths,
relatedTestsResolved,collectionError before any changed or related array element.
Retain defaults, empty/no-change priority and fallback reason precedence. Do not
turn structural failures into silent empty plans. No deleted-test selection change
(dadeto-pnrz), counter lookup change (dadeto-ef2o), or full raw JSON validation is
part of this slice. Parent source and mutation worktrees remain untouched.

Baseline `npm run check -- --skip-tests` passes all11gates, zero clones and fresh
audit0; /tmp/dadeto-oy3p-baseline-check.log. Cold lint took203.5s. The pinned native
receipt remains byte-identical to both independent process receipts. No production
planner code changed in this characterization commit.

Evidence-derived design direction: carry a generic opaque collection-error payload
through parsed input and fallback output. Real CLI callers infer strings, while
other public callers retain their actual payload types. Validate generic JSDoc and
negative type controls against actual exports before claiming this contract exists.
A total boundary should capture original destructuring/default/path operations in
read order; trusted core should retain none/fallback/selected domain decisions,
ordered test deduplication and command construction over the parsed fields.
