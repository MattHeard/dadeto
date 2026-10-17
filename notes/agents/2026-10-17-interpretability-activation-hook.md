# Interpretability mechanism activation hooks

- Unexpected hurdle: the schema tests needed to exercise both installed Zod and the local test double, and the strict schema contract required updating every mechanism fixture consistently.
- Diagnosis: the V1 mechanism union shares a common base object, so a required field there applies uniformly to native neurons, SAE features, attention heads, and recurrent states.
- Fix: added a required non-empty `activationHook` to that shared base and fixtures; an empty hook is rejected.
- Zod boundary: tests passed with installed Zod and with `DADETO_TEST_WITHOUT_ZOD=1`; core still receives the schema API by injection.
- Evidence: both focused modes passed 2 suites / 11 tests. Full `npm run check` passed all 10 gates, 11 E2E tests, 100% coverage, and zero clones. Artifact: `.tmp/interpretability-activation-hook-check.log`.
- Next time: extend the same versioned identity in small increments for architecture/tokenizer metadata and verify that activation replay can consume the recorded hook.
