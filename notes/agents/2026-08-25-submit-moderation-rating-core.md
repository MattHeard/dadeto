# Mutation loop: submit-moderation-rating-core

- Unexpected hurdle: several survivors were equivalent mutations in defensive error normalization and in the middleware adapter input object, which cannot be observed after the helper consumes it.
- Diagnosis: reran the focused Jest suite and authoritative per-file Stryker scan after each assertion/suppression change; the final report showed 171 mutants, 125 killed, 46 documented ignored, 0 survived, and 0 timed out.
- Fix: added exact middleware CORS behavior assertions and documented only the fixed protocol/error-shape and defensive normalization boundaries as intentionally ignored.
- Next-time guidance: place Stryker suppression comments directly before the mutated declaration/property when a suppression on the surrounding expression does not match the generated mutant.
