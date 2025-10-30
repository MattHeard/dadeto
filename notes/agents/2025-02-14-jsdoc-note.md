## Summary
- Confirmed repository lint results and noted no jsdoc warnings inside `src/core` despite the task focus.
- Located equivalent warnings in the core moderation tests and updated the helper stubs with full JSDoc blocks to quiet eslint.

## Challenges
- The lint report did not include any jsdoc warnings under `src/core`, so I had to inspect related files to understand where the plugin was failing.
- Ensuring the new annotations captured the complex mock shapes without over-specifying types required reading the surrounding tests to understand usage.

## Resolution
- Added descriptive `@param` and `@returns` tags to the request/db factory helpers used in the moderation core tests, eliminating the jsdoc plugin warnings while keeping the test helpers readable.
