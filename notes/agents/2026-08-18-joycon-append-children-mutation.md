# Joy-Con child append mutation coverage

- Unexpected hurdle: `appendChildren` had two survivors because no direct test asserted its iteration and callback behavior.
- Diagnosis: surrounding DOM tests did not prove that every child is appended to the same parent in order.
- Fix: exported `appendChildren` through the test-only surface and asserted the exact ordered append calls.
- Evidence: focused Jest passed 77/77; Stryker scan for lines 2019-2021 killed 2/2 mutants; targeted ESLint and diff check passed.
- Next-time guidance: test small collection wrappers with exact call sequences, not only aggregate side effects.
