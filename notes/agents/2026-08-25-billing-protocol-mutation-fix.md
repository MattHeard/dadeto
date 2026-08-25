# Billing protocol mutation fix

- Unexpected hurdle: the repository test wrapper hit the known sandbox `spawnSync node EPERM` error, so the focused Jest runner was used for direct verification.
- Diagnosis: the initial scan left three survivors in ledger-event validation; they represented unchecked false branches for non-string fields and the immutable marker.
- Fix: added focused assertions for invalid field types and the `immutable: true` contract, plus transition and balance edge cases.
- Evidence: focused Jest passed 16 tests; the authoritative scan instrumented 86 mutants with 57 killed, 26 explicitly ignored, 0 survivors, and 0 timeouts.
- Next-time guidance: preserve the per-file scan scope and distinguish documented ignored compatibility boundaries from executable survivors.
