# Joy-Con HID stabilization mutation slice

- Diagnosis: snapshot stabilization needed direct coverage for pending snapshots, repeated-sample promotion, changed-sample reset, and the count-one threshold.
- Fix: exposed `updateHidSnapshot` and `sameHidSnapshot` through the test-only surface and added sequence-based assertions for each state transition.
- Evidence: bounded Stryker run for `joyConMapper.js:350-380` killed 15/15 mutants with 0 survivors and 0 timeouts; focused Jest passed 28/28; targeted lint and diff checks passed.
- Repository note: unrelated `runnerAvailabilityRegistry` edits remain unstaged and were not included.
- Next time: continue with the next small Joy-Con mapper range using serialized workers.
