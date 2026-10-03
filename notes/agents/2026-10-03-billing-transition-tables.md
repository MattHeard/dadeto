# Billing transition tables

Both billing state graphs use one private immutable transition-table builder. Active edges remain data; terminal states are explicitly registered as empty lists. The outer map and every list remain frozen, state insertion order is retained, and unknown-state behavior is unchanged. Public APIs are untouched.

Expanded the existing terminal/unknown-state test into a complete allowed/rejected edge matrix for both graphs, including unknown source and destination states. This replaces weaker assertions rather than adding a redundant case.

Evidence: `.tmp/billing-transition-table-final-tests.log` records 75 passing tests / 12 billing suites with exact 100% coverage in all four metrics for the protocol core. The initial production-only static run passed nine gates with duplication alone failing at 110 clones. Adding the exhaustive matrix exposed two camelcase warnings in fixture state keys; `.tmp/billing-transition-table-final-static.log` therefore has both lint and duplication failures. An earlier bead comment overstated that final static result. Fixed the fixture using computed string keys, preserving the exact billing state values without exemptions. Rerun evidence is recorded separately. No ignores, exclusions, or threshold changes. Parent goal remains open.

Corrected terminal evidence: `.tmp/billing-transition-table-corrected-tests.log` has 75 passing tests / 12 suites and exact 100% protocol coverage; `.tmp/billing-transition-table-corrected-static.log` has nine passing gates with duplication alone failing at 110 clones. This supersedes the earlier final-static claim.
