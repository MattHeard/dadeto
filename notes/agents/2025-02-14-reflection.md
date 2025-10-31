# Reflection

- **Surprise**: Splitting the high-complexity `getAuthorizationHeader` introduced new ESLint complaints because helpers without full JSDoc defaulted to warnings. I expected only the complexity metric to matter but the repo enforces documentation for every function.
- **Diagnosis**: Reran `npm run lint` after the first extraction to inspect the updated report. The new entries made it obvious JSDoc metadata was required and that the helper logic still contained redundant branching.
- **Adjustment**: Added a shared `normalizeAuthorizationCandidate` helper and updated each function with explicit JSDoc blocks. This kept the cyclomatic complexity well below the original value while satisfying the documentation rule.
- **Takeaway**: When touching code in this repo, run lint after each structural refactor—the tool highlights documentation expectations in addition to complexity. Plan extra time to capture proper JSDoc when introducing helpers.

## Follow-ups

- Consider extracting reusable header normalization utilities into a shared HTTP helpers module so other cloud functions can drop their duplicated logic.
