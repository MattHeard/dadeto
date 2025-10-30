# Memoizing Firestore getter JSDoc

- **Surprise:** Running `npm run lint` applies `--fix` automatically. It rewrote a slew of unrelated files after I changed `src/cloud/get-api-key-credit/index.js`.
- **Diagnosis:** `git status` showed a broad set of staged modifications. Reviewing `package.json` confirmed the lint script runs ESLint with `--fix`, so the tool reformatted other modules even though I did not touch them.
- **Resolution:** I reverted the unrelated files with `git checkout -- <path>` so the commit only carries the intended JSDoc improvement. Next time I will check `reports/lint/lint.txt` instead of relying on the repository state to confirm lint results, or run ESLint on the specific file when feasible.
- **Follow-up question:** Is there value in introducing a non-fixing lint script (e.g., `npm run lint:check`) for verification-only runs? It would keep automation from mutating the workspace when all we need is a status check.
