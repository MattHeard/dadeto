# Joy-Con button-decoding mutation slice

- Diagnosis: HID button decoding needed direct coverage for zero-bit and set-bit pressed/value behavior.
- Fix: added zero-bitfield and set-bitfield assertions against the existing `snapshotHidButtons` test-only surface.
- Evidence: bounded Stryker run for `joyConMapper.js:530-555` killed 7/7 mutants with 0 survivors and 0 timeouts; targeted lint and diff checks passed.
- Repository note: unrelated `runnerAvailabilityRegistry` edits remain unstaged and were not included.
- Next time: continue with the next small Joy-Con mapper range using serialized workers.
