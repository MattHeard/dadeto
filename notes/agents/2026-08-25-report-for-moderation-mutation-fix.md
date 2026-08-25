# Mutation scan: report-for-moderation-core

- Unexpected hurdle: the initial scan left eight arithmetic weighting mutants alive because the tests compared only fully urgent and fully calm pages.
- Diagnosis: boundary fixtures could not distinguish the configured coefficients or normalization divisors.
- Fix: added non-unit signal fixtures with exact expected urgency contributions for every configured signal.
- Evidence: final focused scan instrumented 117 mutants and killed all 117 with no survivors or timeouts; three focused suites passed 32 tests.
- Next-time guidance: use isolated non-unit fixtures for weighted ranking formulas, not only endpoint comparisons.
