# JoyCon complete-prompt mutation slice

- Unexpected hurdle: the completed-mapping prompt helper had only indirect state-driven coverage.
- Diagnosis path: the bounded scan over lines 1484-1488 found two surviving string mutants with no completed tests.
- Chosen fix: exposed the pure helper through the test-only surface and asserted its complete prompt object.
- Evidence: the verification scan killed both mutants; focused Jest, targeted ESLint, and diff checks passed.
- Next-time guidance: keep prompt-copy behavior independently asserted even when callers are covered.
