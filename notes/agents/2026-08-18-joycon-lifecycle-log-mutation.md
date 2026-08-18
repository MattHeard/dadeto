# Joy-Con lifecycle-log mutation slice

- Diagnosis: HID lifecycle logging needed direct coverage for absent devices and structured connected-device output.
- Fix: exposed `logHidDeviceEvent` through the test-only surface and asserted null suppression plus the logged device fields.
- Evidence: bounded Stryker run for `joyConMapper.js:610-620` killed 4/4 mutants with 0 survivors and 0 timeouts; targeted lint and diff checks passed.
- Repository note: unrelated `runnerAvailabilityRegistry` edits remain unstaged and were not included.
- Next time: continue with the next small Joy-Con mapper range using serialized workers.
