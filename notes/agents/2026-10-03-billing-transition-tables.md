# Billing transition tables

Both billing state graphs use one private immutable transition-table builder. Active edges remain data; terminal states are explicitly registered as empty lists. The outer map and every list remain frozen, state insertion order is retained, and unknown-state behavior is unchanged. Public APIs are untouched.

Expanded the existing terminal/unknown-state test into a complete allowed/rejected edge matrix for both graphs, including unknown source and destination states. This replaces weaker assertions rather than adding a redundant case.

Evidence: `.tmp/billing-transition-table-final-tests.log` records 75 passing tests / 12 billing suites with exact 100% coverage in all four metrics for the protocol core. `.tmp/billing-transition-table-final-static.log` records nine passing static gates and duplication alone failing at 110 clones, down from 111. No ignores, exclusions, or threshold changes. Parent goal remains open.
