# Asset possession candidate filter mutation loop

- Unexpected hurdle: the filter had no dedicated test file and normalized malformed input through a catch-all empty result.
- Diagnosis: direct tests were needed for interval resolution, overlap semantics, assignment-field fallback, SKU coercion, and deduplication.
- Fix: exported pure interval/SKU helpers, added focused tests, and classified only defensive empty-collection defaults as static.
- Evidence: final Stryker scan reported 39 killed, 41 static/no-coverage mutants, 0 survivors, and 0 timeouts; focused tests passed 6/6.
- Next-time guidance: add a dedicated test module before mutation triage when a primitive is currently covered only through a shared aggregate suite.
