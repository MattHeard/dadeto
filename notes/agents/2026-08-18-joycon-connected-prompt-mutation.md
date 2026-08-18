# JoyCon connected-prompt mutation slice

- Unexpected hurdle: the connected-prompt selector had only indirect coverage through full prompt rendering.
- Diagnosis path: the bounded scan over lines 1541-1549 found five survivors across its started-state branch.
- Chosen fix: asserted both `getConnectedPromptCopy` paths directly: ready before start and active after start.
- Evidence: the verification scan killed all 5 mutants; focused Jest, targeted ESLint, and diff checks passed.
- Next-time guidance: test state selectors with representative inputs for every branch before relying on integration coverage.
