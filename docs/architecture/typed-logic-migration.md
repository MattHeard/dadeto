# Typed logic migration inventory

Source: [Rank 11](https://app.notion.com/p/3ff700afc301811ab16fcfab82168d28).
Bead: `dadeto-00oe`. Baseline: `81e9e845d1db560fa044e8671562ea5daf88b9e2`.
This completes an inventory step, not the migration or its acceptance. No source
was moved, runtime guard removed, or quality boundary weakened.

## Target and invariants

- `src/logic/boundary`: pure total parsers with explicit untrusted input types,
  deterministic acceptance/coercion/default/error semantics and typed outcomes.
- `src/logic/core`: precise trusted contracts and legitimate domain/state checks.
  Remove redundant argument guards only after tracing typed callers/parsers.
  Unexpected internal contract violations remain programming errors propagated
  to the outer error-reporting integration, including GCP; do not hide them in defaults.
- Outside logic: thin integration and injected platform effects, preserving
  AllowEffects. Do not introduce framework/package dependencies into logic.
- Preserve observable behavior, deployed imports/URLs, all four 100% coverage
  thresholds and mutation evaluation. Do not create exclusions or forwarding
  trees to conceal missing migration enforcement.

## Tracked baseline

The [literal census](typed-logic-path-census-2026-10-27.json) contains 617 tracked
core files, 609 JavaScript files, and 985 matching tracked consumers, including
11 within core and 974 elsewhere. It excludes ignored generated outputs and
specified lock/catalogue data from this documentation search only, without
changing any test/coverage/clone exclusions. It is a literal census, not an
exhaustive import graph: joined path segments need the semantic traces below.

Core file buckets (all types): root 19, browser 369, build 25, capabilities 1,
cloud 110, interpretability 11, lint 2, local 49, object-minute-rental-search 12,
realtime 2, scripts 15, wgs84 2. Matching test files: 697.

## Active consumers and migration obligations

| Surface | Current authoritative source | Required treatment |
| --- | --- | --- |
| Coverage | `jest.config.mjs`; `scripts/run-jest-with-coverage.js:listSourceFiles`; `test/coverage-shards.test.js` | Both the Jest glob and serial source enumerator currently select src/core. Include both new logic roots before moving anything; preserve all four 100% thresholds. |
| Fast impact | `src/core/local/checkImpactPlan.js` and its test; local impact wrappers | Core-parse selection and changed-file coverage explicitly match src/core/. Prove moved files remain measured and missing coverage fails. |
| Full report | `src/local/write-check-full-report.js` → `src/logic/boundary/local/checkFullReport.js` + `src/logic/core/local/checkFullReport.js`; `.github/workflows/check.yml` | Typed JSON/log parsing is composed by the adapter with trusted coverage/report projection; preserve truthful unavailable/partial reporting and outer error propagation. Full Check remains distinct from fast local checks. |
| Lint/capabilities | package lint command; `eslint.config.js` and its TypeScript program | Extend command scan arguments and config globs; preserve custom rule imports, complexity/arity, no-inline-config, no-console, restricted globals/imports and capability selections. |
| JSDoc/checkJs | `tsconfig.jsdoc.json` | Include both roots. There are 16 existing src/core file exclusions: do not copy them onto migrated files. checkJs/noImplicitAny/strictNullChecks are on; not all strict options are enabled. |
| Mutation | `stryker.config.mjs`; `jest.mutation.config.mjs`; mutation/worktree helpers | Positive mutation glob is src/core only. Include both roots and preserve focused mutation evidence. Existing ignoreStatic/exclusions and inline Stryker directives are limitations to audit against the final spec, not proof every existing line is mutated. Add no new skips. |
| Clones | local check-duplication → core/scripts/check-duplication → local/run-clone-scanner | Active config is `.jscpd.json`: path src/core, mild, minTokens 11, fail any clone. Extend the active scan. `.jscpdrc.json` is an older separate configuration with ignore entries, unused by this command. |
| Dependencies/globals | local/check-depcruise → core/scripts/check-depcruise | Active config is `dependency-cruiser.config.cjs`, graph root src, custom scope/global root src/core. Extend both enforcement surfaces and define core/boundary direction. `.dependency-cruiser.cjs` is not the active default. |
| Parse gates | `src/core/scripts/check-core-parse.js`; `core-parse-exemptions.json` | Both gates default to src/core; exemption map is empty. Recognize the boundary namespace and keep input parsing outside trusted core without deleting domain checks. |
| Thin wiring | `src/core/local/non-core-thin/status.js`; entrypoint checker | Current walker skips one core directory and recognizes core-only reexports. Classify both logic roots as logic, not exemptions. Keep adapter max 50 lines and wrapper shape. Existing two exemptions are googleAuth and the shared allow-effects adapter. |
| Git tracking | `.gitignore` | Global build/ is ignored; exceptions cover src/build and src/core/build only. Explicitly allow the migrated logic build subtree before moving it. |
| Static outputs | build/copy → core/build/runCore → core/build/blog; core/build/generator; standalone app imports | Source and published core paths are coupled. Preserve public /core/ module URLs and relative imports as explicit build-output contracts; update copy plans rather than generated public files. |
| Cloud archives | `src/core/build/copy-cloud.js`; `src/build/copy-cloud.js`; Terraform archives | Source paths use core path segments and specific tables. Trace archive source_dir → generated index exports → Terraform entry_point; verify built package imports, not generated-copy edits. Run build:cloud/package verification for affected moves. |
| Cloud browser workflow | `.github/workflows/gcp-test.yml`; cloud Playwright config; scripts/run-e2e | Staging/readiness includes public core paths not fully found by the literal pattern. Preserve t-* scoping, manual-to-prod guard, cloud test inclusion and strict report retention. No local Playwright execution. |
| Callers/routing | Full census; source adapters/tests; AGENTS.md, src/core/AGENTS.md and repo/quality docs | Update exact consumers with each bounded move and route new code toward the target layout. Do not mechanically rewrite ignored generated infra/public trees. |

## First implementation sequence

1. Add both-root discovery/enforcement for lint/checkJs, global/scoped coverage,
   impact/reporting, clones/mutation, parse/dependency/globals and thin wrappers.
   Add fixture tests proving migrated paths cannot escape each gate. Keep legacy
   enforcement until its last module has moved.
2. First source candidate: move the import-free local report module unchanged
   from `src/core/local/checkFullReport.js` to
   `src/logic/core/local/checkFullReport.js`. Its two current direct consumers
   are `src/local/write-check-full-report.js` and
   `test/core/local/checkFullReport.test.js`. Existing report typedefs are precise;
   retain its parsing behavior during this first move. This avoids browser/Cloud
   Function packaging changes in the first source slice.
3. Trace the report's typed callers, extract its untrusted coverage-evidence
   parser into boundary with exhaustive category/mutation cases, then remove
   only proven redundant checks from trusted formatting. Current
   isCoverageSummary checks are not redundant merely because they are defensive.
4. Continue domain-sized moves and packaging updates. Refresh caller searches,
   preserve stable outputs, update agent documentation, then remove temporary
   both-root support once legacy core is empty. No deadline or big-bang rewrite.

## Parser-root preflight — 7 November 2026

Bead `dadeto-qtxd` extends default parser-policy discovery to the shared legacy,
trusted-core and boundary roots, retaining an explicit single-root override.
Only root-level ENOENT for optional future roots is tolerated; other scan/read
failures propagate. Legacy integration-path exemptions never apply inside
either destination namespace. Boundary permits parsing, while trusted core
rejects raw interpretation and validator-only logic under every domain path.

Generic classifier labels also describe legitimate object/array construction,
map transformations and comparisons. Destination policy uses distinct AST
signal kinds so these domain operations remain valid, and retains every kind
so an earlier domain signal cannot hide later raw parsing/type validation.
These syntactic checks do not prove a guard redundant: trace typed callers and
preserve meaningful state decisions. See the reproducible fixtures and mutation
evaluator in `notes/agents/2026-11-07-logic-parser-roots.md`. Final acceptance is
recorded in the owning bead; this preflight does not move any source or complete
the architecture. Thin-wrapper preparation remains before the first move.

## Acceptance per implementation slice

Report slice `dadeto-6jvu` supersedes the original import-free move candidate:
the actual report is split between `src/logic/boundary/local/checkFullReport.js`
and `src/logic/core/local/checkFullReport.js`. The adapter composes raw JSON
interpretation, finite normalized evidence and trusted coverage/report projection.
There is no legacy forwarding source. Independent JSON/Markdown and raw-error
oracles preserve behavior; correlated count/coverage types replace unchecked core
casts and optional input defaults. See `notes/agents/2026-11-07-typed-report-boundary.md`
for semantics, actual policy false positives and required acceptance evidence.
This does not complete the impact-consumer hardening or remaining legacy tree.

The pure Git name/status parser at `src/logic/boundary/local/git-changes.js`
feeds full-report deletion diagnostics. Confirmed deletions stay visible while
missing surviving-file coverage remains a failure signal. The report lands
independently; see
`notes/agents/2026-11-08-report-independent-landing.md` for source identity and
all required mutation scopes. Its report slice changes no impact source or test.
The separate `dadeto-0nth` impact slice consumes the same complete/rejected
outcome, retains source deletions for conservative all-unit selection, and keeps
restored files and explicit paths subject to strict current-file coverage.
See `notes/agents/2026-11-07-git-deletion-evidence.md` for its integration contract.
Complete impact-consumer hardening remains required before that task closes.
Its next source slice moves the actual scalar path interpretation to
`src/logic/boundary/local/impact-paths.js` and untrusted Istanbul line handling to
`src/logic/boundary/local/coverage-line.js`. The effect runner consumes explicit
parsed results and actual shard outcomes; these partial moves do not relocate
the remaining impact computation or the broader legacy tree. See
`notes/agents/2026-11-08-impact-mutation.md` for caller proofs and required scopes.

First source slice `dadeto-topt` relocates the report tooling's shared classifier
to `src/logic/core/local/logic-source-paths.js` with identical bytes and precise
string/boolean contracts. All active consumers import the destination directly;
there is no legacy forwarder. Focused sandbox availability now includes actual
destination dependencies without changing mutation scope or thresholds. See
`notes/agents/2026-11-07-first-trusted-source.md` for exact-source and validation
evidence. This is the first dependency move toward the report/parser slice, not
the report migration or completion of the architecture. The pinned census above
remains historical and is not silently regenerated.

Thin-wrapper preflight `dadeto-eg7y` classifies exact legacy and destination logic
directories from the canonical root list, relative to the configured source
directory. The rest of `src/logic` remains subject to adapter rules; this is not
a subtree exemption. Pure re-exports and build entrypoint logic imports recognize
both destinations, preserving the existing adapter limit and wrapper/entrypoint
semantics. Build policy keeps its import markers local rather than violating the
build-to-local dependency prohibition. Both touched mutation suppressions are
removed; the full-module evaluator and retained evidence are documented in
`notes/agents/2026-11-07-logic-thin-roots.md`. Acceptance belongs to the owning
bead's terminal checks and exact CI, not merely this implementation description.

Use focused tests and check:impact:run for moved logic coverage, npm run check
locally, and separate terminal Full Check evidence. Build for generated output,
build:cloud/package-import verification for cloud moves, Cloud Run for browser
journeys, and focused Stryker for parser/trusted behavior. The whole spec remains
Partial until target layout, contracts, exhaustive parser evidence, full gates
and documentation are actually complete.

## Reproduce the literal snapshot

Run this Python from the repository and compare its JSON output with the census.
It reads only the pinned commit, so future moves or this new document cannot
inflate its own baseline. The semantic trace table requires separate inspection.

```python
import collections, json, subprocess
base = '81e9e845d1db560fa044e8671562ea5daf88b9e2'
pattern = r'src/core|/core/|\.\./core/'
suffixes = ['*.js','*.mjs','*.cjs','*.json','*.ts','*.yml','*.yaml','*.tf','*.html']
excludes = ['package-lock.json','pnpm-lock.yaml','src/build/blog.json','tracking/**','.beads/**']
tracked = subprocess.check_output(['git','ls-tree','-r','--name-only','-z',base]).decode().split('\0')
core = [p for p in tracked if p.startswith('src/core/')]
matched = subprocess.check_output(['git','grep','-I','-l','-z','-E',pattern,base,'--',*suffixes,*[':(exclude)'+p for p in excludes]]).decode().split('\0')
consumers = sorted(p.removeprefix(base+':') for p in matched if p)
buckets = collections.Counter(p.split('/')[2] if p.count('/')>2 else '(root)' for p in core)
data = {'schemaVersion':1,'baselineCommit':base,'literalPattern':pattern,'includedPathspecs':suffixes,'excludedPathspecs':excludes,'core':{'trackedFiles':len(core),'javascriptFiles':sum(p.endswith('.js') for p in core),'filesBySubtree':dict(sorted(buckets.items()))},'literalConsumerCount':len(consumers),'literalConsumerPaths':consumers}
print(json.dumps(data,indent=2))
```

## Coverage/reporting preflight — 27 October 2026

Bead `dadeto-hhlj` adds one shared typed root list/path predicate, used by Jest,
the serial coverage runner, impact planning and changed-file reports. Both
`src/logic/core` and `src/logic/boundary` now participate alongside legacy core.
The runner still requires legacy core, tolerates absent future roots, propagates
metadata/read failures for present roots, and assigns zero coverage to untested
modules in either destination. This is coverage preparation, not permission to
move modules before the remaining gates are extended.

Nine pre-fix cases demonstrated omitted roots and a false successful scoped
run with missing coverage. The final focused set passes85 tests; the changed-core
evaluator passes80 tests and reports no uncovered lines/branches in all three
changed core modules. The shared classifier's reproducible mutation gate kills
all14 mutants, including static mutants, with a100% break threshold:

```sh
node node_modules/@stryker-mutator/core/bin/stryker.js run docs/quality/logic-source-paths.stryker.config.mjs
```

Its small sandbox manifest scopes this one classifier check; it does not alter
the global mutation configuration or exclude logic from repository coverage.
The report is `reports/mutation/logic-source-paths.json`. No mutation result for
unrelated modules is implied. `npm run check -- --skip-tests` passed all10 static
gates after the explicit focused tests/coverage run; build, cloud assembly and
package verification passed. Full Check for the pushed change is separate
asynchronous evidence. No source module moved or coverage threshold decreased.

Next: extend parse/dependency/global and
thin-wrapper enforcement to the new roots, proving each with fixtures, before
moving the first local-only report module. The pinned census above remains an
historical baseline and is not silently refreshed by new helper files.


## Static selection preflight — 27 October 2026

Bead `dadeto-ws2w` extends the lint command and every legacy core-specific
ESLint policy to both target logic roots, including capability selection,
factory-import restrictions, no-console/restricted globals, arity, and existing
per-module limits. TypeScript now discovers both roots without copying any of
the legacy file exclusions. Global Stryker positive selection includes all three
roots; its existing other settings are unchanged. The active clone configuration
scans all three roots with the same mild mode, minTokens 11 and zero-clone gate.
No source module moved. The new namespace READMEs describe their intended roles.

The new fixtures initially exposed eight missing selections. Final regressions
execute real ESLint/compiler-backed capability checks, TypeScript file discovery,
and the actual clone scanner against duplicate files across the two destination
roots. The duplicate fixture must exceed the existing five-line detector minimum;
that minimum was not changed to make a short fixture pass. Four focused suites
pass 61 tests. The split local aggregate (`npm run check -- --skip-tests` after
those focused tests) passes all 10 static gates, including real checkJs and zero
repository clones. Complete-suite evidence belongs to the pushed Full Check.

Parse/dependency/global and thin-wrapper checks still require explicit extensions
before a JavaScript move. Refresh module dependencies before selecting the first
move; the report module now depends on the shared root classifier. Static output
mapping and cloud package contracts remain mandatory for moves affecting them.


## Dependency/global preflight — 27 October 2026

Bead `dadeto-141e` adds both destinations to observable integration/dependency
rules and default implicit-global/random scans. Trusted core cannot depend on
boundary; boundary may depend on core. An explicit sourceRoot remains a single
scan and the external graph command launches once. Real filesystem and cruiser
fixtures pass with actual scope analysis; final focused result is 54 tests.
Scoped source coverage has no uncovered lines/branches and all 10 static gates
pass. The changed-line mutation harness kills 21/21 mutants at a 100% threshold:
`docs/quality/logic-dependency-roots.stryker.config.mjs`.

Bead `dadeto-lqbv` fixes a pre-existing quoted-state false positive exposed by
that positive fixture. Its first mutation run exposed a template-transition
survivor; the added real-call-after-template test kills it on the same rerun.

**Remaining portability gap:** the active dependency config's includeOnly filter
omits built-in endpoints, so the nominal built-in prohibition is not evidence
that legacy code is free of Node imports. Actual graph inspection found this;
an AST audit identified 15 files / 28 static built-in imports. `dadeto-e1oz` owns
remediation and observable enforcement before moves, without exclusions. The
current fixture proves local/package/domain/direction rules only. Parse and thin
classification also remain pending; no source file has moved.


## First built-in remediation slice — 27 October 2026

Bead `dadeto-kjbj` removes node:path from the function graph analyser; its local
runner now injects the same native relative-import resolution. Controlled unit
fixtures require resolver delegation, including nonphysical aliases, and assert
errors propagate. Nine focused tests, scoped source coverage without uncovered
lines/branches, all 10 local static gates, actual graph generation and build
pass. The generated graph has 10,058 nodes / 10,215 edges, with no unknown edge
endpoints. This removes one audited built-in import; 14 modules / 27 remain.

No source moved and no exclusion was added. The analyser's pre-existing blanket
mutation directive remains a limitation, not successful mutation evidence; the
final architecture acceptance requires auditing/removing existing skips. The
manual graph runner's legacy scan root also needs updating with the source moves.


## Lineage hash injection; hardening in progress — 27 October 2026

Bead `dadeto-r5hj` removes node:crypto from lineage parsing and injects the same
UTF-8 SHA-256 operation from its existing CI composer. Controlled core tests
verify delegation and failure propagation; composer integration retains real
hash verification. A virtual compiler fixture rejects omitted/wrong-returning
hash dependencies. All 36 focused tests, scoped changed-source coverage, 10
static gates and build pass. This reduces the built-in audit to 13 modules /
26 imports, without moving files or changing deployment behavior.

The complete parser-module mutation run failed its 100% gate: 243/282 killed,
39 survived, no timeouts. The retained harness and initial report provide the
next hardening loop; this is not mutation acceptance. Keep the Bead and overall
architecture open. No mutation/source exclusions or lower threshold were added.


## Lineage parser hardening — 27 October 2026

The next `dadeto-r5hj` loop expands to 89 passing focused tests. The whole-module
mutation baseline's 39 survivors drove exact error/type/whitespace, anchored
identifier/digest/generation, optional pin, credential, timestamp and normalized
output cases. A pure total timestamp format stage now returns a native match
retaining original text, or null; the calendar check preserves outward errors.
Both URL dictionaries contain strings: cardinality and per-key value equality
preserve the map contract without sorted key-index comparison. Legitimate domain
checks remain. Concrete output JSDoc and a virtual compiler fixture verify the
normalized evidence fields and required hash dependency.

Changed-source scoped coverage has no uncovered lines/branches; all 10 split
local static gates and build pass on the final code. The first hardening mutation
attempt reached 99.65% (280 killed / one survivor / one timeout); its remaining
primitive-outcome guard was masked by Date.parse coercion. The latest full-module
rerun follows the native-match change and must be inspected before acceptance.
No mutation exclusions or threshold reductions were introduced. Keep this Bead
and Rank 11 open pending mutation and exact pushed Full Check results.


Final lineage module mutation evidence: 279/279 killed, including 36 static
mutants, with no survivors/timeouts/ignored/uncovered mutants and the same 100%
break threshold. The report's embedded source exactly matches pushed fa26bb4.
The earlier injection Full Check40540924102 succeeded; exact hardening Full
Check40544211532 is still running. Parent architecture and dadeto-r5hj remain
open pending that full result and the broader migration requirements. Proceed
with the next built-in dependency slice while monitoring that same live handle.


## Refund identity dependency injection — 27 October 2026

Bead `dadeto-pu2z` removes direct crypto from refund identity construction. The
cloud integration supplies the same SHA-256 UTF-8 operation through a thin
adapter; tuple separators, retry-key trimming, prefix, auth/ownership, billing
gates and effect permissions remain intact. Core tests use fake hashing and an
opaque permission fixture; separate adapter tests check ASCII/NUL/Unicode fixed
vectors. Four focused suites / 21 tests, scoped source coverage, all 10 local
static gates, builds and 27-package cloud closure verification pass. The audit
now has 12 modules / 25 direct built-in imports remaining.

A complete 145-mutant handler experiment exposes additional test gaps despite
full branch coverage; keep mutation acceptance and exact pushed Full Check
separate, and do not close the quality Bead from local tests alone. The previous
lineage parser task is complete: Full Check40544211532 succeeded for fa26bb4,
matching its 279/279 killed mutation report. Rank 11 remains Active / Partial.


## Refund handler hardening — 27 October 2026

The `dadeto-pu2z` mutation baseline killed 115/145; 30 survivors prompted exact
error-body, request limit/type, empty UID, bearer format and persisted-result
cases. The 62 focused tests now pass. Removed only the redundant capture trim
and intent null check, preserving headers, object-shaped payload compatibility,
financial domain decisions and permission forwarding. All 10 local static gates,
scoped source coverage, builds and 27-package import closure pass.

The full-handler mutation gate now kills 141/141, including one static mutant,
with no survivors/timeouts/ignored/uncovered mutants at the same 100% threshold.
Its embedded source exactly equals the current runtime module. The injection
Full Check40547579414 succeeded; record hardening CI separately before closing
the quality Bead. The refreshed static import audit confirms 12 modules /
25 imports remain. No source/mutation exclusion or lowered threshold was added.

## Obsolete webhook platform helpers — 27 October 2026

Bead `dadeto-an58` removes source-proven unused raw-payload, JSON-event and
constant-time comparison fallbacks, their stale helper tests/mocks/reexports,
and the parser's direct crypto/Buffer dependency. The actual Stripe raw-byte
verification path is unchanged. Eight remaining helper exports are locked by
focused tests; the facade's export-star avoids a real duplicate import/export
list without changing scanner policy.

Scoped impact passes 12 suites / 148 tests with no uncovered lines/branches in
the two touched source modules. All ten split local static gates pass. Whole
parser mutation kills 90/90 mutants with static evaluation enabled (none
generated), no survivors/timeouts/ignored/uncovered mutants and a 100% threshold.
All eight blanket mutation-disable regions in this module are removed. Report
source matches exactly; see `notes/agents/2026-10-27-webhook-parser-cleanup.md`.
The remaining static built-in audit is 11 modules / 24 imports. No JavaScript
module has moved to the target namespaces yet; broader enforcement, precise
typed boundary extraction and migration remain unfinished.

Refund hardening Full Check40549912022 failed only the dependency audit.
Bead `dadeto-u0xq` repairs the existing qs override/lock pin to6.16.1; all resolved
paths, supported serialization compatibility and npm audit now pass locally.
Keep exact descendant CI separate from local evidence; the library probe caveat
is recorded in `notes/agents/2026-10-27-qs-audit-pin.md`.

## Static copy path injection — 27 October 2026

Bead `dadeto-w5p7` binds recursive discovery, directory copying and default
copy-pair construction to the copy factory's existing injected path bundle,
removing its direct node:path import. Four red non-native-path tests reproduced
the bypass; independent-instance coverage also prevents ambient shared state.
Helper signatures and explicit pair overrides remain intact. The coherent helper
group now lives within its owning factory; no compatibility module was added.

Scoped coverage passes with no uncovered lines/branches; all ten split static
gates and the actual static build pass. All 1,119 generated files remain
byte-identical, with no allowed output exception. A whole-module mutation
experiment with static mutants and a 100% threshold is running; its final report
must be recorded separately before claiming mutation completion. The touched
module's sole prior mutation skip has been removed. See
`notes/agents/2026-10-27-static-copy-path-injection.md` for commands and limits.
The refreshed AST census leaves 10 legacy modules / 23 built-in imports; broader
portability enforcement, parse/thin preparation and namespace moves remain open.

## Terminal CI receipt — 27 October 2026

Full Check [40586472929](https://github.com/MattHeard/dadeto/actions/runs/40586472929)
succeeded at bb906c0b6b1d2e1186e2773f3f4825a6c5ac0784. Artifact
`full-check-40586472929` (12771203724), downloaded to
`/tmp/dadeto-full-check-40586472929/coverage/check-full-report.md`, confirms
1,065 suites / 8,193 tests pass and statements, branches, functions and lines
are all 100%; all ten aggregate gates pass. This closes the webhook cleanup,
audit-policy repair and unchanged refund hardening slices. Their source/tests
and dependency records are unchanged in the following static-copy commit35cf8d4.
Beads dadeto-an58, dadeto-u0xq and dadeto-pu2z are closed; the Rank 11 parent
remains Active / Partial. The prior refund hardening run40549912022 failed only
audit and is not retroactively described as passing.

## Complete mutation evidence — 27 October 2026

The final whole-module rerun passes: **306/306 Killed**, including **84 static**
mutants, zero survivors/timeouts/ignored/uncovered mutants at the unchanged
100% threshold. Report `reports/mutation/static-copy.json` and summary
`reports/mutation/static-copy-summary.json` embed the exact runtime source; SHA-256
`94ea4c790607293341643c32cf5b772ec7b84611c66490dadd7df15163be4a10`.
Log: `/tmp/dadeto-w5p7-mutation-final.log`; wrapper exit zero. The initial five
static survivors and recursive fixture timeout are all resolved by stronger
tests; no production body, source/mutation exclusion or timeout setting changed.

Focused hardening passes 51 tests; all ten split local static gates pass.
Injection Full Check40587766084 succeeded for35cf8d4. Exact hardening
[Full Check40588740109](https://github.com/MattHeard/dadeto/actions/runs/40588740109)
at67765d9 remains tracked separately before closure. The source blob and
1,119-file output parity remain unchanged. Parent Rank 11 remains Partial.

## Parse classifier injection — 27 October 2026

The source-verified original classifier wiring task dadeto-8f5t is complete;
14 focused classifier/gate cases pass and the terminal full check receipts are
recorded. Follow-up `dadeto-qoi0` removes child_process/URL/process dependence
from the core gate: the existing three local wrappers inject the same classifier.
Configured scans require the precise callback; fake-result tests do not require
Babel. Missing/failing callbacks propagate, and legacy inert defaults remain.

Real CLI stdout is byte-identical; the aggregate wrapper preserves both expected
diagnostic lines. One informal local timing sample is 8.952s before / 1.168s after,
not a benchmark guarantee. Scoped coverage and all ten split local static gates
pass; the first unskipped whole-module mutation experiment exposed 11 survivors.
Hardening adds independent skip/anchor/encoding/message cases and removes two
redundant forwarding defaults. Final focused tests pass 37 cases and checkJs.
The final mutation run must be inspected separately before acceptance.

The refreshed AST inventory now leaves 9 modules / 21 direct built-in imports.
The blanket mutation directive is removed only from the touched module; no new
source exclusions or weaker thresholds. Namespace parse/thin preparation,
remaining built-in remediation/enforcement and actual source moves remain open.
See `notes/agents/2026-10-27-parse-classifier-injection.md` for evidence and limits.

Static-copy hardening FullCheck40588740109 succeeded at67765d9: 1,066 suites /
8,206 tests and all four global coverage metrics at100%; dadeto-w5p7 is closed.
Receipt-only FullCheck40589752440 atbb40cc5 also succeeded. These receipts do not
establish the new classifier-injection slice's future CI result.

## Final mutation and build receipt

The full-module rerun passes: 78/78 Killed, including
17 static mutants, zero survivors/timeouts/ignored/uncovered mutants
at the unchanged 100% threshold. The report embeds the exact runtime source;
SHA-256 `3a0745a5ef4b3206a65490a91a0e9fefbdfe99660cdfc847b914ffdebd2988b5`. Reports:
`reports/mutation/parse-gate.json`, `reports/mutation/parse-gate-summary.json`.
The 11 original survivors prompted stronger independent fixtures; only the two
proven redundant forwarding defaults were removed, leaving one normalization
owner. No policy/exemption/source/mutation exclusion or threshold changed.

Final scoped run: 2 suites / 33 tests, collected source, no uncovered lines or
branches; all ten split local static gates and the actual build pass. A final
3-suite / 37-case rerun after fixture JSDoc cleanup and a fresh exact CLI stdout
comparison pass. Logs `/tmp/dadeto-qoi0-{impact-final,static-final,build,mutation-final,final-focused}.log`.
The remaining direct built-in census is 9 modules / 21 imports. Exact pushed
Full Check remains a separate acceptance requirement; parent Rank 11 is Partial.

## Classifier CI closure — 27 October 2026

Exact FullCheck [40592067750](https://github.com/MattHeard/dadeto/actions/runs/40592067750)
succeeded at dbdae378866bad7123ea8d5ed5923cbc88be3e45. Downloaded artifact
`full-check-40592067750` (12775760073), report
`/tmp/dadeto-full-check-40592067750/coverage/check-full-report.md`, confirms
1,067 suites / 8,229 tests passed; all four global coverage metrics and the
changed parse module's four metrics are100%. Bead dadeto-qoi0 is closed.
Rank11 remains Active / Partial for the remaining migration scope.

## Worktree runner path boundary — 27 October 2026

Bead `dadeto-1bl2` binds machine/command logging to the existing injected path
bundle and removes node:path from the runner. The local wrapper provides it;
fake aliases prove delegation, path-error propagation and instance isolation.
The original runner/target tasks d6ab/jxv5 are source-verified complete and closed.
Four focused suites / 16 tests, scoped coverage without uncovered lines/branches,
lint/checkJs and initial split static gates pass. The touched module's blanket
mutation skip is removed. All native process fallbacks are mocked in tests.

A complete isolated mutation baseline exposes40survivors/4timeouts among154;
keep the 100% threshold and strengthen lifecycle/config/completion tests before
claiming mutation acceptance. Remaining direct fs/spawn imports and env/time
coupling remain explicit parent work. No source namespace move occurred.
See `notes/agents/2026-10-27-worktree-path-injection.md` for commands and limits.

Worktree path slice ae033c7 is pushed; its static build and fast gates pass.
The isolated baseline's40survivors/4timeouts drive exact lifecycle/configuration
and error assertions, plus test-only bounded completion for pending promises.
All native process fallbacks are blocked before import. Hardening passes36focused
tests, scoped source coverage without gaps, all10split static gates and build.
Remove only redundant internal cleanup allowFailure:true covered by the outer
catch; the exported error policy and external filesystem options stay intact.
Final whole-module mutation and exact hardening CI remain separate acceptance
requirements. Initial injection FullCheck40595672238 is monitored asynchronously.

## Final acceptance evidence — 27 October 2026

The full-module mutation gate passes at100%: **153/153 detected**, comprising
149 Killed and4 Timeout classifications, no survivors/ignored/uncovered mutants.
Static evaluation is enabled; no static mutants are generated in this module.
The four timeout replacements remove the Promise executor, exit handler, exit
event name or error settlement. They leave operations pending; per-operation
checks fail, and several such failures can accumulate before the mutation
engine finishes a run. These are recorded as detected non-settlement, not as
149+4 failed assertions or an all-Killed result. No timeout budget was increased.

Report `reports/mutation/worktree-runner.json` and summary
`reports/mutation/worktree-runner-summary.json` match the exact runtime source;
SHA-256 `016e21230505a9b2894bde8d1a27eebf355ee22bf66714c871f9b1fb47663a85`.
The final engine exited0, with no mutation/source exclusion or threshold change.
Log: `/tmp/dadeto-1bl2-hardening-mutation.log`.

Exact hardening [FullCheck40596717662](https://github.com/MattHeard/dadeto/actions/runs/40596717662)
succeeded at8dd3fba3d9b3b968f1a620e0c736e0d927010372. Downloaded artifact
`full-check-40596717662` (12777556488), report
`/tmp/dadeto-full-check-40596717662/coverage/check-full-report.md`, confirms
1,068 suites / 8,253 tests passed; all four global coverage metrics and the
changed runner's four metrics are100%. Injection FullCheck40595672238 also
succeeded. Focused36tests, scoped source coverage without gaps, all10split
local static gates and build pass. Runtime source/test blobs remain unchanged
for this receipt. Remaining direct built-ins:9modules/20imports; fs/spawn/env/time
portability and the broader migration remain open. Rank11 staysActive/Partial.

### Worktree platform boundary — 28 October 2026

Child `dadeto-tx59` removes the worktree runner's remaining executable native
imports and host environment/time defaults. Its local wrapper now supplies
required filesystem/process/environment/clock adapters and the existing local
AllowEffects invocation boundary. All injected filesystem commands, launches,
child subscriptions, clock queries and logging receive that invocation token.
The core dependency types describe only consumed portable operations. Preserve
zero-argument public handle, exact lifecycle/config defaults, environment overrides
and cleanup behavior. Focused 44 tests and scoped runner coverage (zero gaps),
checkJs and build pass; nine split aggregate static gates pass, but a new Jest /
deepmerge audit failure is tracked separately as `dadeto-sxun`. Neither child nor
parent is closed on partial validation. Current AST static-import inventory is
eight modules / 18 native imports; this does not prove global host independence.
See `notes/agents/2026-10-28-worktree-effects-injection.md` for the typed overloaded
subscription adapter, permission-forwarding regressions and terminal receipts.

### Cloud template data — 28 October 2026

Child `dadeto-48hf` replaces native filesystem loading in the cloud template helper
with pure interpolation of compiled template strings. The five source HTML files
stay authoritative; four cloud consumers import generated data without changing
public renderer APIs. A permission-aware local compiler provides refresh/check
commands; drift is enforced by both aggregate checks and before cloud packaging.
The generated module remains inside all applicable quality and mutation surfaces.
Byte-equivalent outputs, compiler/consumer/CLI regressions, static/cloud builds
and deployment closure are required; exact mutation/CI receipts live in
`notes/agents/2026-10-28-cloud-template-data.md`. Static native inventory now leaves
seven modules /17imports; enforcement, namespace preparation and migration remain.
Previous runner/effects and security-backport children tx59/sxun closed after
FullCheck40651137720 succeeded at7f07f1b (1072suites8277tests/all4coverage100).

### Cloud package verifier injection — 28 October 2026

Child `dadeto-6nik` removes module/fs/path imports and cwd defaults from the package
verifier. Factory inputs now include pure path operations and builtin metadata;
per-call filesystem/root inputs are required. Diagnostic writers require the
invocation AllowEffects token. The existing local public command supplies native
defaults and adapts its original callback/options interface. Fake ports/custom
builtin/parser tests, native fixture tests and actual27package output parity pass.
Precise acceptance receipts and pending full mutation/CI live in
`notes/agents/2026-10-28-package-verifier-injection.md`. The broader observable
builtin prohibition, boundary parsing and actual source migration remain pending.
Previous template child48hf closed after exact FullCheck40653689602 succeeded
atabfd8d5:1074suites8292tests/global+all8changedfilesall4metrics100%.


## Native endpoint visibility restored — 28 October 2026

Bead `dadeto-e1oz` now expands the original dependency graph scope with every
Node runtime builtin endpoint. Real fixtures assert the named native prohibition
for node:fs and bare fs/promises under legacy core and both new logic roots;
native build/cloud/local adapters pass, browser native imports and prior package/
domain/direction violations remain rejected. Negative config controls remove the
named rule or restore the old endpoint filter and require the same assertion to fail.

The current graph exposes163 native edges, zero from logic, with1,042 modules /
1,983 dependencies and no violations. Source AST census is also zero static native
imports after the bounded injection slices. All11 split local static gates and
seven real-fixture/control tests pass. The last UUID child passed exact Full
Check40767918736 (8,430 tests, global and changed-source metrics100%). Final
policy [Full Check40769557406](https://github.com/MattHeard/dadeto/actions/runs/40769557406)
succeeded at e984e63f1b. Its downloaded artifact12850599870 confirms1,091 suites /
8,432 tests pass, all four global coverage metrics100%, and no below-threshold
files. This terminal receipt was verified on7November2026. See
`notes/agents/2026-10-28-native-dependency-policy.md` for hashes, artifacts and
failure history. These are native-import policy results; legacy mutation skips,
ambient/value typing, parser/thin preparation and actual namespace moves remain.

## WGS84 source migration in progress — 8 November 2026

`dadeto-z85m` moves actual numerical calculation into `src/logic/core/wgs84`,
coordinate interpretation into `src/logic/boundary/wgs84`, and public throw/order
composition into the thin shared adapter. Already-normalized numerical callers
consume trusted calculation directly; legacy logic does not import the adapter.
One shared asset plan assembles real relocated modules and preserves four stable
public module URLs through build-only compatibility templates. All former WGS84
source modules are removed. See `notes/agents/2026-11-08-wgs84-migration.md` for the
independent numeric/coercion oracle, reproduced pre-existing browser omission,
actual browser/cloud import checks and outstanding full mutation/CI acceptance.
This is a bounded migration slice; the broader legacy tree remains unfinished.


## Impact option boundary extraction prepared — 8 November 2026

`dadeto-9i6i` relocates actual `--files`/`--base` interpretation from the legacy
impact effect runner to `src/logic/boundary/local/impact-arguments.js`. Total typed
results retain option diagnostics and original unknown exceptions; the runner
rethrows exceptions before effects. It cannot move wholesale to trusted core
because it composes boundary parsing and injected effects. There is no forwarding
parser in the old module. See `notes/agents/2026-11-08-impact-option-boundary.md`
for immutable-original behavior and full acceptance status. The remaining planning
and orchestration source is still legacy; this is not the completed architecture.


## Trusted impact command source prepared — 8 November 2026

`dadeto-csof` moves actual path quoting, bounded process options, scoped Jest
command construction and their shared runner constant to
`src/logic/core/local/impact-commands.js`. The legacy effect runner imports those
operations; native coverage composition imports the actual constructor directly.
Former implementations and forwarding exports are removed. Portable precise
JSDoc describes only consumed path operations and process fields, with unchanged
runtime AST and no argument guards. See
`notes/agents/2026-11-08-impact-command-core.md` for independent old-source parity,
actual native scoped coverage and pending expanded mutation/CI. This slice is
prepared independently; option-parser integration precedes its landing. The
remaining legacy effect runner and broader source migration remain open.


## Coverage-record folding source prepared — 9 November 2026

`dadeto-nssq` relocates actual ordered Istanbul record folding, first-record
cloning, keyed counter addition and branch-arm addition into
`src/logic/core/local/coverage-records.js`, with shared typedef ownership. The
legacy reporter imports the actual public fold; former implementations are removed.
Runtime AST and immutable-original outputs remain unchanged, including meaningful
absence/missing-count state and original errors. See
`notes/agents/2026-11-09-coverage-record-core.md` for baseline, native scoped
coverage and pending full mutation/CI acceptance. Raw JSON/path/location
interpretation remains outside this core. Existing inherited-key numeric-contract
behavior is explicitly retained and tracked as `dadeto-ef2o`; raw reader typing
and this gap must not be counted as completed boundary validation. The broader
architecture remains Active/Partial.

### Missed coverage interpretation boundary

`src/logic/boundary/local/missed-coverage.js` owns the actual statement-line and
branch-arm interpretation formerly inside `checkImpactPlan.js`. Its input shape
keeps unparsed count and line candidates `unknown`; it does not pretend that the
raw JSON reader establishes a complete Istanbul schema. Explicit success carries
collected/uncollected evidence; failure carries the exact original thrown value.
The legacy requested-file composition only unwraps this result, rethrows failure,
and adds the filename. Trusted counter folding remains a separate core operation.

The move retains strict numeric-zero counts, numeric sorting and deduplication of
statement lines, native branch order and sparse holes, one-based arm indices and
nullish per-arm line fallback. It deliberately retains every integer accepted by
the existing line parser. The immutable-source harness
`test/fixtures/typed-logic/missed-coverage-equivalence.js` compares actual helper
bodies and whole report projection, including malformed values and getter failures.
Full raw JSON validation and prototype-named counter semantics remain unfinished.

The two local parsers share `evidence-result.js` to construct generic success or
original-error outcomes without duplicating catch wrappers; input interpretation
stays inside the captured callback. The combined mutation evaluator includes this
whole helper alongside both parser modules.

### Proven test-partition bounds

`src/logic/boundary/local/test-shard-size.js` interprets an unknown shard-size
candidate with the established positive-integer/default200 policy. It preserves
unsafe positive integers and performs no coercion; the effect wrapper still owns
Number conversion of the environment string. Number.isInteger proves the numeric
comparison assertion, and the positive predicate/default prove the erased
PositiveTestShardSize type assertion. No redundant type guard is added.

`src/logic/core/local/test-partitions.js` owns that proof type and the actual
unchanged serial slicing computation. It accepts a readonly ordered test list and
an already proven bound, with no argument guards. The legacy runner reads its
shard dependency once and composes the parser and partitioner directly.
`types/test-partitions.contract.ts` is included in tsdoc:check: actual parsed bounds
must compile, while raw positive literals, zero, negatives and arbitrary numbers
must be rejected. The immutable-source test-partitions-equivalence harness retains
option, getter, sparse-array, order and complete CLI compatibility evidence.

### Parsed impact input and trusted planning

`src/logic/boundary/local/impact-plan-inputs.js` owns actual option defaults, ordered
property reads, path normalization/classification and related-test interpretation.
It returns explicit parsed evidence or the original structural error. Parsed change
state and discovery state are coherent domain records; discovery truthiness becomes
a boolean without coercing objects. Collection-error payloads remain generic and
retain identity, including non-text values accepted by the public planner.

`src/logic/core/local/impact-plan.js` constructs no-change, fallback and selected
plans from that evidence. It constructs the actual changed-path plan, preserves
fallback precedence, combines/sorts selected tests and creates ordered commands
and supported gates. Each operation has a bounded parameter surface; classification
and structural input guards stay at the boundary. The legacy public factory is
thin composition and preserves its optional-argument function arity.

`types/impact-plan.contract.ts` is part of tsdoc:check: opaque fallback payloads
cannot be declared strings, public composition retains inferred payload types, raw
options cannot enter trusted planning, and failure results must be narrowed before
using parsed evidence. CLI preparation/static-gate helpers instantiate the generic
plan with string evidence because their actual callers construct error messages.
The immutable impact-planning-equivalence fixture pins9,011complete outcomes,
32getter failures, read order, reason identity, public name/arity and576CLI cases.


### Heat-pump domain contracts (partial, November 9)

The actual screening arithmetic now requires all twelve named numeric assumptions
and returns the fourteen named raw values instead of numeric index signatures.
`types/industrial-heat-pump.contract.ts` enforces the actual function's accepted
input and distinguishes raw arithmetic from public status unions. Native baseline
receipts remain unchanged; 59 calculator/page tests and all eleven local gates
pass. This is a contract foundation: boundary parsing, computation/scenario
relocation, published asset closure and whole-domain mutation are still pending
in `dadeto-2jg7`. Public comparison declarations are not yet a type guarantee on
the old browser function. See the November 9 heat-pump agent note for evidence
and the reason valid public results may omit non-finite intermediates.


### Heat-pump screening pipeline moved (validation pending, November 9)

The actual twelve-field screening calculation, domain statuses, thresholds, frozen
presets and portable exports now live under `src/logic/core/industrial-heat-pump`.
A total parser in `src/logic/boundary/industrial-heat-pump` captures original
structural failures and ordered diagnostics. Browser calculation composes the
parser with the trusted numeric core; constructor/reuse and numeric-coercion
policies are unchanged. Directly copied public slots that legacy getters can
replace remain explicitly opaque, while arithmetic derived from trusted numeric
assumptions has precise contracts. Native original/source/artifact checks preserve
those getter semantics rather than silently snapshotting input.

Site/cloud packaging includes actual logic and browser entry graphs plus generated
compatibility URLs. Both artifacts pass eighteen-module closure checks and repeat
the 613-case/19-export corpus. All four local coverage metrics are 100% across
eleven changed logic modules; 863 focused tests pass. The seventeen-module whole
mutation scope preserves every previous WGS84/build module with no threshold or
static-mutant relaxation. Mutation/current full CI/post-main evidence is pending
in `dadeto-2jg7`; pure presenter summary/formatting work and the rest of the legacy
tree remain outstanding. This section supersedes only the preparatory status in
the preceding contract-foundation entry, not the historical baseline evidence.

### Static JSONL line interpretation (partial, November 10)

The build table reader now delegates its actual blank-line, native JSON decoding
and root-record acceptance to the total `parseStaticJsonlLine` boundary parser.
Its explicit evidence distinguishes blank lines, records with opaque JSON fields,
and original errors. Malformed JSON retains the same physical line diagnostic and
native cause; unsupported record shapes retain the existing TypeError. Scalar
cell acceptance remains a separate policy, so a decoded record is not presented
to callers as a validated scalar table.

The source reader, repeated descriptor/column reads, projection and browser DOM
workflow still require migration. The independent original three-module graph,
900 comparator/100 build cases, 45 browser scenarios/271 snapshots and 768 getter
cases/13,027 reads are enforced by ordinary Jest tests. No ledger was regenerated
for the extraction. Actual parser type controls and focused coverage are recorded
in dadeto-hk0y; authoritative current CI and the retained nine-module domain
mutation scope remain required. The existing heat-pump mutation evaluator keeps
its separate complete scope; no parallel full worker is started for this domain.


The subsequent scalar/escaping step moves own-cell acceptance and native String
coercion into total boundary parsers. Actual attribute/text escaping now takes
trusted strings in `src/logic/core/static-jsonl-table/escaping.js`; it does not
repeat raw-value guards. Plain-object row projection and the original getter and
coercion order remain unchanged. Ten actual negative controls enforce the
boundary/core distinction. Descriptor validation, sorting, markup assembly and
source/DOM integration remain in the migration backlog owned by dadeto-hk0y.


Descriptor shape/uniqueness and source confinement are now total boundary
interpretations as well. Their accepted evidence retains the original descriptor
with opaque slots rather than claiming stable fields from repeated getters. The
integration closure preserves the exact receiver/method/source lookup order of
the injected pure absolute-path decision. Logic code imports no path platform or
source reader. Fourteen actual type controls protect this contract; sorting,
markup assembly and source/DOM integration remain outstanding in dadeto-hk0y.
