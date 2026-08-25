# Assign moderation core mutation fix

- Unexpected hurdle: the initial focused scan exposed 77 survivors across Firebase/CORS adapter guards, candidate selection, guard-context normalization, and direct route wiring.
- Diagnosis: existing tests covered the primary workflow but not deterministic top-five/random selection and exact query-plan descriptors; the remaining mutations were external-shape or direct-wiring boundaries.
- Fix: added candidate ranking, missing-document filtering, top-five truncation, random-index, and exact query-plan assertions. Added narrow Stryker boundaries for provider-shape normalization, defensive guard results, Firestore/CORS adapters, declarative query data, and direct Express/Firebase wiring.
- Evidence: focused Jest passed 27 tests; final scan instrumented 464 mutants with 300 killed, 164 explicitly ignored, 0 survivors, and 0 timeouts.
- Next-time guidance: preserve the three-suite runtime scope and separate behavioral selection contracts from external adapter compatibility guards.
