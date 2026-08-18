# Joy-Con button-comparison mutation slice

- Diagnosis: button-array equality needed direct coverage for length mismatches, equal-length button mismatches, and the distinction between `every` and `some`.
- Fix: exposed `sameButtonSnapshots` and `sameButtonSnapshot` through the test-only surface and added multi-button behavioral assertions.
- Evidence: bounded Stryker run for `joyConMapper.js:398-405` killed 8/8 mutants with 0 survivors and 0 timeouts; focused Jest passed 28/28; targeted lint and diff checks passed.
- Repository note: unrelated `runnerAvailabilityRegistry` edits remain unstaged and were not included.
- Next time: continue with the next small Joy-Con mapper range using serialized workers.
