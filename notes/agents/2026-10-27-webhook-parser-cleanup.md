# Webhook parser platform cleanup

Bead: `dadeto-an58`; parent built-in policy work: `dadeto-e1oz`.
Rank 11 remains Active / Partial.

## Unexpected hurdle and diagnosis

The parser imported crypto only for `safeEqual`; its raw-payload/JSON fallbacks
also retained Buffer and blanket mutation skips. Exact tracked consumer search
found `safeEqual`, `extractRawPayload`, `resolvePayloadBody` and `parseJsonEvent`
were used only by their own helper tests, reexports or unused wrapper mocks.
The real Stripe path independently resolves raw bytes and calls constructEvent.
It remains unchanged, including its strict raw-byte verification tests.

Remove these obsolete helpers and stale mocks/tests rather than building new
platform adapters for code with no production caller. Remaining helper bodies
are unchanged. Consolidate the facade's reexport with export-star: deleting the
obsolete names exposed an actual clone between its export and import lists.
The focused test locks the eight remaining module exports. Remove the leftover
unused test import caught by the aggregate lint gate.

## Evidence and limitations

A new focused suite characterizes the remaining event, metadata, integer,
header, status, duplicate-check and credit-event contracts. Preserve legacy
coercion behavior, including prefix integer parsing, untrimmed metadata,
nullish header precedence, status priority, negative-zero normalization and
async error propagation. This is preparatory cleanup, not the completed typed
boundary migration or a totality claim for arbitrary hostile proxies/accessors.

```sh
npm run check:impact:run -- --files src/core/cloud/payment-webhook/parsing.js src/core/cloud/payment-webhook/core.js
npm run check -- --skip-tests
node node_modules/@stryker-mutator/core/bin/stryker.js run docs/quality/payment-webhook-parsing.stryker.config.mjs
```

Scoped impact: 12 suites / 148 tests pass, both changed source modules collected,
no uncovered lines/branches; ESLint/core-parse/duplication pass, zero clones.
The split local static aggregate passes all ten gates after those focused
tests. This is not global coverage evidence.

Whole parser mutation: 90/90 Killed, zero survivors/timeouts/ignored/uncovered
mutants, static evaluation enabled (none generated), unchanged 100% break
threshold. All eight original blanket Stryker-disable regions in this touched
module are gone, including regions deleted with obsolete helpers. No global
source/mutation exclusions or thresholds changed.

Report: `reports/mutation/payment-webhook-parsing.json`; summary:
`reports/mutation/payment-webhook-parsing-summary.json`. Embedded source exactly
matches the module, SHA-256:
`1f4fbf24bf0060fa1262b11c2658102333c1db6ea097346d43e08e7126da3a6d`.
Logs: `/tmp/dadeto-an58-{impact-final,static-final,mutation}.log`.

The refreshed Acorn static import census leaves 11 legacy modules / 24 direct
built-in imports (`reports/mutation/logic-builtins-remaining.json`). Dynamic
imports, host globals and JSDoc imports are outside that census. Do not claim
core purity from this count or the current dependency-cruiser graph filter.

Next time: trace real production consumers before introducing adapters; use the
fully composed facade in clone checks; preserve signed raw-byte behavior and
negative-zero normalization. Build/package receipts and exact pushed Full Check
belong on the Bead before closure. No payment/provider/production request was
needed for this loop.

Static generation, cloud assembly and package closure pass: 27 Terraform
packages, 702 reachable modules and 1,227 imports. Logs:
`/tmp/dadeto-an58-{build,cloud,packages}.log`. Final direct parser/domain/
wrapper/expiry rerun passes 4 suites / 104 tests after the negative-zero case
and unused test-import correction. Full CI remains a separate receipt.
