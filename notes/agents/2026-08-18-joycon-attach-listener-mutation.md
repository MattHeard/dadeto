# Joy-Con HID listener mutation slice

- Diagnosis: listener attachment needed direct coverage for unsupported devices, exact `inputreport` registration, and disposer cleanup.
- Fix: exposed `attachHidDeviceListener` through the test-only surface and added focused registration, cleanup, and no-API assertions.
- Evidence: bounded Stryker run for `joyConMapper.js:318-337` killed 5/5 mutants with 0 survivors and 0 timeouts; focused Jest passed 27/27; targeted lint and diff checks passed.
- Repository note: unrelated `runnerAvailabilityRegistry` edits remain unstaged and were not included.
- Next time: continue with the next small Joy-Con mapper range using serialized workers.
