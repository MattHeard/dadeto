# Joy-Con numeric-array comparison mutation slice

- Diagnosis: numeric-array equality needed direct coverage for length mismatches, value mismatches, and the distinction between `every` and `some`.
- Fix: exposed `sameNumberArray` through the test-only surface and added exact, length-mismatch, single-value, and multi-value assertions.
- Evidence: bounded Stryker run for `joyConMapper.js:425-430` killed 11/11 mutants with 0 survivors and 0 timeouts; targeted lint and diff checks passed.
- Repository note: unrelated `runnerAvailabilityRegistry` edits remain unstaged and were not included.
- Next time: continue with the next small Joy-Con mapper range using serialized workers.
