## 2026-05-27 Check Gate Cleanup

- Hurdle: `npm test` was green on suites but still red on coverage, with the last stubborn misses concentrated in `src/core/check-runner.js` and a couple of helper branches in ledger-ingest and toy coverage.
- Diagnosis: the remaining gaps were mostly tiny branch edges, including an impossible nullish fallback in the stream tail handling and a few helper branches that were only reachable through defaulted or test-only paths.
- Fix: split runner option resolution into a small helper, added focused helper exports for the awkward coverage edges, and added tests for the default runner path, stream fallbacks, and missing-header / nullish helper cases.
- Next time: if coverage is stuck below threshold but suites are green, check the final uncovered line numbers first and look for dead fallback branches that can be simplified instead of adding more behavioral tests.
