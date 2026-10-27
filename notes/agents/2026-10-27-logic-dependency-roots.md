# Dependency/global policies for both logic destinations

Beads: `dadeto-141e` (root selection), `dadeto-lqbv` (quoted-state bug).
Rank 11 remains Active / Partial. No JavaScript module moved.

## Diagnosis and fix

Real filesystem/scope fixtures showed both destination namespaces escaped the
implicit-global/random gate. It now scans all supported roots by default, while
an explicit sourceRoot retains its singular meaning. External dependency-cruiser
runs once. Integration imports may reference both destination namespaces; current
local/platform/package and domain isolation policies cover both. Trusted core
cannot import boundary; boundary may use core. Legacy mixed core remains a
migration source, not proof of pure/trusted contracts.

A positive string fixture exposed an existing lexical bug: single/double quote
states resumed code after one character, counting Math.random in text. Correct
continuation states and direct regressions cover leading text, escaped quotes,
and real calls after text. This does not change template-expression analysis.

## Evaluator lessons

The dependency-cruiser JSON reporter returns exit zero even on rule violations;
assert summary.violations/error, not exit one. Copy the actual config into the
fixture repo and inspect discovered paths. Our fixture proves package/local
import rejection, domain isolation and trusted direction, alongside valid
integration and boundary-to-core imports.

The same real graph exposed an older blind spot: includeOnly filters built-in
endpoints before the nominal no-builtins rule. Do not claim built-in portability
from this gate yet. Bead `dadeto-e1oz` owns making that policy observable and
removing the existing direct built-in dependencies before source moves. An AST
audit found 15 legacy files / 28 static built-in imports (excluding JSDoc).
No source exclusion, new baseline skip, or weakened rule was added here.

## Evidence

```sh
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --coverage=false test/scripts/logic-dependency-roots.test.js test/core/scripts/check-depcruise.test.js
npm run check:impact:run -- --files src/core/scripts/check-depcruise.js
npm run check -- --skip-tests
npm run lint
node node_modules/@stryker-mutator/core/bin/stryker.js run docs/quality/logic-dependency-roots.stryker.config.mjs
```

Final focused result: 2 suites / 54 tests pass. Scoped source coverage collected
check-depcruise.js with no uncovered lines/branches; changed-file lint, core parse
and zero clones pass (`/tmp/dadeto-141e-impact.log`). The subsequent split local
aggregate passes all 10 static gates (`/tmp/dadeto-141e-check.log`); lint was rerun
after the final added regression (`/tmp/dadeto-141e-final-lint.log`).

Changed-line mutation evidence: 21/21 killed, including static evaluation,
100% break threshold, no survivors/timeouts, report
`reports/mutation/logic-dependency-roots.json`. The first run had one survivor
forcing the double-quote branch true for templates; a real-call-after-template
case killed it on the unchanged second run. Focused ranges are explicit in the
retained config and must be refreshed if those lines move. Its small sandbox and
ranges do not alter global selection or prove unrelated functions mutation-tested.
Complete-suite validation remains the exact pushed Full Check in Actions.

## Next time

Builtin enforcement/remediation (`dadeto-e1oz`), parse/boundary semantics and thin
wrapper classification remain prerequisites before moves. Preserve deployed
imports/URLs with explicit build mapping for affected modules. Never infer
architecture completion merely from selector tests passing.
