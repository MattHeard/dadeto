# Joy-Con horizontal-axis mutation slice

- Diagnosis: horizontal hat-axis resolution needed direct coverage for all negative, positive, and neutral direction groups.
- Fix: exposed `resolveHatXAxis` through the test-only surface and added assertions covering every direction set.
- Evidence: bounded Stryker run for `joyConMapper.js:570-580` killed 13/13 mutants with 0 survivors and 0 timeouts; targeted lint and diff checks passed.
- Repository note: unrelated `runnerAvailabilityRegistry` edits remain unstaged and were not included.
- Next time: continue with the next small Joy-Con mapper range using serialized workers.
