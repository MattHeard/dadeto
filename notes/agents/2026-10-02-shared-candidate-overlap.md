# Shared candidate overlap

Asset candidate filtering now reuses assignmentIntervals' half-open overlap
helper and re-exports the old overlap name. No endpoint semantics changed.
Five focused tests pass (`/tmp/dadeto-overlap-tests.log`); strict lint passes
(`/tmp/dadeto-overlap-lint.log`). The unrestricted minTokens14 duplication gate
still exits1, now reporting209 clones (`/tmp/dadeto-overlap-duplication.log` and
`reports/duplication/jscpd-report.json`). Continue extracting genuine shared
behavior from the current report; do not narrow scan scope. dadeto-aaou is open.
