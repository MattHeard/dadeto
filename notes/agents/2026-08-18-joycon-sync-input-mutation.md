# Joy-Con sync input mutation slice

- Unexpected hurdle: adding the focused assertion made the existing helper-suite callback exceed the repository function-length limit.
- Fix: exposed `syncToyInput` through the test-only surface, asserted JSON serialization, DOM synchronization, and auto-submit, then placed the test in a separate suite to preserve lint limits.
- Evidence: bounded Stryker run for `joyConMapper.js:142-148` killed 1/1 mutant with 0 survivors and 0 timeouts; focused Jest passed 10/10; lint and `git diff --check` passed.
- Next time: continue with the next small Joy-Con mapper range using serialized workers.
