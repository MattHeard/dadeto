# Reporter identity normalization

The strict report matched the local reporter string normalizer's fallback tail
with ledger ingest. Reporter identity fields now use canonical trimmedStringOrEmpty
directly. The original identity / alternate ID / anonymous ID short-circuit order
is unchanged: whitespace falls through, non-strings are not coerced, and a usable
earlier field prevents reading later getters.

Regression fixtures with throwing getters must be created inside tests. Passing
getter-bearing objects directly to Jest.each caused test-case formatting to read
them before the handler ran. Factory rows isolate handler behavior correctly.

Evidence: `.tmp/reporter-identity-tests.log`, four suites and 36 passing tests,
exact 100% module coverage. `.tmp/reporter-identity-static.log`, duplication-only
failure reduced 63 to 62, unchanged minTokens14 and ignores. Both builds pass:
`.tmp/reporter-identity-build.log`, `.tmp/reporter-identity-cloud-build.log`.
Final full acceptance: `.tmp/clone-goal-62-full-check.log`. aaou stays open until
zero clones and a completely green repository check.
