# 2026-03-31 — No-ignore coverage fix

- Unexpected hurdle: removing ignore paths exposed real uncovered branches, especially in `ledgerIngestCsvConverterToy.js`.
- Diagnosis path: parsed `coverage-final.json` branch maps to identify unreachable nullish-fallback branches and branch IDs with zero hits.
- Chosen fix: removed dead fallback branches in the converter, added focused converter tests for CRLF/LF, sparse rows, and error paths, and added re-export coverage tests for moved handler wrappers.
- Next-time guidance: when branch-100 slips, inspect branch-map IDs directly before adding tests; eliminate provably unreachable defensive branches first.
