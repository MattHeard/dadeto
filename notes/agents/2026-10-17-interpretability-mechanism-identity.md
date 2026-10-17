# Interpretability physical mechanism identity

- Unexpected hurdle: the first full check found two uncovered nullish-coordinate branches because the graph fixtures exercised only native-neuron records.
- Diagnosis: the canonical identity key intentionally includes optional coordinates for native neurons, SAE features, attention heads, and recurrent states; the test fixtures needed to cover variants where those fields are absent.
- Fix: graph validation now detects distinct record IDs that point to the same pinned model repository/revision, layer, activation hook, kind, source, and coordinate. Distinct neuron indices remain valid. Incomplete records skip identity fingerprinting until their schema boundary has validated them.
- Zod boundary: schema construction remains injected and focused tests pass with both installed Zod and the forced local test double.
- Evidence: focused suites passed 2 suites / 15 tests in both modes; targeted graph branch coverage was 50/50. Full `npm run check` passed all 10 gates, 11 E2E tests, 100% coverage, and zero clones. Artifact: `.tmp/interpretability-mechanism-identity-check.log`.
- Next time: preserve the canonical key when adding new mechanism kinds or identity coordinates, and add a distinct-identity test for each new variant.
