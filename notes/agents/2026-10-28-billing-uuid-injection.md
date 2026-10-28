# Permission-first billing purchase IDs — 28 October 2026

Owning Bead `dadeto-wmj5`, under Rank 11 / `dadeto-e1oz`.

## Change

Billing runtime core no longer imports native crypto or silently supplies a random
UUID. Its runtime configuration requires `randomUUID(permission)` and pending
purchase creation forwards its existing invocation token only when no purchase
ID is supplied. Supplied IDs and timestamps retain their previous behavior. A
provider exception propagates before clock/database access or writes. Factory
composition does not invoke the provider; different requests/factories retain
their own permissions and implementations.

The thin `src/cloud/billing/runtime-adapter.js` supplies native UUID generation
for the six existing cloud compositions. It preserves empty/no/explicit-undefined
options and explicit provider/clock overrides. The webhook core receives its UUID
provider explicitly from its cloud entrypoint and forwards that exact function
without invoking it during setup. Native tests assert UUID format/uniqueness;
core tests use stubs and never require the native generator. Compiler contracts
reject missing provider/runtime and absent/forged generation permissions.

## Evidence

- Initial red regression exposes the dropped permission: providers received `[]`
  instead of `[permission]`. One unsupported Jest convenience matcher was also
  replaced with exact `mock.calls` assertions. `/tmp/dadeto-wmj5-red.log`.
- First implementation: 48 focused tests pass. Final core/native/webhook wiring
  set: five suites / **53 tests PASS**, `/tmp/dadeto-wmj5-wiring-focused.log`.
- `TMPDIR="$PWD/reports/tmp/billing-uuid" npm run check:impact:run -- --files
  src/core/cloud/billing/billing-runtime-core.js
  src/core/cloud/payment-webhook/payment-webhook-core.js`: **seven suites / 85
  tests PASS**, no uncovered lines or branches in either selected core module;
  lint/parse/zero clones pass. `/tmp/dadeto-wmj5-impact.log`. The later test-only
  provider-identity assertions pass in the final focused run above.
- `npm run check -- --skip-tests`: all 11 local static gates pass, including
  compiler/provider/token contracts, unchanged audit and wrapper rules.
  `/tmp/dadeto-wmj5-static.log`; final test-assertion rerun also passes all 11,
  `/tmp/dadeto-wmj5-static-final.log`.
- `npm run build`, `npm run build:cloud`, `npm run verify:cloud-packages`: PASS;
  **27 packages / 713 reachable modules / 1,234 imports**. The shared native
  adapter increases reachable package imports; do not reuse the old 707/1,227
  counts. Logs `/tmp/dadeto-wmj5-{build,cloud-build,closure}.log`.

This is fast local/scoped evidence, not global full-suite coverage. Keep the child
open until its exact pushed Full Check succeeds. No deployment, billing provider
request, production request or local Playwright execution was performed.

## Hurdle and remaining architecture work

Jest crawled a completed static-table mutation scratch copy inside reports/tmp
and reported duplicate root/vendor manifests. The exact completed copy was
removed only after its final report/terminal log were verified; source/reports
and shared caches stayed intact. Use task scratch outside the checkout on the
normal filesystem. The original generated Cloud Function manifest-name warning
remains separately owned by `dadeto-5wxt`; no source/test exclusion was added.

The UUID binding is deliberately outside the existing defaults mutation directive.
No new Stryker directive, mutation threshold change or exclusion was added. This
loop does **not** claim complete billing mutation coverage or purity: existing
inline directives, the ambient `now() => new Date()` fallback, runtime value
types and direct persistence adapters remain parent audit prerequisites.

Fresh static-import inventory leaves **three core modules / nine native imports**:
simulator/playwright-runner(3), simulator/server(2), simulator/simulator(4). This is
only an import census, not proof of no globals. Observable native prohibition,
trusted parsing, namespace preparation/migration, existing mutation limitations
and generator type-check exclusion (`dadeto-xyth`) remain unfinished.

## Exact CI receipt

Full Check [40705994407](https://github.com/MattHeard/dadeto/actions/runs/40705994407)
succeeded at `616aa541cb87a723c38e62fe4bf722f12dfde232`. Artifact
`12824313329` / `full-check-40705994407` confirms **1,082 suites / 8,359 tests**
all pass and all four global and both changed core-module coverage metrics 100%,
with no files below thresholds. Downloaded report:
`/tmp/dadeto-full-check-40705994407/coverage/check-full-report.md`.
This completes `dadeto-wmj5` with the scoped/local/build evidence above. The
explicit broader billing mutation/clock/value-type/persistence prerequisites
still belong to the parent; this is not an all-lines mutation or purity claim.
