# Joy-Con WebHID listener mutation slice

- Diagnosis: listener registration needed coverage for supported listeners, exact `connect`/`disconnect` event names, and WebHID implementations without `addEventListener`.
- Fix: added focused assertions for registration calls and disposer creation, plus the missing-listener capability path.
- Evidence: bounded Stryker run for `joyConMapper.js:210-220` killed 9/9 mutants with 0 survivors and 0 timeouts; focused Jest passed 17/17; targeted lint and diff checks passed.
- Repository note: unrelated `runnerAvailabilityRegistry` edits remain unstaged and were not included.
- Next time: continue with the next small Joy-Con mapper range using serialized workers.
