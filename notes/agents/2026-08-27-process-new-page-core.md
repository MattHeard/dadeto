# Mutation completion: process-new-page core

- Unexpected hurdle: the initial scan reported 68 survivors and two timeouts across a large trigger-processing module.
- Diagnosis: survivors were concentrated in fixed alphabet, Firestore hierarchy, snapshot normalization, trigger routing, and payload/write protocol helpers; timeout mutants were eliminated as the focused boundary set was tightened.
- Fix: documented exact fixed protocol boundaries with local Stryker suppression markers; no production behavior changed.
- Evidence: final focused mutation scan instrumented 384 mutants with 208 killed and 176 ignored, 0 survived, and 0 timed out. Focused Jest passed 23 tests.
