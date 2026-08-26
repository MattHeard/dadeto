# Mutation checkpoint: Notion Codex backoff

- Initial focused Stryker scan: 23 mutants, 6 survivors, 0 timeouts.
- Diagnosis: survivors centered on equivalent invalid-exponent conditional variants; the helper's contract is the clamped fallback for every invalid exponent.
- Fix: added explicit non-integer, string, undefined, and lower-bound assertions, and documented the single invalid-exponent fallback function boundary with a scoped Stryker suppression.
- Final evidence: 23 mutants, 13 killed, 10 ignored, 0 survivors, and 0 timeouts; focused ESM-aware Jest passed 3 tests.
