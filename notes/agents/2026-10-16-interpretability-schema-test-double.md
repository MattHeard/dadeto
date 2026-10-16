# Interpretability schema test double

- Unexpected hurdle: the schema factory used injected Zod APIs, but the test suite still imported Zod directly and the first test double omitted `strictObject`.
- Diagnosis: inspect the factory's required API and use coverage's failing shard output; the production factory was correctly dependency-injected, while the test double was incomplete.
- Fix: tests now supply a small local schema-builder double, with no import of the `zod` package. It implements the factory's used validation and JSON Schema surface.
- Next time: when testing injected libraries, keep the test harness self-contained and run the owning test shard before the full check. Full verification: `DADETO_CHECK_TIMEOUT_MS=3600000 npm run check` passed.
