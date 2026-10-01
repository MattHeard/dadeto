# Shared possession endpoint validation

Normal and procurement-backed proposals share required endpoint presence and
segment-reference checks. Their exact shared error messages are retained.
Minute precision, spatial references, durations and warehouse constraints differ
between the proposals and remain local; do not merge them indiscriminately.

Nine fulfillment suites pass90 tests (`/tmp/dadeto-possession-context-tests.log`);
repository lint/types pass in corresponding logs. Unrestricted duplication
evidence is `/tmp/dadeto-possession-context-duplication.log` and the JSON report.
The gate remains red; no exemptions or suppressions added. dadeto-aaou stays open.
