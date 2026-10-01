# WGS84 input boundary and numeric classification

The public WGS84 entry point now coerces coordinates before passing numbers to
the directory's numeric calculation module. Existing root and toy exports remain
compatible. Cloud copy plans include both new files, covered by copy assertions.
Numeric-string input has an explicit regression.

Removing coercion exposed a classifier defect: solver loop comparisons and
numeric termination were treated as input validation. Classification now separates
loop counters, numeric returns and convergence breaks from boolean rejection;
throw-based checks and boolean predicates remain validators in regression tests.
This is semantic classification, not a path exemption. The calculation's old
mutation suppression was removed. Cloud generation also exposed suppression
comments in the shared index; those were removed from the source rather than
propagated to generated output.

Evidence: WGS84/copy focused coverage is100% all metrics
(`/tmp/dadeto-wgs84-boundary-tests.log`); classifier/WGS84/copy suites pass15 tests
(`/tmp/dadeto-wgs84-classifier-tests.log`). Classifier subprocess tests need the
permitted unsandboxed runner; sandbox EPERM is not a code failure. Lint, types,
cloud packaging and dependency checks pass in `/tmp/dadeto-wgs84-*` logs.
Core-parse remains red for search-core/service-area, not WGS84
(`/tmp/dadeto-wgs84-boundary-gate.log`). dadeto-aaou stays open.
