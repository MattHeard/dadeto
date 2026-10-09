# Checkout effects capability

- Unexpected hurdle: checkout handlers had an omitted-request default branch that was hidden by a test helper defaulting the request to `{}`.
- Diagnosis: full coverage reported 99.992% branch coverage and `coverage-final.json` identified the uncovered default argument in `create-checkout-session-core.js`.
- Fix: let the test helper forward an omitted argument unchanged so the handler's actual default is exercised. Effectful checkout dependencies and HTTP response adapters now take `AllowEffects` first, supplied from a fresh per-request boundary.
- Next-time guidance: avoid defaulting test inputs in wrappers when testing a callee's own default behavior; assert capability forwarding at the injected-function boundary.
