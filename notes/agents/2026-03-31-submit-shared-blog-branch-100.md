# 2026-03-31 submit-shared and blog branch-100 follow-up

- **Unexpected hurdle:** Re-enabling two more `src/core` coverage globs exposed one dead defensive branch in `submit-shared` and one untested copy-workflow warning path in `build/blog`.
- **Diagnosis path:** Removed both ignore globs, checked prior uncovered lines, and ran focused tests for `test/core/cloud/submit-shared.test.js` and `test/core/copy.test.js`.
- **Chosen fix:** Simplified `handleObjectResponderResult` by removing the unreachable fallback branch, and added `copyBlogJson` tests for both missing and present `src/build` directory paths.
- **Next-time guidance:** Prefer combining dead-branch cleanup with targeted workflow tests when re-enabling previously ignored coverage files.
