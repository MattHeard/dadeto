# Mutation loop: create-checkout-session runtime-core

- Unexpected hurdle: the small three-test adapter suite left one survivor around incomplete idempotency records and several unobserved collaborator-shape details.
- Diagnosis: direct identity, default, collection, and purchase-key assertions covered the adapter contracts; the remaining null boundary was a fixed incomplete-record outcome.
- Fix: added collaborator-call assertions and documented exact fixed runtime/Firestore/idempotency protocol boundaries.
- Evidence: final Stryker scan instrumented 62 mutants with 47 killed, 15 ignored, 0 survived, and 0 timed out; focused Jest passed 3 tests.
- Next-time guidance: adapter tests should assert collaborator names and constructed keys, not only returned values.
