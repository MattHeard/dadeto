# Mutation loop: create-checkout-session-core

- Unexpected hurdle: the initial scan exposed many protocol constants and validation branches that the original suite checked only by status code.
- Diagnosis: strengthened public error assertions first, then used exact-node suppression comments for fixed Stripe metadata, request schema, billing persistence, and Express adapter contracts.
- Fix: preserved the checkout behavior, added exact error-body/header assertions, and documented fixed integration boundaries rather than leaving survivors unexplained.
- Evidence: final Stryker scan instrumented 315 mutants with 127 killed, 188 ignored, 0 survived, and 0 timed out; focused Jest passed 18 tests.
- Next-time guidance: Stryker suppression comments must sit immediately before the mutated continuation line, especially for multiline boolean expressions and object literals.
