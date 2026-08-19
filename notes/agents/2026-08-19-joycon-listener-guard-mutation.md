# JoyCon listener-guard mutation coverage

- Hypothesis: devices without a callable `addEventListener` must be ignored without disposers, while supported devices receive exactly one `inputreport` listener.
- Evidence: `npx stryker run --mutate 'src/core/browser/inputHandlers/joyConMapper.js:329-332' --testFiles 'test/core/browser/inputHandlers/joyConMapper.helpers.test.js' --inPlace --concurrency 1 --timeoutMS 120000` killed 5/5 mutants with 0 survivors and 0 timeouts.
- Focused Jest (85/85), targeted ESLint, and diff checks passed.
