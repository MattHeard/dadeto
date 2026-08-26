# Mutation completion: express app dependencies

- Unexpected hurdle: this small adapter had no direct focused test.
- Diagnosis: the factory and parser references were only covered indirectly through consumers.
- Fix: added a focused adapter-contract test asserting parser identity and app-factory delegation.
- Evidence: final focused mutation scan instrumented 3 mutants and killed all 3, with 0 survived and 0 timed out. ESM-aware focused Jest passed 1 test.
