# Pickup placement versus runner feasibility

The strict delivery/pickup tail pair repeated placement/runner composition.
Pickup now calculates a candidate in a pure placement helper and sends that result
to the existing withPlacementRunner policy. That policy already returns rejected
candidates untouched before reading runner state; no extra rejection layer is
needed. Invalid duration still outranks point parsing; invalid time outranks all
runner availability/commitment checks.

Evidence: `.tmp/pickup-placement-tests.log`, 81 tests/three suites, exact 100%
fulfillment coverage including rejection read order. `.tmp/pickup-placement-static.log`
fails duplication only, 61 to 60 strict clones. `.tmp/pickup-placement-build.log`
passes. No new exemptions or ignores, unchanged minTokens14. aaou remains open.
