# Firestore handle mutation scan

- Unexpected hurdle: none; the focused trigger-registration tests covered every injected dependency.
- Diagnosis: the authoritative scan instrumented 4 mutants and killed all 4.
- Fix: no production change was needed; existing initialization, region, document, event, and handler assertions were sufficient.
- Next time: use injected trigger doubles for cloud registration helpers.
