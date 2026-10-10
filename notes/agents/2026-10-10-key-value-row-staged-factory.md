# Key-value row staged factory

- Unexpected hurdle: The first full check found branch coverage at 99.992%, because the updated null-row fixture exercised only the add-button fallback.
- Diagnosis: `createButton` has a distinct missing-row-data fallback in its non-final remove-button branch; the old one-row fixture could not enter it.
- Fix: Added a null-row-data, non-final-row regression that clicks the remove handler, then reran the full check.
- Next time: When a refactor changes how shared factory inputs flow, inspect per-file branch coverage and cover separate add/remove paths explicitly.
- Evidence: Five focused Jest suites passed (23 tests); `npm run lint` and `npm run tsdoc:check` passed. Fresh no-cache arity scan removed createKeyValueRow and reduced `toys.js` from 7 to 6 findings. Full `npm run check` passed all 10 gates, with 100% branch/function/line/statement coverage, 11/11 local E2E, 0 clones, and 0 vulnerabilities. Log: `.tmp/npm-check-create-key-value-row.log`.
