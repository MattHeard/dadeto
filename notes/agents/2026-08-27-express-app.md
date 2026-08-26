# Mutation completion: express app

- Unexpected hurdle: this small shared wrapper had no dedicated focused test.
- Diagnosis: parser registration options and middleware order were unasserted.
- Fix: added a focused test covering app creation, `urlencoded({ extended: false })`, JSON parser registration, and middleware order.
- Evidence: final focused mutation scan instrumented 3 mutants and killed all 3, with 0 survived and 0 timed out. ESM-aware focused Jest passed 1 test.
