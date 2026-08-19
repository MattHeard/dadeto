# JoyCon hat Y-axis mutation slice

- Unexpected hurdle: the first scan found 25 survivors because `resolveHatYAxis` was not exposed through the existing test-only helper export; a rerun initially failed after restoring `HEAD` removed that uncommitted export.
- Diagnosis: existing coverage asserted only horizontal values and axis lengths, not the vertical negative, positive, and neutral classes.
- Fix: exposed `resolveHatYAxis` through `joyConMapperTestOnly` and added assertions for hats `[0, 1, 7]`, `[3, 4, 5]`, and `[2, 6]`.
- Evidence: `npx jest --config jest.config.mjs --runInBand test/core/browser/inputHandlers/joyConMapper.helpers.test.js` passed 88 tests; targeted ESLint and `git diff --check` passed; corrected Stryker scan covered 26 mutants with 26 killed, 0 survived, and 0 timeouts.
- Next time: preserve intended uncommitted test-only exports when restoring source around in-place mutation runs.
