# JoyCon ready-prompt mutation slice

- Unexpected hurdle: the ready-prompt helper had only indirect coverage through rendering state.
- Diagnosis path: the bounded scan over lines 1472-1476 produced two surviving string mutants with no completed tests.
- Chosen fix: exposed the pure helper through the test-only surface and asserted its complete prompt object.
- Evidence: the verification scan killed both mutants; focused Jest, targeted ESLint, and diff checks passed.
- Next-time guidance: assert pure prompt-copy helpers directly instead of relying on state-driven callers.
