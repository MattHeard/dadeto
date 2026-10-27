# Refund handler mutation hardening

Bead: `dadeto-pu2z`; Rank 11 remains Active / Partial.

## Failure and tighter cases

The dependency-injection baseline 666782b passed 21 focused tests and full scoped
Istanbul coverage, but the whole-handler mutation run killed only 115/145:
30 survivors, zero timeouts, 79.31%. Strengthen condition discrimination with:

- exact billing-disabled/provider error payloads and no hashing at those gates;
- malformed purchase/retry values plus accepted exact lengths 150 and 255;
- empty authenticated UID rejection and no downstream hashing/effects;
- bearer prefix/end anchoring, mixed case, outer/multiple separator whitespace;
- malformed persisted-result outcomes and direct unknown-input parser cases.

Core tests keep hash behavior injected and use an opaque permission fixture.
Actual crypto vectors remain separate in the thin adapter tests. No payment,
provider or production request is needed for this evidence.

## Two proven simplifications

After trimming the whole header, the anchored bearer regex consumes the leading
separator whitespace and requires a nonempty capture. Trimming/optionally
checking that mandatory capture again is redundant; return match?.[1] ?? ''.
The new whitespace and partial-match tests preserve the exact token behavior.

For the persisted intent value, typeof != object maps non-objects to null;
the remaining object branch already returns a null input as null. Removed only
the duplicated !intent check, preserving object identity (including legacy array
acceptance) and all outward handler outcomes. Direct parser fixtures cover
primitive/null/object categories; this is not a claim of totality for hostile
accessors/proxies. Broader typed boundary migration remains outstanding.

## Final evidence

```sh
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --coverage=false test/core/cloud/billing/refund-request-core.test.js test/cloud/billing/refund-identity-adapter.test.js test/cloud/billing/refund-stripe-adapter.test.js test/cloud/billing/http-handler.test.js
npm run check:impact:run -- --files src/core/cloud/billing/refund-request-core.js
npm run check -- --skip-tests
npm run build
npm run build:cloud
npm run verify:cloud-packages
node node_modules/@stryker-mutator/core/bin/stryker.js run docs/quality/refund-request.stryker.config.mjs
```

Four focused suites / 62 tests pass. Scoped source coverage has no uncovered
lines/branches. All 10 split local static gates, generation, cloud assembly and
27-package closure verification pass (702 reachable modules, 1,228 imports).
Logs: /tmp/dadeto-pu2z-hardening-{impact,check,build,cloud,packages}.log.

Final full-module mutation: **141/141 killed**, including one static mutant,
zero survivors/timeouts/ignored/uncovered mutants, 100% score against the
unchanged 100% threshold. Report: reports/mutation/refund-request.json;
summary: reports/mutation/refund-request-summary.json. Embedded source exactly
matches the working module; SHA-256:
0ec8ebbfb940321bb2df3377fafb74a05d186b7422cb4338d96a4de9ffd019e4.
The baseline remains reports/mutation/refund-request.initial.json. No new
source/mutation exclusions or threshold reductions were added.

Injection commit666782b Full Check40547579414 succeeded. Keep the owning quality
Bead open until the hardening commit's exact asynchronous Full Check also has a
terminal result; local/static/mutation evidence does not prove the global suite.
The refreshed AST audit reports 12 legacy modules / 25 static built-in imports:
reports/mutation/logic-builtins-remaining.json. Continue parent remediation.
