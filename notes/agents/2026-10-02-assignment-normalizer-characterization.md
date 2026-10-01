# Assignment normalizer compatibility

Before extracting the three repeated assignment normalizers, characterize their
existing rejection of falsy identifiers and non-record inputs across all three
public functions. Numeric nonzero IDs remain covered by the prior tests; zero
is intentionally rejected by the existing falsy fallback and must not silently
change to an accepted ID during extraction.

The candidate suite passes12 tests
(`/tmp/dadeto-assignment-normalizer-characterization.log`) and strict test lint
passes (corresponding lint log). Production source remained unchanged while
the aggregate refresh collected coverage under session42753,
`/tmp/dadeto-hardening-refresh-check.log`. Its terminal result is still required;
dadeto-aaou remains open.
