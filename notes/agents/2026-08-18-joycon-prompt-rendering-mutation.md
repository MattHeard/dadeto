# JoyCon prompt-rendering mutation slice

- Unexpected hurdle: `renderPrompt` had no direct test despite its callers being exercised indirectly.
- Diagnosis path: the bounded scan over lines 1554-1564 found three branch survivors and one uncovered branch-body mutant.
- Chosen fix: exposed `renderPrompt` through the test-only surface and asserted disconnected and HID-connected text writes.
- Evidence: the verification scan killed all 4 mutants; focused Jest, targeted ESLint, and diff checks passed.
- Next-time guidance: test rendering adapters at their DOM-write boundary when caller-level coverage does not distinguish state branches.
