# Catalog seed mutation scan

- Unexpected hurdle: the only survivor was an equivalent empty-array normalization branch; both the original array return and object-entry fallback produce the same empty result.
- Diagnosis: the focused scan reported 51 mutants, with 50 killed and one static equivalent survivor.
- Fix: retained the explicit supported array/object catalog normalization and verified both forms, null input, identity validation, seed idempotence/conflict, malformed packages, and quoting in four focused tests.
- Next time: identify equivalent normalization branches separately from behavioral survivors before changing valid compatibility logic.
