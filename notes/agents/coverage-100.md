# Coverage check reflection

- Unexpected: the CLAUDE docs asked for 100% coverage, but the CLI output was too large to show the summary, so I parsed `reports/coverage/lcov-report/index.html` and the raw `coverage-final.json` to find the uncovered statement/branch before writing a fix.
- Diagnosis: only `assertRandom` in `src/core/cloud/process-new-page/process-new-page-core.js` was missing coverage; streaming the coverage JSON helped me locate the single statement (line 35) and branch. Running `findAvailablePageNumber` with a bogus random value exercises the guard before Firestore code runs, which is why the rest of the module stayed untouched.
- Learning/action item: when chasing coverage gaps, script the JSON for statements/branches instead of eyeballing the HTML; reuse that helper to point to line numbers faster.
- Next time I'll also double-check coverage after editing by opening `reports/coverage/lcov-report/index.html` to confirm totals in one place.

Open questions/follow-up ideas:
- Should we bake a coverage threshold into `jest.config.mjs` so future runs fail fast when coverage dips below 100%?  
