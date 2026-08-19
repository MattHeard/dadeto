# JoyCon snapshot-comparison mutation coverage

- Hypothesis: HID snapshots match only when both button snapshots and axis arrays match.
- Evidence: `npx stryker run --mutate 'src/core/browser/inputHandlers/joyConMapper.js:383-388' --testFiles 'test/core/browser/inputHandlers/joyConMapper.helpers.test.js' --inPlace --concurrency 1 --timeoutMS 120000` killed 4/4 mutants with 0 survivors and 0 timeouts.
- Focused Jest (86/86), targeted ESLint, and diff checks passed.
