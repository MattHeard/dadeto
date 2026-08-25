# Mutation scan: credit-lots facade

- Unexpected hurdle: the target contains only forwarding wrappers around the scanned `credit-lots-core` implementation.
- Diagnosis: Stryker produced three facade-boundary mutants; none represented independent behavior from the core implementation.
- Fix: no source change was needed; recorded the explicit forwarding boundary and focused facade test.
- Evidence: 0 non-static survivors and 1 focused test passed.
- Next-time guidance: scan the implementation module for behavior and record thin forwarding facades as static boundaries.
