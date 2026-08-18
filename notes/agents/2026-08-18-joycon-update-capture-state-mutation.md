# JoyCon update-capture-state mutation slice

- Unexpected hurdle: the first capture-transition test covered only the truthy capture branch, leaving forced-capture behavior alive.
- Diagnosis path: the bounded scan killed 3/4 mutants and identified the always-capture conditional survivor.
- Chosen fix: added a no-new-capture call asserting that the previous snapshot updates without advancing the control.
- Evidence: the final verification scan killed all 4 mutants; focused Jest, targeted ESLint, and diff checks passed.
- Next-time guidance: pair positive capture tests with stable-snapshot no-op tests for conditional update functions.
