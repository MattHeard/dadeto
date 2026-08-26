# Mutation checkpoint: Notion Codex config

- Initial focused Stryker scan: 41 mutants, 2 survivors, 0 timeouts.
- Diagnosis: the loader's default relative path and configurable path key were not asserted at the read boundary.
- Fix: added default and custom `readFileImpl` path assertions.
- Final evidence: 41 mutants, 19 killed, 22 existing boundary mutants ignored, 0 survivors, and 0 timeouts; focused ESM-aware Jest passed 4 tests.
