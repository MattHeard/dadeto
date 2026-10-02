# Shared rental asset operation order

The single-segment and sequence fulfillment selectors duplicated the five
asset-relevant operation names. They now share a frozen operation-order array,
while retaining their intentionally different segment validation semantics.
Historical Stryker suppressions were removed from both touched modules.

Evidence: the asset SKU, multi-segment asset, and fulfillment-boundary Jest
suites pass 26/26 tests (`/tmp/dadeto-asset-operations-tests.log`). Repository
lint and JSDoc type checks pass (matching `-lint.log` and `-types.log`).
`npm run duplication` still exits 1, but its exact report decreases from 195
to 194 clones at minTokens 14 (`/tmp/dadeto-asset-operations-duplication.log`,
`reports/duplication/jscpd-report.json`). No scanner settings changed.

Next-time guidance: share real domain concepts, not merely token spellings.
Do not merge the two selectors' validation rules: sequence validation rejects
duplicate segment references, while the original single-segment protocol has
its own compatibility behavior. dadeto-aaou remains open pending all gates.
