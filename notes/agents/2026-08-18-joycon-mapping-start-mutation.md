# Joy-Con mapping-start mutation coverage

- Unexpected hurdle: mapping-start initialization was untested through its direct helper surface, leaving two mutants alive.
- Diagnosis: existing coverage exercised the start guard but not the transition that selects the first pending control and captures the baseline snapshot.
- Fix: exported `startMapping` through the test-only surface and asserted started state, first control selection, and null baseline snapshot.
- Evidence: focused Jest passed 74/74; Stryker scan for lines 1693-1698 killed 2/2 mutants; targeted ESLint and diff check passed.
- Next-time guidance: distinguish an idempotent start guard from the full mapping-start state transition in mutation tests.
