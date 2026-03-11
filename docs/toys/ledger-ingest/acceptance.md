# Acceptance Criteria

## Machine-Checkable Criteria
- [ ] `npm test -- test/toys/2026-03-10/ledger-ingest.test.js` exits with status 0 and the output contains `ledger-ingest`.
- [ ] `npm test` exits with status 0 and the output contains `ledger-ingest`.

## Evidence Collection
- Command log path: `reports/toys/ledger-ingest/commands.log`
- Generated artifacts:
  - `reports/toys/ledger-ingest/commands.log`
- Test report path (if applicable): `reports/toys/ledger-ingest/commands.log`

## Pass/Fail Rules
- Pass when both commands above finish without errors and the expected tokens appear in their outputs.
- Fail when either command exits non-zero or the expected token (`ledger-ingest`) does not appear in the captured output.
