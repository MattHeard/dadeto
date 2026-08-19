# JoyCon metadata/list construction mutation slice

- Unexpected hurdle: metadata labels are immediately refreshed by the first render, so ordinary label assertions did not distinguish constructor writes from render writes.
- Diagnosis: the shell test had no identity-level coverage for the metadata container, its two labels, or the list element and final hero-child array.
- Chosen fix: asserted metadata/list tags, classes, labels, parent-child attachment, and four metadata initialization/render writes.
- Evidence: the final Stryker scan for `src/core/browser/inputHandlers/joyConMapper.js:2307-2314` killed all 13 mutants with 0 survivors and 0 timeouts; the focused Jest suite passed 95 tests, targeted ESLint passed with zero warnings, and `git diff --check` passed.
- Next-time guidance: use write-count assertions for shell labels that are refreshed during the first render, and assert representative children when an array literal controls DOM composition.
