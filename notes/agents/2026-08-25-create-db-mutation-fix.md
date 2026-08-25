# Mutation scan: get-api-key-credit-v2 create-db

- Unexpected hurdle: none; the existing adapter suite covered named and default Firestore construction.
- Diagnosis: the authoritative focused scan reported 19 killed mutants with no survivors or timeouts.
- Fix: no source or test change was needed; recorded the verified adapter evidence.
- Evidence: focused Jest passed 2 tests.
- Next-time guidance: retain explicit named-ID, default-ID, whitespace, and invalid-type constructor assertions.
