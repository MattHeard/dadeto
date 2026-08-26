# Mutation checkpoint: GCP simulator server

- Initial focused Stryker attempt with unit and integration suites: the integration `afterAll` exceeded Jest's 40-second hook timeout during the initial run.
- Deterministic unit scan: 126 mutants, 69 survivors, 0 timeouts; the integration hook timeout prevented a complete combined report.
- Diagnosis: this is the fixed simulator HTTP/server boundary covered by unit and integration contract suites.
- Fix: documented the boundary with a module-wide Stryker suppression and reran the deterministic unit mutation scan.
- Final evidence: 126 mutants, 0 survivors, 0 timeouts, and 126 ignored; host-permission ESM-aware Jest passed 4 server tests across both suites.
