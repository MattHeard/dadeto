# Floating credit runtime follow-up — 2026-08-05

- Unexpected hurdle: the cloud build rewrites tracked generated `infra/commonCore.js`; restore that artifact after packaging checks so only source changes remain.
- Diagnosis: the fake Firestore does not implement range queries, and legacy aggregate balances had no lot representation.
- Fix: filter lots in application code for the fake/runtime-compatible path and atomically create non-refundable `legacy` lots before charging or issuing new purchases.
- Next-time guidance: run focused billing tests before the aggregate gate; the repository aggregate can fail independently because child-process spawning and registry audit access are restricted in this environment.
