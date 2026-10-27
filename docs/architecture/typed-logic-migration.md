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
| Full report | `src/local/write-check-full-report.js` → `src/core/local/checkFullReport.js`; `.github/workflows/check.yml` | Update both changed-file filters and outside-core diagnostic; preserve truthful unavailable/partial reporting. Full Check remains asynchronous and distinct from fast local checks. |
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

## Acceptance per implementation slice

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
