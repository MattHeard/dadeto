# Joy-Con initial-sync mutation coverage

- Unexpected hurdle: initial payload synchronization had four survivors because its animation-frame callback was not exercised directly.
- Diagnosis: surrounding initialization tests did not prove scheduling, callback execution, payload construction, or the initialize action.
- Fix: exported `queueJoyConInitialSync` through the test-only surface and asserted the queued callback emits the initialize payload with the current control key.
- Evidence: focused Jest passed 80/80; Stryker scan for lines 2065-2074 killed 4/4 mutants; targeted ESLint and diff check passed.
- Next-time guidance: for deferred UI work, invoke the captured scheduler callback and assert the resulting payload, not only scheduler registration.
