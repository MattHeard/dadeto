# Commitment repository construction

In-memory record indexing and commitment projection now share the persisted
record boundary. Both old import paths re-export their existing capabilities.
This keeps raw segment/point interpretation together instead of exempting the
root repository module from parsing checks.

The dedicated suite initially exposed uncovered default collection branches.
Added an empty/default repository regression, retaining fail-closed handling of
incomplete assigned records. Nine tests now pass with exactly100% all coverage
metrics (`/tmp/dadeto-commitment-repository-tests.log`). Strict lint, type checking
and dependency gates pass (`/tmp/dadeto-commitment-repository-{lint,types,deps}.log`;
test lint: `/tmp/dadeto-commitment-repository-test-lint.log`).

The parser gate still fails other modules but no longer reports the browser
commitment repository (`/tmp/dadeto-commitment-repository-gate.log`). Remaining
full-check repairs are owned by dadeto-aaou; no exemptions were restored.
