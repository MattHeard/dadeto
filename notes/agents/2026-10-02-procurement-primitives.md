# Procurement primitive reuse

The prefix proposal reuses fulfillmentResult's finite nonnegative duration and
minute-alignment predicates. Its ID predicate remains local: it requires actual
strings, unlike fulfillmentNonblank's coercing contract. Removed the prefix's
old mutation suppression while making this change.

Three focused suites pass32 tests with100% prefix coverage on all metrics
(`/tmp/dadeto-procurement-primitives-tests.log`). Strict lint and types pass in
the corresponding lint/types logs. Unrestricted duplication still fails, now207
clones at minTokens14 (`/tmp/dadeto-procurement-primitives-duplication.log` and
`reports/duplication/jscpd-report.json`). No exclusions, threshold relaxations,
or ignore pragmas added. Remaining aggregate repairs belong to dadeto-aaou.
