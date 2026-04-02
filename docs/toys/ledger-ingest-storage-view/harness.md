# Ledger Ingest Permanent Data View Harness

## Local Run Instructions
1. Install prerequisites: `npm install`
2. Prepare fixtures/config: populate browser permanent data with an `LEDG3` bucket using the existing storage toy or browser devtools.
3. Run harness command: `npm test`

## Expected Observable Outputs
- Terminal output should include:
  - `ledgerIngestStorageViewToy`
  - `canonicalTransactions`
- Artifacts written to:
  - `artifacts/toys/ledger-ingest-storage-view/`
  - `public/index.html`
- Exit code:
  - `0`

## Troubleshooting Hooks
- Verbose mode command: `npm run lint`
- Log location: `artifacts/toys/ledger-ingest-storage-view/commands.log`
- Cleanup command: clear the `LEDG3` bucket from localStorage if needed
