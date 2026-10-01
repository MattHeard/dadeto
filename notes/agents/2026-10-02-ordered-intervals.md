# Ordered interval reuse

Four temporal resolvers share the finite-and-ordered endpoint predicate from
assignmentIntervals. Each resolver still owns its existing reference validation,
error text and return shape; equal endpoints remain valid.

Evidence:12 focused suites pass144 tests (`/tmp/dadeto-interval-order-tests.log`);
repository lint and type checks pass in corresponding lint/types logs. The
unrestricted minTokens14 duplication report is
`/tmp/dadeto-interval-order-duplication.log` and
`reports/duplication/jscpd-report.json`; gate remains red. No exclusions added.
The larger aggregate repair stays open under dadeto-aaou.
