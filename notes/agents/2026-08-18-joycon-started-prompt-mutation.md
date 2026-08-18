# JoyCon started-prompt mutation slice

- Unexpected hurdle: the started-prompt selector was covered only through broader rendering behavior.
- Diagnosis path: the bounded scan over lines 1525-1533 found four survivors across the complete and active branches.
- Chosen fix: asserted both `getStartedPromptCopy` outcomes directly, including the exact completion boundary and active button copy.
- Evidence: the verification scan killed all 4 mutants; focused Jest, targeted ESLint, and diff checks passed.
- Next-time guidance: test branch selectors through each returned helper path, not only through their eventual UI consumer.
