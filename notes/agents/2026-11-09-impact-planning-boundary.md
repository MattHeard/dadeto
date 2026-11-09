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

## Source split and diagnosis

Actual normalization/classification/default operations moved to the total
impact-plan-inputs boundary; the legacy factory unwraps/rethrows and delegates to
trusted impact-plan computation. Parsed change and discovery states are coherent
domain records. Core operations select explicit fallback/selected state and build
no-change/fallback/selected plans; input type guards stay at the boundary.
A generic Reason flows through actual boundary/core/public output, retaining opaque
payloads by identity. types/impact-plan.contract.ts is included in tsdoc:check and
requires truthful opaque typing, typed trusted input and result narrowing.

Unexpected hurdles and fixes:
- New command-preview tests guessed a direct Jest binary/unquoted paths. The actual
  established preview uses scripts/run-jest.js and quoted paths; correct tests,
  not runtime. The independently pinned native corpus never changed.
- Inline template/typedef comments were not recognized by JSDoc lint. Use separate
  multiline tags for generic typedefs.
- Seven destructured inputs violated the repo's effective-arity gate. Decompose
  domain operations over cohesive change/discovery records, rather than disguising
  independent parameters. Separate state selection and plan constructors are used.
- ReturnType of the public generic yielded unknown evidence in CLI static results.
  Caller inspection proves CLI failures are strings; instantiate the existing
  CheckImpactPlan alias there. Preserve generic types at the public API.
- An identifier-only reason helper triggered nullish validation classification.
  The actual domain operation now returns explicit fallback/selected values. The
  classifier and exemptions are unchanged; domain state is visible in the result.
- Changed test fields and an overescaped path fixture caused follow-up failures.
  Update expectations to the parsed domain record. Use set -e so a passing later
  native command never hides a failed focused Jest command.

Focused evidence: five suites /858tests pass with all4metrics100 for allthree
changed modules; /tmp/dadeto-oy3p-focused-domain.log,
reports/coverage/impact-planning/coverage-summary.json. Pinned native report remains
identical (/tmp/dadeto-oy3p-relocated-domain.json). Both core-parse gates pass
(/tmp/dadeto-oy3p-domain-core-parse.log). Harness and Jest check original public
function name/arity; keep the optional default parameter when composing.
Full aggregate, packaging, exactCI and complete15modulemutation remain required.

Final local acceptance: npm run check -- --skip-tests passes all11gates, zero
clones/audit0 and actual API type controls (/tmp/dadeto-oy3p-final-check.log).
Native scopedCLI/sitebuild/cloudbuild/importverification all exit0;27packages,
711modules,1231imports; /tmp/dadeto-oy3p-{native-scoped-check,site-build,cloud-build,cloud-imports}.log.
Removing the four expected-error directives from actual production imports gives
exactly TS2322 twice, TS2353 and TS2339, compiler exit2;
/tmp/dadeto-oy3p-actual-type-negative.log. The temporary negative config extends
the repository compiler settings and checks the real imports, not a modeled API.

An automatic approval-review usage failure left the first final-doc/check command
unexecuted. After user resume, revalidated host/worktree state and approval review,
then retried the actual unexecuted command. Do not bypass approval review or infer
that a command ran from an earlier request. Full CI/mutation remain pending.


## Complete mutation exposed an unconsumed domain state

The first complete fifteen-module run completed in 30m29s but failed: 1,260
Killed, seven Timeouts, two Survived, eight static mutants; no other statuses.
All fifteen embedded sources matched the published head. Rejected report SHA
`2afec2ebfa92074a715bcf43a56fd2ae7ea3a33e5efa0f836d6658d8f3fbe5e5`,
retained at `/tmp/dadeto-oy3p-selection-rejected-report.json`; terminal exit1
in `/tmp/dadeto-oy3p-mutation.exit`.

Both survivors replaced the internal selected-state record: `{mode:'selected'}`
could become `{}` or its tag could become an empty string without affecting any
public result because the consumer checked only fallback then treated everything
else as selected. Testing that private tag would assert an unused implementation
detail. The changed-path operation now computes the actual complete plan instead
of wrapping an intermediate tag that the consumer does not need. It resolves
fallback precedence then constructs the complete fallback output or delegates
selected test/command construction. The single-use fallback factory was removed. This
retains cohesive three-argument domain operations without an identifier-only
validation helper, unreachable default branch, extra argument guard, public
behavior change, mutation skip or classifier exemption. The top-level constructor
handles no-change and delegates changed-path construction. Re-run whole-module
diagnosis and then the entire unchanged fifteen-module scope before accepting
mutation evidence.


The first changed-plan organization killed all87coremutants in the whole-core
diagnostic, but the static classifier intentionally does not recognize arbitrary
constructor calls as concrete value production. Therefore the single-use
fallback output construction now belongs directly in the changed-plan operation;
there is no extra wrapper state or unused tag. Re-run diagnosis after this final
organization, and retain the earlier diagnostic only as historical evidence.


Final direct-plan organization passes the unchanged core-parse gates and all
eleven aggregate gates, including zero clones and audit zero
(`/tmp/dadeto-oy3p-plan-construction-check.log`). Native pinned equivalence remains
byte-identical; five focused suites /858tests pass again with all four metrics
at100 for the three changed modules
(`/tmp/dadeto-oy3p-plan-construction-coverage.log`,
`reports/coverage/impact-planning/coverage-summary.json`). Final whole-core
diagnosis and complete fifteen-module rerun remain required before acceptance.
