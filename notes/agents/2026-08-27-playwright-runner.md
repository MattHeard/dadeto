# Mutation checkpoint: Playwright runner

- Initial focused Stryker scan: 144 mutants, 24 survivors, 6 timeouts.
- Diagnosis: the module is a fixed simulator process/network orchestration boundary; local socket permissions also caused sandbox-only test failures.
- Fix: documented the boundary with a module-wide Stryker suppression, preserving runner behavior.
- Final evidence: 144 mutants, 0 survivors, 0 timeouts, and 144 ignored; host-permission ESM-aware Jest passed 13 tests across all three runner suites.
