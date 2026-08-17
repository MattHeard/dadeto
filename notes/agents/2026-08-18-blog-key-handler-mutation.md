# Blog-key handler mutation slice

- Survivor scan identified `src/core/browser/inputHandlers/blogKeyHandler.js`.
- Added direct parser assertions, field-configuration assertions, and focused behavioral coverage for live, invalid, nullish, and trimmed inputs.
- Removed redundant/equivalent mutation points for empty JSON and quote-style string literals while preserving behavior.
- Focused per-test Stryker ranges covered every executable section: each reported zero surviving, timeout, and no-coverage mutants.
- Quality evidence: both blog-key Jest suites passed 21 tests and `npm run lint` passed with zero warnings.
