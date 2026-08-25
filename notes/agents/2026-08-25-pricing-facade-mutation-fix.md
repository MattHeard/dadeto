# Mutation scan: pricing facade

- Unexpected hurdle: the target contains only forwarding wrappers around the scanned `pricing-core` implementation.
- Diagnosis: Stryker produced four facade-boundary mutants; none represented independent behavior from the core implementation.
- Fix: no source change was needed; recorded the explicit forwarding boundary and focused facade test.
- Evidence: 0 non-static survivors and 1 focused test passed.
- Next-time guidance: scan the implementation module for pricing behavior and record this thin facade as a static boundary.
