# Inject refund identity hashing

Bead: `dadeto-pu2z`; parent built-in remediation `dadeto-e1oz` / Rank 11.

## Change and invariant

The refund handler no longer imports node:crypto. Its required sha256Utf8
function comes from a thin cloud adapter, wired by the existing billing index.
The identity remains refund- plus lowercase SHA-256 of the UTF-8 tuple
[authenticated uid, purchase ID, trimmed caller retry key] joined with NUL.
Billing/provider gates, authentication/ownership, persisted intent ordering,
Stripe retry identity and AllowEffects forwarding remain intact.

Core tests use a controlled fake hasher and an opaque permission fixture; they
assert exact tuple delegation, failure before effects and hash gating. The
adapter's actual crypto is tested separately against fixed ASCII, NUL-tuple and
Unicode vectors independently computed with Python hashlib.

## Evidence so far

```sh
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --coverage=false test/core/cloud/billing/refund-request-core.test.js test/cloud/billing/refund-identity-adapter.test.js test/cloud/billing/refund-stripe-adapter.test.js test/cloud/billing/http-handler.test.js
npm run check:impact:run -- --files src/core/cloud/billing/refund-request-core.js
npm run check -- --skip-tests
npm run build
npm run build:cloud
npm run verify:cloud-packages
node node_modules/@stryker-mutator/core/bin/stryker.js run docs/quality/refund-request.stryker.config.mjs
```

Two initial failing regressions demonstrated ignored injected hashing and missing
failure propagation. Final focused set passes four suites / 21 tests. Scoped
source coverage has no uncovered lines/branches; lint/core parse/zero clones pass.
All 10 split local static gates and static/cloud builds pass. Package closure
verifies 27 Terraform packages / 702 reachable modules / 1,228 imports. Build
log explicitly copies refund-identity-adapter.js to the billing archive and
its shared cloud trees. No generated output was hand-edited.

Logs: /tmp/dadeto-pu2z-impact.log, /tmp/dadeto-pu2z-check.log,
/tmp/dadeto-pu2z-build.log, /tmp/dadeto-pu2z-cloud.log,
/tmp/dadeto-pu2z-packages.log. No payment, provider or production request was
needed. Existing billing flags and infrastructure configuration are unchanged.

The full-handler mutation experiment is separate: it instruments 145 mutants,
static evaluation enabled and break threshold 100. Survivors appeared in the
initial run, so keep the owning quality task open; inspect the report before
hardening tests. Do not infer condition discrimination from full Istanbul branch
coverage or lower mutation thresholds/suppress surviving mutants.
Report: reports/mutation/refund-request.json; log: /tmp/dadeto-pu2z-mutation.log.

## Next step

Land the passing dependency change while retaining mutation/CI follow-up evidence.
Tighten the next loop against exact survivor locations, preserving outward refund
behavior. Maintain the typed hash boundary and inspect exact asynchronous Full
Check before closure. This removes one more audited Node import: 12 modules /
25 static imports remain under the parent portability task.
