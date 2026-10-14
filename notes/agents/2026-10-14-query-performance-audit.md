# Query performance spec audit

- Unexpected hurdle: the scheduled benchmark and fixed-round-trip tests looked complete, but `listForRunner` still materializes one segment and two spacetime-point records for every matching assignment.
- Diagnosis: the deterministic tests exercise 1 and 100 assignments and enforce the indexed runner filter plus three network round trips. The 100-record fixture still performs 300 dependent document reads. `rg -l runner_assignments src --glob '!**/toys/**'` found only the repository reader; production writes for runner assignments, segments, and spacetime points are not owned in this repository.
- Chosen fix: enforce the indexed `personId == runnerId` filter in both small and 100-record budget fixtures. Keep the Notion spec Active / Partial and create a follow-up to identify the source-of-truth writer and implement a maintained read projection before removing query-time reconstruction.
- Evidence: focused Jest run passed 2 suites / 16 tests; full `npm run check` passed all 10 gates with zero failures; `git diff --check` passed. The full check log is `.tmp/query-performance-check.log`.
- Next-time guidance: do not call a batched linear number of Firestore reads a constant-work projection. Confirm the write owner and projection update/backfill contract before changing the query contract.
