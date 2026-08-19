# JoyCon available-device mutation coverage

- Hypothesis: available WebHID devices must be logged and have input-report listeners attached, including disposer cleanup.
- Evidence: `npx stryker run --mutate 'src/core/browser/inputHandlers/joyConMapper.js:242-254' --testFiles 'test/core/browser/inputHandlers/joyConMapper.helpers.test.js' --inPlace --concurrency 1 --timeoutMS 120000` generated 4 mutants; the final run killed 4/4 with 0 survivors and 0 timeouts.
- The focused Jest suite and targeted ESLint passed. Restore `joyConMapper.js` from `HEAD` after the in-place Stryker run before committing.
