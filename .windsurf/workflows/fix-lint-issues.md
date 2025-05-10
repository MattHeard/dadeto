---
description: Step-by-step process to fix all lint warnings in the codebase
---

1. Run the TCR (Test && Commit || Revert) process to ensure the codebase is currently passing all tests and is in a clean state.
   - Command: `npm run tcr`

2. Run the linter to generate the latest lint report.
   - Command: `npm run lint`

3. Examine the lint report and identify the first warning (topmost in the output).

4. Fix the code to resolve this first lint warning.
   - Make only the minimal change required to address the warning.
   - If the warning is related to cyclomatic complexity or complex conditional logic, consider following the dedicated workflow: `extract-conditional-logic` (see `.windsurf/workflows/extract-conditional-logic.md`).
   - If the warning is related to too many parameters (`max-params`) or parameter grouping, consider following the dedicated workflow: `group-related-params` (see `.windsurf/workflows/group-related-params.md`).

5. Repeat steps 1–4:
   - After fixing each warning, run TCR and lint again.
   - Always address only the next warning in the report.
   - Continue until the lint report is clear (no warnings remain).

6. If at any point a test fails or the TCR process does not pass, revert or fix the code before proceeding to the next lint warning.

- This workflow should be run iteratively and automatically: after each fix, immediately proceed to the next lint warning and repeat the process, without waiting for user confirmation between steps.

// turbo-all
