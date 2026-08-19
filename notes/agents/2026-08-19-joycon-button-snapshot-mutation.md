# JoyCon button-snapshot mutation slice

- Unexpected hurdle: the first scan left the value-comparison conditional mutant alive.
- Diagnosis: existing mismatches changed both `pressed` and `value`, so they did not isolate the value comparison.
- Fix: added a direct value-only mismatch assertion and kept the assertion in the focused comparison test to satisfy the statement-count gate.
- Evidence: `npx jest --config jest.config.mjs --runInBand test/core/browser/inputHandlers/joyConMapper.helpers.test.js` passed 87 tests; targeted ESLint and `git diff --check` passed; Stryker scanned 8 mutants with 8 killed, 0 survived, and 0 timeouts.
- Next time: isolate each conjunct in compound equality helpers with a mismatch that leaves the other conjunct equal.
