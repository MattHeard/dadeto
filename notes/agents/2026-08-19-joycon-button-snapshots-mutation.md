# JoyCon button-snapshot mutation slice

- Unexpected hurdle: a direct equal-array assertion still left six mutants alive under Stryker's per-test selection.
- Diagnosis: the helper needed independent evidence for equal lengths, unequal lengths with a matching prefix, and a later-element mismatch.
- Fix: added a focused assertion matrix for `sameButtonSnapshots`.
- Evidence: `npx jest --config jest.config.mjs --runInBand test/core/browser/inputHandlers/joyConMapper.helpers.test.js` passed 87 tests; targeted ESLint and `git diff --check` passed; Stryker scanned 7 mutants with 7 killed, 0 survived, and 0 timeouts.
- Next time: when a helper combines length and element predicates, cover each predicate independently and include a mismatch after a matching prefix.
