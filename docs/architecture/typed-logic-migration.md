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
