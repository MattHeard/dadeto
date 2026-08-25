# Mutation scan: payment-webhook-core

- Unexpected hurdle: the first focused scan reported 65 survivors across adapter wiring, purchase fallbacks, validation, and response normalization.
- Diagnosis: several tests executed branches without asserting returned values, while other survivors were fixed adapter schemas or defensive boundaries after validation.
- Fix: added exact mapping, duplicate-status, persistence, timestamp, purchase/refund fallback, response-header, and status-promotion assertions; documented 41 narrow static/equivalent boundaries with Stryker annotations.
- Evidence: final focused scan instrumented 178 mutants with 137 killed, 41 ignored, 0 survivors, and 0 timeouts; both focused suites passed 28 tests.
- Next-time guidance: assert transport return values and persisted timestamps, then classify only truly unreachable or fixed-schema mutations as static.
