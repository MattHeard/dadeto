# Coverage and Lint Note

- Ensured Jest branch coverage hit the fallback logger path in `src/core/browser/data.js` by crafting a test that omits the warning logger.
- Trimmed the ESLint no-ternary warning in `src/core/cloud/hide-variant-html/hide-variant-html-core.js` by expanding the fallback snapshot logic into explicit conditional branches.
