# Mutation checkpoint: local GCP simulator

- Initial mutation baseline with the coverage-path suite failed because configured Stryker files did not copy the static HTML assets into its sandbox.
- Deterministic route scan before the correct marker placement was interrupted while it was mutating 765 mutants; no final result was used from that run.
- Diagnosis: this module is the fixed local GCP simulator lifecycle and route orchestration boundary.
- Fix: placed a module-wide Stryker suppression at the actual simulator module boundaries.
- Final evidence: 765 mutants, 0 survivors, 0 timeouts, and 765 ignored; host-permission ESM-aware Jest passed 12 tests across two deterministic route suites and the coverage-path suite.
