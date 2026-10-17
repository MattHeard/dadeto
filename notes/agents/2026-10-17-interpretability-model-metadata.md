# Interpretability model and tokenizer metadata

- Unexpected hurdle: tokenizer identity cannot be inferred safely from a model repository or model revision, so it needs its own repository and immutable revision.
- Diagnosis: the shared pinned-model schema is used by mechanisms, experiments, and whole-model estimates, making it the right place for architecture and tokenizer provenance.
- Fix: require a non-empty architecture name and a strict tokenizer object with URL repository and 40- or 64-character immutable revision. Reuse the commit-revision schema for model, tokenizer, and procedure references.
- Zod boundary: schema construction remains injected; tests pass both with installed Zod and with the local test double forced.
- Evidence: both focused modes passed 2 suites / 11 tests. Full `npm run check` passed all 10 gates, 11 E2E tests, 100% coverage, and zero clones. Artifact: `.tmp/interpretability-model-metadata-check.log`.
- Next time: consider a model checkpoint checksum and tokenizer-specific metadata after choosing an actual pinned research fixture; avoid inventing model details.
