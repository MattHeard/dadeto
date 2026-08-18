# Joy-Con hat-byte mutation slice

- Diagnosis: hat-byte selection needed direct coverage for standard reports, short fallback reports, and fallback reports with an available hat byte.
- Fix: exposed `readJoyConHatByte` through the test-only surface and added direct assertions for all three layouts.
- Evidence: bounded Stryker run for `joyConMapper.js:485-495` killed 7/7 mutants with 0 survivors and 0 timeouts; targeted lint and diff checks passed.
- Repository note: unrelated `runnerAvailabilityRegistry` edits remain unstaged and were not included.
- Next time: continue with the next small Joy-Con mapper range using serialized workers.
