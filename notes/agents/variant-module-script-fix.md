## Variant Module Script Fix

- Hurdle: the latest gcp-test run failed in Playwright even though the submit flow reached the story URL.
- Diagnosis: the rendered variant page was loading `variantRedirect.js` and `variantMenuToggle.js` as classic scripts, but both files use ES module imports, so the browser threw `Cannot use import statement outside a module`.
- Fix: switch those script tags to `type="module"` in the variant renderer and lock the HTML contract in the build-html test.
- Next time: when a page-level Playwright assertion fails after navigation, check the browser console for script-loading errors before changing the test expectations.
