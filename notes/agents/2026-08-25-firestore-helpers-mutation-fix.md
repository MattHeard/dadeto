# Firestore helpers mutation scan

- Unexpected hurdle: none; the focused Firestore helper suite covered all injected adapter operations.
- Diagnosis: the authoritative scan instrumented 35 mutants and killed all 35.
- Fix: no production change was needed; existing reference, transaction, batch, and path assertions were sufficient.
- Next time: retain injected Firestore doubles for helper-level mutation scans.
