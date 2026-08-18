# JoyCon capture-gating mutation slice

- Unexpected hurdle: `shouldSkipCapture` had no direct branch coverage despite being used by polling.
- Diagnosis path: the bounded scan over lines 1836-1845 found all six logical and boolean mutants surviving.
- Chosen fix: added a four-case truth table for idle, missing-control, both-missing, and captureable states.
- Evidence: the verification scan killed all 6 mutants; focused Jest, targeted ESLint, and diff checks passed.
- Next-time guidance: cover compound polling gates with every independent boolean combination.
