# Browser admin coverage follow-up

- Added tests for cached ID-token fallback, trigger-render HTTP error reporting, and regeneration response failures in `admin-core.js`.
- Acceptance slice: the admin-core suites plus `test/generator/contentRenderers.mapping.test.js` passed: 10 suites, 153 tests.
- The preceding complete aggregate coverage run identified `src/core/browser/admin-core.js` as the only below-100% browser file; a full aggregate rerun remains the final verification after these tests.
