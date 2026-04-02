# LEDG3 Storage View Toy

Built a read-only LEDG3 permanent-data view toy for the ledger-ingest project.

## What Changed

- Added `ledgerIngestStorageCore.js` to share read-only permanent-storage normalization helpers.
- Added `ledgerIngestStorageViewToy.js` to read the `LEDG3` permanent bucket and render it through the existing `ledger-ingest` presenter.
- Added a new blog entry `LEDG4` with `defaultOutputMethod: "ledger-ingest"` so the view opens directly in the table presenter.
- Extended the generator to support default output selection for toys.
- Added coverage for the new read-only view toy and generator behavior.

## Validation

- `npm run build`
- `npm run lint`
- `npm test`
- `npm run duplication`

## Notes

- The new LEDG4 toy does not mutate storage; it only reads the current permanent root and renders a table view.
- The duplication report at the current low threshold still contains older repo-wide clone groups, but the new LEDG3 storage view code did not introduce a fresh overlap.
