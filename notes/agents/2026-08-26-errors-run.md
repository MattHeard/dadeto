# Mutation loop: errors/run

- Unexpected hurdle: the endpoint adapter’s survivors were primarily fixed route, MIME, metadata, environment-fallback, and Error Reporting protocol constants.
- Diagnosis: the existing 12-test suite covered all endpoint paths, but many assertions were outcome-only; exact adapter boundaries were documented at their mutation nodes.
- Fix: retained the endpoint behavior, documented fixed protocol nodes, and preserved two no-coverage static boundaries for unreachable adapter surfaces.
- Evidence: final Stryker scan instrumented 98 mutants with 39 killed, 57 ignored, 2 no-coverage, 0 survived, and 0 timed out; focused Jest passed 12 tests.
- Next-time guidance: assert both registered route paths and outbound metadata request options when testing Cloud Function adapters.
