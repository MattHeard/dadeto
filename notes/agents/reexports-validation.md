## Re-export Alignment

- **Outcome:** Pointed `src/core/browser/toys/2025-07-05/validation.js` at the canonical `src/core/validation.js` exports so the add-dendrite toy re-exports no longer surface unrelated constants and the validation suite passes.
- **Unexpected hurdles & options considered:** The failing test was caused by exporting from `common-core.js`, which introduced unrelated constants; the only reasonable fix was to re-export from the proper `validation` module rather than reshaping expectations or mocking exports.
- **Lessons & follow-up ideas:** Keep re-export targets focused on the module the consuming test expects; when a test asserts equality of exports, the helper needs to mirror the base module exactly.
- **Open questions:** None.
