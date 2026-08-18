# Joy-Con auto-submit mutation slice

- Unexpected hurdle: the repository test wrapper hit `EPERM` when spawning its Jest child in the restricted execution environment.
- Diagnosis: the focused Stryker run completed normally; direct elevated Jest execution provided the needed validation.
- Fix: exported `getAutoSubmitCheckbox` through the existing test-only surface and asserted both the checkbox lookup and missing-article path.
- Evidence: focused Stryker run for `joyConMapper.js:103-112` killed 5/5 mutants with 0 survivors and 0 timeouts; focused Jest passed 8/8; lint and `git diff --check` passed.
- Next time: continue with the next small Joy-Con mapper range and keep mutation workers serialized.
