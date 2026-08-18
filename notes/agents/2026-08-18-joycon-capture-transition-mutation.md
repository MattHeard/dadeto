# JoyCon capture-transition mutation slice

- Unexpected hurdle: the initial capture assertion checked only the action field, leaving the capture payload object removable.
- Diagnosis path: the bounded scan over lines 1760-1771 killed 3/4 mutants and identified the surviving payload object literal.
- Chosen fix: asserted the serialized capture type, index, and value in addition to state advancement.
- Evidence: the final verification scan killed all 4 mutants; focused Jest, targeted ESLint, and diff checks passed.
- Next-time guidance: assert complete serialized payloads, not only their top-level action discriminator.
