# Harness

## Local Run Instructions
1. Install prerequisites: `npm install`.
2. Prepare fixtures/config: fixtures live in `src/core/browser/toys/2026-03-13/ledger-ingest/core.js`; no additional config is required.
3. (Exploratory) Run the ledger ingest toy wrapper at `src/core/browser/toys/2026-03-13/ledger-ingest/ledgerIngestToy.js` with a JSON payload such as `{ "fixture": "happyPath" }` to surface canonical rows, duplicates, errors, and summary metadata.
4. Run harness command: `npm test -- test/toys/2026-03-10/ledger-ingest.test.js`.

## Expected Observable Outputs
- Terminal output should include:
  - `PASS  test/toys/2026-03-10/ledger-ingest.test.js`
  - the string `ledger-ingest` so reviewers know the contract suite ran.
- Artifacts written to:
  - `reports/toys/ledger-ingest/commands.log` (command log with timestamps and statuses).
- Exit code:
  - `0`

## Troubleshooting Hooks
- Verbose mode command: `npm test -- --runInBand -- test/toys/2026-03-10/ledger-ingest.test.js`
- Log location: `reports/toys/ledger-ingest/commands.log`
- Cleanup command: `rm -rf reports/toys/ledger-ingest/*.log`
