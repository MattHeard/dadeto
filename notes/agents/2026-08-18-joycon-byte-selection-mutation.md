# Joy-Con byte-selection mutation slice

- Diagnosis: report layout selection needed direct coverage for standard and fallback button-byte offsets and fallback length limiting.
- Fix: exposed `readJoyConButtonBytes` through the test-only surface and asserted distinct standard/fallback slices.
- Evidence: bounded Stryker run for `joyConMapper.js:464-485` killed 7/7 mutants with 0 survivors and 0 timeouts; targeted lint and diff checks passed.
- Repository note: unrelated `runnerAvailabilityRegistry` edits remain unstaged and were not included.
- Next time: continue with the next small Joy-Con mapper range using serialized workers.
