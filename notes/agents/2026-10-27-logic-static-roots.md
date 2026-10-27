# Extend static quality to the logic namespaces

Bead: `dadeto-ws2w`; Rank 11 remains Partial.

## Hurdles and diagnosis

Eight red fixture cases proved lint, TypeScript, mutation and clone selectors
omitted both destination namespaces. An initial test imported undeclared
micromatch; use the already-declared TypeScript API for real config discovery.
Per AGENTS, dependency installation succeeded without dependency/lock changes.
A one-line, then borderline five-line clone fixture was below the detector's
existing minimum matching span; expanding the fixture proved cross-root clones
without lowering any scanner setting.

## Fix and durable evaluators

ESLint mirrors every existing module-specific policy to both target paths; its
command traverses both namespaces. TypeScript includes both with no new file
exclusions. Stryker positive roots and the active .jscpd.json roots include all
three namespaces. Source modules and platform wiring are unchanged.

```sh
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --coverage=false test/scripts/logic-static-roots.test.js test/scripts/lint-policy.test.js test/core/allowEffectsRule.test.js test/core/local/clone-scanner.test.js
npm run check -- --skip-tests
```

Focused result: 4 suites / 61 tests pass, including actual compiler-backed token
capture rejection and explicit permission acceptance, restricted-global/factory
import failures, TypeScript fixture discovery, and actual cross-root clones.
The subsequent split local aggregate passes 10/10 static gates; log:
`/tmp/dadeto-ws2w-check.log`. Repository scan: zero clones, minTokens 11 unchanged.
The authoritative full suite remains asynchronous in GitHub Actions.

## Next time

Extend parse/dependency/global/thin gates before moving any JS. The report module
now imports the shared classifier: refresh callers/dependencies rather than
relying on the earlier import-free historical inventory. Preserve deployed
module URLs/archive imports with explicit output mapping when moving runtime
sources. These preparatory gates do not complete the architecture migration.
