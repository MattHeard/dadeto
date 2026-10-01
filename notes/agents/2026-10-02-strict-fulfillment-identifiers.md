# Strict fulfillment identifiers

Normal and procurement-prefix proposals share fulfillmentNonblankString rather
than duplicating their string-only identifier predicate. This is distinct from
the older coercing fulfillmentNonblank contract. Regressions reject numbers and
blank text and accept nonblank strings. Removed mutation suppression comments
from both touched shared/normal modules and obsolete clone-exclusion guidance.

Evidence: four focused suites pass47 tests (`/tmp/dadeto-strict-id-tests.log`);
strict lint and types pass in corresponding lint/types logs. Unrestricted
duplication exits1 with206 clones at minTokens14
(`/tmp/dadeto-strict-id-duplication.log` and reports/duplication/jscpd-report.json).
No scanner exceptions or ignore pragmas added. dadeto-aaou remains open.
