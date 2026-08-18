# Joy-Con WebHID cleanup mutation slice

- Diagnosis: cleanup behavior needed coverage for invoking both disposers and for absent `removeEventListener` APIs.
- Fix: asserted listener teardown calls and safe cleanup when the optional removal APIs are unavailable.
- Evidence: bounded Stryker run for `joyConMapper.js:220-244` reported 8/8 covered mutants killed, 0 survivors, 0 timeouts, and 10 explicit `NoCoverage` mutants outside the exercised callback branches; focused Jest passed 18/18; targeted lint and diff checks passed.
- Repository note: unrelated `runnerAvailabilityRegistry` edits remain unstaged and were not included.
- Next time: continue with the next small Joy-Con mapper range using serialized workers.
