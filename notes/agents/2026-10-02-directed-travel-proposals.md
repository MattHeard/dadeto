# Directed travel proposal rules

Delivery outbound and pickup return duplicated point creation, validation,
serialization and error handling. travelSegmentProposal now owns these rules
with explicit direction data: possession anchor, warehouse coordinate field,
new point identifier and signed time offset. The existing toy functions retain
their public input and output contracts.

Keep duration rounded upward to whole minutes in both directions. Delivery
ends at possession; pickup starts there. Coordinate strings keep six decimals,
and failure messages name origin or destination as before. A four-duration
matrix covers zero, sub-minute, exact-minute and over-minute trips in both
directions. Existing primitive tests cover malformed requests and errors.

The legacy test's single describe callback required a max-lines exemption.
Removing that unnecessary outer callback preserves all test bodies and lets
the file pass lint without a pragma. Formatting explains the large test diff.

Evidence: `.tmp/travel-proposal-tests-final.log` (27 tests, exact 100% in
all four metrics), `.tmp/travel-proposal-static.log` (duplication only, 160
clones versus 163 before), `.tmp/travel-proposal-lint-final.log` (exit 0).
Remaining aggregate cleanup is owned by dadeto-aaou.
