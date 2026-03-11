# Ledger ingest core contract loop note

- Unexpected hurdle: The `npm test -- test/toys/2026-03-10/ledger-ingest.test.js` command ended up running the entire suite (475 suites) because the `package.json` test script does not forward args to Jest, so the loop was heavier than anticipated.
- Diagnosis path: Inspected `package.json`'s `test` script, confirmed it always executes `node ./node_modules/.bin/jest --coverage --watchman=false` without injecting `process.argv`, which explains why the extra file argument was ignored.
- Chosen fix: Accepted the full-suite run, documented the command/coverage outcome in `reports/toys/ledger-ingest/commands.log`, and noted the behavior in the toy harness and acceptance docs so future loops know the check is a full `npm test`.
- Next-time guidance: Consider adding a dedicated `npm run test:ledger-ingest` script or invoking Jest directly when this toy needs a faster feedback loop, and update docs if that change is introduced.
