# Joy-Con open-device mutation slice

- Diagnosis: granted-device opening needed direct coverage for null devices, opening unopened devices, already-open devices, devices without an `open` method, and duplicate tracking.
- Fix: exposed `openGrantedJoyConDevice` through the test-only surface and added focused assertions for each lifecycle branch.
- Evidence: bounded Stryker run for `joyConMapper.js:292-310` killed 15/15 mutants with 0 survivors and 0 timeouts; focused Jest passed 25/25; targeted lint and diff checks passed.
- Repository note: unrelated `runnerAvailabilityRegistry` edits remain unstaged and were not included.
- Next time: continue with the next small Joy-Con mapper range using serialized workers.
