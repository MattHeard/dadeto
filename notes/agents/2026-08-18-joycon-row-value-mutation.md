# JoyCon row-value mutation slice

- Unexpected hurdle: the row-value scan left the capture-condition true replacement alive.
- Diagnosis path: the mapped-row assertion covered the capture path, but the unmapped fallback path was not asserted.
- Chosen fix: asserted that an active unmapped row displays `listening...`.
- Evidence: the final bounded Stryker run over line 1407 killed both conditional mutants; focused Jest, targeted ESLint, and diff checks passed.
- Next-time guidance: pair capture-path assertions with fallback-state display assertions.
