# Fulfillment composition boundary

Canonical normal proposals and procurement/normal composition now live in `fulfillmentComposition.js`, sharing a configured synchronous JSON toy factory in `fulfillmentResult.js`. The original public module paths re-export their original names. Calculation bodies, validation order, result ordering, and failure serialization remain unchanged.

A factory-only extraction passed all tests but left the exact import-boundary clone and the count at 115. The tighter structural fix puts both related strategies behind one dependency declaration; changing import spelling or order would not have centralized this responsibility.

Evidence: `.tmp/fulfillment-composition-tests.log` has 1,217 passing tests / 134 suites, and exact 100% coverage in all four metrics for both shared modules. `.tmp/fulfillment-composition-static.log` records nine passing static gates; duplication alone fails at 114 clones, down from 115. No exclusions or threshold changes. Full aggregate remains required before parent-goal completion.
