# Fulfillment context and recovery builders

Normal and procurement-backed proposals share configured possession context,
warehouse coordinate serialization, and inspection/cleaning recovery segments
through fulfillmentResult. Their validators, generated-ID requirements,
operation metadata, time allocation and public success/failure envelopes remain
distinct. In particular procurement uses its generated warehouse space-point
ID; normal fulfillment retains the authored warehouse ID.

The recovery tail accepts each caller's warehouse-arrival point explicitly.
New tests verify segment order, exact identifiers, coordinate rounding and
non-mutation of authored records. Existing proposal tests cover complete
timelines and invalid requests.

Evidence: `.tmp/fulfillment-context-tests-final.log` (99 tests, 11 suites,
exact 100% across three source modules), `.tmp/fulfillment-context-static.log`
(all static gates pass except duplication; 148 clones versus 149 before),
and `.tmp/fulfillment-context-lint-final.log` (exit 0). The strict minTokens 14
configuration is unchanged. Remaining full-check work stays in dadeto-aaou.
