# Joy-Con capture-loop mutation coverage

- Unexpected hurdle: the interval lifecycle helper had three survivors because tests did not exercise its callback or disposer directly.
- Diagnosis: indirect loop coverage did not prove the 50ms schedule, callback handoff, or exact interval cleanup.
- Fix: exported `startJoyConCaptureLoop` through the test-only surface and asserted scheduling, callback snapshot refresh, and disposal of the returned interval ID.
- Evidence: focused Jest passed 79/79; Stryker scan for lines 2053-2056 killed 3/3 mutants; targeted ESLint and diff check passed.
- Next-time guidance: lifecycle timer tests should exercise both the scheduled callback and cleanup callback.
