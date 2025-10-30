# Handling repo-wide lint churn while touching a single module

- **Surprise:** Running `npm run lint` auto-formatted many unrelated files because the script passes `--fix` globally. That created a diff far outside the target scope.
- **Diagnosis:** `git status` showed dozens of modified files after linting. A quick `git diff` on our target module confirmed only whitespace and JSDoc edits were required, so the rest came from lint's auto-fixes.
- **Options considered:**
  1. Commit the widespread formatting changes (rejected—out of scope and risky without context).
  2. Revert the unrelated modifications and keep only the intentional file change (chosen).
- **Takeaway:** Always review the lint command in `package.json`; if it auto-fixes, be ready to `git checkout --` unrelated files after linting to keep the diff focused.
- **Follow-up idea:** Consider splitting lint scripts into `lint` vs. `lint:check` so scope-limited tasks can avoid repo-wide auto-fixes.
