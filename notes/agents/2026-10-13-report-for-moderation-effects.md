# Report-for-moderation AllowEffects loop

- Unexpected hurdle: the first full `npm run check` reported 99.992% branch coverage because an omitted request argument did not exercise the default request branch.
- Diagnosis: inspected `reports/coverage/coverage-final.json`; the sole uncovered branch pointed to `processReportSubmission`'s default request parameter.
- Fix: added a focused test that invokes the report handler with only its required permission, then reran the full check successfully.
- Next-time guidance: when coverage misses one branch across the whole repo, inspect the generated coverage map before changing implementation; verify the exact default-argument call form.
- Next audit target: `src/cloud/realtime-call/index.js`.
