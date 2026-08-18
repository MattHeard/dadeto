# Joy-Con WebHID capability mutation slice

- Diagnosis: the capability guard needed coverage for missing WebHID, incomplete HID objects, and a supported `getDevices` implementation.
- Fix: added focused tests for all three paths and imported Jest explicitly so Stryker's isolated runner has the test mock API.
- Evidence: bounded Stryker run for `joyConMapper.js:205-208` killed 9/9 mutants with 0 survivors and 0 timeouts; focused Jest passed 16/16; targeted lint and diff checks passed.
- Repository note: unrelated `runnerAvailabilityRegistry` edits remain unstaged and were not included.
- Next time: continue with the next small Joy-Con mapper range using serialized workers.
