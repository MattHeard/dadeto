# JoyCon disconnect-handler mutation coverage

- Hypothesis: the disconnect callback needed assertions for removing only the matching device, preserving falsy device entries, refreshing metadata, and emitting the disconnected lifecycle event.
- Evidence: `npx stryker run --mutate 'src/core/browser/inputHandlers/joyConMapper.js:224-231' --testFiles 'test/core/browser/inputHandlers/joyConMapper.helpers.test.js' --inPlace --concurrency 1 --timeoutMS 120000` generated 9 mutants; the final run killed 9/9 with 0 survivors and 0 timeouts.
- Focused Jest and ESLint passed after adding the callback test. Restore `joyConMapper.js` from `HEAD` after interrupted in-place Stryker runs before continuing.
