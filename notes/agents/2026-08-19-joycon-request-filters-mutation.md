# JoyCon request-filter mutation coverage

- Hypothesis: the WebHID request must receive all four supported Joy-Con product filters, including their vendor/product fields.
- Evidence: `npx stryker run --mutate 'src/core/browser/inputHandlers/joyConMapper.js:275-280' --testFiles 'test/core/browser/inputHandlers/joyConMapper.helpers.test.js' --inPlace --concurrency 1 --timeoutMS 120000` generated 3 mutants; the final run killed 3/3 with 0 survivors and 0 timeouts.
- Focused Jest (83/83), targeted ESLint, and diff checks passed.
