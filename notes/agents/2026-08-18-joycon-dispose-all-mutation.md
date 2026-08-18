# Joy-Con disposer cleanup mutation coverage

- Unexpected hurdle: `disposeAll` had two survivors because cleanup was only exercised indirectly.
- Diagnosis: no direct test proved that every disposer executes in registration order.
- Fix: exported `disposeAll` through the test-only surface and asserted the complete ordered call sequence.
- Evidence: focused Jest passed 78/78; Stryker scan for lines 2028-2032 killed 2/2 mutants; targeted ESLint and diff check passed.
- Next-time guidance: test cleanup utilities directly, including iteration count and ordering.
