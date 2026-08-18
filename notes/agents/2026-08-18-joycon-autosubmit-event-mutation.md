# Joy-Con auto-submit event mutation slice

- Diagnosis: direct helper coverage was needed for the change event and the guard that skips absent auto-submit controls.
- Fix: exposed `dispatchChangeEvent` and `enableAutoSubmit` through the existing test-only surface and asserted event type, checked state, and null behavior.
- Evidence: bounded Stryker run for `joyConMapper.js:119-136` killed 8/8 mutants with 0 survivors and 0 timeouts; focused Jest passed 9/9; `git diff --check` passed.
- Next time: continue with the next small Joy-Con mapper range using serialized workers.
