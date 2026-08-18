# JoyCon stored-state refresh mutation slice

- Unexpected hurdle: `refreshStoredState` was only covered through lifecycle callers.
- Diagnosis path: the bounded scan over lines 1645-1651 found two survivors in the stored-state assignment and current-control fallback.
- Chosen fix: added a direct refresh assertion with a minimal local-storage facade.
- Evidence: the verification scan killed both mutants; focused Jest, targeted ESLint, and diff checks passed.
- Next-time guidance: test state refreshers directly with deterministic persisted-state inputs.
