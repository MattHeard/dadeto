# Check suppression removal

- Unexpected hurdle: removing Jest path ignores caused Playwright specs outside the unit-test tree to be loaded by Jest.
- Diagnosis: the default Jest discovery was broader than the unit test convention; the check runner also requires Node child processes, which the restricted sandbox rejects with `EPERM`.
- Chosen fix: removed parse-gate exemptions, lint/coverage ignore pragmas, and Jest ignore-pattern configuration; made Jest discovery explicit with `test/**/*.test.js`.
- Next time: rerun the complete `npm run check` with child-process permission and finish any parse-gate or strict-lint failures surfaced by the now-unmasked files.
