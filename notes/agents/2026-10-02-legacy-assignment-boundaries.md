# Legacy assignment boundaries

The three 2026-08-21 writers share legacyAssignmentBoundary for JSON parsing
and caller-selected failure envelopes. The runner and atomic writers share
resolveLegacyRunnerShift for candidate indexing and first-covering-shift lookup.
Their validation order, speed rules, raw identifier metadata and persistence
remain unchanged.

Do not replace these legacy policies with the stricter 2026-08-22 rules:
empty input must fail JSON parsing, non-Error thrown values retain an absent
message, and missing shift endpoints throw instead of being silently skipped.
The new legacyAssignmentBoundary tests characterize all three behaviors.

Initial focused runs omitted the multi-candidate boundary tests. Include
test/toys/2026-08-24/fulfillmentBoundaries.coverage.test.js alongside the
2026-08-21/22/23 suites to cover the shared feasibility core fully. Final:
122 tests, 12 suites, exact 100% statements/branches/functions/lines for five
changed source modules (`.tmp/legacy-assignment-tests-accepted.log`).

Static aggregate evidence: `.tmp/legacy-assignment-static.log`, duplication
only (154 clones, down from 158). The test file's max-lines pragma was removed
by eliminating its oversized grouping callbacks; individual tests remain.
Final lint: `.tmp/legacy-assignment-lint-accepted.log`, exit 0. Remaining
aggregate work stays open in dadeto-aaou.
