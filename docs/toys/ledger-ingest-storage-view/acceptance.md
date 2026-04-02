# Ledger Ingest Permanent Data View Acceptance

## Machine-Checkable Criteria
- [ ] `npm test` exits with status 0.
- [ ] `npm run lint` exits with status 0.
- [ ] Running the toy with a permanent root containing `LEDG3` produces a JSON report with `canonicalTransactions`.
- [ ] The blog post metadata selects `ledger-ingest` as the default output mode.

## Evidence Collection
- Command log path: `artifacts/toys/ledger-ingest-storage-view/commands.log`
- Generated artifacts:
  - `artifacts/toys/ledger-ingest-storage-view/`
- Test report path (if applicable): `artifacts/toys/ledger-ingest-storage-view/test-report.*`

## Pass/Fail Rules
- Pass when all checklist items above are verified by command output and artifact existence.
- Fail when any command exits non-zero, expected output token is missing, or artifact path is absent.
