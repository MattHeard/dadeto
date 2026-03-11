# 2026-03-11: Symphony refresh endpoint

- **Unexpected hurdle:** The server already had tracker-selection logic only wired into bootstrap, so refreshing meant duplicating lots of status setup unless I factored out a reusable snapshot builder.
- **Diagnosis path:** Read `bootstrapSymphony()` and `createSymphonyApp()` to understand which pieces supply config/tracker/workflow info and how the status store is written, then sketched a helper that produces the same status shape and could be called both at startup and from the new trigger.
- **Chosen fix:** Added `buildSymphonyStatusSnapshot()` plus `refreshSymphonyStatus()` in `src/local/symphony/bootstrap.js`, then wired them into a new `/api/v1/refresh` handler in `src/local/symphony/app.js` and exercised it in `test/local/symphony.test.js` while reusing the existing polling summaries.
- **Next-time guidance:** Keep the refresh trigger tied to the same tracker summary code so operator-facing evidence stays consistent and add HTTP-level smoke tests if more routes are exposed.
